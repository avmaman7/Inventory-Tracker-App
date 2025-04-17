import eventlet
eventlet.monkey_patch()

"""
Backend API implementation for the Mobile Inventory Tracking Application.
This module sets up the Flask API with RESTful endpoints and authentication.
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize Flask application
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', os.urandom(24))
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', os.urandom(24))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/inventory_app_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'static/uploads')

# Ensure upload directory exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# Define database models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)  # Increased length from 128
    role = db.Column(db.String(20), default='user')  # 'admin' or 'user'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=0)
    unit = db.Column(db.String(20), nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'last_updated': self.last_updated.isoformat(),
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }

class InventoryChange(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    previous_quantity = db.Column(db.Float)
    new_quantity = db.Column(db.Float, nullable=False)
    change_type = db.Column(db.String(20), nullable=False)  # 'add', 'update', 'delete'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'previous_quantity': self.previous_quantity,
            'new_quantity': self.new_quantity,
            'change_type': self.change_type,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id
        }

# --- Temporary Route for Initial DB Setup ---
# !!! Visit this route ONCE manually after deployment !!!
# !!! WARNING: This will DELETE all existing data in the tables !!!
# !!! Then consider removing or securing it !!!
@app.route('/_initialize_database_once')
def initialize_database():
    try:
        with app.app_context():
            db.drop_all()  # Drop existing tables
            db.create_all() # Recreate tables with updated schema
        return "Database tables DROPPED and RECREATED successfully.", 200
    except Exception as e:
        return f"An error occurred: {str(e)}", 500
# --- End Temporary Route ---

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # Create new user
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    
    # First user is admin
    if User.query.count() == 0:
        user.role = 'admin'
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    # Find user
    user = User.query.filter_by(username=data['username']).first()
    
    # Check password
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Create access token
    access_token = create_access_token(identity=str(user.id))
    
    response_data = {
        'access_token': access_token,
        'user': user.to_dict()
    }
    print(f"DEBUG: Sending login response: {response_data}")
    return jsonify(response_data), 200

@app.route('/api/auth/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

# Inventory routes
@app.route('/api/items', methods=['GET'])
@jwt_required()
def get_items():
    items = Item.query.order_by(Item.name).all()
    return jsonify([item.to_dict() for item in items]), 200

@app.route('/api/items/<int:item_id>', methods=['GET'])
@jwt_required()
def get_item(item_id):
    item = Item.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    return jsonify(item.to_dict()), 200

@app.route('/api/items', methods=['POST'])
@jwt_required()
def add_item():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Validate input
    if not data or not data.get('name') or not data.get('unit'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Create new item
    item = Item(
        name=data['name'],
        quantity=float(data.get('quantity', 0)),
        unit=data['unit'],
        created_by=user_id,
        updated_by=user_id
    )
    
    db.session.add(item)
    db.session.commit()
    
    # Record inventory change
    change = InventoryChange(
        item_id=item.id,
        previous_quantity=0,
        new_quantity=item.quantity,
        change_type='add',
        user_id=user_id
    )
    
    db.session.add(change)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('item_added', item.to_dict())
    
    return jsonify(item.to_dict()), 201

@app.route('/api/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    data = request.get_json()
    user_id = get_jwt_identity()
    
    item = Item.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Store previous quantity for change log
    previous_quantity = item.quantity
    
    # Update item
    if 'name' in data:
        item.name = data['name']
    
    if 'quantity' in data:
        item.quantity = float(data['quantity'])
    
    if 'unit' in data:
        item.unit = data['unit']
    
    item.last_updated = datetime.utcnow()
    item.updated_by = user_id
    
    db.session.commit()
    
    # Record inventory change
    change = InventoryChange(
        item_id=item.id,
        previous_quantity=previous_quantity,
        new_quantity=item.quantity,
        change_type='update',
        user_id=user_id
    )
    
    db.session.add(change)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('item_updated', item.to_dict())
    
    return jsonify(item.to_dict()), 200

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    user_id = get_jwt_identity()
    
    item = Item.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Record inventory change before deletion
    change = InventoryChange(
        item_id=item.id,
        previous_quantity=item.quantity,
        new_quantity=0,
        change_type='delete',
        user_id=user_id
    )
    
    db.session.add(change)
    
    # Delete item
    db.session.delete(item)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('item_deleted', {'id': item_id})
    
    return jsonify({'message': 'Item deleted successfully'}), 200

@app.route('/api/items/<int:item_id>/history', methods=['GET'])
@jwt_required()
def get_item_history(item_id):
    # Check if item exists
    item = Item.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Get history
    changes = InventoryChange.query.filter_by(item_id=item_id).order_by(InventoryChange.timestamp.desc()).all()
    
    return jsonify([change.to_dict() for change in changes]), 200

# User management routes (admin only)
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    admin_id = get_jwt_identity()
    admin = User.query.get(admin_id)
    
    if not admin or admin.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'role' in data:
        user.role = data['role']
    
    if 'email' in data:
        user.email = data['email']
    
    if 'password' in data:
        user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify(user.to_dict()), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    admin_id = get_jwt_identity()
    admin = User.query.get(admin_id)
    
    if not admin or admin.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Prevent self-deletion
    if admin_id == user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'}), 200

# Import OCR module
from ocr_module import extract_text_from_image, parse_invoice_items, match_items_to_inventory

# OCR routes
@app.route('/api/ocr/upload', methods=['POST'])
@jwt_required()
def upload_invoice_ocr():
    print(f"DEBUG: OCR Upload - Received Authorization Header: {request.headers.get('Authorization')}")
    user_id = get_jwt_identity()
    
    if 'invoice_image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['invoice_image']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Save the uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Extract text from the image
        extracted_text = extract_text_from_image(file_path)
        
        if not extracted_text:
            return jsonify({'error': 'Failed to extract text from the image'}), 400
        
        # Parse the extracted text to identify potential items
        potential_items = parse_invoice_items(extracted_text)
        
        if not potential_items:
            return jsonify({
                'warning': 'No potential inventory items detected',
                'image_path': f"/static/uploads/{filename}",
                'extracted_text': extracted_text
            }), 200
        
        # Get all inventory items for matching
        inventory_items = [item.to_dict() for item in Item.query.all()]
        
        # Match potential items to inventory items
        matches = match_items_to_inventory(potential_items, inventory_items)
        
        return jsonify({
            'image_path': f"/static/uploads/{filename}",
            'extracted_text': extracted_text,
            'potential_items': potential_items,
            'matches': matches
        }), 200
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/ocr/process', methods=['POST'])
@jwt_required()
def process_detected_items():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'items' not in data:
        return jsonify({'error': 'Invalid data format'}), 400
    
    items_added = 0
    items_updated = 0
    items_ignored = 0
    
    for item_data in data['items']:
        action = item_data.get('action')
        
        if action == 'ignore':
            items_ignored += 1
            continue
        
        if action == 'add':
            # Add new item
            name = item_data.get('name')
            quantity = float(item_data.get('quantity', 0))
            unit = item_data.get('unit', 'pcs')
            
            if name and unit:
                new_item = Item(
                    name=name,
                    quantity=quantity,
                    unit=unit,
                    created_by=user_id,
                    updated_by=user_id
                )
                
                db.session.add(new_item)
                db.session.commit()
                
                # Record inventory change
                change = InventoryChange(
                    item_id=new_item.id,
                    previous_quantity=0,
                    new_quantity=quantity,
                    change_type='add',
                    user_id=user_id
                )
                
                db.session.add(change)
                db.session.commit()
                
                # Emit real-time update
                socketio.emit('item_added', new_item.to_dict())
                
                items_added += 1
        
        elif action == 'update':
            # Update existing item
            item_id = item_data.get('id')
            quantity = float(item_data.get('quantity', 0))
            
            if item_id:
                item = Item.query.get(item_id)
                
                if item:
                    previous_quantity = item.quantity
                    item.quantity = quantity
                    item.last_updated = datetime.utcnow()
                    item.updated_by = user_id
                    
                    db.session.commit()
                    
                    # Record inventory change
                    change = InventoryChange(
                        item_id=item.id,
                        previous_quantity=previous_quantity,
                        new_quantity=quantity,
                        change_type='update',
                        user_id=user_id
                    )
                    
                    db.session.add(change)
                    db.session.commit()
                    
                    # Emit real-time update
                    socketio.emit('item_updated', item.to_dict())
                    
                    items_updated += 1
    
    return jsonify({
        'message': 'OCR processing complete',
        'items_added': items_added,
        'items_updated': items_updated,
        'items_ignored': items_ignored
    }), 200

# Helper function for file uploads
def allowed_file(filename):
    """Check if the file has an allowed extension."""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# WebSocket events
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error'}), 500

# Run the application
if __name__ == '__main__':
    # Run the application with WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

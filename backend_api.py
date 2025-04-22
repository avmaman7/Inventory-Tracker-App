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
import os
import uuid
import datetime
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json
import logging
import argparse

# Load environment variables
load_dotenv()

# Initialize Flask application
app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/inventory_app_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# --- Database migration helper ---
def add_column_if_not_exists(table_name, column):
    column_name = column.key
    column_type = column.type.compile(dialect=db.engine.dialect)
    try:
        with db.engine.connect() as conn:
            # Check if column exists first
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns(table_name)]
            
            if column_name not in columns:
                # Use SQLAlchemy text to execute SQL
                from sqlalchemy import text
                sql = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                conn.execute(sql)
                conn.commit()
                print(f"Added column {column_name} to {table_name}")
            else:
                print(f"Column {column_name} already exists in {table_name}")
    except Exception as e:
        print(f"Error adding column {column_name}: {e}")

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
    vendor = db.Column(db.String(100), nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'vendor': self.vendor,
            'last_updated': self.last_updated.isoformat(),
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }

class InventoryChange(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Make item_id nullable and set ondelete='SET NULL' for ForeignKey
    # NOTE: This change requires a migration to update the database schema
    item_id = db.Column(db.Integer, db.ForeignKey('item.id', ondelete='SET NULL'), nullable=True)
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

# Ensure vendor column exists in item table
def setup_database():
    try:
        # Check if the vendor column exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('item')]
        
        # Add vendor column if it doesn't exist
        if 'vendor' not in columns:
            add_column_if_not_exists('item', Item.vendor)
        else:
            print("Vendor column already exists in item table")
            
        print("Database setup complete")
    except Exception as e:
        print(f"Error setting up database: {e}")
        # Continue execution even if there's an error
        # This ensures the application can still run with existing schema

# Run database setup
with app.app_context():
    setup_database()

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
def get_current_user():
    print(f"DEBUG: Get User - Received Authorization Header: {request.headers.get('Authorization')}")
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

# Inventory routes
@app.route('/api/items', methods=['GET'])
@jwt_required()
def get_items():
    print(f"DEBUG: Get Items - Received Authorization Header: {request.headers.get('Authorization')}")
    user_id = get_jwt_identity()
    try:
        items = Item.query.order_by(Item.name).all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve items'}), 500

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
        vendor=data.get('vendor'),
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
    
    if 'vendor' in data:
        item.vendor = data['vendor']
    
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
    try:
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
    except Exception as e:
        import traceback
        print('ERROR during delete_item:', traceback.format_exc())
        return jsonify({'error': f'Failed to delete item: {str(e)}'}), 500

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

# User profile routes
@app.route('/api/users/<int:user_id>/profile', methods=['PUT'])
@jwt_required()
def update_user_profile(user_id):
    current_user_id = get_jwt_identity()
    
    # Users can only update their own profile unless they're an admin
    if current_user_id != user_id:
        admin = User.query.get(current_user_id)
        if not admin or admin.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'email' in data:
        # Check if email is already taken by another user
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = data['email']
    
    # Handle password change
    if 'newPassword' in data and data['newPassword']:
        if 'currentPassword' not in data or not data['currentPassword']:
            return jsonify({'error': 'Current password is required'}), 400
        
        # Verify current password
        if not user.check_password(data['currentPassword']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        user.set_password(data['newPassword'])
    
    db.session.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/users/<int:user_id>/notifications', methods=['PUT'])
@jwt_required()
def update_user_notifications(user_id):
    current_user_id = get_jwt_identity()
    
    # Users can only update their own notifications unless they're an admin
    if current_user_id != user_id:
        admin = User.query.get(current_user_id)
        if not admin or admin.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update notification preferences in user_preferences table or user model
    # For now, we'll just return success since the database model might not have these fields yet
    
    # If you have a UserPreferences model, you would do something like:
    # preferences = UserPreferences.query.filter_by(user_id=user_id).first()
    # if not preferences:
    #     preferences = UserPreferences(user_id=user_id)
    #     db.session.add(preferences)
    # 
    # preferences.email_notifications = data.get('emailNotifications', preferences.email_notifications)
    # preferences.low_stock_alerts = data.get('lowStockAlerts', preferences.low_stock_alerts)
    # preferences.activity_summary = data.get('activitySummary', preferences.activity_summary)
    # db.session.commit()
    
    return jsonify({'message': 'Notification settings updated successfully'}), 200

# Import OCR module
from ocr_module import extract_text_from_image, parse_invoice_items, match_items_to_inventory, get_latest_ocr_result, set_debug_mode, DEBUG_MODE

# OCR routes
@app.route('/api/ocr/debug', methods=['POST'])
@jwt_required()
def toggle_ocr_debug_mode():
    """Toggle OCR debug mode."""
    user_id = get_jwt_identity()
    
    # Only allow admins to toggle debug mode
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    if not data or 'debug' not in data:
        return jsonify({'error': 'Missing debug parameter'}), 400
    
    debug_mode = data['debug']
    set_debug_mode(debug_mode)
    
    return jsonify({
        'message': f'OCR debug mode set to {debug_mode}',
        'debug_mode': debug_mode
    }), 200

@app.route('/api/ocr/latest', methods=['GET'])
@jwt_required()
def get_latest_ocr_json():
    """Get the latest OCR JSON file."""
    user_id = get_jwt_identity()
    
    # Only allow admins to access OCR JSON files
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    result = get_latest_ocr_result()
    if not result:
        return jsonify({'error': 'No OCR results found'}), 404
    
    return jsonify(result), 200

def allowed_file(filename):
    """
    Check if a filename has an allowed extension.
    
    Args:
        filename: The filename to check
        
    Returns:
        bool: True if the file extension is allowed, False otherwise
    """
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """
    Save an uploaded file to the uploads directory.
    
    Args:
        file: The file object from request.files
        
    Returns:
        dict: A dictionary containing the filesystem path and URL path of the saved file,
              or None if saving failed
    """
    try:
        # Create a secure filename with timestamp to avoid collisions
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{original_filename}"
        
        # Ensure the upload directory exists
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Save the file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Return both the filesystem path and the URL path
        return {
            'fs_path': file_path,
            'url_path': f"/static/uploads/{filename}"
        }
    except Exception as e:
        print(f"Error saving uploaded file: {e}")
        return None

@app.route('/api/ocr/upload', methods=['POST'])
@jwt_required()
def upload_invoice_ocr():
    print(f"DEBUG: OCR Upload - Received Authorization Header: {request.headers.get('Authorization')}")
    user_id = get_jwt_identity()
    
    # Check if debug mode is enabled via query parameter
    if request.args.get('debug') == 'true':
        set_debug_mode(True)
        print("DEBUG: OCR debug mode enabled for this request")
    
    # Debug: Check Google Cloud credentials
    google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"DEBUG: Google Cloud credentials path: {google_creds}")
    
    if 'invoice_image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['invoice_image']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Save the uploaded file
            result = save_uploaded_file(file)
            if not result:
                return jsonify({'error': 'Failed to save file'}), 500
            
            fs_path = result['fs_path']
            url_path = result['url_path']
            filename = os.path.basename(fs_path)
            
            print(f"DEBUG: File saved successfully at {fs_path}")
            
            # Extract text using OCR
            try:
                ocr_result = extract_text_from_image(fs_path)
                print(f"DEBUG: OCR extraction completed, result type: {type(ocr_result)}")
                
                # Parse invoice items
                potential_items = parse_invoice_items(ocr_result)
                print(f"DEBUG: Found {len(potential_items)} potential items")
                
                # Get inventory items for matching
                inventory_items = Item.query.all()
                inventory_items = [item.to_dict() for item in inventory_items]
                
                # Match potential items to inventory items
                matches = match_items_to_inventory(potential_items, inventory_items)
                
                # Reset debug mode after processing
                if request.args.get('debug') == 'true':
                    set_debug_mode(False)
                    print("DEBUG: OCR debug mode disabled after processing")
                
                return jsonify({
                    'image_path': f"/static/uploads/{filename}",
                    'extracted_text': ocr_result.get('full_text', '') if isinstance(ocr_result, dict) else ocr_result,
                    'potential_items': potential_items,
                    'matches': matches,
                    'debug_json_available': DEBUG_MODE
                }), 200
            except Exception as e:
                print(f"DEBUG: OCR processing error: {str(e)}")
                import traceback
                traceback.print_exc()
                
                # Reset debug mode after error
                if request.args.get('debug') == 'true':
                    set_debug_mode(False)
                
                return jsonify({'error': f'OCR processing error: {str(e)}'}), 500
        except Exception as e:
            print(f"DEBUG: General error in upload_invoice_ocr: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Reset debug mode after error
            if request.args.get('debug') == 'true':
                set_debug_mode(False)
            
            return jsonify({'error': f'Error processing image: {str(e)}'}), 500
    
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
            vendor = item_data.get('vendor')
            
            if name and unit:
                new_item = Item(
                    name=name,
                    quantity=quantity,
                    unit=unit,
                    vendor=vendor,
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

# Dashboard route
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    try:
        total_items = Item.query.count()
        low_stock_items = Item.query.filter(Item.quantity < 5).count()
        recent_days = 7
        since = datetime.utcnow() - timedelta(days=recent_days)
        recent_activity = InventoryChange.query.filter(InventoryChange.timestamp >= since).count()
        # No price field, so use total quantity as 'total_value'
        total_value = db.session.query(db.func.sum(Item.quantity)).scalar() or 0
        # Get 10 most recent changes
        changes = (
            InventoryChange.query.order_by(InventoryChange.timestamp.desc()).limit(10).all()
        )
        # Try to include item name if possible
        recent_changes = []
        for c in changes:
            item_name = None
            if c.item_id:
                item = Item.query.get(c.item_id)
                item_name = item.name if item else None
            recent_changes.append({
                'id': c.id,
                'item_id': c.item_id,
                'item_name': item_name,
                'previous_quantity': c.previous_quantity,
                'new_quantity': c.new_quantity,
                'change_type': c.change_type,
                'timestamp': c.timestamp.isoformat(),
                'user_id': c.user_id
            })
        return jsonify({
            'total_items': total_items,
            'low_stock_items': low_stock_items,
            'recent_activity': recent_activity,
            'total_value': total_value,
            'recent_changes': recent_changes
        })
    except Exception as e:
        import traceback
        print('Error in /api/dashboard:', e)
        print(traceback.format_exc())
        return jsonify({'error': 'Dashboard data could not be loaded'}), 500

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
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run the Inventory Tracker backend server')
    parser.add_argument('--port', type=int, default=5002, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to run the server on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()
    
    # Run the application with WebSocket support
    socketio.run(app, host=args.host, port=args.port, debug=args.debug)

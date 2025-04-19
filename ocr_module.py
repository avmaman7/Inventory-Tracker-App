"""
OCR module for the Inventory Tracking Application.
This module handles image upload and OCR processing for invoice reading.
"""

import os
import re
from google.cloud import vision
from werkzeug.utils import secure_filename
from datetime import datetime

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Define upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static/uploads')

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """Save the uploaded file to the upload folder.
    
    Returns:
        dict: A dictionary containing 'fs_path' (absolute filesystem path) 
              and 'url_path' (relative URL path for web access).
              Returns None if saving fails.
    """
    if not os.path.exists(UPLOAD_FOLDER):
        try:
            os.makedirs(UPLOAD_FOLDER)
        except OSError as e:
            print(f"Error creating upload directory: {e}")
            return None
        
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{filename}"
    
    try:
        fs_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(fs_path)
        # Return the URL path relative to the static folder
        url_path = f"/static/uploads/{filename}"
        return {'fs_path': fs_path, 'url_path': url_path}
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

def extract_text_from_image(image_path):
    """Extract text from an image using Google Cloud Vision API."""
    try:
        # Instantiate the client
        # Assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
        client = vision.ImageAnnotatorClient()

        # Read the image file into memory
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = vision.Image(content=content)

        # Perform document text detection
        response = client.document_text_detection(image=image)

        if response.error.message:
            raise Exception(
                f'{response.error.message}\n'
                f'For more info on error messages, check: '
                f'https://cloud.google.com/apis/design/errors'
            )

        # Extract the full text annotation
        return response.full_text_annotation.text

    except Exception as e:
        print(f"Error extracting text from image using Google Vision: {e}")
        return None

def parse_invoice_items(text):
    """
    Parse the extracted text to identify potential items and quantities.
    Improved: Now ignores lines with header/address/business keywords and only treats lines as items if they contain both a probable name and numeric quantity.
    """
    if not text:
        return []
    
    # Split text into lines
    lines = text.split('\n')
    
    # List to store potential items
    potential_items = []
    
    # Keywords indicating a line is likely NOT an inventory item
    NON_ITEM_KEYWORDS = [
        'total', 'subtotal', 'tax', 'vat', 'gst', 'hst', 'amount', 'due',
        'thank', 'visit', 'address', 'phone', 'tel', 'fax', 'invoice', 'date', 'order',
        'cashier', 'register', 'payment', 'change', 'balance', 'time', 'served', 'table',
        'pizza', 'shop', 'ave', 'street', 'blvd', 'road', 'suite', 'location', 'city', 'zip', 'state', 'country'
    ]
    
    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower or any(keyword in line_lower for keyword in NON_ITEM_KEYWORDS):
            continue  # Skip lines that are empty or contain non-item keywords
        
        # Look for a pattern: [item name] [quantity] [unit] (e.g., "Cheese 5 CS")
        import re
        match = re.match(r"([A-Za-z\s\-]+)\s+(\d+(?:\.\d+)?)\s*([A-Za-z]*)", line)
        if match:
            item_name, quantity, unit = match.group(1).strip(), float(match.group(2)), match.group(3) or "pcs"
            potential_items.append({
                'name': item_name,
                'quantity': quantity,
                'unit': unit,
                'confidence': 'high',
                'line': line
            })
            continue
        
        # If no pattern matches but line has at least 2 words and a number, consider it a potential item
        words = line.split()
        numbers = [w for w in words if any(c.isdigit() for c in w)]
        if len(words) >= 2 and numbers:
            # Use the first number as quantity, rest as name
            for i, w in enumerate(words):
                if any(c.isdigit() for c in w):
                    try:
                        quantity = float(w)
                        item_name = ' '.join(words[:i])
                        unit = 'pcs'
                        potential_items.append({
                            'name': item_name,
                            'quantity': quantity,
                            'unit': unit,
                            'confidence': 'medium',
                            'line': line
                        })
                    except Exception:
                        pass
                    break
    
    return potential_items

def match_items_to_inventory(potential_items, inventory_items):
    """
    Match potential items from OCR to existing inventory items.
    Returns a list of matches with confidence levels.
    """
    matches = []
    
    for pot_item in potential_items:
        best_match = None
        best_score = 0
        
        for inv_item in inventory_items:
            # Simple string matching - calculate what percentage of words match
            pot_words = set(pot_item['name'].lower().split())
            inv_words = set(inv_item['name'].lower().split())
            
            if not pot_words or not inv_words:
                continue
                
            common_words = pot_words.intersection(inv_words)
            score = len(common_words) / max(len(pot_words), len(inv_words))
            
            if score > best_score and score > 0.3:  # Threshold for considering a match
                best_match = inv_item
                best_score = score
        
        if best_match:
            matches.append({
                'potential_item': pot_item,
                'inventory_item': best_match,
                'match_score': best_score,
                'suggested_action': 'update' if best_score > 0.7 else 'review'
            })
        else:
            matches.append({
                'potential_item': pot_item,
                'inventory_item': None,
                'match_score': 0,
                'suggested_action': 'add_new'
            })
    
    return matches

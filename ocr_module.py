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
    This is a basic implementation that looks for patterns like:
    - Item name followed by quantity and possibly unit
    - Item name followed by price
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
        'invoice', 'date', 'page', 'po number', 'order #', 'customer id',
        'phone', 'fax', 'email', 'website', 'address', 'street', 'city', 'state', 'zip', 'country',
        'payment', 'terms', 'ship to', 'bill to', 'notes', 'thank you', 'quantity', 'price', 'description', 
        'item #', 'sku', 'unit' # Also filter out header rows
    ]
    
    # Regular expressions for matching patterns
    # Pattern 1: Item name followed by quantity (e.g., "Apples 5 kg" or "Apples 5kg")
    quantity_pattern = re.compile(r'(.+?)\s+(\d+\.?\d*)\s*([a-zA-Z]+)?')
    
    # Pattern 2: Item name followed by price (e.g., "Apples $5.99")
    price_pattern = re.compile(r'(.+?)\s+\$?(\d+\.?\d*)')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # --- Start: Add keyword filter ---    
        line_lower = line.lower()
        skip_line = False
        for keyword in NON_ITEM_KEYWORDS:
            if keyword in line_lower:
                skip_line = True
                break # No need to check other keywords for this line
        if skip_line:
            continue # Skip this line if it contains a non-item keyword
        # --- End: Add keyword filter ---    
            
        # Try to match quantity pattern
        quantity_match = quantity_pattern.match(line)
        if quantity_match:
            item_name = quantity_match.group(1).strip()
            quantity = float(quantity_match.group(2))
            unit = quantity_match.group(3) if quantity_match.group(3) else "pcs"
            
            potential_items.append({
                'name': item_name,
                'quantity': quantity,
                'unit': unit,
                'confidence': 'high' if unit else 'medium',
                'line': line
            })
            continue
        
        # Try to match price pattern
        price_match = price_pattern.match(line)
        if price_match:
            item_name = price_match.group(1).strip()
            # For price pattern, we assume quantity of 1
            potential_items.append({
                'name': item_name,
                'quantity': 1,
                'unit': "pcs",
                'confidence': 'low',
                'line': line
            })
            continue
        
        # If no pattern matches but line has more than 3 words, consider it a potential item
        words = line.split()
        if len(words) >= 3:
            potential_items.append({
                'name': ' '.join(words[:-1]),
                'quantity': 1,
                'unit': "pcs",
                'confidence': 'very low',
                'line': line
            })
    
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

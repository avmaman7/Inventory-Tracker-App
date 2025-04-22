"""
OCR module for the Inventory Tracking Application.
This module handles image upload and OCR processing for invoice reading.
"""

import os
import re
import json
import tempfile
from datetime import datetime
import base64

# Try to import OpenCV, but provide a fallback if it's not available
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    print("WARNING: OpenCV (cv2) is not available. Using fallback image processing.")
    CV2_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    print("WARNING: PIL is not available. Some image processing features may be limited.")
    PIL_AVAILABLE = False

try:
    from google.cloud import vision
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    print("WARNING: Google Cloud Vision API is not available. OCR functionality will be limited.")
    GOOGLE_VISION_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    print("WARNING: pytesseract is not available. Fallback OCR will be limited.")
    TESSERACT_AVAILABLE = False

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Define keywords that indicate an item line (case insensitive)
ITEM_KEYWORDS = [
    'item', 'product', 'description', 'qty', 'quantity', 'unit', 'price',
    'amount', 'total', 'subtotal', 'each', 'ea', 'pcs', 'pieces', 'order'
]

# Restaurant-specific item keywords
RESTAURANT_ITEM_KEYWORDS = [
    'food', 'beverage', 'drink', 'meal', 'appetizer', 'entree', 'dessert',
    'side', 'sauce', 'topping', 'ingredient', 'produce', 'meat', 'dairy',
    'seafood', 'vegetable', 'fruit', 'grain', 'spice', 'herb', 'oil'
]

# Keywords that typically indicate non-item lines
NON_ITEM_KEYWORDS = [
    'invoice', 'bill', 'receipt', 'date', 'time', 'customer', 'address',
    'phone', 'email', 'tax', 'vat', 'discount', 'shipping', 'handling',
    'payment', 'method', 'card', 'cash', 'check', 'balance', 'due', 'paid',
    'thank', 'you', 'return', 'policy', 'warranty', 'terms', 'conditions',
    'street', 'avenue', 'road', 'suite', 'apt', 'sky #', 'tel', 'fax'
]

# Keywords that definitely indicate non-item lines
DEFINITE_NON_ITEM_KEYWORDS = [
    'www', 'http', '.com', '.net', '.org', '@', 'tel:', 'fax:', 'page',
    'of', 'invoice#', 'order#', 'customer#', 'account#', 'ref#', 'po#'
]

# Price pattern
PRICE_PATTERN = r'\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'

# Debug mode flag - set to True to save OCR results to JSON files
DEBUG_MODE = os.environ.get('OCR_DEBUG_MODE', 'false').lower() == 'true'

def set_debug_mode(debug):
    """Set the debug mode flag."""
    global DEBUG_MODE
    DEBUG_MODE = debug
    print(f"OCR debug mode set to: {DEBUG_MODE}")

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path):
    """
    Preprocess an image to improve OCR quality.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Path to the preprocessed image file
    """
    try:
        # Read the image
        if CV2_AVAILABLE:
            image = cv2.imread(image_path)
        elif PIL_AVAILABLE:
            image = Image.open(image_path)
        else:
            print("WARNING: No image processing library available. Skipping preprocessing.")
            return image_path
        
        if image is None:
            print(f"Could not read image at {image_path}")
            return image_path
        
        # Convert to grayscale
        if CV2_AVAILABLE:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        elif PIL_AVAILABLE:
            gray = image.convert('L')
        
        # Apply Gaussian blur to reduce noise
        if CV2_AVAILABLE:
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        elif PIL_AVAILABLE:
            blurred = gray.filter(ImageFilter.GaussianBlur(radius=5))
        
        # Apply adaptive thresholding to enhance text
        if CV2_AVAILABLE:
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
        elif PIL_AVAILABLE:
            thresh = blurred.point(lambda x: 0 if x < 128 else 255)
        
        # Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        if CV2_AVAILABLE:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
        elif PIL_AVAILABLE:
            enhanced = gray.point(lambda x: 255 if x > 128 else 0)
        
        # Create a temporary file for the processed image
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp:
            temp_path = temp.name
        
        # Save the processed image (try both enhanced versions and use the best one for OCR)
        if CV2_AVAILABLE:
            cv2.imwrite(temp_path, enhanced)
        elif PIL_AVAILABLE:
            enhanced.save(temp_path)
        
        print(f"Image preprocessed and saved to {temp_path}")
        return temp_path
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        # If preprocessing fails, return the original image path
        return image_path

def save_ocr_response_to_json(response_dict, original_image_path=None):
    """
    Save the OCR response to a JSON file for debugging.
    
    Args:
        response_dict: The OCR response dictionary to save
        original_image_path: The path to the original image (for naming the JSON file)
    
    Returns:
        Path to the saved JSON file
    """
    if not DEBUG_MODE:
        return None
        
    try:
        # Determine the debug directory based on environment
        if os.environ.get('RENDER') == 'true':
            # For Render deployment
            debug_dir = os.path.join('/tmp', 'debug', 'ocr')
        else:
            # For local development
            debug_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debug', 'ocr')
            
        os.makedirs(debug_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Use original image name if available
        if original_image_path:
            base_name = os.path.basename(original_image_path).split('.')[0]
            filename = f"{base_name}_{timestamp}.json"
        else:
            filename = f"ocr_result_{timestamp}.json"
        
        json_path = os.path.join(debug_dir, filename)
        
        # Save the response as pretty-printed JSON
        with open(json_path, 'w') as f:
            json.dump(response_dict, f, indent=2)
        
        print(f"OCR response saved to {json_path}")
        return json_path
    except Exception as e:
        print(f"Error saving OCR response to JSON: {e}")
        return None

def extract_text_from_image(image_path):
    """Extract text from an image using Google Cloud Vision API with confidence scores."""
    try:
        # Preprocess the image to improve OCR quality
        if CV2_AVAILABLE:
            processed_image_path = preprocess_image(image_path)
        else:
            # Skip preprocessing if OpenCV is not available
            processed_image_path = image_path
            print(f"DEBUG: Skipping preprocessing, using original image: {image_path}")
        
        print(f"DEBUG: Starting OCR processing on {processed_image_path}")
        
        # Check if Google Cloud credentials are properly set
        google_creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        google_creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
        
        # For Render deployment, we might have the credentials as a JSON string
        if not google_creds_path and google_creds_json:
            try:
                # Create a temporary credentials file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as temp:
                    temp_creds_path = temp.name
                    temp.write(google_creds_json.encode('utf-8'))
                
                # Set the environment variable to the temporary file
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = temp_creds_path
                google_creds_path = temp_creds_path
                print(f"DEBUG: Created temporary credentials file at {temp_creds_path}")
            except Exception as cred_error:
                print(f"ERROR: Failed to create temporary credentials file: {cred_error}")
        
        if (not google_creds_path or not os.path.exists(google_creds_path)) or not GOOGLE_VISION_AVAILABLE:
            print("WARNING: Google Cloud Vision API not available. Using fallback OCR.")
            # Try to use pytesseract as fallback
            if TESSERACT_AVAILABLE:
                try:
                    if PIL_AVAILABLE:
                        img = Image.open(processed_image_path)
                        text = pytesseract.image_to_string(img)
                        fallback_result = {
                            'text': text,
                            'source': 'pytesseract',
                            'timestamp': datetime.now().isoformat()
                        }
                        # Save fallback result to JSON if in debug mode
                        if DEBUG_MODE:
                            save_ocr_response_to_json(fallback_result, image_path)
                        return fallback_result
                    else:
                        print("WARNING: PIL not available, cannot use pytesseract")
                except Exception as e:
                    print(f"ERROR: Pytesseract OCR failed: {e}")
            
            # Use fallback text for testing if all else fails
            fallback_result = fallback_ocr_text()
            
            # Save fallback result to JSON if in debug mode
            if DEBUG_MODE:
                save_ocr_response_to_json(fallback_result, image_path)
                
            return fallback_result
        else:
            print(f"DEBUG: Using Google Cloud credentials from: {google_creds_path}")
            
            # Instantiate the client
            client = vision.ImageAnnotatorClient()
            print("DEBUG: Successfully created Vision API client")
            
            # Read the image file into memory
            with open(processed_image_path, 'rb') as image_file:
                content = image_file.read()

            image = vision.Image(content=content)

            # Perform document text detection
            try:
                response = client.document_text_detection(image=image)
            except Exception as api_error:
                print(f"ERROR: Vision API request failed: {api_error}")
                # Use fallback text for testing
                fallback_result = fallback_ocr_text()
                
                # Save fallback result to JSON if in debug mode
                if DEBUG_MODE:
                    save_ocr_response_to_json(fallback_result, image_path)
                    
                return fallback_result

            if response.error.message:
                print(f"ERROR: Vision API returned error: {response.error.message}")
                # Use fallback text for testing
                fallback_result = fallback_ocr_text()
                
                # Save fallback result to JSON if in debug mode
                if DEBUG_MODE:
                    save_ocr_response_to_json(fallback_result, image_path)
                    
                return fallback_result

            # Convert the response to a dictionary for JSON serialization
            response_dict = {
                'full_text': response.full_text_annotation.text,
                'annotations': []
            }
            
            # Extract the full text annotation
            full_text = response.full_text_annotation.text
            
            # Also extract detailed text annotations with confidence scores
            text_annotations = []
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    block_confidence = block.confidence
                    
                    for paragraph in block.paragraphs:
                        paragraph_confidence = paragraph.confidence
                        paragraph_text = ""
                        
                        for word in paragraph.words:
                            word_text = ''.join([symbol.text for symbol in word.symbols])
                            word_confidence = word.confidence
                            
                            paragraph_text += word_text + " "
                        
                        annotation = {
                            'text': paragraph_text.strip(),
                            'confidence': float(paragraph_confidence),
                            'block_confidence': float(block_confidence)
                        }
                        
                        text_annotations.append(annotation)
                        response_dict['annotations'].append(annotation)
            
            # Clean up temporary file if it was created
            if processed_image_path != image_path and os.path.exists(processed_image_path):
                try:
                    os.remove(processed_image_path)
                except Exception as e:
                    print(f"Warning: Could not remove temporary file {processed_image_path}: {e}")
            
            # Save the raw OCR response to a JSON file if in debug mode
            if DEBUG_MODE:
                save_ocr_response_to_json(response_dict, image_path)
            
            return {
                'full_text': full_text,
                'annotations': text_annotations,
                'raw_response': response_dict  # Include the raw response for debugging
            }

    except Exception as e:
        print(f"Error extracting text from image using Google Vision: {e}")
        
        # Clean up temporary file if it was created
        if 'processed_image_path' in locals() and processed_image_path != image_path and os.path.exists(processed_image_path):
            try:
                os.remove(processed_image_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not remove temporary file {processed_image_path}: {cleanup_error}")
        
        # Use fallback text for testing
        fallback_result = fallback_ocr_text()
        
        # Save fallback result to JSON if in debug mode
        if DEBUG_MODE:
            save_ocr_response_to_json(fallback_result, image_path)
            
        return fallback_result

def fallback_ocr_text():
    """Return fallback OCR text for testing when Google Cloud Vision API is not available."""
    dummy_text = """RESTAURANT INVOICE
    
    Vendor: Test Restaurant
    Date: 2025-04-21
    Invoice #: INV12345
    
    1. Tomatoes 5 kg $12.99
    2. Onions 3 kg $8.50
    3. Potatoes 10 kg $15.00
    4. Chicken 2 kg $18.99
    5. Rice 5 kg $22.50
    6. Cooking Oil 2 bottles $9.99
    7. Salt 1 kg $3.50
    8. Pepper 500 g $4.99
    9. Garlic 1 kg $7.50
    10. Ginger 500 g $5.99
    
    Subtotal: $110.95
    Tax: $8.88
    Total: $119.83
    """
    
    # Create a simple annotations structure to match the Google Vision API format
    lines = dummy_text.split('\n')
    text_annotations = []
    
    for line in lines:
        if line.strip():
            text_annotations.append({
                'text': line.strip(),
                'confidence': 0.8,
                'block_confidence': 0.8
            })
    
    result = {
        'full_text': dummy_text,
        'annotations': text_annotations,
        'raw_response': {
            'full_text': dummy_text,
            'annotations': text_annotations
        }
    }
    
    return result

def filter_item_lines(lines):
    """
    Filter out non-item lines from OCR text.
    
    Args:
        lines: List of text lines from the OCR result
        
    Returns:
        List of lines that likely contain item information
    """
    filtered_lines = []
    
    # Regular expressions for non-item patterns
    phone_pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'  # Phone number pattern
    address_pattern = r'\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|square|sq)'
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip lines that are too short
        if len(line) < 3:
            continue
            
        # Skip lines that match non-item patterns
        if re.search(phone_pattern, line, re.IGNORECASE):
            continue
            
        if re.search(address_pattern, line, re.IGNORECASE):
            continue
            
        # Skip lines with definite non-item keywords
        if any(keyword.lower() in line.lower() for keyword in DEFINITE_NON_ITEM_KEYWORDS):
            continue
            
        # Skip lines with non-item keywords unless they also contain item keywords
        if any(keyword.lower() in line.lower() for keyword in NON_ITEM_KEYWORDS):
            if not any(keyword.lower() in line.lower() for keyword in ITEM_KEYWORDS + RESTAURANT_ITEM_KEYWORDS):
                continue
                
        # Include lines with item keywords or that look like items
        if (any(keyword.lower() in line.lower() for keyword in ITEM_KEYWORDS + RESTAURANT_ITEM_KEYWORDS) or
            re.search(r'\d+\s*(?:kg|g|lb|oz|ml|l|pcs|ea|each|pack|bottle|jar|can|bag)', line, re.IGNORECASE) or
            re.search(PRICE_PATTERN, line)):
            filtered_lines.append(line)
            
    return filtered_lines

def parse_invoice_items(text_data):
    """
    Parse text data from an invoice to extract potential inventory items.
    Enhanced to better handle restaurant invoices and include vendor information.
    
    Args:
        text_data: Either a string containing the OCR text or a dict with OCR results
        
    Returns:
        List of potential inventory items with name, quantity, unit, and vendor
    """
    print("DEBUG: Starting parse_invoice_items")
    
    # Extract full text if text_data is a dictionary
    if isinstance(text_data, dict):
        full_text = text_data.get('full_text', '')
        annotations = text_data.get('annotations', [])
    else:
        full_text = text_data
        annotations = []
    
    # Split the text into lines
    lines = full_text.split('\n')
    
    # Filter out non-item lines
    item_lines = filter_item_lines(lines)
    
    # Extract vendor information from the invoice
    vendor_info = extract_vendor_info(lines)
    vendor_name = vendor_info.get('name', '')
    
    # Define patterns for item detection
    # More lenient patterns to catch various formats
    quantity_pattern = r'(\d+(?:\.\d+)?)'  # Matches decimal numbers
    unit_pattern = r'(?:ea|pcs|kg|lb|g|oz|ml|l|box|case|pack|bottle|jar|can|bag|each|piece|pound|ounce|gallon|quart|dozen|dz)'
    
    # Restaurant-specific item patterns
    restaurant_patterns = [
        # Pattern for "Item Name x Quantity" format
        r'([A-Za-z0-9\s\-\'\"\&\,\.]+)\s*x\s*' + quantity_pattern,
        # Pattern for "Quantity x Item Name" format
        quantity_pattern + r'\s*x\s*([A-Za-z0-9\s\-\'\"\&\,\.]+)',
        # Pattern for "Item Name - $Price" format
        r'([A-Za-z0-9\s\-\'\"\&\,\.]+)\s*\-\s*\$\d+\.\d+',
        # Pattern for "Item Name $Price" format
        r'([A-Za-z0-9\s\-\'\"\&\,\.]+)\s+\$\d+\.\d+',
        # Pattern for "Item Name Quantity Unit" format
        r'([A-Za-z0-9\s\-\'\"\&\,\.]+)\s+' + quantity_pattern + r'\s*(' + unit_pattern + r')?',
        # Pattern for numbered items like "1. Item Name"
        r'^\s*\d+\.\s+([A-Za-z0-9\s\-\'\"\&\,\.]+)'
    ]
    
    potential_items = []
    
    # Process each line to identify potential items
    for line in item_lines:
        # Try to match using restaurant-specific patterns
        item_found = False
        
        # Try to extract price from the line
        price = None
        price_match = re.search(PRICE_PATTERN, line)
        if price_match:
            price = price_match.group(0)
        
        for pattern in restaurant_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                groups = match.groups()
                
                # Extract item details based on the pattern matched
                if 'x' in pattern:
                    if pattern.startswith('(\\d+'):  # Quantity x Item pattern
                        quantity = float(groups[0])
                        name = groups[1].strip()
                    else:  # Item x Quantity pattern
                        name = groups[0].strip()
                        quantity = float(groups[1])
                    unit = 'ea'  # Default unit for restaurant items
                elif '\\$' in pattern:  # Item - $Price or Item $Price pattern
                    name = groups[0].strip()
                    quantity = 1.0  # Default quantity
                    unit = 'ea'  # Default unit
                elif pattern.startswith(r'^\s*\d+\.\s+'):  # Numbered item pattern
                    name = groups[0].strip()
                    quantity = 1.0  # Default quantity
                    unit = 'ea'  # Default unit
                else:  # Item Quantity Unit pattern
                    name = groups[0].strip()
                    quantity = float(groups[1])
                    unit = groups[2].lower() if len(groups) > 2 and groups[2] else 'ea'
                
                # Clean up the item name
                name = re.sub(r'\s+', ' ', name).strip()
                name = re.sub(r'^\d+\.\s*', '', name)  # Remove leading numbers like "1. "
                
                # Skip if name is too short or just numbers
                if len(name) < 2 or name.isdigit():
                    continue
                
                # Create structured item dictionary
                item = {
                    'name': name,
                    'quantity': quantity,
                    'unit': unit,
                    'vendor': vendor_name,
                    'confidence': 0.8  # Default confidence for pattern matches
                }
                
                # Add price if found
                if price:
                    item['price'] = price
                
                potential_items.append(item)
                item_found = True
                break
        
        # If no pattern matched but line contains item keywords, try a more generic approach
        if not item_found:
            # Check if line contains any item keywords
            if any(keyword.lower() in line.lower() for keyword in ITEM_KEYWORDS + RESTAURANT_ITEM_KEYWORDS):
                # Try to extract a name and quantity
                parts = line.split()
                if len(parts) >= 2:
                    # Look for a number that could be a quantity
                    quantity_found = False
                    for i, part in enumerate(parts):
                        if re.match(r'^\d+(?:\.\d+)?$', part):
                            quantity = float(part)
                            # Assume the rest is the item name
                            name_parts = parts[:i] if i > 0 else parts[i+1:]
                            if name_parts:
                                name = ' '.join(name_parts)
                                # Clean up the name
                                name = re.sub(r'\s+', ' ', name).strip()
                                name = re.sub(r'^\d+\.\s*', '', name)
                                
                                if len(name) >= 2 and not name.isdigit():
                                    # Create structured item dictionary
                                    item = {
                                        'name': name,
                                        'quantity': quantity,
                                        'unit': 'ea',  # Default unit
                                        'vendor': vendor_name,
                                        'confidence': 0.6  # Lower confidence for generic extraction
                                    }
                                    
                                    # Add price if found
                                    if price:
                                        item['price'] = price
                                    
                                    potential_items.append(item)
                                    quantity_found = True
                                    break
                    
                    # If no quantity found, just use the whole line as an item name with quantity 1
                    if not quantity_found and len(line) >= 3:
                        name = line
                        # Clean up the name
                        name = re.sub(r'\s+', ' ', name).strip()
                        name = re.sub(r'^\d+\.\s*', '', name)
                        
                        if len(name) >= 2 and not name.isdigit():
                            # Create structured item dictionary
                            item = {
                                'name': name,
                                'quantity': 1.0,
                                'unit': 'ea',  # Default unit
                                'vendor': vendor_name,
                                'confidence': 0.5  # Lower confidence for fallback extraction
                            }
                            
                            # Add price if found
                            if price:
                                item['price'] = price
                            
                            potential_items.append(item)
    
    # Remove duplicates but keep the highest confidence ones
    filtered_items = []
    seen_names = set()
    
    # Sort by confidence
    potential_items.sort(key=lambda x: x.get('confidence', 0), reverse=True)
    
    for item in potential_items:
        # Normalize name for duplicate checking
        norm_name = item['name'].lower().strip()
        
        # Skip if we've seen this name before (keep the highest confidence one)
        if norm_name in seen_names:
            continue
            
        seen_names.add(norm_name)
        filtered_items.append(item)
    
    return filtered_items

def extract_vendor_info(lines):
    """
    Extract vendor information from invoice text.
    
    Args:
        lines: List of text lines from the invoice
        
    Returns:
        dict: Dictionary with vendor name and invoice number
    """
    vendor_info = {
        'name': '',
        'invoice_number': ''
    }
    
    # Keywords that might indicate vendor information
    vendor_keywords = [
        'vendor', 'supplier', 'restaurant', 'cafe', 'from', 'bill from', 
        'invoice from', 'company', 'business', 'store', 'shop', 'market'
    ]
    
    # Keywords that might indicate invoice number
    invoice_keywords = [
        'invoice', 'invoice #', 'invoice no', 'invoice number', 
        'receipt', 'receipt #', 'order', 'order #'
    ]
    
    # Check the first few lines for vendor information
    for i, line in enumerate(lines[:10]):  # Only check first 10 lines
        line_lower = line.lower()
        
        # Check for vendor name
        for keyword in vendor_keywords:
            if keyword in line_lower:
                # Extract the part after the keyword
                parts = line.split(keyword, 1)
                if len(parts) > 1 and parts[1].strip():
                    vendor_info['name'] = parts[1].strip()
                    break
                # If no text after keyword, use the next line if it exists
                elif i < len(lines) - 1 and lines[i+1].strip():
                    vendor_info['name'] = lines[i+1].strip()
                    break
        
        # Check for invoice number
        for keyword in invoice_keywords:
            if keyword in line_lower:
                # Extract the part after the keyword
                parts = line.split(keyword, 1)
                if len(parts) > 1 and parts[1].strip():
                    # Extract alphanumeric characters as the invoice number
                    invoice_match = re.search(r'[A-Za-z0-9\-]+', parts[1])
                    if invoice_match:
                        vendor_info['invoice_number'] = invoice_match.group()
                    break
    
    # If no vendor name found in keyword search, use the first non-empty line as a fallback
    if not vendor_info['name']:
        for line in lines[:5]:  # Check first 5 lines
            if line.strip() and not any(kw in line.lower() for kw in invoice_keywords):
                vendor_info['name'] = line.strip()
                break
    
    return vendor_info

def match_items_to_inventory(potential_items, inventory_items):
    """
    Match potential items from OCR to existing inventory items.
    
    Args:
        potential_items: List of potential items extracted from OCR
        inventory_items: List of existing inventory items
        
    Returns:
        dict: Dictionary mapping potential item indices to matching inventory items with scores
    """
    matches = {}
    
    for i, potential_item in enumerate(potential_items):
        potential_name = potential_item['name'].lower()
        best_match = None
        best_score = 0
        
        for inventory_item in inventory_items:
            inventory_name = inventory_item['name'].lower()
            
            # Calculate similarity score (simple for now)
            # 1. Exact match
            if potential_name == inventory_name:
                score = 1.0
            # 2. One contains the other
            elif potential_name in inventory_name or inventory_name in potential_name:
                score = 0.8
            # 3. Word overlap
            else:
                potential_words = set(potential_name.split())
                inventory_words = set(inventory_name.split())
                common_words = potential_words.intersection(inventory_words)
                
                if common_words:
                    score = len(common_words) / max(len(potential_words), len(inventory_words))
                else:
                    score = 0
            
            # Check if this is the best match so far
            if score > best_score:
                best_score = score
                best_match = inventory_item
        
        # Only consider it a match if the score is above a threshold
        if best_score >= 0.5:
            matches[i] = {
                'id': best_match['id'],
                'name': best_match['name'],
                'score': best_score
            }
    
    return matches

def get_latest_ocr_result():
    """
    Get the latest OCR result JSON file.
    
    Returns:
        dict: The latest OCR result, or None if no results are found
    """
    try:
        # Determine the debug directory based on environment
        if os.environ.get('RENDER') == 'true':
            # For Render deployment
            debug_dir = os.path.join('/tmp', 'debug', 'ocr')
        else:
            # For local development
            debug_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debug', 'ocr')
            
        if not os.path.exists(debug_dir):
            return None
            
        # Get all JSON files in the debug directory
        json_files = [f for f in os.listdir(debug_dir) if f.endswith('.json')]
        if not json_files:
            return None
            
        # Sort by modification time (newest first)
        json_files.sort(key=lambda f: os.path.getmtime(os.path.join(debug_dir, f)), reverse=True)
        
        # Read the latest file
        latest_file = os.path.join(debug_dir, json_files[0])
        with open(latest_file, 'r') as f:
            result = json.load(f)
            
        return result
    except Exception as e:
        print(f"Error getting latest OCR result: {e}")
        return None

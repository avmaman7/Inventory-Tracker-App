import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  Divider,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Fab
} from '@mui/material';
import { 
  CameraAlt as CameraIcon,
  PhotoLibrary as GalleryIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Add as AddIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import { useInventoryUpdates } from '../hooks/useInventoryUpdates';
import axios from 'axios';

const OCRCapture = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [potentialItems, setPotentialItems] = useState([]);
  const [matches, setMatches] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const fileInputRef = useRef(null);
  const { items, addItem, updateItem } = useInventoryUpdates();
  
  // Steps for the OCR process
  const steps = ['Capture Invoice', 'Review Detected Items', 'Process Items'];
  
  // Handle file selection
  const handleFileSelect = (e) => {
    console.log('DEBUG OCR: handleFileSelect triggered');
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: 'Please select a valid image file (JPEG, PNG)',
        severity: 'error'
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'File size exceeds 5MB limit',
        severity: 'error'
      });
      return;
    }
    
    setImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle camera capture
  const handleCameraCapture = () => {
    fileInputRef.current.setAttribute('capture', 'environment');
    fileInputRef.current.click();
  };
  
  // Handle gallery selection
  const handleGallerySelect = () => {
    fileInputRef.current.removeAttribute('capture');
    fileInputRef.current.click();
  };
  
  // Process image with OCR
  const processImage = async () => {
    console.log("DEBUG OCR: processImage started");
    if (!image) {
      console.error("DEBUG OCR: No image selected");
      setSnackbar({
        open: true,
        message: 'Please select an image first',
        severity: 'error'
      });
      return false; // Return false on initial error
    }
    
    setLoading(true);
    setError(null);
    
    let formData;
    let token;
    try {
      // Create form data
      console.log("DEBUG OCR: Preparing FormData and checking token");
      formData = new FormData();
      formData.append('invoice_image', image); // Ensure key matches backend
      console.log("DEBUG OCR: FormData created successfully");
      
      token = localStorage.getItem('token');
      if (!token) {
        console.error("DEBUG OCR: No token found before API call preparation");
        throw new Error('Authentication error. Please log in again.');
      }
      console.log("DEBUG OCR: Token check successful");
    } catch (prepError) {
      console.error("DEBUG OCR: Error during PREPARATION before API call:", prepError);
      setError(`Error preparing image for upload: ${prepError.message}`);
      setLoading(false);
      return false; // Return false on prep error
    }
    
    try {
      console.log("DEBUG OCR: Sending image to /api/ocr/upload");
      const response = await axios.post('/api/ocr/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Interceptor should add Authorization header
        },
      });
      console.log("DEBUG OCR: axios.post successful, response received.");

      // --- Restore post-processing logic --- 
      console.log('DEBUG OCR: API Response data:', response.data);
      const { extracted_text, potential_items, matches } = response.data;
      console.log('DEBUG OCR: Extracted Text:', extracted_text ? extracted_text.substring(0, 50) + '...' : 'None');
      console.log('DEBUG OCR: Potential Items count:', potential_items ? potential_items.length : 0);
      console.log('DEBUG OCR: Matches count:', matches ? Object.keys(matches).length : 0);

      setExtractedText(extracted_text || 'No text extracted.');
      setPotentialItems(potential_items || []);
      setMatches(matches || {});

      // Initialize selectedItems based on potential items and matches
      const initialSelectedItems = (potential_items || []).map((pItem, index) => {
        const matchInfo = matches ? matches[index] : null; // Find match for this potential item
        return {
          tempId: `temp-${index}-${Date.now()}`, // Unique temporary ID for UI mapping
          name: pItem.name,
          quantity: pItem.quantity || 1, // Default quantity if missing
          unit: pItem.unit || 'pcs',     // Default unit if missing
          action: matchInfo ? 'update' : 'add', // Default action based on match
          id: matchInfo ? matchInfo.id : null,    // Existing inventory ID if matched
        };
      });
      console.log('DEBUG OCR: Initializing selectedItems state:', initialSelectedItems);
      setSelectedItems(initialSelectedItems);

      setLoading(false);
      return true; // Return true on success

    } catch (err) {
      console.error("DEBUG OCR: axios.post to /api/ocr/upload FAILED:", err);
      let message = 'Failed to process image.';
      if (err.response) {
        console.error("DEBUG OCR: Error response data:", err.response.data);
        message = err.response.data.error || err.response.data.message || message;
        if (err.response.status === 401) {
          message = 'Authentication failed. Please log out and log back in.';
          // Potentially trigger logout here
        }
      } else {
        console.error("DEBUG OCR: Error message:", err.message);
        message = err.message;
      }
      setError(message);
      setPotentialItems([]);
      setMatches({});
      setLoading(false); // Ensure loading is set to false in catch block
      return false; // Return false on API error
    } 
    // Removed finally block as setLoading is handled in success/error paths now
  };

  // Handle item selection change
  const handleItemActionChange = (tempId, action) => {
    const updatedItems = [...selectedItems];
    const itemIndex = updatedItems.findIndex(item => item.tempId === tempId);
    if (itemIndex !== -1) {
      updatedItems[itemIndex].action = action;
      setSelectedItems(updatedItems);
    }
  };
  
  // Handle item quantity change
  const handleItemQuantityChange = (tempId, quantity) => {
    const updatedItems = [...selectedItems];
    const itemIndex = updatedItems.findIndex(item => item.tempId === tempId);
    if (itemIndex !== -1) {
      updatedItems[itemIndex].quantity = parseInt(quantity, 10) || 0; // Ensure quantity is a number
      setSelectedItems(updatedItems);
    }
  };
  
  // Process selected items
  const processItems = async () => {
    console.log("DEBUG OCR: processItems started");
    setLoading(true);
    setError(null);
    let successCount = 0;
    let errorCount = 0;
    const itemsToProcess = selectedItems.filter(item => item.action === 'add' || item.action === 'update');
    console.log(`DEBUG OCR: Processing ${itemsToProcess.length} items based on selected actions.`);
    
    for (const item of itemsToProcess) {
      try {
        if (item.action === 'add') {
          console.log("DEBUG OCR: processItems - Adding item:", item.name, item.quantity, item.unit);
          await addItem({ name: item.name, quantity: item.quantity, unit: item.unit || 'pcs' });
          successCount++;
        } else if (item.action === 'update') {
          // Ensure item.id is valid before attempting update
          if (!item.id) {
            console.warn("DEBUG OCR: Skipping update for item without ID:", item.name);
            // Optionally treat as an error or just skip
            continue; 
          }
          console.log("DEBUG OCR: processItems - Updating item ID:", item.id, "with quantity/unit:", item.quantity, item.unit);
          await updateItem(item.id, { quantity: item.quantity, unit: item.unit || 'pcs' });
          successCount++;
        }
        console.log("DEBUG OCR: processItems - Successfully processed item:", item.name || item.id);
      } catch (err) {
        console.error("DEBUG OCR: Error processing item:", item, err);
        errorCount++;
        // Update error state, maybe collect errors instead of overwriting
        setError(`Failed to process item: ${item.name || `ID ${item.id}`}. ${err.response?.data?.error || err.message}`);
        // Stop processing further items on error? Or show summary? Currently continues.
      }
    }
    
    console.log("DEBUG OCR: processItems finished. Success:", successCount, "Errors:", errorCount);
    setLoading(false);
    
    if (errorCount === 0 && successCount > 0) {
      setSnackbar({ open: true, message: `Successfully processed ${successCount} items.`, severity: 'success' });
    } else if (errorCount > 0) {
      setSnackbar({ open: true, message: `Processed ${successCount} items with ${errorCount} errors. Check console/error message.`, severity: 'warning' });
    } else if (successCount === 0 && errorCount === 0) {
       setSnackbar({ open: true, message: 'No items were selected for processing.', severity: 'info' });
    }
    
    // Return true if at least some items were processed, false if major failure occurred
    // For now, returning true unless the loop itself crashes (which shouldn't happen with try/catch)
    return errorCount === 0; // Return true only if NO errors occurred
  };

  // Handle step navigation
  const handleNext = async () => { // Make async
    console.log(`DEBUG OCR: handleNext called. Current step: ${activeStep}`);
    let shouldAdvance = false;

    if (activeStep === 0) {
      console.log("DEBUG OCR: Calling await processImage() from handleNext (step 0 -> 1)");
      const success = await processImage(); // Await the result
      console.log(`DEBUG OCR: processImage returned: ${success}`);
      if (success) {
        shouldAdvance = true;
      } else {
        console.log("DEBUG OCR: processImage failed, not advancing step.");
        // Error state should already be set by processImage
      }
    } else if (activeStep === 1) {
      console.log("DEBUG OCR: Calling await processItems() from handleNext (step 1 -> 2)");
      const success = await processItems(); // Await the result (assuming processItems is updated)
      console.log(`DEBUG OCR: processItems returned: ${success}`);
      if (success) {
          shouldAdvance = true;
      } else {
        console.log("DEBUG OCR: processItems failed, not advancing step.");
         // Error state should already be set by processItems
      }
    } else if (activeStep === steps.length - 1) {
      console.log("DEBUG OCR: Final step reached (Process button clicked)");
      // This case might need re-evaluation. If step 1's 'Next' calls processItems,
      // clicking 'Process' on the last step might be redundant or need different logic.
      // For now, let's assume it indicates completion.
      setSnackbar({ open: true, message: 'Items processed successfully!', severity: 'success' });
      // Maybe navigate away or reset state here
      // setActiveStep(0); // Reset example
       return; // Don't advance further
    }

    if (shouldAdvance) {
      const nextStep = activeStep + 1;
      console.log(`DEBUG OCR: Advancing step from ${activeStep} to ${nextStep}`);
      setActiveStep(nextStep);
    } else {
      console.log(`DEBUG OCR: Staying on step ${activeStep} due to processing failure or final step.`);
    }
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Render step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            
            {imagePreview ? (
              <Box sx={{ mb: 3 }}>
                <img 
                  src={imagePreview} 
                  alt="Invoice preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
              </Box>
            ) : (
              <Box 
                sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: '8px',
                  p: 5,
                  mb: 3,
                  backgroundColor: '#f9f9f9'
                }}
              >
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Take a photo or select an image of your invoice
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make sure the text is clearly visible and the image is well-lit
                </Typography>
              </Box>
            )}
            
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Button
                  variant="contained"
                  startIcon={<CameraIcon />}
                  onClick={handleCameraCapture}
                  sx={{ px: 3 }}
                >
                  Camera
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<GalleryIcon />}
                  onClick={handleGallerySelect}
                  sx={{ px: 3 }}
                >
                  Gallery
                </Button>
              </Grid>
            </Grid>
          </Box>
        );
      
      case 1:
        console.log(`DEBUG OCR: Rendering Step 1. selectedItems length: ${selectedItems.length}`); // Add log here
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Detected Items
            </Typography>
            
            {/* Check selectedItems length instead of potentialItems */}
            {selectedItems.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No reviewable items found or processing failed. Check console/try again.
              </Alert>
            ) : (
              <List>
                {selectedItems.map((item) => (
                  <React.Fragment key={item.tempId}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {item.name}
                            {item.matchScore > 0.7 && (
                              <Chip 
                                label="Good Match" 
                                size="small" 
                                color="success" 
                                sx={{ ml: 1 }}
                              />
                            )}
                            {item.matchScore > 0.3 && item.matchScore <= 0.7 && (
                              <Chip 
                                label="Possible Match" 
                                size="small" 
                                color="warning" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <TextField
                              label="Quantity"
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => { 
                                console.log(`DEBUG OCR: Quantity changed for ${item.tempId} to ${e.target.value}`);
                                handleItemQuantityChange(item.tempId, parseFloat(e.target.value) || 0)
                              }}
                              InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                              sx={{ width: '100px', mr: 2 }}
                            />
                            <Typography 
                              component="span" 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ mr: 2 }}
                            >
                              {item.unit}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                            color={item.action === 'update' ? 'primary' : 'default'}
                            onClick={() => { 
                              console.log(`DEBUG OCR: Update clicked for ${item.tempId}`);
                              handleItemActionChange(item.tempId, 'update')
                            }}
                            disabled={!item.id}
                            title="Update existing item"
                          >
                            <CheckIcon />
                          </IconButton>
                          
                          <IconButton 
                            color={item.action === 'add' ? 'success' : 'default'}
                            onClick={() => { 
                              console.log(`DEBUG OCR: Add clicked for ${item.tempId}`);
                              handleItemActionChange(item.tempId, 'add')
                            }}
                            title="Add as new item"
                          >
                            <AddIcon />
                          </IconButton>
                          
                          <IconButton 
                            color={item.action === 'ignore' ? 'error' : 'default'}
                            onClick={() => { 
                              console.log(`DEBUG OCR: Ignore clicked for ${item.tempId}`);
                              handleItemActionChange(item.tempId, 'ignore')
                            }}
                            title="Ignore this item"
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
            
            {extractedText && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Extracted Text
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {extractedText}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Confirm Changes
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review the changes below before processing.
            </Alert>
            
            <Typography variant="subtitle1" gutterBottom>
              Items to Add
            </Typography>
            
            {selectedItems.filter(item => item.action === 'add').length > 0 ? (
              <List>
                {selectedItems
                  .filter(item => item.action === 'add')
                  .map((item) => (
                    <ListItem key={item.tempId}>
                      <ListItemText
                        primary={item.name}
                        secondary={`${item.quantity} ${item.unit}`}
                      />
                    </ListItem>
                  ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No items to add
              </Typography>
            )}
            
            <Typography variant="subtitle1" gutterBottom>
              Items to Update
            </Typography>
            
            {selectedItems.filter(item => item.action === 'update').length > 0 ? (
              <List>
                {selectedItems
                  .filter(item => item.action === 'update')
                  .map((item) => {
                    const existingItem = items.find(i => i.id === item.id);
                    return (
                      <ListItem key={item.tempId}>
                        <ListItemText
                          primary={item.name}
                          secondary={
                            <>
                              Current: {existingItem?.quantity} {existingItem?.unit}
                              <br />
                              New: {item.quantity} {item.unit}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No items to update
              </Typography>
            )}
          </Box>
        );
      
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          OCR Invoice Processing
        </Typography>
        
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {getStepContent(activeStep)}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={activeStep === steps.length - 1 ? <CheckIcon /> : <NextIcon />}
                  disabled={activeStep === 0 && !image}
                >
                  {activeStep === steps.length - 1 ? 'Process' : 'Next'}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default OCRCapture;

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Grid,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import Layout from '../components/Layout/Layout';
import { useInventoryUpdates } from '../hooks/useInventoryUpdates';
import { useAuth } from '../contexts/AuthContext';

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateItem, getItemHistory } = useInventoryUpdates();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Find the item in the items array
  useEffect(() => {
    if (items.length > 0) {
      const foundItem = items.find(i => i.id === parseInt(id));
      if (foundItem) {
        setItem(foundItem);
        setLoading(false);
      } else {
        setError('Item not found');
        setLoading(false);
      }
    }
  }, [id, items]);
  
  // Fetch item details if not found in items array
  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/items/${id}`);
        setItem(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError('Failed to load item details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (!item && items.length > 0) {
      fetchItemDetails();
    }
  }, [id, item, items]);
  
  // Fetch item history when tab changes to history
  useEffect(() => {
    const fetchHistory = async () => {
      if (tabValue === 1 && history.length === 0) {
        setHistoryLoading(true);
        const result = await getItemHistory(id);
        
        if (result.success) {
          setHistory(result.data);
        } else {
          setSnackbar({
            open: true,
            message: result.error,
            severity: 'error'
          });
        }
        setHistoryLoading(false);
      }
    };
    
    fetchHistory();
  }, [tabValue, id, getItemHistory, history.length]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  // Get change description
  const getChangeDescription = (change) => {
    switch (change.change_type) {
      case 'add':
        return `Added with quantity ${change.new_quantity}`;
      case 'update':
        const diff = change.new_quantity - change.previous_quantity;
        const sign = diff > 0 ? '+' : '';
        return `Updated from ${change.previous_quantity} to ${change.new_quantity} (${sign}${diff})`;
      case 'delete':
        return `Deleted (was ${change.previous_quantity})`;
      default:
        return `Changed to ${change.new_quantity}`;
    }
  };
  
  // Get user who made the change
  const getUserName = async (userId) => {
    if (!userId) return 'System';
    
    try {
      const response = await axios.get(`/api/users/${userId}`);
      return response.data.username;
    } catch (err) {
      return `User ${userId}`;
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }
  
  if (error || !item) {
    return (
      <Layout>
        <Box sx={{ mb: 4 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/inventory')}
            sx={{ mb: 2 }}
          >
            Back to Inventory
          </Button>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" color="error">
              {error || 'Item not found'}
            </Typography>
          </Paper>
        </Box>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/inventory')}
          sx={{ mb: 2 }}
        >
          Back to Inventory
        </Button>
        
        <Paper sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            mb: 2
          }}>
            <Typography variant="h4" component="h1">
              {item.name}
            </Typography>
            
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={() => {
                // Navigate to edit dialog or open edit dialog
                navigate('/inventory', { 
                  state: { openEditDialog: true, editItemId: item.id } 
                });
              }}
            >
              Edit
            </Button>
          </Box>
          
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Details" />
            <Tab label="History" />
          </Tabs>
          
          {/* Details Tab */}
          {tabValue === 0 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Current Quantity
                      </Typography>
                      <Typography variant="h3" sx={{ mt: 1 }}>
                        {item.quantity} <Typography component="span" variant="h5">{item.unit}</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {formatDate(item.last_updated)}
                      </Typography>
                      
                      {item.updated_by && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            Updated by: {item.updated_by === user?.id ? 'You' : `User ${item.updated_by}`}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Update
                </Typography>
                
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: 2,
                  mt: 2
                }}>
                  <TextField
                    label="New Quantity"
                    type="number"
                    defaultValue={item.quantity}
                    InputProps={{ inputProps: { min: 0 } }}
                    sx={{ width: { xs: '100%', sm: '200px' } }}
                  />
                  
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      // Handle quick update
                      const newQuantity = document.querySelector('input[type="number"]').value;
                      updateItem(item.id, { quantity: parseFloat(newQuantity) });
                    }}
                  >
                    Update Quantity
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
          
          {/* History Tab */}
          {tabValue === 1 && (
            <Box>
              {historyLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : history.length > 0 ? (
                <List>
                  {history.map((change, index) => (
                    <React.Fragment key={change.id}>
                      {index > 0 && <Divider component="li" />}
                      <ListItem>
                        <ListItemText
                          primary={getChangeDescription(change)}
                          secondary={formatDate(change.timestamp)}
                        />
                        <ListItemSecondaryAction>
                          <Chip 
                            label={change.change_type} 
                            color={
                              change.change_type === 'add' ? 'success' : 
                              change.change_type === 'update' ? 'primary' : 
                              'error'
                            }
                            size="small"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No history available for this item.
                </Typography>
              )}
            </Box>
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

export default ItemDetails;

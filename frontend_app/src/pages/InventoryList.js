import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Fab, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
  Tooltip,
  SwipeableDrawer,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as PlusIcon,
  Remove as MinusIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useInventoryUpdates } from '../hooks/useInventoryUpdates';
import { useSocket } from '../contexts/SocketContext';

const InventoryList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'pcs' });
  const [editItem, setEditItem] = useState({ name: '', quantity: 0, unit: 'pcs' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({ unit: 'all', minQuantity: '', maxQuantity: '' });
  
  const navigate = useNavigate();
  const { connected } = useSocket();
  const { 
    items, 
    loading, 
    error, 
    addItem, 
    updateItem, 
    deleteItem 
  } = useInventoryUpdates();

  // Handle quick quantity update
  const handleQuantityUpdate = async (id, newQuantity) => {
    if (newQuantity < 0) return;
    
    const result = await updateItem(id, { quantity: newQuantity });
    
    if (result.success) {
      setSnackbar({
        open: true,
        message: 'Quantity updated successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  // Handle add item
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.unit) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    const result = await addItem(newItem);
    
    if (result.success) {
      setOpenAddDialog(false);
      setNewItem({ name: '', quantity: 0, unit: 'pcs' });
      setSnackbar({
        open: true,
        message: 'Item added successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  // Handle edit item
  const handleEditItem = async () => {
    if (!editItem.name || !editItem.unit) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    const result = await updateItem(selectedItem.id, editItem);
    
    if (result.success) {
      setOpenEditDialog(false);
      setSelectedItem(null);
      setEditItem({ name: '', quantity: 0, unit: 'pcs' });
      setSnackbar({
        open: true,
        message: 'Item updated successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  // Handle delete item
  const handleDeleteItem = async () => {
    const result = await deleteItem(selectedItem.id);
    
    if (result.success) {
      setOpenDeleteDialog(false);
      setSelectedItem(null);
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  // Filter and search items
  const filteredItems = useCallback(() => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Unit filter
      const matchesUnit = filters.unit === 'all' || item.unit === filters.unit;
      
      // Quantity filters
      const minQuantity = filters.minQuantity === '' ? 0 : parseFloat(filters.minQuantity);
      const maxQuantity = filters.maxQuantity === '' ? Infinity : parseFloat(filters.maxQuantity);
      const matchesQuantity = item.quantity >= minQuantity && item.quantity <= maxQuantity;
      
      return matchesSearch && matchesUnit && matchesQuantity;
    });
  }, [items, searchTerm, filters]);

  // Get unique units for filter
  const uniqueUnits = [...new Set(items.map(item => item.unit))];

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Inventory
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2
        }}>
          {/* Search bar */}
          <TextField
            placeholder="Search inventory..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: '50%' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Filter">
              <IconButton onClick={() => setFilterDrawerOpen(true)}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh">
              <IconButton>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Connection status indicator */}
        {!connected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are currently offline. Changes will be synchronized when you reconnect.
          </Alert>
        )}
        
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Loading indicator */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Inventory list */}
            {filteredItems().length > 0 ? (
              <Paper elevation={2}>
                <List sx={{ width: '100%' }}>
                  {filteredItems().map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index > 0 && <Divider component="li" />}
                      <ListItem 
                        button
                        onClick={() => navigate(`/inventory/${item.id}`)}
                      >
                        <ListItemText
                          primary={item.name}
                          secondary={`${item.quantity} ${item.unit}`}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton 
                              edge="end" 
                              aria-label="decrease"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityUpdate(item.id, Math.max(0, item.quantity - 1));
                              }}
                            >
                              <MinusIcon />
                            </IconButton>
                            
                            <Typography sx={{ mx: 1, minWidth: '40px', textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            
                            <IconButton 
                              edge="end" 
                              aria-label="increase"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityUpdate(item.id, item.quantity + 1);
                              }}
                            >
                              <PlusIcon />
                            </IconButton>
                            
                            <IconButton 
                              edge="end" 
                              aria-label="edit"
                              sx={{ ml: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setEditItem({
                                  name: item.name,
                                  quantity: item.quantity,
                                  unit: item.unit
                                });
                                setOpenEditDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ) : (
              <Card sx={{ mt: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No items found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || filters.unit !== 'all' || filters.minQuantity || filters.maxQuantity
                      ? 'Try adjusting your search or filters'
                      : 'Add your first inventory item by clicking the + button'}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Box>
      
      {/* Floating action button for adding new item */}
      <Fab 
        color="primary" 
        aria-label="add"
        onClick={() => setOpenAddDialog(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 72, md: 32 }, // Higher on mobile to account for bottom nav
          right: 32,
        }}
      >
        <AddIcon />
      </Fab>
      
      {/* Add Item Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              margin="dense"
              label="Quantity"
              type="number"
              variant="outlined"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
              sx={{ flex: 1 }}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              margin="dense"
              label="Unit"
              select
              variant="outlined"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="pcs">Pieces</MenuItem>
              <MenuItem value="kg">Kilograms</MenuItem>
              <MenuItem value="g">Grams</MenuItem>
              <MenuItem value="l">Liters</MenuItem>
              <MenuItem value="ml">Milliliters</MenuItem>
              <MenuItem value="box">Boxes</MenuItem>
              <MenuItem value="bottle">Bottles</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained" color="primary">Add</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editItem.name}
            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              margin="dense"
              label="Quantity"
              type="number"
              variant="outlined"
              value={editItem.quantity}
              onChange={(e) => setEditItem({ ...editItem, quantity: parseFloat(e.target.value) || 0 })}
              sx={{ flex: 1 }}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              margin="dense"
              label="Unit"
              select
              variant="outlined"
              value={editItem.unit}
              onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="pcs">Pieces</MenuItem>
              <MenuItem value="kg">Kilograms</MenuItem>
              <MenuItem value="g">Grams</MenuItem>
              <MenuItem value="l">Liters</MenuItem>
              <MenuItem value="ml">Milliliters</MenuItem>
              <MenuItem value="box">Boxes</MenuItem>
              <MenuItem value="bottle">Bottles</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditItem} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteItem} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
      {/* Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onOpen={() => setFilterDrawerOpen(true)}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter Inventory
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Unit"
                select
                fullWidth
                value={filters.unit}
                onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
              >
                <MenuItem value="all">All Units</MenuItem>
                {uniqueUnits.map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={6} sm={4}>
              <TextField
                label="Min Quantity"
                type="number"
                fullWidth
                value={filters.minQuantity}
                onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            
            <Grid item xs={6} sm={4}>
              <TextField
                label="Max Quantity"
                type="number"
                fullWidth
                value={filters.maxQuantity}
                onChange={(e) => setFilters({ ...filters, maxQuantity: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button 
              onClick={() => setFilters({ unit: 'all', minQuantity: '', maxQuantity: '' })}
            >
              Clear Filters
            </Button>
            <Button 
              variant="contained" 
              onClick={() => setFilterDrawerOpen(false)}
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      </SwipeableDrawer>
      
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

export default InventoryList;

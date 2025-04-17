import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [editUser, setEditUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const { user } = useAuth();
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users');
        setUsers(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Handle add user
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    try {
      const response = await axios.post('/api/auth/register', newUser);
      
      setOpenAddDialog(false);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      
      // Add the new user to the list
      setUsers([...users, response.data]);
      
      setSnackbar({
        open: true,
        message: 'User added successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error adding user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to add user',
        severity: 'error'
      });
    }
  };
  
  // Handle edit user
  const handleEditUser = async () => {
    if (!editUser.username || !editUser.email) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    try {
      const userData = { ...editUser };
      
      // Only include password if it was changed
      if (!userData.password) {
        delete userData.password;
      }
      
      const response = await axios.put(`/api/users/${selectedUser.id}`, userData);
      
      setOpenEditDialog(false);
      setSelectedUser(null);
      setEditUser({ username: '', email: '', password: '', role: 'user' });
      
      // Update the user in the list
      setUsers(users.map(u => u.id === selectedUser.id ? response.data : u));
      
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update user',
        severity: 'error'
      });
    }
  };
  
  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      
      setOpenDeleteDialog(false);
      setSelectedUser(null);
      
      // Remove the user from the list
      setUsers(users.filter(u => u.id !== selectedUser.id));
      
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to delete user',
        severity: 'error'
      });
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Management
        </Typography>
        
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
            {/* User list */}
            <Paper elevation={2}>
              <List sx={{ width: '100%' }}>
                {users.map((u, index) => (
                  <React.Fragment key={u.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem>
                      <ListItemText
                        primary={u.username}
                        secondary={
                          <>
                            {u.email} • Created: {formatDate(u.created_at)}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={u.role} 
                          color={u.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        
                        <IconButton 
                          edge="end" 
                          aria-label="edit"
                          onClick={() => {
                            setSelectedUser(u);
                            setEditUser({
                              username: u.username,
                              email: u.email,
                              password: '',
                              role: u.role
                            });
                            setOpenEditDialog(true);
                          }}
                          disabled={u.id === user?.id} // Can't edit yourself
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => {
                            setSelectedUser(u);
                            setOpenDeleteDialog(true);
                          }}
                          disabled={u.id === user?.id} // Can't delete yourself
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
            
            {/* Add user button */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenAddDialog(true)}
              sx={{ mt: 3 }}
            >
              Add New User
            </Button>
          </>
        )}
      </Box>
      
      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          
          <TextField
            margin="dense"
            label="Role"
            select
            fullWidth
            variant="outlined"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" color="primary">Add</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={editUser.username}
            onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
            disabled // Username cannot be changed
          />
          
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={editUser.email}
            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
          />
          
          <TextField
            margin="dense"
            label="New Password (leave blank to keep current)"
            type="password"
            fullWidth
            variant="outlined"
            value={editUser.password}
            onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
          />
          
          <TextField
            margin="dense"
            label="Role"
            select
            fullWidth
            variant="outlined"
            value={editUser.role}
            onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
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

export default UserManagement;

import React, { useState } from 'react';
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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Grid
} from '@mui/material';
import { 
  Save as SaveIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Settings = () => {
  const { user, logout } = useAuth();
  
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    activitySummary: false
  });
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid email address',
        severity: 'error'
      });
      return;
    }
    
    // If changing password, validate
    if (profileData.newPassword) {
      if (!profileData.currentPassword) {
        setSnackbar({
          open: true,
          message: 'Current password is required to set a new password',
          severity: 'error'
        });
        return;
      }
      
      if (profileData.newPassword !== profileData.confirmPassword) {
        setSnackbar({
          open: true,
          message: 'New passwords do not match',
          severity: 'error'
        });
        return;
      }
      
      if (profileData.newPassword.length < 8) {
        setSnackbar({
          open: true,
          message: 'New password must be at least 8 characters long',
          severity: 'error'
        });
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Prepare update data
      const updateData = {
        email: profileData.email
      };
      
      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }
      
      // Send update request
      await axios.put(`/api/users/${user.id}/profile`, updateData);
      
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
      
      // Clear password fields
      setProfileData({
        ...profileData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle notification settings update
  const handleNotificationUpdate = async () => {
    setLoading(true);
    
    try {
      // Send update request
      await axios.put(`/api/users/${user.id}/notifications`, notificationSettings);
      
      setSnackbar({
        open: true,
        message: 'Notification settings updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update notification settings',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        
        <Grid container spacing={3}>
          {/* Profile Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Profile Settings
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <form onSubmit={handleProfileUpdate}>
                <TextField
                  label="Username"
                  fullWidth
                  margin="normal"
                  value={user?.username || ''}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
                
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  required
                />
                
                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Change Password
                </Typography>
                
                <TextField
                  label="Current Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                />
                
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                  helperText="Leave blank to keep current password"
                />
                
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={profileData.confirmPassword}
                  onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </form>
            </Paper>
          </Grid>
          
          {/* Notification Settings */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Notification Settings
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Email Notifications" 
                    secondary="Receive notifications via email"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          emailNotifications: e.target.checked
                        })}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </ListItem>
                
                <Divider component="li" />
                
                <ListItem>
                  <ListItemText 
                    primary="Low Stock Alerts" 
                    secondary="Get notified when items are running low"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.lowStockAlerts}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          lowStockAlerts: e.target.checked
                        })}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </ListItem>
                
                <Divider component="li" />
                
                <ListItem>
                  <ListItemText 
                    primary="Activity Summary" 
                    secondary="Receive weekly summary of inventory changes"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.activitySummary}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          activitySummary: e.target.checked
                        })}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </ListItem>
              </List>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                sx={{ mt: 3 }}
                onClick={handleNotificationUpdate}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Notification Settings'}
              </Button>
            </Paper>
            
            {/* Account Actions */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LockIcon sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Account Actions
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={logout}
              >
                Log Out
              </Button>
            </Paper>
          </Grid>
        </Grid>
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

export default Settings;

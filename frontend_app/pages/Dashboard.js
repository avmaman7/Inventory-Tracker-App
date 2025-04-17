import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  CameraAlt as CameraIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useInventoryUpdates } from '../hooks/useInventoryUpdates';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    recentActivity: 0,
    totalValue: 0
  });
  const [recentChanges, setRecentChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { items } = useInventoryUpdates();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dashboard');
        
        setStats({
          totalItems: response.data.total_items,
          lowStockItems: response.data.low_stock_items,
          recentActivity: response.data.recent_activity,
          totalValue: response.data.total_value
        });
        
        setRecentChanges(response.data.recent_changes || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        
        // Use items from context as fallback
        setStats({
          totalItems: items.length,
          lowStockItems: items.filter(item => item.quantity < 5).length,
          recentActivity: 0,
          totalValue: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [items]);
  
  // Format date
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get change description
  const getChangeDescription = (change) => {
    switch (change.change_type) {
      case 'add':
        return `Added ${change.item_name} with quantity ${change.new_quantity}`;
      case 'update':
        const diff = change.new_quantity - change.previous_quantity;
        const sign = diff > 0 ? '+' : '';
        return `Updated ${change.item_name} from ${change.previous_quantity} to ${change.new_quantity} (${sign}${diff})`;
      case 'delete':
        return `Deleted ${change.item_name} (was ${change.previous_quantity})`;
      default:
        return `Changed ${change.item_name} to ${change.new_quantity}`;
    }
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        
        <Typography variant="h6" sx={{ mb: 2 }}>
          Welcome back, {user?.username || 'User'}!
        </Typography>
        
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
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <InventoryIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Items
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      {stats.totalItems}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <HistoryIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Low Stock
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      {stats.lowStockItems}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Recent Activity
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      {stats.recentActivity}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Value
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      ${stats.totalValue.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Quick Actions */}
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={4} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%'
                  }}
                  onClick={() => navigate('/inventory')}
                >
                  <InventoryIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>View Inventory</Typography>
                </Button>
              </Grid>
              
              <Grid item xs={6} sm={4} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%'
                  }}
                  onClick={() => navigate('/ocr')}
                >
                  <CameraIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Scan Invoice</Typography>
                </Button>
              </Grid>
            </Grid>
            
            {/* Recent Activity */}
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            <Paper sx={{ p: 2 }}>
              {recentChanges.length > 0 ? (
                <Box>
                  {recentChanges.map((change, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        py: 1.5, 
                        borderBottom: index < recentChanges.length - 1 ? '1px solid #eee' : 'none'
                      }}
                    >
                      <Typography variant="body2">
                        {getChangeDescription(change)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(change.timestamp)} • {change.username || 'System'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No recent activity
                </Typography>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  );
};

export default Dashboard;

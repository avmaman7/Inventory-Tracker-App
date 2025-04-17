import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Box, 
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '100vh',
      py: 2
    }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Inventory Tracker
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to your account
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
            
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: 1
            }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign up
              </Link>
              
              <Link component={RouterLink} to="#" variant="body2">
                Forgot password?
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login;

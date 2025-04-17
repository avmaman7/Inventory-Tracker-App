import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    axios.defaults.baseURL = apiUrl;
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/auth/user');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await axios.post('/auth/login', { username, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      await axios.post('/auth/register', { username, email, password });
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Registration failed. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      login, 
      register, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

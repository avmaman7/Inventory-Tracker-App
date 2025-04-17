import React, { createContext, useState, useEffect, useContext, useRef, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token')); // Initialize from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token')); // Initialize based on token presence
  const [loading, setLoading] = useState(true);

  const axiosInterceptor = useMemo(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token'); 
        if (currentToken) {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
        config.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        return config;
      },
      (error) => Promise.reject(error)
    );
    return interceptor; 
  }, []);

  useEffect(() => {
    return () => {
      axios.interceptors.request.eject(axiosInterceptor);
    };
  }, [axiosInterceptor]);

  useEffect(() => {
    const verifyToken = async () => {
      if (isAuthenticated) { 
        setLoading(false);
        return;
      }
      
      const initialToken = localStorage.getItem('token'); 
      if (!initialToken) {
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      try {
        const response = await axios.get('/api/auth/user');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication error during verifyToken:', error);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [isAuthenticated]); 

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token); 
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      return { 
        success: false, 
        message: error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post('/api/auth/register', { username, email, password });
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
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

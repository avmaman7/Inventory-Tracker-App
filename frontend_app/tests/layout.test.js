import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../contexts/AuthContext';
import { SocketContext } from '../contexts/SocketContext';
import Layout from '../components/Layout/Layout';

// Mock useNavigate and useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock theme and media query
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: () => false, // Desktop view by default
  useTheme: () => ({ breakpoints: { down: () => false } }),
}));

describe('Layout Component', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  };
  
  const mockAdminUser = {
    id: 2,
    username: 'adminuser',
    email: 'admin@example.com',
    role: 'admin'
  };
  
  const mockLogout = jest.fn();
  
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };
  
  test('Layout renders correctly for regular user', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser, logout: mockLogout, isAuthenticated: true }}>
        <SocketContext.Provider value={{ socket: mockSocket, connected: true }}>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </SocketContext.Provider>
      </AuthContext.Provider>
    );
    
    // Check if the app bar is rendered
    expect(screen.getByText('Inventory Tracker')).toBeInTheDocument();
    
    // Check if the drawer content is rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('OCR Scan')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    
    // Check if the content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    
    // Admin-only menu items should not be visible
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });
  
  test('Layout renders correctly for admin user', () => {
    render(
      <AuthContext.Provider value={{ user: mockAdminUser, logout: mockLogout, isAuthenticated: true }}>
        <SocketContext.Provider value={{ socket: mockSocket, connected: true }}>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </SocketContext.Provider>
      </AuthContext.Provider>
    );
    
    // Admin-only menu items should be visible
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
  
  test('Logout button calls logout function', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser, logout: mockLogout, isAuthenticated: true }}>
        <SocketContext.Provider value={{ socket: mockSocket, connected: true }}>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </SocketContext.Provider>
      </AuthContext.Provider>
    );
    
    // Find and click the logout button
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    // Check if logout function was called
    expect(mockLogout).toHaveBeenCalled();
  });
});

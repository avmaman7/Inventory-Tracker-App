import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  BottomNavigation,
  BottomNavigationAction,
  Badge
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  CameraAlt as CameraIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileNavValue, setMobileNavValue] = useState(0);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Set mobile navigation value based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setMobileNavValue(0);
    else if (path.startsWith('/inventory')) setMobileNavValue(1);
    else if (path.startsWith('/ocr')) setMobileNavValue(2);
    else if (path.startsWith('/users')) setMobileNavValue(3);
    else if (path.startsWith('/settings')) setMobileNavValue(4);
  }, [location.pathname]);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };
  
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };
  
  const drawerContent = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div">
          Inventory Tracker
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem 
          button 
          onClick={() => handleNavigation('/')}
          selected={location.pathname === '/'}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/inventory')}
          selected={location.pathname.startsWith('/inventory')}
        >
          <ListItemIcon>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
        </ListItem>
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/ocr')}
          selected={location.pathname.startsWith('/ocr')}
        >
          <ListItemIcon>
            <CameraIcon />
          </ListItemIcon>
          <ListItemText primary="OCR Scan" />
        </ListItem>
        
        {user?.role === 'admin' && (
          <ListItem 
            button 
            onClick={() => handleNavigation('/users')}
            selected={location.pathname.startsWith('/users')}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Users" />
          </ListItem>
        )}
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/settings')}
          selected={location.pathname.startsWith('/settings')}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {isMobile ? 'Inventory' : 'Inventory Tracker'}
          </Typography>
          
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/settings');
            }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/settings');
            }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Drawer - different for mobile and desktop */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: 250,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: 250, boxSizing: 'border-box' },
          }}
        >
          <Toolbar /> {/* This creates space for the AppBar */}
          {drawerContent}
        </Drawer>
      )}
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 250px)` },
          ml: { md: '250px' },
          mt: '64px', // AppBar height
          mb: { xs: '56px', md: 0 }, // Bottom navigation height on mobile
        }}
      >
        {children}
      </Box>
      
      {/* Bottom Navigation for Mobile */}
      {isMobile && (
        <Paper 
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} 
          elevation={3}
        >
          <BottomNavigation
            value={mobileNavValue}
            onChange={(event, newValue) => {
              setMobileNavValue(newValue);
              switch(newValue) {
                case 0: navigate('/'); break;
                case 1: navigate('/inventory'); break;
                case 2: navigate('/ocr'); break;
                case 3: 
                  if (user?.role === 'admin') {
                    navigate('/users');
                  } else {
                    navigate('/settings');
                  }
                  break;
                case 4: navigate('/settings'); break;
                default: break;
              }
            }}
            showLabels
          >
            <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Inventory" icon={<InventoryIcon />} />
            <BottomNavigationAction label="OCR" icon={<CameraIcon />} />
            {user?.role === 'admin' ? (
              <BottomNavigationAction label="Users" icon={<PeopleIcon />} />
            ) : (
              <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
            )}
            {user?.role === 'admin' && (
              <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
            )}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout;

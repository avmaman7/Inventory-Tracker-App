import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Show a snackbar notification
  const notify = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Dismiss snackbar
  const dismiss = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, dismiss, snackbar }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={dismiss}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={dismiss}
          severity={snackbar.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

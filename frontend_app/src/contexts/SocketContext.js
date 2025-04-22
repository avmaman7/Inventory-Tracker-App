import React, { createContext, useState, useContext, useEffect } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5002';
    const socketInstance = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Save socket instance to state
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

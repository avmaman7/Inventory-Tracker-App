import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

// Custom hook for real-time inventory updates
export const useInventoryUpdates = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();

  // Fetch initial inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/items');
        setItems(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Failed to load inventory items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Set up real-time update listeners
  useEffect(() => {
    if (!socket || !connected) return;

    // Handle item added event
    const handleItemAdded = (newItem) => {
      setItems(prevItems => [...prevItems, newItem]);
    };

    // Handle item updated event
    const handleItemUpdated = (updatedItem) => {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    };

    // Handle item deleted event
    const handleItemDeleted = (data) => {
      setItems(prevItems => 
        prevItems.filter(item => item.id !== data.id)
      );
    };

    // Subscribe to events
    socket.on('item_added', handleItemAdded);
    socket.on('item_updated', handleItemUpdated);
    socket.on('item_deleted', handleItemDeleted);

    // Cleanup function
    return () => {
      socket.off('item_added', handleItemAdded);
      socket.off('item_updated', handleItemUpdated);
      socket.off('item_deleted', handleItemDeleted);
    };
  }, [socket, connected]);

  // Function to add a new item
  const addItem = async (itemData) => {
    try {
      const response = await axios.post('/api/items', itemData);
      // The socket will handle adding the item to the state
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error adding item:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to add item' 
      };
    }
  };

  // Function to update an item
  const updateItem = async (id, itemData) => {
    try {
      const response = await axios.put(`/api/items/${id}`, itemData);
      // The socket will handle updating the item in the state
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error updating item:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to update item' 
      };
    }
  };

  // Function to delete an item
  const deleteItem = async (id) => {
    try {
      await axios.delete(`/api/items/${id}`);
      // The socket will handle removing the item from the state
      return { success: true };
    } catch (err) {
      console.error('Error deleting item:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to delete item' 
      };
    }
  };

  // Function to get item history
  const getItemHistory = async (id) => {
    try {
      const response = await axios.get(`/api/items/${id}/history`);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error fetching item history:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to fetch item history' 
      };
    }
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    getItemHistory
  };
};

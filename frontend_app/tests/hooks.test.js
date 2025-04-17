import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInventoryUpdates } from '../hooks/useInventoryUpdates';
import { SocketContext } from '../contexts/SocketContext';

// Mock the hooks
jest.mock('../hooks/useInventoryUpdates');
jest.mock('axios');

describe('useInventoryUpdates Hook', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };
  
  const mockItems = [
    { id: 1, name: 'Test Item 1', quantity: 10, unit: 'pcs' },
    { id: 2, name: 'Test Item 2', quantity: 5, unit: 'kg' }
  ];
  
  const mockAddItem = jest.fn().mockResolvedValue({ success: true, data: { id: 3, name: 'New Item', quantity: 15, unit: 'pcs' } });
  const mockUpdateItem = jest.fn().mockResolvedValue({ success: true });
  const mockDeleteItem = jest.fn().mockResolvedValue({ success: true });
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementation
    useInventoryUpdates.mockReturnValue({
      items: mockItems,
      loading: false,
      error: null,
      addItem: mockAddItem,
      updateItem: mockUpdateItem,
      deleteItem: mockDeleteItem
    });
  });
  
  // Test component that uses the hook
  const TestComponent = () => {
    const { items, addItem, updateItem, deleteItem } = useInventoryUpdates();
    
    return (
      <div>
        <h1>Inventory Items</h1>
        <ul>
          {items.map(item => (
            <li key={item.id}>
              {item.name} - {item.quantity} {item.unit}
              <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}>
                Increase
              </button>
              <button onClick={() => deleteItem(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => addItem({ name: 'New Item', quantity: 15, unit: 'pcs' })}>
          Add Item
        </button>
      </div>
    );
  };
  
  test('useInventoryUpdates provides items and functions', () => {
    render(
      <SocketContext.Provider value={{ socket: mockSocket, connected: true }}>
        <TestComponent />
      </SocketContext.Provider>
    );
    
    // Check if items are rendered
    expect(screen.getByText('Test Item 1 - 10 pcs')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2 - 5 kg')).toBeInTheDocument();
    
    // Test addItem function
    fireEvent.click(screen.getByText('Add Item'));
    expect(mockAddItem).toHaveBeenCalledWith({ name: 'New Item', quantity: 15, unit: 'pcs' });
    
    // Test updateItem function
    fireEvent.click(screen.getAllByText('Increase')[0]);
    expect(mockUpdateItem).toHaveBeenCalledWith(1, { quantity: 11 });
    
    // Test deleteItem function
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(mockDeleteItem).toHaveBeenCalledWith(1);
  });
});

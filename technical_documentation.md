# Inventory Tracker Mobile Application
## Technical Documentation

This technical documentation provides an overview of the architecture, components, and implementation details of the Inventory Tracker mobile application.

## Architecture Overview

The Inventory Tracker mobile application follows a modern web architecture:

- **Frontend**: React-based Progressive Web App (PWA)
- **Backend**: Node.js with Express API
- **Database**: PostgreSQL for data persistence
- **Real-time Updates**: WebSockets via Socket.IO
- **OCR Processing**: Google Cloud Vision API
- **Authentication**: JWT-based authentication system

### System Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Mobile Devices │◄────┤  Web Frontend   │◄────┤  Desktop Browsers│
│  (PWA)          │     │  (React)        │     │                 │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │                       │
         │                       │
┌────────▼────────┐     ┌────────▼────────┐
│                 │     │                 │
│  WebSocket      │     │  REST API       │
│  Server         │     │  (Express)      │
│                 │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         │                       │
┌────────▼────────────────────────▼────────┐
│                                          │
│              Database                    │
│              (PostgreSQL)                │
│                                          │
└───────────────────┬──────────────────────┘
                    │
                    │
                    │
         ┌──────────▼──────────┐
         │                     │
         │  Google Cloud       │
         │  Vision API         │
         │                     │
         └─────────────────────┘
```

## Frontend Components

### Core Components

- **App.js**: Main application component with routing and theme configuration
- **Layout.js**: Responsive layout component that adapts to both mobile and desktop views
- **AuthContext.js**: Context provider for user authentication
- **SocketContext.js**: Context provider for WebSocket connections

### Pages

- **Login.js**: User authentication page
- **Register.js**: New user registration page
- **Dashboard.js**: Overview of inventory status and recent activity
- **InventoryList.js**: List of inventory items with CRUD operations
- **ItemDetails.js**: Detailed view of a specific inventory item
- **OCRCapture.js**: OCR invoice processing workflow
- **UserManagement.js**: User administration for admins
- **Settings.js**: User profile and application settings

### Custom Hooks

- **useInventoryUpdates.js**: Custom hook for real-time inventory data management

## Backend API

### API Endpoints

#### Authentication

- `POST /api/auth/login`: User login
- `POST /api/auth/register`: User registration
- `GET /api/auth/user`: Get current user information
- `POST /api/auth/logout`: User logout

#### Inventory Management

- `GET /api/items`: Get all inventory items
- `GET /api/items/:id`: Get a specific item
- `POST /api/items`: Add a new item
- `PUT /api/items/:id`: Update an existing item
- `DELETE /api/items/:id`: Delete an item
- `GET /api/items/:id/history`: Get item history

#### OCR Processing

- `POST /api/ocr/upload`: Upload and process an invoice image
- `POST /api/ocr/process`: Process detected items from OCR

#### User Management

- `GET /api/users`: Get all users (admin only)
- `GET /api/users/:id`: Get a specific user
- `PUT /api/users/:id`: Update a user
- `DELETE /api/users/:id`: Delete a user
- `PUT /api/users/:id/profile`: Update user profile
- `PUT /api/users/:id/notifications`: Update notification settings

#### Dashboard

- `GET /api/dashboard`: Get dashboard statistics and recent activity

### WebSocket Events

- `item_added`: Emitted when a new item is added
- `item_updated`: Emitted when an item is updated
- `item_deleted`: Emitted when an item is deleted
- `user_activity`: Emitted when a user performs an action

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

#### items
```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);
```

#### item_history
```sql
CREATE TABLE item_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  change_type VARCHAR(20) NOT NULL,
  previous_quantity DECIMAL(10, 2),
  new_quantity DECIMAL(10, 2),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);
```

#### notification_settings
```sql
CREATE TABLE notification_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  activity_summary BOOLEAN NOT NULL DEFAULT FALSE
);
```

## Google Cloud Vision Integration

The application uses Google Cloud Vision API for OCR processing of invoices. The integration is implemented in the `ocr_module.py` file.

### OCR Processing Flow

1. User uploads an invoice image
2. Image is sent to Google Cloud Vision API
3. API returns extracted text
4. Application parses the text to identify potential inventory items
5. Items are matched against existing inventory
6. User reviews and confirms the changes
7. Inventory is updated based on user confirmation

### OCR Configuration

The Google Cloud Vision API requires authentication credentials:

```javascript
// Example configuration
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
```

## Authentication System

The application uses JWT (JSON Web Tokens) for authentication:

1. User logs in with username and password
2. Server validates credentials and issues a JWT
3. Client stores the JWT in localStorage
4. JWT is included in the Authorization header for API requests
5. Server validates the JWT for protected routes

## Real-time Updates

Real-time updates are implemented using Socket.IO:

1. Client establishes a WebSocket connection on login
2. Server emits events when inventory changes occur
3. Client listens for events and updates the UI accordingly
4. Connection status is monitored and displayed to the user

## Responsive Design

The application uses a responsive design approach:

- Mobile-first design principles
- Adaptive layout based on screen size
- Bottom navigation on mobile devices
- Sidebar navigation on desktop devices
- Touch-optimized UI elements for mobile users

## Testing

The application includes comprehensive tests:

- Unit tests for components and hooks
- Integration tests for API endpoints
- End-to-end tests for critical workflows

## Deployment

The application can be deployed using various methods:

- Progressive Web App (PWA) deployment
- Native mobile app conversion using React Native
- Docker containerization for self-hosting

See the deployment guide for detailed instructions.

## Security Considerations

- Passwords are hashed using bcrypt
- JWT tokens expire after a configurable time
- API endpoints are protected with appropriate authorization
- Input validation is performed on all user inputs
- HTTPS is required for production deployment

## Performance Optimization

- React component memoization for efficient rendering
- Lazy loading of components for faster initial load
- Image optimization for OCR processing
- Database indexing for faster queries
- Caching strategies for frequently accessed data

## Future Enhancements

- Barcode scanning for faster inventory updates
- Advanced analytics and reporting
- Inventory forecasting using AI
- Integration with point-of-sale systems
- Multi-location inventory management

# Complete Deployment Guide for Inventory Tracker App

This guide provides detailed instructions for setting up your environment variables and deploying your application to Vercel (frontend) and Render (backend).

## Environment Variables Setup

### Local Development

#### Backend (.env file)
Create a file named `.env` in the project root with these variables:
```
# Database connection
DATABASE_URL=postgresql://localhost/inventory_app_db

# JWT Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here

# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS=path/to/your-google-credentials.json

# Server configuration
PORT=5001
HOST=0.0.0.0
DEBUG=False

# Set to 'production' for production environments
FLASK_ENV=development
```

#### Frontend (.env.local file)
Create a file named `.env.local` in the `frontend_app` directory with these variables:
```
# Backend API URL (used for API requests)
REACT_APP_API_URL=http://localhost:5001

# WebSocket URL (used for real-time updates)
REACT_APP_WEBSOCKET_URL=http://localhost:5001

# Set to 'production' in production environments
REACT_APP_ENV=development
```

### Production Deployment

#### Render (Backend) Setup

1. **Create a new Web Service**
   - Connect your GitHub repository
   - Select the branch you want to deploy
   - Use these settings:
     - **Name**: inventory-tracker-backend
     - **Runtime**: Python
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn --worker-class eventlet -w 1 backend_api:app`

2. **Set Environment Variables**
   In the Render dashboard, add these environment variables:
   - `DATABASE_URL`: Your Render PostgreSQL connection string
   - `JWT_SECRET_KEY`: A secure random string
   - `FLASK_ENV`: production
   - `PORT`: Leave empty (Render sets this automatically)
   - `HOST`: 0.0.0.0

3. **Google Cloud Vision API Credentials**
   - In the Render dashboard, go to "Environment" > "Secret Files"
   - Add a new secret file with your Google Cloud credentials JSON
   - Set the mount path to `/etc/secrets/google-credentials.json`
   - Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-credentials.json`

4. **Database Setup**
   - Create a PostgreSQL database in Render
   - Connect it to your web service
   - The `DATABASE_URL` will be automatically set

#### Vercel (Frontend) Setup

1. **Create a new Project**
   - Connect your GitHub repository
   - Select the `frontend_app` directory as the root directory
   - Use these settings:
     - **Framework Preset**: Create React App
     - **Build Command**: `npm run build`
     - **Output Directory**: `build`

2. **Set Environment Variables**
   In the Vercel dashboard, add these environment variables:
   - `REACT_APP_API_URL`: Your Render backend URL (e.g., https://inventory-tracker-backend.onrender.com)
   - `REACT_APP_WEBSOCKET_URL`: Same as your API URL
   - `REACT_APP_ENV`: production

## Deployment Verification

After deploying both services, verify that:

1. **Backend API**
   - Test the API endpoints using Postman or curl
   - Verify that the database connection is working
   - Check that the Google Cloud Vision API is properly configured

2. **Frontend**
   - Verify that the frontend can connect to the backend
   - Test user authentication
   - Test WebSocket connections for real-time updates
   - Test OCR functionality

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your backend allows requests from your Vercel domain:
```python
# In backend_api.py
CORS(app, origins=["https://your-frontend-app.vercel.app", "http://localhost:3000"])
```

### WebSocket Connection Issues
If WebSocket connections fail:
- Check that your `REACT_APP_WEBSOCKET_URL` is correct
- Ensure your backend is properly configured to accept WebSocket connections
- Verify that your Render service is on a plan that supports WebSockets

### Database Connection Issues
If database operations fail:
- Check your `DATABASE_URL` in the Render dashboard
- Verify that your database is properly provisioned
- Check for any firewall or network restrictions

### Google Cloud Vision API Issues
If OCR functionality fails:
- Verify that your Google Cloud credentials are properly mounted
- Check that the service account has the necessary permissions
- Ensure the API is enabled in your Google Cloud project

## Environment Variable Reference

| Variable | Environment | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Backend | Secret key for JWT token generation |
| `GOOGLE_APPLICATION_CREDENTIALS` | Backend | Path to Google Cloud Vision API credentials |
| `PORT` | Backend | Port to run the server on |
| `FLASK_ENV` | Backend | Environment (development/production) |
| `REACT_APP_API_URL` | Frontend | URL to the backend API |
| `REACT_APP_WEBSOCKET_URL` | Frontend | URL for WebSocket connections |
| `REACT_APP_ENV` | Frontend | Environment (development/production) |

## Deployment Checklist

Use the `deployment_checklist.md` file to ensure all environment variables are properly set in both Vercel and Render.

## Verification Script

Run the `verify_env.py` script to check your local environment variables:
```bash
python verify_env.py
```

This will help you identify any missing or misconfigured environment variables before deployment.

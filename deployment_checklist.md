# Deployment Environment Variable Checklist

## Critical Environment Variables

### Backend (Flask - Render)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET_KEY` - Secret key for JWT token generation
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google Cloud Vision API credentials
- [ ] `PORT` - Port to run the server on (usually set automatically by Render)

### Frontend (React - Vercel)
- [ ] `REACT_APP_API_URL` - URL to the backend API (e.g., https://your-render-app.onrender.com)
- [ ] `REACT_APP_WEBSOCKET_URL` - URL for WebSocket connections (same as API_URL)

## Steps to Ensure Environment Variable Consistency

### Local Development
1. Copy `.env.example` to `.env` in the project root directory
2. Copy `frontend_app/.env.example` to `frontend_app/.env.local`
3. Fill in the values for all environment variables

### Render Deployment (Backend)
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add all backend environment variables with the same names used locally
5. For `GOOGLE_APPLICATION_CREDENTIALS`, you may need to:
   - Upload the JSON file to Render
   - Set the path to the uploaded file
   - OR use Render's secret files feature

### Vercel Deployment (Frontend)
1. Go to your Vercel dashboard
2. Select your frontend project
3. Go to "Settings" > "Environment Variables"
4. Add all frontend environment variables with the same names used locally
5. Make sure to set the correct API URL pointing to your Render backend

## Testing Deployment Environment
After deploying, verify that:
1. The frontend can connect to the backend API
2. WebSocket connections are working
3. OCR functionality is processing images correctly
4. Database operations are working

## Troubleshooting
- If you see CORS errors, check that your backend is configured to accept requests from your Vercel domain
- If WebSocket connections fail, ensure the WebSocket URL is correct and accessible
- If OCR fails, verify that Google Cloud Vision API credentials are properly set up

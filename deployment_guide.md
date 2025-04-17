# Mobile Inventory Tracker Deployment Guide

This guide provides instructions for deploying the Inventory Tracker mobile application using different methods.

## Option 1: Progressive Web App (PWA) Deployment

### Prerequisites
- Node.js 14+ and npm
- PostgreSQL database
- Google Cloud account with Vision API enabled
- Domain name (optional but recommended)

### Backend Deployment

1. **Set up PostgreSQL database**
   - Create a new PostgreSQL database
   - Update the database connection string in the configuration

2. **Configure environment variables**
   ```
   # Create a .env file in the backend directory
   DB_CONNECTION_STRING=postgresql://username:password@localhost:5432/inventory
   JWT_SECRET=your_jwt_secret_key
   GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
   PORT=5000
   ```

3. **Deploy the backend API**
   - **Option A: Deploy to Heroku**
     ```bash
     # Install Heroku CLI
     npm install -g heroku
     
     # Login to Heroku
     heroku login
     
     # Create a new Heroku app
     heroku create inventory-tracker-api
     
     # Add PostgreSQL addon
     heroku addons:create heroku-postgresql:hobby-dev
     
     # Set environment variables
     heroku config:set JWT_SECRET=your_jwt_secret_key
     heroku config:set GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
     
     # Deploy the application
     git push heroku main
     ```
   
   - **Option B: Deploy to DigitalOcean App Platform**
     - Create a new app in DigitalOcean App Platform
     - Connect your repository
     - Configure environment variables
     - Deploy the application
   
   - **Option C: Deploy to AWS Elastic Beanstalk**
     - Install the EB CLI
     - Initialize your EB environment
     - Deploy the application

### Frontend Deployment

1. **Build the frontend application**
   ```bash
   # Navigate to the frontend directory
   cd frontend_app
   
   # Install dependencies
   npm install
   
   # Build the application
   npm run build
   ```

2. **Deploy the frontend**
   - **Option A: Deploy to Netlify**
     ```bash
     # Install Netlify CLI
     npm install -g netlify-cli
     
     # Login to Netlify
     netlify login
     
     # Initialize a new Netlify site
     netlify init
     
     # Deploy the application
     netlify deploy --prod
     ```
   
   - **Option B: Deploy to Vercel**
     ```bash
     # Install Vercel CLI
     npm install -g vercel
     
     # Login to Vercel
     vercel login
     
     # Deploy the application
     vercel --prod
     ```
   
   - **Option C: Deploy to GitHub Pages**
     ```bash
     # Install gh-pages
     npm install --save-dev gh-pages
     
     # Add deploy script to package.json
     # "deploy": "gh-pages -d build"
     
     # Deploy the application
     npm run deploy
     ```

3. **Configure the frontend to use the deployed backend API**
   - Update the API URL in the frontend configuration
   - Update the WebSocket URL in the frontend configuration

## Option 2: Native Mobile App Deployment

### Prerequisites
- React Native development environment
- Expo CLI
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

### Steps to Convert to React Native

1. **Create a new React Native project**
   ```bash
   # Install Expo CLI
   npm install -g expo-cli
   
   # Create a new project
   expo init InventoryTrackerMobile
   
   # Navigate to the project directory
   cd InventoryTrackerMobile
   ```

2. **Install required dependencies**
   ```bash
   npm install @react-navigation/native @react-navigation/stack
   npm install react-native-gesture-handler react-native-reanimated
   npm install axios socket.io-client
   npm install @react-native-async-storage/async-storage
   npm install react-native-camera
   ```

3. **Port the React components to React Native**
   - Convert HTML elements to React Native components
   - Update styling to use React Native's StyleSheet
   - Implement navigation using React Navigation
   - Use AsyncStorage instead of localStorage

4. **Build and test the application**
   ```bash
   # Start the development server
   expo start
   
   # Test on iOS simulator
   expo run:ios
   
   # Test on Android emulator
   expo run:android
   ```

5. **Publish to app stores**
   - **iOS App Store**
     - Create an app in App Store Connect
     - Build the application for iOS
     - Submit for review
   
   - **Google Play Store**
     - Create an app in Google Play Console
     - Build the application for Android
     - Submit for review

## Option 3: Docker Deployment

### Prerequisites
- Docker and Docker Compose
- Server with Docker installed

### Steps

1. **Create a Dockerfile for the backend**
   ```dockerfile
   FROM node:16-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   
   EXPOSE 5000
   
   CMD ["node", "app.js"]
   ```

2. **Create a Dockerfile for the frontend**
   ```dockerfile
   FROM node:16-alpine as build
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=build /app/build /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. **Create a docker-compose.yml file**
   ```yaml
   version: '3'
   
   services:
     db:
       image: postgres:14-alpine
       environment:
         POSTGRES_USER: inventory
         POSTGRES_PASSWORD: password
         POSTGRES_DB: inventory
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     backend:
       build: ./backend
       environment:
         DB_CONNECTION_STRING: postgresql://inventory:password@db:5432/inventory
         JWT_SECRET: your_jwt_secret_key
         GOOGLE_APPLICATION_CREDENTIALS: /app/google-credentials.json
       volumes:
         - ./google-credentials.json:/app/google-credentials.json
       depends_on:
         - db
   
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       depends_on:
         - backend
   
   volumes:
     postgres_data:
   ```

4. **Deploy using Docker Compose**
   ```bash
   # Start the application
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop the application
   docker-compose down
   ```

## Recommended Deployment Option

For your specific needs, we recommend the **Progressive Web App (PWA)** approach with deployment to a cloud provider like Heroku or Vercel. This option provides:

1. **Cross-platform compatibility** - Works on both iOS and Android devices
2. **Easy updates** - No need to submit updates to app stores
3. **Simplified deployment** - Easier to maintain than native apps
4. **Offline capabilities** - Can work without an internet connection
5. **Installation on home screen** - Users can add the app to their home screen

This approach allows your employees to access the inventory system from any device with minimal setup, while still providing a native-like experience.

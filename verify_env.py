#!/usr/bin/env python3
"""
Environment Variable Verification Script for Inventory Tracker App

This script checks for the presence of required environment variables in your
local development environment and provides guidance for ensuring they match
your Vercel and Render deployment environments.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Define the required environment variables for each environment
REQUIRED_BACKEND_VARS = [
    'DATABASE_URL',
    'JWT_SECRET_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'PORT'
]

REQUIRED_FRONTEND_VARS = [
    'REACT_APP_API_URL',
    'REACT_APP_WEBSOCKET_URL'
]

def check_backend_env():
    """Check backend environment variables"""
    print("\n=== Backend Environment Variables ===")
    
    # Try to load from .env file
    load_dotenv(os.path.join(os.getcwd(), '.env'))
    
    missing = []
    for var in REQUIRED_BACKEND_VARS:
        value = os.environ.get(var)
        if value:
            # Mask sensitive values
            if 'SECRET' in var or 'KEY' in var:
                display_value = '✓ (value hidden)'
            else:
                display_value = f"✓ ({value[:20]}{'...' if len(value) > 20 else ''})"
            print(f"  ✅ {var}: {display_value}")
        else:
            missing.append(var)
            print(f"  ❌ {var}: Not set")
    
    return missing

def check_frontend_env():
    """Check frontend environment variables"""
    print("\n=== Frontend Environment Variables ===")
    
    # Try to load from frontend .env file
    frontend_env_path = os.path.join(os.getcwd(), 'frontend_app', '.env.local')
    if os.path.exists(frontend_env_path):
        load_dotenv(frontend_env_path)
    else:
        frontend_env_path = os.path.join(os.getcwd(), 'frontend_app', '.env')
        if os.path.exists(frontend_env_path):
            load_dotenv(frontend_env_path)
    
    missing = []
    for var in REQUIRED_FRONTEND_VARS:
        value = os.environ.get(var)
        if value:
            print(f"  ✅ {var}: ✓ ({value})")
        else:
            missing.append(var)
            print(f"  ❌ {var}: Not set")
    
    return missing

def print_recommendations(backend_missing, frontend_missing):
    """Print recommendations based on missing variables"""
    print("\n=== Recommendations ===")
    
    if backend_missing or frontend_missing:
        print("\n🔴 Missing Environment Variables:")
        
        if backend_missing:
            print("\nBackend (.env file):")
            for var in backend_missing:
                print(f"  - {var}")
        
        if frontend_missing:
            print("\nFrontend (frontend_app/.env.local file):")
            for var in frontend_missing:
                print(f"  - {var}")
        
        print("\n📋 Next Steps:")
        print("1. Create or update your .env files with the missing variables")
        print("2. Ensure these same variables are set in your deployment environments:")
        print("   - Backend: Render dashboard > Environment")
        print("   - Frontend: Vercel dashboard > Settings > Environment Variables")
        print("\n💡 Tip: Use the deployment_checklist.md file as a reference")
    else:
        print("\n🟢 All required environment variables are set locally!")
        print("\n📋 Next Steps:")
        print("1. Verify that these same variables are set in your deployment environments")
        print("2. Check the deployment_checklist.md file for additional guidance")
    
    print("\n=== Deployment Environment URLs ===")
    backend_url = os.environ.get('DATABASE_URL', '')
    if 'localhost' in backend_url or '127.0.0.1' in backend_url:
        print("⚠️  Your DATABASE_URL is set to a local database.")
        print("   For production, this should point to your Render PostgreSQL database.")
    
    frontend_api_url = os.environ.get('REACT_APP_API_URL', '')
    if 'localhost' in frontend_api_url or '127.0.0.1' in frontend_api_url:
        print("⚠️  Your REACT_APP_API_URL is set to a local server.")
        print("   For production, this should point to your Render backend URL.")
    
    print("\n=== Environment Variable Consistency Check ===")
    print("To ensure consistency between local and deployment environments:")
    print("1. Backend (Render):")
    print("   - DATABASE_URL should point to your Render PostgreSQL database")
    print("   - JWT_SECRET_KEY should be a secure random string")
    print("   - GOOGLE_APPLICATION_CREDENTIALS should point to a valid credentials file")
    print("\n2. Frontend (Vercel):")
    print("   - REACT_APP_API_URL should point to your Render backend URL")
    print("   - REACT_APP_WEBSOCKET_URL should match your REACT_APP_API_URL")

if __name__ == "__main__":
    print("=== Inventory Tracker Environment Variable Verification ===")
    print("Checking for required environment variables in your local environment...")
    
    backend_missing = check_backend_env()
    frontend_missing = check_frontend_env()
    
    print_recommendations(backend_missing, frontend_missing)

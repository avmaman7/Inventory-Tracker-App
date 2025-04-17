# Inventory Tracker Mobile Application
## User Guide

This comprehensive guide will help you get started with the Inventory Tracker mobile application, which allows you and your employees to manage inventory in real-time from any device.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Inventory Management](#inventory-management)
4. [OCR Invoice Processing](#ocr-invoice-processing)
5. [User Management](#user-management)
6. [Settings](#settings)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

The Inventory Tracker is a Progressive Web App (PWA) that can be accessed from any device with a web browser.

1. Open your web browser and navigate to the application URL
2. Log in with your credentials
3. For mobile devices, you can add the app to your home screen:
   - **iOS (Safari)**: Tap the Share button, then "Add to Home Screen"
   - **Android (Chrome)**: Tap the menu button, then "Add to Home Screen"

### Logging In

1. Enter your username and password
2. If you've forgotten your password, contact your administrator
3. For first-time login, you may be prompted to change your password

## Dashboard

The Dashboard provides an overview of your inventory status and recent activity.

### Key Features

- **Total Items**: Shows the total number of items in your inventory
- **Low Stock Items**: Displays items that are running low and need attention
- **Recent Activity**: Shows the number of recent inventory changes
- **Total Value**: Displays the estimated total value of your inventory

### Quick Actions

- **View Inventory**: Navigate to the full inventory list
- **Scan Invoice**: Open the OCR scanner to process invoices

### Recent Activity

This section shows the most recent changes to your inventory, including:
- Who made the change
- What item was affected
- The type of change (add, update, delete)
- When the change occurred

## Inventory Management

The Inventory Management section allows you to view, add, edit, and delete inventory items.

### Viewing Inventory

- The main inventory screen displays all items with their current quantities
- Use the search bar to find specific items
- Tap the filter icon to filter items by unit type or quantity range

### Adding Items

1. Tap the "+" button in the bottom right corner
2. Enter the item name, quantity, and unit
3. Tap "Add" to save the new item

### Updating Quantities

- Use the "+" and "-" buttons next to each item to quickly adjust quantities
- Changes are automatically saved and synchronized in real-time

### Editing Items

1. Tap the edit (pencil) icon next to an item
2. Modify the item details as needed
3. Tap "Save" to update the item

### Deleting Items

1. Tap the delete (trash) icon next to an item
2. Confirm the deletion when prompted

### Item Details

Tap on any item to view its detailed information:
- Current quantity and unit
- Last update timestamp
- Update history
- Quick update options

## OCR Invoice Processing

The OCR feature uses Google Cloud Vision to automatically extract item information from invoices.

### Capturing an Invoice

1. Navigate to the OCR Scan section
2. Choose between Camera or Gallery options
3. Take a photo of the invoice or select an existing image
4. Ensure the text is clearly visible and the image is well-lit

### Reviewing Detected Items

After processing the image:
1. Review the list of items detected from the invoice
2. For each item, you can:
   - Update an existing inventory item (checkmark icon)
   - Add as a new item (plus icon)
   - Ignore the item (X icon)
3. Adjust quantities if needed
4. Tap "Next" to continue

### Confirming Changes

1. Review the summary of changes to be made
2. Verify that all items are correctly matched
3. Tap "Process" to apply the changes to your inventory

### Tips for Better OCR Results

- Ensure good lighting when taking photos
- Hold the camera steady and ensure text is in focus
- Place the invoice on a contrasting background
- Avoid shadows or glare on the invoice

## User Management

The User Management section is only available to administrators and allows managing employee access.

### Viewing Users

- The main screen displays all users with their roles and creation dates
- Administrators are marked with a special indicator

### Adding Users

1. Tap the "Add New User" button
2. Enter the username, email, password, and role
3. Tap "Add" to create the new user

### Editing Users

1. Tap the edit icon next to a user
2. Modify the user details as needed
3. Leave the password field blank to keep the current password
4. Tap "Save" to update the user

### Deleting Users

1. Tap the delete icon next to a user
2. Confirm the deletion when prompted

### User Roles

- **User**: Can view and update inventory, use OCR, and manage their own profile
- **Admin**: Has all user permissions plus user management capabilities

## Settings

The Settings section allows you to manage your profile and application preferences.

### Profile Settings

- Update your email address
- Change your password
- View your username (cannot be changed)

### Notification Settings

- Toggle email notifications
- Configure low stock alerts
- Set up activity summary preferences

### Account Actions

- Log out of the application

## Troubleshooting

### Offline Mode

The application can work offline with limited functionality:
- You can view inventory items
- Changes made offline will sync when you reconnect
- OCR functionality requires an internet connection

### Common Issues

**Issue**: Changes not appearing on other devices
**Solution**: Check your internet connection and refresh the page

**Issue**: OCR not detecting items correctly
**Solution**: Ensure good lighting and clear text on invoices

**Issue**: Login problems
**Solution**: Verify your credentials and contact your administrator if needed

### Getting Help

If you encounter any issues not covered in this guide, please contact your system administrator or support team.

---

Thank you for using the Inventory Tracker mobile application. We hope this guide helps you make the most of its features to efficiently manage your inventory.

# Google Form Management System

## Overview
This system allows administrators to dynamically manage Google Form links for assessments in the LMS. The Google Form link can be easily updated and will automatically reflect in the LMS website.

## Features
- **Dynamic Google Form Link Management**: Admins can add, update, or deactivate Google Form links
- **Real-time Updates**: Changes are immediately reflected in the LMS website
- **Validation**: Ensures only valid Google Forms URLs are accepted
- **History Tracking**: Maintains a record of all Google Form links created
- **Public API**: Provides a public endpoint for the LMS website to fetch active Google Form links

## API Endpoints

### Admin Endpoints (Requires Authentication)
- `POST /api/google-form` - Create or update Google Form link
- `GET /api/google-form/active` - Get active Google Form link (with full details)
- `PUT /api/google-form/deactivate` - Deactivate current Google Form link
- `GET /api/google-form/history` - Get all Google Form links (including inactive)

### Public Endpoint (No Authentication Required)
- `GET /api/google-form/public` - Get active Google Form link for LMS website

## Usage

### For Administrators
1. Navigate to the Assessments page in the LMS admin panel
2. Click the "Manage Google Form" button
3. Add or update the Google Form URL, title, and description
4. The link will be immediately available for the LMS website

### For LMS Website Integration
Use the public API endpoint to fetch the active Google Form link:

```javascript
fetch('/api/google-form/public')
  .then(response => response.json())
  .then(data => {
    if (data.success && data.data) {
      const { title, url, description } = data.data;
      // Display the Google Form link in your LMS website
    }
  });
```

## Database Schema

### GoogleFormLink Model
```javascript
{
  title: String,           // Form title (optional)
  url: String,            // Google Forms URL (required)
  description: String,    // Form description (optional)
  isActive: Boolean,      // Whether the form is currently active
  createdBy: ObjectId,    // Reference to User who created it
  lastModifiedBy: ObjectId, // Reference to User who last modified it
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last modification timestamp
}
```

## Frontend Components

### GoogleFormManager Component
Located at: `frontend/src/components/GoogleFormManager/GoogleFormManager.jsx`

Features:
- Modal interface for managing Google Form links
- Form validation for Google Forms URLs
- Real-time preview of current active link
- Edit and deactivate functionality

### Integration in Assessments Page
The Google Form management is integrated into the Assessments page (`frontend/src/pages/Assessments/AssessmentsData.jsx`) with:
- "Manage Google Form" button in the top action bar
- Display of currently active Google Form link
- Direct link to open the Google Form

## Security Features
- JWT authentication required for admin endpoints
- Public endpoint only returns necessary fields (no sensitive data)
- URL validation ensures only Google Forms URLs are accepted
- Audit trail with creation and modification tracking

## Error Handling
- Comprehensive error handling for API failures
- User-friendly error messages
- Graceful fallbacks when no active Google Form is found

## Future Enhancements
- Multiple Google Form links support
- Scheduled activation/deactivation
- Analytics for Google Form usage
- Bulk import/export functionality

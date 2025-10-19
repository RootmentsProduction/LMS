# LMS Website Integration Example

## How to Display Google Form Link in LMS Website

### JavaScript Example

```javascript
// Function to fetch and display Google Form link
async function loadGoogleFormLink() {
    try {
        const response = await fetch('http://your-backend-url/api/google-form/public');
        const data = await response.json();
        
        if (data.success && data.data) {
            const { title, url, description } = data.data;
            
            // Create or update the Google Form section in your LMS website
            const formSection = document.getElementById('google-form-section');
            
            formSection.innerHTML = `
                <div class="google-form-card">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <a href="${url}" target="_blank" class="google-form-button">
                        Complete Assessment Form
                    </a>
                </div>
            `;
        } else {
            // Handle case when no active Google Form is available
            const formSection = document.getElementById('google-form-section');
            formSection.innerHTML = `
                <div class="no-form-message">
                    <p>No assessment form is currently available.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading Google Form link:', error);
    }
}

// Load the form link when the page loads
document.addEventListener('DOMContentLoaded', loadGoogleFormLink);
```

### React Example

```jsx
import React, { useState, useEffect } from 'react';

const GoogleFormSection = () => {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGoogleForm = async () => {
            try {
                const response = await fetch('/api/google-form/public');
                const data = await response.json();
                
                if (data.success && data.data) {
                    setFormData(data.data);
                }
            } catch (err) {
                setError('Failed to load assessment form');
            } finally {
                setLoading(false);
            }
        };

        fetchGoogleForm();
    }, []);

    if (loading) {
        return <div>Loading assessment form...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!formData) {
        return (
            <div className="no-form">
                <p>No assessment form is currently available.</p>
            </div>
        );
    }

    return (
        <div className="google-form-card">
            <h3>{formData.title}</h3>
            <p>{formData.description}</p>
            <a 
                href={formData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="google-form-button"
            >
                Complete Assessment Form
            </a>
        </div>
    );
};

export default GoogleFormSection;
```

### CSS Styling Example

```css
.google-form-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #0ea5e9;
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.google-form-card h3 {
    color: #0369a1;
    margin-bottom: 12px;
    font-size: 1.5rem;
    font-weight: 600;
}

.google-form-card p {
    color: #075985;
    margin-bottom: 20px;
    font-size: 1rem;
}

.google-form-button {
    display: inline-block;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
}

.google-form-button:hover {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(14, 165, 233, 0.4);
}

.no-form {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    color: #dc2626;
}

.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    color: #dc2626;
}
```

### Auto-refresh Implementation

```javascript
// Auto-refresh the Google Form link every 5 minutes
setInterval(loadGoogleFormLink, 5 * 60 * 1000);

// Or refresh when the page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadGoogleFormLink();
    }
});
```

## API Response Format

### Success Response
```json
{
    "success": true,
    "data": {
        "title": "Employee Assessment Form",
        "url": "https://docs.google.com/forms/d/1abc123def456ghi789jkl/viewform",
        "description": "Complete this assessment to evaluate your knowledge"
    }
}
```

### No Active Form Response
```json
{
    "success": false,
    "message": "No active Google Form link found"
}
```

## CORS Configuration

Make sure your backend CORS settings allow your LMS website domain:

```javascript
// In backend/server.js
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://your-lms-website.com',
        // Add other allowed origins
    ]
}));
```

## Error Handling

Always implement proper error handling for network failures, API errors, and missing data scenarios. The system is designed to gracefully handle cases where no active Google Form link is available.

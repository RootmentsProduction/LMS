# LMS Training System Implementation

## Overview

This document explains the implementation of the training system that shows both assigned trainings and mandatory trainings for each user when they log in to the LMS web application.

## System Architecture

### Frontend (lmsweb)
- **Location**: `lmsweb/src/components/TrainingDashboard.jsx`
- **Purpose**: Displays user's assigned and mandatory trainings
- **Technology**: React.js with hooks

### Backend APIs
- **Regular Trainings**: `GET /api/user/getAll/training?empID={empID}`
- **Mandatory Trainings**: `GET /api/get/mandatory/allusertraining?empID={empID}&userRole={role}`
- **Training Details**: `GET /api/trainings/{trainingId}`

## How It Works

### 1. User Authentication
- Users log in with their Employee ID and password
- The system verifies credentials via external API (`/api/verify_employee`)
- User data is stored in localStorage for session management

### 2. Training Fetching
When a user logs in (e.g., EMP260), the system:

1. **Fetches Regular Trainings**:
   - Calls `getUserTraining(empID)` API
   - Returns trainings specifically assigned to the user
   - Excludes mandatory trainings (filtered by backend)

2. **Fetches Mandatory Trainings**:
   - Calls `getUserMandatoryTraining(empID, userRole)` API
   - Returns trainings based on user's role/designation
   - Filters trainings where `Trainingtype = 'Mandatory'` and user's role matches `Assignedfor` array

3. **Displays Both Types**:
   - Shows trainings in separate tabs: "Assigned Trainings" and "Mandatory Trainings"
   - Each training shows progress, status, and action buttons

### 3. Training Types

#### Regular/Assigned Trainings
- **Source**: User collection with `training` array
- **Filter**: Excludes trainings with `Trainingtype = 'Mandatory'`
- **Progress**: Calculated from `TrainingProgress` collection
- **Display**: Shows completion percentage and status

#### Mandatory Trainings
- **Source**: Training collection with `Trainingtype = 'Mandatory'`
- **Filter**: Based on user's role matching `Assignedfor` array
- **Progress**: Calculated from `TrainingProgress` collection for users with same role
- **Display**: Shows average completion for users with same role

## API Endpoints

### Backend Controllers

#### 1. GetUserTraining (`backend/controllers/CreateUser.js`)
```javascript
// Fetches regular assigned trainings for a user
GET /api/user/getAll/training?empID={empID}

Response:
{
  "message": "Data found",
  "data": {
    "user": { /* user data */ },
    "trainingProgress": [
      {
        "trainingId": "training_id",
        "name": "Training Name",
        "completionPercentage": "75.00"
      }
    ],
    "userOverallCompletionPercentage": "80.25"
  }
}
```

#### 2. MandatoryGetAllTrainingWithCompletion (`backend/controllers/AssessmentAndModule.js`)
```javascript
// Fetches mandatory trainings based on user role
GET /api/get/mandatory/allusertraining?empID={empID}&userRole={role}

Response:
{
  "message": "Training data fetched successfully",
  "data": [
    {
      "trainingId": "training_id",
      "trainingName": "Mandatory Training Name",
      "numberOfModules": 3,
      "totalUsers": 10,
      "averageCompletionPercentage": "65.50",
      "uniqueItems": ["Role1", "Role2"]
    }
  ],
  "userDesignation": "User Role",
  "filteredCount": 2
}
```

## Testing the System

### 1. Start the Backend
```bash
cd backend
npm start
```

### 2. Start the Frontend
```bash
cd lmsweb
npm run dev
```

### 3. Test with Different Users

#### Test User: EMP103 (Generalist)
- **Employee ID**: EMP103
- **Password**: 123456
- **Role**: Generalist
- **Expected**: Should see both assigned and mandatory trainings

#### Test User: EMP260 (Your target user)
- **Employee ID**: EMP260
- **Password**: [actual password]
- **Role**: [actual role]
- **Expected**: Should see trainings assigned to their role

### 4. API Testing Script
Run the provided test script to verify APIs work correctly:

```bash
node test-training-api.js
```

## Database Schema

### User Collection
```javascript
{
  "_id": ObjectId,
  "empID": "EMP260",
  "name": "User Name",
  "role": "Generalist",
  "store": "Store Name",
  "training": [
    {
      "trainingId": ObjectId,
      "assignedDate": Date,
      "deadline": Date,
      "pass": Boolean
    }
  ]
}
```

### Training Collection
```javascript
{
  "_id": ObjectId,
  "trainingName": "Training Name",
  "Trainingtype": "Mandatory" | "Assigned",
  "Assignedfor": ["Role1", "Role2"],
  "modules": [ObjectId],
  "deadline": Date
}
```

### TrainingProgress Collection
```javascript
{
  "_id": ObjectId,
  "userId": ObjectId,
  "trainingId": ObjectId,
  "modules": [
    {
      "moduleId": ObjectId,
      "pass": Boolean,
      "videos": [
        {
          "videoId": ObjectId,
          "pass": Boolean,
          "completedAt": Date
        }
      ]
    }
  ],
  "pass": Boolean,
  "status": "In Progress" | "Completed"
}
```

## Troubleshooting

### Common Issues

1. **No Trainings Showing**
   - Check if user exists in User collection
   - Verify user has assigned trainings in `training` array
   - Check if mandatory trainings exist for user's role

2. **API Errors**
   - Verify backend is running on port 7000
   - Check CORS configuration
   - Ensure database connection is working

3. **Mandatory Trainings Not Showing**
   - Verify user's role matches `Assignedfor` array in Training collection
   - Check if `Trainingtype` is set to "Mandatory"
   - Ensure role comparison is case-insensitive

### Debug Steps

1. **Check User Data**:
   ```javascript
   // In browser console
   console.log(JSON.parse(localStorage.getItem('userData')));
   ```

2. **Check API Responses**:
   ```javascript
   // Test APIs directly
   fetch('http://localhost:7000/api/user/getAll/training?empID=EMP260')
     .then(res => res.json())
     .then(data => console.log(data));
   ```

3. **Check Database**:
   ```javascript
   // In MongoDB shell
   db.users.findOne({empID: "EMP260"});
   db.trainings.find({Trainingtype: "Mandatory"});
   ```

## Implementation Notes

### Frontend Features
- **Tab Navigation**: Separate tabs for assigned and mandatory trainings
- **Progress Tracking**: Visual progress bars and completion percentages
- **Video Player**: Embedded YouTube video player for training content
- **Responsive Design**: Mobile-friendly interface
- **Error Handling**: Graceful error messages and retry functionality

### Backend Features
- **Role-based Filtering**: Mandatory trainings filtered by user role
- **Progress Calculation**: Weighted completion (40% modules, 60% videos)
- **Data Validation**: Comprehensive error checking and validation
- **Performance**: Optimized queries with proper indexing

## Future Enhancements

1. **Real-time Progress Updates**: WebSocket integration for live progress
2. **Offline Support**: Service worker for offline training access
3. **Advanced Analytics**: Detailed progress tracking and reporting
4. **Mobile App**: Native mobile application
5. **Assessment Integration**: Built-in assessments after video completion

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation in backend routes
3. Check browser console for error messages
4. Verify database connectivity and data integrity

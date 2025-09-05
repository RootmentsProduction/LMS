# Enhanced Login Analytics API Documentation

## Overview
The Login Analytics API has been significantly enhanced to provide comprehensive device and browser information for user login tracking. This system now captures detailed information about devices, browsers, platforms, and provides rich analytics for monitoring user access patterns across different platforms (iOS, Android, Web).

## Enhanced Device & Browser Information

### Device Detection Capabilities
- **Device Type**: desktop, mobile, tablet
- **Operating System**: Windows, macOS, Linux, Android, iOS
- **Device Brand**: Apple, Samsung, Google, OnePlus, Xiaomi, Huawei
- **Device Model**: iPhone 15, Galaxy S23, Pixel 8, etc.
- **Device Manufacturer**: Detailed manufacturer information
- **Platform**: iOS, Android, Windows, macOS, Linux
- **Platform Version**: Specific version numbers

### Browser Detection Capabilities
- **Browser Name**: Chrome, Safari, Firefox, Edge, Opera
- **Browser Version**: Specific version numbers
- **Browser Engine**: Blink, WebKit, Gecko, EdgeHTML
- **Browser Engine Version**: Engine-specific version numbers

### Additional Information
- **Screen Resolution**: Width and height in pixels
- **Screen Orientation**: Portrait, landscape, unknown
- **Network Connection**: Connection type information
- **Geographic Location**: Country, city, region, timezone, coordinates

## API Endpoints

### 1. Track User Login
```
POST /api/user-login/track-login
```
**Purpose**: Records a user login event with enhanced device and browser information
**Authentication**: Required (Bearer Token)
**Request Body**:
```json
{
  "userId": "user_id_here",
  "username": "username_here",
  "email": "email@example.com"
}
```
**Response**: Session ID for tracking logout

### 2. Track User Logout
```
POST /api/user-login/track-logout
```
**Purpose**: Records user logout and calculates session duration
**Authentication**: Required (Bearer Token)
**Request Body**:
```json
{
  "sessionId": "session_id_from_login"
}
```
**Response**: Session duration in minutes

### 3. Get Detailed Analytics
```
GET /api/user-login/analytics?period=7d&groupBy=day
```
**Purpose**: Comprehensive login analytics with device and browser breakdown
**Authentication**: Required (Bearer Token)
**Query Parameters**:
- `period`: 24h, 7d, 30d, all (default: 7d)
- `groupBy`: day, week, month (default: day)

**Enhanced Response Includes**:
- Device type distribution (mobile/desktop/tablet)
- OS distribution (Windows, macOS, Linux, Android, iOS)
- Browser distribution (Chrome, Safari, Firefox, Edge)
- Device brand breakdown (Apple, Samsung, Google, etc.)
- Device model breakdown (iPhone 15, Galaxy S23, etc.)
- Browser engine statistics (Blink, WebKit, Gecko)
- Platform distribution (iOS, Android, Windows, macOS, Linux)
- Detailed device breakdown (combination of type, OS, and brand)
- Login trends by time period
- Active sessions count

### 4. Get Dashboard Statistics
```
GET /api/user-login/dashboard-stats
```
**Purpose**: High-level statistics for dashboard display
**Authentication**: Required (Bearer Token)
**Response Includes**:
- Total unique users and logins
- Recent logins (last 24 hours)
- Active sessions
- Top 5 device brands
- Top 5 browsers
- Platform distribution

### 5. Get Public Statistics
```
GET /api/user-login/public-stats
```
**Purpose**: Public statistics for iOS app users (no auth required)
**Authentication**: None required
**Response**: Similar to dashboard stats but publicly accessible

### 6. Get User Login History
```
GET /api/user-login/history/{userId}?page=1&limit=20
```
**Purpose**: Detailed login history for a specific user
**Authentication**: Required (Bearer Token)
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20)

**Response Includes**:
- Complete session details with device information
- Device model, brand, OS, browser details
- Platform and browser engine information
- Session duration and timing
- Location information
- Pagination details

### 7. Get Active Users
```
GET /api/user-login/active-users
```
**Purpose**: Real-time list of currently active users
**Authentication**: Required (Bearer Token)
**Response**: Active users with enhanced device information

## Sample API Responses

### Enhanced Analytics Response
```json
{
  "success": true,
  "data": {
    "totalLogins": 1250,
    "uniqueUserCount": 89,
    "activeSessions": 23,
    "deviceTypeStats": [
      { "_id": "mobile", "count": 756 },
      { "_id": "desktop", "count": 412 },
      { "_id": "tablet", "count": 82 }
    ],
    "osStats": [
      { "_id": "android", "count": 456 },
      { "_id": "ios", "count": 300 },
      { "_id": "windows", "count": 280 },
      { "_id": "mac", "count": 132 }
    ],
    "deviceBrandStats": [
      { "_id": "Apple", "count": 432 },
      { "_id": "Samsung", "count": 234 },
      { "_id": "PC", "count": 280 },
      { "_id": "Google", "count": 89 }
    ],
    "deviceModelStats": [
      { "_id": "iPhone 15", "count": 156 },
      { "_id": "Galaxy S23", "count": 89 },
      { "_id": "iPhone 14", "count": 78 },
      { "_id": "Windows PC", "count": 280 }
    ],
    "browserStats": [
      { "_id": "Chrome", "count": 456 },
      { "_id": "Safari", "count": 234 },
      { "_id": "Firefox", "count": 89 }
    ],
    "platformStats": [
      { "_id": "iOS", "count": 300 },
      { "_id": "Android", "count": 456 },
      { "_id": "Windows", "count": 280 },
      { "_id": "macOS", "count": 132 }
    ],
    "detailedDeviceStats": [
      {
        "_id": {
          "deviceType": "mobile",
          "deviceOS": "ios",
          "deviceBrand": "Apple"
        },
        "count": 300
      }
    ],
    "loginTrends": [
      {
        "_id": { "year": 2024, "month": 1, "day": 15 },
        "count": 45
      }
    ],
    "period": "7d",
    "groupBy": "day"
  }
}
```

### User History Response
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "session_id",
        "userId": { "username": "john_doe", "email": "john@example.com" },
        "deviceType": "mobile",
        "deviceOS": "ios",
        "deviceModel": "iPhone 15",
        "deviceBrand": "Apple",
        "browser": "Safari",
        "browserVersion": "17.2",
        "platform": "iOS",
        "loginTime": "2024-01-15T10:30:00Z",
        "logoutTime": "2024-01-15T12:45:00Z",
        "sessionDuration": 135,
        "location": {
          "country": "United States",
          "city": "New York",
          "region": "NY"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalSessions": 89,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Platform-Specific Analytics

### iOS Users
- Device models: iPhone 15, iPhone 14, iPhone 13, etc.
- Browsers: Safari, Chrome, Firefox
- Platform: iOS with version detection

### Android Users
- Device brands: Samsung, Google, OnePlus, Xiaomi, Huawei
- Device models: Galaxy S23, Pixel 8, etc.
- Browsers: Chrome, Firefox, Samsung Internet
- Platform: Android with version detection

### Web Users
- Operating systems: Windows, macOS, Linux
- Browsers: Chrome, Firefox, Safari, Edge
- Browser engines: Blink, Gecko, WebKit, EdgeHTML
- Platform: Windows, macOS, Linux

## Use Cases

### 1. Mobile App Analytics
- Track iOS vs Android usage
- Monitor device model popularity
- Analyze browser usage patterns

### 2. Web Application Monitoring
- Browser compatibility tracking
- OS distribution analysis
- Screen resolution optimization

### 3. User Experience Optimization
- Device-specific feature development
- Platform-specific UI improvements
- Browser compatibility testing

### 4. Security & Compliance
- Device fingerprinting
- Location-based access control
- Session monitoring

## Implementation Notes

### Database Schema
The enhanced system uses an expanded `UserLoginSession` model with additional fields for detailed device and browser information.

### Performance
- Indexed fields for efficient querying
- Aggregation pipelines for statistics
- Pagination for large datasets

### Security
- JWT authentication for protected endpoints
- Public endpoint for basic statistics
- Rate limiting considerations

## Migration
Existing data will continue to work with basic device type and OS information. New logins will capture enhanced information automatically.

## Future Enhancements
- Real-time WebSocket updates for active users
- Advanced geographic analytics
- Device performance metrics
- User behavior patterns
- Integration with analytics platforms

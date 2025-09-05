import express from 'express';
import {
    trackUserLogin,
    trackUserLogout,
    getLoginAnalytics,
    getUserLoginHistory,
    getActiveUsers,
    getDashboardLoginStats,
    getPublicLoginStats
} from '../controllers/UserLoginController.js';
import { verifyJWT } from '../lib/JWT.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginTrackRequest:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user logging in/out
 *         username:
 *           type: string
 *           description: Username of the user
 *         email:
 *           type: string
 *           description: Email of the user
 *         deviceInfo:
 *           type: object
 *           properties:
 *             userAgent:
 *               type: string
 *               description: User agent string
 *             ipAddress:
 *               type: string
 *               description: IP address of the user
 *             deviceType:
 *               type: string
 *               description: Type of device (mobile, desktop, tablet)
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *               description: City of the user
 *             country:
 *               type: string
 *               description: Country of the user
 *     EnhancedDeviceInfo:
 *       type: object
 *       properties:
 *         deviceType:
 *           type: string
 *           enum: [desktop, mobile, tablet]
 *           description: Type of device
 *         deviceOS:
 *           type: string
 *           enum: [windows, mac, linux, android, ios, unknown]
 *           description: Operating system
 *         deviceModel:
 *           type: string
 *           description: Specific device model (e.g., iPhone 15, Galaxy S23)
 *         deviceBrand:
 *           type: string
 *           description: Device brand (e.g., Apple, Samsung, Google)
 *         deviceManufacturer:
 *           type: string
 *           description: Device manufacturer
 *         browser:
 *           type: string
 *           description: Browser name (e.g., Chrome, Safari, Firefox)
 *         browserVersion:
 *           type: string
 *           description: Browser version
 *         browserEngine:
 *           type: string
 *           description: Browser engine (e.g., Blink, WebKit, Gecko)
 *         browserEngineVersion:
 *           type: string
 *           description: Browser engine version
 *         platform:
 *           type: string
 *           description: Platform (e.g., iOS, Android, Windows, macOS)
 *         platformVersion:
 *           type: string
 *           description: Platform version
 *         screenResolution:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *               description: Screen width in pixels
 *             height:
 *               type: number
 *               description: Screen height in pixels
 *         screenOrientation:
 *           type: string
 *           enum: [portrait, landscape, unknown]
 *           description: Screen orientation
 *         connectionType:
 *           type: string
 *           description: Network connection type
 *     LoginAnalyticsResponse:
 *       type: object
 *       properties:
 *         totalLogins:
 *           type: number
 *           description: Total number of logins
 *         uniqueUsers:
 *           type: number
 *           description: Number of unique users
 *         activeSessions:
 *           type: number
 *           description: Number of currently active sessions
 *         deviceTypeStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device type (desktop, mobile, tablet)
 *               count:
 *                 type: number
 *                 description: Number of logins from this device type
 *         osStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Operating system
 *               count:
 *                 type: number
 *                 description: Number of logins from this OS
 *         browserStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Browser name
 *               count:
 *                 type: number
 *                 description: Number of logins from this browser
 *         deviceBrandStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device brand (Apple, Samsung, etc.)
 *               count:
 *                 type: number
 *                 description: Number of logins from this brand
 *         deviceModelStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device model (iPhone 15, Galaxy S23, etc.)
 *               count:
 *                 type: number
 *                 description: Number of logins from this model
 *         browserEngineStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Browser engine (Blink, WebKit, Gecko)
 *               count:
 *                 type: number
 *                 description: Number of logins from this engine
 *         platformStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Platform (iOS, Android, Windows, macOS)
 *               count:
 *                 type: number
 *                 description: Number of logins from this platform
 *         detailedDeviceStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: object
 *                 properties:
 *                   deviceType:
 *                     type: string
 *                     description: Device type
 *                   deviceOS:
 *                     type: string
 *                     description: Operating system
 *                   deviceBrand:
 *                     type: string
 *                     description: Device brand
 *               count:
 *                 type: number
 *                 description: Number of logins
 *         loginTrends:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: number
 *                     description: Year
 *                   month:
 *                     type: number
 *                     description: Month
 *                   day:
 *                     type: number
 *                     description: Day
 *               count:
 *                 type: number
 *                 description: Number of logins for this period
 *         period:
 *           type: string
 *           description: Time period for analytics
 *         groupBy:
 *           type: string
 *           description: Grouping method (day, week, month)
 *     PublicStatsResponse:
 *       type: object
 *       properties:
 *         uniqueUserCount:
 *           type: number
 *           description: Total number of unique users who have logged in
 *         totalLogins:
 *           type: number
 *           description: Total number of login sessions
 *         recentLogins:
 *           type: number
 *           description: Number of logins in the last 24 hours
 *         activeSessions:
 *           type: number
 *           description: Number of currently active sessions
 *         deviceStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Operating system
 *               count:
 *                 type: number
 *                 description: Number of logins from this OS
 *         deviceTypeStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device type (desktop, mobile, tablet)
 *               count:
 *                 type: number
 *                 description: Number of logins from this device type
 *         deviceBrandStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Device brand
 *               count:
 *                 type: number
 *                 description: Number of logins from this brand
 *         platformStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Platform
 *               count:
 *                 type: number
 *                 description: Number of logins from this platform
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the statistics were generated
 */

/**
 * @swagger
 * tags:
 *   name: Login Analytics
 *   description: User login tracking and analytics APIs with enhanced device and browser information
 */

/**
 * @swagger
 * /api/user-login/track-login:
 *   post:
 *     tags: [Login Analytics]
 *     summary: Track user login
 *     description: Records a user login event with enhanced device and browser information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginTrackRequest'
 *     responses:
 *       200:
 *         description: Login tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                   description: Unique session ID for tracking logout
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Bad request - Invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/track-login', verifyJWT, trackUserLogin);

/**
 * @swagger
 * /api/user-login/track-logout:
 *   post:
 *     tags: [Login Analytics]
 *     summary: Track user logout
 *     description: Records a user logout event and calculates session duration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Session ID from login tracking
 *             required:
 *               - sessionId
 *     responses:
 *       200:
 *         description: Logout tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 sessionDuration:
 *                   type: number
 *                   description: Session duration in minutes
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Bad request - Invalid data
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.post('/track-logout', verifyJWT, trackUserLogout);

/**
 * @swagger
 * /api/user-login/analytics:
 *   get:
 *     tags: [Login Analytics]
 *     summary: Get detailed login analytics
 *     description: Retrieves comprehensive login analytics including enhanced device and browser statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, all]
 *           default: 7d
 *         description: Time period for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Group analytics by time period
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LoginAnalyticsResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', verifyJWT, getLoginAnalytics);

/**
 * @swagger
 * /api/user-login/dashboard-stats:
 *   get:
 *     tags: [Login Analytics]
 *     summary: Get dashboard login statistics
 *     description: Retrieves login statistics for the main dashboard with device and platform breakdown
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     uniqueUserCount:
 *                       type: number
 *                       description: Total unique users who have logged in
 *                     totalLogins:
 *                       type: number
 *                       description: Total login sessions
 *                     recentLogins:
 *                       type: number
 *                       description: Logins in last 24 hours
 *                     activeSessions:
 *                       type: number
 *                       description: Currently active sessions
 *                     deviceStats:
 *                       type: array
 *                       description: OS distribution statistics
 *                     deviceTypeStats:
 *                       type: array
 *                       description: Device type distribution (mobile/desktop/tablet)
 *                     deviceBrandStats:
 *                       type: array
 *                       description: Top 5 device brands
 *                     browserStats:
 *                       type: array
 *                       description: Top 5 browsers
 *                     platformStats:
 *                       type: array
 *                       description: Platform distribution (iOS/Android/Windows/macOS/Linux)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard-stats', verifyJWT, getDashboardLoginStats);

/**
 * @swagger
 * /api/user-login/public-stats:
 *   get:
 *     tags: [Login Analytics]
 *     summary: Get public login statistics
 *     description: Retrieves public login statistics for iOS app users (no authentication required)
 *     responses:
 *       200:
 *         description: Public stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PublicStatsResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/public-stats', getPublicLoginStats);

/**
 * @swagger
 * /api/user-login/history/{userId}:
 *   get:
 *     tags: [Login Analytics]
 *     summary: Get user login history
 *     description: Retrieves detailed login history for a specific user with device and browser information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: User history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Session ID
 *                           userId:
 *                             type: object
 *                             description: User information
 *                           deviceType:
 *                             type: string
 *                             description: Device type
 *                           deviceOS:
 *                             type: string
 *                             description: Operating system
 *                           deviceModel:
 *                             type: string
 *                             description: Device model
 *                           deviceBrand:
 *                             type: string
 *                             description: Device brand
 *                           browser:
 *                             type: string
 *                             description: Browser name
 *                           browserVersion:
 *                             type: string
 *                             description: Browser version
 *                           platform:
 *                             type: string
 *                             description: Platform
 *                           loginTime:
 *                             type: string
 *                             format: date-time
 *                           logoutTime:
 *                             type: string
 *                             format: date-time
 *                           sessionDuration:
 *                             type: number
 *                             description: Session duration in minutes
 *                           location:
 *                             type: object
 *                             description: Location information
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalSessions:
 *                           type: number
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/history/:userId', verifyJWT, getUserLoginHistory);

/**
 * @swagger
 * /api/user-login/active-users:
 *   get:
 *     tags: [Login Analytics]
 *     summary: Get real-time active users
 *     description: Retrieves list of currently active users with enhanced device information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Session ID
 *                           userId:
 *                             type: object
 *                             description: User information
 *                           deviceType:
 *                             type: string
 *                             description: Device type
 *                           deviceOS:
 *                             type: string
 *                             description: Operating system
 *                           deviceModel:
 *                             type: string
 *                             description: Device model
 *                           deviceBrand:
 *                             type: string
 *                             description: Device brand
 *                           browser:
 *                             type: string
 *                             description: Browser name
 *                           platform:
 *                             type: string
 *                             description: Platform
 *                           loginTime:
 *                             type: string
 *                             format: date-time
 *                           sessionDuration:
 *                             type: number
 *                             description: Current session duration in minutes
 *                           location:
 *                             type: object
 *                             description: Location information
 *                     count:
 *                       type: number
 *                       description: Total number of active users
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/active-users', verifyJWT, getActiveUsers);

export default router;

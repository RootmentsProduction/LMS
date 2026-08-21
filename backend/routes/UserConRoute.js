import express from 'express';
import { appSignUp, flutterLogin, loginUser, saveFcmToken, sendOtp, verifyOtp } from '../controllers/CreateUser.js'; // Import the login controller
import { verifyJWT } from '../lib/JWT.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Send OTP code to user's email
 *     description: Generates a 6-digit verification code and emails it to the user. Valid for 5 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: employee@company.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Email is required
 *       500:
 *         description: Server error
 */
router.post('/send-otp', sendOtp);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email OTP code
 *     description: Validates the 6-digit OTP code sent to the specified email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: employee@company.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *             required:
 *               - email
 *               - otp
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP code
 *       500:
 *         description: Server error
 */
router.post('/verify-otp', verifyOtp);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [User Management]
 *     summary: User self-registration (App/Mobile)
 *     description: Creates a new user account for mobile app / web users and returns an authentication token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 description: Email address
 *               empID:
 *                 type: string
 *                 description: Optional employee ID (auto-generated if omitted)
 *               password:
 *                 type: string
 *                 description: Account password
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number
 *               workingBranch:
 *                 type: string
 *                 description: Name of the assigned store/branch
 *               locCode:
 *                 type: string
 *                 description: Location code of the branch
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Account created successfully, returns JWT token and user profile.
 *       400:
 *         description: Validation error or duplicate account.
 *       500:
 *         description: Internal server error.
 */
router.post('/signup', appSignUp);

/**
 * @swagger
 * /api/auth/flutter-signup:
 *   post:
 *     tags: [User Management]
 *     summary: Employee self-registration for mobile app (Flutter)
 *     description: Registers a new employee user account via the Flutter mobile app and returns a JWT authentication token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Full name of the employee
 *               email:
 *                 type: string
 *                 description: Email address
 *               empID:
 *                 type: string
 *                 description: Optional employee ID (auto-generated if omitted)
 *               password:
 *                 type: string
 *                 description: Account password
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number
 *               workingBranch:
 *                 type: string
 *                 description: Name of the assigned store/branch
 *               locCode:
 *                 type: string
 *                 description: Location code of the branch
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Account created successfully, returns JWT token and user profile.
 *       400:
 *         description: Validation error or duplicate account.
 *       500:
 *         description: Internal server error.
 */
router.post('/flutter-signup', appSignUp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [User Management]
 *     summary: User login
 *     description: This route allows a user to log in with their credentials (e.g., username and password).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The user's username
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: Successfully logged in, returning a token
 *       401:
 *         description: Unauthorized, invalid credentials
 *       400:
 *         description: Bad request, missing parameters or incorrect data
 */
router.post('/login', loginUser);
/**
 * @swagger
 * /api/auth/flutter-login:
 *   post:
 *     tags: [User Management]
 *     summary: User login for mobile app (Flutter)
 *     description: Authenticates a user on the Flutter mobile app. Validates credentials locally, or falls back to an external HR verification API and auto-provisions the user profile locally on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               empID:
 *                 type: string
 *                 description: Employee ID (can also be email)
 *               password:
 *                 type: string
 *                 description: Password
 *             required:
 *               - empID
 *               - password
 *     responses:
 *       200:
 *         description: Flutter login successful, returns a token and user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Flutter login successful
 *                 token:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Employee ID and password are required.
 *       401:
 *         description: Incorrect password or external authentication failed.
 *       500:
 *         description: Internal server error.
 */
router.post('/flutter-login', flutterLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [User Management]
 *     summary: User logout
 *     description: Logs out a user and tracks the session duration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: The session ID to logout
 *             required:
 *               - sessionId
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout tracked successfully
 *                 sessionDuration:
 *                   type: number
 *                   description: Session duration in minutes
 *       400:
 *         description: Bad request - Session ID is required
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    // Import UserLoginSession model
    const UserLoginSession = (await import('../model/UserLoginSession.js')).default;
    
    const session = await UserLoginSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Calculate session duration
    const logoutTime = new Date();
    const sessionDuration = Math.round((logoutTime - session.loginTime) / (1000 * 60)); // in minutes
    
    session.logoutTime = logoutTime;
    session.isActive = false;
    session.sessionDuration = sessionDuration;
    
    await session.save();
    
    res.status(200).json({
      message: 'Logout tracked successfully',
      sessionDuration
    });
  } catch (error) {
    console.error('Error tracking logout:', error);
    res.status(500).json({ message: 'Failed to track logout' });
  }
});

/**
 * @swagger
 * /api/auth/save-fcm-token:
 *   post:
 *     tags: [User Management]
 *     summary: Save user FCM device token
 *     description: Stores or updates the Firebase Cloud Messaging (FCM) device token for the currently logged-in user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: The FCM token generated on the client device.
 *             required:
 *               - fcmToken
 *     responses:
 *       200:
 *         description: FCM token saved successfully
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized, invalid token
 *       404:
 *         description: User or Admin not found
 *       500:
 *         description: Internal server error
 */
router.post('/save-fcm-token', verifyJWT, saveFcmToken);

export default router;

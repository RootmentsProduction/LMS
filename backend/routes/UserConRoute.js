import express from 'express';
import { loginUser } from '../controllers/CreateUser.js'; // Import the login controller

const router = express.Router();

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

export default router;

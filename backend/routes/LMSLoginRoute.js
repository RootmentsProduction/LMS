import express from 'express';
import {
    trackLMSWebsiteLogin,
    getLMSWebsiteLoginCount,
    getLMSWebsiteLoginCountSimple,
    getLMSWebsiteLoginAnalytics
} from '../controllers/LMSLoginController.js';
import { verifyJWT } from '../lib/JWT.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LMSLoginTrackRequest:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user logging into LMS website
 *         username:
 *           type: string
 *           description: Username of the user
 *         email:
 *           type: string
 *           description: Email of the user
 *     LMSLoginCountResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             totalLMSLogins:
 *               type: number
 *               description: Total number of LMS website logins
 *             uniqueLMSUserCount:
 *               type: number
 *               description: Number of unique users who logged into LMS website
 *             activeLMSSessions:
 *               type: number
 *               description: Number of currently active LMS website sessions
 *             recentLMSLogins:
 *               type: number
 *               description: Number of LMS website logins in the last 24 hours
 *             deviceStats:
 *               type: array
 *               description: Device type distribution for LMS website logins
 *             osStats:
 *               type: array
 *               description: OS distribution for LMS website logins
 *             browserStats:
 *               type: array
 *               description: Browser distribution for LMS website logins
 *             period:
 *               type: string
 *               description: Time period for the statistics
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: When the statistics were generated
 */

/**
 * @swagger
 * tags:
 *   name: LMS Website Login Tracking
 *   description: APIs for tracking and analyzing LMS website logins
 */

/**
 * @swagger
 * /api/lms-login/track:
 *   post:
 *     tags: [LMS Website Login Tracking]
 *     summary: Track LMS website login
 *     description: Records a user login event from the external LMS website
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LMSLoginTrackRequest'
 *     responses:
 *       201:
 *         description: LMS website login tracked successfully
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
router.post('/track', verifyJWT, trackLMSWebsiteLogin);

/**
 * @swagger
 * /api/lms-login/count:
 *   get:
 *     tags: [LMS Website Login Tracking]
 *     summary: Get LMS website login count
 *     description: Retrieves detailed count and statistics of LMS website logins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, all]
 *           default: all
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: LMS website login count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LMSLoginCountResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/count', verifyJWT, getLMSWebsiteLoginCount);

/**
 * @swagger
 * /api/lms-login/count-simple:
 *   get:
 *     tags: [LMS Website Login Tracking]
 *     summary: Get simple LMS website login count
 *     description: Retrieves basic count of LMS website logins (no authentication required)
 *     responses:
 *       200:
 *         description: Simple LMS website login count retrieved successfully
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
 *                     uniqueLMSUserCount:
 *                       type: number
 *                       description: Number of unique users who logged into LMS website
 *                     totalLMSLogins:
 *                       type: number
 *                       description: Total number of LMS website logins
 *                     activeLMSSessions:
 *                       type: number
 *                       description: Number of currently active LMS website sessions
 *                     recentLMSLogins:
 *                       type: number
 *                       description: Number of LMS website logins in the last 24 hours
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/count-simple', getLMSWebsiteLoginCountSimple);

/**
 * @swagger
 * /api/lms-login/analytics:
 *   get:
 *     tags: [LMS Website Login Tracking]
 *     summary: Get LMS website login analytics
 *     description: Retrieves comprehensive analytics for LMS website logins
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
 *         description: LMS website login analytics retrieved successfully
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
 *                     totalLMSLogins:
 *                       type: number
 *                     uniqueLMSUserCount:
 *                       type: number
 *                     activeLMSSessions:
 *                       type: number
 *                     deviceTypeStats:
 *                       type: array
 *                     osStats:
 *                       type: array
 *                     browserStats:
 *                       type: array
 *                     deviceBrandStats:
 *                       type: array
 *                     platformStats:
 *                       type: array
 *                     loginTrends:
 *                       type: array
 *                     recentLMSLogins:
 *                       type: array
 *                     period:
 *                       type: string
 *                     groupBy:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', verifyJWT, getLMSWebsiteLoginAnalytics);

export default router;

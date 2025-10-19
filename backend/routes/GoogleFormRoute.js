import express from 'express';
import {
    createOrUpdateGoogleFormLink,
    getActiveGoogleFormLink,
    getPublicGoogleFormLink,
    deactivateGoogleFormLink,
    getAllGoogleFormLinks
} from '../controllers/GoogleFormController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GoogleFormLink:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the Google Form
 *           example: "Employee Assessment Form"
 *         url:
 *           type: string
 *           description: Google Forms URL
 *           example: "https://docs.google.com/forms/d/1abc123def456ghi789jkl/viewform"
 *         description:
 *           type: string
 *           description: Description of the form
 *           example: "Complete this assessment to evaluate your knowledge"
 *         isActive:
 *           type: boolean
 *           description: Whether the form is currently active
 *           default: true
 */

/**
 * @swagger
 * /api/google-form:
 *   post:
 *     tags: [Google Form Management]
 *     summary: Create or update Google Form link
 *     description: Creates a new Google Form link or updates the existing one. Only one active link can exist at a time.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the Google Form
 *               url:
 *                 type: string
 *                 description: Google Forms URL
 *               description:
 *                 type: string
 *                 description: Description of the form
 *             required:
 *               - url
 *     responses:
 *       201:
 *         description: Google Form link created successfully
 *       200:
 *         description: Google Form link updated successfully
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.post('/', MiddilWare, createOrUpdateGoogleFormLink);

/**
 * @swagger
 * /api/google-form/active:
 *   get:
 *     tags: [Google Form Management]
 *     summary: Get active Google Form link (Admin)
 *     description: Retrieves the currently active Google Form link with full details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active Google Form link retrieved successfully
 *       404:
 *         description: No active Google Form link found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/active', MiddilWare, getActiveGoogleFormLink);

/**
 * @swagger
 * /api/google-form/public:
 *   get:
 *     tags: [Google Form Management]
 *     summary: Get active Google Form link (Public)
 *     description: Retrieves the currently active Google Form link for public use (LMS website)
 *     responses:
 *       200:
 *         description: Active Google Form link retrieved successfully
 *       404:
 *         description: No active Google Form link found
 *       500:
 *         description: Internal server error
 */
router.get('/public', getPublicGoogleFormLink);

/**
 * @swagger
 * /api/google-form/deactivate:
 *   put:
 *     tags: [Google Form Management]
 *     summary: Deactivate Google Form link
 *     description: Deactivates the currently active Google Form link
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Google Form link deactivated successfully
 *       404:
 *         description: No active Google Form link found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.put('/deactivate', MiddilWare, deactivateGoogleFormLink);

/**
 * @swagger
 * /api/google-form/history:
 *   get:
 *     tags: [Google Form Management]
 *     summary: Get all Google Form links (Admin)
 *     description: Retrieves all Google Form links including inactive ones for admin history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All Google Form links retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/history', MiddilWare, getAllGoogleFormLinks);

export default router;

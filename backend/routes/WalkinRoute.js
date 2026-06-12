import express from 'express';
import { checkCustomerExists, saveWalkin, getWalkins, getAllWalkinsPublic, getCronLogs } from '../controllers/WalkinController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Walkin
 *   description: Walk-in lead management API endpoints for Web Dashboard and Mobile App Integrations
 */

/**
 * @swagger
 * /api/walkin/check/{contact}:
 *   get:
 *     tags: [Walkin]
 *     summary: Check if a customer exists by contact phone number (Used by Mobile App)
 *     description: >
 *       **Where to use:** Use this API in the mobile app (or POS frontend) right after the user enters a phone number.
 *       
 *       **What it does:** Checks the database to find if a lead with this exact phone number already exists.
 *       If it does, it returns their latest details (Name, Function Date, etc.) so the mobile app can automatically pre-fill the form fields.
 *     parameters:
 *       - in: path
 *         name: contact
 *         required: true
 *         schema:
 *           type: string
 *         description: 10-digit contact phone number of the customer
 *     responses:
 *       200:
 *         description: Check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 exists:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer exists"
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerName:
 *                       type: string
 *                       example: "Adithyan"
 *                     contact:
 *                       type: string
 *                       example: "9876543210"
 *                     functionDate:
 *                       type: string
 *                       example: "2026-06-25"
 *                     remarks:
 *                       type: string
 *                       example: "Prefers slim fit"
 *                     status:
 *                       type: string
 *                       enum: [New Walkin, Revisit, Loss]
 *                       example: "Revisit"
 *                     repeatCount:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Bad request - Missing contact number
 *       500:
 *         description: Internal server error
 */
import jwt from 'jsonwebtoken';

const OptionalMiddilWare = (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = decoded;
        }
        next();
    } catch (error) {
        next();
    }
};

router.get('/check/:contact', OptionalMiddilWare, checkCustomerExists);


/**
 * @swagger
 * /api/walkin/save:
 *   post:
 *     tags: [Walkin]
 *     summary: Save a new walk-in / lead record (Used by Mobile App & Web Dashboard)
 *     description: >
 *       **Where to use:** Use this API in the mobile app or web app to submit the lead creation/edit form.
 *       
 *       **What it does:** Stores a new walk-in entry or updates an existing one. Automatically resolves staff/username, store, storeId, employeeId, and date from the authentication token if they are not provided explicitly.
 *       
 *       **Status Change Restriction (Mobile & Web):**
 *       - Status can only be changed **once per calendar day** per walk-in record.
 *       - If a status change is attempted on the same day, the API returns **HTTP 400** with message: "Status can only be changed once per day. Please try again tomorrow."
 *       - This applies to both Flutter mobile app and web dashboard requests.
 *       
 *       **Update/Create logic:**
 *       - If an existing walk-in record with the same contact number is found within the user's role/store limits:
 *         - If the status is `'New Walkin'`, a new record is created with `repeatCount = existing + 1`.
 *         - Otherwise, the existing record is updated. `repeatCount` is incremented **only if the update occurs on a different calendar day** than the record's current `date`. Same-day status changes (edits, corrections, syncs) do **not** increment the counter.
 *       - If no existing walk-in matches, a brand-new record is created.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - contact
 *               - functionDate
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: "Adithyan"
 *               contact:
 *                 type: string
 *                 example: "9876543210"
 *               functionDate:
 *                 type: string
 *                 description: Date format YYYY-MM-DD
 *                 example: "2026-06-25"
 *               store:
 *                 type: string
 *                 description: "The name of the store generating the lead (Optional: automatically resolved from token)"
 *                 example: "GROOMS Kochi"
 *               staff:
 *                 type: string
 *                 description: "The employee assigned to this lead (Optional: automatically resolved from token)"
 *                 example: "Jane Doe"
 *               storeId:
 *                 type: string
 *                 description: "Store ID (Optional: automatically resolved from token)"
 *               employeeId:
 *                 type: string
 *                 description: "Employee ID (Optional: automatically resolved from token)"
 *               category:
 *                 type: string
 *                 example: "Groom"
 *               subCategory:
 *                 type: string
 *                 example: "2PCS Suit"
 *               remarks:
 *                 type: string
 *                 example: "Fitting scheduled"
 *               status:
 *                 type: string
 *                 description: |
 *                   Walk-in status. Valid values: `New Walkin`, `Revisit`, `Loss`.
 *                   Note: `Booked`, `Rentout`, and `Return` have been removed from the dropdown.
 *                 enum: [New Walkin, Revisit, Loss]
 *                 example: "Revisit"
 *               date:
 *                 type: string
 *                 description: Date of walk-in, format YYYY-MM-DD (Defaults to today)
 *                 example: "2026-05-19"
 *     responses:
 *       200:
 *         description: Walk-in record saved successfully
 *       400:
 *         description: >
 *           Bad request. Can occur for:
 *           - Missing mandatory fields (customerName, contact)
 *           - Status change already done today: "Status can only be changed once per day. Please try again tomorrow."
 *       403:
 *         description: Access denied - User does not have permission to access this walk-in record
 *       500:
 *         description: Internal server error
 */
router.post('/save', OptionalMiddilWare, saveWalkin);

/**
 * @swagger
 * /api/walkin/list:
 *   get:
 *     tags: [Walkin]
 *     summary: Retrieve walk-ins with role-based restrictions (Used by Web Dashboard)
 *     description: >
 *       **Where to use:** Used by the Web Application Dashboard (Walkin List / Walkin Reports pages).
 *       
 *       **What it does:** Fetches walk-in logs filtered dynamically by the logged-in admin's allowed branches and optional date range parameters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Lower boundary date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: Upper boundary date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Walk-ins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 15
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.get('/list', MiddilWare, getWalkins);

/**
 * @swagger
 * /api/walkin/all:
 *   get:
 *     tags: [Walkin]
 *     summary: Retrieve ALL walk-ins globally (Used by External Webpages)
 *     description: >
 *       **Where to use:** Used by external websites or services that need to pull the full list of Walk-in leads.
 *       
 *       **What it does:** Fetches the entire collection of Walk-ins without requiring any admin authentication or role-based restrictions.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Lower boundary date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: Upper boundary date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Walk-ins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 100
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/all', getAllWalkinsPublic);

/**
 * GET /api/walkin/cron-logs
 * Returns cron job run history — use ?jobType=walkin_status_sync or ?jobType=walkin_loss_expiry to filter
 * Use ?limit=N to control how many records to return (max 100, default 20)
 */
router.get('/cron-logs', MiddilWare, getCronLogs);

export default router;

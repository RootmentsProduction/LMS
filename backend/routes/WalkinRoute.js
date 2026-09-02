import express from 'express';
import { checkCustomerExists, saveWalkin, getWalkins, getAllWalkinsPublic, getCronLogs, getWalkinCountPageData, saveWalkinCountPageData, saveCameraCheckEntry, getCameraCheckEntries, deleteCameraCheckEntry, getFlutterWalkinCount } from '../controllers/WalkinController.js';
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
 *                     functionType:
 *                       type: string
 *                       example: "Hindu Function"
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
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication token is invalid or expired. Please login again.' 
                });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = decoded;
        }
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication token is invalid or expired. Please login again.' 
        });
    }
};

router.get('/check/:contact', OptionalMiddilWare, checkCustomerExists);


/**
 * @swagger
 * /api/walkin/save:
 *   post:
 *     tags: [Walkin]
 *     summary: Save a new walk-in / lead record
 *     description: Save or update a walk-in entry from Mobile App or Web Dashboard.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - contact
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: "Adithyan"
 *               contact:
 *                 type: string
 *                 example: "9876543210"
 *               functionDate:
 *                 type: string
 *                 example: "2026-06-25"
 *               store:
 *                 type: string
 *                 example: "G-Edappally"
 *               staff:
 *                 type: string
 *                 example: "Jane Doe"
 *               storeId:
 *                 type: string
 *                 description: "The 24-character hex ObjectId of the store. If an invalid ID (e.g. empty string) is sent, the backend automatically resolves the correct storeId from the store name or employee credentials."
 *                 example: "6a158244cb0a54bf2ec3b7c4"
 *               employeeId:
 *                 type: string
 *                 description: "The 24-character hex ObjectId of the employee. If an invalid ID (e.g. 'Emp84') is sent, the backend automatically resolves the correct employeeId by doing a database lookup."
 *                 example: "6a1fe984b7cd1be0b146e658"
 *               functionType:
 *                 type: string
 *                 description: "The function type of the event. Required when status is 'New Walkin' (such as during lead creation in the mobile app/frontend). No longer used under 'Loss' status."
 *                 enum:
 *                   - "Hindu Function"
 *                   - "Christian Function"
 *                   - "Muslim Function"
 *                   - "Grooms Men"
 *                   - "Office or College"
 *                   - "Other Functions"
 *                 example: "Hindu Function"
 *               category:
 *                 type: string
 *                 enum:
 *                   - "product"
 *                   - "enquiry"
 *                   - "dapper squad"
 *                   - "customisation"
 *                 example: "product"
 *               subCategory:
 *                 type: string
 *                 example: "shirt"
 *               remarks:
 *                 type: string
 *                 example: "Price too High"
 *               notes:
 *                 type: string
 *                 example: "Customer wants premium fabric"
 *               lossProductType:
 *                 type: string
 *                 example: "Suit"
 *               lossSize:
 *                 type: string
 *                 example: "38"
 *               lossColour:
 *                 type: string
 *                 example: "Navy Blue"
 *               lossSalesPrice:
 *                 type: string
 *                 example: "12000"
 *               lossSelectRemarks:
 *                 type: string
 *                 example: "Budget restriction"
 *               lossReason:
 *                 type: string
 *                 description: "Reason for Loss (e.g. 'Design Not Available', 'Colour Not Available', 'Product Already Booked', 'Price', 'Size', 'Confirm Later')"
 *                 example: "Design Not Available"
 *               productCategory:
 *                 type: string
 *                 description: "Product Category dropdown for loss reasons 'Design Not Available' and 'Colour Not Available'"
 *                 enum:
 *                   - "Premium"
 *                   - "Non Premium"
 *                   - "Ultra Luxury"
 *                   - "Luxury"
 *                 example: "Premium"
 *               workType:
 *                 type: string
 *                 description: "Work type description (text box) for loss reason 'Design Not Available'"
 *                 example: "Custom Handwork"
 *               workSize:
 *                 type: string
 *                 description: "Alias for productCategory ('Premium', 'Non Premium', 'Ultra Luxury', 'Luxury')"
 *                 enum:
 *                   - "Premium"
 *                   - "Non Premium"
 *                   - "Ultra Luxury"
 *                   - "Luxury"
 *                 example: "Premium"
 *               lossEnquiryTrailOption:
 *                 type: string
 *                 example: "Just Visit"
 *               lossEnquiryRevisitDate:
 *                 type: string
 *                 example: "2026-06-30"
 *               repeatCount:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 description: "Manual status updates only (auto-sync via cron handles Booked/Rentout/Return/Cancelled/Billed/Bill Returned automatically)"
 *                 enum:
 *                   - "New Walkin"
 *                   - "Revisit"
 *                   - "Loss"
 *                   - "Trial"
 *                   - "Reissue"
 *                   - "Booked"
 *                   - "Rentout"
 *                   - "Return"
 *                   - "Cancelled"
 *                   - "Billed"
 *                   - "Bill Returned"
 *                   - "Other"
 *                 example: "Loss"
 *               invoiceNo:
 *                 type: string
 *                 description: "Invoice number assigned automatically by the auto-sync cron from external rental/billing APIs. Read-only — set by the system, not by client."
 *                 example: "INV-2026-001234"
 *               shoeInvoiceNo:
 *                 type: string
 *                 description: "Shoe invoice number assigned automatically by the auto-sync cron from external shoe billing APIs. Read-only — set by the system, not by client."
 *                 example: "SHOE-2026-00987"
 *               date:
 *                 type: string
 *                 example: "2026-06-15"
 *     responses:
 *       200:
 *         description: Walk-in record saved successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Access denied
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
 *       - in: query
 *         name: updatedStartDate
 *         schema:
 *           type: string
 *         description: Lower boundary date filter based on updatedAt (ISO 8601 string)
 *       - in: query
 *         name: updatedEndDate
 *         schema:
 *           type: string
 *         description: Upper boundary date filter based on updatedAt (ISO 8601 string)
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
 *                     properties:
 *                       customerName:
 *                         type: string
 *                         example: "Adithyan"
 *                       contact:
 *                         type: string
 *                         example: "9876543210"
 *                       status:
 *                         type: string
 *                         description: "Combined status (e.g. 'Booked', 'Billed', 'Booked, Billed', 'Return, Bill Returned')"
 *                         example: "Booked, Billed"
 *                       rentalStatus:
 *                         type: string
 *                         description: "Rental-only status (set by auto-sync cron from GetBookingList/GetRentoutList/GetReturnList/GetDeleteList)"
 *                         enum: [New Walkin, Booked, Rentout, Return, Cancelled]
 *                         example: "Booked"
 *                       shoeStatus:
 *                         type: string
 *                         description: "Shoe-only status (set by auto-sync cron from GetBilledList/GetBillReturnedList)"
 *                         enum: ["-", Billed, Bill Returned]
 *                         example: "Billed"
 *                       bookingDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when the dress rental was booked (from rental API)"
 *                       rentoutDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when the dress was rented out (from rental API)"
 *                       returnDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when the dress was returned (from rental API)"
 *                       cancelDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when the booking was cancelled (from rental API)"
 *                       billedDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when shoe was billed (from GetBilledList API) ✨ NEW"
 *                       invoiceNo:
 *                         type: string
 *                         description: "Invoice number assigned by auto-sync from external rental/billing APIs"
 *                         example: "INV-2026-001234"
 *                       shoeInvoiceNo:
 *                         type: string
 *                         description: "Shoe invoice number assigned by auto-sync from external shoe billing APIs"
 *                         example: "SHOE-2026-00987"
 *                       billReturnedDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Date when shoe bill was returned (from GetBillReturnedList API) ✨ NEW"
 *                       statusHistory:
 *                         type: array
 *                         description: "Chronological log of all status changes"
 *                         items:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               example: "Billed"
 *                             category:
 *                               type: string
 *                               description: "'Sales' for shoe entries, actual walk-in category for rental entries"
 *                               example: "Sales"
 *                             date:
 *                               type: string
 *                               format: date-time
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
 * @swagger
 * /api/walkin/cron-logs:
 *   get:
 *     tags: [Walk-In Sync]
 *     summary: Retrieve cron job run history for the Walk-In Auto Status Sync
 *     description: >
 *       Returns the history of cron job executions for walk-in status syncing.
 *       
 *       **Sync logic:** Every run fetches 6 external APIs per branch (GetBookingList, GetRentoutList, GetReturnList,
 *       GetDeleteList, GetBilledList, GetBillReturnedList). Matching uses **invoiceNo** (for rental flow) and **shoeInvoiceNo** (for shoe flow)
 *       as primary keys. Walk-ins are assigned their respective invoice numbers during their first sync match, and subsequent syncs use them for exact lookups.
 *       
 *       Previously fetched 6 external APIs per branch (GetBookingList, GetRentoutList, GetReturnList,
 *       GetDeleteList, GetBilledList ✨, GetBillReturnedList ✨) and updates walk-in statuses independently
 *       across two flows: **Rental** (Booked → Rentout → Return → Cancelled) and **Shoe Sales** (Billed → Bill Returned).
 *       
 *       Use `?jobType=walkin_status_sync` to see sync runs, or `?jobType=walkin_loss_expiry` to see loss-expiry runs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [walkin_status_sync, walkin_loss_expiry]
 *         description: Filter by job type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Max number of records to return
 *     responses:
 *       200:
 *         description: Cron log history returned successfully
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
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       jobType:
 *                         type: string
 *                         enum: [walkin_status_sync, walkin_loss_expiry]
 *                       status:
 *                         type: string
 *                         enum: [success, error]
 *                       startedAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                       durationMs:
 *                         type: integer
 *                         example: 4250
 *                       summary:
 *                         type: object
 *                         properties:
 *                           totalBookings:
 *                             type: integer
 *                           totalRentouts:
 *                             type: integer
 *                           totalReturns:
 *                             type: integer
 *                           totalDeletes:
 *                             type: integer
 *                           totalShoeBilled:
 *                             type: integer
 *                             description: "Count of Billed records fetched from GetBilledList ✨ NEW"
 *                           totalShoeBillReturned:
 *                             type: integer
 *                             description: "Count of Bill Returned records fetched from GetBillReturnedList ✨ NEW"
 *                           totalWalkinsUpdated:
 *                             type: integer
 *                           totalWalkinsSameStatus:
 *                             type: integer
 *                           totalWalkinsSameDayRepeat:
 *                             type: integer
 *                           totalWalkinsSkippedHierarchy:
 *                             type: integer
 *                           errorsCount:
 *                             type: integer
 *                       branchResults:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             locCode:
 *                               type: string
 *                             workingBranch:
 *                               type: string
 *                             bookings:
 *                               type: integer
 *                             rentouts:
 *                               type: integer
 *                             returns:
 *                               type: integer
 *                             deletes:
 *                               type: integer
 *                             shoeBilled:
 *                               type: integer
 *                               description: "Shoe billed count for this branch ✨ NEW"
 *                             shoeBillReturned:
 *                               type: integer
 *                               description: "Shoe bill returned count for this branch ✨ NEW"
 *                             matched:
 *                               type: integer
 *                             updated:
 *                               type: integer
 *                             sameStatus:
 *                               type: integer
 *                             sameDayRepeatSkip:
 *                               type: integer
 *                             skipped:
 *                               type: integer
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.get('/cron-logs', MiddilWare, getCronLogs);

/**
 * @swagger
 * /api/walkin/walkin-count:
 *   get:
 *     tags: [Walkin]
 *     summary: Get comparison walk-in count page data
 *     description: Returns in-app walk-in count metrics and saved camera check details for comparison.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date formatted as YYYY-MM-DD
 *       - in: query
 *         name: store
 *         required: true
 *         schema:
 *           type: string
 *         description: Store/branch name
 *     responses:
 *       200:
 *         description: Counts retrieved successfully
 */
router.get('/walkin-count', MiddilWare, getWalkinCountPageData);

/**
 * @swagger
 * /api/walkin/walkin-count/save:
 *   post:
 *     tags: [Walkin]
 *     summary: Save comparison counts
 *     description: Persists telecaller's camera counts, sales reports, time seen, and remarks.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - store
 *               - counts
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2026-06-23"
 *               store:
 *                 type: string
 *                 example: "G-Edappally"
 *               counts:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Saved successfully
 */
router.post('/walkin-count/save', MiddilWare, saveWalkinCountPageData);

/**
 * @swagger
 * /api/walkin/camera-check:
 *   post:
 *     tags: [Walkin]
 *     summary: Save Camera Checker Log entries (Used by Telecaller Portal / Mobile App)
 *     description: >
 *       Saves or replaces the list of camera check entries for a specific date and store branch.
 *       Automatically syncs the total inCam counts in WalkinCount model.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - store
 *               - entries
 *             properties:
 *               date:
 *                 type: string
 *                 description: "Date for camera check log (YYYY-MM-DD)"
 *                 example: "2026-08-25"
 *               store:
 *                 type: string
 *                 description: "Branch / Store name"
 *                 example: "SG Edappally"
 *               entries:
 *                 type: array
 *                 description: "Array of camera check entries"
 *                 items:
 *                   type: object
 *                   required:
 *                     - statusKey
 *                   properties:
 *                     inTime:
 *                       type: string
 *                       example: "10:00 AM"
 *                     outTime:
 *                       type: string
 *                       example: "10:15 AM"
 *                     identification:
 *                       type: string
 *                       maxLength: 20
 *                       example: "Red Shirt Customer"
 *                     statusKey:
 *                       type: string
 *                       description: "Category / Status key (e.g. 'walkin', 'total_walkin', 'new_loss')"
 *                       example: "walkin"
 *     responses:
 *       200:
 *         description: Camera check logs saved successfully
 *       400:
 *         description: Bad request - missing date, store, or entries
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.post('/camera-check', MiddilWare, saveCameraCheckEntry);

/**
 * @swagger
 * /api/walkin/camera-check:
 *   get:
 *     tags: [Walkin]
 *     summary: Retrieve Camera Checker Log entries for a date and store
 *     description: Returns all saved camera check log entries for the specified date and store branch.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date string (YYYY-MM-DD)
 *         example: "2026-08-25"
 *       - in: query
 *         name: store
 *         required: true
 *         schema:
 *           type: string
 *         description: Store / Branch name
 *         example: "SG Edappally"
 *     responses:
 *       200:
 *         description: Camera check entries retrieved successfully
 *       400:
 *         description: Bad request - missing date or store
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.get('/camera-check', MiddilWare, getCameraCheckEntries);

/**
 * @swagger
 * /api/walkin/camera-check/{id}:
 *   delete:
 *     tags: [Walkin]
 *     summary: Delete a single Camera Checker Log entry by ID
 *     description: Deletes an individual camera check log entry by its database ID and updates aggregated counts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ObjectId of the camera check entry to delete
 *     responses:
 *       200:
 *         description: Entry deleted successfully
 *       403:
 *         description: Access denied (Telecallers cannot delete entries)
 *       404:
 *         description: Entry not found
 *       500:
 *         description: Internal server error
 */
router.delete('/camera-check/:id', MiddilWare, deleteCameraCheckEntry);

/**
 * @swagger
 * /api/walkin/flutter/walkin-count:
 *   get:
 *     tags: [Walkin]
 *     summary: Get walkin count for Flutter mobile app
 *     description: Returns only the WALKIN count (new walk-ins) for the specified date and store.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *         description: Store/branch name (defaults to 'All' or user's assigned store)
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *         description: Date formatted as YYYY-MM-DD (defaults to today's date in IST)
 *     responses:
 *       200:
 *         description: "Returns { success: true, date, store, walkinCount }"
 */
router.get('/flutter/walkin-count', MiddilWare, getFlutterWalkinCount);
router.get('/flutter-count', MiddilWare, getFlutterWalkinCount);

export default router;

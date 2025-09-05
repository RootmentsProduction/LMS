import express from 'express';
import { handlePermissions, CreatingAdminUsers, getTopUsers, HomeBar, } from '../controllers/DestinationController.js';
import { AdminLogin, ChangeVisibility, getAllNotifications, getEscalationLevel, getNotifications, GetSubroles, getVisibility, Subroles, upsertEscalationLevel } from '../controllers/moduleController.js';
import { VerifyToken } from '../lib/VerifyJwt.js';
import { CreateNotification, FindOverDueAssessment, FindOverDueTraining, SendNotification, SendNotificationAssessment } from '../controllers/AssessmentReassign.js';
import { MiddilWare } from '../lib/middilWare.js';
import { GetAllUserDetailes, GetBranchDetailes, GetCurrentAdmin, GetPermissionController, GetSearchDataController, GetStoreManager, GetStoreManagerDueDate, PermissionController, UpdateAdminDetaile, UpdateBranchDetails, UpdateOneUserDetailes } from '../controllers/FutterAssessment.js';

const router = express.Router();




/**
 * @swagger
 * /api/admin/get/bestThreeUser:
 *   get:
 *     tags: [Admin]
 *     summary: Retrieve top three users
 *     description: Fetches the three best users based on certain criteria.
 *     responses:
 *       200:
 *         description: Successfully retrieved top three users.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/bestThreeUser', MiddilWare, getTopUsers);


/**
 * @swagger
 * /api/admin/get/HomeProgressData:
 *   get:
 *     summary: Get branch-wise training & assessment progress
 *     description: >
 *       Returns training and assessment completion percentages for all branches 
 *       assigned to the authenticated admin. Useful for monitoring LMS adoption across the organization.
 *     tags:
 *       - Progress Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved home progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Data fetched for progress
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       branchName:
 *                         type: string
 *                         example: Zorucci Edappally
 *                       locCode:
 *                         type: string
 *                         example: "1"
 *                       totalTraining:
 *                         type: integer
 *                         example: 3
 *                       totalAssessment:
 *                         type: integer
 *                         example: 4
 *                       pendingTraining:
 *                         type: number
 *                         example: 100
 *                       completeTraining:
 *                         type: number
 *                         example: 0
 *                       pendingAssessment:
 *                         type: number
 *                         example: 100
 *                       completeAssessment:
 *                         type: number
 *                         example: 0
 *       401:
 *         description: Unauthorized – Invalid token
 *       500:
 *         description: Internal server error
 */
router.get('/get/HomeProgressData', MiddilWare, HomeBar);



/**
 * @swagger
 * /api/admin/admin/createadmin:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new admin user
 *     description: Allows the creation of a new administrator with specific credentials and roles.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Admin username
 *               password:
 *                 type: string
 *                 description: Admin password
 *               email:
 *                 type: string
 *                 description: Admin email
 *               branch:
 *                     type:array
 *     responses:
 *       200:
 *         description: Admin user created successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/admin/createadmin', CreatingAdminUsers);

/**
 * @swagger
 * /api/admin/admin/permission:
 *   post:
 *     summary: Handle admin permissions
 *     description: Updates or sets permissions for an existing admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminId:
 *                 type: string
 *                 description: The ID of the admin
 *               permissions:
 *                 type: object
 *                 description: Key-value pairs of permissions
 *     responses:
 *       200:
 *         description: Permissions updated/added successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/admin/permission', handlePermissions);

/**
 * @swagger
 * /api/admin/setting/visibility:
 *
 *   post:
 *     summary: Change visibility settings
 *     description: Updates the visibility settings for specific sections and roles.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 section:
 *                   type: string
 *                   example: "trainingSection"
 *                 role:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         example: "admin"
 *                       visibility:
 *                         type: boolean
 *                         example: true
 *     responses:
 *       200:
 *         description: Visibility settings updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */

router.post('/setting/visibility', ChangeVisibility);

/**
 * @swagger
 * /api/admin/get/setting/visibility:
 *   get:
 *     summary: Get visibility settings
 *     description: Retrieves current visibility settings for various features/components.
 *     responses:
 *       200:
 *         description: Returns visibility settings.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/setting/visibility', getVisibility);

/**
 * @swagger
 * /api/admin/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Allows an admin to log in with valid credentials.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               EmpId:
 *                 type: string
 *                 example: Rootments@2025  
 *               email:
 *                 type: string
 *                 example: rootmentshradmin@gmail.com
 *     responses:
 *       200:
 *         description: Successfully logged in, returning a token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Unauthorized, invalid credentials.
 *       400:
 *         description: Bad request, missing parameters or incorrect data.
 */

router.post('/admin/login', AdminLogin);

/**
 * @swagger
 * /api/admin/admin/verifyToken:
 *   post:
 *     summary: Verify admin token
 *     description: Verifies the validity of an admin token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: The token to verify
 *     responses:
 *       200:
 *         description: Token is valid.
 *       401:
 *         description: Unauthorized or invalid token.
 *       400:
 *         description: Bad request, missing or invalid data.
 */
router.post('/admin/verifyToken', VerifyToken);

/**
 * @swagger
 * /api/admin/home/notification:
 *   get:
 *     summary: Retrieve home notifications
 *     description: Returns a list of notifications for the home page.
 *     responses:
 *       200:
 *         description: Successfully retrieved notifications.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/home/notification', getNotifications);

/**
 * @swagger
 * /api/admin/home/AllNotification:
 *   get:
 *     summary: Retrieve all home notifications
 *     description: Returns a complete list of all notifications for the home page.
 *     responses:
 *       200:
 *         description: Successfully retrieved all notifications.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/home/AllNotification', getAllNotifications);

/**
 * @swagger
 * /api/admin/subroles:
 *   post:
 *     summary: Create or update a subrole
 *     description: Creates a new subrole or updates an existing subrole.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Subrole created or updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/subroles', Subroles);

/**
 * @swagger
 * /api/admin/getSubrole:
 *   get:
 *     summary: Retrieve subroles
 *     description: Returns a list of all subroles and their permissions.
 *     responses:
 *       200:
 *         description: Successfully retrieved subroles.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/getSubrole', GetSubroles);

/**
 * @swagger
 * /api/admin/escalation/level:
 *   post:
 *     summary: Upsert escalation level
 *     description: Creates or updates an escalation level configuration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               levelName:
 *                 type: string
 *               criteria:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       200:
 *         description: Escalation level upserted successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/escalation/level', upsertEscalationLevel);

/**
 * @swagger
 * /api/admin/escalation/level/get:
 *   get:
 *     summary: Get escalation levels
 *     description: Retrieves all configured escalation levels.
 *     responses:
 *       200:
 *         description: Successfully retrieved escalation levels.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/escalation/level/get', getEscalationLevel);

/**
 * @swagger
 * /api/admin/overdue/Assessment:
 *   get:
 *     summary: Find overdue assessments
 *     description: Retrieves a list of users or tasks with overdue assessments.
 *     responses:
 *       200:
 *         description: Successfully retrieved overdue assessments.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/overdue/Assessment', MiddilWare, FindOverDueAssessment);

/**
 * @swagger
 * /api/admin/overdue/Training:
 *   get:
 *     tags: [Training]
 *     summary: Find overdue trainings
 *     description: Retrieves a list of users or tasks with overdue trainings.
 *     responses:
 *       200:
 *         description: Successfully retrieved overdue trainings.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/overdue/Training', MiddilWare, FindOverDueTraining);

/**
 * @swagger
 * /api/user/overdue/Training/send/{empId}:
 *   get:
 *     tags: [Training]
 *     summary: Send notification for overdue training
 *     description: Sends a notification to a user about overdue training.
 *     parameters:
 *       - in: path
 *         name: empId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Notification sent successfully.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/overdue/Training/send/:empId', MiddilWare, SendNotification);

/**
 * @swagger
 * /api/admin/overdue/assessment/send/{empId}:
 *   get:
 *     summary: Send notification for overdue assessment
 *     description: Sends a notification to a user about an overdue assessment.
 *     parameters:
 *       - in: path
 *         name: empId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Notification sent successfully.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/overdue/assessment/send/:empId', MiddilWare, SendNotificationAssessment);

/**
 * @swagger
 * /api/admin/notification/create:
 *   post:
 *     summary: Create a notification
 *     description: Creates a new notification entry for a user or system event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification created successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/notification/create', CreateNotification);

/**
 * @swagger
 * /api/admin/user/detailed/info/{id}:
 *   get:
 *     summary: Get detailed user info
 *     description: Retrieves detailed information for a specific user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user details.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/user/detailed/info/:id', MiddilWare, GetAllUserDetailes);

/**
 * @swagger
 * /api/admin/user/update/{id}:
 *   put:
 *     summary: Update user details
 *     description: Updates specific fields for a user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/user/update/:id', MiddilWare, UpdateOneUserDetailes);

/**
 * @swagger
 * /api/admin/get/update/branch/{id}:
 *   get:
 *     summary: Retrieve branch details
 *     description: Gets branch details for a specific branch ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Successfully retrieved branch details.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: Branch not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/update/branch/:id', MiddilWare, GetBranchDetailes);

/**
 * @swagger
 * /api/admin/put/update/branch/{id}:
 *   put:
 *     summary: Update branch details
 *     description: Updates specific fields for a branch.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchName:
 *                 type: string
 *               manager:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Branch updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: Branch not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/put/update/branch/:id', MiddilWare, UpdateBranchDetails);

/**
 * @swagger
 * /get/current/admin:
 *   get:
 *     summary: Get current admin
 *     description: Retrieves details of the currently logged-in admin.
 *     responses:
 *       200:
 *         description: Successfully retrieved current admin details.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/current/admin', MiddilWare, GetCurrentAdmin);

/**
 * @swagger
 * /api/admin/update/admin/detaile:
 *   post:
 *     summary: Update admin details
 *     description: Updates certain fields for the currently logged-in admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminId:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin details updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/update/admin/detaile', MiddilWare, UpdateAdminDetaile);

/**
 * @swagger
 * /api/admin/get/storemanagerData:
 *   get:
 *     summary: Get store manager data
 *     description: Retrieves data related to the store manager(s).
 *     responses:
 *       200:
 *         description: Successfully retrieved store manager data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/storemanagerData', MiddilWare, GetStoreManager);

/**
 * @swagger
 * /api/admin/get/storemanagerduedata:
 *   get:
 *     summary: Get store manager due data
 *     description: Retrieves any data related to upcoming or overdue items for store managers.
 *     responses:
 *       200:
 *         description: Successfully retrieved store manager due data.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/storemanagerduedata', MiddilWare, GetStoreManagerDueDate);

/**
 * @swagger
 * /api/admin/permission/controller:
 *   post:
 *     summary: Manage permission controller
 *     description: Creates or updates permission rules for certain roles or users.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: string
 *               permissions:
 *                 type: object
 *                 properties:
 *                   canCreateTraining:
 *                     type: boolean
 *                   canCreateAssessment:
 *                     type: boolean
 *                   canReassignTraining:
 *                     type: boolean
 *                   canReassignAssessment:
 *                     type: boolean
 *                   canDeleteTraining:
 *                     type: boolean
 *                   canDeleteAssessment:
 *                     type: boolean
 *             example:
 *               roleId: "super_admin"
 *               permissions:
 *                 canCreateTraining: true
 *                 canCreateAssessment: true
 *                 canReassignTraining: true
 *                 canReassignAssessment: true
 *                 canDeleteTraining: true
 *                 canDeleteAssessment: true
 *     responses:
 *       200:
 *         description: Permission rules created or updated successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */

router.post('/permission/controller', MiddilWare, PermissionController);

/**
 * @swagger
 * /api/admin/get/permission/controller:
 *   get:
 *     summary: Get permission controller
 *     description: Retrieves permission rules for certain roles or users.
 *     responses:
 *       200:
 *         description: Successfully retrieved permission rules.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/permission/controller', MiddilWare, GetPermissionController);


/**
 * @swagger
 * /api/admin/get/searching/userORbranch:
 *   get:
 *     summary: Get the search result of user or branch
 *     description: Retrieves  users or branch.
 *     responses:
 *       200:
 *         description: Successfully retrieved users or branch.
 *       401:
 *         description: Unauthorized, invalid credentials or no token provided.
 *       500:
 *         description: Internal server error.
 */


router.post('/get/searching/userORbranch', MiddilWare, GetSearchDataController);




export default router;
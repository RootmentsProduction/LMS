import express from 'express';
import { MiddilWare } from '../lib/middilWare.js';
import { getExternalEmployeeOverview, getExternalStoreOverview } from '../controllers/ExternalIntegrationController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: External Integration
 *   description: Comprehensive data exchange APIs for external systems and companion projects.
 */

/**
 * @swagger
 * /api/external/employee-overview:
 *   get:
 *     tags: [External Integration]
 *     summary: Get comprehensive employee overview across all DB entities
 *     description: >
 *       Aggregates all available data related to an individual employee from across the entire LMS database,
 *       including User profile, Admin/role configuration, Employee record, assigned modules/assessments/trainings,
 *       detailed module watch progress, assessment process scores, assigned tasks, walk-in leads handled,
 *       performance evaluation ratings, recent login sessions, and store/branch context.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: empId
 *         schema:
 *           type: string
 *         description: Employee ID (e.g. emp101, Emp8899). Accepts user empID, admin EmpId, or employeeId.
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the User or Admin document.
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Email address of the employee.
 *     responses:
 *       200:
 *         description: Employee comprehensive overview fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *                       description: Merged profile across User, Admin, and Employee collections
 *                     store:
 *                       type: object
 *                       description: Branch / store details for the employee
 *                     trainings:
 *                       type: array
 *                       description: Assigned trainings and in-depth video watch progress
 *                     assessments:
 *                       type: array
 *                       description: Assigned assessments and attempt results
 *                     tasks:
 *                       type: array
 *                       description: Tasks assigned to the employee
 *                     walkins:
 *                       type: array
 *                       description: Walk-in customers handled by this employee
 *                     performance:
 *                       type: array
 *                       description: Performance evaluations and review scores
 *                     attributions:
 *                       type: object
 *                       description: Sales attributions (Dappr and Customization)
 *                     loginSessions:
 *                       type: array
 *                       description: Recent device/browser login history
 *       400:
 *         description: Missing required identifier parameter (empId, userId, or email).
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/employee-overview', MiddilWare, getExternalEmployeeOverview);

/**
 * @swagger
 * /api/external/store-overview:
 *   get:
 *     tags: [External Integration]
 *     summary: Get comprehensive store/branch overview across all DB entities
 *     description: >
 *       Aggregates all available data related to an individual store/branch across the entire LMS database,
 *       including Branch profile, Cluster, assigned store manager/admins, active employees and users,
 *       targets and monthly goals, sales attributions (Dappr and Customization), walk-ins handled,
 *       camera footfall audits, branch compliance inspection audits, tasks, and Google Review entries.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: locCode
 *         schema:
 *           type: string
 *         description: Branch location code (e.g. "3", "102", "13").
 *       - in: query
 *         name: storeName
 *         schema:
 *           type: string
 *         description: Store or workingBranch name (e.g. "Suitor Guy Edappally", "Z-Edappally1", "G-Edappally").
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the Branch document.
 *     responses:
 *       200:
 *         description: Store comprehensive overview fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     branch:
 *                       type: object
 *                       description: Branch metadata, location, and cluster details
 *                     staff:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                         admins:
 *                           type: array
 *                         employees:
 *                           type: array
 *                     targets:
 *                       type: array
 *                       description: Monthly and weekly targets set for this store and staff
 *                     attributions:
 *                       type: object
 *                       description: Dappr & Customization attributions for this store
 *                     walkins:
 *                       type: array
 *                       description: Walkin customers logged at this store
 *                     cameraChecks:
 *                       type: array
 *                       description: Daily camera footfall audits
 *                     audits:
 *                       type: array
 *                       description: Inspection audit scores and ratings
 *                     tasks:
 *                       type: array
 *                       description: Store-level tasks
 *                     googleReviews:
 *                       type: array
 *                       description: Google Review log entries
 *       400:
 *         description: Missing required identifier parameter (locCode, storeName, or branchId).
 *       404:
 *         description: Branch not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/store-overview', MiddilWare, getExternalStoreOverview);

export default router;

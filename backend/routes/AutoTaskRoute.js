import express from 'express';
import {
  createAutoTask,
  getAutoTasks,
  getAutoTaskById,
  updateAutoTask,
  toggleAutoTask,
  deleteAutoTask,
  generateNow,
} from '../controllers/AutoTaskController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * /api/auto-task/save:
 *   post:
 *     tags: [Auto Tasks]
 *     summary: Create a new Auto Task Template
 *     description: >
 *       Creates a recurring auto task template. The cron job runs every hour and
 *       generates real Task documents (in the same Task collection) for all active
 *       templates whose schedule matches today's date.
 *       Generated tasks behave identically to manually-created tasks.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - subCategory
 *               - startDate
 *               - assignMode
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               subCategory:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [Urgent, High, Normal, Low]
 *                 default: Normal
 *               repeatType:
 *                 type: string
 *                 enum: [daily, weekly, monthly, custom]
 *                 default: daily
 *               startDate:
 *                 type: string
 *                 description: YYYY-MM-DD
 *               startTime:
 *                 type: string
 *                 description: e.g. "09:00am"
 *               endDate:
 *                 type: string
 *                 description: YYYY-MM-DD (optional — empty means no end)
 *               endTime:
 *                 type: string
 *               assignMode:
 *                 type: string
 *                 enum: [all_employees, store, role, individual]
 *               selectedStores:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Store names (workingBranch) — required when assignMode=store
 *               selectedRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Role keys — required when assignMode=role
 *               selectedUsers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                 description: Individual user/admin objects — required when assignMode=individual
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               fileAttachment:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   base64:
 *                     type: string
 *     responses:
 *       201:
 *         description: Auto task template created successfully
 *       400:
 *         description: Missing required fields or invalid values
 *       500:
 *         description: Internal server error
 */
router.post('/save', MiddilWare, createAutoTask);

/**
 * @swagger
 * /api/auto-task/list:
 *   get:
 *     tags: [Auto Tasks]
 *     summary: List all Auto Task Templates
 *     description: >
 *       Returns all auto task templates. Super Admin and HR Admin see all templates.
 *       Other roles see only their own.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of auto task templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/list', MiddilWare, getAutoTasks);

/**
 * @swagger
 * /api/auto-task/{id}/generate-now:
 *   post:
 *     tags: [Auto Tasks]
 *     summary: Manually trigger task generation for a template (testing)
 *     description: >
 *       Immediately runs the task generation service for the specified template
 *       regardless of today's schedule. Duplicate prevention still applies —
 *       if tasks were already generated for the target date they will be skipped.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: AutoTaskTemplate ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetDate:
 *                 type: string
 *                 description: YYYY-MM-DD override (defaults to today)
 *     responses:
 *       200:
 *         description: Generation result summary
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/generate-now', MiddilWare, generateNow);

/**
 * @swagger
 * /api/auto-task/{id}:
 *   get:
 *     tags: [Auto Tasks]
 *     summary: Get a single Auto Task Template by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', MiddilWare, getAutoTaskById);

/**
 * @swagger
 * /api/auto-task/{id}:
 *   put:
 *     tags: [Auto Tasks]
 *     summary: Update an Auto Task Template
 *     description: Update any fields of an existing template. Only the creator or a Super/HR Admin can update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', MiddilWare, updateAutoTask);

/**
 * @swagger
 * /api/auto-task/{id}/toggle:
 *   patch:
 *     tags: [Auto Tasks]
 *     summary: Activate or deactivate an Auto Task Template
 *     description: Toggles the isActive flag. Inactive templates are skipped by the cron job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template toggled successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/toggle', MiddilWare, toggleAutoTask);

/**
 * @swagger
 * /api/auto-task/{id}:
 *   delete:
 *     tags: [Auto Tasks]
 *     summary: Delete an Auto Task Template
 *     description: Permanently deletes the template. Already-generated tasks are not affected.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', MiddilWare, deleteAutoTask);

export default router;

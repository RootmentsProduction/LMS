import express from 'express';
import { createTask, getTasks, getTaskById, getTaskAssignees, updateTaskStatus, reassignTask, getTaskAttachment, getTaskReviewAttachment, requestExtension, resolveExtensionRequest, updateTaskDetails } from '../controllers/TaskController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * /api/task/assignees:
 *   get:
 *     tags: [Tasks]
 *     summary: Retrieve assignable users and groups
 *     description: Returns a list of generic role-based group options (e.g. All Employees) and individual admins/employees based on the logged-in user's role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assignees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                       type:
 *                         type: string
 *                       role:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/assignees', MiddilWare, getTaskAssignees);

/**
 * @swagger
 * /api/task/save:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     description: Create a task assigned to a store, employee, or generic group. Accessible to both administrators and standard employees. Triggers a database-backed inbox notification to the assigned user(s)/admin(s).
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
 *               category:
 *                 type: string
 *               subCategory:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               assignedToLabel:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [task, auto]
 *               startDate:
 *                 type: string
 *                 description: Start date in YYYY-MM-DD format
 *               startTime:
 *                 type: string
 *                 description: Start time, e.g. "11:20am"
 *               endDate:
 *                 type: string
 *                 description: End date in YYYY-MM-DD format
 *               endTime:
 *                 type: string
 *                 description: End time, e.g. "11:20am"
 *               description:
 *                 type: string
 *               additionalInfo:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [Urgent, High, Normal, Low]
 *               fileAttachment:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Original filename
 *                   base64:
 *                     type: string
 *                     description: Base64 data URI string of the file
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input or missing fields
 *       500:
 *         description: Internal server error
 */
router.post('/save', MiddilWare, createTask);

/**
 * @swagger
 * /api/task/list:
 *   get:
 *     tags: [Tasks]
 *     summary: Retrieve list of tasks
 *     description: Get tasks assigned to the logged-in user or admin's scope using RBAC filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, category, description, etc.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID (RBAC secured)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ID (RBAC secured)
 *     responses:
 *       200:
 *         description: List of tasks successfully retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/list', MiddilWare, getTasks);

/**
 * @swagger
 * /api/task/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Retrieve a single task by ID
 *     description: Retrieve specific task details by ID. Secured with RBAC filtering.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to fetch
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', MiddilWare, getTaskById);

/**
 * @swagger
 * /api/task/{id}/status:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task status
 *     description: >
 *       Updates the status of an existing task. Handles status normalization (e.g. `REVIEW` becomes `UNDER REVIEW`, and `REASSIGN` or `reassign` becomes `REASSIGNED`).
 *       
 *       **Notifications:**
 *       - Moving status to `UNDER REVIEW` triggers a database-backed notification to the task creator.
 *       - Moving status to `REASSIGNED` triggers a database-backed notification to the new assignee.
 *       
 *       **Permissions:**
 *       - Only current assignee or an administrator (Super Admin, HR Admin, Cluster Admin, Store Admin) can update status to `REASSIGNED` (reassign).
 *       - If status is `COMPLETED`, only the original task creator (assigner) can finalize it.
 *       - Other status changes are restricted to the assignee, admin, or store-level users.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID or taskCode to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN PROGRESS, COMPLETED, OVERDUE, ON HOLD, UNDER REVIEW, REASSIGNED, EXTENSION REQUESTED]
 *                 description: The new status value (accepts "reassign" to trigger REASSIGNED status)
 *               requestedExtensionDate:
 *                 type: string
 *                 description: The date requested for extension in YYYY-MM-DD format (Required only if status is updated to EXTENSION REQUESTED)
 *               assignedTo:
 *                 type: string
 *                 description: ID of the new assignee (Required only if status is updated to REASSIGNED/reassign)
 *               assignedToLabel:
 *                 type: string
 *                 description: Label/Name of the new assignee (Required only if status is updated to REASSIGNED/reassign)
 *               fileAttachment:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   base64:
 *                     type: string
 *                 description: Required file attachment when status is updated to UNDER REVIEW
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Task status successfully updated
 *       400:
 *         description: Invalid input, missing status, or missing reassignment fields
 *       403:
 *         description: Access denied – unauthorized to perform status update or reassignment
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', MiddilWare, updateTaskStatus);

/**
 * @swagger
 * /api/task/{id}/reassign:
 *   put:
 *     tags: [Tasks]
 *     summary: Reassign a task to another employee
 *     description: >
 *       Reassigns an existing task to another employee or administrator and resets its status to REASSIGNED.
 *       Triggers a database-backed inbox notification to the new assignee.
 *       
 *       **Permissions:**
 *       - Access is restricted exclusively to the current assignee of the task and all administrators (Super Admin, HR Admin, Cluster Admin, Store Admin).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID or taskCode to reassign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: ID of the new assignee
 *               assignedToLabel:
 *                 type: string
 *                 description: Label/Name of the new assignee
 *             required:
 *               - assignedTo
 *               - assignedToLabel
 *     responses:
 *       200:
 *         description: Task reassigned successfully.
 *       400:
 *         description: assignedTo and assignedToLabel are required.
 *       403:
 *         description: Access denied – only the current assignee and administrators are authorized to reassign.
 *       404:
 *         description: Task not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/:id/reassign', MiddilWare, reassignTask);

router.get('/:id/attachment', getTaskAttachment);
router.get('/:id/review-attachment', getTaskReviewAttachment);
/**
 * @swagger
 * /api/task/{id}/request-extension:
 *   put:
 *     tags: [Tasks]
 *     summary: Request a deadline extension (called by the mobile assignee)
 *     description: >
 *       Submits a deadline extension request on behalf of the task assignee.
 *       Sets the task status to **EXTENSION REQUESTED** and stores the requested new deadline.
 *       Triggers a database-backed notification to the task creator (assigner) so they can
 *       approve or reject the request from the web dashboard.
 *
 *       **Rules:**
 *       - Cannot request an extension if a request is already pending.
 *       - Cannot request an extension on a COMPLETED task.
 *       - The `requestedExtensionDate` value accepts both `YYYY-MM-DD` and ISO 8601
 *         (`2026-06-07T00:00:00.000`) — the time component is stripped automatically.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID or taskCode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestedExtensionDate
 *             properties:
 *               requestedExtensionDate:
 *                 type: string
 *                 description: The new deadline being requested (YYYY-MM-DD or ISO 8601)
 *                 example: "2026-06-07"
 *     responses:
 *       200:
 *         description: Extension request submitted successfully
 *       400:
 *         description: Missing date, duplicate request, or task is already completed
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/request-extension', MiddilWare, requestExtension);

/**
 * @swagger
 * /api/task/{id}/resolve-extension:
 *   put:
 *     tags: [Tasks]
 *     summary: Approve or reject a pending extension request (web creator only)
 *     description: >
 *       Allows the task **creator (assigner)** to approve or reject a pending extension request.
 *       The task must currently be in **EXTENSION REQUESTED** status.
 *
 *       **Actions:**
 *       - **APPROVE:** Updates `endDate` to the `requestedExtensionDate` and reverts status to its previous value.
 *       - **REJECT:** Reverts status to its previous value without changing `endDate`.
 *
 *       **Permissions:** Only the task creator can call this endpoint.
 *
 *       **Notifications:** The assignee is notified of the outcome.
 *
 *       > ⚠️ This endpoint is intended for the **web dashboard only**.
 *       > Mobile assignees should use `PUT /:id/request-extension` to submit extension requests.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID or taskCode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *                 description: The resolution action
 *     responses:
 *       200:
 *         description: Extension request resolved successfully
 *       400:
 *         description: Task is not in EXTENSION REQUESTED status
 *       403:
 *         description: Access denied — only the task creator can resolve extension requests
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/resolve-extension', MiddilWare, resolveExtensionRequest);
router.put('/:id/details', MiddilWare, updateTaskDetails);

export default router;

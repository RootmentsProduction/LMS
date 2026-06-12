import express from 'express';
import {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    getAllEmployeesWithTrainingDetails
} from '../controllers/EmployeeController.js';
import {
    getAllEmployeesWithTrainingDetailsV2,
    autoSyncEmployees,
    getAllAppRegisteredEmployees,
} from '../controllers/EmployeeManagementController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * /api/employee:
 *   post:
 *     tags: [Employee]
 *     summary: Create a new employee
 *     description: Creates a new employee record in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee name
 *               email:
 *                 type: string
 *                 description: Employee email
 *               employeeId:
 *                 type: string
 *                 description: Employee ID
 *             required:
 *               - name
 *               - email
 *               - employeeId
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

// POST /api/employee - Create a new employee
router.post('/', createEmployee);

/**
 * @swagger
 * /api/employee:
 *   get:
 *     tags: [Employee]
 *     summary: Get all employees
 *     description: Retrieves all employees
 *     responses:
 *       200:
 *         description: List of employees
 *       500:
 *         description: Internal server error
 */
router.get('/', getAllEmployees);

// ── Named routes MUST be before /:id to avoid param capture ──

/**
 * @swagger
 * /api/employee/management/with-training-details:
 *   get:
 *     tags: [Employee]
 *     summary: Get all employees with training details
 *     description: Retrieves employee list along with their completed training and metrics. RBAC scoped.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or employee ID
 *     responses:
 *       200:
 *         description: List of employees with training details
 *       500:
 *         description: Internal server error
 */
router.get('/management/with-training-details', MiddilWare, getAllEmployeesWithTrainingDetailsV2);

/**
 * @swagger
 * /api/employee/app-users:
 *   get:
 *     tags: [Employee]
 *     summary: Get app-registered employees
 *     description: Retrieves employees who have logged into the mobile app.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of app users
 *       500:
 *         description: Internal server error
 */
router.get('/app-users', MiddilWare, getAllAppRegisteredEmployees);

/**
 * @swagger
 * /api/employee/auto-sync:
 *   post:
 *     tags: [Employee]
 *     summary: Auto sync employees
 *     description: Sync employee details from the external API to the LMS.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync successful
 *       500:
 *         description: Sync failed
 */
router.post('/auto-sync', MiddilWare, autoSyncEmployees);

/**
 * @swagger
 * /api/employee/test-external-api:
 *   get:
 *     tags: [Employee]
 *     summary: Test external API
 *     description: Tests the connection to the external Rootments API.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API test successful
 *       500:
 *         description: API test failed
 */
router.get('/test-external-api', MiddilWare, async (req, res) => {
    try {
        const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
        const axios = (await import('axios')).default;
        const response = await axios.post('https://rootments.in/api/employee_range', {
            startEmpId: 'EMP1', endEmpId: 'EMP3'
        }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}` }
        });
        const employees = response.data?.data || [];
        res.status(200).json({ success: true, message: 'External API test successful', employeeCount: employees.length, sampleData: employees.slice(0, 2) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'External API test failed', error: error.message });
    }
});

// ── Param routes LAST ──

/**
 * @swagger
 * /api/employee/{id}:
 *   get:
 *     tags: [Employee]
 *     summary: Get employee by ID
 *     description: Fetch details of a specific employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     responses:
 *       200:
 *         description: Employee details retrieved
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getEmployeeById);

/**
 * @swagger
 * /api/employee/{id}:
 *   put:
 *     tags: [Employee]
 *     summary: Update employee
 *     description: Update specific employee's details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', updateEmployee);

/**
 * @swagger
 * /api/employee/{id}:
 *   delete:
 *     tags: [Employee]
 *     summary: Delete employee
 *     description: Remove a specific employee from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     responses:
 *       200:
 *         description: Employee deleted
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteEmployee);

export default router;
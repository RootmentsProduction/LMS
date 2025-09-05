import express from 'express';
import {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} from '../controllers/EmployeeController.js';

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
 *     description: Retrieves a list of all employees with pagination and filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of employees per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering employees
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', getAllEmployees);

/**
 * @swagger
 * /api/employee/{id}:
 *   get:
 *     tags: [Employee]
 *     summary: Get employee by ID
 *     description: Retrieves a specific employee by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB _id
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
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
 *     summary: Update employee by ID
 *     description: Updates an existing employee record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB _id
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
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Bad request
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
 *     summary: Delete employee by ID
 *     description: Deletes an employee record from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB _id
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', deleteEmployee);

export default router;
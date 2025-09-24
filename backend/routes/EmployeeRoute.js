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
    autoSyncEmployees
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

/**
 * @swagger
 * /api/employee/management/with-training-details:
 *   get:
 *     tags: [Employee]
 *     summary: Get all employees with training and assessment details
 *     description: Retrieves all employees with their training completion, overdue trainings, assessment completion, and overdue assessments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee data with training details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee data with training details fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       empID:
 *                         type: string
 *                         example: "EMP01"
 *                       username:
 *                         type: string
 *                         example: "John Doe"
 *                       designation:
 *                         type: string
 *                         example: "Manager"
 *                       workingBranch:
 *                         type: string
 *                         example: "GROOMS Trivandrum"
 *                       trainingCount:
 *                         type: integer
 *                         example: 3
 *                       passCountTraining:
 *                         type: integer
 *                         example: 2
 *                       trainingDue:
 *                         type: integer
 *                         example: 1
 *                       trainingCompletionPercentage:
 *                         type: integer
 *                         example: 67
 *                       assignedAssessmentsCount:
 *                         type: integer
 *                         example: 2
 *                       passCountAssessment:
 *                         type: integer
 *                         example: 1
 *                       assessmentDue:
 *                         type: integer
 *                         example: 1
 *                       assessmentCompletionPercentage:
 *                         type: integer
 *                         example: 50
 *                 totalCount:
 *                   type: integer
 *                   example: 122
 *                 employeesWithTraining:
 *                   type: integer
 *                   example: 6
 *       401:
 *         description: Unauthorized - Invalid token
 *       500:
 *         description: Internal server error
 */
router.get('/management/with-training-details', MiddilWare, getAllEmployeesWithTrainingDetailsV2);

/**
 * @swagger
 * /api/employee/auto-sync:
 *   post:
 *     tags: [Employee]
 *     summary: Auto-sync employees from external API
 *     description: Synchronizes all employees from external API to local database
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee auto-sync completed successfully"
 *                 results:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                       example: 50
 *                     updated:
 *                       type: integer
 *                       example: 20
 *                     skipped:
 *                       type: integer
 *                       example: 5
 *                     totalInDatabase:
 *                       type: integer
 *                       example: 200
 *                     externalApiCount:
 *                       type: integer
 *                       example: 175
 *       401:
 *         description: Unauthorized - Invalid token
 *       500:
 *         description: Internal server error
 */
router.post('/auto-sync', MiddilWare, autoSyncEmployees);

/**
 * @swagger
 * /api/employee/test-external-api:
 *   get:
 *     tags: [Employee]
 *     summary: Test external API connectivity
 *     description: Tests direct connection to external API for debugging
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: External API test successful
 *       500:
 *         description: External API test failed
 */
router.get('/test-external-api', MiddilWare, async (req, res) => {
    try {
        console.log('🧪 Testing external API connectivity...');
        
        const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
        const axios = (await import('axios')).default;
        
        const response = await axios.post('https://rootments.in/api/employee_range', {
            startEmpId: 'EMP1',
            endEmpId: 'EMP3' // Test with small range
        }, { 
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
            }
        });
        
        const employees = response.data?.data || [];
        console.log(`✅ External API test successful: ${employees.length} employees`);
        
        res.status(200).json({
            success: true,
            message: 'External API test successful',
            employeeCount: employees.length,
            sampleData: employees.slice(0, 2) // Return first 2 employees as sample
        });
        
    } catch (error) {
        console.error('❌ External API test failed:', error.message);
        console.error('❌ Error details:', {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            url: error?.config?.url
        });
        
        res.status(500).json({
            success: false,
            message: 'External API test failed',
            error: error.message,
            details: {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                url: error?.config?.url
            }
        });
    }
});

export default router;
import Employee from '../model/Employee.js';
import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - employeeId
 *         - firstName
 *         - lastName
 *         - email
 *         - phoneNumber
 *         - department
 *         - designation
 *         - dateOfJoining
 *         - salary
 *       properties:
 *         employeeId:
 *           type: string
 *           description: Unique employee ID
 *         firstName:
 *           type: string
 *           description: Employee's first name
 *         lastName:
 *           type: string
 *           description: Employee's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Employee's email address
 *         phoneNumber:
 *           type: string
 *           description: Employee's phone number
 *         department:
 *           type: string
 *           description: Employee's department
 *         designation:
 *           type: string
 *           description: Employee's job designation
 *         dateOfJoining:
 *           type: string
 *           format: date
 *           description: Date when employee joined
 *         salary:
 *           type: number
 *           description: Employee's salary
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         emergencyContact:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             relationship:
 *               type: string
 *             phoneNumber:
 *               type: string
 *         status:
 *           type: string
 *           enum: [Active, Inactive, Terminated]
 *         manager:
 *           type: string
 *           description: Manager's employee ID
 */

/**
 * @swagger
 * /api/employee:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Bad request - validation error
 *       409:
 *         description: Conflict - employee already exists
 *       500:
 *         description: Internal server error
 */
export const createEmployee = async (req, res) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phoneNumber,
            department,
            designation,
            dateOfJoining,
            salary,
            address,
            emergencyContact,
            status,
            manager
        } = req.body;

        // Validate required fields
        if (!employeeId || !firstName || !lastName || !email || !phoneNumber || 
            !department || !designation || !dateOfJoining || !salary) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided',
                requiredFields: ['employeeId', 'firstName', 'lastName', 'email', 'phoneNumber', 'department', 'designation', 'dateOfJoining', 'salary']
            });
        }

        // Check if employee already exists
        const existingEmployee = await Employee.findOne({
            $or: [
                { employeeId: employeeId },
                { email: email }
            ]
        });

        if (existingEmployee) {
            return res.status(409).json({
                success: false,
                message: 'Employee with this ID or email already exists'
            });
        }

        // Create new employee
        const newEmployee = new Employee({
            employeeId,
            firstName,
            lastName,
            email,
            phoneNumber,
            department,
            designation,
            dateOfJoining: new Date(dateOfJoining),
            salary,
            address: address || {},
            emergencyContact: emergencyContact || {},
            status: status || 'Active',
            manager: manager && mongoose.isValidObjectId(manager) ? manager : undefined
        });

        // Save employee to database
        const savedEmployee = await newEmployee.save();

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: savedEmployee
        });

    } catch (error) {
        console.error('Error creating employee:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                success: false,
                message: `Employee with this ${field} already exists`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/employee:
 *   get:
 *     summary: Get all employees
 *     tags: [Employee]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of employees per page
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Terminated]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *       500:
 *         description: Internal server error
 */
export const getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.department) {
            filter.department = new RegExp(req.query.department, 'i');
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Get employees with pagination
        const employees = await Employee.find(filter)
            .populate('manager', 'firstName lastName employeeId')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Get total count for pagination
        const totalEmployees = await Employee.countDocuments(filter);
        const totalPages = Math.ceil(totalEmployees / limit);

        res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            data: employees,
            pagination: {
                currentPage: page,
                totalPages,
                totalEmployees,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find by employeeId first, then by MongoDB _id
        let employee;
        if (mongoose.isValidObjectId(id)) {
            employee = await Employee.findById(id).populate('manager', 'firstName lastName employeeId');
        }
        
        if (!employee) {
            employee = await Employee.findOne({ employeeId: id }).populate('manager', 'firstName lastName employeeId');
        }

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee retrieved successfully',
            data: employee
        });

    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/employee/{id}:
 *   put:
 *     summary: Update employee by ID
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated directly
        delete updateData._id;
        delete updateData.createdAt;
        
        // Set updatedAt to current time
        updateData.updatedAt = new Date();

        // Try to find and update by employeeId first, then by MongoDB _id
        let employee;
        if (mongoose.isValidObjectId(id)) {
            employee = await Employee.findByIdAndUpdate(id, updateData, { 
                new: true, 
                runValidators: true 
            }).populate('manager', 'firstName lastName employeeId');
        }
        
        if (!employee) {
            employee = await Employee.findOneAndUpdate(
                { employeeId: id }, 
                updateData, 
                { new: true, runValidators: true }
            ).populate('manager', 'firstName lastName employeeId');
        }

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });

    } catch (error) {
        console.error('Error updating employee:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                success: false,
                message: `Employee with this ${field} already exists`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/employee/{id}:
 *   delete:
 *     summary: Delete employee by ID
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID or MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find and delete by employeeId first, then by MongoDB _id
        let employee;
        if (mongoose.isValidObjectId(id)) {
            employee = await Employee.findByIdAndDelete(id);
        }
        
        if (!employee) {
            employee = await Employee.findOneAndDelete({ employeeId: id });
        }

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            data: employee
        });

    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Admin from '../model/Admin.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import mongoose from 'mongoose';
import axios from 'axios';

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

// New function for employee management with training details
export const getAllEmployeesWithTrainingDetails = async (req, res) => {
    try {
        console.log('🔍 Fetching all employees with training details...');
        
        // Get admin's allowed branches
        const AdminId = req.admin.userId;
        const AdminBranch = await Admin.findById(AdminId).populate('branches');
        const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);
        
        console.log('📊 Admin allowed branches:', allowedLocCodes);
        
        // Fetch external employee data
        let externalEmployees = [];
        try {
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: 'EMP1',
                endEmpId: 'EMP9999'
            }, { timeout: 15000 });
            
            externalEmployees = response.data?.data || [];
            console.log(`📊 Fetched ${externalEmployees.length} external employees`);
        } catch (error) {
            console.error('Error fetching external employee data:', error.message);
        }
        
        // Create mapping from store names to location codes
        const storeNameToLocCode = {
            'GROOMS TRIVANDRUM': '5',
            'GROOMS PALAKKAD': '19',
            'GROOMS EDAPALLY': '3',
            'GROOMS KOTTAYAM': '9',
            'GROOMS PERUMBAVOOR': '10',
            'GROOMS THRISSUR': '11',
            'GROOMS CHAVAKKAD': '12',
            'GROOMS EDAPPAL': '15',
            'GROOMS VATAKARA': '14',
            'GROOMS PERINTHALMANNA': '16',
            'GROOMS MANJERY': '18',
            'GROOMS KOTTAKKAL': '17',
            'GROOMS KOZHIKODE': '13',
            'GROOMS CALICUT': '13',
            'GROOMS KANNUR': '21',
            'GROOMS KALPETTA': '20',
            'ZORUCCI EDAPPAL': '6',
            'ZORUCCI KOTTAKKAL': '8',
            'ZORUCCI PERINTHALMANNA': '7',
            'ZORUCCI EDAPPALLY': '1',
            'SUITOR GUY TRIVANDRUM': '5',
            'SUITOR GUY PALAKKAD': '19',
            'SUITOR GUY EDAPPALLY': '3',
            'SUITOR GUY KOTTAYAM': '9',
            'SUITOR GUY PERUMBAVOOR': '10',
            'SUITOR GUY THRISSUR': '11',
            'SUITOR GUY CHAVAKKAD': '12',
            'SUITOR GUY EDAPPAL': '15',
            'SUITOR GUY VATAKARA': '14',
            'SUITOR GUY PERINTHALMANNA': '16',
            'SUITOR GUY MANJERI': '18',
            'SUITOR GUY KOTTAKKAL': '17',
            'SUITOR GUY CALICUT': '13',
            'SUITOR GUY KALPETTA': '20',
            'SUITOR GUY KANNUR': '21'
        };
        
        // Filter external employees by allowed location codes
        const filteredExternalEmployees = externalEmployees.filter(emp => {
            const storeName = emp?.store_name?.toUpperCase();
            
            // Always include employees with "No Store" - they should be visible to all admins
            if (storeName === 'NO STORE' || storeName === 'NO STORE' || !storeName || storeName === '') {
                return true;
            }
            
            const mappedLocCode = storeNameToLocCode[storeName];
            
            if (mappedLocCode && allowedLocCodes.includes(mappedLocCode)) {
                return true;
            }
            
            const empLocCode = emp?.store_code || emp?.locCode;
            return allowedLocCodes.includes(empLocCode);
        });
        
        console.log(`✅ Filtered external employees: ${filteredExternalEmployees.length}`);
        
        // Get local users in allowed branches + "No Store" employees
        const localUsers = await User.find({ 
            $or: [
                { locCode: { $in: allowedLocCodes } },
                { workingBranch: 'No Store' },
                { workingBranch: 'NO STORE' },
                { workingBranch: 'no store' },
                { workingBranch: '' },
                { workingBranch: { $exists: false } }
            ]
        });
        console.log(`👥 Local users in allowed branches: ${localUsers.length}`);
        
        // Create a map of local users by empID for quick lookup
        const localUserMap = new Map();
        localUsers.forEach(user => {
            localUserMap.set(user.empID, user);
        });
        
        // Process all employees (external + local)
        const allEmployees = [...filteredExternalEmployees];
        
        // Add local users that might not be in external data
        localUsers.forEach(localUser => {
            const existsInExternal = filteredExternalEmployees.some(ext => ext.emp_code === localUser.empID);
            if (!existsInExternal) {
                allEmployees.push({
                    emp_code: localUser.empID,
                    name: localUser.username,
                    role_name: localUser.designation,
                    store_name: localUser.workingBranch,
                    email: localUser.email,
                    phone: localUser.phoneNumber,
                    __isLocal: true
                });
            }
        });
        
        // Pre-fetch all training progress records to avoid N+1 queries
        const allUserIds = Array.from(localUserMap.values()).map(user => user._id);
        const allTrainingProgress = await TrainingProgress.find({ 
            userId: { $in: allUserIds } 
        });
        
        // Create a map of userId -> training progress records
        const trainingProgressMap = new Map();
        allTrainingProgress.forEach(progress => {
            const userId = progress.userId.toString();
            if (!trainingProgressMap.has(userId)) {
                trainingProgressMap.set(userId, []);
            }
            trainingProgressMap.get(userId).push(progress);
        });
        
        console.log(`📊 Pre-fetched ${allTrainingProgress.length} training progress records for ${allUserIds.length} users`);
        
        // Process each employee to add training/assessment details
        const processedEmployees = await Promise.all(allEmployees.map(async (employee) => {
            const empID = employee.emp_code;
            const localUser = localUserMap.get(empID);
            
            let trainingCount = 0;
            let passCountTraining = 0;
            let trainingDue = 0;
            let assignedAssessmentsCount = 0;
            let passCountAssessment = 0;
            let assessmentDue = 0;
            let trainingCompletionPercentage = 0;
            let assessmentCompletionPercentage = 0;
            
            if (localUser) {
                // Count both assigned trainings (user.training) and mandatory trainings (TrainingProgress)
                // But avoid double-counting duplicates
                let assignedTrainingCount = 0;
                let assignedPassCount = 0;
                let assignedOverdueCount = 0;
                
                let mandatoryTrainingCount = 0;
                let mandatoryPassCount = 0;
                let mandatoryOverdueCount = 0;
                
                // Count assigned trainings from user.training array
                if (localUser.training && Array.isArray(localUser.training)) {
                    assignedTrainingCount = localUser.training.length;
                    assignedPassCount = localUser.training.filter(t => t.pass).length;
                    
                    // Calculate overdue assigned trainings
                    const today = new Date();
                    assignedOverdueCount = localUser.training.filter(t => 
                        new Date(t.deadline) < today && !t.pass
                    ).length;
                }
                
                // Count mandatory trainings from TrainingProgress collection
                const userTrainingProgress = trainingProgressMap.get(localUser._id.toString()) || [];
                
                // Get assigned training IDs to avoid duplicates
                const assignedTrainingIds = localUser.training ? 
                    localUser.training.map(t => t.trainingId.toString()) : [];
                
                // Filter out mandatory trainings that are already in assigned trainings
                const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => 
                    !assignedTrainingIds.includes(tp.trainingId.toString())
                );
                
                mandatoryTrainingCount = uniqueMandatoryTrainings.length;
                mandatoryPassCount = uniqueMandatoryTrainings.filter(tp => tp.pass).length;
                
                // Calculate overdue mandatory trainings (only unique ones)
                const today = new Date();
                mandatoryOverdueCount = uniqueMandatoryTrainings.filter(tp => 
                    new Date(tp.deadline) < today && !tp.pass
                ).length;
                
                // Combine both types of trainings (no duplicates)
                trainingCount = assignedTrainingCount + mandatoryTrainingCount;
                passCountTraining = assignedPassCount + mandatoryPassCount;
                trainingDue = assignedOverdueCount + mandatoryOverdueCount;
                
                trainingCompletionPercentage = trainingCount > 0 ? 
                    Math.round((passCountTraining / trainingCount) * 100) : 0;
                
                // Debug logging for employees with training data
                if (trainingCount > 0) {
                    console.log(`📈 Employee ${empID} (${localUser.username}): ${trainingCount} unique trainings (${assignedTrainingCount} assigned + ${mandatoryTrainingCount} mandatory), ${passCountTraining} passed (${trainingCompletionPercentage}%)`);
                }
                
                // Calculate assessment data from user.assignedAssessments records
                if (localUser.assignedAssessments && Array.isArray(localUser.assignedAssessments)) {
                    assignedAssessmentsCount = localUser.assignedAssessments.length;
                    passCountAssessment = localUser.assignedAssessments.filter(a => a.pass).length;
                    
                    // Calculate overdue assessments
                    const today = new Date();
                    assessmentDue = localUser.assignedAssessments.filter(a => 
                        new Date(a.deadline) < today && !a.pass
                    ).length;
                    
                    assessmentCompletionPercentage = assignedAssessmentsCount > 0 ? 
                        Math.round((passCountAssessment / assignedAssessmentsCount) * 100) : 0;
                }
            }
            
            return {
                empID: empID,
                username: employee.name || '',
                designation: employee.role_name || '',
                workingBranch: employee.store_name || '',
                email: employee.email || '',
                phoneNumber: employee.phone || '',
                // Training data
                trainingCount,
                passCountTraining,
                trainingDue,
                trainingCompletionPercentage,
                // Assessment data
                assignedAssessmentsCount,
                passCountAssessment,
                assessmentDue,
                assessmentCompletionPercentage,
                // Additional info
                isLocalUser: !!localUser,
                hasTrainingData: trainingCount > 0 || assignedAssessmentsCount > 0
            };
        }));
        
        const employeesWithTraining = processedEmployees.filter(emp => emp.hasTrainingData).length;
        const employeesWithMandatoryTraining = processedEmployees.filter(emp => emp.trainingCount > 0).length;
        
        console.log(`✅ Processed ${processedEmployees.length} employees with training details`);
        console.log(`📊 Employees with any training data: ${employeesWithTraining}`);
        console.log(`📊 Employees with mandatory/assigned trainings: ${employeesWithMandatoryTraining}`);
        
        res.status(200).json({
            success: true,
            message: "Employee data with training details fetched successfully",
            data: processedEmployees,
            totalCount: processedEmployees.length,
            employeesWithTraining: employeesWithTraining,
            employeesWithMandatoryTraining: employeesWithMandatoryTraining
        });
        
    } catch (error) {
        console.error('Error fetching employees with training details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
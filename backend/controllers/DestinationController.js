import Admin from "../model/Admin.js";
import Permission from "../model/AdminPermission.js";
import Branch from "../model/Branch.js";
import Designation from "../model/designation.js"; // Import the destination model
import User from "../model/User.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import bcrypt from 'bcrypt'
import axios from 'axios'; // Added axios import

export const createDesignation = async (req, res) => {
    try {
        // Validate input
        const { designation } = req.body;

        if (!designation || designation.trim() === "") {
            return res.status(400).json({ message: "Designation is required" });
        }


        // Check for duplicates explicitly
        const existingDesignation = await Designation.findOne({ designation });
        if (existingDesignation) {
            return res.status(400).json({ message: "Designation already exists" });
        }

        // Create and save the new designation
        const newDesignation = new Designation({ designation });
        const savedDesignation = await newDesignation.save();
        return res.status(201).json({
            message: "Designation created successfully",
            data: savedDesignation,
        });
    } catch (error) {
        console.error("Error creating designation:", error);
        return res.status(500).json({
            message: "Error creating designation",
            error: error.message,
        });
    }
};
export const getAllDesignation = async (req, res) => {
    try {
        // Fetch all destinations from the database
        const designation = await Designation.find();

        // Check if there are any destinations
        if (designation.length === 0) {
            return res.status(404).json({ message: "No destinations found" });
        }

        // Return the list of destinations
        return res.status(200).json({
            message: "Destinations fetched successfully",
            data: designation,
        });
    } catch (error) {
        console.error("Error fetching destinations:", error);
        return res.status(500).json({
            message: "Error fetching destinations",
            error: error.message,
        });
    }
};


//Homebar

export const HomeBar = async (req, res) => {
    try {
        const Admin1 = req.admin.userId;

        const AdminData = await Admin.findById(Admin1).populate('branches');
        const allowedLocCodes = AdminData.branches.map(branch => branch.locCode);

        // Fetch all branches and users
        const branches = await Branch.find({ _id: { $in: AdminData.branches } });
        const users = await User.find({ locCode: { $in: allowedLocCodes } });
        
        // Fetch mandatory training data for all users
        const userIds = users.map(user => user._id);
        const mandatoryTrainings = await TrainingProgress.find({ 
            userId: { $in: userIds } 
        }).populate('trainingId');

        // Fetch external employee data
        let externalEmployees = [];
        try {
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: 'EMP1',
                endEmpId: 'EMP9999'
            }, { timeout: 15000 });
            
            externalEmployees = response.data?.data || [];
            console.log(`Fetched ${externalEmployees.length} external employees for HomeBar`);
            
            // Filter external employees by allowed location codes
            const filteredExternalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                
                // Exclude employees with "No Store" - they should not be visible to anyone
                if (storeName === 'NO STORE' || !storeName || storeName === '') {
                    return false;
                }
                
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            });
            
            console.log(`Filtered external employees for allowed locations: ${filteredExternalEmployees.length}`);
        } catch (error) {
            console.error('Error fetching external employee data for HomeBar:', error.message);
        }

        // Create a map of locCode to users for quick lookup
        const userMap = new Map();
        for (const user of users) {
            if (!userMap.has(user.locCode)) {
                userMap.set(user.locCode, []);
            }
            userMap.get(user.locCode).push(user);
        }
        
        // Create a map of userId to mandatory trainings for quick lookup
        const mandatoryTrainingMap = new Map();
        for (const training of mandatoryTrainings) {
            if (!mandatoryTrainingMap.has(training.userId.toString())) {
                mandatoryTrainingMap.set(training.userId.toString(), []);
            }
            mandatoryTrainingMap.get(training.userId.toString()).push(training);
        }

        // Create a map of locCode to external employees for quick lookup
        const externalUserMap = new Map();
        for (const emp of externalEmployees) {
            const empLocCode = emp?.store_code || emp?.locCode;
            if (allowedLocCodes.includes(empLocCode)) {
                if (!externalUserMap.has(empLocCode)) {
                    externalUserMap.set(empLocCode, []);
                }
                externalUserMap.get(empLocCode).push(emp);
            }
        }

        const allData = branches.map((branch) => {
            const branchUsers = userMap.get(branch.locCode) || [];
            const branchExternalUsers = externalUserMap.get(branch.locCode) || [];
            
            let trainingCount = 0;
            let trainingCountPending = 0;
            let assessmentCount = 0;
            let assessmentCountPending = 0;

            // Calculate counts for the branch (local users only for now)
            branchUsers.forEach((user) => {
                // Assigned training data
                const assignedTrainings = user.training || [];
                trainingCount += assignedTrainings.length;
                trainingCountPending += assignedTrainings.filter((item) => item.pass === false).length;
                
                // Mandatory training data
                const userMandatoryTrainings = mandatoryTrainingMap.get(user._id.toString()) || [];
                trainingCount += userMandatoryTrainings.length;
                trainingCountPending += userMandatoryTrainings.filter((item) => item.pass === false).length;
                
                // Assessment data
                assessmentCount += user.assignedAssessments.length;
                assessmentCountPending += user.assignedAssessments.filter((item) => item.pass === false).length;
            });

            // For external employees, we don't have training/assessment data yet
            // So we'll show 0 for now, but include the count for reference
            const totalEmployeesInBranch = branchUsers.length + branchExternalUsers.length;

            return {
                totalTraining: trainingCount,
                totalAssessment: assessmentCount,
                pendingTraining: (trainingCountPending / trainingCount) * 100 || 0,
                completeTraining: ((trainingCount - trainingCountPending) / trainingCount) * 100 || 0,
                pendingAssessment: (assessmentCountPending / assessmentCount) * 100 || 0,
                completeAssessment: ((assessmentCount - assessmentCountPending) / assessmentCount) * 100 || 0,
                locCode: branch.locCode,
                branchName: branch.workingBranch,
                totalEmployees: totalEmployeesInBranch,
                localEmployees: branchUsers.length,
                externalEmployees: branchExternalUsers.length
            };
        });

        return res.status(200).json({
            message: "Data fetched for progress",
            data: allData,
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({
            message: "Error fetching data",
            error: error.message,
        });
    }
};


// Adjust the import path as needed

export const getTopUsers = async (req, res) => {
    try {
        const AdminId = req.admin.userId
        const AdminBranch = await Admin.findById(AdminId).populate('branches')
        // Fetch users with populated training, assessments, and modules

        console.log(AdminBranch);
        const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);

        const users = await User.find({ locCode: { $in: allowedLocCodes } })

            .populate({
                path: 'training.trainingId',
            })
            .populate({
                path: 'assignedAssessments.assessmentId',
            })
            .populate({
                path: 'assignedModules.moduleId',
            });

        // Fetch mandatory training data for all users
        const userIds = users.map(user => user._id);
        const mandatoryTrainings = await TrainingProgress.find({ 
            userId: { $in: userIds } 
        }).populate('trainingId');
        
        // Create a map of userId to mandatory trainings for quick lookup
        const mandatoryTrainingMap = new Map();
        for (const training of mandatoryTrainings) {
            if (!mandatoryTrainingMap.has(training.userId.toString())) {
                mandatoryTrainingMap.set(training.userId.toString(), []);
            }
            mandatoryTrainingMap.get(training.userId.toString()).push(training);
        }

        // Fetch external employee data
        let externalEmployees = [];
        try {
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: 'EMP1',
                endEmpId: 'EMP9999'
            }, { timeout: 15000 });
            
            externalEmployees = response.data?.data || [];
            console.log(`Fetched ${externalEmployees.length} external employees for getTopUsers`);
            
            // Always exclude "No Store" employees for all admins
            externalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                return !(storeName === 'NO STORE' || !storeName || storeName === '');
            });
            
            // Filter external employees by allowed location codes
            const filteredExternalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                
                // Exclude employees with "No Store" - they should not be visible to anyone
                if (storeName === 'NO STORE' || !storeName || storeName === '') {
                    return false;
                }
                
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            });
            
            console.log(`Filtered external employees for allowed locations: ${filteredExternalEmployees.length}`);
        } catch (error) {
            console.error('Error fetching external employee data for getTopUsers:', error.message);
        }

        // Branch name mapping - map user workingBranch to actual branch names
        const branchNameMapping = {
            // SUITOR GUY branches → GROOMS branches
            "SUITOR GUY KOTTAYAM": "GROOMS Kottayam",
            "SUITOR GUY THRISSUR": "GROOMS Thrissur", 
            "SUITOR GUY EDAPPALLY": "GROOMS Edapally",
            "SUITOR GUY PERUMBAVOOR": "GROOMS Perumbavoor",
            "SUITOR GUY CHAVAKKAD": "GROOMS Chavakkad",
            "SUITOR GUY PALAKKAD": "GROOMS Palakkad",
            "SUITOR GUY KOTTAKKAL": "GROOMS Kottakkal",
            "SUITOR GUY EDAPPAL": "GROOMS Edappal",
            "SUITOR GUY MANJERI": "GROOMS Manjery",
            "SUITOR GUY VATAKARA": "GROOMS Vatakara",
            "SUITOR GUY KALPETTA": "GROOMS Kalpetta",
            "SUITOR GUY CALICUT": "GROOMS Kozhikode",
            "SUITOR GUY KANNUR": "GROOMS Kannur",
            "SUITOR GUY PERINTHALMANNA": "GROOMS Perinthalmanna",
            "SUITOR GUY TRIVANDRUM": "GROOMS Trivandrum",
            
            // ZORUCCI branches
            "ZORUCCI EDAPPALLY": "Zorucci Edappally",
            "ZORUCCI EDAPPAL": "Zorucci Edappal", 
            "ZORUCCI PERINTHALMANNA": "Zorucci Perinthalmanna",
            "ZORUCCI KOTTAKKAL": "Zorucci Kottakkal",
        };

        // Calculate progress for each user
        const scores = users.map((user) => {
            // Assigned training progress calculation
            const assignedTrainings = user.training || [];
            const completedAssignedTrainings = assignedTrainings.filter(t => t.pass).length;
            const totalAssignedTrainings = assignedTrainings.length;
            
            // Mandatory training progress calculation
            const userMandatoryTrainings = mandatoryTrainingMap.get(user._id.toString()) || [];
            const completedMandatoryTrainings = userMandatoryTrainings.filter(t => t.pass).length;
            const totalMandatoryTrainings = userMandatoryTrainings.length;
            
            // Combined training progress
            const completedTrainings = completedAssignedTrainings + completedMandatoryTrainings;
            const totalTrainings = totalAssignedTrainings + totalMandatoryTrainings;
            const trainingProgress = totalTrainings > 0 ? (completedTrainings / totalTrainings) * 100 : 0;

            // Assessment progress calculation (using `pass` and `complete`)
            const completedAssessments = user.assignedAssessments.filter(a => a.pass).length;
            const totalAssessments = user.assignedAssessments.length;
            const assessmentCompletion = user.assignedAssessments.reduce((sum, a) => sum + (a.complete || 0), 0);
            const assessmentProgress = totalAssessments > 0 ? (assessmentCompletion / totalAssessments) : 0;

            // Module progress calculation (optional if you want to include modules)
            const completedModules = user.assignedModules.filter(m => m.pass).length;
            const totalModules = user.assignedModules.length;
            const moduleProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

            // Total score based on training, assessments, and modules
            const totalScore = completedTrainings + completedAssessments + completedModules;

            // Map workingBranch to correct branch name
            const mappedBranchName = branchNameMapping[user.workingBranch] || user.workingBranch;
            
            return {
                username: user.username,
                email: user.email,
                branch: mappedBranchName,
                role: user.designation,
                completedTrainings,
                totalTrainings,
                trainingProgress,
                completedAssignedTrainings,
                totalAssignedTrainings,
                completedMandatoryTrainings,
                totalMandatoryTrainings,
                completedAssessments,
                totalAssessments,
                assessmentProgress,
                completedModules,
                totalModules,
                moduleProgress,
                totalScore,
                isExternal: false, // Mark as local user
            };
        });

        // Add external employees with 0 progress (since they don't have training/assessment data yet)
        const externalEmployeeScores = externalEmployees
            .filter(emp => {
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            })
            .map(emp => {
                // Map external employee store_name to correct branch name
                const mappedBranchName = branchNameMapping[emp?.store_name] || emp?.store_name || 'Unknown Branch';
                
                return {
                    username: emp?.name || 'Unknown',
                    email: emp?.email || '',
                    branch: mappedBranchName,
                    role: emp?.role_name || 'Unknown Role',
                    completedTrainings: 0,
                    totalTrainings: 0,
                    trainingProgress: 0,
                    completedAssessments: 0,
                    totalAssessments: 0,
                    assessmentProgress: 0,
                    completedModules: 0,
                    totalModules: 0,
                    moduleProgress: 0,
                    totalScore: 0,
                    isExternal: true, // Mark as external user
                };
            });

        // Combine local and external users
        const allScores = [...scores, ...externalEmployeeScores];

        // Sort users by total score
        const sortedScores = allScores.sort((a, b) => b.totalScore - a.totalScore);

        // Get top 3 users
        const topUsers = sortedScores.slice(0, 3);

        // Get last 3 users (sorted by ascending score)
        const lastUsers = sortedScores.slice(-3);

        // Use the same calculation logic as HomeBar for consistency
        const branches = await Branch.find({ _id: { $in: AdminBranch.branches } });
        
        // Create a map of locCode to users for quick lookup
        const userMap = new Map();
        for (const user of users) {
            if (!userMap.has(user.locCode)) {
                userMap.set(user.locCode, []);
            }
            userMap.get(user.locCode).push(user);
        }

        // Create a map of locCode to external employees
        const externalEmployeeMap = new Map();
        for (const emp of externalEmployees) {
            const empLocCode = emp?.store_code || emp?.locCode;
            if (allowedLocCodes.includes(empLocCode)) {
                if (!externalEmployeeMap.has(empLocCode)) {
                    externalEmployeeMap.set(empLocCode, []);
                }
                externalEmployeeMap.get(empLocCode).push(emp);
            }
        }

        // Calculate branch scores using the exact same logic as HomeBar
        const branchScores = {};
        
        for (const branch of branches) {
            const branchUsers = userMap.get(branch.locCode) || [];
            const branchExternalUsers = externalEmployeeMap.get(branch.locCode) || [];
            
            let trainingCount = 0;
            let trainingCountPending = 0;
            let assessmentCount = 0;
            let assessmentCountPending = 0;

            // Calculate counts for the branch (local users only for now) - EXACT same as HomeBar
            branchUsers.forEach((user) => {
                // Assigned training data
                const assignedTrainings = user.training || [];
                trainingCount += assignedTrainings.length;
                trainingCountPending += assignedTrainings.filter((item) => item.pass === false).length;
                
                // Mandatory training data - use the same map as HomeBar
                const userMandatoryTrainings = mandatoryTrainingMap.get(user._id.toString()) || [];
                trainingCount += userMandatoryTrainings.length;
                trainingCountPending += userMandatoryTrainings.filter((item) => item.pass === false).length;
                
                // Assessment data
                assessmentCount += user.assignedAssessments.length;
                assessmentCountPending += user.assignedAssessments.filter((item) => item.pass === false).length;
            });

            // Calculate percentages (EXACT same as HomeBar)
            const averageTrainingProgress = trainingCount > 0 ? ((trainingCount - trainingCountPending) / trainingCount) * 100 : 0;
            const averageAssessmentProgress = assessmentCount > 0 ? ((assessmentCount - assessmentCountPending) / assessmentCount) * 100 : 0;
            
            // Map branch name using the same mapping
            const mappedBranchName = branchNameMapping[branch.workingBranch] || branch.workingBranch;
            
            branchScores[mappedBranchName] = {
                branch: mappedBranchName,
                totalScore: (trainingCount - trainingCountPending) + (assessmentCount - assessmentCountPending),
                userCount: branchUsers.length + branchExternalUsers.length,
                externalUserCount: branchExternalUsers.length,
                localUserCount: branchUsers.length,
                averageTrainingProgress: averageTrainingProgress,
                averageAssessmentProgress: averageAssessmentProgress,
                averageModuleProgress: 0, // Not used in HomeBar
            };
        }

        // Convert branchScores to array and sort by training completion percentage
        const sortedBranches = Object.values(branchScores)
            .sort((a, b) => b.averageTrainingProgress - a.averageTrainingProgress);

        // Get top 3 branches
        const topBranches = sortedBranches.slice(0, 3);

        // Get last 3 branches (sorted by ascending training completion percentage)
        const lastBranches = sortedBranches.slice(-3);

        console.log('All branches:', sortedBranches);
        console.log('Top branches:', topBranches);
        console.log('Last branches:', lastBranches);

        // Return response with top and last users and branches
        return res.status(200).json({
            data: {
                topUsers,
                lastUsers,
                topBranches,
                lastBranches,
                summary: {
                    totalLocalUsers: users.length,
                    totalExternalUsers: externalEmployees.filter(emp => {
                        const empLocCode = emp?.store_code || emp?.locCode;
                        return allowedLocCodes.includes(empLocCode);
                    }).length,
                    totalUsers: allScores.length,
                    allowedLocCodes: allowedLocCodes
                }
            },
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: 'Error fetching users' });
    }
};



; // Adjust path to the branch model


export const CreatingAdminUsers = async (req, res) => {
    try {
        const { userName: name, email, userId: EmpId, userRole: role, Branch: branches, password
        } = req.body;
        let { subRole } = req.body
        console.log(name, email, EmpId, role, branches, subRole);
        if (role !== 'super_admin') {
            subRole = "NR"
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // Validate required fields
        if (!name || !email || !EmpId || !role) {
            return res.status(400).json({
                message: "All required fields (name, email, EmpId, role) must be provided.",
            });
        }

        // Check if role is valid
        const validRoles = ['super_admin', 'cluster_admin', 'store_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role provided. Valid roles are: super_admin, cluster_admin, store_admin.",
            });
        }

        // Fetch permissions for the role from the Permission collection
        const rolePermissions = await Permission.findOne({ role });
        if (!rolePermissions) {
            return res.status(400).json({
                message: `Permissions not found for the role: ${role}`,
            });
        }
        console.log('Role permissions:', rolePermissions._id);

        // Determine branches for the admin
        let finalBranches = [];
        if (role === 'super_admin') {
            const allBranches = await Branch.find();
            if (allBranches.length === 0) {
                return res.status(404).json({
                    message: "No branches found to assign to the super admin.",
                });
            }
            finalBranches = allBranches.map((branch) => branch._id);
        } else {
            if (!branches || branches.length === 0) {
                return res.status(400).json({
                    message: `Branches must be provided for the role: ${role}.`,
                });
            }
            finalBranches = branches;
        }

        // Create the admin user with the fetched permissions
        const newAdmin = new Admin({
            name,
            email,
            EmpId,
            subRole,
            password: hashedPassword,
            role,
            permissions: rolePermissions._id, // Assuming permissions are stored as an ObjectId
            branches: finalBranches,
        });

        // Save the admin user
        const savedAdmin = await newAdmin.save();

        // Respond with success
        res.status(201).json({
            message: "Admin user created successfully.",
            data: {
                id: savedAdmin._id,
                name: savedAdmin.name,
                email: savedAdmin.email,
                EmpId: savedAdmin.EmpId,
                role: savedAdmin.role,
                permissions: savedAdmin.permissions,
                branches: savedAdmin.branches,
            },
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({
            message: "An error occurred while creating the admin user.",
            error: error.message,
        });
    }
};


const upsertPermissions = async (role, permissions) => {
    try {
        // Check if the role already exists
        const existingRole = await Permission.findOne({ role });

        if (existingRole) {
            // If the role exists, update the permissions
            existingRole.permissions = { ...existingRole.permissions, ...permissions };
            await existingRole.save();
            console.log(`${role} permissions updated successfully.`);
        } else {
            // If the role doesn't exist, create a new permission document for the role
            const newPermission = new Permission({
                role,
                permissions,
            });
            await newPermission.save();
            console.log(`${role} permissions added successfully.`);
        }
    } catch (error) {
        console.error('Error adding or updating permissions:', error);
    }
};

// Express route or function
export const handlePermissions = async (req, res) => {
    try {
        const { permissionsArray } = req.body; // Make sure to send the array in the body of the request
        if (!permissionsArray || !Array.isArray(permissionsArray)) {
            return res.status(400).json({ message: 'Permissions array is required' });
        }

        for (const item of permissionsArray) {
            await upsertPermissions(item.role, item.permissions);
        }

        return res.status(200).json({ message: 'Permissions processed successfully' });
    } catch (error) {
        console.error('Error processing permissions:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

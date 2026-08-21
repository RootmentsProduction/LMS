import Admin from '../model/Admin.js';
import AssessmentProcess from '../model/Assessmentprocessschema.js';
import Module from '../model/Module.js'
import Notification from '../model/Notification.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import User from '../model/User.js';
import Employee from '../model/Employee.js';
import Visibility from '../model/Visibility.js';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Subrole from '../model/Subrole.js';
import EscalationLevel from '../model/EscalationLevel.js';

export const createModule = async (req, res) => {
    try {
        const moduleData = req.body;
        moduleData.createdBy = moduleData.createdBy || 'Super Admin';

        const isValidQuestion = (question) => {
            const options = Array.isArray(question?.options) ? question.options : [];
            const trimmedOptions = options.map((option) => String(option || '').trim());
            const questionText = String(question?.questionText || '').trim();
            const correctAnswer = String(question?.correctAnswer || '').trim();
            const filledOptions = trimmedOptions.filter(Boolean);

            return Boolean(
                questionText &&
                filledOptions.length >= 2 &&
                correctAnswer &&
                filledOptions.includes(correctAnswer)
            );
        };

        // Validation for the required fields in videos
        if (!moduleData.moduleName || !moduleData.videos || !Array.isArray(moduleData.videos)) {
            return res.status(400).json({ message: "Invalid module data. Ensure all required fields are present." });
        }

        // Validate each video and handle questions
        for (let videoIndex = 0; videoIndex < moduleData.videos.length; videoIndex++) {
            const video = moduleData.videos[videoIndex];

            // Check for required fields in video
            if (!video.title || !video.videoUri) {
                return res.status(400).json({
                    message: `Missing required fields in video ${videoIndex + 1}: title or videoUri is missing.`
                });
            }

            // If no questions array, set it to an empty array
            if (!video.questions || !Array.isArray(video.questions)) {
                video.questions = [];
            }

            const invalidQuestionIndex = video.questions.findIndex((question) => !isValidQuestion(question));
            if (invalidQuestionIndex !== -1) {
                return res.status(400).json({
                    message: `Incomplete quiz found in video ${videoIndex + 1}. Please fill question text, add at least two options, and select a correct answer before saving.`,
                });
            }
        }

        // Save the module
        const newModule = new Module(moduleData);
        await newModule.save();

        res.status(201).json({ message: "Module created successfully!", module: newModule });
    } catch (error) {
        console.error("Error creating module:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "An error occurred while creating the module.", error: error.message });
        }
    }
};

export const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const moduleData = req.body;

        const isValidQuestion = (question) => {
            const options = Array.isArray(question?.options) ? question.options : [];
            const trimmedOptions = options.map((option) => String(option || '').trim());
            const questionText = String(question?.questionText || '').trim();
            const correctAnswer = String(question?.correctAnswer || '').trim();
            const filledOptions = trimmedOptions.filter(Boolean);

            return Boolean(
                questionText &&
                filledOptions.length >= 2 &&
                correctAnswer &&
                filledOptions.includes(correctAnswer)
            );
        };

        if (!moduleData.moduleName || !moduleData.videos || !Array.isArray(moduleData.videos)) {
            return res.status(400).json({ message: "Invalid module data. Ensure all required fields are present." });
        }

        for (let videoIndex = 0; videoIndex < moduleData.videos.length; videoIndex++) {
            const video = moduleData.videos[videoIndex];

            if (!video.title || !video.videoUri) {
                return res.status(400).json({
                    message: `Missing required fields in video ${videoIndex + 1}: title or videoUri is missing.`
                });
            }

            if (!video.questions || !Array.isArray(video.questions)) {
                video.questions = [];
            }

            const invalidQuestionIndex = video.questions.findIndex((question) => !isValidQuestion(question));
            if (invalidQuestionIndex !== -1) {
                return res.status(400).json({
                    message: `Incomplete quiz found in video ${videoIndex + 1}. Please fill question text, add at least two options, and select a correct answer before saving.`,
                });
            }
        }

        const updatedModule = await Module.findByIdAndUpdate(
            id,
            {
                ...moduleData,
                editedBy: moduleData.editedBy || moduleData.createdBy || 'Super Admin',
                editedAt: new Date(),
            },
            { new: true, runValidators: true }
        );

        if (!updatedModule) {
            return res.status(404).json({ message: 'Module not found' });
        }

        return res.status(200).json({
            message: 'Module updated successfully!',
            module: updatedModule,
        });
    } catch (error) {
        console.error("Error updating module:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "An error occurred while updating the module.", error: error.message });
        }
    }
};
export const getModules = async (req, res) => {
    try {
        const { id } = req.params; // Extract module ID if provided

        if (id) {
            // Fetch a specific module by ID
            const module = await Module.findById(id).populate('videos.questions');
            if (!module) {
                return res.status(404).json({ message: 'Module not found' });
            }
            return res.status(200).json(module);
        }

        // Fetch all modules
        const modules = await Module.find().populate('videos.questions');

        // Fetch training progress
        const trainingProgress = await TrainingProgress.find();

        // Calculate completion percentage only from users actually assigned this module.
        const moduleProgress = modules.map((module) => {
            const usersProgress = trainingProgress.flatMap((progress) => {
                const moduleProgress = progress.modules.find((m) => m.moduleId.toString() === module._id.toString());
                if (!moduleProgress) return [];

                const completedVideos = moduleProgress.videos.filter((v) => v.pass).length;
                const totalVideos = moduleProgress.videos.length;
                const percentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
                return [percentage];
            });

            const completedCount = usersProgress.filter((percentage) => percentage >= 100).length;
            const assignedCount = usersProgress.length;
            const overallPercentage =
                assignedCount > 0 ? usersProgress.reduce((acc, curr) => acc + curr, 0) / assignedCount : 0;

            // Include videos array
            return {
                moduleId: module._id,
                moduleName: module.moduleName,
                description: module.description,
                videos: module.videos, // Add videos here
                completedCount,
                assignedCount,
                totalCount: assignedCount,
                overallCompletionPercentage: Number(overallPercentage.toFixed(2)),
            };
        });

        return res.status(200).json(moduleProgress);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const GetAssessmentDetails = async (req, res) => {
    try {
        const { id } = req.params; // Extract assessment ID
        console.log(`Assessment ID: ${id}`);

        // Find all users assigned to the specified assessment
        const userdata = await User.find({ 'assignedAssessments.assessmentId': id })
            .select({
                _id: 1,
                username: 1,
                email: 1,
                empID: 1,
                workingBranch: 1, designation: 1,
                'assignedAssessments': { $elemMatch: { assessmentId: id } }, // Select only the matching assessment
            });


        // Extract user IDs from the userdata array
        const userIds = userdata.map(user => user._id);

        // Find assessment progress for the specified assessment and user IDs
        // Populate user details for better response

        console.log('User Data:', userdata);


        res.status(200).json({
            message: 'Assessment details fetched successfully',
            data: {
                users: userdata,

            },
        });
    } catch (error) {
        console.error('Error fetching assessment details:', error);
        res.status(500).json({
            message: 'Internal server error',
        });
    }
};
export const ChangeVisibility = async (req, res) => {
    try {
        const trainingData = req.body;
        console.log(trainingData);


        if (!Array.isArray(trainingData)) {
            return res.status(400).json({ message: "Invalid data format" });
        }

        console.log("Received Data:", trainingData); // Debugging log

        for (const section of trainingData) {
            const { section: sectionName, role } = section;

            for (const rol of role) {
                // Use upsert to update if the role exists or insert if it doesn't
                const updateQuery = {
                    [`${sectionName}.role`]: rol.role,
                };

                const updateData = {
                    $set: {
                        [`${sectionName}.$.visibility`]: rol.visibility,
                    },
                };

                // Push a new role if it doesn't exist
                const pushData = {
                    $push: {
                        [sectionName]: {
                            role: rol.role,
                            visibility: rol.visibility,
                        },
                    },
                };

                const result = await Visibility.findOneAndUpdate(
                    updateQuery,
                    updateData,
                    { new: true }
                );

                if (!result) {
                    // If no match is found, insert a new role
                    await Visibility.updateOne({}, pushData, { upsert: true });
                }
            }
        }

        res.status(200).json({ message: "Visibility settings updated successfully" });
    } catch (error) {
        console.error("Error updating visibility:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getVisibility = async (req, res) => {
    try {

        const data = await Visibility.find()
        res.status(200).json({ message: "Visibility settings updated successfully", Data: data });
    } catch (error) {
        console.error("Error updating visibility:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const AdminLogin = async (req, res) => {
    const { EmpId, email, role } = req.body;
    console.log('🔓 [LOGIN] Attempt:', { identifier: email, role: role || 'not specified' });

    try {
        // Validate required fields
        if (!email || !EmpId) {
            console.log('❌ [LOGIN] Missing required fields');
            return res.status(400).json({ message: 'Employee ID or email and password are required' });
        }

        const loginIdentifier = String(email).trim();

        // Find user by EmpId (Employee ID) first
        let user = await Admin.findOne({
            EmpId: { $regex: `^${loginIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        }).populate('branches');

        // Fallback to finding by email if not found
        if (!user) {
            user = await Admin.findOne({ email: loginIdentifier.toLowerCase() }).populate('branches');
        }
        
        if (!user) {
            console.log('❌ [LOGIN] Admin not found:', loginIdentifier);
            return res.status(400).json({ message: 'User not found' });
        }

        console.log('✅ [LOGIN] Admin found:', user.name);

        if (user.registrationStatus === 'pending' || user.isActive === false) {
            console.log('❌ [LOGIN] Admin registration pending approval');
            return res.status(403).json({ message: 'Your registration request is pending approval by Admin.' });
        }
        if (user.registrationStatus === 'declined') {
            console.log('❌ [LOGIN] Admin registration declined');
            return res.status(403).json({ message: 'Your registration request was declined by Admin.' });
        }

        // Verify role against database if role is provided
        if (role && user.role !== role) {
            console.log('❌ [LOGIN] Role mismatch - expected:', user.role, 'got:', role);
            return res.status(403).json({ message: `Role mismatch: Cannot log in as ${role}` });
        }

        // Designation restriction for Warehouse Admin
        const targetRole = role || user.role;
        if (targetRole === 'warehouse_admin') {
            const empDoc = await Employee.findOne({
                $or: [
                    { employeeId: { $regex: `^${user.EmpId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                    { email: user.email?.toLowerCase() }
                ]
            });
            const userDoc = await User.findOne({
                $or: [
                    { empID: { $regex: `^${user.EmpId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                    { email: user.email?.toLowerCase() }
                ]
            });

            const designation = String(empDoc?.designation || userDoc?.designation || '').trim().toLowerCase();
            const isWarehouseRole = user.role === 'warehouse_admin';
            const isWarehouseDesignation = designation.includes('warehouse');

            if (!isWarehouseRole && !isWarehouseDesignation) {
                console.log('❌ [LOGIN] Designation mismatch for warehouse_admin. Found designation:', designation || 'None');
                return res.status(403).json({
                    message: "Access denied: Only employees with designation 'Warehouse Admin' can log in as Warehouse Admin."
                });
            }

            // Sync userDoc / empDoc designation to 'Warehouse Admin' if needed
            if (userDoc && userDoc.designation !== 'Warehouse Admin') {
                userDoc.designation = 'Warehouse Admin';
                await userDoc.save().catch(() => {});
            }
            if (empDoc && empDoc.designation !== 'Warehouse Admin') {
                empDoc.designation = 'Warehouse Admin';
                await empDoc.save().catch(() => {});
            }
        }

        // Compare entered EmpId (as password) with the stored hashed password
        if (!user.password) {
            console.log('❌ [LOGIN] Password not set in database for:', email);
            return res.status(500).json({ message: 'User password is not set in the database.' });
        }

        const isPasswordValid = await bcrypt.compare(EmpId, user.password);

        if (!isPasswordValid) {
            console.log('❌ [LOGIN] Invalid password for:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('✅ [LOGIN] Password valid for:', email);

        // Create payload for the JWT
        const payload = {
            userId: user._id,
            username: user.name,
            role: user.role,
        };

        // Sign the JWT token with secret key
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        console.log('✅ [LOGIN] Token generated for:', email);

        // Send the token and user details in the response
        res.json({ token, user: { ...payload, branches: user.branches || [] } });
    } catch (err) {
        console.error('❌ [LOGIN] Server error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// Adjust the path according to your project structure

// Fetch first three notifications
export const getNotifications = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.admin.userId;
        const userRole = req.admin.role;

        let query = {};

        // If not a full access admin (super_admin or hr_admin), filter by scope
        if (userRole !== 'super_admin' && userRole !== 'admin' && userRole !== 'hr_admin') {
            const admin = await Admin.findById(userId).populate('branches');
            if (admin) {
                const locCodes = admin.branches?.map(b => b.locCode).filter(Boolean) || [];
                query = {
                    $or: [
                        { user: { $in: [admin._id] } },
                        { Role: { $in: [admin.role] } },
                        { branch: { $in: locCodes } }
                    ]
                };
            } else {
                // Check if they are a regular user/employee
                const user = await User.findById(userId);
                if (user) {
                    const locCodes = Array.isArray(user.locCode) ? user.locCode : [user.locCode].filter(Boolean);
                    const userIds = [user._id];
                    
                    // Look up employee record to map notifications assigned directly to Employee schema
                    const employee = await Employee.findOne({
                        $or: [
                            { userId: user._id },
                            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
                        ]
                    });
                    if (employee) {
                        userIds.push(employee._id);
                    }

                    query = {
                        $or: [
                            { user: { $in: userIds } },
                            { Role: { $in: [user.designation] } },
                            { branch: { $in: locCodes } }
                        ]
                    };
                }
            }
        }

        // Fetch the first three notifications, sorted by createdAt in descending order (latest first)
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })  // Sort by 'createdAt' field in descending order
            .limit(3);  // Limit the result to 3 notifications

        // Send the notifications as a response (return empty array instead of 404 to prevent client crash)
        res.status(200).json({ notifications: notifications || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllNotifications = async (req, res) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.admin.userId;
        const userRole = req.admin.role;

        let query = {};

        // If not a full access admin, filter by scope
        if (userRole !== 'super_admin' && userRole !== 'admin' && userRole !== 'hr_admin') {
            const admin = await Admin.findById(userId).populate('branches');
            if (admin) {
                const locCodes = admin.branches?.map(b => b.locCode).filter(Boolean) || [];
                query = {
                    $or: [
                        { user: { $in: [admin._id] } },
                        { Role: { $in: [admin.role] } },
                        { branch: { $in: locCodes } }
                    ]
                };
            } else {
                const user = await User.findById(userId);
                if (user) {
                    const locCodes = Array.isArray(user.locCode) ? user.locCode : [user.locCode].filter(Boolean);
                    const userIds = [user._id];
                    
                    // Look up employee record to map notifications assigned directly to Employee schema
                    const employee = await Employee.findOne({
                        $or: [
                            { userId: user._id },
                            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
                        ]
                    });
                    if (employee) {
                        userIds.push(employee._id);
                    }

                    query = {
                        $or: [
                            { user: { $in: userIds } },
                            { Role: { $in: [user.designation] } },
                            { branch: { $in: locCodes } }
                        ]
                    };
                }
            }
        }

        // Fetch the notifications, sorted by createdAt in descending order (latest first)
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 });  // Sort by 'createdAt' field in descending order

        // Send the notifications as a response (return empty array instead of 404 to prevent client crash)
        res.status(200).json({ notifications: notifications || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};





export const Subroles = async (req, res) => {
    try {
        const { subrole, roleCode, level } = req.body;

        // Validation (Optional)
        if (!subrole || !roleCode || !level) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const newSubrole = new Subrole({ subrole, roleCode, level });
        await newSubrole.save();

        res.status(201).json({ message: 'Subrole added successfully.', subrole: newSubrole });
    } catch (error) {
        console.error('Error creating subrole:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

export const GetSubroles = async (req, res) => {
    try {


        const newSubrole = await Subrole.find()
        if (!newSubrole) {
            return res.status(404).json({
                message: "Subrole not found"
            })
        }


        res.status(201).json({ message: 'Subrole added successfully.', subrole: newSubrole });
    } catch (error) {
        console.error('Error creating subrole:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


export const upsertEscalationLevel = async (req, res) => {
    const { tableData } = req.body; // Extract tableData from the request body

    if (!Array.isArray(tableData)) {
        return res.status(400).json({ message: "Invalid input: tableData must be an array" });
    }

    try {
        const results = await Promise.all(
            tableData.map(async (item) => {
                const { id, level, context, numberOfDays } = item;

                // Find and update or create if not found
                let escalationLevel = await EscalationLevel.findOneAndUpdate(
                    { id }, // Query by ID
                    { level, context, numberOfDays }, // Fields to update
                    { new: true, upsert: true, runValidators: true } // Create if not exists, return updated document
                );

                return escalationLevel;
            })
        );

        // Respond with all updated or created documents
        res.status(200).json({ message: "Successfully processed escalation levels", results });
    } catch (error) {
        // Handle errors
        res.status(500).json({ message: "Failed to process escalation levels", error: error.message });
    }
};

export const getEscalationLevel = async (req, res) => {


    try {
        const results = await EscalationLevel.find()
        if (!results) {
            res.status(404).json({ message: "no data processed escalation levels" });

        }

        // Respond with all updated or created documents
        res.status(200).json({ message: "Successfully processed escalation levels", data: results });
    } catch (error) {
        // Handle errors
        res.status(500).json({ message: "Failed to process escalation levels", error: error.message });
    }
};

/**
 * Change / Reset Password for Logged-In Admin
 */
export const changeAdminPassword = async (req, res) => {
    try {
        const userId = req.admin?.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized access' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }

        const trimmedCurrent = String(currentPassword).trim();
        const trimmedNew = String(newPassword).trim();

        if (trimmedNew.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        if (!/[A-Z]/.test(trimmedNew)) {
            return res.status(400).json({ success: false, message: 'New password must contain at least one uppercase letter (A-Z)' });
        }

        if (!/[0-9]/.test(trimmedNew)) {
            return res.status(400).json({ success: false, message: 'New password must contain at least one number (0-9)' });
        }

        if (confirmPassword && trimmedNew !== String(confirmPassword).trim()) {
            return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
        }

        const admin = await Admin.findById(userId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin account not found' });
        }

        if (!admin.password) {
            return res.status(400).json({ success: false, message: 'Password is not set for this account' });
        }

        const isMatch = await bcrypt.compare(trimmedCurrent, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(trimmedNew, 10);
        admin.password = hashedPassword;
        await admin.save();

        // Also sync corresponding User document if present
        if (admin.EmpId || admin.email) {
            await User.updateMany(
                { $or: [{ empID: admin.EmpId }, { email: admin.email }] },
                { password: hashedPassword }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully. You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Error changing admin password:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while changing password',
            error: error.message
        });
    }
};

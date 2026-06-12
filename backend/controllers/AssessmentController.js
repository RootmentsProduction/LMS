import Admin from "../model/Admin.js";
import Assessment from "../model/Assessment.js";
import Branch from "../model/Branch.js";
import Module from "../model/Module.js";
import Notification from "../model/Notification.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import { Training } from "../model/Traning.js";
import User from "../model/User.js";
import axios from 'axios';
import UserLoginSession from '../model/UserLoginSession.js';

// Helper function to assign existing mandatory trainings to new users
const assignExistingMandatoryTrainingsToUser = async (user) => {
  try {
    const designation = user.designation;
    console.log(`Assigning existing mandatory trainings to new user with designation: ${designation}`);
    
    // Function to flatten a string (remove spaces and lowercase) - same logic as createUser
    const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');
    const flatDesignation = flatten(designation);

    // Fetch all mandatory trainings
    const allTrainings = await Training.find({
      Trainingtype: 'Mandatory'
    }).populate('modules');

    // Filter trainings that match this user's designation
    const mandatoryTraining = allTrainings.filter(training =>
      training.Assignedfor.some(role => flatten(role) === flatDesignation)
    );

    console.log(`Found ${mandatoryTraining.length} existing mandatory trainings for designation: ${designation}`);

    if (mandatoryTraining.length === 0) {
      console.log(`No existing mandatory trainings found for designation: ${designation}`);
      return;
    }

    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline

    // Create TrainingProgress records for each mandatory training
    const trainingAssignments = mandatoryTraining.map(async (training) => {
      // Check if this user already has this training assigned
      const existingProgress = await TrainingProgress.findOne({
        userId: user._id,
        trainingId: training._id
      });

      if (existingProgress) {
        console.log(`User ${user.empID} already has training ${training.trainingName} assigned`);
        return;
      }

      // Create TrainingProgress for the user
      const trainingProgress = new TrainingProgress({
        userId: user._id,
        trainingId: training._id,
        deadline: deadlineDate,
        pass: false,
        modules: training.modules.map(module => ({
          moduleId: module._id,
          pass: false,
          videos: module.videos.map(video => ({
            videoId: video._id,
            pass: false,
          })),
        })),
      });

      await trainingProgress.save();
      console.log(`Assigned mandatory training "${training.trainingName}" to user ${user.empID}`);
    });

    // Wait for all training assignments to complete
    await Promise.all(trainingAssignments);
    console.log(`Successfully assigned ${mandatoryTraining.length} mandatory trainings to user ${user.empID}`);
    
  } catch (error) {
    console.error(`Error assigning mandatory trainings to user ${user.empID}:`, error);
    // Don't throw error - let the main process continue
  }
};

export const createAssessment = async (req, res) => {
    try {
        const assessmentData = req.body || {};

        const title = typeof assessmentData.title === 'string' ? assessmentData.title.trim() : '';
        const duration = Number(assessmentData.duration);
        const deadline = Number(assessmentData.deadline);
        const questions = Array.isArray(assessmentData.questions) ? assessmentData.questions : [];

        const isValidQuestion = (question) => {
            const options = Array.isArray(question?.options) ? question.options : [];
            const nonEmptyOptions = options.map((option) => String(option || '').trim()).filter(Boolean);
            const correctAnswer = String(question?.correctAnswer || '').trim();

            return Boolean(
                String(question?.questionText || '').trim() &&
                nonEmptyOptions.length >= 2 &&
                correctAnswer &&
                nonEmptyOptions.includes(correctAnswer)
            );
        };

        if (!title || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(deadline) || deadline <= 0) {
            return res.status(400).json({
                message: "Invalid assessment data. Title, duration, and deadline are required and must be valid numbers/strings."
            });
        }

        if (questions.length === 0 || questions.some((question) => !isValidQuestion(question))) {
            return res.status(400).json({
                message: "Invalid assessment questions. Each question must have text, at least two options, and a correct answer that matches one option."
            });
        }

        const admin = req?.admin?.userId ? await Admin.findById(req.admin.userId) : null;

        const newAssessment = new Assessment({
            title,
            duration,
            deadline,
            questions: questions.map((question) => ({
                questionText: String(question.questionText || '').trim(),
                options: question.options.map((option) => String(option || '').trim()).filter(Boolean),
                correctAnswer: String(question.correctAnswer || '').trim(),
            })),
        });

        await newAssessment.save();

        try {
            await Notification.create({
                title: `New Assessment Created: ${title}`,
                body: `${title} has been successfully created${admin?.name ? ` by ${admin.name}` : ''}. Ready for user assignment`,
                category: "Assessment",
                useradmin: admin?.name || "",
            });
        } catch (notificationError) {
            console.error("Assessment notification creation failed:", notificationError);
        }

        res.status(201).json({ message: "Assessment created successfully!", assessment: newAssessment });
    } catch (error) {
        console.error("Error creating assessment:", error);
        res.status(500).json({ message: "An error occurred while creating the assessment.", error: error.message });
    }
};

export const getAssessments = async (req, res) => {
    try {
        const { id } = req.params; // Extract assessment ID if provided

        if (id) {
            // Fetch a specific assessment by ID
            const assessment = await Assessment.findById(id).populate('questions');
            if (!assessment) {
                return res.status(404).json({ message: 'Assessment not found' });
            }
            return res.status(200).json(assessment);
        }

        // Fetch all assessments
        const assessments = await Assessment.find().populate('questions');
        return res.status(200).json(assessments);
    } catch (error) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to fetch employee data from external API
const fetchEmployeeDataForTraining = async () => {
    try {
        const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
            startEmpId: 'EMP1',
            endEmpId: 'EMP9999'
        }, { timeout: 15000 });
        
        return response.data?.data || [];
    } catch (error) {
        console.error('Error fetching employee data from local API:', error);
        return [];
    }
};

export const createTraining = async (req, res) => {
    const { trainingName, modules, workingBranch } = req.body;
    const days = Number(req.body.days ?? req.body.deadline);
    const selectedOption = req.body.selectedOption || (
        Array.isArray(workingBranch) && workingBranch.includes('All') ? 'all' : undefined
    );
    const AdminID = req.admin.userId;
    const AdminData = await Admin.findById(AdminID).populate("permissions");

    console.log("=== CREATE TRAINING DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Admin ID:", AdminID);
    console.log("Selected option:", selectedOption);
    console.log("Working branch:", workingBranch);

    if (!AdminData || !AdminData.permissions.length) {
        return res.status(403).json({
            message: "No permissions found for this admin",
        });
    }

    // Extract first permission object
    const adminPermissions = AdminData.permissions[0];

    if (!AdminData.permissions[0].permissions.canCreateTraining) {
        return res.status(401).json({
            message: "You have no permission",
        });
    }

    console.log("Admin permissions validated successfully");

    console.log(req.admin);
    const admin = await Admin.findById(req?.admin?.userId)
    console.log(admin);

    try {
        // Ensure all required data is provided
        if (!trainingName || !Array.isArray(modules) || modules.length === 0 || !days || !selectedOption) {
            console.log("Missing required fields:", { trainingName, modules, days, selectedOption });
            return res.status(400).json({
                message: "Training name, modules, days, and selected option are required",
                details: { trainingName: Boolean(trainingName), modules, days, selectedOption },
            });
        }

        // Validate workingBranch is provided and not empty
        if (!workingBranch || !Array.isArray(workingBranch) || workingBranch.length === 0) {
            console.log("Missing or invalid workingBranch:", workingBranch);
            return res.status(400).json({ message: "Working branch/designation/user selection is required" });
        }

        console.log("Required fields validation passed");

        // Fetch details of modules from Module collection
        const moduleDetails = await Module.find({ _id: { $in: modules } }).populate('videos');
        console.log(`Found ${moduleDetails.length} modules`);

        if (moduleDetails.length === 0) {
            return res.status(404).json({ message: "Modules not found" });
        }

        // Calculate deadline in **Date format**
        const deadlineDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        console.log("Calculated deadline:", deadlineDate);

        // Create a new training record with both deadline (days) and deadlineDate (actual date)
        const newTraining = new Training({
            trainingName,
            description: req.body.description || "",
            modules,
            deadline: days, // Store original days input (keeping existing format)
            deadlineDate: deadlineDate, // Store actual calculated date
            Trainingtype: req.body.Trainingtype || "Assigned",
            Assignedfor: workingBranch || [], // Set the Assignedfor field with workingBranch data
        });

        console.log("Created training object:", newTraining);
        console.log("Assignedfor field value:", newTraining.Assignedfor);
        console.log("WorkingBranch from request:", workingBranch);
        
        // Validate the training object before saving
        try {
            await newTraining.validate();
            console.log("Training validation passed");
        } catch (validationError) {
            console.error("Training validation failed:", validationError.message);
            return res.status(400).json({ 
                message: "Training validation failed", 
                error: validationError.message 
            });
        }

        // Save the training record
        await newTraining.save();
        console.log("Training saved successfully with ID:", newTraining._id);
        
        // Verify the saved data
        const savedTraining = await Training.findById(newTraining._id);
        console.log("Verified saved training data:", {
            id: savedTraining._id,
            trainingName: savedTraining.trainingName,
            Assignedfor: savedTraining.Assignedfor,
            modules: savedTraining.modules,
            deadline: savedTraining.deadline
        });

        if (selectedOption === 'new') {
            console.log("Training saved for future new employees.");
            return res.status(201).json({ message: "Training created for new employees successfully", training: newTraining });
        }

        // Resolve recipients from the local User collection only.
        console.log("Resolving training recipients from local users...");
        let usersInBranch = [];

        if (selectedOption === 'all') {
            usersInBranch = await User.find({});
        } else if (selectedOption === 'user') {
            usersInBranch = await User.find({ empID: { $in: workingBranch } });
        } else if (selectedOption === 'designation') {
            usersInBranch = await User.find({ designation: { $in: workingBranch } });
        } else if (selectedOption === 'branch') {
            const branchDocs = await Branch.find({ $or: [{ locCode: { $in: workingBranch } }, { workingBranch: { $in: workingBranch } }] })
                .select('locCode workingBranch')
                .lean();
            const branchLocCodes = branchDocs.map((b) => String(b.locCode)).filter(Boolean);
            const branchNames = branchDocs.map((b) => b.workingBranch).filter(Boolean);
            const branchTargets = Array.from(new Set([...workingBranch, ...branchLocCodes, ...branchNames]));

            usersInBranch = await User.find({
                $or: [
                    { workingBranch: { $in: branchTargets } },
                    { locCode: { $in: branchTargets } },
                ],
            });
        } else {
            return res.status(400).json({ message: "Invalid selected option" });
        }

        console.log(`Matched ${usersInBranch.length} local users from Employee page source`);
        console.log("Matched users sample:", usersInBranch.slice(0, 3).map((user) => ({
            empID: user.empID,
            username: user.username,
            designation: user.designation,
            workingBranch: user.workingBranch,
        })));

        if (usersInBranch.length === 0) {
            const errorMessage =
                selectedOption === 'all'
                    ? 'No local users found to assign this training'
                    : selectedOption === 'user'
                    ? `No local users found with employee IDs: ${workingBranch.join(', ')}`
                    : selectedOption === 'designation'
                        ? `No local users found with designations: ${workingBranch.join(', ')}`
                        : `No local users found with branches: ${workingBranch.join(', ')}`;
            return res.status(404).json({ message: errorMessage });
        }

        console.log("Starting training assignment to users...");

        const userTrainingEntry = {
            trainingId: newTraining._id,
            deadline: deadlineDate,
            pass: false,
            status: 'Pending',
        };

        const progressModules = moduleDetails.map(module => ({
            moduleId: module._id,
            pass: false,
            videos: module.videos.map(video => ({
                videoId: video._id,
                pass: false,
            })),
        }));

        const userUpdates = usersInBranch.map(user => ({
            updateOne: {
                filter: {
                    _id: user._id,
                    'training.trainingId': { $ne: newTraining._id },
                },
                update: {
                    $push: { training: userTrainingEntry },
                },
            },
        }));

        if (userUpdates.length > 0) {
            await User.bulkWrite(userUpdates, { ordered: false });
        }

        const progressDocs = usersInBranch.map(user => ({
            userId: user._id,
            trainingId: newTraining._id,
            trainingName,
            deadline: deadlineDate,
            pass: false,
            modules: progressModules,
        }));

        try {
            await TrainingProgress.insertMany(progressDocs, { ordered: false });
        } catch (progressError) {
            if (progressError?.code !== 11000 && progressError?.writeErrors?.some(err => err.code !== 11000)) {
                throw progressError;
            }
            console.log("Skipped duplicate training progress records during assignment");
        }

        console.log("All users assigned successfully");

        if (selectedOption === 'all') {
            console.log("Creating notification for all users...");
            await Notification.create({
                title: `New training Created : ${trainingName}`,
                body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                user: usersInBranch.map(user => user._id),
                useradmin: admin?.name,
            });
            console.log("All-user notification created successfully");

        } else if (selectedOption === 'user') {
            if (!workingBranch || workingBranch.length === 0) {
                return res.status(400).json({ message: "User IDs are required when selectedOption is 'user'" });
            }

            console.log("Creating notification for users...");
            // Create notification for users - pass User ObjectIds, not employee codes
            const userObjectIds = usersInBranch.map(user => user._id);
            console.log("User ObjectIds for notification:", userObjectIds);
            
            const newNotification = await Notification.create({
                title: `New training Created : ${trainingName}`,
                body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                user: userObjectIds,  // Pass User ObjectIds, not employee codes
                useradmin: admin?.name,  // Optional
            });
            console.log("User notification created successfully");

        } else if (selectedOption === 'designation') {
            if (!workingBranch) {
                return res.status(400).json({ message: "Designation is required when selectedOption is 'designation'" });
            }

            console.log("Creating notification for roles...");
            // Create notification for Role
            const newNotification = await Notification.create({
                title: `New training Created : ${trainingName}`,
                body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                Role: workingBranch,  // Pass the designation here
                useradmin: admin?.name,  // Optional
            });
            console.log("Role notification created successfully");

        } else if (selectedOption === 'branch') {
            if (!workingBranch) {
                return res.status(400).json({ message: "Working branch is required when selectedOption is 'branch'" });
            }

            const branchDocs = await Branch.find({ $or: [{ locCode: { $in: workingBranch } }, { workingBranch: { $in: workingBranch } }] })
                .select('locCode workingBranch')
                .lean();
            const branchLocCodes = branchDocs.map((b) => String(b.locCode)).filter(Boolean);
            const branchNames = branchDocs.map((b) => b.workingBranch).filter(Boolean);

            console.log("Creating notification for branches...");
            await Notification.create({
                title: `New training Created : ${trainingName}`,
                body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                branch: Array.from(new Set([...workingBranch, ...branchLocCodes, ...branchNames])),
                useradmin: admin?.name,
            });
            console.log("Branch notification created successfully");
        }

        console.log("=== TRAINING CREATION COMPLETED SUCCESSFULLY ===");
        res.status(201).json({ message: "Training created and assigned successfully", training: newTraining });
    } catch (error) {
        console.error("Error in createTraining:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Provide more specific error messages
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Validation Error", 
                details: error.message 
            });
        } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return res.status(500).json({ 
                message: "Database Error", 
                details: error.message 
            });
        } else {
            res.status(500).json({ 
                message: "Server Error", 
                details: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};

export const updateTraining = async (req, res) => {
    const { id } = req.params;
    const { trainingName, modules, workingBranch } = req.body;
    const days = Number(req.body.days ?? req.body.deadline);
    const selectedOption = req.body.selectedOption || (
        Array.isArray(workingBranch) && workingBranch.includes('All') ? 'all' : undefined
    );
    const AdminID = req.admin.userId;
    const AdminData = await Admin.findById(AdminID).populate("permissions");

    if (!AdminData || !AdminData.permissions.length) {
        return res.status(403).json({ message: "No permissions found for this admin" });
    }

    if (!AdminData.permissions[0].permissions.canCreateTraining) {
        return res.status(401).json({ message: "You have no permission" });
    }

    try {
        if (!trainingName || !Array.isArray(modules) || modules.length === 0 || !days || !selectedOption) {
            return res.status(400).json({
                message: "Training name, modules, days, and selected option are required",
            });
        }

        if (!workingBranch || !Array.isArray(workingBranch) || workingBranch.length === 0) {
            return res.status(400).json({ message: "Working branch/designation/user selection is required" });
        }

        const training = await Training.findById(id);
        if (!training) {
            return res.status(404).json({ message: "Training not found" });
        }

        training.trainingName = trainingName;
        training.description = req.body.description || "";
        training.modules = modules;
        training.deadline = days;
        training.deadlineDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        training.Trainingtype = req.body.Trainingtype || "Assigned";
        training.Assignedfor = workingBranch || [];
        training.editedDate = new Date();

        await training.save();

        return res.status(200).json({
            message: "Training updated successfully",
            training,
        });
    } catch (error) {
        console.error("Error in updateTraining:", error);
        return res.status(500).json({
            message: "Server Error",
            details: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const GetTrainingById = async (req, res) => {
    const { id } = req.params; // Extract the training ID from request params
    console.log(id);


    try {
        // Fetch training data and populate modules
        const training = await Training.findById(id).populate({
            path: 'modules',
            model: 'Module',
        });

        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        // Fetch all user progress records tied to this training
        const progressRecords = await TrainingProgress.find({ trainingId: id });



        // Ensure module-level tracking is initialized
        const moduleCompletionStats = training.modules.map((module) => ({
            moduleId: module._id,
            totalUsers: 0,
            completedByUsers: 0,
        }));

        // Calculate user progress
        const userProgress = progressRecords.map((record) => {
            let totalVideos = 0;
            let completedVideos = 0;

            // Process each module's progress
            const modulesProgress = record.modules.map((module) => {
                const totalVideosInModule = module.videos.length;
                const completedVideosInModule = module.videos.filter((v) => v.pass).length;

                totalVideos += totalVideosInModule;
                completedVideos += completedVideosInModule;

                // Update module-level stats
                const moduleStat = moduleCompletionStats.find((stat) => stat.moduleId.equals(module.moduleId));
                if (moduleStat) {
                    moduleStat.totalUsers += 1;
                    if (module.pass) {
                        moduleStat.completedByUsers += 1;
                    }
                }

                // Return module progress
                return {
                    moduleId: module.moduleId,
                    pass: module.pass,
                    videosCompleted: completedVideosInModule,
                    totalVideos: totalVideosInModule,
                    completionPercentage: totalVideosInModule > 0
                        ? ((completedVideosInModule / totalVideosInModule) * 100).toFixed(2)
                        : 0,
                };
            });

            // Calculate overall progress for the user
            const overallCompletionPercentage = totalVideos > 0
                ? ((completedVideos / totalVideos) * 100).toFixed(2)
                : 0;

            return {
                userId: record.userId,
                pass: record.pass,
                status: record.status,
                modules: modulesProgress,
                overallCompletionPercentage,
            };
        });
        // console.log(userProgress);


        // Calculate average module completion percentages
        const averageCompletedModule = moduleCompletionStats.map((moduleStat) => ({
            moduleId: moduleStat.moduleId,
            completionPercentage: moduleStat.totalUsers > 0
                ? ((moduleStat.completedByUsers / moduleStat.totalUsers) * 100).toFixed(2)
                : 0,
        }));
        // console.log(averageCompletedModule);


        // Calculate average overall user progress
        const totalProgress = userProgress.reduce((sum, user) => sum + parseFloat(user.overallCompletionPercentage), 0);
        const averageCompletionPercentage = userProgress.length > 0
            ? (totalProgress / userProgress.length).toFixed(2)
            : 0;
        console.log(averageCompletionPercentage);

        // Send response
        res.status(200).json({
            message: 'Training data retrieved successfully',
            data: {
                ...training._doc,
                averageCompletedModule,
            },
            users: userProgress,
            averageCompletionPercentage,
        });

    } catch (error) {
        console.error('Error fetching training by ID:', error);
        res.status(500).json({ message: 'Server error while fetching training data', error: error.message });
    }
};



export const calculateProgress = async (req, res) => {
    try {
        const AdminID = req.admin.userId;
        const AdminData = await Admin.findById(AdminID).populate('branches');
        const isSuperAdmin = AdminData.role === 'super_admin' || AdminData.role === 'admin';
        
        // Super admin sees all branches
        const allBranches = isSuperAdmin ? await Branch.find({}) : AdminData.branches;
        const allowedLocCodes = allBranches.map(branch => branch.locCode);
        const day = new Date();

        // Single user fetch (removed duplicate query)
        const users = await User.find({ locCode: { $in: allowedLocCodes } });
        const userID = users.map(id => id._id);
        const totalEmployeeCount = users.length;

        // Pre-fetch all training progress records in bulk
        const allTrainingProgress = await TrainingProgress.find({ userId: { $in: userID } });
        const trainingProgressMap = new Map();
        allTrainingProgress.forEach(progress => {
            const key = progress.userId.toString();
            if (!trainingProgressMap.has(key)) trainingProgressMap.set(key, []);
            trainingProgressMap.get(key).push(progress);
        });

        let totalUserTrainings = 0;
        let completedUserTrainings = 0;
        let totalAssessments = 0;
        let passedAssessments = 0;
        let trainingpend = 0;

        users.forEach(user => {
            const assignedTrainingIds = user.training ? user.training.map(t => t.trainingId.toString()) : [];
            const userTrainingProgress = trainingProgressMap.get(user._id.toString()) || [];
            const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => !assignedTrainingIds.includes(tp.trainingId.toString()));

            if (user.training && Array.isArray(user.training)) {
                totalUserTrainings += user.training.length;
                completedUserTrainings += user.training.filter(t => t.pass).length;
                trainingpend += user.training.filter(t => day > t.deadline && !t.pass).length;
            }

            totalUserTrainings += uniqueMandatoryTrainings.length;
            completedUserTrainings += uniqueMandatoryTrainings.filter(tp => tp.pass).length;
            trainingpend += uniqueMandatoryTrainings.filter(tp => day > tp.deadline && !tp.pass).length;

            if (Array.isArray(user.assignedAssessments)) {
                totalAssessments += user.assignedAssessments.length;
                passedAssessments += user.assignedAssessments.filter(a => day > a.deadline && !a.pass).length;
            }
        });

        const averageProgress = totalUserTrainings > 0 ? (completedUserTrainings / totalUserTrainings) * 100 : 0;
        const finalAverageProgress = parseFloat(averageProgress.toFixed(2));

        // Login stats
        const [uniqueLoginUsers, totalLogins, deviceStats] = await Promise.all([
            UserLoginSession.distinct('userId'),
            UserLoginSession.countDocuments(),
            UserLoginSession.aggregate([{ $group: { _id: '$deviceOS', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ]);
        const loginPercentage = totalEmployeeCount > 0 ? Math.round((uniqueLoginUsers.length / totalEmployeeCount) * 100) : 0;

        res.status(200).json({
            success: true,
            data: {
                assessmentCount: await Assessment.countDocuments(),
                branchCount: allBranches.length,
                userCount: totalEmployeeCount,
                localUserCount: totalEmployeeCount,
                averageProgress: finalAverageProgress,
                assessmentProgress: passedAssessments,
                trainingPending: trainingpend,
                uniqueLoginUserCount: uniqueLoginUsers.length,
                totalLogins,
                loginPercentage,
                deviceStats,
                allowedLocCodes,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

export const createMandatoryTraining = async (req, res) => {
    const { trainingName, modules, days, workingBranch } = req.body;

    const admin = await Admin.findById(req?.admin?.userId)


    try {
        // Validate required fields
        if (!trainingName || !modules || !days || !workingBranch) {
            return res.status(400).json({ message: "Training name, modules, days, and working branch are required" });
        }

        // Fetch module details from Module collection
        const moduleDetails = await Module.find({ _id: { $in: modules } }).populate('videos');

        if (moduleDetails.length === 0) {
            return res.status(404).json({ message: "Modules not found" });
        }

        // Calculate deadline as a Date
        const deadlineDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // Create new training with updated fields
        const newTraining = new Training({
            trainingName,
            Trainingtype: "Mandatory", // Correct field for training type
            modules,
            Assignedfor: workingBranch, // Correct field for assigned branches
            deadline: days, // Store original days input (keeping existing format)
            deadlineDate: deadlineDate, // Store actual calculated date
        });

        // Save the training record
        await newTraining.save();

        //         // Find users based on designation/branch  abhiram chnage
        //         const usersInBranch = await User.find({
        //   $or: workingBranch.map(role => ({
        //     designation: { $regex: `^${role}$`, $options: 'i' }
        //   }))
        // });

        // // Helper function to create flexible regex
        // const normalizeRegex = (str) => str.toLowerCase().replace(/\s+/g, '').split('').join('\\s*');

        // // Updated line for finding users by designation
        // const usersInBranch = await User.find({
        //     $or: workingBranch.map(role => ({
        //         designation: {
        //             $regex: `^${normalizeRegex(role)}$`,
        //             $options: 'i'
        //         }
        //     }))
        // });




        // First, get external employee data to find matching employees
        let externalEmployees = [];
        try {
            // Use local API instead of external API
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: "EMP1",
                endEmpId: "EMP9999"
            }, {
                timeout: 10000, // Reduced timeout
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            
            externalEmployees = response.data?.data || [];
            console.log(`Fetched ${externalEmployees.length} external employees from local API`);
        } catch (error) {
            console.error('Error fetching local employee data:', error.message);
            // Continue with internal users only - this is not a critical failure
        }

        const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');

        // STRICT MATCHING: Only match exact roles, no partial matches
        const matchExactDesignation = (userDesig, roleList) => {
            if (!userDesig || !Array.isArray(roleList)) return false;
            
            // Normalize the user designation (trim and lowercase)
            const normalizedUserDesig = userDesig.trim().toLowerCase();
            
            // Check if the user's designation exactly matches any of the selected roles
            return roleList.some(role => {
                if (!role) return false;
                const normalizedRole = role.trim().toLowerCase();
                
                // EXACT MATCH ONLY - no partial matches
                if (normalizedUserDesig === normalizedRole) {
                    return true;
                }
                
                // ADDITIONAL CHECK: Ensure the user role doesn't contain the selected role as a substring
                // This prevents "Assistant General Manager" from matching "Assistant" or "Manager"
                if (normalizedUserDesig.includes(normalizedRole) && normalizedUserDesig !== normalizedRole) {
                    console.log(`  ❌ REJECTING: User role "${userDesig}" contains selected role "${role}" as substring`);
                    return false;
                }
                
                // ADDITIONAL CHECK: Ensure the selected role doesn't contain the user role as a substring
                // This prevents "Assistant" from matching "Assistant General Manager"
                if (normalizedRole.includes(normalizedUserDesig) && normalizedUserDesig !== normalizedRole) {
                    console.log(`  ❌ REJECTING: Selected role "${role}" contains user role "${userDesig}" as substring`);
                    return false;
                }
                
                return false;
            });
        };

        console.log('Looking for EXACT designations:', workingBranch);
        console.log('Selected roles for training assignment:', workingBranch);
        console.log('=== ROLE MATCHING DEBUG ===');
        console.log('Selected roles:', workingBranch);
        console.log('Selected roles (normalized):', workingBranch.map(r => r.trim().toLowerCase()));

        // Get internal users that match the designation
        const allInternalUsers = await User.find();
        console.log(`Found ${allInternalUsers.length} internal users`);
        
        // Log all unique designations from internal users
        const internalDesignations = [...new Set(allInternalUsers.map(u => u.designation))];
        console.log('Internal user designations:', internalDesignations);
        
        // STRICT FILTERING: Only process users with exact role matches
        const internalUsersInBranch = allInternalUsers.filter(user => {
            const userRole = user.designation;
            const isMatch = matchExactDesignation(userRole, workingBranch);
            
            // Debug each user's role matching
            console.log(`User: ${user.username} (${user.empID})`);
            console.log(`  User role: "${userRole}"`);
            console.log(`  Selected roles: ${workingBranch.join(', ')}`);
            console.log(`  Is match: ${isMatch}`);
            
            return isMatch;
        });
        console.log(`Found ${internalUsersInBranch.length} matching internal users`);
        
        // Log which internal users matched and why
        if (internalUsersInBranch.length > 0) {
            console.log('Matching internal users:');
            internalUsersInBranch.forEach(user => {
                console.log(`  - ${user.username} (${user.empID}): "${user.designation}" matches selected roles: ${workingBranch.join(', ')}`);
            });
        }

        // Filter external employees by designation and create/find corresponding internal users
        const externalDesignations = [...new Set(externalEmployees.map(emp => emp.role_name).filter(Boolean))];
        console.log('External employee designations:', externalDesignations.slice(0, 10), externalDesignations.length > 10 ? '...' : '');
        
        const matchingExternalEmployees = externalEmployees.filter(emp => {
            const empRole = emp.role_name;
            const isMatch = matchExactDesignation(empRole, workingBranch);
            
            // Debug each external employee's role matching
            console.log(`External Employee: ${emp.name} (${emp.emp_code})`);
            console.log(`  Employee role: "${empRole}"`);
            console.log(`  Selected roles: ${workingBranch.join(', ')}`);
            console.log(`  Is match: ${isMatch}`);
            
            return isMatch;
        });
        console.log(`Found ${matchingExternalEmployees.length} matching external employees`);
        
        // Log which external employees matched and why
        if (matchingExternalEmployees.length > 0) {
            console.log('Matching external employees:');
            matchingExternalEmployees.forEach(emp => {
                console.log(`  - ${emp.name} (${emp.emp_code}): "${emp.role_name}" matches selected roles: ${workingBranch.join(', ')}`);
            });
        }

        // Create or find internal users for matching external employees
        const externalToInternalUsers = [];
        for (const emp of matchingExternalEmployees) {
            if (!emp.emp_code || !emp.email) {
                continue;
            }

            // Try to find existing user
            let user = await User.findOne({
                $or: [
                    { empID: emp.emp_code },
                    { email: emp.email }
                ]
            });

            if (!user) {
                // Create new user if doesn't exist
                try {
                    user = new User({
                        username: emp.name || emp.emp_code || 'Unknown',
                        email: emp.email,
                        empID: emp.emp_code,
                        locCode: emp.store_code || '1', // Default to '1' if no store_code
                        designation: emp.role_name || '',
                        workingBranch: emp.store_name || 'DEFAULT',
                        source: 'external-sync',
                    });
                    await user.save();
                    console.log(`Created new user: ${user.username} with designation: ${user.designation}`);
                } catch (saveError) {
                    console.error(`Failed to create user for ${emp.emp_code}:`, saveError.message);
                    continue;
                }
            }
            externalToInternalUsers.push(user);
        }

        // Combine internal and external-derived users
        const usersInBranch = [...internalUsersInBranch, ...externalToInternalUsers];

        // Remove duplicates based on empID
        const uniqueUsersMap = new Map();
        usersInBranch.forEach(user => {
            if (!uniqueUsersMap.has(user.empID)) {
                uniqueUsersMap.set(user.empID, user);
            }
        });
        const finalUsersInBranch = Array.from(uniqueUsersMap.values());

        // FINAL VALIDATION: Double-check that all users have exact role matches
        console.log('=== FINAL VALIDATION ===');
        const validatedUsers = finalUsersInBranch.filter(user => {
            const userRole = user.designation;
            const isValid = matchExactDesignation(userRole, workingBranch);
            
            console.log(`Final validation - User: ${user.username} (${user.empID})`);
            console.log(`  Role: "${userRole}"`);
            console.log(`  Valid for training: ${isValid}`);
            
            if (!isValid) {
                console.log(`  ❌ REMOVING USER: Role "${userRole}" does not exactly match selected roles: ${workingBranch.join(', ')}`);
            }
            
            return isValid;
        });
        
        console.log(`Final users after validation: ${validatedUsers.length} out of ${finalUsersInBranch.length}`);
        
        // FINAL SUMMARY: Show exactly which users are getting the training
        console.log('=== FINAL TRAINING ASSIGNMENT SUMMARY ===');
        console.log(`Training: ${trainingName}`);
        console.log(`Selected roles: ${workingBranch.join(', ')}`);
        console.log(`Users getting training: ${validatedUsers.length}`);
        validatedUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.username} (${user.empID}) - Role: "${user.designation}"`);
        });
        console.log('=== END SUMMARY ===');
        
        if (validatedUsers.length === 0) {
            // No users found with exact role matches
            const availableDesignations = [
                ...new Set([
                    ...internalDesignations,
                    ...externalDesignations.slice(0, 20) // Limit to first 20 to avoid too long message
                ])
            ].sort();
            
            return res.status(404).json({ 
                message: `No users found for the provided designation(s): ${workingBranch.join(', ')}. Please check if the designation names match exactly.`,
                debug: {
                    searchedDesignations: workingBranch,
                    internalUsersFound: allInternalUsers.length,
                    externalEmployeesFound: externalEmployees.length,
                    availableDesignations: availableDesignations.slice(0, 10),
                    totalAvailableDesignations: availableDesignations.length,
                    note: "Only exact role matches are allowed - no partial matching"
                }
            });
        }


        // For mandatory trainings, only create progress records, don't add to user.training array
        // This prevents mandatory trainings from appearing in both "assigned" and "mandatory" sections
        const updatedUsers = validatedUsers.map(async (user) => {
            // DON'T add mandatory training to user.training array
            // user.training.push({
            //     trainingId: newTraining._id,
            //     deadline: deadlineDate,
            //     pass: false,
            //     status: 'Pending',
            // });

            // Check if this user already has this training assigned to avoid duplicates
            const existingProgress = await TrainingProgress.findOne({
                userId: user._id,
                trainingId: newTraining._id
            });

            if (existingProgress) {
                console.log(`Training already exists for user ${user.empID} (${user.username})`);
                return user; // Skip if already assigned
            }

            // Create training progress for mandatory training
            const trainingProgress = new TrainingProgress({
                userId: user._id,
                trainingId: newTraining._id,
                trainingName: trainingName,
                deadline: deadlineDate,
                pass: false,
                modules: moduleDetails.map(module => ({
                    moduleId: module._id,
                    pass: false,
                    videos: module.videos.map(video => ({
                        videoId: video._id,
                        pass: false,
                    })),
                })),
            });

            await trainingProgress.save();
            return user.save(); // Save user without adding to training array
        });

        await Promise.all(updatedUsers); // Save all users asynchronously

        res.status(201).json({
            message: `Mandatory training created successfully for ${validatedUsers.length} users`,
            training: newTraining,
            assignedUsersCount: validatedUsers.length,
            note: "Mandatory trainings are handled separately from assigned trainings"
        });
        const newNotification = await Notification.create({
            title: `New Mandatory Training Created : ${trainingName}`,
            body: `${trainingName} has been successfully created as a mandatory training for ${validatedUsers.length} users. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
            Role: workingBranch,
            useradmin: admin?.name, // Optional
        });
    } catch (error) {
        console.error("Error creating training:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

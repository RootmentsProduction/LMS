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
        const assessmentData = req.body;

        // Validate input
        if (!assessmentData.title || !assessmentData.duration || !Array.isArray(assessmentData.questions) || !assessmentData.deadline) {
            return res.status(400).json({ message: "Invalid assessment data. Ensure all required fields are present." });
        }

        const admin = await Admin.findById(req?.admin?.userId)


        // Create and save the assessment
        const newAssessment = new Assessment(assessmentData);
        await newAssessment.save();

        const newNotification = await Notification.create({
            title: `New AssessmentData Created : ${assessmentData.title}`,
            body: `${assessmentData.title} has been successfully created. Created by ${admin?.name}. Ready for user assignment`,
            category: "Assessment",
            useradmin: admin?.name, // Optional
        });
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
    const { trainingName, modules, days, workingBranch, selectedOption } = req.body;
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
        if (!trainingName || !modules || !days || !selectedOption) {
            console.log("Missing required fields:", { trainingName, modules, days, selectedOption });
            return res.status(400).json({ message: "Training name, modules, days, and selected option are required" });
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

        // Create a new training record with deadline stored as a Date
        const newTraining = new Training({
            trainingName,
            modules,
            deadline: days, // Store deadline as a proper Date object
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

        // First, fetch external employee data to get the list of employees
        console.log("Fetching employee data from local API...");
        let externalEmployees = [];
        
        // Retry mechanism for external API
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
            try {
                console.log(`Attempt ${retryCount + 1} to fetch employee data...`);
                
                const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                    startEmpId: "EMP1",
                    endEmpId: "EMP9999"
                }, {
                    timeout: 30000, // Increased timeout to 30 seconds
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                            console.log("API response status:", response.status);
                console.log("API response data length:", response.data?.data?.length || 0);

                if (!response.data || !response.data.data) {
                    console.error("Invalid API response:", response.data);
                    return res.status(500).json({ message: "Failed to fetch external employee data" });
                }

                externalEmployees = response.data.data;
                console.log(`Fetched ${externalEmployees.length} employees from API`);
                break; // Success, exit the retry loop
                
            } catch (error) {
                retryCount++;
                console.error(`Attempt ${retryCount} failed:`, error.message);
                
                if (retryCount > maxRetries) {
                    console.log("Max retries reached, proceeding with fallback...");
                    break; // Exit retry loop and proceed to fallback
                }
                
                // Wait before retrying (exponential backoff)
                const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s
                console.log(`Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue; // Try again
            }
        }
        
        // If we still don't have external employees after retries, proceed to fallback
        if (externalEmployees.length === 0) {
            console.log("No external employee data available, attempting to work with internal users based on selection...");
                
                let internalUsers = [];
                
                if (selectedOption === 'user' && workingBranch && workingBranch.length > 0) {
                    // For user selection: find by employee codes
                    console.log("Looking for internal users with employee codes:", workingBranch);
                    internalUsers = await User.find({
                        empID: { $in: workingBranch }
                    });
                    
                } else if (selectedOption === 'designation' && workingBranch && workingBranch.length > 0) {
                    // For designation selection: find by roles
                    console.log("Looking for internal users with designations:", workingBranch);
                    internalUsers = await User.find({
                        designation: { $in: workingBranch }
                    });
                    
                } else if (selectedOption === 'branch' && workingBranch && workingBranch.length > 0) {
                    // For branch selection: find by working branch
                    console.log("Looking for internal users with branches:", workingBranch);
                    internalUsers = await User.find({
                        workingBranch: { $in: workingBranch }
                    });
                }
                
                if (internalUsers.length > 0) {
                    console.log(`Found ${internalUsers.length} internal users, proceeding without external API`);
                    
                    // Assign training directly to internal users
                    const updatedUsers = internalUsers.map(async (user) => {
                        console.log(`Assigning training to internal user: ${user.username} (${user.empID}) - Role: ${user.designation} - Branch: ${user.workingBranch}`);
                        
                        // Add training details to user
                        user.training.push({
                            trainingId: newTraining._id,
                            deadline: deadlineDate,
                            pass: false,
                            status: 'Pending',
                        });

                        // Create training progress for each user
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
                        console.log(`Training progress saved for internal user: ${user.username}`);
                        return user.save();
                    });

                    await Promise.all(updatedUsers);
                    
                    // Create notification based on selection type
                    let notificationData = {
                        title: `New training Created : ${trainingName}`,
                        body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                        useradmin: admin?.name,
                    };
                    
                    if (selectedOption === 'user') {
                        const userObjectIds = internalUsers.map(user => user._id);
                        notificationData.user = userObjectIds;
                    } else if (selectedOption === 'designation') {
                        notificationData.Role = workingBranch;
                    } else if (selectedOption === 'branch') {
                        notificationData.branch = workingBranch;
                    }
                    
                    const newNotification = await Notification.create(notificationData);
                    
                    console.log("=== TRAINING CREATION COMPLETED (INTERNAL USERS ONLY) ===");
                    return res.status(201).json({ 
                        message: `Training created and assigned successfully to ${internalUsers.length} internal users (external API unavailable)`, 
                        training: newTraining,
                        assignedUsers: internalUsers.length,
                        selectionType: selectedOption,
                        note: "External employee API was unavailable, used internal users based on your selection criteria"
                    });
                }
                
                // If no internal users found, provide helpful error message
                let errorMessage = "Employee API is currently unavailable and no matching internal users found.";
                if (selectedOption === 'user') {
                    errorMessage += ` No users found with employee codes: ${workingBranch.join(', ')}`;
                } else if (selectedOption === 'designation') {
                    errorMessage += ` No users found with designations: ${workingBranch.join(', ')}`;
                } else if (selectedOption === 'branch') {
                    errorMessage += ` No users found with branches: ${workingBranch.join(', ')}`;
                }
                errorMessage += ". Please try again later or check if the selected criteria match existing internal users.";
                
                return res.status(500).json({ 
                    message: errorMessage,
                    error: "API_TIMEOUT_NO_INTERNAL_USERS",
                    selectedOption,
                    workingBranch
                });
        }
        
        let filteredEmployees = [];

        // Filter external employees based on the selectedOption
        if (selectedOption === 'user') {
            if (!workingBranch || workingBranch.length === 0) {
                return res.status(400).json({ message: "User IDs are required when selectedOption is 'user'" });
            }
            console.log("Filtering by user IDs:", workingBranch);
            // Filter by employee codes
            filteredEmployees = externalEmployees.filter(emp => 
                workingBranch.includes(emp.emp_code)
            );
            console.log(`Found ${filteredEmployees.length} employees matching user IDs`);

        } else if (selectedOption === 'designation') {
            if (!workingBranch || workingBranch.length === 0) {
                return res.status(400).json({ message: "Designation is required when selectedOption is 'designation'" });
            }
            console.log("Filtering by designations:", workingBranch);
            // Filter by role names
            filteredEmployees = externalEmployees.filter(emp => 
                workingBranch.includes(emp.role_name)
            );
            console.log(`Found ${filteredEmployees.length} employees matching designations`);

        } else if (selectedOption === 'branch') {
            if (!workingBranch || workingBranch.length === 0) {
                return res.status(400).json({ message: "Working branch is required when selectedOption is 'branch'" });
            }
            console.log("Filtering by branches:", workingBranch);
            // Filter by store names
            filteredEmployees = externalEmployees.filter(emp => 
                workingBranch.includes(emp.store_name)
            );
            console.log(`Found ${filteredEmployees.length} employees matching branches`);

        } else {
            return res.status(400).json({ message: "Invalid selected option" });
        }

        console.log("Filtered employees sample:", filteredEmployees.slice(0, 3));

        if (filteredEmployees.length === 0) {
            console.error("No employees found matching criteria");
            console.error("Available employee data sample:", externalEmployees.slice(0, 3).map(emp => ({
                emp_code: emp.emp_code,
                role_name: emp.role_name,
                store_name: emp.store_name
            })));
            return res.status(404).json({ message: "No employees found matching the criteria from external API" });
        }

        // Now find or create corresponding users in the internal database
        let usersInBranch = [];
        console.log("Starting user creation/update process...");
        
        for (const emp of filteredEmployees) {
            console.log(`Processing employee: ${emp.emp_code} - ${emp.name}`);
            
            if (!emp.emp_code || !emp.email) {
                console.log('Skipping employee with missing emp_code or email:', emp);
                continue;
            }

            // Try to find existing user by empID or email
            let user = await User.findOne({
                $or: [
                    { empID: emp.emp_code },
                    { email: emp.email }
                ]
            });

            if (!user) {
                console.log(`Creating new user for employee: ${emp.emp_code}`);
                // Create new user if doesn't exist
                user = new User({
                    username: emp.name || emp.emp_code || 'Unknown',
                    email: emp.email,
                    empID: emp.emp_code,
                    designation: emp.role_name || 'Unknown',
                    locCode: emp.store_name || 'Unknown',
                    workingBranch: emp.store_name || 'Unknown',
                    phoneNumber: emp.phone || '',
                });
                await user.save();
                console.log('Created new user for employee:', emp.emp_code);
                
                // IMPORTANT: Assign existing mandatory trainings to new external employee
                await assignExistingMandatoryTrainingsToUser(user);
                console.log(`Assigned existing mandatory trainings to new external employee: ${emp.emp_code}`);
            } else {
                console.log(`Updating existing user for employee: ${emp.emp_code}`);
                // Update existing user with latest info from external API
                user.username = emp.name || user.username;
                user.designation = emp.role_name || user.designation;
                // IMPORTANT: Don't update locCode from external API to preserve our branch mapping fix
                // user.locCode = emp.store_name || user.locCode; // COMMENTED OUT
                user.workingBranch = emp.store_name || user.workingBranch;
                user.phoneNumber = emp.phone || user.phoneNumber;
                await user.save();
                console.log('Updated existing user for employee:', emp.emp_code);
            }

            usersInBranch.push(user);
        }

        console.log(`Total users processed: ${usersInBranch.length}`);

        if (usersInBranch.length === 0) {
            return res.status(404).json({ message: "No users found matching the criteria" });
        }

        console.log("Starting training assignment to users...");
        // Assign training and progress to each user
        const updatedUsers = usersInBranch.map(async (user) => {
            console.log(`Assigning training to user: ${user.username} (${user.empID})`);
            
            // Add training details to user
            user.training.push({
                trainingId: newTraining._id,
                deadline: deadlineDate, // Use the fixed deadline Date object
                pass: false,
                status: 'Pending',
            });

            // Create training progress for each user
            const trainingProgress = new TrainingProgress({
                userId: user._id,
                trainingId: newTraining._id,
                   trainingName: trainingName,
                deadline: deadlineDate, // Use the fixed deadline Date object
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
            console.log(`Training progress saved for user: ${user.username}`);
            return user.save();
        });

        console.log("Saving all users...");
        await Promise.all(updatedUsers); // Save all users at once
        console.log("All users saved successfully");

        if (selectedOption === 'user') {
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

            console.log("Creating notification for branches...");
            // Create notification for branch
            const newNotification = await Notification.create({
                title: `New training Created : ${trainingName}`,
                body: `${trainingName} has been successfully created. Created by ${admin?.name}. The training is scheduled to be completed in ${days} days.`,
                branch: workingBranch,  // Pass the branch here
                useradmin: admin?.name,  // Optional
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
        const allowedLocCodes = AdminData.branches.map(branch => branch.locCode);
        const day = new Date();

        // Count documents
        const assessmentCount = await Assessment.countDocuments();
        const userCount = await User.find({ locCode: { $in: allowedLocCodes } });
        console.log('Allowed location codes:', allowedLocCodes);

        // Fetch external employee data to get total employee count
        let totalEmployeeCount = userCount.length; // Default to local user count
        let externalEmployees = [];
        
        try {
            const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:7000'}/api/employee_range`, {
                startEmpId: 'EMP1',
                endEmpId: 'EMP9999'
            }, { timeout: 15000 });
            
            externalEmployees = response.data?.data || [];
            console.log(`Fetched ${externalEmployees.length} external employees`);
            
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
                'GROOMS CALICUT': '13', // Map CALICUT to KOZHIKODE
                'GROOMS KANNUR': '21',
                'GROOMS KALPETTA': '20',
                'ZORUCCI EDAPPAL': '6',
                'ZORUCCI KOTTAKKAL': '8',
                'ZORUCCI PERINTHALMANNA': '7',
                'ZORUCCI EDAPPALLY': '1',
                // Map SUITOR GUY stores to GROOMS equivalents
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
                'SUITOR GUY KALPETTA': '20', // Add missing mappings
                'SUITOR GUY KANNUR': '21'
            };
            
            // Filter external employees by allowed location codes using store name mapping
            const filteredExternalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                const mappedLocCode = storeNameToLocCode[storeName];
                
                if (mappedLocCode && allowedLocCodes.includes(mappedLocCode)) {
                    return true;
                }
                
                // Also check direct location code if available
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            });
            
            totalEmployeeCount = filteredExternalEmployees.length;
            console.log(`Filtered external employees for allowed locations: ${totalEmployeeCount}`);
            console.log(`External employees breakdown by store:`);
            
            // Log breakdown by store
            const storeBreakdown = {};
            filteredExternalEmployees.forEach(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                storeBreakdown[storeName] = (storeBreakdown[storeName] || 0) + 1;
            });
            
            Object.entries(storeBreakdown).forEach(([store, count]) => {
                const locCode = storeNameToLocCode[store] || 'Unknown';
                console.log(`   - ${store} (${locCode}): ${count} employees`);
            });
            
        } catch (error) {
            console.error('Error fetching external employee data:', error.message);
            // Continue with local user count
        }

        // Fetch users once instead of multiple times
        const users = await User.find({ locCode: { $in: allowedLocCodes } });
        const userID = users.map(id => id._id)

        // Calculate average progress from both user.training records AND mandatory trainings (TrainingProgress)
        let totalUserTrainings = 0;
        let completedUserTrainings = 0;
        
        // Pre-fetch all training progress records for these users
        const allTrainingProgress = await TrainingProgress.find({ 
            userId: { $in: userID } 
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
        
        users.forEach(user => {
            // Count assigned trainings from user.training array
            if (user.training && Array.isArray(user.training)) {
                totalUserTrainings += user.training.length;
                completedUserTrainings += user.training.filter(training => training.pass).length;
            }
            
            // Count mandatory trainings from TrainingProgress collection (avoid duplicates)
            const userTrainingProgress = trainingProgressMap.get(user._id.toString()) || [];
            
            // Get assigned training IDs to avoid duplicates
            const assignedTrainingIds = user.training ? 
                user.training.map(t => t.trainingId.toString()) : [];
            
            // Filter out mandatory trainings that are already in assigned trainings
            const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => 
                !assignedTrainingIds.includes(tp.trainingId.toString())
            );
            
            totalUserTrainings += uniqueMandatoryTrainings.length;
            completedUserTrainings += uniqueMandatoryTrainings.filter(tp => tp.pass).length;
        });
        
        // Calculate average progress from user training records
        const averageProgress = totalUserTrainings > 0 ? (completedUserTrainings / totalUserTrainings) * 100 : 0;
        
        console.log(`🔍 Dashboard calculation debug:`);
        console.log(`   - Admin allowed branches: ${allowedLocCodes.length}`);
        console.log(`   - Users in allowed branches: ${users.length}`);
        console.log(`   - Total user trainings: ${totalUserTrainings}`);
        console.log(`   - Completed user trainings: ${completedUserTrainings}`);
        console.log(`   - Average progress: ${averageProgress.toFixed(2)}%`);
        
        const finalAverageProgress = parseFloat(averageProgress.toFixed(2));

        // Calculate assessment progress
        let totalAssessments = 0;
        let passedAssessments = 0;
        let trainingpend = 0;

        users.forEach(user => {
            if (Array.isArray(user.assignedAssessments)) {
                totalAssessments += user.assignedAssessments.length;
                passedAssessments += user.assignedAssessments.filter(
                    item => day > item.deadline && item.pass === false
                ).length;
            }

            // Count overdue assigned trainings from user.training array
            if (Array.isArray(user.training)) {
                trainingpend += user.training.filter(
                    item => day > item.deadline && item.pass === false
                ).length;
            }
            
            // Count overdue mandatory trainings from TrainingProgress collection (avoid duplicates)
            const userTrainingProgress = trainingProgressMap.get(user._id.toString()) || [];
            
            // Get assigned training IDs to avoid duplicates
            const assignedTrainingIds = user.training ? 
                user.training.map(t => t.trainingId.toString()) : [];
            
            // Filter out mandatory trainings that are already in assigned trainings
            const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => 
                !assignedTrainingIds.includes(tp.trainingId.toString())
            );
            
            trainingpend += uniqueMandatoryTrainings.filter(tp => 
                day > tp.deadline && tp.pass === false
            ).length;
        });

        // Get login statistics
        const uniqueLoginUsers = await UserLoginSession.distinct('userId');
        const uniqueLoginUserCount = uniqueLoginUsers.length;
        const totalLogins = await UserLoginSession.countDocuments();
        
        // Get device breakdown
        const deviceStats = await UserLoginSession.aggregate([
            { $group: { _id: '$deviceOS', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Calculate login percentage based on total employee count
        const loginPercentage = totalEmployeeCount > 0 ? Math.round((uniqueLoginUserCount / totalEmployeeCount) * 100) : 0;
        
        // Return results with proper structure
        res.status(200).json({
            success: true,
            data: {
                assessmentCount,
                branchCount: AdminData.branches.length,
                userCount: totalEmployeeCount, // Use total employee count from external API
                localUserCount: userCount.length, // Keep local user count for reference
                averageProgress: finalAverageProgress,
                assessmentProgress: passedAssessments,
                trainingPending: trainingpend,
                // Login statistics
                uniqueLoginUserCount,
                totalLogins,
                loginPercentage,
                deviceStats,
                // Additional info for debugging
                externalEmployeesFetched: externalEmployees.length,
                allowedLocCodes: allowedLocCodes
            },
        });
    } catch (error) {
        console.error('Error calculating progress:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
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
            deadline: days, // Store deadline as a proper Date
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

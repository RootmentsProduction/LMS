import Admin from "../model/Admin.js";
import Assessment from "../model/Assessment.js";
import AssessmentProcess from "../model/Assessmentprocessschema.js";
import Designation from "../model/designation.js";
import Notification from "../model/Notification.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import { Training } from "../model/Traning.js";
import User from "../model/User.js";

// Helper function to convert YouTube URLs to embed format
const convertToEmbedUrl = (url) => {
    if (!url) return '';
    
    
    // Handle different YouTube URL formats
    let videoId = '';
    
    // Regular YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1];
    }
    // YouTube short URL: https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
    }
    // YouTube embed URL: https://www.youtube.com/embed/VIDEO_ID
    else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1];
    }
    
    // Remove any additional parameters
    if (videoId && videoId.includes('&')) {
        videoId = videoId.split('&')[0];
    }
    
    // Return embed URL if we found a video ID
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Return original URL if it's not a YouTube URL
    return url;
};

export const AssignToUserAssessment = async (req, res) => {
    try {
        const { id } = req.params;

    } catch (error) {
        res.status(500).json({
            message: "internal sever error"
        })
    }
}

export const TrainingDetails = async (req, res) => {
    try {
        const { id } = req.params; // Get the training ID from the URL parameter

        // Fetch the training details
        const training = await Training.findById(id);
        if (!training) {
            return res.status(404).json({ message: "Training not found" });
        }

        // Fetch users from both assigned and mandatory training sources
        // 1. Users with training assigned in user.training array
        const usersWithAssignedTraining = await User.find({ 'training.trainingId': id }).populate('training.trainingId');
        
        // 2. Users with mandatory training in TrainingProgress collection
        const trainingProgressRecords = await TrainingProgress.find({ trainingId: id }).populate('userId');
        
        // Combine and deduplicate users
        const allUserIds = new Set();
        const users = [];
        
        // Add users from assigned training
        usersWithAssignedTraining.forEach(user => {
            if (!allUserIds.has(user._id.toString())) {
                allUserIds.add(user._id.toString());
                users.push(user);
            }
        });
        
        // Add users from mandatory training progress
        trainingProgressRecords.forEach(record => {
            if (record.userId && !allUserIds.has(record.userId._id.toString())) {
                allUserIds.add(record.userId._id.toString());
                users.push(record.userId);
            }
        });

        console.log(`Found ${users.length} total users for training ${id} (${usersWithAssignedTraining.length} assigned, ${trainingProgressRecords.length} mandatory)`);

        // Declare uniqueBranches set to store distinct branches
        const uniqueBranches = new Set();
        const uniquedesignation = new Set();
        // Fetch the progress details from the TrainingProgress collection
        const progressDetails = await Promise.all(
            users.map(async (user) => {
                const progress = await TrainingProgress.findOne({ userId: user._id, trainingId: id });

                if (!progress) {
                    // Filter user training details by specific ID
                    const filteredTraining = user.training ? user.training.filter(t => t.trainingId.toString() === id) : [];
                    
                    return {
                        userId: user._id,
                        userName: user.username || user.fullName,
                        userEmail: user.email,
                        progress: 0, // No progress if no record is found
                        moduleCompletion: 0,
                        user: { 
                            ...user._doc, 
                            training: filteredTraining
                        },
                    };
                }

                let totalModules = 0;
                let completedModules = 0;
                let totalVideos = 0;
                let passedVideos = 0;

                // Loop through each module and its videos to calculate the completion
                progress.modules.forEach(module => {
                    totalModules += 1;

                    module.videos.forEach(video => {
                        totalVideos += 1;
                        if (video.pass) {
                            passedVideos += 1;
                        }
                    });

                    // If all videos in the module are passed, increase the completedModules count
                    const moduleCompletion = module.videos.length > 0 && module.videos.every(video => video.pass);
                    if (moduleCompletion) {
                        completedModules += 1;
                    }
                });

                // Calculate the overall completion percentage for the training
                const completionPercentage = totalVideos > 0 ? Math.round((passedVideos / totalVideos) * 100) : 0;
                const moduleCompletionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

                // Add unique working branches to the set
                uniqueBranches.add(user.workingBranch);
                uniquedesignation.add(user.designation);
                
                // Filter user training details by specific ID
                let filteredTraining = user.training ? user.training.filter(t => t.trainingId.toString() === id) : [];
                
                // If no training found in user.training but we have progress (mandatory training),
                // create a training object with deadline from TrainingProgress
                if (filteredTraining.length === 0 && progress.deadline) {
                    filteredTraining = [{
                        trainingId: id,
                        deadline: progress.deadline,
                        pass: progress.pass || false,
                        status: progress.pass ? 'Completed' : 'Pending'
                    }];
                } else if (filteredTraining.length > 0 && progress.deadline) {
                    // Ensure the training has the deadline from TrainingProgress if it's missing
                    filteredTraining[0].deadline = progress.deadline;
                }
                
                return {
                    user: { ...user._doc, training: filteredTraining },
                    userEmail: user.email, // Populated email field
                    progress: completionPercentage, // Overall progress based on videos
                    moduleCompletion: moduleCompletionPercentage, // Completion based on modules
                };
            })
        );

        // Return the training details and the users' progress
        return res.status(200).json({
            training, // The training details
            progressDetails, // User progress details
            uniqueBranches: Array.from(uniqueBranches),
            uniquedesignation: Array.from(uniquedesignation)// Convert set to array
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const AssessmentAssign = async (req, res) => {
    try {
        const { assessmentId, assignedTo, days, selectedOption, Reassign } = req.body;
        console.log(assessmentId, assignedTo, days, selectedOption, Reassign);

        const AdminID = req.admin.userId;
        const AdminData = await Admin.findById(AdminID).populate("permissions");

        if (!AdminData || !AdminData.permissions.length) {
            return res.status(403).json({
                message: "No permissions found for this admin",
            });
        }
        // console.log();


        // Extract first permission object
        const adminPermissions = AdminData.permissions[0];

        if (!AdminData.permissions[0].permissions.canCreateAssessment) {
            return res.status(401).json({
                message: "You have no permission",
            });
        }
        // Validate input
        if (!assessmentId || !assignedTo || !Array.isArray(assignedTo) || assignedTo.length === 0 || !days) {
            return res.status(400).json({ message: "All fields are required and 'assignedTo' must be a non-empty array." });
        }

        // Calculate deadline
        const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const results = [];

        // Process assignments based on the selected option
        if (selectedOption === 'user') {
            for (const userId of assignedTo) {
                const user = await User.findById(userId);

                if (!user) {
                    results.push({ userId, message: "User not found." });
                    continue;
                }

                const assessmentIds = Array.isArray(assessmentId) ? assessmentId : [assessmentId];

                for (const id of assessmentIds) {
                    const alreadyAssigned = user.assignedAssessments.some(
                        (assessment) => assessment.assessmentId.toString() === id.toString()
                    );

                    if (Reassign) {
                        // Remove existing assignment if reassignment is enabled
                        if (alreadyAssigned) {
                            user.assignedAssessments = user.assignedAssessments.filter(
                                (assessment) => assessment.assessmentId.toString() !== id.toString()
                            );
                            await user.save();

                            await AssessmentProcess.deleteOne({ userId: user._id, assessmentId: id });

                            results.push({
                                userId,
                                assessmentId: id,
                                message: "Old assessment removed and reassigned.",
                            });
                        }
                    } else if (alreadyAssigned) {
                        // Skip assignment if reassignment is disabled and already assigned
                        results.push({
                            userId,
                            assessmentId: id,
                            message: "Assessment already assigned and Reassign is disabled.",
                        });
                        continue;
                    }

                    // Assign the new assessment
                    user.assignedAssessments.push({
                        assessmentId: id,
                        deadline,
                        status: 'Pending',
                    });

                    await user.save();

                    const assessment = await Assessment.findById(id);
                    if (!assessment) {
                        results.push({ userId, assessmentId: id, message: "Assessment not found." });
                        continue;
                    }

                    const answers = assessment.questions.map((question) => ({
                        questionId: question._id,
                        correctAnswer: question.correctAnswer,
                        isCorrect: false,
                    }));

                    const newAssessmentProcess = new AssessmentProcess({
                        userId,
                        assessmentId: id,
                        answers,
                        status: 'Pending',
                    });

                    await newAssessmentProcess.save();

                    results.push({
                        userId,
                        message: "Assessment assigned successfully.",
                        user,
                        assessmentProcess: newAssessmentProcess,
                    });
                }
            }
        }

        if (selectedOption === 'branch') {
            for (const locCode of assignedTo) {
                const users = await User.find({ locCode });
                if (users.length === 0) {
                    results.push({ locCode, message: "No users found for this location." });
                    continue;
                }

                const assessmentIds = Array.isArray(assessmentId) ? assessmentId : [assessmentId];

                for (const user of users) {
                    for (const id of assessmentIds) {
                        const alreadyAssigned = user.assignedAssessments.some(
                            (assessment) => assessment.assessmentId.toString() === id.toString()
                        );

                        if (Reassign) {
                            if (alreadyAssigned) {
                                user.assignedAssessments = user.assignedAssessments.filter(
                                    (assessment) => assessment.assessmentId.toString() !== id.toString()
                                );
                                await user.save();

                                await AssessmentProcess.deleteOne({ userId: user._id, assessmentId: id });

                                results.push({
                                    userId: user._id,
                                    assessmentId: id,
                                    message: "Old assessment removed and reassigned.",
                                });
                            }
                        } else if (alreadyAssigned) {
                            results.push({
                                userId: user._id,
                                assessmentId: id,
                                message: "Assessment already assigned and Reassign is disabled.",
                            });
                            continue;
                        }

                        user.assignedAssessments.push({
                            assessmentId: id,
                            deadline,
                            status: 'Pending',
                        });

                        await user.save();

                        const assessment = await Assessment.findById(id);
                        if (!assessment) {
                            results.push({ userId: user._id, assessmentId: id, message: "Assessment not found." });
                            continue;
                        }

                        const answers = assessment.questions.map((question) => ({
                            questionId: question._id,
                            correctAnswer: question.correctAnswer,
                            isCorrect: false,
                        }));

                        const newAssessmentProcess = new AssessmentProcess({
                            userId: user._id,
                            assessmentId: id,
                            answers,
                            status: 'Pending',
                        });

                        await newAssessmentProcess.save();

                        results.push({
                            userId: user._id,
                            message: "Assessment assigned successfully.",
                            user,
                            assessmentProcess: newAssessmentProcess,
                        });
                    }
                }
            }
        }

        if (selectedOption === 'designation') {
            for (const designationId of assignedTo) {
                const designation = await Designation.findById(designationId);
                if (!designation) {
                    results.push({ designationId, message: "Designation not found." });
                    continue;
                }

                const users = await User.find({ designation: designation.designation });
                if (users.length === 0) {
                    results.push({ designationId, message: "No users found for this designation." });
                    continue;
                }

                const assessmentIds = Array.isArray(assessmentId) ? assessmentId : [assessmentId];

                for (const user of users) {
                    for (const id of assessmentIds) {
                        const alreadyAssigned = user.assignedAssessments.some(
                            (assessment) => assessment.assessmentId.toString() === id.toString()
                        );

                        if (Reassign) {
                            if (alreadyAssigned) {
                                user.assignedAssessments = user.assignedAssessments.filter(
                                    (assessment) => assessment.assessmentId.toString() !== id.toString()
                                );
                                await user.save();

                                await AssessmentProcess.deleteOne({ userId: user._id, assessmentId: id });

                                results.push({
                                    userId: user._id,
                                    assessmentId: id,
                                    message: "Old assessment removed and reassigned.",
                                });
                            }
                        } else if (alreadyAssigned) {
                            results.push({
                                userId: user._id,
                                assessmentId: id,
                                message: "Assessment already assigned and Reassign is disabled.",
                            });
                            continue;
                        }

                        user.assignedAssessments.push({
                            assessmentId: id,
                            deadline,
                            status: 'Pending',
                        });

                        await user.save();

                        const assessment = await Assessment.findById(id);
                        if (!assessment) {
                            results.push({ userId: user._id, assessmentId: id, message: "Assessment not found." });
                            continue;
                        }

                        const answers = assessment.questions.map((question) => ({
                            questionId: question._id,
                            correctAnswer: question.correctAnswer,
                            isCorrect: false,
                        }));

                        const newAssessmentProcess = new AssessmentProcess({
                            userId: user._id,
                            assessmentId: id,
                            answers,
                            status: 'Pending',
                        });

                        await newAssessmentProcess.save();

                        results.push({
                            userId: user._id,
                            message: "Assessment assigned successfully.",
                            user,
                            assessmentProcess: newAssessmentProcess,
                        });
                    }
                }
            }
        }

        res.status(200).json({
            message: "Assessment assignment process completed.",
            results,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
};


export const FindOverDueAssessment = async (req, res) => {
    try {
        const AdminId = req.admin?.userId;
        if (!AdminId) {
            return res.status(400).json({ message: "Admin ID not found" });
        }

        const AdminBranch = await Admin.findById(AdminId).populate('branches').lean();
        if (!AdminBranch || !AdminBranch.branches) {
            return res.status(404).json({ message: "Admin branches not found" });
        }

        const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);
        const currentDate = new Date(); // Standardized for comparison

        const DueAssessment = await User.find({
            locCode: { $in: allowedLocCodes },
            assignedAssessments: {
                $elemMatch: {
                    pass: false,
                    deadline: { $lt: currentDate } // Proper date comparison
                }
            }
        })
            .populate("assignedAssessments.assessmentId")
            .select("name email empID username designation workingBranch assignedAssessments")
            .lean(); // Improve performance

        if (!DueAssessment || DueAssessment.length === 0) {
            return res.status(204).json({ message: "No overdue assessments found" });
        }

        // Filter overdue assessments
        const filterData = DueAssessment.map(user => ({
            userId: user._id,
            empID: user.empID || "N/A",
            userName: user.username || user.name || "Unknown", // Fallback name
            role: user.designation || "Not Specified",
            workingBranch: user.workingBranch || "N/A",
            overdueAssessments: user.assignedAssessments.filter(
                (item) => item.pass === false && new Date(item.deadline) < currentDate
            )
        })).filter(user => user.overdueAssessments.length > 0);

        if (filterData.length === 0) {
            return res.status(204).json({ message: "No overdue assessments found" });
        }

        res.status(200).json({
            message: "Overdue assessments found",
            data: filterData
        });

    } catch (error) {
        console.error("Error finding overdue assessments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const FindOverDueTraining = async (req, res) => {
    try {
        const AdminId = req.admin?.userId;
        if (!AdminId) {
            return res.status(400).json({ message: "Admin ID not found" });
        }
        console.log("ADMIN ID ID " + AdminId);

        // Find admin and get branches
        const AdminBranch = await Admin.findById(AdminId).populate('branches').lean();
        if (!AdminBranch || !AdminBranch.branches) {
            return res.status(404).json({ message: "Admin branches not found" });
        }
        console.log(AdminBranch);

        const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);
        const currentDate = new Date();

        // Get all users in allowed branches
        const users = await User.find({ locCode: { $in: allowedLocCodes } });
        console.log(`Found ${users.length} users in allowed branches`);

        if (users.length === 0) {
            return res.status(200).json({
                message: "No users found in admin branches",
                data: []
            });
        }

        const userIDs = users.map(user => user._id);
        
        // Find overdue trainings from BOTH sources:
        // 1. Assigned trainings in User.training array
        // 2. Mandatory trainings in TrainingProgress collection
        
        const userWithOverdueTrainings = await User.find({
            locCode: { $in: allowedLocCodes },
            training: {
                $elemMatch: {
                    pass: false,
                    deadline: { $lt: currentDate }
                }
            }
        }).populate("training.trainingId").lean();

        // Get overdue mandatory trainings from TrainingProgress collection
        const overdueTrainingProgress = await TrainingProgress.find({
            userId: { $in: userIDs },
            pass: false,
            deadline: { $lt: currentDate }
        }).populate('trainingId userId').lean();

        console.log(`Found ${userWithOverdueTrainings.length} users with overdue assigned trainings`);
        console.log(`Found ${overdueTrainingProgress.length} overdue mandatory training records`);

        // Combine data from both sources
        const userMap = new Map();
        
        // Process assigned trainings
        userWithOverdueTrainings.forEach(user => {
            if (!userMap.has(user._id.toString())) {
                userMap.set(user._id.toString(), {
                    userId: user._id,
                    empID: user.empID,
                    userName: user.username,
                    role: user.designation,
                    workingBranch: user.workingBranch,
                    overdueAssessments: []
                });
            }
            
            const overdueAssignedTrainings = user.training.filter(
                (item) => item.pass === false && new Date(item.deadline) < currentDate
            );
            
            const currentData = userMap.get(user._id.toString());
            currentData.overdueAssessments.push(...overdueAssignedTrainings);
        });

        // Process mandatory trainings
        overdueTrainingProgress.forEach(progress => {
            const userId = progress.userId._id.toString();
            
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    userId: progress.userId._id,
                    empID: progress.userId.empID,
                    userName: progress.userId.username,
                    role: progress.userId.designation,
                    workingBranch: progress.userId.workingBranch,
                    overdueAssessments: []
                });
            }
            
            const currentData = userMap.get(userId);
            currentData.overdueAssessments.push({
                trainingId: progress.trainingId,
                deadline: progress.deadline,
                pass: false
            });
        });

        // Filter users with actual overdue assessments and convert Map to array
        const filterData = Array.from(userMap.values())
            .filter(user => user.overdueAssessments.length > 0)
            .map(user => ({
                ...user,
                overdueAssessments: user.overdueAssessments.filter(assessment => 
                    assessment.trainingId != null // Ensure trainingId exists
                )
            }))
            .filter(user => user.overdueAssessments.length > 0); // Final filter

        console.log(`Final result: ${filterData.length} users with overdue trainings`);

        if (filterData.length === 0) {
            return res.status(200).json({
                message: "No overdue trainings found",
                data: []
            });
        }

        return res.status(200).json({
            message: "Overdue trainings found",
            data: filterData
        });

    } catch (error) {
        console.error("Error finding overdue trainings:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export const SendNotification = async (req, res) => {
    try {
        const { empId } = req.params;
        console.log("Employee ID:", empId);

        const admin = req.admin;
        console.log("Admin:", admin);

        const day = new Date(); // Current date

        // Find the user
        const user = await User.findOne({ empID: empId });

        if (!user) {
            return res.status(400).json({
                message: "Employee not found.",
            });
        }

        // Get overdue trainings from BOTH sources:
        // 1. Assigned trainings in User.training array
        // 2. Mandatory trainings in TrainingProgress collection

        const overdueAssignedTrainings = user.training.filter(
            (item) => item.pass === false && new Date(item.deadline) < day
        );

        const overdueMandatoryTrainings = await TrainingProgress.find({
            userId: user._id,
            pass: false,
            deadline: { $lt: day }
        }).populate('trainingId');

        console.log(`Found ${overdueAssignedTrainings.length} overdue assigned trainings`);
        console.log(`Found ${overdueMandatoryTrainings.length} overdue mandatory trainings`);

        // Combine all overdue trainings
        const allOverdueTrainings = [
            ...overdueAssignedTrainings.map(t => ({
                trainingName: t.trainingId?.trainingName || "Unnamed Training",
                source: 'assigned'
            })),
            ...overdueMandatoryTrainings.map(t => ({
                trainingName: t.trainingId?.trainingName || "Unnamed Training",
                source: 'mandatory'
            }))
        ];

        if (allOverdueTrainings.length === 0) {
            return res.status(400).json({
                message: "No overdue trainings found for this employee.",
            });
        }

        // Extract training names
        const trainingNames = allOverdueTrainings.map(t => t.trainingName);
        const uniqueTrainingNames = [...new Set(trainingNames)]; // Remove duplicates

        // Create a notification
        await Notification.create({
            title: `${user.username} has overdue training tasks`,
            body: `You need to complete ${uniqueTrainingNames.length} training tasks: ${uniqueTrainingNames.join(
                ", "
            )}. Notification sent by ${admin.username}.`,
            user: user._id,
            useradmin: admin.username,
        });

        // Response
        res.status(200).json({
            message: `Notification sent successfully to ${user.username}`,
            overdueTrainings: uniqueTrainingNames,
            count: uniqueTrainingNames.length
        });
    } catch (error) {
        console.error("Error finding overdue trainings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export const SendNotificationAssessment = async (req, res) => {
    try {
        const { empId } = req.params;
        console.log("Employee ID:", empId);

        const admin = req.admin;
        console.log("Admin:", admin);

        const day = new Date(); // Current date

        // Find the user with overdue assessments
        const DueAssessment = await User.findOne({
            empID: empId,
            assignedAssessments: {
                $elemMatch: {
                    pass: false, // Condition: pass is false
                    deadline: { $lt: day }, // Condition: deadline is in the past
                },
            },
        }).populate("assignedAssessments.assessmentId");

        if (!DueAssessment) {
            return res.status(400).json({
                message: "No due assessments found for this employee.",
            });
        }

        // Filter overdue assessments
        const overdueAssessments = DueAssessment.assignedAssessments.filter(
            (item) => item.pass === false && item.deadline < day
        );

        if (overdueAssessments.length === 0) {
            return res.status(400).json({
                message: "No overdue assessments found for this employee.",
            });
        }

        // Extract training names
        const trainingNames = overdueAssessments.map(
            (assessment) => assessment.assessmentId?.title || "Unnamed Training"
        );

        // Create a notification
        await Notification.create({
            title: `${DueAssessment.username} has overdue Assessment tasks`,
            body: `You need to complete ${trainingNames.length} Assessment tasks: ${trainingNames.join(
                ", "
            )}. Notification sent by ${admin.username}.`,
            user: DueAssessment._id,
            useradmin: admin.username,
            category: "Assessment"
        });

        // Response
        res.status(200).json({
            message: `Notification sent successfully to ${DueAssessment.username}`,
            overdueTrainings: trainingNames,
        });
    } catch (error) {
        console.error("Error finding overdue assessments:", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
};


export const CreateNotification = async (req, res) => {
    try {
        const { deliveryMethod, message, recipient, role, title } = req.body;

        // Log the received data for debugging
        console.log({ deliveryMethod, message, recipient, role, title });

        // Validate required fields
        if (!deliveryMethod || !message || !recipient || !role || !title) {
            return res.status(400).json({
                message: "All fields are required.",
            });
        }

        // Define admin (example: fetching admin from req.user)
        const admin = req.user || { username: "Admin" };

        // Prepare the base notification object
        const notificationData = {
            title: title,
            body: message,
            useradmin: admin.username,
            category: "Created",
        };

        // Dynamically assign the correct field based on the role
        if (role === "branch") {
            notificationData.branch = recipient; // Assign to branch
        } else if (role === "user") {
            notificationData.user = recipient; // Assign to user
        } else {
            notificationData.Role = recipient; // Assign to custom role
        }

        // Create the notification
        const notification = await Notification.create(notificationData);

        // Respond with success
        return res.status(201).json({
            message: "Notification created successfully.",
            notification,
        });
    } catch (error) {
        console.error("Error creating notification:", error.message);
        return res.status(500).json({
            message: "Internal server error.",
            error: error.message,
        });
    }
};

export const GetTrainingDetailsSimple = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query; // Get userId from query parameters
        console.log('🔍 Getting training details for ID:', id, 'User ID:', userId);

        // Fetch the training details with modules and videos
        const training = await Training.findById(id).populate({
            path: 'modules',
            populate: {
                path: 'videos'
            }
        });

        if (!training) {
            console.log('❌ Training not found for ID:', id);
            return res.status(404).json({ 
                success: false,
                message: "Training not found" 
            });
        }

        console.log('✅ Training found:', training.name);
        console.log('📊 Modules count:', training.modules?.length || 0);

        // Get user's training progress if userId is provided
        let userProgress = null;
        if (userId) {
            userProgress = await TrainingProgress.findOne({ 
                userId: userId, 
                trainingId: id 
            });
            console.log('🔍 User progress found:', !!userProgress);
        }

        // Transform the data to match frontend expectations
        const transformedTraining = {
            _id: training._id,
            name: training.trainingName, // Use correct field name
            description: training.description,
            type: training.Trainingtype || 'assigned',
            modules: training.modules?.map(module => {
                // Find module progress
                const moduleProgress = userProgress?.modules?.find(mp => 
                    mp.moduleId.toString() === module._id.toString()
                );
                
                return {
                    _id: module._id,
                    name: module.moduleName, // Use correct field name
                    description: module.description,
                    order: module.order,
                    completed: moduleProgress?.pass || false,
                    videos: module.videos?.map(video => {
                        // Find video progress
                        const videoProgress = moduleProgress?.videos?.find(vp => 
                            vp.videoId.toString() === video._id.toString()
                        );
                        
                        return {
                            _id: video._id,
                            title: video.title,
                            description: video.description || '',
                            videoUrl: convertToEmbedUrl(video.videoUri), // Convert to embed URL
                            originalUrl: video.videoUri, // Keep original URL for reference
                            duration: video.duration || 0,
                            completed: videoProgress?.pass || false
                        };
                    }) || []
                };
            }) || []
        };

        console.log('✅ Returning training details with', transformedTraining.modules.length, 'modules');

        return res.status(200).json({
            success: true,
            message: "Training details retrieved successfully",
            data: transformedTraining
        });

    } catch (error) {
        console.error('❌ Error getting training details:', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message 
        });
    }
};

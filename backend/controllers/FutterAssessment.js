import Admin from "../model/Admin.js";
import Permission from "../model/AdminPermission.js";
import Assessment from "../model/Assessment.js";
import AssessmentProcess from "../model/Assessmentprocessschema.js";
import Branch from "../model/Branch.js";
import Notification from "../model/Notification.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import { Training } from "../model/Traning.js";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import Walkin from "../model/Walkin.js";
import Task from "../model/Task.js";
import mongoose from 'mongoose';
import { getAccessibleStoreIds, isFullAccessAdmin, buildWalkinFilter, buildTaskFilter } from '../lib/permissions.js';

export const UserAssessmentGet = async (req, res) => {
    try {
        const { empID } = req.query; // Changed from email to empID

        if (!empID) {
            return res.status(400).json({
                message: "Employee ID is required"
            });
        }

        const userAssessment = await User.findOne({ empID }).populate({
            path: 'assignedAssessments.assessmentId',
            select: '-questions', // Excludes the 'questions' field
        }).select('-training');

        if (!userAssessment) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "OK",
            data: userAssessment
        });
    } catch (error) {
        console.error(error);  // Log the error for debugging purposes
        res.status(500).json({
            message: "Internal server error",
            error: error.message  // Optionally include the error message
        });
    }
};

export const Usergetquestions = async (req, res) => {
    try {
        const { userId, assessmentId } = req.query;
        console.log(userId, assessmentId);

        const userAssessment = await User.findOne(
            {
                _id: userId,
                "assignedAssessments.assessmentId": assessmentId
            },
            {
                _id: 1,
                username: 1,
                email: 1,
                locCode: 1,
                empID: 1,
                designation: 1,
                workingBranch: 1,
                "assignedAssessments.$": 1,
                // Select only the specific matching assignedAssessment
            }
        ).populate({
            path: 'assignedAssessments.assessmentId',
        });
        if (!userAssessment) {
            return res.status(404).json({
                message: "NO Question found"
            })

        }
        res.status(200).json({
            message: "Data fetch successfull ",
            data: userAssessment
        })
    } catch (error) {
        console.error(error);  // Log the error for debugging purposes
        res.status(500).json({
            message: "Internal server error",
            error: error.message  // Optionally include the error message
        });

    }
}

export const GetAssessmentFullDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Assessment ID is required" });
        }

        const assessment = await Assessment.findById(id);
        if (!assessment) {
            return res.status(404).json({ message: "Assessment not found" });
        }

        const assignedUsers = await User.find({ "assignedAssessments.assessmentId": id })
            .select({
                _id: 1,
                username: 1,
                email: 1,
                empID: 1,
                designation: 1,
                workingBranch: 1,
                locCode: 1,
                assignedAssessments: { $elemMatch: { assessmentId: id } },
            });

        const assessmentProcesses = await AssessmentProcess.find({ assessmentId: id })
            .populate({
                path: "userId",
                select: "_id username email empID designation workingBranch locCode",
            });

        const processMap = new Map(
            assessmentProcesses.map((process) => [String(process.userId?._id || process.userId), process])
        );

        const users = assignedUsers.map((user) => {
            const assignedAssessment = user.assignedAssessments?.[0] || null;
            const process = processMap.get(String(user._id)) || null;

            return {
                _id: user._id,
                username: user.username,
                email: user.email,
                empID: user.empID,
                designation: user.designation,
                workingBranch: user.workingBranch,
                locCode: user.locCode,
                assignedAssessment: assignedAssessment
                    ? {
                        assessmentId: assignedAssessment.assessmentId,
                        deadline: assignedAssessment.deadline,
                        pass: assignedAssessment.pass,
                        status: assignedAssessment.status,
                        complete: assignedAssessment.complete,
                    }
                    : null,
                attempt: process
                    ? {
                        _id: process._id,
                        status: process.status,
                        totalMarks: process.totalMarks,
                        passed: process.passed,
                        answers: process.answers,
                        createdAt: process.createdAt,
                        updatedAt: process.updatedAt,
                    }
                    : null,
            };
        });

        const totalAssigned = users.length;
        const totalCompleted = users.filter((user) => {
            const status = String(user.assignedAssessment?.status || "").toLowerCase();
            return status === "completed";
        }).length;
        const totalPassed = users.filter((user) => Boolean(user.assignedAssessment?.pass) || Boolean(user.attempt?.passed)).length;
        const completionPercentage = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

        return res.status(200).json({
            message: "Assessment full details fetched successfully",
            data: {
                assessment: {
                    _id: assessment._id,
                    title: assessment.title,
                    duration: assessment.duration,
                    deadline: assessment.deadline,
                    state: assessment.state,
                    questions: assessment.questions,
                    createdAt: assessment.createdAt,
                    updatedAt: assessment.updatedAt,
                },
                users,
                stats: {
                    totalAssigned,
                    totalCompleted,
                    totalPassed,
                    completionPercentage,
                    questionsCount: assessment.questions?.length || 0,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching full assessment details:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const userAssessmentUpdate = async (req, res) => {
    try {
        const { userId, assessmentId, questions } = req.body;

        console.log("User ID:", userId);
        console.log("Assessment ID:", assessmentId);

        // Find the assessment process for the user and specific assessment
        const assessmentProcess = await AssessmentProcess.findOne({
            userId,
            assessmentId,
        });

        if (!assessmentProcess) {
            return res.status(404).json({ message: "Assessment not found" });
        }

        // Iterate over the user's submitted answers and validate them
        for (const userQuestion of questions) {
            const assessmentQuestion = assessmentProcess.answers.find(
                (a) => a.questionId.toString() === userQuestion.questionId
            );

            if (assessmentQuestion) {
                // Update the answer details
                assessmentQuestion.selectedAnswer = userQuestion.selectedAnswer || "";
                assessmentQuestion.isCorrect =
                    assessmentQuestion.correctAnswer === assessmentQuestion.selectedAnswer;
            }
        }

        // Calculate total marks (count of correct answers)
        const totalCorrect = assessmentProcess.answers.filter((a) => a.isCorrect).length;

        // Calculate the total marks out of 100
        const totalMarks = (totalCorrect / assessmentProcess.answers.length) * 100;

        // Set the 'passed' field as a boolean based on the number of correct answers
        const passingThreshold = 50; // Passing threshold is 50%
        assessmentProcess.passed = totalMarks >= passingThreshold;

        // Update the 'totalMarks' field (if exists in the schema)
        assessmentProcess.totalMarks = totalMarks; // Update the totalMarks field directly

        // Save the updated assessment process
        await assessmentProcess.save();

        // Update the user's assigned assessment
        const user = await User.findOne({ _id: userId, "assignedAssessments.assessmentId": assessmentId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find the specific assignedAssessment to update
        const assignedAssessment = user.assignedAssessments.find(
            (assessment) => assessment.assessmentId.toString() === assessmentId
        );

        if (assignedAssessment) {
            // Update the assigned assessment details
            assignedAssessment.status = 'Completed';
            assignedAssessment.complete = totalMarks;
            assignedAssessment.pass = totalMarks >= passingThreshold;
        }

        // Save the updated user
        await user.save();

        res.status(200).json({
            message: "Assessment updated successfully",
            data: assessmentProcess,
        });
    } catch (error) {
        console.error("Error updating assessment:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Helper function to assign mandatory trainings to a user
const assignMandatoryTrainingsToUser = async (user) => {
    try {
        console.log(`Checking mandatory trainings for user: ${user.empID} with designation: ${user.designation}`);
        
        // Function to flatten a string (remove spaces and lowercase)
        const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');
        
        // Flatten input designation
        const flatDesignation = flatten(user.designation);
        
        // Step 1: Fetch all mandatory trainings
        const allTrainings = await Training.find({
            Trainingtype: 'Mandatory'
        }).populate('modules');
        
        // Step 2: Filter in JS using flattened comparison
        const mandatoryTraining = allTrainings.filter(training =>
            training.Assignedfor.some(role => flatten(role) === flatDesignation)
        );
        
        console.log(`Found ${mandatoryTraining.length} mandatory trainings for designation: ${user.designation}`);
        
        if (mandatoryTraining.length === 0) {
            console.log(`No mandatory trainings found for designation: ${user.designation}`);
            return;
        }
        
        // Create TrainingProgress for each mandatory training
        const trainingAssignments = mandatoryTraining.map(async (training) => {
            // Use the training's actual deadline instead of hardcoded 30 days
            const deadlineDate = new Date(Date.now() + training.deadline * 24 * 60 * 60 * 1000);
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
                trainingName: training.trainingName,
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

export const GetAllUserDetailes = async (req, res) => {
    console.log('GetAllUserDetailes called with empID:', req.params.id);

    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            console.error('Database not connected. Ready state:', mongoose.connection.readyState);
            return res.status(500).json({
                message: "Database connection error"
            });
        }

        const { id } = req.params;
        const empID = id;
        
        console.log('Searching for user with empID:', empID);
        
        let userData = await User.findOne({ empID })
            .populate({
                path: 'training.trainingId',
                select: '-questions' // Exclude questions field to reduce payload
            })
            .populate({
                path: 'assignedAssessments.assessmentId',
                select: '-questions' // Exclude questions field to reduce payload
            });
            
        // If user not found in database, try to fetch from external API and create user
        if (!userData) {
            console.log('User not found in database, trying external API for empID:', empID);
            
            try {
                // Fetch directly from external API (avoid self-referencing)
                const axios = (await import('axios')).default;
                const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
                const response = await axios.post('https://rootments.in/api/employee_range', {
                    startEmpId: empID,
                    endEmpId: empID
                }, { 
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
                    }
                });
                
                const externalEmployee = response.data?.data?.[0];
                if (!externalEmployee) {
                    console.log('Employee not found in external API:', empID);
                    return res.status(404).json({
                        message: "Employee not found"
                    });
                }
                
                // Create new user from external data
                console.log('Creating new user from external data:', externalEmployee.name);
                
                // Handle locCode properly - provide fallback for empty values
                let locCode = externalEmployee.store_code || '';
                if (!locCode || locCode.trim() === '') {
                    // If no store_code, try to map from store_name
                    const storeNameToLocCode = {
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
                        'SUITOR GUY MANJERY': '18',
                        'SUITOR GUY KOTTAKKAL': '17',
                        'SUITOR GUY KOZHIKODE': '13',
                        'SUITOR GUY CALICUT': '13',
                        'SUITOR GUY KANNUR': '21',
                        'SUITOR GUY KALPETTA': '20',
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
                    
                    const storeName = externalEmployee.store_name?.toUpperCase() || '';
                    locCode = storeNameToLocCode[storeName] || '1'; // Default to '1' if no mapping found
                    console.log(`Mapped store "${externalEmployee.store_name}" to locCode: ${locCode}`);
                }
                
                userData = new User({
                    username: externalEmployee.name || '',
                    email: externalEmployee.email || `${empID}@company.com`,
                    empID: empID,
                    designation: externalEmployee.role_name || '',
                    workingBranch: externalEmployee.store_name || 'No Store',
                    locCode: locCode,
                    phoneNumber: externalEmployee.phone || '',
                    source: 'external-sync',
                    training: [],
                    assignedAssessments: []
                });
                
                await userData.save();
                console.log('New user created successfully:', empID);
                
                // Auto-assign mandatory trainings to the new user
                await assignMandatoryTrainingsToUser(userData);
                
                // Refresh user data with populated fields
                userData = await User.findOne({ empID })
                    .populate({
                        path: 'training.trainingId',
                        select: '-questions'
                    })
                    .populate({
                        path: 'assignedAssessments.assessmentId',
                        select: '-questions'
                    });
                    
            } catch (externalError) {
                console.error('Error fetching from external API:', externalError);
                return res.status(404).json({
                    message: "Employee not found in database or external system"
                });
            }
        } else {
            // User exists in database, but check if they have mandatory trainings assigned
            const existingProgress = await TrainingProgress.find({ userId: userData._id });
            if (existingProgress.length === 0) {
                console.log('Existing user has no mandatory trainings, assigning them now...');
                await assignMandatoryTrainingsToUser(userData);
            }
        }

        console.log('User found, fetching mandatory trainings for userId:', userData._id);

        // Get mandatory trainings from TrainingProgress collection
        const mandatoryTrainings = await TrainingProgress.find({ userId: userData._id })
            .populate({
                path: 'trainingId',
                select: '-questions' // Exclude questions field to reduce payload
            });

        console.log('Found mandatory trainings:', mandatoryTrainings.length);

        // Get assigned training IDs to avoid duplicates
        const assignedTrainingIds = userData.training ? 
            userData.training.map(t => t.trainingId ? t.trainingId.toString() : null).filter(Boolean) : [];

        // Filter out mandatory trainings that are already in assigned trainings
        const uniqueMandatoryTrainings = mandatoryTrainings.filter(tp => 
            tp.trainingId && !assignedTrainingIds.includes(tp.trainingId.toString())
        );

        // Convert mandatory trainings to the same format as assigned trainings
        const mandatoryTrainingsFormatted = uniqueMandatoryTrainings.map(tp => ({
            trainingId: tp.trainingId,
            deadline: tp.deadline,
            pass: tp.pass,
            status: tp.pass ? 'Completed' : 'Pending',
            isMandatory: true // Flag to identify mandatory trainings
        }));

        // Combine assigned and mandatory trainings
        const allTrainings = [
            ...(userData.training || []),
            ...mandatoryTrainingsFormatted
        ];

        // Calculate progress percentage for all trainings
        const calculateProgress = (tp) => {
            let totalModules = 0;
            let completedModules = 0;
            let totalVideos = 0;
            let completedVideos = 0;
            const videoCompletionMap = new Map();

            if (tp.modules) {
                tp.modules.forEach((module) => {
                    totalModules++;
                    if (module.pass) completedModules++;
                    if (module.videos) {
                        module.videos.forEach((video) => {
                            totalVideos++;
                            if (video.pass && !videoCompletionMap.has(video.videoId.toString())) {
                                completedVideos++;
                                videoCompletionMap.set(video.videoId.toString(), true);
                            }
                        });
                    }
                });
            }

            const moduleCompletion = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
            const videoCompletion = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
            return Math.round(moduleCompletion * 0.4 + videoCompletion * 0.6);
        };

        const allTrainingsFormatted = allTrainings.map(t => {
            const tObj = typeof t.toObject === 'function' ? t.toObject() : t;
            const trainingIdStr = tObj.trainingId?._id?.toString() || tObj.trainingId?.toString();
            
            // Find the progress record in mandatoryTrainings (which contains all TrainingProgress for the user)
            const progressRecord = mandatoryTrainings.find(tp => tp.trainingId?._id?.toString() === trainingIdStr);
            let progressPercentage = 0;
            if (progressRecord) {
                progressPercentage = calculateProgress(progressRecord);
            } else if (tObj.pass || tObj.status === 'Completed' || tObj.status === 'COMPLETED') {
                progressPercentage = 100;
            }
            
            return {
                ...tObj,
                progressPercentage
            };
        });

        // Map and enrich assessments with total questions count and correct answers count
        const populatedAssessments = await Promise.all(
            (userData.assignedAssessments || []).map(async (a) => {
                const aObj = typeof a.toObject === 'function' ? a.toObject() : a;
                if (!aObj.assessmentId) return aObj;
                
                const assessId = aObj.assessmentId._id || aObj.assessmentId;
                
                // Fetch assessment to get questions length
                const assess = await mongoose.model('Assessment').findById(assessId).select('questions');
                const totalQuestions = assess?.questions?.length || 0;
                
                // Get correct answers count from AssessmentProcess
                const attempt = await mongoose.model('AssessmentProcess').findOne({
                    userId: userData._id,
                    assessmentId: assessId
                });
                
                const correctAnswers = attempt ? attempt.answers.filter(ans => ans.isCorrect).length : 0;
                
                return {
                    ...aObj,
                    totalQuestions,
                    correctAnswers,
                    score: attempt ? attempt.totalMarks : (aObj.complete || 0)
                };
            })
        );

        // Create response data with combined trainings and enriched assessments
        const responseData = {
            ...userData.toObject(),
            training: allTrainingsFormatted,
            assignedAssessments: populatedAssessments
        };

        console.log('Successfully retrieved user details for empID:', empID);
        res.status(200).json({
            message: "Data found",
            data: responseData
        });

    } catch (error) {
        console.error('Error in GetAllUserDetailes:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            empID: req.params.id
        });
        
        res.status(500).json({
            message: "internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}


export const UpdateOneUserDetailes = async (req, res) => {
    try {
        const { id } = req.params; // Extract empID from URL params
        const { designation, email, empID, locCode, phoneNumber, username, workingBranch } = req.body;

        console.log("Received Data:", { designation, email, empID, locCode, phoneNumber, username, workingBranch });

        // Ensure empID in params and body match to prevent unauthorized changes
        if (id !== empID) {
            return res.status(400).json({
                message: "EmpID cannot be changed",
            });
        }

        // Find and update the user details
        const updatedUser = await User.findOneAndUpdate(
            { empID }, // Find user by empID
            { designation, email, locCode, phoneNumber, username, workingBranch }, // Update fields
            { new: true, runValidators: true } // Return updated document & validate fields
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        res.status(200).json({
            message: "User details updated successfully",
            data: updatedUser,
        });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};


export const GetBranchDetailes = async (req, res) => {
    try {
        const { id } = req.params;
        const userdata = await User.find({ locCode: id }).select('-training').select('-assignedAssessments')
        const branchData = await Branch.findOne({ locCode: id })
        if (!branchData) {
            return res.status(404).json({
                message: "Branch Not found"
            })
        }
        res.status(200).json({
            message: "Data found",
            user: userdata,
            branch: branchData
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
}
export const UpdateBranchDetails = async (req, res) => {
    try {
        const { id } = req.params

        const { address, locCode, location, manager, phoneNumber, workingBranch } = req.body;
        console.log(address, locCode, location, manager, phoneNumber, workingBranch);
        if (locCode !== id) {
            return res.status(304).json({
                message: 'cannot change the locCode'
            })
        }


        const BranchDetails = await Branch.findOneAndUpdate(
            { locCode }, // Find user by empID
            { address, location, manager, phoneNumber, workingBranch }, // Update fields
            { new: true, runValidators: true } // Return updated document & validate fields
        );

        if (!BranchDetails) {
            return res.status(404).json({
                message: "No branch not found",
            });
        }

        res.status(200).json({
            message: "branch details updated successfully",
            data: BranchDetails,
        });
    } catch (error) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}


export const GetCurrentAdmin = async (req, res) => {
    try {


        const AdminId = req.admin.userId
        console.log(AdminId);
        const AdminData = await Admin.findById(AdminId)
        if (!AdminData) {
            res.status(404).json({
                message: "NO Admin found"
            })
        }
        res.status(200).json({
            message: "OK",
            data: AdminData
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

export const UpdateAdminDetaile = async (req, res) => {
    try {
        const AdminId = req.admin.userId; // Extracting admin ID

        const { name, email, phoneNumber } = req.body;
        console.log(name, email, phoneNumber);

        // Find admin and update details
        const AdminData = await Admin.findByIdAndUpdate(
            AdminId, // Pass the ID directly
            { name, email, phoneNumber },
            { new: true, runValidators: true }
        );

        if (!AdminData) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({
            message: "Admin details updated successfully",
            data: AdminData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const GetStoreManager = async (req, res) => {
    try {
        const AdminId = req.admin.userId;
        console.log('GetStoreManager called for AdminId:', AdminId);

        // Step 1: Find the Admin
        const AdminData = await Admin.findById(AdminId);
        console.log('AdminData found:', AdminData ? 'Yes' : 'No');

        if (!AdminData) {
            return res.status(200).json({
                pendingTrainings: { count: 0, data: [] },
                completedTrainings: { count: 0, data: [] },
                dueTrainings: { count: 0, data: [] },
                userconut: { count: 0 },
                message: 'Admin not found'
            });
        }

        // Step 2: Use RBAC to get accessible locCodes and branchNames
        const accessibleStoreIds = await getAccessibleStoreIds(AdminId);
        const accessibleBranches = await Branch.find({ _id: { $in: accessibleStoreIds } });
        const locCodes = accessibleBranches.map(branch => branch.locCode).filter(Boolean);
        const branchNames = accessibleBranches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);

        console.log('Accessible branches count:', accessibleBranches.length);

        // Step 3: Find all users based on RBAC
        let users = [];
        
        if (isFullAccessAdmin(AdminData.role)) {
            // Super admin & HR admin can see all users
            users = await User.find({});
            console.log('Full access admin - all users found:', users.length);
        } else {
            // Cluster/Store admin
            if (locCodes.length > 0 || branchNames.length > 0) {
                users = await User.find({
                    $or: [
                        { locCode: { $in: locCodes } },
                        { workingBranch: { $in: branchNames } },
                        { locCode: { $regex: branchNames.join('|'), $options: 'i' } }
                    ]
                });
            }
            console.log('Users found for accessible locCodes/branches:', users.length);
        }

        // Step 4: Filter trainings for these users
        const userIds = users.map(user => user._id);
        const trainings = await TrainingProgress.find({ userId: { $in: userIds } });
        console.log('TrainingProgress records found:', trainings.length);

        // Step 5: Classify trainings into categories
        const pendingTrainings = trainings.filter(
            training => training.status === 'Pending'
        );
        const completedTrainings = trainings.filter(
            training => training.status === 'Completed'
        );
        const dueTrainings = trainings.filter(
            training => training.status !== 'Completed' && training.status !== 'Pending'
        );

        // Step 6: Send the filtered data with counts in the response
        res.status(200).json({
            pendingTrainings: {
                count: pendingTrainings.length,
                data: pendingTrainings,
            },
            completedTrainings: {
                count: completedTrainings.length,
                data: completedTrainings,
            },
            dueTrainings: {
                count: dueTrainings.length,
                data: dueTrainings,
            },
            userconut: {
                count: users.length,
            },
        });
    } catch (error) {
        console.error('Error fetching store manager data:', error);
        res.status(200).json({
            pendingTrainings: { count: 0, data: [] },
            completedTrainings: { count: 0, data: [] },
            dueTrainings: { count: 0, data: [] },
            userconut: { count: 0 },
            message: 'Error occurred while fetching data'
        });
    }
};

export const GetStoreManagerDueDate = async (req, res) => {
    try {
        const AdminId = req.admin.userId;
        console.log('GetStoreManagerDueDate called for AdminId:', AdminId);

        // Step 1: Find the Admin
        const AdminData = await Admin.findById(AdminId);
        console.log('AdminData found:', AdminData ? 'Yes' : 'No');

        if (!AdminData) {
            return res.status(200).json({
                count: 0,
                topOverdueUsers: [],
                message: 'Admin not found'
            });
        }

        // Step 2: Use RBAC to get accessible locCodes and branchNames
        const accessibleStoreIds = await getAccessibleStoreIds(AdminId);
        const accessibleBranches = await Branch.find({ _id: { $in: accessibleStoreIds } });
        const locCodes = accessibleBranches.map(branch => branch.locCode).filter(Boolean);
        const branchNames = accessibleBranches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);

        console.log('Accessible branches count:', accessibleBranches.length);

        // Step 3: Find all users based on RBAC
        let users = [];
        
        if (isFullAccessAdmin(AdminData.role)) {
            // Super admin & HR admin can see all users
            users = await User.find({});
            console.log('Full access admin - all users found:', users.length);
        } else {
            // Cluster/Store admin
            if (locCodes.length > 0 || branchNames.length > 0) {
                users = await User.find({
                    $or: [
                        { locCode: { $in: locCodes } },
                        { workingBranch: { $in: branchNames } },
                        { locCode: { $regex: branchNames.join('|'), $options: 'i' } }
                    ]
                });
            }
            console.log('Users found for accessible locCodes/branches:', users.length);
        }

        // Step 4: Filter overdue users
        const currentDate = new Date();
        const overdueUsers = users
            .map((user) => {
                // Filter overdue trainings (status is NOT 'completed' and deadline is past)
                const overdueTrainings = user.training.filter(
                    (t) => t.status !== "completed" && new Date(t.deadline) < currentDate
                );

                // Filter overdue assignments (status is NOT 'Completed' and deadline is past)
                const overdueAssessments = user.assignedAssessments.filter(
                    (a) => a.status !== "Completed" && new Date(a.deadline) < currentDate
                );

                // Include only users with overdue items
                if (overdueTrainings.length > 0 || overdueAssessments.length > 0) {
                    return {
                        userId: user._id,
                        name: user.username, // Assuming 'username' is the correct field
                        locCode: user.locCode,
                        overdueTrainings,
                        overdueAssessments,
                    };
                }

                return null; // Exclude users with no overdue items
            })
            .filter((user) => user !== null); // Remove null entries

        console.log('Overdue users found:', overdueUsers.length);

        // Step 5: Slice the first 3 users
        const topOverdueUsers = overdueUsers.slice(0, 3);

        // Step 6: Send the response
        res.status(200).json({
            count: overdueUsers.length,
            topOverdueUsers,
        });
    } catch (error) {
        console.error("Error fetching store manager data:", error);
        res.status(200).json({
            count: 0,
            topOverdueUsers: [],
            message: 'Error occurred while fetching data'
        });
    }
};

export const PermissionController = async (req, res) => {
    try {
        const { admin, clusterManager, storeManager } = req.body;

        console.log("Received Permissions:", admin, clusterManager, storeManager);

        // Update admin permissions
        const AdminUpdate = await Permission.findOneAndUpdate(
            { role: "super_admin" },
            {
                $set: {
                    "permissions.canCreateTraining": admin.training[0],
                    "permissions.canCreateAssessment": admin.assessment[0],
                    "permissions.canReassignTraining": admin.training[1],
                    "permissions.canReassignAssessment": admin.assessment[1],
                    "permissions.canDeleteTraining": admin.training[2],
                    "permissions.canDeleteAssessment": admin.assessment[2],
                },
            },
            { new: true }
        );

        // Also update the permissions for the new "admin" role
        await Permission.findOneAndUpdate(
            { role: "admin" },
            {
                $set: {
                    "permissions.canCreateTraining": admin.training[0],
                    "permissions.canCreateAssessment": admin.assessment[0],
                    "permissions.canReassignTraining": admin.training[1],
                    "permissions.canReassignAssessment": admin.assessment[1],
                    "permissions.canDeleteTraining": admin.training[2],
                    "permissions.canDeleteAssessment": admin.assessment[2],
                },
            },
            { new: true, upsert: true }
        );

        // Update cluster manager permissions
        const ClusterUpdate = await Permission.findOneAndUpdate(
            { role: "cluster_admin" },
            {
                $set: {
                    "permissions.canCreateTraining": clusterManager.training[0],
                    "permissions.canCreateAssessment": clusterManager.assessment[0],
                    "permissions.canReassignTraining": clusterManager.training[1],
                    "permissions.canReassignAssessment": clusterManager.assessment[1],
                    "permissions.canDeleteTraining": clusterManager.training[2],
                    "permissions.canDeleteAssessment": clusterManager.assessment[2],
                },
            },
            { new: true }
        );

        // Update store manager permissions
        const StoreUpdate = await Permission.findOneAndUpdate(
            { role: "store_admin" },
            {
                $set: {
                    "permissions.canCreateTraining": storeManager.training[0],
                    "permissions.canCreateAssessment": storeManager.assessment[0],
                    "permissions.canReassignTraining": storeManager.training[1],
                    "permissions.canReassignAssessment": storeManager.assessment[1],
                    "permissions.canDeleteTraining": storeManager.training[2],
                    "permissions.canDeleteAssessment": storeManager.assessment[2],
                },
            },
            { new: true }
        );

        res.status(200).json({
            message: "Permissions updated successfully",
            data: {
                admin: AdminUpdate,
                clusterManager: ClusterUpdate,
                storeManager: StoreUpdate,
            },
        });

    } catch (error) {
        console.error("Error updating permissions:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const GetPermissionController = async (req, res) => {
    try {

        const AllData = await Permission.find()

        if (!AllData) {
            return res.status(404).json({
                message: "NO DATA FOUND"
            })
        }
        // Update admin permissions


        res.status(200).json({
            message: "Permissions updated successfully",
            data: AllData
        });

    } catch (error) {
        console.error("Error updating permissions:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};


export const GetSearchDataController = async (req, res) => {
    try {
        const AdminId = req.admin.userId;
        const search = req.body.search?.trim() || "";

        if (!search) {
            return res.status(400).json({ message: "Search query is required" });
        }

        // Step 1: Find the Admin and populate branches
        const AdminData = await Admin.findById(AdminId).populate("branches");

        if (!AdminData) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Step 2: Extract locCodes from the populated branches
        const locCodes = AdminData.branches.map((branch) => branch.locCode);

        // Step 3: Find Users and prioritize exact matches
        const userdata = await User.find({
            locCode: { $in: locCodes },
            $or: [
                { username: { $regex: search, $options: "i" } },
                { empID: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        })
            .lean() // Convert MongoDB documents to plain objects
            .then(users => {
                return users.map(user => {
                    let score = 0;
                    if (user.username?.toLowerCase() === search.toLowerCase()) score += 3;
                    if (user.empID?.toLowerCase() === search.toLowerCase()) score += 2;
                    if (user.email?.toLowerCase() === search.toLowerCase()) score += 1;
                    return { ...user, score };
                }).sort((a, b) => b.score - a.score); // Sort descending by score
            });
        const TopthreeData = userdata.slice(0, 3)



        const findBranch = await Branch.find({
            locCode: { $in: locCodes }, $or: [
                { locCode: { $regex: search, $options: "i" } },
                { workingBranch: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ]
        })


        const topthree = findBranch.slice(0, 3)
        res.status(200).json({
            message: "ok",
            data: TopthreeData,
            branch: topthree
        });

    } catch (error) {
        console.error("Error in GetSearchDataController:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


export const GetUserMessage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Identifier (email or employee ID) is required" });
        }

        // Determine if lookup is by email or employee ID
        const isEmail = id.includes('@');
        const userQuery = isEmail ? { email: id } : { empID: id };
        const adminQuery = isEmail ? { email: id } : { EmpId: id };

        let userData = await User.findOne(userQuery)
            .select("username email locCode empID designation workingBranch");

        if (!userData) {
            // Fallback to Admin collection if not found in User collection
            const adminData = await Admin.findOne(adminQuery).populate('branches');
            if (!adminData) {
                return res.status(404).json({ message: "User or Admin not found" });
            }
            userData = {
                _id: adminData._id,
                username: adminData.name,
                email: adminData.email,
                designation: adminData.role,
                locCode: adminData.branches?.map(b => b.locCode).filter(Boolean) || []
            };
        }

        const userIds = [userData._id];
        
        // Find matching employee to include notifications assigned to their employee record
        if (userData.empID) {
            const employee = await Employee.findOne({
                $or: [
                    { userId: userData._id },
                    { employeeId: { $regex: `^${userData.empID}$`, $options: 'i' } }
                ]
            });
            if (employee) {
                userIds.push(employee._id);
            }
        }

        const queryOr = [
            { user: { $in: userIds } }
        ];

        if (userData.designation) {
            queryOr.push({ Role: { $in: [userData.designation] } });
        }

        if (userData.locCode) {
            if (Array.isArray(userData.locCode)) {
                queryOr.push({ branch: { $in: userData.locCode } });
            } else {
                queryOr.push({ branch: { $in: [userData.locCode] } });
            }
        }

        const notifications = await Notification.find({ $or: queryOr }).sort({ createdAt: -1 });

        return res.status(200).json({ notifications });

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export const GetMobileDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Find user/admin record
        let admin = await Admin.findById(userId).populate('branches').lean();
        let user = null;
        let role = '';
        let name = '';
        let storeName = 'All Stores';

        if (admin) {
            role = admin.role;
            name = admin.name || '';
            storeName = admin.branches?.[0]?.workingBranch || 'All Stores';
        } else {
            user = await User.findById(userId).lean();
            if (user) {
                role = 'employee';
                name = user.username || '';
                storeName = user.workingBranch || 'No Store';
            } else {
                return res.status(404).json({ success: false, message: 'User or Admin not found' });
            }
        }

        const activeUser = admin || user;

        // 1. Walkins stats
        let totalWalkins = 0;
        let walkinsToday = 0;
        let walkinsYesterday = 0;

        // Calculate local start of today, yesterday, and the current month in Asia/Kolkata timezone (UTC+5:30)
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        const parts = formatter.formatToParts(now);
        const dateObj = {};
        parts.forEach(p => { dateObj[p.type] = p.value; });
        
        // Midnight of today IST
        const todayStart = new Date(Date.UTC(
            parseInt(dateObj.year, 10),
            parseInt(dateObj.month, 10) - 1,
            parseInt(dateObj.day, 10),
            0, 0, 0, 0
        ));
        todayStart.setTime(todayStart.getTime() - (5.5 * 60 * 60 * 1000));
        
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        // Day 1 of the current month IST
        const monthStart = new Date(Date.UTC(
            parseInt(dateObj.year, 10),
            parseInt(dateObj.month, 10) - 1,
            1, // Day 1
            0, 0, 0, 0
        ));
        monthStart.setTime(monthStart.getTime() - (5.5 * 60 * 60 * 1000));

        let baseFilter = {};

        if (['super_admin', 'admin', 'hr_admin'].includes(role)) {
            // Full Admin overall - all walkins
            baseFilter = {};
        } else if (role === 'cluster_admin') {
            // Cluster Admin - all stores under them
            const accessibleStoreIds = await getAccessibleStoreIds(activeUser._id);
            const branches = await Branch.find({ _id: { $in: accessibleStoreIds } }).lean();
            const locCodes = branches.map(b => b.locCode);
            const workingBranches = branches.map(b => b.workingBranch);
            
            baseFilter = {
                $or: [
                    { storeId: { $in: accessibleStoreIds } },
                    { store: { $in: [...locCodes, ...workingBranches] } }
                ]
            };
        } else if (role === 'store_admin') {
            // Store Admin - walkins in their store
            const accessibleStoreIds = await getAccessibleStoreIds(activeUser._id);
            const branches = await Branch.find({ _id: { $in: accessibleStoreIds } }).lean();
            const locCodes = branches.map(b => b.locCode);
            const workingBranches = branches.map(b => b.workingBranch);
            
            baseFilter = {
                $or: [
                    { storeId: { $in: accessibleStoreIds } },
                    { store: { $in: [...locCodes, ...workingBranches] } }
                ]
            };
        } else {
            // Employee - only walkins created by them
            baseFilter = { createdBy: activeUser._id };
        }

        totalWalkins = await Walkin.countDocuments({ ...baseFilter, createdAt: { $gte: monthStart } });
        walkinsToday = await Walkin.countDocuments({ ...baseFilter, createdAt: { $gte: todayStart } });
        walkinsYesterday = await Walkin.countDocuments({ ...baseFilter, createdAt: { $gte: yesterdayStart, $lt: todayStart } });

        let growthText = "0% from yesterday";
        if (walkinsYesterday > 0) {
            const pct = Math.round(((walkinsToday - walkinsYesterday) / walkinsYesterday) * 100);
            growthText = `${pct >= 0 ? '+' : ''}${pct}% from yesterday`;
        } else if (walkinsToday > 0) {
            growthText = `+100% from yesterday`;
        }

        // 2. Tasks stats
        const taskFilter = await buildTaskFilter(activeUser._id);
        const totalTasks = await Task.countDocuments(taskFilter);
        const tasksPending = await Task.countDocuments({
            ...taskFilter,
            status: { $in: ['PENDING', 'IN PROGRESS', 'ON HOLD', 'UNDER REVIEW'] }
        });
        const taskSubtext = tasksPending > 0 ? `${tasksPending} task(s) pending` : "No tasks assigned today";

        // 3. Performance stats
        let performanceScore = 4.2;
        let performanceLabel = 'Avg Store Performance';
        if (role === 'employee') {
            performanceScore = 4.5;
            performanceLabel = 'Staff Performance';
        }

        // 4. Assessments stats
        let assessmentsCompleted = 0;
        let assessmentsTotal = 0;

        if (['super_admin', 'admin', 'hr_admin'].includes(role)) {
            const allUsers = await User.find({}).select('assignedAssessments').lean();
            for (const u of allUsers) {
                if (u.assignedAssessments) {
                    assessmentsTotal += u.assignedAssessments.length;
                    assessmentsCompleted += u.assignedAssessments.filter(a => a.status === 'Completed').length;
                }
            }
        } else if (role === 'cluster_admin' || role === 'store_admin') {
            const accessibleStoreIds = await getAccessibleStoreIds(activeUser._id);
            const branches = await Branch.find({ _id: { $in: accessibleStoreIds } }).lean();
            const locCodes = branches.map(b => b.locCode);
            
            const usersInStore = await User.find({ locCode: { $in: locCodes } }).select('assignedAssessments').lean();
            for (const u of usersInStore) {
                if (u.assignedAssessments) {
                    assessmentsTotal += u.assignedAssessments.length;
                    assessmentsCompleted += u.assignedAssessments.filter(a => a.status === 'Completed').length;
                }
            }
        } else {
            // Employee
            assessmentsTotal = activeUser.assignedAssessments?.length || 0;
            assessmentsCompleted = activeUser.assignedAssessments?.filter(a => a.status === 'Completed').length || 0;
        }

        // 5. Training progress stats
        let trainingTotal = 0;
        let trainingCompleted = 0;

        if (['super_admin', 'admin', 'hr_admin'].includes(role)) {
            const allProgress = await TrainingProgress.find({}).lean();
            trainingTotal = allProgress.length;
            trainingCompleted = allProgress.filter(tp => tp.pass || tp.status === 'Completed').length;
        } else if (role === 'cluster_admin' || role === 'store_admin') {
            const accessibleStoreIds = await getAccessibleStoreIds(activeUser._id);
            const branches = await Branch.find({ _id: { $in: accessibleStoreIds } }).lean();
            const locCodes = branches.map(b => b.locCode);
            const usersInStore = await User.find({ locCode: { $in: locCodes } }).select('_id').lean();
            const userIds = usersInStore.map(u => u._id);

            const storeProgress = await TrainingProgress.find({ userId: { $in: userIds } }).lean();
            trainingTotal = storeProgress.length;
            trainingCompleted = storeProgress.filter(tp => tp.pass || tp.status === 'Completed').length;
        } else {
            // Employee
            const empProgress = await TrainingProgress.find({ userId: activeUser._id }).lean();
            trainingTotal = empProgress.length;
            trainingCompleted = empProgress.filter(tp => tp.pass || tp.status === 'Completed').length;
        }

        const trainingProgressPercentage = trainingTotal > 0 ? Math.round((trainingCompleted / trainingTotal) * 100) : 0;
        const trainingsLeft = Math.max(0, trainingTotal - trainingCompleted);

        res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data: {
                name,
                role,
                storeName,
                training: {
                    percentage: trainingProgressPercentage,
                    completed: trainingCompleted,
                    total: trainingTotal,
                    leftToComplete: trainingsLeft
                },
                walkins: {
                    total: totalWalkins,
                    growthText
                },
                tasks: {
                    total: totalTasks,
                    subtext: taskSubtext
                },
                performance: {
                    score: performanceScore,
                    label: performanceLabel
                },
                assessments: {
                    completed: assessmentsCompleted,
                    total: assessmentsTotal,
                    text: `${assessmentsCompleted}/${assessmentsTotal} Completed`
                }
            }
        });

    } catch (error) {
        console.error('Error fetching mobile dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

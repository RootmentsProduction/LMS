import Admin from "../model/Admin.js";
import Permission from "../model/AdminPermission.js";
import AssessmentProcess from "../model/Assessmentprocessschema.js";
import Branch from "../model/Branch.js";
import Notification from "../model/Notification.js";
import TrainingProgress from "../model/Trainingprocessschema.js";
import { Training } from "../model/Traning.js";
import User from "../model/User.js";
import mongoose from 'mongoose';

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
        
        const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline
        
        // Create TrainingProgress for each mandatory training
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

        // Create response data with combined trainings
        const responseData = {
            ...userData.toObject(),
            training: allTrainings
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

        // Step 1: Find the Admin and populate branches
        const AdminData = await Admin.findById(AdminId).populate('branches');
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

        // Step 2: Extract locCodes from the populated branches
        const locCodes = AdminData.branches.map(branch => branch.locCode);
        console.log('Admin branches:', AdminData.branches.length);
        console.log('LocCodes found:', locCodes);

        // Step 3: Find all users - always return data regardless of matching
        let users = [];
        
        if (AdminData.role === 'super_admin') {
            // Super admin can see all users
            users = await User.find({});
            console.log('Super admin - all users found:', users.length);
        } else {
            // For other admin types, try to find users by branch locCodes
            users = await User.find({ locCode: { $in: locCodes } });
            console.log('Users found for locCodes:', users.length);
            
            // If no users found, try alternative matching
            if (users.length === 0) {
                // Try to find users by branch names or other criteria
                const branchNames = AdminData.branches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);
                if (branchNames.length > 0) {
                    users = await User.find({
                        $or: [
                            { workingBranch: { $in: branchNames } },
                            { locCode: { $regex: branchNames.join('|'), $options: 'i' } }
                        ]
                    });
                    console.log('Users found by branch names:', users.length);
                }
            }
            
            // If still no users found, get all users for this admin type
            if (users.length === 0) {
                users = await User.find({});
                console.log('Fallback - all users found:', users.length);
            }
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

        // Step 1: Find the Admin and populate branches
        const AdminData = await Admin.findById(AdminId).populate("branches");
        console.log('AdminData found:', AdminData ? 'Yes' : 'No');

        if (!AdminData) {
            return res.status(200).json({
                count: 0,
                topOverdueUsers: [],
                message: 'Admin not found'
            });
        }

        // Step 2: Extract locCodes from the populated branches
        const locCodes = AdminData.branches.map((branch) => branch.locCode);
        console.log('Admin branches:', AdminData.branches.length);
        console.log('LocCodes found:', locCodes);

        // Step 3: Find all users - always return data regardless of matching
        let users = [];
        
        if (AdminData.role === 'super_admin') {
            // Super admin can see all users
            users = await User.find({});
            console.log('Super admin - all users found:', users.length);
        } else {
            // For other admin types, try to find users by branch locCodes
            users = await User.find({ locCode: { $in: locCodes } });
            console.log('Users found for locCodes:', users.length);
            
            // If no users found, try alternative matching
            if (users.length === 0) {
                // Try to find users by branch names or other criteria
                const branchNames = AdminData.branches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);
                if (branchNames.length > 0) {
                    users = await User.find({
                        $or: [
                            { workingBranch: { $in: branchNames } },
                            { locCode: { $regex: branchNames.join('|'), $options: 'i' } }
                        ]
                    });
                    console.log('Users found by branch names:', users.length);
                }
            }
            
            // If still no users found, get all users for this admin type
            if (users.length === 0) {
                users = await User.find({});
                console.log('Fallback - all users found:', users.length);
            }
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
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const userData = await User.findOne({ email })
            .select("username email locCode empID designation workingBranch");

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        const notifications = await Notification.find({
            $or: [
                { Role: { $in: [userData.designation] } },
                { user: { $in: [userData._id] } },
                { branch: { $in: [userData.locCode] } }
            ]
        });


        return res.status(200).json({ notifications });

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

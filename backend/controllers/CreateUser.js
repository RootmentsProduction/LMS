import User from '../model/User.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Branch from '../model/Branch.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import Module from '../model/Module.js';
import { Training } from '../model/Traning.js';
import Admin from '../model/Admin.js';
import { sendCompletionEmail } from '../utils/sendEmail.js';
dotenv.config()

// Adjust the path to your TrainingProgress model

export const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      empID,
      locCode,
      designation,
      location,
      workingBranch,
    } = req.body;

    // Check if the username or email already exists
    const existingUser = await User.findOne({ $or: [{ email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }

    // Create a new user
    const newUser = new User({
      username,
      email,
      empID,
      location,
      locCode,
      designation,
      workingBranch,
    });


    // Fetch all mandatory training based on the user role (designation)
    const mandatoryTraining = await Training.find({
      Trainingtype: 'Mandatory',
     Assignedfor: { $elemMatch: { $regex: `^${designation}$`, $options: 'i' } }, // Match the role in the `Assignedfor` array ABHI
    }).populate('modules');
    console.log(mandatoryTraining);

    // if (!mandatoryTraining || mandatoryTraining.length === 0) {
    //   return res.status(400).json({ message: 'No mandatory training found for the user role.' });
    // }

    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline

    // Assign each mandatory training to the user and create progress entries
    const trainingAssignments = mandatoryTraining.map(async (training) => {
      // Assign training to the user
      newUser.training.push({
        trainingId: training._id,
        deadline: deadlineDate,
        pass: false,
        status: 'Pending',
      });

      // Create TrainingProgress for the user
      const trainingProgress = new TrainingProgress({
        userId: newUser._id,
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
    });

    // Wait for all training assignments to complete
    await Promise.all(trainingAssignments);

    // Save the new user
    await newUser.save();

    res.status(201).json({
      message: 'User created successfully, and mandatory training assigned.',
      user: newUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'An error occurred while creating the user.',
      error: error.message,
    });
  }
};


export const loginUser = async (req, res) => {
  const { email, empID } = req.body;

  try {
    // Input validation
    if (!email || !empID) {
      return res.status(400).json({ message: 'Email and Employee ID are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare empID (Consider hashing for better security)
    const isMatch = empID === user.empID;
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Ensure JWT secret is available
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT secret is not defined in environment variables');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role }, // Add claims if required
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send response
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        email: user.email,
        empID: user.empID,
        location: user.location,
        workingBranch: user.workingBranch,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const GetAllUser = async (req, res) => {
  try {
    const AdminId = req.admin.userId
    const AdminBranch = await Admin.findById(AdminId).populate('branches')
    // Fetch users with populated training, assessments, and modules

    console.log(AdminBranch);
    const allowedLocCodes = AdminBranch.branches.map(branch => branch.locCode);
    const response = await User.find({ locCode: { $in: allowedLocCodes } });

    // Check if no users were found
    if (response.length === 0) {
      return res.status(404).json({
        message: "No users found",
      });
    }

    const TodayDate = new Date();

    const usercount = response.map((item) => {
      const trainingCount = item.training.length;
      const assignedAssessmentsCount = item.assignedAssessments.length;

      // Safely calculate counts for pass/fail, ensuring that the array exists
      const passCountTraining = item.training?.filter(training => training.pass === true).length || 0;
      const passCountAssessment = item.assignedAssessments?.filter(assessment => assessment.pass === true).length || 0;

      const AssessmentDue = item.assignedAssessments?.filter(assessment => assessment.deadline < TodayDate).length || 0;
      const Trainingdue = item.training?.filter(training => training.deadline < TodayDate).length || 0;

      // Calculate pass percentages with rounding
      const passCountAssessmentPercentage = assignedAssessmentsCount > 0 ? Math.round((passCountAssessment / assignedAssessmentsCount) * 100) : 0;
      const passCountTrainingPercentage = trainingCount > 0 ? Math.round((passCountTraining / trainingCount) * 100) : 0;

      return {
        username: item.username,
        _id: item._id,
        workingBranch: item.workingBranch,
        empID: item.empID,
        trainingCount,
        passCountAssessment: passCountAssessmentPercentage,
        passCountTraining: passCountTrainingPercentage,
        assignedAssessmentsCount,
        AssessmentDue,
        designation: item.designation,
        Trainingdue
      };
    });

    return res.status(200).json({
      data: usercount
    });

  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};




export const createBranch = async (req, res) => {
  const { address, locCode, location, manager, phoneNumber, workingBranch } = req.body;
  console.log(address, locCode, location, manager, phoneNumber, workingBranch);

  try {
    // Check if branch already exists
    const existingBranch = await Branch.findOne({ locCode });
    if (existingBranch) {
      return res.status(400).json({ message: "Branch already exists" });
    }

    // Create a new branch
    const newBranch = new Branch({
      address,
      locCode,
      location,
      manager,
      phoneNumber,
      workingBranch,
    });

    const savedBranch = await newBranch.save();

    if (savedBranch) {
      // Fetch all super_admins from Admin collection
      const superAdmins = await Admin.find({ role: "super_admin" });

      // Update each super_admin by adding the new branch _id to their branches array
      await Promise.all(
        superAdmins.map(async (admin) => {
          admin.branches.push(savedBranch._id);
          await admin.save();
        })
      );

      return res.status(201).json({ message: "Branch created successfully", data: savedBranch });
    }
  } catch (error) {
    console.error("Error creating branch:", error.message);
    res.status(500).json({ message: "Branch creation failed", error: error.message });
  }
};


export const GetBranch = async (req, res) => {
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

    // Fetch all branches
    const branches = await Branch.find({ locCode: { $in: allowedLocCodes } });

    // If branches are found, fetch the user count and training count based on locCode for each branch
    if (branches.length > 0) {
      const branchesWithUserAndTrainingCount = await Promise.all(branches.map(async (branch) => {
        // Count users based on locCode for each branch
        const userCount = await User.countDocuments({ locCode: branch.locCode });

        // Fetch all users for the current branch to count their training modules
        const usersInBranch = await User.find({ locCode: branch.locCode });

        // Count total training modules for each user
        let totalTrainingCount = 0;
        for (let user of usersInBranch) {
          // Assuming 'trainingModules' is an array or reference to modules in the user schema
          totalTrainingCount += user.training.length;
        }
        let totalAssessmentCount = 0;
        for (let user of usersInBranch) {
          totalAssessmentCount += user.assignedAssessments.length;
        }

        return {
          ...branch.toObject(), // Include all branch data
          userCount, // Add the user count based on locCode
          totalTrainingCount, // Add the total training count for users in this branch
          totalAssessmentCount
        };
      }));

      res.status(200).json({
        message: "Data found",
        data: branchesWithUserAndTrainingCount
      });
    } else {
      res.status(404).json({ message: "No branches found" });
    }

  } catch (error) {
    console.error('Error finding branch:', error.message);
    res.status(500).json({ message: "Error finding branch" });
  }
};



export const GetuserTraining = async (req, res) => {
  const { email } = req.query; // Extract email from query

  try {
    // Find user based on email and populate training and modules separately
    const user = await User.findOne({ email })
      .populate({
        path: 'training.trainingId', // Populate the training details

      });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all training progress using user ID
    const trainingProgress = await TrainingProgress.find({ userId: user._id });

    // Process each training to calculate completion percentages
    const trainingDetails = user.training.map(training => {
      const progress = trainingProgress.find(p => p.trainingId.toString() === training.trainingId._id.toString());

      if (!progress) {
        return {
          trainingId: training.trainingId._id,
          name: training.trainingId.name,
          completionPercentage: 0
        };
      }

      let totalModules = 0;
      let completedModules = 0;
      let totalVideos = 0;
      let completedVideos = 0;

      // Iterate through modules and calculate completion
      progress.modules.forEach(module => {
        totalModules++;
        if (module.pass) completedModules++;

        module.videos.forEach(video => {
          totalVideos++;
          if (video.pass) completedVideos++;
        });
      });

      const moduleCompletionPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
      const videoCompletionPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
      const overallCompletionPercentage = (moduleCompletionPercentage + videoCompletionPercentage) / 2;

      return {
        trainingId: training.trainingId._id,
        name: training.trainingId.name,
        completionPercentage: overallCompletionPercentage.toFixed(2)
      };
    });

    // Calculate the overall completion percentage for the user (average of all training completions)
    const totalCompletionPercentage = trainingDetails.reduce((sum, training) => sum + parseFloat(training.completionPercentage), 0);
    const userOverallCompletionPercentage = trainingDetails.length > 0 ? (totalCompletionPercentage / trainingDetails.length).toFixed(2) : 0;

    // Return user data with training completion percentages and overall completion percentage
    res.status(200).json({
      message: "Data found",
      data: {
        user,
        trainingProgress: trainingDetails,
        userOverallCompletionPercentage // Include overall user completion percentage
      }
    });

  } catch (error) {
    console.error('Error finding user:', error.message);
    res.status(500).json({ message: "Server error while finding user" });
  }
};


export const GetuserTrainingprocess = async (req, res) => {
  const { userId, trainingId } = req.query; // Extract request body

  try {
    const traingproess = await TrainingProgress.find({
      userId,
      trainingId
    }).populate({
      path: 'trainingId', // Populate trainingId first
      populate: {
        path: 'modules', // Populate modules inside trainingId
        populate: {
          path: 'videos', // Populate videos inside modules
        },
      },
    })
      .exec();

    if (!traingproess || traingproess.length === 0) {
      return res.status(404).json({ message: "No data" });
    }

    // Calculate the percentage of completion
    const trainingData = traingproess[0];
    let totalModules = 0;
    let completedModules = 0;
    let totalVideos = 0;
    let completedVideos = 0;

    // Iterate through the modules and videos to calculate the percentage
    trainingData.modules.forEach(module => {
      totalModules++;
      if (module.pass) {
        completedModules++;
      }

      module.videos.forEach(video => {
        totalVideos++;
        if (video.pass) {
          completedVideos++;
        }
      });
    });

    // Calculate the completion percentages
    const moduleCompletionPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    const videoCompletionPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    // Calculate overall percentage (average of module and video completion)
    const overallCompletionPercentage = (moduleCompletionPercentage + videoCompletionPercentage) / 2;

    // Return user data with populated training, modules, and percentage of completion
    res.status(200).json({
      message: "Data found",
      data: trainingData,
      completionPercentage: overallCompletionPercentage.toFixed(2) // Rounded to 2 decimal places
    });

  } catch (error) {
    console.error('Error finding user:', error.message);
    res.status(500).json({ message: "Server error while finding user" });
  }
};


export const UpdateuserTrainingprocess = async (req, res) => {
  const { userId, trainingId, moduleId, videoId } = req.query;

  // Validate input parameters
  if (!userId || !trainingId || !moduleId || !videoId) {
    return res.status(400).json({ message: "Missing required query parameters" });
  }

  try {
    // Find the training progress
    const trainingProgress = await TrainingProgress.findOne({ userId, trainingId });

    if (!trainingProgress) {
      return res.status(404).json({ message: "Training progress not found" });
    }

    // Find the module in the training progress
    const module = trainingProgress.modules.find(mod => mod.moduleId.toString() === moduleId);

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Find the video in the module
    const video = module.videos.find(v => v.videoId.toString() === videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Update video status
    if (!video.pass) {
      video.pass = true; // Mark video as passed
    }

    // Update module status if all videos are passed
    const allVideosPassed = module.videos.every(v => v.pass === true);
    if (allVideosPassed && !module.pass) {
      module.pass = true;
    }

    // Update training status
    const allModulesPassed = trainingProgress.modules.every(mod => mod.pass === true);

    if (allModulesPassed) {
      trainingProgress.pass = true;
      trainingProgress.status = 'Completed'; // Mark training as completed
    } else {
      trainingProgress.status = 'In Progress'; // Mark training as in progress
    }

    // Save updated training progress
    await trainingProgress.save();

    // ===== Update User Collection =====
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user training status
    const userTraining = user.training.find(train => train.trainingId.toString() === trainingId);
    if (userTraining) {
      userTraining.status = trainingProgress.status; // Sync user status with training status
      userTraining.pass = trainingProgress.pass; // Sync pass status
    }

    // Save updated user status
    await user.save();

    // Send success response
    res.status(200).json({
      message: "Training progress and user status updated successfully",
      data: { trainingProgress, user },
    });

  } catch (error) {
    console.error('Error updating training progress and user status:', error.stack);
    res.status(500).json({ message: "Server error while updating progress and user status" });
  }
};



// export const UpdateuserTrainingprocess = async (req, res) => {
//   // Extract parameters from query string
//   const { userId, trainingId, moduleId, videoId } = req.query;

//   // Validate required parameters
//   if (!userId || !trainingId || !moduleId || !videoId) {
//     return res.status(400).json({ message: "Missing required query parameters" });
//   }

//   try {
//     // 🔍 Find the user's training progress record
//     const trainingProgress = await TrainingProgress.findOne({ userId, trainingId });
//     if (!trainingProgress) {
//       return res.status(404).json({ message: "Training progress not found" });
//     }

//     // 🔍 Locate the correct module in training progress
//     const module = trainingProgress.modules.find(mod => mod.moduleId.toString() === moduleId);
//     if (!module) {
//       return res.status(404).json({ message: "Module not found" });
//     }

//     // 🔍 Find the specific video in that module
//     const video = module.videos.find(v => v.videoId.toString() === videoId);
//     if (!video) {
//       return res.status(404).json({ message: "Video not found" });
//     }

//     // ✅ Mark this video as completed if not already
//     if (!video.pass) {
//       video.pass = true;
//     }

//     // ✅ If all videos in this module are passed, mark the module as passed
//     const allVideosPassed = module.videos.every(v => v.pass === true);
//     if (allVideosPassed && !module.pass) {
//       module.pass = true;
//     }

//     // ✅ Check if all modules are passed, mark training as completed
//     const allModulesPassed = trainingProgress.modules.every(mod => mod.pass === true);
//     if (allModulesPassed) {
//       trainingProgress.pass = true;
//       trainingProgress.status = 'Completed';
//     } else {
//       trainingProgress.status = 'In Progress';
//     }

//     // 💾 Save the updated training progress
//     await trainingProgress.save();

//     // 🔍 Get user details for syncing status
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 🔁 Sync training status into the User’s `training[]` array
//     const userTraining = user.training.find(train => train.trainingId.toString() === trainingId);
//     if (userTraining) {
//       userTraining.status = trainingProgress.status;
//       userTraining.pass = trainingProgress.pass;
//     }

//     // 💾 Save updated user object
//     await user.save();

//     // ✅ If training is completed, send a confirmation email
//     if (trainingProgress.status === 'Completed') {
//       const emp = await Employee.findOne({ userId });          // employee details
//       const training = await Training.findById(trainingId);    // training title

//       if (emp && training) {
//         await sendCompletionEmail({
//           name: user.name,
//           empId: emp.empId,
//           trainingName: training.title,
//           branch: emp.branchName,
//           email: user.email
//         });
//       }
//     }

//     // 📤 Respond with success
//     res.status(200).json({
//       message: "Training progress and user status updated successfully",
//       data: { trainingProgress, user },
//     });

//   } catch (error) {
//     console.error('Error updating training progress and user status:', error.stack);
//     res.status(500).json({ message: "Server error while updating progress and user status" });
//   }
// };




export const GetuserTrainingprocessmodule = async (req, res) => {
  const { userId, trainingId, moduleId } = req.query; // Extract request query

  try {
    // Find training progress and populate nested fields
    const traingproess = await TrainingProgress.find({
      userId,
      trainingId
    })
      .populate({
        path: 'trainingId', // Populate trainingId first
        populate: {
          path: 'modules', // Populate modules inside trainingId
          populate: {
            path: 'videos', // Populate videos inside modules
          },
        },
      })
      .exec();

    // Check if data exists
    if (!traingproess || traingproess.length === 0) {
      return res.status(404).json({ message: "No data" });
    }

    // Extract the training data
    const trainingData = traingproess[0];

    // Filter the requested module by moduleId
    const selectedModule = trainingData.modules.find(
      (module) => module.moduleId.toString() === moduleId
    );

    // Check if module is found
    if (!selectedModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Calculate completion percentages for the specific module
    let totalVideos = selectedModule.videos.length;
    let completedVideos = selectedModule.videos.filter((video) => video.pass).length;

    // Calculate percentage completion
    const videoCompletionPercentage = totalVideos > 0
      ? (completedVideos / totalVideos) * 100
      : 0;
    const moduledata = await Module.findById(selectedModule.moduleId)

    // Return response with module data and percentage completion
    res.status(200).json({
      message: "Module data found",
      data: selectedModule,
      moduledata: moduledata,
      completionPercentage: videoCompletionPercentage.toFixed(2) // Rounded to 2 decimal places
    });

  } catch (error) {
    console.error('Error finding module:', error.message);
    res.status(500).json({ message: "Server error while finding module" });
  }
};

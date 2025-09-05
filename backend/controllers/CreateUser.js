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
    // const mandatoryTraining = await Training.find({
    //   Trainingtype: 'Mandatory',
    //  Assignedfor: { $elemMatch: { $regex: `^${designation}$`, $options: 'i' } }, // Match the role in the `Assignedfor` array ABHI
    // }).populate('modules');
    // console.log(mandatoryTraining);

    // ABHORAM CHNAG 

    // Function to flatten a string (remove spaces and lowercase)
    const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');

    // Flatten input designation
    const flatDesignation = flatten(designation);

    // Step 1: Fetch all mandatory trainings
    const allTrainings = await Training.find({
      Trainingtype: 'Mandatory'
    }).populate('modules');

    // Step 2: Filter in JS using flattened comparison
    const mandatoryTraining = allTrainings.filter(training =>
      training.Assignedfor.some(role => flatten(role) === flatDesignation)
    );

    console.log(mandatoryTraining);







    // if (!mandatoryTraining || mandatoryTraining.length === 0) {
    //   return res.status(400).json({ message: 'No mandatory training found for the user role.' });
    // }

    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline

    // For mandatory trainings, only create progress records, don't add to user.training array
    // This prevents mandatory trainings from appearing in both "assigned" and "mandatory" sections
    const trainingAssignments = mandatoryTraining.map(async (training) => {
      // DON'T add mandatory training to user.training array
      // newUser.training.push({
      //   trainingId: training._id,
      //   deadline: deadlineDate,
      //   pass: false,
      //   status: 'Pending',
      // });

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
      message: 'User created successfully, and mandatory training progress created.',
      user: newUser,
      note: 'Mandatory trainings are handled separately from assigned trainings'
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

    // Track user login
    try {
      const { detectDeviceInfo, getLocationFromIP } = await import('../utils/deviceDetection.js');
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
      
      // Detect device information
      const deviceInfo = detectDeviceInfo(userAgent, ipAddress);
      const location = await getLocationFromIP(ipAddress);
      
      // Import UserLoginSession model
      const UserLoginSession = (await import('../model/UserLoginSession.js')).default;
      
      // Create login session
      const loginSession = new UserLoginSession({
        userId: user._id,
        username: user.username,
        email: user.email,
        ...deviceInfo,
        location,
        ipAddress
      });
      
      await loginSession.save();
      
      // Store session ID in response for logout tracking
      const sessionId = loginSession._id;
      
      // Send response
      res.status(200).json({
        message: 'Login successful',
        token,
        sessionId, // Include session ID for logout tracking
        user: {
          username: user.username,
          email: user.email,
          empID: user.empID,
          location: user.location,
          workingBranch: user.workingBranch,
        },
      });
    } catch (trackingError) {
      console.error('Error tracking login:', trackingError);
      // Still send successful response even if tracking fails
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
    }
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
  const { empID } = req.query; // Extract empID from query instead of email

  try {
    // Find user based on empID and populate training and modules separately
    const user = await User.findOne({ empID })
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
    // Filter out mandatory trainings - only return assigned trainings
    const trainingDetails = user.training
      .filter(training => {
        // Check if this is a mandatory training
        const trainingType = training.trainingId.Trainingtype;
        const isMandatory = trainingType === 'Mandatory' || trainingType === 'mandatory';
        
        if (isMandatory) {
          console.log(`Skipping mandatory training "${training.trainingId.trainingName}" from GetuserTraining API`);
          return false; // Skip mandatory trainings
        }
        
        return true; // Include assigned trainings
      })
      .map(training => {
      const progress = trainingProgress.find(p => p.trainingId.toString() === training.trainingId._id.toString());

      if (!progress) {
        return {
          trainingId: training.trainingId._id,
          name: training.trainingId.trainingName || 'Unknown Training',
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
        name: training.trainingId.trainingName || 'Unknown Training',
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
    // First get the training progress
    const traingproess = await TrainingProgress.find({
      userId,
      trainingId
    }).populate('trainingId') // Only populate the training, not the nested modules
      .exec();

    if (!traingproess || traingproess.length === 0) {
      return res.status(404).json({ message: "No data" });
    }

    const trainingData = traingproess[0];
    
    // Get the actual module data with videos from Module collection
    const moduleIds = trainingData.trainingId.modules;
    const actualModules = await Module.find({ _id: { $in: moduleIds } });
    
    console.log('📚 Found modules:', actualModules.length);
    console.log('🎥 Sample video data:', actualModules[0]?.videos[0]);
    
    // Merge progress data with actual module data
    const enrichedModules = trainingData.modules.map(progressModule => {
      const actualModule = actualModules.find(m => m._id.toString() === progressModule.moduleId.toString());
      
      console.log('🔍 Processing module:', {
        progressModuleId: progressModule.moduleId.toString(),
        actualModuleFound: !!actualModule,
        actualModuleName: actualModule?.moduleName,
        actualModuleVideos: actualModule?.videos?.length || 0,
        progressVideos: progressModule.videos?.length || 0
      });
      
      if (actualModule) {
        console.log('🎥 Actual module videos:', actualModule.videos.map(v => ({
          id: v._id.toString(),
          title: v.title,
          videoUri: v.videoUri
        })));
        
        console.log('📊 Progress module videos:', progressModule.videos.map(v => ({
          videoId: v.videoId.toString()
        })));
        
        // Map progress videos with actual video data
        const enrichedVideos = actualModule.videos.map(actualVideo => {
          const progressVideo = progressModule.videos.find(pv => pv.videoId.toString() === actualVideo._id.toString());
          
          console.log('🔗 Video mapping:', {
            actualVideoId: actualVideo._id.toString(),
            actualVideoTitle: actualVideo.title,
            actualVideoUri: actualVideo.videoUri,
            progressVideoFound: !!progressVideo,
            progressVideoId: progressVideo?.videoId?.toString()
          });
          
          return {
            videoId: actualVideo._id,
            title: actualVideo.title,
            videoUri: actualVideo.videoUri, // This is the actual YouTube URL!
            videoTitle: actualVideo.title, // Add both title fields
            questions: actualVideo.questions,
            pass: progressVideo ? progressVideo.pass : false,
            watchTime: progressVideo ? progressVideo.watchTime : 0,
            totalDuration: progressVideo ? progressVideo.totalDuration : 0,
            watchPercentage: progressVideo ? progressVideo.watchPercentage : 0,
            lastWatchedAt: progressVideo ? progressVideo.lastWatchedAt : null
          };
        });
        
        console.log('✅ Enriched videos for module:', actualModule.moduleName, enrichedVideos.length);
        console.log('🎥 Sample enriched video:', enrichedVideos[0]);
        
        return {
          moduleId: actualModule._id,
          moduleName: actualModule.moduleName,
          description: actualModule.description,
          pass: progressModule.pass,
          videos: enrichedVideos
        };
      }
      
      console.log('⚠️ No actual module found for progress module:', progressModule.moduleId.toString());
      return progressModule;
    });

    // Calculate completion percentages
    let totalModules = 0;
    let completedModules = 0;
    let totalVideos = 0;
    let completedVideos = 0;

    enrichedModules.forEach(module => {
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

    // Return enriched data with actual video URLs
    const enrichedTrainingData = {
      ...trainingData.toObject(),
      modules: enrichedModules
    };

    console.log('✅ Returning enriched training data with', totalVideos, 'videos');

    res.status(200).json({
      message: "Data found",
      data: enrichedTrainingData,
      completionPercentage: overallCompletionPercentage.toFixed(2)
    });

  } catch (error) {
    console.error('Error in GetuserTrainingprocess:', error);
    res.status(500).json({ message: "Server error while finding user" });
  }
};


export const UpdateuserTrainingprocess = async (req, res) => {
  try {
    // Handle both query and body parameters for flexibility
    const { userId, trainingId, moduleId, videoId, watchTime, totalDuration } = {
      ...req.query,
      ...req.body
    };

    // Validate input parameters
    if (!userId || !trainingId || !moduleId || !videoId) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required parameters: userId, trainingId, moduleId, videoId" 
      });
    }

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/) || 
        !trainingId.match(/^[0-9a-fA-F]{24}$/) || 
        !moduleId.match(/^[0-9a-fA-F]{24}$/) || 
        !videoId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid ObjectId format for one or more parameters" 
      });
    }

    // Find the training progress
    const trainingProgress = await TrainingProgress.findOne({ 
      userId, 
      trainingId 
    });

    if (!trainingProgress) {
      return res.status(404).json({ 
        success: false,
        message: "Training progress not found for this user and training" 
      });
    }

    // Find the module in the training progress
    const module = trainingProgress.modules.find(mod => 
      mod.moduleId.toString() === moduleId
    );

    if (!module) {
      return res.status(404).json({ 
        success: false,
        message: "Module not found in this training progress" 
      });
    }

    // Find the video in the module
    const video = module.videos.find(v => 
      v.videoId.toString() === videoId
    );

    if (!video) {
      return res.status(404).json({ 
        success: false,
        message: "Video not found in this module" 
      });
    }

    // Update video status if not already passed
    if (!video.pass) {
      video.pass = true;
      video.completedAt = new Date(); // Add completion timestamp
      
      // Store watch time data if provided
      if (watchTime && totalDuration) {
        video.watchTime = watchTime;
        video.totalDuration = totalDuration;
        video.watchPercentage = Math.round((watchTime / totalDuration) * 100);
      }
    }

    // Update module status if all videos are passed
    const allVideosPassed = module.videos.every(v => v.pass === true);
    if (allVideosPassed && !module.pass) {
      module.pass = true;
      module.completedAt = new Date(); // Add completion timestamp
    }

    // Update training status
    const allModulesPassed = trainingProgress.modules.every(mod => mod.pass === true);

    if (allModulesPassed) {
      trainingProgress.pass = true;
      trainingProgress.status = 'Completed';
      trainingProgress.completedAt = new Date(); // Add completion timestamp
    } else {
      trainingProgress.status = 'In Progress';
    }

    // Save updated training progress
    await trainingProgress.save();

    // Update User Collection
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Update user training status
    const userTraining = user.training.find(train => 
      train.trainingId.toString() === trainingId
    );
    
    if (userTraining) {
      userTraining.status = trainingProgress.status;
      userTraining.pass = trainingProgress.pass;
      if (trainingProgress.completedAt) {
        userTraining.completedAt = trainingProgress.completedAt;
      }
    }

    // Save updated user status
    await user.save();

    // Calculate completion percentages for response
    const totalModules = trainingProgress.modules.length;
    const completedModules = trainingProgress.modules.filter(mod => mod.pass).length;
    const totalVideos = trainingProgress.modules.reduce((sum, mod) => sum + mod.videos.length, 0);
    const completedVideos = trainingProgress.modules.reduce((sum, mod) => 
      sum + mod.videos.filter(v => v.pass).length, 0
    );

    const moduleCompletionPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    const videoCompletionPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
    const overallCompletionPercentage = (moduleCompletionPercentage + videoCompletionPercentage) / 2;

    // Send success response
    res.status(200).json({
      success: true,
      message: "Training progress updated successfully",
      data: {
        trainingProgress: {
          id: trainingProgress._id,
          status: trainingProgress.status,
          pass: trainingProgress.pass,
          completedAt: trainingProgress.completedAt
        },
        user: {
          id: user._id,
          username: user.username,
          trainingStatus: userTraining ? userTraining.status : 'Not Found'
        },
        progress: {
          moduleCompletion: moduleCompletionPercentage.toFixed(2) + '%',
          videoCompletion: videoCompletionPercentage.toFixed(2) + '%',
          overallCompletion: overallCompletionPercentage.toFixed(2) + '%'
        }
      }
    });

  } catch (error) {
    console.error('Error updating training progress:', error.stack);
    res.status(500).json({ 
      success: false,
      message: "Server error while updating training progress",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};




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
    const moduledata = await Module.findById(selectedModule.moduleId);

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

// Unified training API that returns both assigned and mandatory trainings for a specific user
export const GetUserAllTrainings = async (req, res) => {
  const { empID } = req.query;

  try {
    console.log('🔍 Getting all trainings for user:', empID);

    // 1. Find user based on empID
    const user = await User.findOne({ empID })
      .populate({
        path: 'training.trainingId',
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Fetch all training progress using user ID
    const trainingProgress = await TrainingProgress.find({ userId: user._id });

    // 3. Get user's role/designation for mandatory training filtering
    const userRole = user.designation || user.role || 'generalist';
    console.log('🔍 User role for mandatory training filtering:', userRole);

    // 4. Process assigned trainings (non-mandatory)
    const assignedTrainings = user.training
      .filter(training => {
        const trainingType = training.trainingId.Trainingtype;
        const isMandatory = trainingType === 'Mandatory' || trainingType === 'mandatory';
        
        if (isMandatory) {
          console.log(`Skipping mandatory training "${training.trainingId.trainingName}" from assigned trainings`);
          return false;
        }
        
        return true;
      })
      .map(training => {
        const progress = trainingProgress.find(p => p.trainingId.toString() === training.trainingId._id.toString());

        if (!progress) {
          return {
            trainingId: training.trainingId._id,
            name: training.trainingId.trainingName || 'Unknown Training',
            completionPercentage: 0,
            type: 'assigned'
          };
        }

        let totalModules = 0;
        let completedModules = 0;
        let totalVideos = 0;
        let completedVideos = 0;

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
          name: training.trainingId.trainingName || 'Unknown Training',
          completionPercentage: overallCompletionPercentage.toFixed(2),
          type: 'assigned',
          totalModules,
          completedModules,
          totalVideos,
          completedVideos
        };
      });

    // 5. Get mandatory trainings that are assigned to user's role
    // Only include trainings specifically assigned to the user's role, not "All" or "No Role"
    const mandatoryTrainings = await Training.find({ 
      Trainingtype: 'Mandatory',
      Assignedfor: { $in: [userRole] } // Only include trainings assigned to user's specific role
    });

    console.log('🔍 User role:', userRole);
    console.log('🔍 Found mandatory trainings for role:', userRole, mandatoryTrainings.length);
    console.log('🔍 Mandatory training names:', mandatoryTrainings.map(t => t.trainingName));

    // 6. Process mandatory trainings with user-specific progress
    const processedMandatoryTrainings = await Promise.all(
      mandatoryTrainings.map(async (training) => {
        // Check if user has progress for this mandatory training
        const userProgress = trainingProgress.find(p => p.trainingId.toString() === training._id.toString());
        
        let totalModules = 0;
        let completedModules = 0;
        let totalVideos = 0;
        let completedVideos = 0;
        let completionPercentage = 0;

        if (userProgress) {
          // User has progress - calculate from their progress
          userProgress.modules.forEach(module => {
            totalModules++;
            if (module.pass) completedModules++;

            module.videos.forEach(video => {
              totalVideos++;
              if (video.pass) completedVideos++;
            });
          });

          const moduleCompletionPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
          const videoCompletionPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
          completionPercentage = (moduleCompletionPercentage + videoCompletionPercentage) / 2;
        } else {
          // User has no progress - set to 0
          totalModules = training.modules.length;
          totalVideos = 0; // Will be calculated when modules are populated
        }

        return {
          trainingId: training._id,
          name: training.trainingName,
          completionPercentage: completionPercentage.toFixed(2),
          type: 'mandatory',
          totalModules,
          completedModules,
          totalVideos,
          completedVideos,
          assignedFor: training.Assignedfor,
          hasUserProgress: !!userProgress
        };
      })
    );

    // 7. Calculate overall completion percentage
    const allTrainings = [...assignedTrainings, ...processedMandatoryTrainings];
    const totalCompletionPercentage = allTrainings.reduce((sum, training) => sum + parseFloat(training.completionPercentage), 0);
    const userOverallCompletionPercentage = allTrainings.length > 0 ? (totalCompletionPercentage / allTrainings.length).toFixed(2) : 0;

    // 8. Return unified response
    res.status(200).json({
      message: "All trainings data found",
      data: {
        user: {
          _id: user._id,
          empID: user.empID,
          name: user.name,
          designation: user.designation,
          role: user.role
        },
        assignedTrainings,
        mandatoryTrainings: processedMandatoryTrainings,
        allTrainings: allTrainings,
        userOverallCompletionPercentage,
        userRole
      }
    });

  } catch (error) {
    console.error('Error in GetUserAllTrainings:', error);
    res.status(500).json({ message: "Server error while fetching trainings" });
  }
};

import Assessment from '../model/Assessment.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import { Training } from '../model/Traning.js';
import User from '../model/User.js';
import Module from '../model/Module.js'; // Added import for Module
import { sendNotification } from '../utils/notificationHelper.js';

const getTrainingVideoStats = (training, progressRecords = []) => {
  const modules = Array.isArray(training?.modules) ? training.modules : [];
  const populatedVideos = modules.reduce((total, module) => {
    return total + (Array.isArray(module?.videos) ? module.videos.length : 0);
  }, 0);

  const populatedDuration = modules.reduce((total, module) => {
    return total + (Array.isArray(module?.videos)
      ? module.videos.reduce((sum, video) => sum + Number(video?.duration || video?.durationMinutes || 0), 0)
      : 0);
  }, 0);

  if (populatedVideos > 0 || populatedDuration > 0) {
    return { totalVideos: populatedVideos, durationMinutes: populatedDuration };
  }

  // Assigned training lists may only have module ids populated. Progress records keep the module/video shape.
  const progressStats = progressRecords.reduce(
    (best, record) => {
      const stats = (record?.modules || []).reduce(
        (acc, module) => {
          const videos = Array.isArray(module?.videos) ? module.videos : [];
          acc.totalVideos += videos.length;
          acc.durationMinutes += videos.reduce(
            (sum, video) => sum + Number(video?.totalDuration || video?.duration || video?.durationMinutes || 0),
            0
          );
          return acc;
        },
        { totalVideos: 0, durationMinutes: 0 }
      );

      return stats.totalVideos > best.totalVideos ? stats : best;
    },
    { totalVideos: 0, durationMinutes: 0 }
  );

  return progressStats;
};

// Helper function to assign existing mandatory trainings to new users
const assignExistingMandatoryTrainings = async (user) => {
  try {
    const designation = user.designation;
    console.log(`Assigning existing mandatory trainings to new user with designation: ${designation}`);
    
    // STRICT MATCHING: Only match exact roles, no partial matches (same logic as createMandatoryTraining)
    const matchExactDesignation = (userDesig, roleList) => {
        if (!userDesig || !Array.isArray(roleList)) return false;
        
        // Normalize the user designation (trim and lowercase)
        const normalizedUserDesig = userDesig.trim().toLowerCase();
        
        // Check if the user's designation exactly matches any of the roles in the training
        return roleList.some(role => {
            if (!role) return false;
            const normalizedRole = role.trim().toLowerCase();
            
            // EXACT MATCH ONLY - no partial matches
            return normalizedUserDesig === normalizedRole;
        });
    };

    // Fetch all mandatory trainings
    const allTrainings = await Training.find({
      Trainingtype: 'Mandatory'
    }).populate('modules');

    // Filter trainings using EXACT designation matching (same logic as createMandatoryTraining)
    const mandatoryTraining = allTrainings.filter(training => {
        const isMatch = matchExactDesignation(designation, training.Assignedfor);
        console.log(`  Training: "${training.trainingName}" - Roles: [${training.Assignedfor.join(', ')}] - User Designation: "${designation}" - Match: ${isMatch}`);
        return isMatch;
    });

    console.log(`Found ${mandatoryTraining.length} existing mandatory trainings for designation: ${designation}`);

    if (mandatoryTraining.length === 0) {
      console.log(`No existing mandatory trainings found for designation: ${designation}`);
      return;
    }

    // Create TrainingProgress records for each mandatory training
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

export const assignModuleToUser = async (req, res) => {
  try {
    const { userId, moduleId, deadline } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);

    user.assignedModules.push({
      moduleId,
      deadline: deadline || defaultDeadline
    });

    await user.save();
    res.status(200).json({ message: 'Module assigned successfully.', user });
  } catch (error) {
    console.error('Error assigning module:', error);
    res.status(500).json({ message: 'An error occurred while assigning the module.', error: error.message });
  }
};

export const assignAssessmentToUser = async (req, res) => {
  try {
    const { userId, assessmentId, deadline } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);

    user.assignedAssessments.push({
      assessmentId,
      deadline: deadline || defaultDeadline
    });

    await user.save();
    res.status(200).json({ message: 'Assessment assigned successfully.', user });
  } catch (error) {
    console.error('Error assigning assessment:', error);
    res.status(500).json({ message: 'An error occurred while assigning the assessment.', error: error.message });
  }
};

import { getAccessibleStoreIds, isFullAccessAdmin } from '../lib/permissions.js';
import Branch from "../model/Branch.js";
import Admin from "../model/Admin.js";

export const GetAllTrainingWithCompletion = async (req, res) => {
  try {
    const AdminId = req.admin?.userId;
    if (!AdminId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const AdminData = await Admin.findById(AdminId);
    if (!AdminData) {
        return res.status(404).json({ message: "Admin not found" });
    }

    const accessibleStoreIds = await getAccessibleStoreIds(AdminId);
    const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const allowedLocCodes = branches.map(branch => branch.locCode).filter(Boolean);
    const branchNames = branches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);

    // Fetch all trainings that have been assigned to users (have progress records)
    // We'll find trainings by looking at TrainingProgress records
    const progressRecords = await TrainingProgress.find().populate('trainingId', 'trainingName modules Trainingtype Assignedfor deadline');
    
    if (!progressRecords || progressRecords.length === 0) {
      return res.status(404).json({ message: "No assigned training data found" });
    }

    // Group progress records by training ID to get unique trainings
    const trainingMap = new Map();
    progressRecords.forEach(record => {
      if (record.trainingId) {
        const trainingId = record.trainingId._id.toString();
        if (!trainingMap.has(trainingId)) {
          trainingMap.set(trainingId, {
            training: record.trainingId,
            progressRecords: []
          });
        }
        trainingMap.get(trainingId).progressRecords.push(record);
      }
    });

    // Use internal users instead of the external employee API.
    const internalEmployees = await User.find(
      {},
      {
        empID: 1,
        username: 1,
        designation: 1,
        workingBranch: 1,
        locCode: 1,
        email: 1,
      }
    ).lean();

    const employeeData = internalEmployees.map((user) => ({
      empID: user.empID || '',
      username: user.username || '',
      designation: user.designation || '',
      workingBranch: user.workingBranch || '',
      locCode: user.locCode || '',
      email: user.email || '',
    }));

    // Create a map for quick employee lookup by empID
    const employeeMap = new Map();
    employeeData.forEach(emp => {
      if (emp.empID) {
        employeeMap.set(emp.empID, {
          empID: emp.empID,
          username: emp.username,
          designation: emp.designation,
          workingBranch: emp.workingBranch,
          locCode: emp.locCode,
          email: emp.email,
        });
      }
          });

      // Keep both assigned and mandatory trainings in the unified list.
      const filteredTrainingMap = new Map();
      Array.from(trainingMap.values()).forEach(({ training, progressRecords }) => {
        filteredTrainingMap.set(training._id.toString(), { training, progressRecords });
      });

      // Process each training to calculate completion percentages
      const trainingData = await Promise.all(
        Array.from(filteredTrainingMap.values()).map(async ({ training, progressRecords }) => {
        let totalUsers = 0;
        let totalPercentage = 0;
        const userProgress = [];
        const uniqueBranches = new Set();
        const uniqueDesignations = new Set();

        // Calculate completion percentage for each user's progress
        await Promise.all(progressRecords.map(async (record) => {
          totalUsers++;

          let totalModules = 0;
          let completedModules = 0;
          let totalVideos = 0;
          let completedVideos = 0;
          const videoCompletionMap = new Map();

          if (record.modules && Array.isArray(record.modules)) {
            record.modules.forEach((module) => {
              totalModules++;
              if (module.pass) completedModules++;

              if (module.videos && Array.isArray(module.videos)) {
                module.videos.forEach((video) => {
                  totalVideos++;
                  if (video.pass && !videoCompletionMap.has(video._id.toString())) {
                    completedVideos++;
                    videoCompletionMap.set(video._id.toString(), true);
                  }
                });
              }
            });
          }

          const moduleCompletion = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
          const videoCompletion = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
          const userPercentage = (moduleCompletion * 0.4) + (videoCompletion * 0.6);

          totalPercentage += userPercentage;

          // Get employee data from local API or fallback to internal user data
          let employeeInfo = null;
          if (record.userId?.empID) {
            employeeInfo = employeeMap.get(record.userId.empID);
          }

          // Use local API data if available, otherwise fallback to internal data
          const finalUserData = employeeInfo || {
            empID: record.userId?.empID || '',
            username: record.userId?.username || '',
            designation: record.userId?.designation || '',
            workingBranch: record.userId?.workingBranch || '',
            locCode: record.userId?.locCode || '',
            email: record.userId?.email || ''
          };

          // Check RBAC before pushing the record
          if (!isFullAccessAdmin(AdminData.role)) {
              const isAccessible = allowedLocCodes.includes(finalUserData.locCode) ||
                  branchNames.includes(finalUserData.workingBranch) ||
                  branchNames.some(name => new RegExp(name, 'i').test(finalUserData.locCode));
                  
              if (!isAccessible) {
                  return; // Skip if user is not in admin's scope
              }
          }

          // Add unique branches and designations from local API data
          if (finalUserData.workingBranch) uniqueBranches.add(finalUserData.workingBranch);
          if (finalUserData.designation) uniqueDesignations.add(finalUserData.designation);

          userProgress.push({
            userId: record.userId?._id,
            empID: finalUserData.empID,
            username: finalUserData.username,
            email: finalUserData.email,
            workingBranch: finalUserData.workingBranch,
            designation: finalUserData.designation,
            modules: record.modules || [],
            overallCompletionPercentage: userPercentage.toFixed(2),
          });
        }));

        // Also add unique branches and designations from all employees (for filtering)
        employeeData.forEach(emp => {
          if (emp.workingBranch) uniqueBranches.add(emp.workingBranch);
          if (emp.designation) uniqueDesignations.add(emp.designation);
        });

        const averageCompletionPercentage = totalUsers > 0 ? (totalPercentage / totalUsers).toFixed(2) : 0;
        const { totalVideos: totalVideosInTraining, durationMinutes } =
          getTrainingVideoStats(training, progressRecords);

        return {
          trainingId: training._id,
          trainingName: training.trainingName,
          trainingTitle: training.title,
          numberOfModules: training.modules ? training.modules.length : 0,
          totalVideos: totalVideosInTraining,
          durationMinutes,
          totalUsers, // Show actually assigned users on training cards
          totalAssignedUsers: totalUsers, // Show actually assigned users
          averageCompletionPercentage,
          uniqueBranches: Array.from(uniqueBranches),
          uniqueItems: Array.from(uniqueDesignations),
          userProgress,
          allEmployees: employeeData.length,
          Trainingtype: training.Trainingtype || 'Assigned',
          trainingType: training.Trainingtype || 'Assigned',
          assignedFor: training.Assignedfor || []
        };
      })
    );

          res.status(200).json({
        message: "Training data fetched successfully",
        data: trainingData
      });
  } catch (error) {
    console.error('Error fetching assigned training data:', error.message);
    res.status(500).json({ message: "Server error while fetching assigned training data" });
  }
};










export const ReassignTraining = async (req, res) => {
  try {
    const { assignedTo, trainingId } = req.body; // Extract trainingId and assigned users from the request body

    // Validate the data
    if (!assignedTo || !trainingId || assignedTo.length === 0) {
      return res.status(400).json({ message: "Missing assignedTo or trainingId in the request body" });
    }

    // Fetch the training using trainingId and populate the modules
    const training = await Training.findById(trainingId).populate('modules');
    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    // Check if modules exist
    if (!training.modules || !Array.isArray(training.modules) || training.modules.length === 0) {
      return res.status(400).json({ message: "No modules found for this training" });
    }

    // Resolve employees from the internal users collection.
    const selectedUsers = await User.find({ empID: { $in: assignedTo } }).lean();
    const employeeMap = new Map();
    selectedUsers.forEach((user) => {
      if (user.empID) {
        employeeMap.set(user.empID, user);
      }
    });

    const deadlineDate = new Date(Date.now() + training.deadline * 24 * 60 * 60 * 1000);
    const processedUsers = [];

    // Process each assigned employee code
    for (const empCode of assignedTo) {
      const employeeInfo = employeeMap.get(empCode);
      if (!employeeInfo) {
        console.warn(`Employee with code ${empCode} not found in internal users collection`);
        continue;
      }

      // Find or create user in internal database
      let user = await User.findOne({ empID: empCode });
      
      if (!user) {
        // Create new user from external employee data
        user = new User({
          username: employeeInfo.username || '',
          email: employeeInfo.email || `${empCode}@company.com`,
          phoneNumber: employeeInfo.phoneNumber || '',
          locCode: employeeInfo.locCode || '1',
          empID: empCode,
          designation: employeeInfo.designation || '',
          workingBranch: employeeInfo.workingBranch || '',
          source: 'internal-sync',
          assignedModules: [],
          assignedAssessments: [],
          training: []
        });
        
        // IMPORTANT: Assign existing mandatory trainings to new external employee
        await assignExistingMandatoryTrainings(user);
        console.log(`Assigned existing mandatory trainings to new external employee: ${empCode}`);
      } else {
        // Update existing user with latest employee data
        user.username = employeeInfo.username || user.username;
        user.designation = employeeInfo.designation || user.designation;
        user.workingBranch = employeeInfo.workingBranch || user.workingBranch;
        user.email = employeeInfo.email || user.email;
        
        // IMPORTANT: Don't update locCode from external API to preserve our branch mapping fix
        // The locCode should remain as our corrected value (e.g., "15" for SUITOR GUY EDAPPAL)
        // user.locCode = employeeInfo.store_code || user.locCode; // COMMENTED OUT
      }

      // Check if this is a mandatory training
      const isMandatory = training.Trainingtype === 'Mandatory' || training.Trainingtype === 'mandatory';
      
      if (isMandatory) {
        // For mandatory trainings, only create progress records, don't add to user.training array
        console.log(`Handling mandatory training "${training.trainingName}" - not adding to user.training array`);
        
        // Check if the user already has progress for this mandatory training
        const existingProgress = await TrainingProgress.findOne({ userId: user._id, trainingId: training._id });
        if (existingProgress) {
          // Remove the existing progress
          await TrainingProgress.deleteOne({ userId: user._id, trainingId: training._id });
        }
      } else {
        // For regular trainings, handle as before
        const existingTrainingIndex = user.training.findIndex(t => t.trainingId.toString() === trainingId);
        if (existingTrainingIndex !== -1) {
          // Remove the existing training and progress
          user.training.splice(existingTrainingIndex, 1);
          await TrainingProgress.deleteOne({ userId: user._id, trainingId: training._id });
        }

        // Add training to user.training array for regular trainings
        user.training.push({
          trainingId: training._id,
          deadline: deadlineDate,
          pass: false,
          status: 'Pending',
        });
      }

      await user.save(); // Save the user first to get the _id

      // Create TrainingProgress for the user
      const trainingProgress = new TrainingProgress({
        userId: user._id,
        trainingName: training.trainingName,
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

      // Send notification to the user
      const senderName = req.admin?.username || 'Admin';
      await sendNotification({
        title: 'New Training Assigned',
        body: `You have been assigned a training program: "${training.trainingName}"`,
        userIds: [user._id],
        senderName,
        category: 'Training'
      });

      processedUsers.push(user);
    }

    res.status(200).json({ 
      message: `Training successfully reassigned to ${processedUsers.length} users`,
      assignedUsers: processedUsers.length,
      totalRequested: assignedTo.length
    });
  } catch (error) {
    console.error("Error reassigning training:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const deleteTrainingController = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Delete the training from the Trainings collection
    const deletedTraining = await Training.findByIdAndDelete(id);
    if (!deletedTraining) {
      return res.status(404).json({ message: 'Training not found' });
    }

    await TrainingProgress.deleteMany({ trainingId: id });

    await User.updateMany(
      { "training.trainingId": id }, // Match users who have this training assigned
      { $pull: { training: { trainingId: id } } } // Pull the training from the user's assigned trainings
    );

    return res.status(200).json({ message: 'Training deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// API endpoint to assign missing mandatory trainings to users by designation
export const assignMissingMandatoryTrainingsByDesignation = async (req, res) => {
  try {
    const { designation } = req.body;
    
    if (!designation) {
      return res.status(400).json({ 
        message: 'Designation is required',
        example: { designation: 'Store Manager' }
      });
    }

    console.log(`API call: Assigning missing mandatory trainings for designation: ${designation}`);

    // STRICT MATCHING: Only match exact roles, no partial matches
    const matchExactDesignation = (userDesig, roleList) => {
        if (!userDesig || !Array.isArray(roleList)) return false;
        
        // Normalize the user designation (trim and lowercase)
        const normalizedUserDesig = userDesig.trim().toLowerCase();
        
        // Check if the user's designation exactly matches any of the roles in the training
        return roleList.some(role => {
            if (!role) return false;
            const normalizedRole = role.trim().toLowerCase();
            
            // EXACT MATCH ONLY - no partial matches
            return normalizedUserDesig === normalizedRole;
        });
    };

    // Find users with the specified designation (case-insensitive exact match)
    const users = await User.find({ 
      designation: { $regex: new RegExp(`^${designation.trim()}$`, 'i') }
    });

    if (users.length === 0) {
      return res.status(404).json({ 
        message: `No users found with designation: ${designation}`,
        suggestion: 'Please check if the designation name is spelled correctly'
      });
    }

    console.log(`Found ${users.length} users with designation: ${designation}`);

    // Get all mandatory trainings
    const mandatoryTrainings = await Training.find({ Trainingtype: 'Mandatory' }).populate('modules');
    console.log(`Found ${mandatoryTrainings.length} mandatory trainings`);

    let totalAssigned = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const assignmentResults = [];

    for (const user of users) {
      console.log(`Processing user: ${user.username} (${user.empID})`);
      
      // Find mandatory trainings that match this user's designation
      const matchingTrainings = mandatoryTrainings.filter(training => {
          const isMatch = matchExactDesignation(user.designation, training.Assignedfor);
          console.log(`  Training: "${training.trainingName}" - Match: ${isMatch}`);
          return isMatch;
      });

      console.log(`Found ${matchingTrainings.length} matching mandatory trainings for user ${user.empID}`);

      for (const training of matchingTrainings) {
        try {
          // Check if user already has this training assigned
          const existingProgress = await TrainingProgress.findOne({
            userId: user._id,
            trainingId: training._id
          });

          if (existingProgress) {
            console.log(`Training "${training.trainingName}" already assigned to ${user.empID} - skipping`);
            totalSkipped++;
            continue;
          }

          // Create new training progress
          const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day deadline

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
          console.log(`✅ Assigned mandatory training "${training.trainingName}" to ${user.empID}`);
          totalAssigned++;

          assignmentResults.push({
            userEmpID: user.empID,
            userName: user.username,
            trainingName: training.trainingName,
            status: 'assigned'
          });

        } catch (error) {
          console.error(`Error assigning training "${training.trainingName}" to ${user.empID}:`, error.message);
          totalErrors++;
          
          assignmentResults.push({
            userEmpID: user.empID,
            userName: user.username,
            trainingName: training.trainingName,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return res.status(200).json({
      message: `Successfully processed mandatory training assignments for designation: ${designation}`,
      summary: {
        usersProcessed: users.length,
        trainingsAssigned: totalAssigned,
        alreadyAssigned: totalSkipped,
        errors: totalErrors
      },
      results: assignmentResults
    });

  } catch (error) {
    console.error('Error in assignMissingMandatoryTrainingsByDesignation:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

// NEW API endpoint to assign missing mandatory trainings to ALL users
export const assignMissingMandatoryTrainingsToAllUsers = async (req, res) => {
  try {
    console.log(`🚀 API call: Assigning missing mandatory trainings to ALL users`);
    
    // STRICT MATCHING: Only match exact roles, no partial matches
    const matchExactDesignation = (userDesig, roleList) => {
        if (!userDesig || !Array.isArray(roleList)) return false;
        
        // Normalize the user designation (trim and lowercase)
        const normalizedUserDesig = userDesig.trim().toLowerCase();
        
        // Check if the user's designation exactly matches any of the roles in the training
        return roleList.some(role => {
            if (!role) return false;
            const normalizedRole = role.trim().toLowerCase();
            
            // EXACT MATCH ONLY - no partial matches
            return normalizedUserDesig === normalizedRole;
        });
    };

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} total users`);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found in the system'
      });
    }

    // Get all mandatory trainings
    const mandatoryTrainings = await Training.find({ Trainingtype: 'Mandatory' }).populate('modules');
    console.log(`📚 Found ${mandatoryTrainings.length} mandatory trainings`);

    let totalAssigned = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const assignmentResults = [];
    const designationSummary = {};

    for (const user of users) {
      console.log(`\n=== Processing User: ${user.username} (${user.empID}) - Designation: "${user.designation}" ===`);
      
      if (!designationSummary[user.designation]) {
        designationSummary[user.designation] = { users: 0, assigned: 0, skipped: 0, errors: 0 };
      }
      designationSummary[user.designation].users++;
      
      // Find mandatory trainings that match this user's designation
      const matchingTrainings = mandatoryTrainings.filter(training => {
          const isMatch = matchExactDesignation(user.designation, training.Assignedfor);
          console.log(`  Training: "${training.trainingName}" - Roles: [${training.Assignedfor.join(', ')}] - Match: ${isMatch}`);
          return isMatch;
      });

      console.log(`📋 Found ${matchingTrainings.length} matching mandatory trainings for user ${user.empID}`);

      for (const training of matchingTrainings) {
        try {
          // Check if user already has this training assigned
          const existingProgress = await TrainingProgress.findOne({
            userId: user._id,
            trainingId: training._id
          });

          if (existingProgress) {
            console.log(`  ⏭️  Training "${training.trainingName}" already assigned to ${user.empID} - skipping`);
            totalSkipped++;
            designationSummary[user.designation].skipped++;
            continue;
          }

          // Create new training progress
          const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day deadline

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
          console.log(`  ✅ Assigned mandatory training "${training.trainingName}" to ${user.empID}`);
          
          assignmentResults.push({
            userEmpID: user.empID,
            userName: user.username,
            designation: user.designation,
            trainingName: training.trainingName,
            status: 'assigned'
          });
          
          totalAssigned++;
          designationSummary[user.designation].assigned++;

        } catch (error) {
          console.error(`  ❌ Error assigning training "${training.trainingName}" to ${user.empID}:`, error.message);
          
          assignmentResults.push({
            userEmpID: user.empID,
            userName: user.username,
            designation: user.designation,
            trainingName: training.trainingName,
            status: 'error',
            error: error.message
          });
          
          totalErrors++;
          designationSummary[user.designation].errors++;
        }
      }
    }

    console.log('\n=== ASSIGNMENT SUMMARY ===');
    console.log('Overall:', {
      totalUsers: users.length,
      totalAssigned,
      totalSkipped,
      totalErrors
    });
    
    console.log('\nBy Designation:');
    Object.entries(designationSummary).forEach(([designation, stats]) => {
      console.log(`  ${designation}: ${stats.users} users, ${stats.assigned} assigned, ${stats.skipped} skipped, ${stats.errors} errors`);
    });

    res.status(200).json({
      success: true,
      message: `Successfully processed mandatory training assignments for all users`,
      results: {
        totalUsers: users.length,
        totalAssigned,
        totalSkipped,
        totalErrors,
        designationSummary,
        assignments: assignmentResults.length > 100 ? assignmentResults.slice(0, 100) : assignmentResults, // Limit response size
        totalAssignmentRecords: assignmentResults.length
      }
    });

  } catch (error) {
    console.error('❌ Error in assignMissingMandatoryTrainingsToAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getUserTrainingProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // First, try to find user by MongoDB _id, then by empID if that fails
    let user = null;
    let actualUserId = null;
    
    // Check if userId is a valid MongoDB ObjectId
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      actualUserId = userId;
      user = await User.findById(userId);
    } else {
      // It's likely an empID, find the user first
      user = await User.findOne({ empID: userId });
      if (user) {
        actualUserId = user._id;
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        message: "User not found",
        searchedBy: userId.match(/^[0-9a-fA-F]{24}$/) ? "MongoDB ID" : "Employee ID"
      });
    }
    
    // Find all mandatory training progress for this user using the actual MongoDB _id
    const trainingProgressRecords = await TrainingProgress.find({ userId: actualUserId })
      .populate({
        path: 'trainingId',
        select: 'trainingName modules Trainingtype deadline'
      });
    
    // Format the mandatory trainings to match the user.training structure
    const mandatoryTrainings = trainingProgressRecords.map(progress => {
      let totalModules = 0;
      let completedModules = 0;
      let totalVideos = 0;
      let completedVideos = 0;
      const videoCompletionMap = new Map();

      if (progress.modules) {
        progress.modules.forEach((module) => {
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
      const progressPercentage = Math.round(moduleCompletion * 0.4 + videoCompletion * 0.6);

      return {
        trainingId: progress.trainingId,
        deadline: progress.deadline,
        status: progress.status,
        pass: progress.pass,
        assignedAt: progress.createdAt,
        isMandatory: true,
        progressPercentage
      };
    });
    
    res.status(200).json({
      message: "Training progress retrieved successfully",
      mandatoryTrainings,
      totalMandatoryTrainings: mandatoryTrainings.length,
      userInfo: {
        empID: user.empID,
        username: user.username,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error('Error fetching user training progress:', error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

export const MandatoryGetAllTrainingWithCompletion = async (req, res) => {
  try {
    const AdminId = req.admin?.userId;
    if (!AdminId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const AdminData = await Admin.findById(AdminId);
    if (!AdminData) {
        return res.status(404).json({ message: "Admin not found" });
    }

    const accessibleStoreIds = await getAccessibleStoreIds(AdminId);
    const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const allowedLocCodes = branches.map(branch => branch.locCode).filter(Boolean);
    const branchNames = branches.map(branch => branch.branchName || branch.workingBranch).filter(Boolean);

    console.log("Entered");

    // Fetch all mandatory trainings
    const trainings = await Training.find({ Trainingtype: "Mandatory" }).populate("modules");

    if (!trainings || trainings.length === 0) {
      return res.status(404).json({ message: "No training data found" });
    }

    // Process each training to calculate completion percentages
    const trainingData = await Promise.all(
      trainings.map(async (training) => {
        const progressRecords = await TrainingProgress.find({
          trainingId: training._id,
        }).populate("userId", "designation"); // Populate only 'designation' of 'userId'

        let totalUsers = 0;
        let totalPercentage = 0;
        const userProgress = []; // Store user progress for each training

        // Calculate completion percentage for each user's progress
        for (const record of progressRecords) {
          if (!record.userId) {
            console.warn(`TrainingProgress record with null userId for trainingId: ${training._id}`);
            continue; // Skip this record if userId is null
          }

          // Check RBAC
          if (!isFullAccessAdmin(AdminData.role)) {
              const userLocCode = record.userId.locCode || '';
              const userWorkingBranch = record.userId.workingBranch || '';
              const isAccessible = allowedLocCodes.includes(userLocCode) ||
                  branchNames.includes(userWorkingBranch) ||
                  branchNames.some(name => new RegExp(name, 'i').test(userLocCode));
                  
              if (!isAccessible) {
                  continue; // Skip if user is not in admin's scope
              }
          }

          totalUsers++;

          let totalModules = 0;
          let completedModules = 0;
          let totalVideos = 0;
          let completedVideos = 0;
          const videoCompletionMap = new Map(); // To track which videos have been completed

          record.modules.forEach((module) => {
            totalModules++;

            // Count completed modules
            if (module.pass) completedModules++;

            module.videos.forEach((video) => {
              totalVideos++;

              // Track video completion by video ID
              if (video.pass && !videoCompletionMap.has(video._id.toString())) {
                completedVideos++;
                videoCompletionMap.set(video._id.toString(), true);
              }
            });
          });

          // Calculate completion percentages
          const moduleCompletion = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
          const videoCompletion = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

          // Weighted completion percentage (40% modules, 60% videos)
          const userPercentage = moduleCompletion * 0.4 + videoCompletion * 0.6;

          totalPercentage += userPercentage;

          // Store user progress
          userProgress.push({
            userId: record.userId._id,
            designation: record.userId.designation, // Only include 'designation'
            overallCompletionPercentage: userPercentage.toFixed(2), // User's completion percentage
          });
        }

        // Calculate average completion percentage for the training
        const averageCompletionPercentage =
          totalUsers > 0 ? (totalPercentage / totalUsers).toFixed(2) : 0;

        const uniqueItems = [
          ...new Set(progressRecords.map((record) => record.userId?.designation || null)),
        ];
        const { totalVideos: totalVideosInTraining, durationMinutes } =
          getTrainingVideoStats(training, progressRecords);

        return {
          trainingId: training._id,
          trainingName: training.trainingName,
          trainingTitle: training.title,
          Trainingtype: training.Trainingtype, // Include the training type
          numberOfModules: training.modules.length,
          totalVideos: totalVideosInTraining,
          durationMinutes,
          totalUsers,
          averageCompletionPercentage, // The average completion percentage for all users
          userProgress,
          uniqueItems, // Unique designations
        };
      })
    );

    console.log(trainingData);

    // Return training data with percentages
    res.status(200).json({
      message: "Training data fetched successfully",
      data: trainingData,
    });
  } catch (error) {
    console.error("Error fetching training data:", error.message);
    res
      .status(500)
      .json({ message: "Server error while fetching training data", error: error.message });
  }
};

export const GetAllFullTrainingWithCompletion = async (req, res) => {
  try {
    // Fetch all trainings
    const trainings = await Training.find().populate('modules'); // Populate modules for reference

    if (!trainings || trainings.length === 0) {
      return res.status(404).json({ message: "No training data found" });
    }

    // Process each training to calculate completion percentages
    const trainingData = await Promise.all(
      trainings.map(async (training) => {
        const progressRecords = await TrainingProgress.find({
          trainingId: training._id
        });

        let totalUsers = 0;
        let totalPercentage = 0;
        const userProgress = []; // Store user progress for each training

        // Calculate completion percentage for each user's progress
        await Promise.all(progressRecords.map(async (record) => {
          totalUsers++;

          let totalModules = 0;
          let completedModules = 0;
          let totalVideos = 0;
          let completedVideos = 0;
          const videoCompletionMap = new Map(); // To track which videos have been completed

          record.modules.forEach((module) => {
            totalModules++;

            // Count completed modules
            if (module.pass) completedModules++;

            module.videos.forEach((video) => {
              totalVideos++;

              // Track the video completion by video ID, ensuring each video is only counted once
              if (video.pass && !videoCompletionMap.has(video._id.toString())) {
                completedVideos++;
                videoCompletionMap.set(video._id.toString(), true);
              }
            });
          });

          // Calculate the completion percentages based on module and video completion
          const moduleCompletion = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
          const videoCompletion = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

          // The user's overall completion percentage is weighted (40% for modules, 60% for videos)
          const userPercentage = (moduleCompletion * 0.4) + (videoCompletion * 0.6);

          totalPercentage += userPercentage;

          // Store user progress for each user
          userProgress.push({
            userId: record.userId,
            username: record.username,
            email: record.email,
            modules: record.modules,
            overallCompletionPercentage: userPercentage.toFixed(2), // User's completion percentage
          });
        }));

        // Calculate average completion percentage for the training based on all users
        const averageCompletionPercentage = totalUsers > 0 ? (totalPercentage / totalUsers).toFixed(2) : 0;
        const { totalVideos: totalVideosInTraining, durationMinutes } =
          getTrainingVideoStats(training, progressRecords);

        return {
          trainingId: training._id,
          trainingName: training.trainingName,
          trainingTitle: training.title,
          numberOfModules: training.modules.length,
          totalVideos: totalVideosInTraining,
          durationMinutes,
          totalUsers,
          averageCompletionPercentage, // The average completion percentage for all users
          userProgress // Return the detailed user progress
        };
      })
    );

    // Return training data with percentages
    res.status(200).json({
      message: "Training data fetched successfully",
      data: trainingData
    });
  } catch (error) {
    console.error('Error fetching training data:', error.message);
    res.status(500).json({ message: "Server error while fetching training data" });
  }
};


export const GetAssessment = async (req, res) => {
  try {
    const assessments = await Assessment.find(); // Fetch all assessments
    const users = await User.find(); // Fetch all users

    const results = [];

    for (const assess of assessments) {
      let totalAssigned = 0;
      let totalPassed = 0;
      const countedEmployees = new Set();

      for (const user of users) {
        const matchingAssignments = (user.assignedAssessments || [])
          .filter((assignment) => assignment.assessmentId && assignment.assessmentId.toString() === assess._id.toString())
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        const assigned = matchingAssignments[0];

        if (!assigned) continue;

        // Count each employee once, even if duplicate assignment records exist.
        const employeeKey = String(user.empID || user._id);
        if (countedEmployees.has(employeeKey)) continue;
        countedEmployees.add(employeeKey);

        totalAssigned++;

        if (assigned.pass || String(assigned.status || "").toLowerCase() === "completed") {
          totalPassed++;
        }
      }

      const completionPercentage = totalAssigned
        ? ((totalPassed / totalAssigned) * 100).toFixed(2)
        : 0;


      results.push({
        assessmentId: assess._id,
        assessmentName: assess.title,
        assessment: assess.questions.length,
        assessmentdeadline: assess.deadline,
        assessmentduration: assess.duration,
        totalAssigned,
        totalPassed,
        completionPercentage: completionPercentage,
      });
    }

    res.status(200).json({
      message: 'Assessments retrieved successfully.',
      data: results,
    });
  } catch (error) {
    console.error('Error retrieving assessments:', error);
    res.status(500).json({
      message: 'An error occurred while retrieving the assessments.',
      error: error.message,
    });
  }
};

// Get video assessment questions
export const getVideoAssessment = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: "Video ID is required"
            });
        }

        // Find the module that contains this video
        const module = await Module.findOne({
            "videos._id": videoId
        });

        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // Find the specific video
        const video = module.videos.find(v => v._id.toString() === videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // Check if video has questions
        if (!video.questions || video.questions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Video has no assessment questions",
                data: {
                    videoId: video._id,
                    videoTitle: video.title,
                    questions: []
                }
            });
        }

        // Return only the questions (without correct answers for security)
        const questions = video.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options
        }));

        res.status(200).json({
            success: true,
            message: "Video assessment questions retrieved successfully",
            data: {
                videoId: video._id,
                videoTitle: video.title,
                questions: questions
            }
        });

    } catch (error) {
        console.error('Error getting video assessment:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Submit video assessment answers
export const submitVideoAssessment = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { answers, userId, trainingId, moduleId } = req.body;
        
        if (!videoId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Video ID and answers array are required"
            });
        }

        // Find the module that contains this video
        const module = await Module.findOne({
            "videos._id": videoId
        });

        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // Find the specific video
        const video = module.videos.find(v => v._id.toString() === videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        // Validate answers and calculate score
        let correctAnswers = 0;
        const totalQuestions = video.questions.length;
        
        const results = answers.map(userAnswer => {
            const question = video.questions.find(q => q._id.toString() === userAnswer.questionId);
            if (!question) {
                return {
                    questionId: userAnswer.questionId,
                    correct: false,
                    error: "Question not found"
                };
            }
            
            const isCorrect = question.correctAnswer === userAnswer.selectedAnswer;
            if (isCorrect) correctAnswers++;
            
            return {
                questionId: userAnswer.questionId,
                selectedAnswer: userAnswer.selectedAnswer,
                correctAnswer: question.correctAnswer,
                correct: isCorrect
            };
        });

        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const passed = score >= 70; // 70% passing threshold

        // Save assessment result to training progress
        if (userId && trainingId && moduleId) {
            try {
                const TrainingProgress = await import('../model/Trainingprocessschema.js');
                
                // Find existing training progress
                let trainingProgress = await TrainingProgress.default.findOne({
                    userId: userId,
                    trainingId: trainingId,
                    moduleId: moduleId
                });

                if (trainingProgress) {
                    // Update existing progress
                    const videoProgress = trainingProgress.videos.find(v => v.videoId.toString() === videoId);
                    if (videoProgress) {
                        videoProgress.assessmentCompleted = true;
                        videoProgress.assessmentScore = score;
                        videoProgress.assessmentPassed = passed;
                        videoProgress.assessmentAnswers = results;
                        videoProgress.completedAt = new Date();
                    } else {
                        // Add new video progress
                        trainingProgress.videos.push({
                            videoId: videoId,
                            assessmentCompleted: true,
                            assessmentScore: score,
                            assessmentPassed: passed,
                            assessmentAnswers: results,
                            completedAt: new Date()
                        });
                    }
                    
                    await trainingProgress.save();
                }
            } catch (progressError) {
                console.error('Error saving training progress:', progressError);
                // Continue with response even if progress save fails
            }
        }

        res.status(200).json({
            success: true,
            message: "Video assessment submitted successfully",
            data: {
                videoId: videoId,
                score: score,
                passed: passed,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                results: results
            }
        });

    } catch (error) {
        console.error('Error submitting video assessment:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


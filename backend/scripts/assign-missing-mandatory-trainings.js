import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/User.js';
import { Training } from '../model/Traning.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import Module from '../model/Module.js'; // Added missing Module import

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Helper function to assign existing mandatory trainings to users
const assignExistingMandatoryTrainings = async (user) => {
  try {
    const designation = user.designation;
    console.log(`  🔍 Checking mandatory trainings for: ${user.empID} (${designation})`);
    
    // Function to flatten a string (remove spaces and lowercase)
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

    if (mandatoryTraining.length === 0) {
      console.log(`  ℹ️  No mandatory trainings found for designation: ${designation}`);
      return { assigned: 0, skipped: 0 };
    }

    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline
    let assignedCount = 0;
    let skippedCount = 0;

    // Create TrainingProgress records for each mandatory training
    for (const training of mandatoryTraining) {
      // Check if this user already has this training assigned
      const existingProgress = await TrainingProgress.findOne({
        userId: user._id,
        trainingId: training._id
      });

      if (existingProgress) {
        console.log(`    ⏭️  Already has: "${training.trainingName}"`);
        skippedCount++;
        continue;
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
      console.log(`    ✅ Assigned: "${training.trainingName}"`);
      assignedCount++;
    }

    return { assigned: assignedCount, skipped: skippedCount };
    
  } catch (error) {
    console.error(`❌ Error assigning mandatory trainings to user ${user.empID}:`, error);
    return { assigned: 0, skipped: 0 };
  }
};

const main = async () => {
  await connectDB();
  
  console.log('🚀 Starting mandatory training assignment for existing users...');
  console.log('='.repeat(60));

  try {
    // Get all users
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} total users in the system`);
    
    // Group users by designation for reporting
    const usersByDesignation = {};
    allUsers.forEach(user => {
      const designation = user.designation || 'Unknown';
      if (!usersByDesignation[designation]) {
        usersByDesignation[designation] = [];
      }
      usersByDesignation[designation].push(user);
    });

    console.log('\n📈 User breakdown by designation:');
    Object.entries(usersByDesignation).forEach(([designation, users]) => {
      console.log(`  ${designation}: ${users.length} users`);
    });

    console.log('\n🔄 Processing users...');
    let totalAssigned = 0;
    let totalSkipped = 0;
    let processedUsers = 0;

    for (const [designation, users] of Object.entries(usersByDesignation)) {
      console.log(`\n📋 Processing ${users.length} users with designation: "${designation}"`);
      
      for (const user of users) {
        const result = await assignExistingMandatoryTrainings(user);
        totalAssigned += result.assigned;
        totalSkipped += result.skipped;
        processedUsers++;
        
        if (result.assigned > 0) {
          console.log(`  ✅ ${user.empID}: Assigned ${result.assigned}, Skipped ${result.skipped}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY:');
    console.log(`  👥 Total users processed: ${processedUsers}`);
    console.log(`  ✅ Total trainings assigned: ${totalAssigned}`);
    console.log(`  ⏭️  Total trainings skipped (already assigned): ${totalSkipped}`);
    console.log('🎉 Process completed successfully!');

  } catch (error) {
    console.error('❌ Error during processing:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

main().catch(console.error);

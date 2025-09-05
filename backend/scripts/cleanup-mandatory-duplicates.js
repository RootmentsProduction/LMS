// Cleanup script to remove mandatory trainings from users' training arrays
// This fixes the duplication issue for existing data

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
const User = (await import('../model/User.js')).default;
const { Training } = await import('../model/Traning.js');

const cleanupMandatoryDuplicates = async () => {
    try {
        console.log('🔧 Starting cleanup of mandatory training duplicates...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/LMS');
        console.log('✅ Connected to MongoDB');
        
        // Find all mandatory trainings
        const mandatoryTrainings = await Training.find({
            Trainingtype: { $in: ['Mandatory', 'mandatory'] }
        });
        
        console.log(`📋 Found ${mandatoryTrainings.length} mandatory trainings`);
        
        if (mandatoryTrainings.length === 0) {
            console.log('✅ No mandatory trainings found, nothing to clean up');
            return;
        }
        
        const mandatoryTrainingIds = mandatoryTrainings.map(t => t._id.toString());
        console.log('📋 Mandatory training IDs:', mandatoryTrainingIds);
        
        // Find all users who have mandatory trainings in their training array
        const usersWithMandatoryTrainings = await User.find({
            'training.trainingId': { $in: mandatoryTrainingIds }
        });
        
        console.log(`👥 Found ${usersWithMandatoryTrainings.length} users with mandatory trainings in their training array`);
        
        let cleanedCount = 0;
        
        // Remove mandatory trainings from each user's training array
        for (const user of usersWithMandatoryTrainings) {
            const originalLength = user.training.length;
            
            // Filter out mandatory trainings from user.training array
            user.training = user.training.filter(training => {
                const isMandatory = mandatoryTrainingIds.includes(training.trainingId.toString());
                if (isMandatory) {
                    console.log(`🗑️ Removing mandatory training from user ${user.username} (${user.empID})`);
                    return false;
                }
                return true;
            });
            
            const newLength = user.training.length;
            const removedCount = originalLength - newLength;
            
            if (removedCount > 0) {
                await user.save();
                cleanedCount += removedCount;
                console.log(`✅ Cleaned ${removedCount} mandatory training(s) from user ${user.username}`);
            }
        }
        
        console.log(`🎉 Cleanup completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Total mandatory trainings found: ${mandatoryTrainings.length}`);
        console.log(`   - Users processed: ${usersWithMandatoryTrainings.length}`);
        console.log(`   - Mandatory trainings removed from user arrays: ${cleanedCount}`);
        
        // Verify the cleanup
        const remainingUsersWithMandatoryTrainings = await User.find({
            'training.trainingId': { $in: mandatoryTrainingIds }
        });
        
        if (remainingUsersWithMandatoryTrainings.length === 0) {
            console.log('✅ Verification: No users have mandatory trainings in their training arrays');
        } else {
            console.log(`⚠️ Warning: ${remainingUsersWithMandatoryTrainings.length} users still have mandatory trainings in their training arrays`);
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Run the cleanup
cleanupMandatoryDuplicates();

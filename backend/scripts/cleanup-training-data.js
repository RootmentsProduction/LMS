import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/User.js';

dotenv.config();

console.log('🧹 TRAINING DATA CLEANUP SCRIPT');
console.log('================================');

const cleanupTrainingData = async () => {
    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI;
        console.log('🔗 Connecting to database...');
        console.log('📍 Database:', mongoUri.substring(0, 50) + '...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully');
        console.log('📊 Database name:', mongoose.connection.db.databaseName);
        
        // Get total user count before cleanup
        const totalUsers = await User.countDocuments();
        console.log(`\n📈 Total users in database: ${totalUsers}`);
        
        // Count users with training data
        const usersWithTraining = await User.countDocuments({
            $or: [
                { 'training': { $exists: true, $ne: [] } },
                { 'assignedModules': { $exists: true, $ne: [] } },
                { 'assignedAssessments': { $exists: true, $ne: [] } }
            ]
        });
        
        console.log(`📚 Users with training/assessment data: ${usersWithTraining}`);
        
        if (usersWithTraining === 0) {
            console.log('✅ No training data found to clean up!');
            await mongoose.disconnect();
            return;
        }
        
        // Show sample data before cleanup
        console.log('\n🔍 Sample data before cleanup:');
        const sampleUser = await User.findOne({
            $or: [
                { 'training': { $exists: true, $ne: [] } },
                { 'assignedModules': { $exists: true, $ne: [] } },
                { 'assignedAssessments': { $exists: true, $ne: [] } }
            ]
        }).select('empID username training assignedModules assignedAssessments');
        
        if (sampleUser) {
            console.log('Sample user:', {
                empID: sampleUser.empID,
                username: sampleUser.username,
                trainingCount: sampleUser.training?.length || 0,
                modulesCount: sampleUser.assignedModules?.length || 0,
                assessmentsCount: sampleUser.assignedAssessments?.length || 0
            });
        }
        
        console.log('\n⚠️  WARNING: This will remove ALL training data from users!');
        console.log('Fields to be cleared:');
        console.log('  - training (array)');
        console.log('  - assignedModules (array)');
        console.log('  - assignedAssessments (array)');
        
        // Ask for confirmation
        console.log('\n🤔 Do you want to proceed? (This action cannot be undone)');
        console.log('Type "YES" to confirm, or anything else to cancel:');
        
        // For automated execution, we'll proceed directly
        // In a real scenario, you might want to add readline for user input
        const proceed = process.argv.includes('--confirm') || process.argv.includes('--yes');
        
        if (!proceed) {
            console.log('❌ Operation cancelled. Use --confirm flag to proceed automatically.');
            await mongoose.disconnect();
            return;
        }
        
        console.log('\n🚀 Starting cleanup process...');
        
        // Update all users to remove training data
        const updateResult = await User.updateMany(
            {},
            {
                $unset: {
                    training: "",
                    assignedModules: "",
                    assignedAssessments: ""
                },
                $set: {
                    updatedAt: new Date()
                }
            }
        );
        
        console.log('✅ Cleanup completed!');
        console.log(`📊 Updated ${updateResult.modifiedCount} users`);
        
        // Verify cleanup
        const usersWithTrainingAfter = await User.countDocuments({
            $or: [
                { 'training': { $exists: true, $ne: [] } },
                { 'assignedModules': { $exists: true, $ne: [] } },
                { 'assignedAssessments': { $exists: true, $ne: [] } }
            ]
        });
        
        console.log(`📚 Users with training data after cleanup: ${usersWithTrainingAfter}`);
        
        // Show sample data after cleanup
        console.log('\n🔍 Sample data after cleanup:');
        const sampleUserAfter = await User.findOne().select('empID username training assignedModules assignedAssessments');
        if (sampleUserAfter) {
            console.log('Sample user:', {
                empID: sampleUserAfter.empID,
                username: sampleUserAfter.username,
                trainingCount: sampleUserAfter.training?.length || 0,
                modulesCount: sampleUserAfter.assignedModules?.length || 0,
                assessmentsCount: sampleUserAfter.assignedAssessments?.length || 0
            });
        }
        
        console.log('\n🎉 Training data cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
};

// Run the cleanup
cleanupTrainingData();

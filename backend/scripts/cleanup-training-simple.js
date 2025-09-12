import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧹 TRAINING DATA CLEANUP SCRIPT');
console.log('================================');

const cleanupTrainingData = async () => {
    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI;
        console.log('🔗 Connecting to database...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully');
        console.log('📊 Database name:', mongoose.connection.db.databaseName);
        
        // Import User model after connection
        const User = (await import('../model/User.js')).default;
        
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

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/User.js';

dotenv.config();

console.log('🔍 TRAINING DATA CLEANUP - DRY RUN');
console.log('===================================');

const dryRunCleanup = async () => {
    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI;
        console.log('🔗 Connecting to database...');
        console.log('📍 Database:', mongoUri.substring(0, 50) + '...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully');
        console.log('📊 Database name:', mongoose.connection.db.databaseName);
        
        // Get total user count
        const totalUsers = await User.countDocuments();
        console.log(`\n📈 Total users in database: ${totalUsers}`);
        
        // Count users with different types of training data
        const usersWithTraining = await User.countDocuments({
            'training': { $exists: true, $ne: [] }
        });
        
        const usersWithModules = await User.countDocuments({
            'assignedModules': { $exists: true, $ne: [] }
        });
        
        const usersWithAssessments = await User.countDocuments({
            'assignedAssessments': { $exists: true, $ne: [] }
        });
        
        const usersWithAnyTrainingData = await User.countDocuments({
            $or: [
                { 'training': { $exists: true, $ne: [] } },
                { 'assignedModules': { $exists: true, $ne: [] } },
                { 'assignedAssessments': { $exists: true, $ne: [] } }
            ]
        });
        
        console.log('\n📊 Training Data Analysis:');
        console.log(`  - Users with training data: ${usersWithTraining}`);
        console.log(`  - Users with module data: ${usersWithModules}`);
        console.log(`  - Users with assessment data: ${usersWithAssessments}`);
        console.log(`  - Users with ANY training data: ${usersWithAnyTrainingData}`);
        
        if (usersWithAnyTrainingData === 0) {
            console.log('\n✅ No training data found to clean up!');
            await mongoose.disconnect();
            return;
        }
        
        // Show detailed breakdown
        console.log('\n🔍 Detailed Analysis:');
        
        // Sample users with training data
        const sampleUsersWithTraining = await User.find({
            'training': { $exists: true, $ne: [] }
        }).limit(3).select('empID username training');
        
        if (sampleUsersWithTraining.length > 0) {
            console.log('\n📚 Sample users with training data:');
            sampleUsersWithTraining.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.empID} - ${user.username} (${user.training.length} trainings)`);
            });
        }
        
        // Sample users with module data
        const sampleUsersWithModules = await User.find({
            'assignedModules': { $exists: true, $ne: [] }
        }).limit(3).select('empID username assignedModules');
        
        if (sampleUsersWithModules.length > 0) {
            console.log('\n📖 Sample users with module data:');
            sampleUsersWithModules.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.empID} - ${user.username} (${user.assignedModules.length} modules)`);
            });
        }
        
        // Sample users with assessment data
        const sampleUsersWithAssessments = await User.find({
            'assignedAssessments': { $exists: true, $ne: [] }
        }).limit(3).select('empID username assignedAssessments');
        
        if (sampleUsersWithAssessments.length > 0) {
            console.log('\n📝 Sample users with assessment data:');
            sampleUsersWithAssessments.forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.empID} - ${user.username} (${user.assignedAssessments.length} assessments)`);
            });
        }
        
        console.log('\n⚠️  WHAT WILL BE REMOVED:');
        console.log('  - All training arrays from users');
        console.log('  - All assignedModules arrays from users');
        console.log('  - All assignedAssessments arrays from users');
        console.log(`  - This will affect ${usersWithAnyTrainingData} users`);
        
        console.log('\n✅ DRY RUN COMPLETED - No changes were made');
        console.log('💡 To execute the actual cleanup, run: node scripts/cleanup-training-data.js --confirm');
        
    } catch (error) {
        console.error('❌ Error during dry run:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
};

// Run the dry run
dryRunCleanup();

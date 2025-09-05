// Script to check database data and diagnose the issue
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './backend/model/Admin.js';
import User from './backend/model/User.js';
import Branch from './backend/model/Branch.js';
import TrainingProgress from './backend/model/Trainingprocessschema.js';

dotenv.config();

const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

async function checkDatabaseData() {
    try {
        await connectMongoDB();
        
        console.log('\n=== DATABASE DATA CHECK ===\n');
        
        // Check Admins
        console.log('1. Checking Admins...');
        const admins = await Admin.find({});
        console.log(`   Total admins: ${admins.length}`);
        admins.forEach(admin => {
            console.log(`   - Admin: ${admin.name} (${admin.email}) - Role: ${admin.role}`);
            console.log(`     Branches assigned: ${admin.branches.length}`);
        });
        
        // Check Branches
        console.log('\n2. Checking Branches...');
        const branches = await Branch.find({});
        console.log(`   Total branches: ${branches.length}`);
        branches.forEach(branch => {
            console.log(`   - Branch: ${branch.branchName} - LocCode: ${branch.locCode}`);
        });
        
        // Check Users
        console.log('\n3. Checking Users...');
        const users = await User.find({});
        console.log(`   Total users: ${users.length}`);
        
        // Group users by locCode
        const usersByLocCode = {};
        users.forEach(user => {
            if (!usersByLocCode[user.locCode]) {
                usersByLocCode[user.locCode] = [];
            }
            usersByLocCode[user.locCode].push(user.username);
        });
        
        console.log('   Users by locCode:');
        Object.keys(usersByLocCode).forEach(locCode => {
            console.log(`   - LocCode ${locCode}: ${usersByLocCode[locCode].length} users`);
        });
        
        // Check TrainingProgress
        console.log('\n4. Checking TrainingProgress...');
        const trainingProgress = await TrainingProgress.find({});
        console.log(`   Total training progress records: ${trainingProgress.length}`);
        
        // Check specific admin data
        if (admins.length > 0) {
            const firstAdmin = admins[0];
            console.log(`\n5. Checking data for first admin: ${firstAdmin.name}`);
            
            const adminWithBranches = await Admin.findById(firstAdmin._id).populate('branches');
            const locCodes = adminWithBranches.branches.map(branch => branch.locCode);
            console.log(`   Admin branches: ${locCodes.join(', ')}`);
            
            const adminUsers = await User.find({ locCode: { $in: locCodes } });
            console.log(`   Users for admin's branches: ${adminUsers.length}`);
            
            if (adminUsers.length > 0) {
                const userIds = adminUsers.map(user => user._id);
                const adminTrainings = await TrainingProgress.find({ userId: { $in: userIds } });
                console.log(`   Training progress for admin's users: ${adminTrainings.length}`);
            }
        }
        
        console.log('\n=== END OF CHECK ===\n');
        
    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

checkDatabaseData();

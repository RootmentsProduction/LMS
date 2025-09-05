import mongoose from 'mongoose';
import User from '../model/User.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Function to check user workingBranch values
const checkUserBranches = async () => {
    try {
        console.log('🔍 Checking user workingBranch values...\n');
        
        // Get all users with their workingBranch
        const users = await User.find({}, 'empID workingBranch locCode');
        console.log(`Found ${users.length} users`);
        
        // Group users by workingBranch
        const usersByBranch = {};
        users.forEach(user => {
            if (!usersByBranch[user.workingBranch]) {
                usersByBranch[user.workingBranch] = [];
            }
            usersByBranch[user.workingBranch].push(user);
        });
        
        console.log('\n=== USER WORKINGBRANCH VALUES ===');
        Object.entries(usersByBranch).forEach(([branchName, userList]) => {
            console.log(`"${branchName}": ${userList.length} users`);
            console.log(`  Users: ${userList.map(u => u.empID).join(', ')}`);
            console.log(`  Sample locCode: ${userList[0].locCode}`);
            console.log('');
        });
        
        console.log('=== SUMMARY ===');
        console.log(`Total unique workingBranch values: ${Object.keys(usersByBranch).length}`);
        console.log(`Total users: ${users.length}`);
        
    } catch (error) {
        console.error('Error in check:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await checkUserBranches();
        console.log('Check completed');
    } catch (error) {
        console.error('Script execution failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the script
main();

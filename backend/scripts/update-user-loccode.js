import mongoose from 'mongoose';
import User from '../model/User.js';
import Branch from '../model/Branch.js';
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

// Function to update user locCode based on branch matching
const updateUserLocCode = async () => {
    try {
        console.log('Starting user locCode update process...');
        
        // Get all branches with their locCode and workingBranch
        const branches = await Branch.find({}, 'locCode workingBranch');
        console.log(`Found ${branches.length} branches`);
        
        // Create a mapping of workingBranch to locCode
        const branchLocCodeMap = {};
        branches.forEach(branch => {
            branchLocCodeMap[branch.workingBranch] = branch.locCode;
        });
        
        console.log('Branch mapping created:', branchLocCodeMap);
        
        // Get all users
        const users = await User.find({}, 'empID workingBranch locCode');
        console.log(`Found ${users.length} users`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Process each user
        for (const user of users) {
            try {
                const newLocCode = branchLocCodeMap[user.workingBranch];
                
                if (newLocCode && newLocCode !== user.locCode) {
                    // Update the user's locCode
                    await User.updateOne(
                        { _id: user._id },
                        { locCode: newLocCode }
                    );
                    
                    console.log(`Updated user ${user.empID} (${user.workingBranch}): ${user.locCode} → ${newLocCode}`);
                    updatedCount++;
                } else if (!newLocCode) {
                    console.log(`⚠️  No matching branch found for user ${user.empID} with workingBranch: "${user.workingBranch}"`);
                    skippedCount++;
                } else {
                    console.log(`✓ User ${user.empID} already has correct locCode: ${user.locCode}`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Error updating user ${user.empID}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n=== UPDATE SUMMARY ===');
        console.log(`Total users processed: ${users.length}`);
        console.log(`Users updated: ${updatedCount}`);
        console.log(`Users skipped (no changes needed): ${skippedCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        
        if (errorCount > 0) {
            console.log('\n⚠️  Some users could not be updated. Check the logs above for details.');
        }
        
    } catch (error) {
        console.error('Error in update process:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await updateUserLocCode();
        console.log('Update process completed');
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

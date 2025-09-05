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

// Function to show what changes would be made (DRY RUN)
const dryRunUserLocCodeUpdate = async () => {
    try {
        console.log('🔍 DRY RUN: Analyzing user locCode update process...');
        console.log('⚠️  No actual changes will be made to the database\n');
        
        // Get all branches with their locCode and workingBranch
        const branches = await Branch.find({}, 'locCode workingBranch');
        console.log(`Found ${branches.length} branches`);
        
        // Create a mapping of workingBranch to locCode
        const branchLocCodeMap = {};
        branches.forEach(branch => {
            branchLocCodeMap[branch.workingBranch] = branch.locCode;
        });
        
        console.log('\n=== BRANCH MAPPING ===');
        Object.entries(branchLocCodeMap).forEach(([branchName, locCode]) => {
            console.log(`"${branchName}" → "${locCode}"`);
        });
        
        // Get all users
        const users = await User.find({}, 'empID workingBranch locCode');
        console.log(`\nFound ${users.length} users`);
        
        let wouldUpdateCount = 0;
        let noChangeCount = 0;
        let noMatchCount = 0;
        
        console.log('\n=== USER ANALYSIS ===');
        
        // Process each user
        for (const user of users) {
            const newLocCode = branchLocCodeMap[user.workingBranch];
            
            if (newLocCode && newLocCode !== user.locCode) {
                console.log(`🔄 WOULD UPDATE: User ${user.empID} (${user.workingBranch})`);
                console.log(`   Current locCode: "${user.locCode}" → New locCode: "${newLocCode}"`);
                console.log('');
                wouldUpdateCount++;
            } else if (!newLocCode) {
                console.log(`❌ NO MATCH: User ${user.empID} - workingBranch "${user.workingBranch}" not found in branches`);
                console.log('');
                noMatchCount++;
            } else {
                console.log(`✓ NO CHANGE: User ${user.empID} already has correct locCode: "${user.locCode}"`);
                noChangeCount++;
            }
        }
        
        console.log('\n=== DRY RUN SUMMARY ===');
        console.log(`Total users analyzed: ${users.length}`);
        console.log(`Users that WOULD be updated: ${wouldUpdateCount}`);
        console.log(`Users with no changes needed: ${noChangeCount}`);
        console.log(`Users with no matching branch: ${noMatchCount}`);
        
        if (wouldUpdateCount > 0) {
            console.log(`\n💡 To apply these changes, run: node scripts/update-user-loccode.js`);
        }
        
        if (noMatchCount > 0) {
            console.log(`\n⚠️  ${noMatchCount} users have workingBranch values that don't match any branch names.`);
            console.log('   You may need to check for typos or inconsistencies in branch naming.');
        }
        
    } catch (error) {
        console.error('Error in dry run:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await dryRunUserLocCodeUpdate();
        console.log('\nDry run completed');
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

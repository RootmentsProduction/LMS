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

// Branch name mapping - map user workingBranch to actual branch names
const branchNameMapping = {
    // SUITOR GUY branches → GROOMS branches
    "SUITOR GUY KOTTAYAM": "GROOMS Kottayam",
    "SUITOR GUY THRISSUR": "GROOMS Thrissur", 
    "SUITOR GUY EDAPPALLY": "GROOMS Edapally",
    "SUITOR GUY PERUMBAVOOR": "GROOMS Perumbavoor",
    "SUITOR GUY CHAVAKKAD": "GROOMS Chavakkad",
    "SUITOR GUY PALAKKAD": "GROOMS Palakkad",
    "SUITOR GUY KOTTAKKAL": "GROOMS Kottakkal",
    "SUITOR GUY EDAPPAL": "GROOMS Edappal",
    "SUITOR GUY MANJERI": "GROOMS Manjery", // Note: slight spelling difference
    "SUITOR GUY VATAKARA": "GROOMS Vatakara",
    "SUITOR GUY KALPETTA": "GROOMS Kalpetta",
    "SUITOR GUY CALICUT": "GROOMS Kozhikode", // Calicut = Kozhikode
    "SUITOR GUY KANNUR": "GROOMS Kannur",
    "SUITOR GUY PERINTHALMANNA": "GROOMS Perinthalmanna",
    "SUITOR GUY TRIVANDRUM": "GROOMS Trivandrum",
    
    // ZORUCCI branches (case sensitive)
    "ZORUCCI EDAPPALLY": "Zorucci Edappally",
    "ZORUCCI EDAPPAL": "Zorucci Edappal", 
    "ZORUCCI PERINTHALMANNA": "Zorucci Perinthalmanna",
    "ZORUCCI KOTTAKKAL": "Zorucci Kottakkal",
    
    // Special cases
    "No Store": null, // No matching branch - will be skipped
    "Test Store": null // No matching branch - will be skipped
};

// Function to show what changes would be made (DRY RUN)
const dryRunBranchMappingFix = async () => {
    try {
        console.log('🔍 DRY RUN: Analyzing branch mapping fix...');
        console.log('⚠️  No actual changes will be made to the database\n');
        
        // Get all branches for verification
        const branches = await Branch.find({}, 'locCode workingBranch');
        const branchNames = branches.map(b => b.workingBranch);
        
        console.log('Available branch names in branches collection:');
        branchNames.forEach((name, index) => {
            if (index < 20) console.log(`  ${index + 1}. "${name}"`);
            else if (index === 20) console.log(`  ... and ${branchNames.length - 20} more`);
        });
        
        // Get all users
        const users = await User.find({}, 'empID workingBranch locCode');
        console.log(`\nFound ${users.length} users to analyze`);
        
        let wouldUpdateCount = 0;
        let wouldSkipCount = 0;
        let noMappingCount = 0;
        
        console.log('\n=== BRANCH MAPPING ANALYSIS ===');
        Object.entries(branchNameMapping).forEach(([oldName, newName]) => {
            if (newName) {
                console.log(`"${oldName}" → "${newName}"`);
            } else {
                console.log(`"${oldName}" → SKIP (no matching branch)`);
            }
        });
        
        console.log('\n=== USER ANALYSIS ===');
        
        // Group users by workingBranch
        const usersByBranch = {};
        users.forEach(user => {
            if (!usersByBranch[user.workingBranch]) {
                usersByBranch[user.workingBranch] = [];
            }
            usersByBranch[user.workingBranch].push(user);
        });
        
        // Analyze each branch type
        Object.entries(usersByBranch).forEach(([branchName, userList]) => {
            const newBranchName = branchNameMapping[branchName];
            
            if (newBranchName) {
                const matchingBranch = branches.find(branch => 
                    branch.workingBranch === newBranchName
                );
                
                if (matchingBranch) {
                    console.log(`🔄 WOULD UPDATE: ${userList.length} users with "${branchName}"`);
                    console.log(`   New workingBranch: "${newBranchName}"`);
                    console.log(`   New locCode: "${matchingBranch.locCode}"`);
                    console.log(`   Users: ${userList.map(u => u.empID).join(', ')}`);
                    console.log('');
                    wouldUpdateCount += userList.length;
                } else {
                    console.log(`⚠️  WARNING: Branch "${newBranchName}" not found in branches collection`);
                    console.log(`   Users with "${branchName}" would be skipped`);
                    console.log('');
                    wouldSkipCount += userList.length;
                }
            } else {
                console.log(`⏭️  WOULD SKIP: ${userList.length} users with "${branchName}" (no mapping)`);
                console.log(`   Users: ${userList.map(u => u.empID).join(', ')}`);
                console.log('');
                noMappingCount += userList.length;
            }
        });
        
        console.log('\n=== DRY RUN SUMMARY ===');
        console.log(`Total users analyzed: ${users.length}`);
        console.log(`Users that WOULD be updated: ${wouldUpdateCount}`);
        console.log(`Users that WOULD be skipped (branch not found): ${wouldSkipCount}`);
        console.log(`Users that WOULD be skipped (no mapping): ${noMappingCount}`);
        
        if (wouldUpdateCount > 0) {
            console.log(`\n💡 To apply these changes, run: node scripts/fix-branch-mapping.js`);
        }
        
        if (wouldSkipCount > 0) {
            console.log(`\n⚠️  ${wouldSkipCount} users would be skipped because their mapped branch names don't exist.`);
            console.log('   You may need to add these branches to the branches collection first.');
        }
        
        if (noMappingCount > 0) {
            console.log(`\nℹ️  ${noMappingCount} users have workingBranch values that are not mapped.`);
            console.log('   These users will keep their current values unchanged.');
        }
        
    } catch (error) {
        console.error('Error in dry run:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await dryRunBranchMappingFix();
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

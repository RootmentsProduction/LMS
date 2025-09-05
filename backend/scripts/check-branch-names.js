import mongoose from 'mongoose';
import Branch from '../model/Branch.js';
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

// Function to analyze branch name mismatches
const analyzeBranchNames = async () => {
    try {
        console.log('🔍 Analyzing branch name mismatches...\n');
        
        // Get all branches
        const branches = await Branch.find({}, 'locCode workingBranch');
        console.log(`Found ${branches.length} branches in branches collection:`);
        
        // Show all branch names
        console.log('\n=== BRANCHES COLLECTION ===');
        branches.forEach((branch, index) => {
            console.log(`${index + 1}. "${branch.workingBranch}" → locCode: "${branch.locCode}"`);
        });
        
        // Get all unique workingBranch values from users
        const users = await User.find({}, 'workingBranch');
        const userBranchNames = [...new Set(users.map(user => user.workingBranch))];
        
        console.log(`\nFound ${userBranchNames.length} unique workingBranch values in users collection:`);
        console.log('\n=== USERS COLLECTION ===');
        userBranchNames.forEach((branchName, index) => {
            console.log(`${index + 1}. "${branchName}"`);
        });
        
        // Find matches and mismatches
        console.log('\n=== ANALYSIS ===');
        let matchCount = 0;
        let mismatchCount = 0;
        
        userBranchNames.forEach(userBranch => {
            const matchingBranch = branches.find(branch => 
                branch.workingBranch === userBranch
            );
            
            if (matchingBranch) {
                console.log(`✅ MATCH: "${userBranch}" → locCode: "${matchingBranch.locCode}"`);
                matchCount++;
            } else {
                console.log(`❌ NO MATCH: "${userBranch}"`);
                mismatchCount++;
            }
        });
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total branches: ${branches.length}`);
        console.log(`Total unique user workingBranch values: ${userBranchNames.length}`);
        console.log(`Matches found: ${matchCount}`);
        console.log(`Mismatches: ${mismatchCount}`);
        
        if (mismatchCount > 0) {
            console.log(`\n⚠️  ${mismatchCount} user workingBranch values don't match any branch names.`);
            console.log('Possible issues:');
            console.log('1. Case sensitivity differences');
            console.log('2. Extra spaces or special characters');
            console.log('3. Typos in branch names');
            console.log('4. Different naming conventions');
        }
        
    } catch (error) {
        console.error('Error in analysis:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await analyzeBranchNames();
        console.log('\nAnalysis completed');
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

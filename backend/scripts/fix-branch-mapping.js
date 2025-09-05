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

// Function to fix branch name mapping and update users
const fixBranchMapping = async () => {
    try {
        console.log('🔧 Fixing branch name mapping...\n');
        
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
        console.log(`\nFound ${users.length} users to process`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        console.log('\n=== PROCESSING USERS ===');
        
        for (const user of users) {
            try {
                const newBranchName = branchNameMapping[user.workingBranch];
                
                if (newBranchName) {
                    // Find the matching branch
                    const matchingBranch = branches.find(branch => 
                        branch.workingBranch === newBranchName
                    );
                    
                    if (matchingBranch) {
                        // Update both workingBranch and locCode
                        await User.updateOne(
                            { _id: user._id },
                            { 
                                workingBranch: newBranchName,
                                locCode: matchingBranch.locCode
                            }
                        );
                        
                        console.log(`✅ Updated user ${user.empID}:`);
                        console.log(`   workingBranch: "${user.workingBranch}" → "${newBranchName}"`);
                        console.log(`   locCode: "${user.locCode}" → "${matchingBranch.locCode}"`);
                        console.log('');
                        
                        updatedCount++;
                    } else {
                        console.log(`⚠️  Branch "${newBranchName}" not found for user ${user.empID}`);
                        skippedCount++;
                    }
                } else {
                    console.log(`⏭️  Skipping user ${user.empID} - no mapping for "${user.workingBranch}"`);
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
        console.log(`Users skipped: ${skippedCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        
        if (updatedCount > 0) {
            console.log('\n🎉 Successfully updated users with correct branch names and locCodes!');
        }
        
    } catch (error) {
        console.error('Error in fix process:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await fixBranchMapping();
        console.log('\nFix process completed');
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

#!/usr/bin/env node

/**
 * Script to fix missing mandatory training assignments for all users
 * This script will assign all existing mandatory trainings to users based on their designation
 * 
 * Usage:
 * node scripts/fix-missing-mandatory-trainings.js
 * 
 * This script will:
 * 1. Find all users in the database
 * 2. Find all mandatory trainings
 * 3. For each user, assign any missing mandatory trainings that match their designation
 * 4. Skip trainings that are already assigned
 * 5. Provide detailed logging and summary
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/User.js';
import { Training } from '../model/Traning.js';
import TrainingProgress from '../model/Trainingprocessschema.js';

dotenv.config();

async function fixMissingMandatoryTrainings() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        });
        console.log('✅ Connected to MongoDB');

        // STRICT MATCHING: Only match exact roles, no partial matches
        const matchExactDesignation = (userDesig, roleList) => {
            if (!userDesig || !Array.isArray(roleList)) return false;
            
            // Normalize the user designation (trim and lowercase)
            const normalizedUserDesig = userDesig.trim().toLowerCase();
            
            // Check if the user's designation exactly matches any of the roles in the training
            return roleList.some(role => {
                if (!role) return false;
                const normalizedRole = role.trim().toLowerCase();
                
                // EXACT MATCH ONLY - no partial matches
                return normalizedUserDesig === normalizedRole;
            });
        };

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} total users`);

        if (users.length === 0) {
            console.log('❌ No users found in the system');
            return;
        }

        // Get all mandatory trainings
        const mandatoryTrainings = await Training.find({ Trainingtype: 'Mandatory' }).populate('modules');
        console.log(`📚 Found ${mandatoryTrainings.length} mandatory trainings`);

        if (mandatoryTrainings.length === 0) {
            console.log('❌ No mandatory trainings found in the system');
            return;
        }

        let totalAssigned = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        const designationSummary = {};

        for (const user of users) {
            console.log(`\n=== Processing User: ${user.username} (${user.empID}) - Designation: "${user.designation}" ===`);
            
            if (!designationSummary[user.designation]) {
                designationSummary[user.designation] = { users: 0, assigned: 0, skipped: 0, errors: 0 };
            }
            designationSummary[user.designation].users++;
            
            // Find mandatory trainings that match this user's designation
            const matchingTrainings = mandatoryTrainings.filter(training => {
                const isMatch = matchExactDesignation(user.designation, training.Assignedfor);
                console.log(`  Training: "${training.trainingName}" - Roles: [${training.Assignedfor.join(', ')}] - Match: ${isMatch}`);
                return isMatch;
            });

            console.log(`📋 Found ${matchingTrainings.length} matching mandatory trainings for user ${user.empID}`);

            for (const training of matchingTrainings) {
                try {
                    // Check if user already has this training assigned
                    const existingProgress = await TrainingProgress.findOne({
                        userId: user._id,
                        trainingId: training._id
                    });

                    if (existingProgress) {
                        console.log(`  ⏭️  Training "${training.trainingName}" already assigned to ${user.empID} - skipping`);
                        totalSkipped++;
                        designationSummary[user.designation].skipped++;
                        continue;
                    }

                    // Create new training progress
                    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day deadline

                    const trainingProgress = new TrainingProgress({
                        userId: user._id,
                        trainingId: training._id,
                        deadline: deadlineDate,
                        pass: false,
                        modules: training.modules.map(module => ({
                            moduleId: module._id,
                            pass: false,
                            videos: module.videos.map(video => ({
                                videoId: video._id,
                                pass: false,
                            })),
                        })),
                    });

                    await trainingProgress.save();
                    console.log(`  ✅ Assigned mandatory training "${training.trainingName}" to ${user.empID}`);
                    
                    totalAssigned++;
                    designationSummary[user.designation].assigned++;

                } catch (error) {
                    console.error(`  ❌ Error assigning training "${training.trainingName}" to ${user.empID}:`, error.message);
                    totalErrors++;
                    designationSummary[user.designation].errors++;
                }
            }
        }

        console.log('\n=== FINAL SUMMARY ===');
        console.log('📊 Overall Results:');
        console.log(`   Total users processed: ${users.length}`);
        console.log(`   Total trainings assigned: ${totalAssigned}`);
        console.log(`   Total skipped (already assigned): ${totalSkipped}`);
        console.log(`   Total errors: ${totalErrors}`);
        
        console.log('\n📋 Results by Designation:');
        Object.entries(designationSummary).forEach(([designation, stats]) => {
            console.log(`   ${designation}:`);
            console.log(`     - Users: ${stats.users}`);
            console.log(`     - Assigned: ${stats.assigned}`);
            console.log(`     - Skipped: ${stats.skipped}`);
            console.log(`     - Errors: ${stats.errors}`);
        });

        if (totalAssigned > 0) {
            console.log(`\n✅ SUCCESS: Fixed missing mandatory training assignments for ${totalAssigned} user-training pairs!`);
        } else {
            console.log('\n✅ All users already have their mandatory trainings assigned. No action needed.');
        }

    } catch (error) {
        console.error('❌ Script error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 Starting mandatory training fix script...');
    fixMissingMandatoryTrainings();
}

export default fixMissingMandatoryTrainings;

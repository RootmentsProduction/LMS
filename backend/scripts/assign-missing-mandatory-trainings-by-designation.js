#!/usr/bin/env node

/**
 * Script to assign missing mandatory trainings to users based on their designation
 * This fixes the issue where users created before mandatory trainings were created
 * don't automatically get those trainings assigned
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/User.js';
import { Training } from '../model/Traning.js';
import TrainingProgress from '../model/Trainingprocessschema.js';

dotenv.config();

async function assignMissingMandatoryTrainingsByDesignation(specificDesignation = null) {
    try {
        // Connect to MongoDB (using same logic as database.js)
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        });
        console.log('Connected to MongoDB');

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

        // Get all users (or filter by specific designation if provided)
        let users;
        if (specificDesignation) {
            users = await User.find({ designation: { $regex: new RegExp(`^${specificDesignation}$`, 'i') } });
            console.log(`Found ${users.length} users with designation: ${specificDesignation}`);
        } else {
            users = await User.find({});
            console.log(`Found ${users.length} total users`);
        }

        // Get all mandatory trainings
        const mandatoryTrainings = await Training.find({ Trainingtype: 'Mandatory' }).populate('modules');
        console.log(`Found ${mandatoryTrainings.length} mandatory trainings`);

        let totalAssigned = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const user of users) {
            console.log(`\n=== Processing User: ${user.username} (${user.empID}) - Designation: "${user.designation}" ===`);
            
            // Find mandatory trainings that match this user's designation
            const matchingTrainings = mandatoryTrainings.filter(training => {
                const isMatch = matchExactDesignation(user.designation, training.Assignedfor);
                console.log(`  Training: "${training.trainingName}" - Roles: [${training.Assignedfor.join(', ')}] - Match: ${isMatch}`);
                return isMatch;
            });

            console.log(`Found ${matchingTrainings.length} matching mandatory trainings for user ${user.empID}`);

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

                } catch (error) {
                    console.error(`  ❌ Error assigning training "${training.trainingName}" to ${user.empID}:`, error.message);
                    totalErrors++;
                }
            }
        }

        console.log('\n=== ASSIGNMENT SUMMARY ===');
        console.log(`Total users processed: ${users.length}`);
        console.log(`Total trainings assigned: ${totalAssigned}`);
        console.log(`Total skipped (already assigned): ${totalSkipped}`);
        console.log(`Total errors: ${totalErrors}`);

        if (specificDesignation) {
            console.log(`\n✅ Completed assignment for designation: ${specificDesignation}`);
        } else {
            console.log('\n✅ Completed assignment for all users');
        }

    } catch (error) {
        console.error('Script error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    const designation = process.argv[2]; // Optional designation parameter
    if (designation) {
        console.log(`Running script for specific designation: ${designation}`);
    } else {
        console.log('Running script for all designations');
    }
    assignMissingMandatoryTrainingsByDesignation(designation);
}

export default assignMissingMandatoryTrainingsByDesignation;

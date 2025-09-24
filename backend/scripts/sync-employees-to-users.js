#!/usr/bin/env node

/**
 * Script to sync existing Employee records to User records for the training system
 * This helps fix the issue where employees created through EmployeeController don't have User records
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Training from '../model/Traning.js';
import TrainingProgress from '../model/Trainingprocessschema.js';

dotenv.config();

async function syncEmployeesToUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Get all employees from Employee collection
        const employees = await Employee.find({ status: 'Active' });
        console.log(`Found ${employees.length} active employees`);

        let syncedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const employee of employees) {
            try {
                // Check if User already exists
                const existingUser = await User.findOne({ empID: employee.employeeId });
                
                if (existingUser) {
                    console.log(`User already exists for employee: ${employee.employeeId}`);
                    skippedCount++;
                    continue;
                }

                // Create new User record
                const newUser = new User({
                    username: `${employee.firstName} ${employee.lastName}`,
                    email: employee.email,
                    empID: employee.employeeId,
                    locCode: '', // This might need to be mapped based on your business logic
                    designation: employee.designation,
                    workingBranch: employee.department,
                    phoneNumber: employee.phoneNumber || '',
                    assignedModules: [],
                    assignedAssessments: [],
                    training: []
                });

                // Save the user first to get the _id
                await newUser.save();

                // Assign mandatory trainings based on designation
                const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');
                const flatDesignation = flatten(employee.designation);

                // Fetch all mandatory trainings
                const allTrainings = await Training.find({
                    Trainingtype: 'Mandatory'
                }).populate('modules');

                // Filter in JS using flattened comparison
                const mandatoryTraining = allTrainings.filter(training =>
                    training.Assignedfor.some(role => flatten(role) === flatDesignation)
                );

                // Create TrainingProgress records for mandatory trainings
                const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline
                
                const trainingAssignments = mandatoryTraining.map(async (training) => {
                    const trainingProgress = new TrainingProgress({
                        userId: newUser._id,
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
                });

                // Wait for all training assignments to complete
                await Promise.all(trainingAssignments);
                
                console.log(`✅ Synced employee ${employee.employeeId} (${employee.firstName} ${employee.lastName}) with ${mandatoryTraining.length} mandatory trainings`);
                syncedCount++;

            } catch (error) {
                console.error(`❌ Error syncing employee ${employee.employeeId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n=== SYNC SUMMARY ===');
        console.log(`Total employees processed: ${employees.length}`);
        console.log(`Successfully synced: ${syncedCount}`);
        console.log(`Skipped (already exist): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Script error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    syncEmployeesToUsers();
}

export default syncEmployeesToUsers;

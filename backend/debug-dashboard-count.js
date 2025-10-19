import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Training } from './model/Traning.js';
import User from './model/User.js';
import TrainingProgress from './model/Trainingprocessschema.js';
import Admin from './model/Admin.js';
import Branch from './model/Branch.js';

dotenv.config();

async function debugDashboardCount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for debugging dashboard count...\n');

        // Simulate the exact dashboard logic from calculateProgress
        const day = new Date();
        console.log(`📅 Current date: ${day.toISOString()}\n`);

        // Get admin data (get a super_admin with branches)
        const admin = await Admin.findOne({ role: 'super_admin' }).populate('branches');
        if (!admin) {
            console.log('❌ No super_admin found with branches');
            return;
        }
        
        const allowedLocCodes = admin.branches.map(branch => branch.locCode);
        console.log(`🏢 Admin allowed location codes: ${allowedLocCodes}\n`);

        // Get users in allowed branches (exact same logic as calculateProgress)
        const users = await User.find({ locCode: { $in: allowedLocCodes } });
        console.log(`👥 Users in allowed branches: ${users.length}\n`);

        // Get training progress for all users
        const userIDs = users.map(user => user._id);
        const trainingProgressData = await TrainingProgress.find({ userId: { $in: userIDs } });
        
        // Create a map for efficient lookup
        const trainingProgressMap = new Map();
        trainingProgressData.forEach(tp => {
            const userId = tp.userId.toString();
            if (!trainingProgressMap.has(userId)) {
                trainingProgressMap.set(userId, []);
            }
            trainingProgressMap.get(userId).push(tp);
        });

        console.log(`📊 TrainingProgress records found: ${trainingProgressData.length}\n`);

        let trainingpend = 0;
        let assignedOverdue = 0;
        let mandatoryOverdue = 0;

        console.log('🔍 Analyzing each user:\n');

        users.forEach((user, index) => {
            let userAssignedOverdue = 0;
            let userMandatoryOverdue = 0;

            // Count overdue assigned trainings from user.training array
            if (Array.isArray(user.training)) {
                const overdueAssigned = user.training.filter(
                    item => day > item.deadline && item.pass === false
                );
                userAssignedOverdue = overdueAssigned.length;
                assignedOverdue += userAssignedOverdue;
                
                if (overdueAssigned.length > 0) {
                    console.log(`  User ${index + 1}: ${user.username} (${user.empID}) - ${overdueAssigned.length} assigned overdue`);
                }
            }
            
            // Count overdue mandatory trainings from TrainingProgress collection
            const userTrainingProgress = trainingProgressMap.get(user._id.toString()) || [];
            
            // Get assigned training IDs to avoid duplicates
            const assignedTrainingIds = user.training ? 
                user.training.map(t => t.trainingId.toString()) : [];
            
            // Filter out mandatory trainings that are already in assigned trainings
            const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => 
                !assignedTrainingIds.includes(tp.trainingId.toString())
            );
            
            const overdueMandatory = uniqueMandatoryTrainings.filter(tp => 
                day > tp.deadline && tp.pass === false
            );
            
            userMandatoryOverdue = overdueMandatory.length;
            mandatoryOverdue += userMandatoryOverdue;

            if (overdueMandatory.length > 0) {
                console.log(`  User ${index + 1}: ${user.username} (${user.empID}) - ${overdueMandatory.length} mandatory overdue`);
            }

            trainingpend += userAssignedOverdue + userMandatoryOverdue;
        });

        console.log('\n📋 DASHBOARD COUNT ANALYSIS:');
        console.log(`==========================`);
        console.log(`🔴 Assigned Overdue: ${assignedOverdue}`);
        console.log(`🔴 Mandatory Overdue: ${mandatoryOverdue}`);
        console.log(`🔴 TOTAL TRAINING OVERDUE: ${trainingpend}`);
        console.log(`Dashboard should show: ${trainingpend}`);

        // Compare with our previous database count
        console.log('\n🔍 COMPARISON:');
        console.log(`Database total count: 476`);
        console.log(`Dashboard calculated count: ${trainingpend}`);
        console.log(`Difference: ${476 - trainingpend}`);

        if (trainingpend === 476) {
            console.log('✅ COUNT MATCHES! Dashboard logic is correct');
        } else {
            console.log('❌ COUNT MISMATCH! There might be a scope difference');
            console.log('\nPossible reasons:');
            console.log('1. Dashboard only counts users in allowed branches');
            console.log('2. Admin has restricted access to certain locations');
            console.log('3. Some overdue trainings belong to users outside allowed branches');
        }

    } catch (error) {
        console.error('❌ Error debugging dashboard count:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

debugDashboardCount();

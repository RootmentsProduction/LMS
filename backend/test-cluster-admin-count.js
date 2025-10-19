import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/User.js';
import Admin from './model/Admin.js';
import TrainingProgress from './model/Trainingprocessschema.js';
import Branch from './model/Branch.js';
import { Training } from './model/Traning.js';

dotenv.config();

async function testClusterAdminCount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for testing cluster admin count...\n');

        // Simulate cluster admin with only 4 branches: Perumbavoor, Vadakara, Perinthalmanna, Thrissur
        const clusterAdminAllowedCodes = ['10', '14', '16', '11']; // These are the locCodes for the 4 stores
        
        console.log('🧪 Testing Cluster Admin with access to:');
        console.log('  - Perumbavoor (locCode: 10)');
        console.log('  - Vadakara (locCode: 14)');
        console.log('  - Perinthalmanna (locCode: 16)');
        console.log('  - Thrissur (locCode: 11)');
        console.log('');

        const day = new Date();

        // Get users in these specific branches only
        const clusterUsers = await User.find({ 
            locCode: { $in: clusterAdminAllowedCodes } 
        }).lean();

        console.log(`👥 Users in cluster admin's allowed branches: ${clusterUsers.length}`);

        // Get training progress for only these users
        const clusterUserIDs = clusterUsers.map(user => user._id);
        const clusterTrainingProgress = await TrainingProgress.find({
            userId: { $in: clusterUserIDs },
            deadline: { $lt: day },
            pass: false
        }).populate('userId trainingId').lean();

        console.log(`📊 Overdue mandatory training progress for cluster: ${clusterTrainingProgress.length}`);

        let clusterOverdueCount = 0;
        let assignedOverdueCount = 0;

        // Count assigned overdue trainings (from User.training)
        clusterUsers.forEach(user => {
            if (Array.isArray(user.training)) {
                const overdueAssigned = user.training.filter(
                    item => day > item.deadline && item.pass === false
                );
                assignedOverdueCount += overdueAssigned.length;
                
                if (overdueAssigned.length > 0) {
                    console.log(`🔴 ${user.username} (${user.empID}) - ${overdueAssigned.length} assigned overdue`);
                }
            }
        });

        // Count mandatory overdue trainings (from TrainingProgress) - avoiding duplicates
        const userIdToOverdueCount = new Map();

        clusterTrainingProgress.forEach(progress => {
            const userId = progress.userId._id.toString();
            if (!userIdToOverdueCount.has(userId)) {
                userIdToOverdueCount.set(userId, 0);
            }
            userIdToOverdueCount.set(userId, userIdToOverdueCount.get(userId) + 1);
            clusterOverdueCount++;
        });

        // Log users with mandatory overdue trainings
        console.log(`\n🔴 Users with mandatory overdue trainings:`);
        userIdToOverdueCount.forEach((count, userIdStr) => {
            const progress = clusterTrainingProgress.find(p => p.userId._id.toString() === userIdStr);
            if (progress && count > 0) {
                console.log(`  ${progress.userId.username} (${progress.userId.empID}) - LocCode: ${progress.userId.locCode} - ${count} overdue`);
            }
        });

        const totalOverdueForCluster = assignedOverdueCount + clusterOverdueCount;

        console.log(`\n📋 CLUSTER ADMIN COUNT ANALYSIS:`);
        console.log(`===============================`);
        console.log(`🔴 Assigned Overdue: ${assignedOverdueCount}`);
        console.log(`🔴 Mandatory Overdue: ${clusterOverdueCount}`);
        console.log(`🔴 TOTAL OVERDUE FOR CLUSTER ADMIN: ${totalOverdueForCluster}`);

        // Check if RASEEB E A (Emp238) appears in cluster admin's scope
        const raseebInCluster = clusterUsers.find(user => user.empID === 'Emp238');
        console.log(`\n🔍 RASEEB E A (Emp238) in cluster admin scope: ${raseebInCluster ? '✅ YES' : '❌ NO'}`);
        
        if (raseebInCluster) {
            console.log(`  - Working Branch: ${raseebInCluster.workingBranch}`);
            console.log(`  - LocCode: ${raseebInCluster.locCode}`);
            console.log(`  ✅ Correctly visible to cluster admin due to Thrissur access (locCode: 11)`);
        }

        // Compare with super admin count
        console.log(`\n🧮 COMPARISON:`);
        console.log(`  Super Admin Count: 396`);
        console.log(`  Cluster Admin Count: ${totalOverdueForCluster}`);
        console.log(`  Difference: ${396 - totalOverdueForCluster} trainings excluded from cluster admin`);

    } catch (error) {
        console.error('❌ Error testing cluster admin count:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

testClusterAdminCount();

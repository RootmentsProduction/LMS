import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Training } from './model/Traning.js';
import User from './model/User.js';
import TrainingProgress from './model/Trainingprocessschema.js';
import Admin from './model/Admin.js';
import Branch from './model/Branch.js';

dotenv.config();

async function findExcludedOverdueUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for finding excluded overdue users...\n');

        const day = new Date();
        console.log(`📅 Current date: ${day.toISOString()}\n`);

        // Get super admin with branches
        const admin = await Admin.findOne({ role: 'super_admin' }).populate('branches');
        if (!admin) {
            console.log('❌ No super_admin found with branches');
            return;
        }
        
        const allowedLocCodes = admin.branches.map(branch => branch.locCode);
        console.log(`🏢 Super Admin allowed location codes: ${allowedLocCodes}\n`);

        // Get ALL users with overdue trainings (regardless of branch access)
        console.log('🔍 Finding ALL overdue trainings across the system...\n');

        // 1. Get all users with overdue assigned trainings
        const allUsersWithAssignedOverdue = await User.find({
            'training.deadline': { $lt: day },
            'training.pass': false
        }).populate('training.trainingId').lean();

        console.log(`📋 Users with overdue assigned trainings: ${allUsersWithAssignedOverdue.length}`);

        // 2. Get all users with overdue mandatory trainings
        const allOverdueMandatoryProgress = await TrainingProgress.find({
            deadline: { $lt: day },
            pass: false
        }).populate('userId trainingId').lean();

        allOverdueMandatoryProgress.forEach((progress, index) => {
            console.log(`Progress ${index + 1}:`);
            console.log(`  - User: ${progress.userId?.username || 'Unknown'} (${progress.userId?.empID || 'N/A'}) - ${progress.userId?.locCode || 'No Location'}`);
            console.log(`  - Training: ${progress.trainingId?.trainingName || 'Unknown'}`);
            console.log(`  - Deadline: ${progress.deadline?.toISOString()}`);
            console.log(`  - Passed: ${progress.pass}`);
            console.log(`  - Status: ${progress.status}`);
            console.log('');
        });

        // 3. Get all distinct users who are IN super admin's allowed branches
        const allowedUsers = await User.find({ locCode: { $in: allowedLocCodes } }).lean();
        const allowedUserIDs = allowedUsers.map(user => user._id.toString());
        const allowedUserEmpIDs = allowedUsers.map(user => user.empID);
        
        console.log(`✅ Users in super admin's allowed branches: ${allowedUsers.length}`);
        console.log(`✅ Allowed user EmpIDs: ${allowedUserEmpIDs.slice(0, 10).join(', ')}...\n`);

        // 4. Find users with overdue trainings but NOT in allowed branches
        
        // For assigned trainings
        console.log('🔴 ASSIGNED TRAININGS - Users in allowed branches:');
        const excludedFromAssigned = [];
        allUsersWithAssignedOverdue.forEach((user, index) => {
            const overdueTrainings = user.training.filter(t => 
                t.deadline < day && !t.pass
            );
            
            if (overdueTrainings.length > 0) {
                if (allowedLocCodes.includes(user.locCode)) {
                    console.log(`  ✅ User ${index + 1}: ${user.username} (${user.empID}) - LocCode: ${user.locCode} - ${overdueTrainings.length} overdue`);
                } else {
                    console.log(`  ❌ User ${index + 1}: ${user.username} (${user.empID}) - LocCode: ${user.locCode} - ${overdueTrainings.length} overdue`);
                    excludedFromAssigned.push({
                        username: user.username,
                        empID: user.empID,
                        locCode: user.locCode,
                        overdueCount: overdueTrainings.length,
                        overdueTrainings: overdueTrainings.map(t => ({
                            trainingName: t.trainingId?.trainingName || 'Unknown',
                            deadline: t.deadline?.toISOString(),
                            status: t.status
                        }))
                    });
                }
            }
        });

        // For mandatory trainings
        console.log('\n🔴 MANDATORY TRAININGS - Users with overdue trainings:');
        const excludedFromMandatory = [];
        const userOverdueCount = new Set(); // Track unique users

        allOverdueMandatoryProgress.forEach((progress, index) => {
            const user = progress.userId;
            if (user) {
                const userKey = `${user.empID}-${user.locCode}`;
                
                if (allowedLocCodes.includes(user.locCode || 'Unknown')) {
                    console.log(`  ✅ Progress ${index + 1}: ${user.username} (${user.empID}) - LocCode: ${user.locCode || 'No Location'}`);
                } else {
                    if (!userOverdueCount.has(userKey)) {
                        excludedFromMandatory.push({
                            username: user.username,
                            empID: user.empID,
                            locCode: user.locCode || 'Unknown',
                            overdueCount: 1 // Each progress record = 1 overdue training
                        });
                        userOverdueCount.add(userKey);
                    }
                    console.log(`  ❌ Progress ${index + 1}: ${user.username} (${user.empID}) - LocCode: ${user.locCode || 'No Location'}`);
                }
            } else {
                console.log(`  ⚠️ Progress ${index + 1}: User data missing`);
            }
        });

        // Combine and deduplicate excluded users
        const allExcludedUsers = new Map();
        
        // Add assigned training excluded users
        excludedFromAssigned.forEach(user => {
            const key = `${user.empID}-${user.locCode}`;
            allExcludedUsers.set(key, {
                username: user.username,
                empID: user.empID,
                locCode: user.locCode,
                assignedOverdue: user.overdueCount,
                mandatoryOverdue: 0,
                totalOverdue: user.overdueCount
            });
        });

        // Add mandatory training excluded users
        excludedFromMandatory.forEach(user => {
            const key = `${user.empID}-${user.locCode}`;
            if (allExcludedUsers.has(key)) {
                const existing = allExcludedUsers.get(key);
                existing.mandatoryOverdue = user.overdueCount;
                existing.totalOverdue = existing.assignedOverdue + user.overdueCount;
            } else {
                allExcludedUsers.set(key, {
                    username: user.username,
                    empID: user.empID,
                    locCode: user.locCode,
                    assignedOverdue: 0,
                    mandatoryOverdue: user.overdueCount,
                    totalOverdue: user.overdueCount
                });
            }
        });

        // Convert to array and sort by total overdue
        const excludedUsersList = Array.from(allExcludedUsers.values())
            .sort((a, b) => b.totalOverdue - a.totalOverdue);

        console.log(`\n🚫 EXCLUDED USERS SUMMARY:`);
        console.log(`========================`);
        console.log(`Total users excluded from dashboard count: ${excludedUsersList.length}`);
        console.log(`Total overdue trainings from excluded users: ${excludedUsersList.reduce((sum, user) => sum + user.totalOverdue, 0)}\n`);

        console.log(`📋 DETAILED LIST OF ${excludedUsersList.length} EXCLUDED USERS:`);
        console.log(`================================================`);
        
        excludedUsersList.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} (${user.empID})`);
            console.log(`   - Location Code: ${user.locCode}`);
            console.log(`   - Assigned Overdue: ${user.assignedOverdue}`);
            console.log(`   - Mandatory Overdue: ${user.mandatoryOverdue}`);
            console.log(`   - Total Overdue: ${user.totalOverdue}`);
            console.log('');
        });

        // Verify the math
        const totalExcludedOverdue = excludedUsersList.reduce((sum, user) => sum + user.totalOverdue, 0);
        const dashboardCount = 396;
        const expectedTotal = dashboardCount + totalExcludedOverdue;
        
        console.log(`🧮 VERIFICATION:`);
        console.log(`=================`);
        console.log(`Dashboard count (allowed branches): ${dashboardCount}`);
        console.log(`Excluded from dashboard: ${totalExcludedOverdue}`);
        console.log(`Expected total: ${expectedTotal}`);
        console.log(`Database total found earlier: 476`);
        console.log(`Difference: ${476 - expectedTotal}`);

    } catch (error) {
        console.error('❌ Error finding excluded overdue users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

findExcludedOverdueUsers();

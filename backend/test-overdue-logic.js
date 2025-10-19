import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Training } from './model/Traning.js';
import User from './model/User.js';
import TrainingProgress from './model/Trainingprocessschema.js';

dotenv.config();

async function testOverdueLogic() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for testing overdue logic...\n');

        // Get current date
        const currentDate = new Date();
        console.log(`📅 Current Date: ${currentDate.toISOString()}\n`);

        // Test 1: Check created trainings
        console.log('🔍 TEST 1: Checking created trainings...');
        const trainings = await Training.find({ trainingName: /Test Overdue/ }).lean();
        console.log(`Found ${trainings.length} test overdue trainings:`);
        trainings.forEach((training, index) => {
            console.log(`  ${index + 1}. ${training.trainingName}`);
            console.log(`     - Deadline (days): ${training.deadline}`);
            console.log(`     - Deadline Date: ${training.deadlineDate?.toISOString()}`);
            console.log(`     - Is Overdue: ${training.deadlineDate < currentDate ? '✅ YES' : '❌ NO'}`);
            console.log(`     - Type: ${training.Trainingtype}`);
            console.log('');
        });

        // Test 2: Check User.training assignments (Assigned trainings)
        console.log('🔍 TEST 2: Checking User.training assignments...');
        const usersWithAssignedOverdue = await User.find({
            'training.deadline': { $lt: currentDate },
            'training.pass': false
        }).populate('training.trainingId').lean();
        
        console.log(`Found ${usersWithAssignedOverdue.length} users with overdue assigned trainings:`);
        usersWithAssignedOverdue.forEach((user, index) => {
            const overdueTrainings = user.training.filter(t => 
                t.deadline < currentDate && !t.pass
            );
            
            console.log(`  User ${index + 1}: ${user.username} (${user.empID})`);
            overdueTrainings.forEach(training => {
                console.log(`    - Training: ${training.trainingId?.trainingName || 'Unknown'}`);
                console.log(`    - Deadline: ${training.deadline?.toISOString()}`);
                console.log(`    - Passed: ${training.pass}`);
                console.log(`    - Status: ${training.status}`);
                console.log('');
            });
        });

        // Test 3: Check TrainingProgress assignments (Mandatory trainings)
        console.log('🔍 TEST 3: Checking TrainingProgress assignments...');
        const overdueMandatory = await TrainingProgress.find({
            deadline: { $lt: currentDate },
            pass: false
        }).populate('userId trainingId').lean();
        
        console.log(`Found ${overdueMandatory.length} overdue mandatory training progress records:`);
        overdueMandatory.forEach((progress, index) => {
            console.log(`  Progress ${index + 1}:`);
            console.log(`    - User: ${progress.userId?.username || 'Unknown'} (${progress.userId?.empID || 'N/A'})`);
            console.log(`    - Training: ${progress.trainingId?.trainingName || 'Unknown'}`);
            console.log(`    - Deadline: ${progress.deadline?.toISOString()}`);
            console.log(`    - Passed: ${progress.pass}`);
            console.log(`    - Status: ${progress.status}`);
            console.log('');
        });

        // Test 4: Simulate the dashboard count logic
        console.log('🔍 TEST 4: Simulating dashboard count logic...');
        const dashboardCount = usersWithAssignedOverdue.length + overdueMandatory.length;
        console.log(`Dashboard Total Overdue Count: ${dashboardCount}`);
        console.log(`  - Assigned Overdue: ${usersWithAssignedOverdue.length}`);
        console.log(`  - Mandatory Overdue: ${overdueMandatory.length}`);

        console.log('\n✅ Overdue training logic test completed!');
        
    } catch (error) {
        console.error('❌ Error testing overdue logic:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

testOverdueLogic();

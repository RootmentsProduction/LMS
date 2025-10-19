import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/User.js';
import Admin from './model/Admin.js';
import TrainingProgress from './model/Trainingprocessschema.js';
import Branch from './model/Branch.js';
import { Training } from './model/Traning.js';

dotenv.config();

async function debugKannurUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for debugging Kannur user issue...\n');

        // 1. Find the Kannur user (look for users with Kannur location)
        const kannurUsers = await User.find({
            $or: [
                { locCode: '21' },
                { workingBranch: { $regex: /kannur/i } },
                { location: { $regex: /kannur/i } }
            ]
        }).lean();

        console.log(`🔍 Found ${kannurUsers.length} users from Kannur:`);
        kannurUsers.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log(`  - Employee ID: ${user.empID}`);
            console.log(`  - Username: ${user.username}`);
            console.log(`  - LocCode: ${user.locCode}`);
            console.log(`  - Working Branch: ${user.workingBranch}`);
            console.log(`  - Location: ${user.location}`);
            console.log(`  - Designation: ${user.designation}`);
            console.log('');
        });

        // 2. Check if there's a specific user with "RASEEB E A" or similar name
        const raseebUser = await User.findOne({
            username: { $regex: /RASEEB/i }
        }).lean();

        if (raseebUser) {
            console.log(`🎯 Found RASEEB user:`);
            console.log(`  - Employee ID: ${raseebUser.empID}`);
            console.log(`  - Username: ${raseebUser.username}`);
            console.log(`  - LocCode: ${raseebUser.locCode}`);
            console.log(`  - Working Branch: ${raseebUser.workingBranch}`);
            console.log(`  - Location: ${raseebUser.location}`);
            console.log(`  - Designation: ${raseebUser.designation}`);
            console.log('');

            // Check their overdue trainings
            const userOverdueTrainings = await TrainingProgress.find({
                userId: raseebUser._id,
                pass: false,
                deadline: { $lt: new Date() }
            }).populate('trainingId').lean();

            console.log(`📋 RASEEB's overdue trainings: ${userOverdueTrainings.length}`);
            userOverdueTrainings.forEach((training, index) => {
                console.log(`  Training ${index + 1}: ${training.trainingName}`);
                console.log(`  - Due Date: ${training.deadline?.toISOString()}`);
                console.log(`  - Status: ${training.status}`);
                console.log('');
            });
        }

        // 3. Check Kannur branch details
        const kannurBranch = await Branch.findOne({
            $or: [
                { locCode: '21' },
                { workingBranch: { $regex: /kannur/i } },
                { location: { $regex: /kannur/i } }
            ]
        }).lean();

        if (kannurBranch) {
            console.log(`🏢 Kannur Branch Found:`);
            console.log(`  - LocCode: ${kannurBranch.locCode}`);
            console.log(`  - Working Branch: ${kannurBranch.workingBranch}`);
            console.log(`  - Location: ${kannurBranch.location}`);
            console.log(`  - Phone: ${kannurBranch.phoneNumber}`);
            console.log(`  - Manager: ${kannurBranch.manager}`);
            console.log('');
        }

        // 4. Check if any cluster admins have access to Kannur (locCode: 21)
        const clusterAdminsWithKannur = await Admin.find({
            role: 'cluster_admin',
            $expr: {
                $anyElementTrue: {
                    $map: {
                        input: { $ifNull: ['$branches', []] },
                        as: 'branch',
                        in: { $eq: ['$$branch.locCode', '21'] }
                    }
                }
            }
        }).populate('branches').lean();

        console.log(`🔍 Cluster admins with Kannur access: ${clusterAdminsWithKannur.length}`);
        clusterAdminsWithKannur.forEach((admin, index) => {
            console.log(`Cluster Admin ${index + 1}:`);
            console.log(`  - ID: ${admin._id}`);
            console.log(`  - Username: ${admin.username}`);
            console.log(`  - Branches: ${admin.branches.map(b => `${b.workingBranch} (${b.locCode})`).join(', ')}`);
            console.log('');
        });

        // 5. Show branch mapping for reference
        console.log(`📋 Store name mapping for reference:`);
        const storeNameToLocCode = {
            'GROOMS TRIVANDRUM': '5',
            'GROOMS PALAKKAD': '19',
            'GROOMS EDAPALLY': '3',
            'GROOMS KOTTAYAM': '9',
            'GROOMS PERUMBAVOOR': '10',
            'GROOMS THRISSUR': '11',
            'GROOMS CHAVAKKAD': '12',
            'GROOMS EDAPPAL': '15',
            'GROOMS VATAKARA': '14',
            'GROOMS PERINTHALMANNA': '16',
            'GROOMS MANJERY': '18',
            'GROOMS KOTTAKKAL': '17',
            'GROOMS KOZHIKODE': '13',
            'GROOMS KANNUR': '21',
            'GROOMS KALPETTA': '20'
        };

        Object.entries(storeNameToLocCode).forEach(([store, locCode]) => {
            console.log(`  ${store}: ${locCode}`);
        });

    } catch (error) {
        console.error('❌ Error debugging Kannur user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

debugKannurUser();

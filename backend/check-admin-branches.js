import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './model/Admin.js';
import Branch from './model/Branch.js';

dotenv.config();

async function checkAdminBranches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for checking admin branches...\n');

        // Get all admins
        const admins = await Admin.find().populate('branches');
        console.log(`🔍 Found ${admins.length} admins:\n`);

        admins.forEach((admin, index) => {
            console.log(`Admin ${index + 1}:`);
            console.log(`  - ID: ${admin._id}`);
            console.log(`  - Username: ${admin.username}`);
            console.log(`  - Role: ${admin.role || 'Not set'}`);
            console.log(`  - Assigned branches: ${admin.branches?.length || 0}`);
            
            if (admin.branches && admin.branches.length > 0) {
                console.log(`  - Branch details:`);
                admin.branches.forEach(branch => {
                    console.log(`    * ${branch.workingBranch} (locCode: ${branch.locCode})`);
                });
            } else {
                console.log(`  - ⚠️  No branches assigned to this admin`);
            }
            console.log('');
        });

        // Get all available branches
        const allBranches = await Branch.find();
        console.log(`🌳 Available branches in system: ${allBranches.length}\n`);
        
        allBranches.forEach((branch, index) => {
            console.log(`Branch ${index + 1}: ${branch.workingBranch} (locCode: ${branch.locCode})`);
        });

        // Check if there's a super admin or admin with all branches
        const adminWithBranches = admins.find(admin => admin.branches && admin.branches.length > 0);
        
        if (adminWithBranches) {
            console.log(`\n✅ Found admin with branches: ${adminWithBranches.username}`);
            console.log(`This admin can see overdue trainings from ${adminWithBranches.branches.length} branches.`);
        } else {
            console.log(`\n❌ No admins have branches assigned!`);
            console.log(`This means all admins will see 0 overdue trainings on dashboard.`);
            console.log(`💡 Need to assign branches to admin accounts.`);
        }

    } catch (error) {
        console.error('❌ Error checking admin branches:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

checkAdminBranches();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/User.js';
import Branch from './model/Branch.js';

dotenv.config();

async function fixSuitorGuyData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for fixing SUITOR GUY data inconsistencies...\n');

        // Store name to location code mapping (same as in calculateProgress)
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
            'GROOMS CALICUT': '13',
            'GROOMS KANNUR': '21',
            'GROOMS KALPETTA': '20',
            'ZORUCCI EDAPPAL': '6',
            'ZORUCCI KOTTAKKAL': '8',
            'ZORUCCI PERINTHALMANNA': '7',
            'ZORUCCI EDAPPALLY': '1',
            // SUITOR GUY mappings
            'SUITOR GUY TRIVANDRUM': '5',
            'SUITOR GUY PALAKKAD': '19',
            'SUITOR GUY EDAPPALLY': '3',
            'SUITOR GUY KOTTAYAM': '9',
            'SUITOR GUY PERUMBAVOOR': '10',
            'SUITOR GUY THRISSUR': '11',
            'SUITOR GUY CHAVAKKAD': '12',
            'SUITOR GUY EDAPPAL': '15',
            'SUITOR GUY VATAKARA': '14',
            'SUITOR GUY PERINTHALMANNA': '16',
            'SUITOR GUY MANJERI': '18',
            'SUITOR GUY KOTTAKKAL': '17',
            'SUITOR GUY CALICUT': '13',
            'SUITOR GUY KALPETTA': '20',
            'SUITOR GUY KANNUR': '21'
        };

        console.log('🔍 Finding users with data inconsistencies...\n');

        // Find all users with SUITOR GUY in their workingBranch
        const suitorGuyUsers = await User.find({
            workingBranch: { $regex: /SUITOR GUY/i }
        }).lean();

        console.log(`📋 Found ${suitorGuyUsers.length} SUITOR GUY users\n`);

        let fixedCount = 0;
        let issuesFound = 0;

        for (const user of suitorGuyUsers) {
            const workingBranchUpper = user.workingBranch.toUpperCase();
            const expectedLocCode = storeNameToLocCode[workingBranchUpper];
            
            console.log(`👤 User: ${user.username} (${user.empID})`);
            console.log(`  - Current workingBranch: ${user.workingBranch}`);
            console.log(`  - Current locCode: ${user.locCode}`);
            console.log(`  - Expected locCode for ${workingBranchUpper}: ${expectedLocCode || 'NOT FOUND'}`);

            if (expectedLocCode && user.locCode !== expectedLocCode) {
                console.log(`  ❌ MISMATCH! Updating locCode from ${user.locCode} to ${expectedLocCode}`);
                
                await User.findByIdAndUpdate(user._id, {
                    locCode: expectedLocCode
                });
                
                fixedCount++;
            } else if (!expectedLocCode) {
                console.log(`  ⚠️  No mapping found for ${workingBranchUpper}`);
                issuesFound++;
            } else {
                console.log(`  ✅ Data is consistent`);
            }
            console.log('');
        }

        // Also check for users with correct locCode but wrong workingBranch
        console.log('🔍 Checking for users with correct locCode but missing SUITOR GUY prefix...\n');

        const allUsers = await User.find({}).lean();
        let additionalFixed = 0;

        for (const user of allUsers) {
            // Check if user's locCode suggests they should be SUITOR GUY
            if (user.locCode && ['5', '19', '3', '9', '10', '11', '12', '15', '14', '16', '18', '17', '13', '20', '21'].includes(user.locCode)) {
                const currentWorkingBranch = user.workingBranch?.toUpperCase();
                
                // If they have a GROOMS workingBranch but locCode matches SUITOR GUY areas, check if they should be SUITOR GUY
                if (currentWorkingBranch && currentWorkingBranch.startsWith('GROOMS')) {
                    // Find if there's a SUITOR GUY equivalent
                    const suitorGuyEquiv = `SUITOR GUY ${currentWorkingBranch.replace('GROOMS ', '')}`;
                    
                    // This is more complex - we'd need business logic to determine if GROOMS users should be SUITOR GUY
                    // For now, let's just log potential issues
                    console.log(`  🤔 ${user.username} (${user.empID}): ${currentWorkingBranch} -> LocCode: ${user.locCode} (might need to be ${suitorGuyEquiv})`);
                }
            }
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`===========`);
        console.log(`✅ Users fixed: ${fixedCount}`);
        console.log(`⚠️  Mapping issues: ${issuesFound}`);
        console.log(`🔍 Additional checks completed`);

        if (fixedCount > 0) {
            console.log(`\n🎉 Fix completed! The branch filtering should now work correctly.`);
        } else {
            console.log(`\n💡 No data inconsistencies found that needed fixing.`);
        }

    } catch (error) {
        console.error('❌ Error fixing SUITOR GUY data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
}

fixSuitorGuyData();

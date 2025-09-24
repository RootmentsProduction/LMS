import axios from 'axios';
import mongoose from 'mongoose';
import User from '../model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/lms';
const BASE_URL = process.env.BASE_URL || 'http://localhost:7000';

async function checkSyncStatus() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URL);
        
        // Get current user count in database
        const dbUserCount = await User.countDocuments();
        console.log(`📊 Users in local database: ${dbUserCount}`);
        
        // Fetch external API count
        console.log('🔄 Fetching from external API...');
        const response = await axios.post(`${BASE_URL}/api/employee_range`, {
            startEmpId: 'EMP1',
            endEmpId: 'EMP9999'
        }, { timeout: 30000 });
        
        const externalEmployees = response.data?.data || [];
        console.log(`📊 Employees in external API: ${externalEmployees.length}`);
        
        // Check for emp311 specifically
        const emp311InDb = await User.findOne({ empID: 'emp311' });
        const emp311InApi = externalEmployees.find(emp => emp.emp_code === 'emp311');
        
        console.log('\n🔍 emp311 Status:');
        console.log(`   • In database: ${emp311InDb ? '✅ YES' : '❌ NO'}`);
        console.log(`   • In external API: ${emp311InApi ? '✅ YES' : '❌ NO'}`);
        
        if (emp311InDb) {
            console.log(`   • Database record:`, {
                name: emp311InDb.username,
                email: emp311InDb.email,
                role: emp311InDb.designation,
                store: emp311InDb.workingBranch
            });
        }
        
        if (emp311InApi) {
            console.log(`   • API record:`, {
                name: emp311InApi.name,
                email: emp311InApi.email,
                role: emp311InApi.role_name,
                store: emp311InApi.store_name
            });
        }
        
        // Summary
        console.log('\n📋 Summary:');
        if (dbUserCount < externalEmployees.length) {
            console.log(`⚠️ Database is missing ${externalEmployees.length - dbUserCount} employees`);
            console.log('💡 Run the sync script: node scripts/sync-all-employees.js');
        } else if (dbUserCount === externalEmployees.length) {
            console.log('✅ Database and external API have same number of employees');
        } else {
            console.log('🤔 Database has more users than external API (may include manually created users)');
        }
        
    } catch (error) {
        console.error('❌ Error checking sync status:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkSyncStatus()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));

import axios from 'axios';
import mongoose from 'mongoose';
import User from '../model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/lms';
const BASE_URL = process.env.BASE_URL || 'http://localhost:7000';

// Store name to locCode mapping (from your existing code)
const storeNameToLocCode = {
    'SUITOR GUY TRIVANDRUM': '1',
    'SUITOR GUY KOCHI': '2', 
    'SUITOR GUY EDAPPALLY': '3',
    'SUITOR GUY CALICUT': '4',
    'SUITOR GUY KANNUR': '5',
    'SUITOR GUY THALASSERY': '6',
    'SUITOR GUY KOTTAYAM': '9',
    'SUITOR GUY PERUMBAVOOR': '10',
    'SUITOR GUY THRISSUR': '11',
    'SUITOR GUY EDAPPAL': '15', // Fixed mapping
    'SUITOR GUY PALAKKAD': '16'
};

async function fetchAllEmployees() {
    try {
        console.log('🔄 Fetching employees from external API...');
        const response = await axios.post(`${BASE_URL}/api/employee_range`, {
            startEmpId: 'EMP1',
            endEmpId: 'EMP9999'
        }, { timeout: 30000 });

        return response.data?.data || [];
    } catch (error) {
        console.error('❌ Error fetching employees from external API:', error.message);
        throw error;
    }
}

async function syncEmployeesToDatabase() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // Fetch all employees from external API
        const externalEmployees = await fetchAllEmployees();
        console.log(`📊 Found ${externalEmployees.length} employees in external API`);

        if (externalEmployees.length === 0) {
            console.log('⚠️ No employees found in external API');
            return;
        }

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        console.log('🔄 Starting synchronization...');

        for (const emp of externalEmployees) {
            try {
                // Skip employees with missing critical data
                if (!emp.emp_code || !emp.email) {
                    console.log(`⚠️ Skipping employee with missing emp_code or email:`, {
                        emp_code: emp.emp_code,
                        email: emp.email,
                        name: emp.name
                    });
                    skippedCount++;
                    continue;
                }

                // Check if user already exists
                let user = await User.findOne({
                    $or: [
                        { empID: emp.emp_code },
                        { email: emp.email }
                    ]
                });

                if (!user) {
                    // Create new user
                    const locCode = storeNameToLocCode[emp.store_name] || emp.store_code || 'Unknown';
                    
                    user = new User({
                        username: emp.name || emp.emp_code || 'Unknown',
                        email: emp.email,
                        empID: emp.emp_code,
                        designation: emp.role_name || 'Unknown',
                        locCode: locCode,
                        workingBranch: emp.store_name || 'Unknown',
                        phoneNumber: emp.phone || '',
                        assignedModules: [],
                        assignedAssessments: [],
                        training: []
                    });

                    await user.save();
                    createdCount++;
                    
                    if (createdCount % 50 === 0) {
                        console.log(`📈 Progress: Created ${createdCount} users so far...`);
                    }
                } else {
                    // Update existing user with latest info from external API
                    let hasChanges = false;
                    
                    if (user.username !== emp.name && emp.name) {
                        user.username = emp.name;
                        hasChanges = true;
                    }
                    
                    if (user.designation !== emp.role_name && emp.role_name) {
                        user.designation = emp.role_name;
                        hasChanges = true;
                    }
                    
                    if (user.workingBranch !== emp.store_name && emp.store_name) {
                        user.workingBranch = emp.store_name;
                        hasChanges = true;
                    }
                    
                    if (user.phoneNumber !== emp.phone && emp.phone) {
                        user.phoneNumber = emp.phone;
                        hasChanges = true;
                    }

                    // Only update locCode if it's currently 'Unknown' or empty
                    if ((!user.locCode || user.locCode === 'Unknown') && emp.store_name && storeNameToLocCode[emp.store_name]) {
                        user.locCode = storeNameToLocCode[emp.store_name];
                        hasChanges = true;
                    }

                    if (hasChanges) {
                        await user.save();
                        updatedCount++;
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing employee ${emp.emp_code}:`, error.message);
                skippedCount++;
            }
        }

        // Final count
        const finalCount = await User.countDocuments();

        console.log('\n🎉 Synchronization completed!');
        console.log(`📊 Results:`);
        console.log(`   • Created: ${createdCount} new users`);
        console.log(`   • Updated: ${updatedCount} existing users`);
        console.log(`   • Skipped: ${skippedCount} users (due to errors or missing data)`);
        console.log(`   • Total users in database: ${finalCount}`);
        console.log(`   • External API employees: ${externalEmployees.length}`);

        // Check for emp311 specifically
        const emp311 = await User.findOne({ empID: 'emp311' });
        if (emp311) {
            console.log(`✅ emp311 found in database:`, {
                name: emp311.username,
                email: emp311.email,
                role: emp311.designation,
                store: emp311.workingBranch
            });
        } else {
            console.log('❌ emp311 not found in database after sync');
            // Check if it exists in external API
            const emp311External = externalEmployees.find(emp => emp.emp_code === 'emp311');
            if (emp311External) {
                console.log('📋 emp311 data from external API:', emp311External);
            } else {
                console.log('⚠️ emp311 not found in external API either');
            }
        }

    } catch (error) {
        console.error('❌ Synchronization failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the synchronization
syncEmployeesToDatabase()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

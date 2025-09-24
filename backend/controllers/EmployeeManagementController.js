import axios from 'axios';
import User from '../model/User.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import { Training } from '../model/Traning.js';
import Module from '../model/Module.js';
import Admin from '../model/Admin.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:7000';

// Helper function to assign mandatory trainings to a user
const assignMandatoryTrainingsToUser = async (user) => {
    try {
        console.log(`🔄 Checking mandatory trainings for user: ${user.empID} with designation: ${user.designation}`);
        
        // Function to flatten a string (remove spaces and lowercase)
        const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');
        
        // Flatten input designation
        const flatDesignation = flatten(user.designation);
        
        // Step 1: Fetch all mandatory trainings
        const allTrainings = await Training.find({
            Trainingtype: 'Mandatory'
        }).populate('modules');
        
        // Step 2: Filter in JS using flattened comparison
        const mandatoryTraining = allTrainings.filter(training =>
            training.Assignedfor.some(role => flatten(role) === flatDesignation)
        );
        
        console.log(`📚 Found ${mandatoryTraining.length} mandatory trainings for designation: ${user.designation}`);
        
        if (mandatoryTraining.length === 0) {
            console.log(`ℹ️  No mandatory trainings found for designation: ${user.designation}`);
            return;
        }
        
        const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30-day deadline
        
        // Create TrainingProgress for each mandatory training
        const trainingAssignments = mandatoryTraining.map(async (training) => {
            // Check if this user already has this training assigned
            const existingProgress = await TrainingProgress.findOne({
                userId: user._id,
                trainingId: training._id
            });
            
            if (existingProgress) {
                console.log(`ℹ️  User ${user.empID} already has training ${training.trainingName} assigned`);
                return;
            }
            
            // Create TrainingProgress for the user
            const trainingProgress = new TrainingProgress({
                userId: user._id,
                trainingName: training.trainingName,
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
            console.log(`✅ Assigned mandatory training "${training.trainingName}" to user ${user.empID}`);
        });
        
        // Wait for all training assignments to complete
        await Promise.all(trainingAssignments);
        console.log(`🎯 Successfully assigned ${mandatoryTraining.length} mandatory trainings to user ${user.empID}`);
        
    } catch (error) {
        console.error(`❌ Error assigning mandatory trainings to user ${user.empID}:`, error);
        // Don't throw error - let the main process continue
    }
};

// Store name to locCode mapping
const storeNameToLocCode = {
    'GROOMS TRIVANDRUM': '1',
    'GROOMS KOCHI': '2',
    'GROOMS EDAPPALLY': '3',
    'GROOMS CALICUT': '4',
    'GROOMS KANNUR': '5',
    'GROOMS THALASSERY': '6',
    'GROOMS KOTTAYAM': '9',
    'GROOMS PERUMBAVOOR': '10',
    'GROOMS THRISSUR': '11',
    'GROOMS CHAVAKKAD': '12',
    'GROOMS EDAPPAL': '15',
    'GROOMS VATAKARA': '14',
    'GROOMS PERINTHALMANNA': '16',
    'GROOMS MANJERY': '18',
    'GROOMS KOTTAKKAL': '17',
    'SUITOR GUY KOTTAKKAL': '17',
    'GROOMS KOZHIKODE': '13',
    'GROOMS CALICUT': '13',
    'GROOMS KANNUR': '21',
    'GROOMS KALPETTA': '20',
    'ZORUCCI EDAPPAL': '6',
    'ZORUCCI KOTTAKKAL': '8',
    'ZORUCCI PERINTHALMANNA': '7',
    'ZORUCCI EDAPPALLY': '1',
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

export const getAllEmployeesWithTrainingDetailsV2 = async (req, res) => {
    try {
        console.log('🔄 Starting enhanced employee data fetch...');
        
        // Get admin permissions
        const admin = await Admin.findById(req?.admin?.userId);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const allowedLocCodes = admin.allowedLocCodes || [];
        const isGlobalAdmin = allowedLocCodes.length === 0 || allowedLocCodes.includes('*');
        
        console.log(`👤 Admin: ${admin.firstName} ${admin.lastName}`);

        console.log(`🔐 Allowed location codes: ${isGlobalAdmin ? 'ALL (Global Admin)' : allowedLocCodes.join(', ')}`);

        // Fetch external employees with retry logic
        let externalEmployees = [];
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                console.log(`📡 Fetching external employees (attempt ${retryCount + 1}/${maxRetries})...`);
                
                // Fetch directly from external API (avoid self-referencing)
                const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
                const response = await axios.post('https://rootments.in/api/employee_range', {
                    startEmpId: 'EMP1',
                    endEmpId: 'EMP9999'
                }, { 
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
                    }
                });

                externalEmployees = response.data?.data || [];
                console.log(`✅ Fetched ${externalEmployees.length} external employees`);
                break;
            } catch (error) {
                retryCount++;
                console.error(`❌ External API attempt ${retryCount} failed:`, error.message);
                console.error(`❌ External API error details:`, {
                    status: error?.response?.status,
                    statusText: error?.response?.statusText,
                    url: error?.config?.url,
                    timeout: error?.config?.timeout
                });
                
                if (retryCount >= maxRetries) {
                    console.error('❌ All external API attempts failed, continuing with local data only');
                    externalEmployees = [];
                } else {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        }

        // Filter external employees by permissions (only if not global admin)
        let filteredExternalEmployees = externalEmployees;
        
        if (!isGlobalAdmin) {
            filteredExternalEmployees = externalEmployees.filter(emp => {
                const storeName = emp?.store_name?.toUpperCase();
                
                // Always include employees with "No Store" - they should be visible to all admins
                if (storeName === 'NO STORE' || !storeName || storeName === '') {
                    return true;
                }
                
                const mappedLocCode = storeNameToLocCode[storeName];
                
                if (mappedLocCode && allowedLocCodes.includes(mappedLocCode)) {
                    return true;
                }
                
                const empLocCode = emp?.store_code || emp?.locCode;
                return allowedLocCodes.includes(empLocCode);
            });
            
            console.log(`🔍 Filtered external employees: ${filteredExternalEmployees.length} (from ${externalEmployees.length})`);
        } else {
            console.log(`🌐 Global admin - showing all ${filteredExternalEmployees.length} external employees`);
        }

        // Get local users in allowed branches
        let localUsersQuery = {};
        
        if (!isGlobalAdmin) {
            localUsersQuery = { 
                $or: [
                    { locCode: { $in: allowedLocCodes } },
                    { workingBranch: 'No Store' },
                    { workingBranch: 'NO STORE' },
                    { workingBranch: 'no store' },
                    { workingBranch: '' },
                    { workingBranch: { $exists: false } }
                ]
            };
        }

        const localUsers = await User.find(localUsersQuery);
        console.log(`👥 Local users: ${localUsers.length}`);
        
        // Create employee synchronization map
        const employeeDataMap = new Map();
        
        // Add external employees to map and auto-create local users if needed
        const newUsersToCreate = [];
        for (const emp of filteredExternalEmployees) {
            if (emp.emp_code) {
                employeeDataMap.set(emp.emp_code, {
                    empID: emp.emp_code,
                    username: emp.name || '',
                    designation: emp.role_name || '',
                    workingBranch: emp.store_name || '',
                    email: emp.email || '',
                    phoneNumber: emp.phone || '',
                    isLocalUser: false,
                    hasTrainingData: false,
                    externalData: emp
                });
                
                // Check if this external employee needs to be created locally
                const existingLocalUser = localUsers.find(user => user.empID === emp.emp_code);
                if (!existingLocalUser) {
                    // Determine locCode from store_code or store name mapping
                    let locCode = emp.store_code || '';
                    if (!locCode && emp.store_name) {
                        locCode = storeNameToLocCode[emp.store_name.toUpperCase()] || '1'; // Default to '1' if not found
                    }
                    if (!locCode) {
                        locCode = '1'; // Final fallback
                    }
                    
                    newUsersToCreate.push({
                        empID: emp.emp_code,
                        username: emp.name || '',
                        email: emp.email || `${emp.emp_code}@company.com`,
                        designation: emp.role_name || '',
                        workingBranch: emp.store_name || '',
                        locCode: locCode,
                        phoneNumber: emp.phone || '',
                        training: [],
                        assignedAssessments: []
                    });
                }
            }
        }
        
        // Create new local users for external employees
        if (newUsersToCreate.length > 0) {
            console.log(`🔄 Creating ${newUsersToCreate.length} new local users from external data...`);
            
            try {
                const createdUsers = await User.insertMany(newUsersToCreate);
                console.log(`✅ Created ${createdUsers.length} new local users`);
                
                // Auto-assign mandatory trainings to new users
                for (const newUser of createdUsers) {
                    try {
                        await assignMandatoryTrainingsToUser(newUser);
                        console.log(`✅ Assigned mandatory trainings to ${newUser.empID}`);
                    } catch (error) {
                        console.error(`❌ Failed to assign trainings to ${newUser.empID}:`, error.message);
                        // Continue with other users even if one fails
                    }
                }
                
                // Also check existing users for missing mandatory trainings
                console.log(`🔍 Checking existing users for missing mandatory trainings...`);
                for (const existingUser of localUsers.filter(u => !newUsersToCreate.find(nu => nu.empID === u.empID))) {
                    try {
                        await assignMandatoryTrainingsToUser(existingUser);
                    } catch (error) {
                        console.error(`❌ Failed to check/assign trainings to existing user ${existingUser.empID}:`, error.message);
                        // Continue with other users even if one fails
                    }
                }
                
                // Update localUsers array to include new users
                localUsers.push(...createdUsers);
                console.log(`👥 Updated local users count: ${localUsers.length}`);
                
            } catch (error) {
                console.error('❌ Error creating new local users:', error.message);
            }
        }

        // Add/Update with local user data
        localUsers.forEach(user => {
            const existing = employeeDataMap.get(user.empID);
            if (existing) {
                // Update external data with local user info
                existing.isLocalUser = true;
                existing.hasTrainingData = true;
                existing.localUser = user;
            } else {
                // Add local-only user
                employeeDataMap.set(user.empID, {
                    empID: user.empID,
                    username: user.username || '',
                    designation: user.designation || '',
                    workingBranch: user.workingBranch || '',
                    email: user.email || '',
                    phoneNumber: user.phoneNumber || '',
                    isLocalUser: true,
                    hasTrainingData: true,
                    localUser: user,
                    externalData: null
                });
            }
        });

        // Pre-fetch all training progress records to avoid N+1 queries
        const allUserIds = localUsers.map(user => user._id);
        const allTrainingProgress = await TrainingProgress.find({ 
            userId: { $in: allUserIds } 
        });
        
        // Create a map of userId -> training progress records
        const trainingProgressMap = new Map();
        allTrainingProgress.forEach(progress => {
            const userId = progress.userId.toString();
            if (!trainingProgressMap.has(userId)) {
                trainingProgressMap.set(userId, []);
            }
            trainingProgressMap.get(userId).push(progress);
        });
        
        console.log(`📊 Pre-fetched ${allTrainingProgress.length} training progress records`);

        // Process all employees to add training/assessment details
        const processedEmployees = [];
        let employeesWithTraining = 0;

        for (const [empID, employeeData] of employeeDataMap) {
            const localUser = employeeData.localUser;
            
            let trainingCount = 0;
            let passCountTraining = 0;
            let trainingDue = 0;
            let assignedAssessmentsCount = 0;
            let passCountAssessment = 0;
            let assessmentDue = 0;
            let trainingCompletionPercentage = 0;
            let assessmentCompletionPercentage = 0;
            
            if (localUser) {
                // Calculate training statistics
                let assignedTrainingCount = 0;
                let assignedPassCount = 0;
                let assignedOverdueCount = 0;
                
                let mandatoryTrainingCount = 0;
                let mandatoryPassCount = 0;
                let mandatoryOverdueCount = 0;
                
                // Count assigned trainings from user.training array
                if (localUser.training && Array.isArray(localUser.training)) {
                    assignedTrainingCount = localUser.training.length;
                    assignedPassCount = localUser.training.filter(t => t.pass).length;
                    
                    // Calculate overdue assigned trainings
                    const today = new Date();
                    assignedOverdueCount = localUser.training.filter(t => 
                        new Date(t.deadline) < today && !t.pass
                    ).length;
                }
                
                // Count mandatory trainings from TrainingProgress collection
                const userTrainingProgress = trainingProgressMap.get(localUser._id.toString()) || [];
                
                // Get assigned training IDs to avoid duplicates
                const assignedTrainingIds = localUser.training ? 
                    localUser.training.map(t => t.trainingId.toString()) : [];
                
                // Filter out mandatory trainings that are already in assigned trainings
                const uniqueMandatoryTrainings = userTrainingProgress.filter(tp => 
                    !assignedTrainingIds.includes(tp.trainingId.toString())
                );
                
                mandatoryTrainingCount = uniqueMandatoryTrainings.length;
                mandatoryPassCount = uniqueMandatoryTrainings.filter(tp => tp.pass).length;
                
                // Calculate overdue mandatory trainings
                const today = new Date();
                mandatoryOverdueCount = uniqueMandatoryTrainings.filter(tp => 
                    new Date(tp.deadline) < today && !tp.pass
                ).length;
                
                // Combine both types of trainings (no duplicates)
                trainingCount = assignedTrainingCount + mandatoryTrainingCount;
                passCountTraining = assignedPassCount + mandatoryPassCount;
                trainingDue = assignedOverdueCount + mandatoryOverdueCount;
                
                trainingCompletionPercentage = trainingCount > 0 ? 
                    Math.round((passCountTraining / trainingCount) * 100) : 0;
                
                // Calculate assessment data
                if (localUser.assignedAssessments && Array.isArray(localUser.assignedAssessments)) {
                    assignedAssessmentsCount = localUser.assignedAssessments.length;
                    passCountAssessment = localUser.assignedAssessments.filter(a => a.pass).length;
                    
                    // Calculate overdue assessments
                    const today = new Date();
                    assessmentDue = localUser.assignedAssessments.filter(a => 
                        new Date(a.deadline) < today && !a.pass
                    ).length;
                    
                    assessmentCompletionPercentage = assignedAssessmentsCount > 0 ? 
                        Math.round((passCountAssessment / assignedAssessmentsCount) * 100) : 0;
                }

                if (trainingCount > 0 || assignedAssessmentsCount > 0) {
                    employeesWithTraining++;
                }
            }
            
            processedEmployees.push({
                empID: employeeData.empID,
                username: employeeData.username,
                designation: employeeData.designation,
                workingBranch: employeeData.workingBranch,
                email: employeeData.email,
                phoneNumber: employeeData.phoneNumber,
                trainingCount,
                passCountTraining,
                trainingDue,
                trainingCompletionPercentage,
                assignedAssessmentsCount,
                passCountAssessment,
                assessmentDue,
                assessmentCompletionPercentage,
                isLocalUser: employeeData.isLocalUser,
                hasTrainingData: employeeData.hasTrainingData
            });
        }

        // Sort employees by empID for consistent ordering
        processedEmployees.sort((a, b) => {
            const aNum = parseInt(a.empID.replace(/\D/g, '')) || 0;
            const bNum = parseInt(b.empID.replace(/\D/g, '')) || 0;
            return aNum - bNum;
        });

        console.log(`✅ Processed ${processedEmployees.length} total employees`);
        console.log(`📈 Employees with training data: ${employeesWithTraining}`);
        console.log(`📊 Local users in database: ${localUsers.length}`);
        console.log(`🌐 External employees: ${filteredExternalEmployees.length}`);

        res.status(200).json({
            success: true,
            message: 'Employee data with training details fetched successfully',
            data: processedEmployees,
            employeesWithTraining,
            totalEmployees: processedEmployees.length,
            localUsers: localUsers.length,
            externalEmployees: filteredExternalEmployees.length,
            isGlobalAdmin
        });

    } catch (error) {
        console.error('❌ Error in getAllEmployeesWithTrainingDetailsV2:', error);
        
        // Return a more informative error response
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                name: error.name
            } : undefined
        });
    }
};

// Auto-sync function to keep database updated with external API
export const autoSyncEmployees = async (req, res) => {
    try {
        console.log('🔄 Starting auto-sync of employees...');

        // Fetch all employees directly from external API (avoid self-referencing)
        const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
        const response = await axios.post('https://rootments.in/api/employee_range', {
            startEmpId: 'EMP1',
            endEmpId: 'EMP9999'
        }, { 
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
            }
        });

        const externalEmployees = response.data?.data || [];
        console.log(`📡 Fetched ${externalEmployees.length} employees from external API`);

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const emp of externalEmployees) {
            try {
                // Skip employees with missing critical data
                if (!emp.emp_code || !emp.email) {
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
                    
                    // Auto-assign mandatory trainings to newly created user
                    try {
                        await assignMandatoryTrainingsToUser(user);
                        console.log(`✅ Assigned mandatory trainings to newly created user ${user.empID}`);
                    } catch (error) {
                        console.error(`❌ Failed to assign mandatory trainings to ${user.empID}:`, error.message);
                        // Continue with other users even if training assignment fails
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
                    
                    // Check if existing user has mandatory trainings assigned
                    try {
                        const existingProgress = await TrainingProgress.find({ userId: user._id });
                        if (existingProgress.length === 0) {
                            console.log(`🔍 Existing user ${user.empID} has no mandatory trainings, assigning them now...`);
                            await assignMandatoryTrainingsToUser(user);
                            console.log(`✅ Assigned mandatory trainings to existing user ${user.empID}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to check/assign trainings to existing user ${user.empID}:`, error.message);
                        // Continue with other users even if training check fails
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing employee ${emp.emp_code}:`, error.message);
                skippedCount++;
            }
        }

        const finalCount = await User.countDocuments();

        console.log('🎉 Auto-sync completed!');
        console.log(`📊 Results:`);
        console.log(`   • Created: ${createdCount} new users`);
        console.log(`   • Updated: ${updatedCount} existing users`);
        console.log(`   • Skipped: ${skippedCount} users`);
        console.log(`   • Total users in database: ${finalCount}`);

        res.status(200).json({
            success: true,
            message: 'Employee auto-sync completed successfully',
            results: {
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount,
                totalInDatabase: finalCount,
                externalApiCount: externalEmployees.length
            }
        });

    } catch (error) {
        console.error('❌ Error in auto-sync:', error);
        console.error('❌ Error details:', {
            message: error.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            config: {
                url: error?.config?.url,
                method: error?.config?.method,
                timeout: error?.config?.timeout
            }
        });
        
        res.status(500).json({
            success: false,
            message: 'Auto-sync failed',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                url: error?.config?.url
            } : undefined
        });
    }
};

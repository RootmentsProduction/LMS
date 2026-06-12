import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './model/User.js';
import Employee from './model/Employee.js';
import Admin from './model/Admin.js';
import Branch from './model/Branch.js';
import Task from './model/Task.js';
import { Training } from './model/Traning.js';
import Module from './model/Module.js';
import TrainingProgress from './model/Trainingprocessschema.js';
import Notification from './model/Notification.js';

// Import controller functions
import { createTask, updateTaskStatus, reassignTask } from './controllers/TaskController.js';
import { ReassignTraining } from './controllers/AssessmentAndModule.js';
import { UpdateuserTrainingprocess } from './controllers/CreateUser.js';
import { GetUserMessage } from './controllers/FutterAssessment.js';

dotenv.config();

const runTests = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment!');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected successfully to:', mongoose.connection.db.databaseName);

  // Define cleanup function
  const cleanup = async () => {
    console.log('🧹 Cleaning up temporary test data...');
    await User.deleteMany({ username: /^TEST_TEMP_/ });
    await Employee.deleteMany({ firstName: /^TEST_TEMP_/ });
    await Admin.deleteMany({ name: /^TEST_TEMP_/ });
    await Branch.deleteMany({ workingBranch: /^TEST_TEMP_/ });
    await Task.deleteMany({ title: /^TEST_TEMP_/ });
    await Training.deleteMany({ trainingName: /^TEST_TEMP_/ });
    await Module.deleteMany({ moduleName: /^TEST_TEMP_/ });
    await TrainingProgress.deleteMany({ trainingName: /^TEST_TEMP_/ });
    await Notification.deleteMany({ title: /^TEST_TEMP_/ });
    await Notification.deleteMany({ body: /TEST_TEMP_/ });
    console.log('✅ Cleanup completed.');
  };

  try {
    // 0. Pre-clean
    await cleanup();

    // 1. Setup mock branch
    console.log('⚡ Setting up mock branch...');
    const testBranch = await Branch.create({
      locCode: '9999',
      workingBranch: 'TEST_TEMP_Branch',
      phoneNumber: '1234567890',
      location: 'Test City',
      address: '123 Test St',
      manager: 'Test Manager'
    });

    // 2. Setup mock admin (manager)
    console.log('⚡ Setting up mock admin...');
    const testAdmin = await Admin.create({
      name: 'TEST_TEMP_Admin',
      email: 'test_admin_notif@test.com',
      EmpId: 'EMP_ADM_99',
      role: 'super_admin',
      subRole: 'NR',
      branches: [testBranch._id]
    });

    // 3. Setup mock user 1 (assignee)
    console.log('⚡ Setting up mock user 1...');
    const testUser = await User.create({
      username: 'TEST_TEMP_User1',
      email: 'test_user1_notif@test.com',
      empID: 'EMP_USR_99_1',
      locCode: '9999',
      designation: 'Staff',
      workingBranch: 'TEST_TEMP_Branch'
    });

    console.log('⚡ Setting up mock employee 1...');
    const testEmployee = await Employee.create({
      employeeId: 'EMP_USR_99_1',
      firstName: 'TEST_TEMP_Emp1',
      lastName: 'User',
      email: 'test_user1_notif@test.com',
      phoneNumber: '9876543210',
      department: 'Sales',
      designation: 'Staff',
      dateOfJoining: new Date(),
      salary: 15000,
      storeId: testBranch._id,
      userId: testUser._id
    });

    // 4. Setup mock user 2 (reassignee)
    console.log('⚡ Setting up mock user 2...');
    const testUser2 = await User.create({
      username: 'TEST_TEMP_User2',
      email: 'test_user2_notif@test.com',
      empID: 'EMP_USR_99_2',
      locCode: '9999',
      designation: 'Staff',
      workingBranch: 'TEST_TEMP_Branch'
    });

    console.log('⚡ Setting up mock employee 2...');
    const testEmployee2 = await Employee.create({
      employeeId: 'EMP_USR_99_2',
      firstName: 'TEST_TEMP_Emp2',
      lastName: 'User',
      email: 'test_user2_notif@test.com',
      phoneNumber: '9876543211',
      department: 'Sales',
      designation: 'Staff',
      dateOfJoining: new Date(),
      salary: 15000,
      storeId: testBranch._id,
      userId: testUser2._id
    });

    // --- TEST 1: Task Assignment Notification ---
    console.log('\n--- 📝 Test 1: Task Assignment ---');
    let responseStatus = 200;
    let responseData = null;
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data) => {
        responseData = data;
        return mockRes;
      }
    };

    const mockReqCreateTask = {
      admin: {
        userId: testAdmin._id.toString(),
        role: 'super_admin'
      },
      body: {
        title: 'TEST_TEMP_Task_1',
        category: 'Operation',
        subCategory: 'Daily Check',
        assignedTo: testEmployee._id.toString(),
        assignedToLabel: testUser.username,
        startDate: '01/06/2026',
        description: 'Test task assignment',
        priority: 'Normal'
      }
    };

    await createTask(mockReqCreateTask, mockRes);
    if (responseStatus !== 201 || !responseData?.success) {
      throw new Error(`Task creation failed: ${JSON.stringify(responseData)}`);
    }

    const createdTask = responseData.data;
    console.log('✅ Task created successfully. Task Code:', createdTask.id);

    // Verify task assignment notification saved to DB
    const notifAssign = await Notification.findOne({
      user: testEmployee._id,
      title: 'New Task Assigned'
    });
    if (!notifAssign) {
      throw new Error('❌ Task assignment notification not found in database!');
    }
    console.log('✅ Task assignment notification successfully saved:', notifAssign.body);


    // --- TEST 2: Task Review Submission Notification ---
    console.log('\n--- 📝 Test 2: Task Under Review ---');
    const mockReqReviewTask = {
      params: {
        id: createdTask.id
      },
      admin: {
        userId: testUser._id.toString(),
        role: 'employee'
      },
      body: {
        status: 'UNDER REVIEW',
        fileAttachment: {
          name: 'proof.png',
          base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    };

    responseStatus = 200;
    responseData = null;
    await updateTaskStatus(mockReqReviewTask, mockRes);
    if (responseStatus !== 200 || !responseData?.success) {
      throw new Error(`Task status update to review failed: ${JSON.stringify(responseData)}`);
    }
    console.log('✅ Task successfully moved to UNDER REVIEW.');

    // Verify review submission notification targeted at the task creator (testAdmin)
    const notifReview = await Notification.findOne({
      user: testAdmin._id,
      title: 'Task Submitted for Review'
    });
    if (!notifReview) {
      throw new Error('❌ Task review notification not found in database!');
    }
    console.log('✅ Task review notification successfully saved:', notifReview.body);


    // --- TEST 3: Task Reassignment Notification ---
    console.log('\n--- 📝 Test 3: Task Reassignment ---');
    const mockReqReassignTask = {
      params: {
        id: createdTask.id
      },
      admin: {
        userId: testAdmin._id.toString(),
        role: 'super_admin'
      },
      body: {
        assignedTo: testEmployee2._id.toString(),
        assignedToLabel: testUser2.username
      }
    };

    responseStatus = 200;
    responseData = null;
    await reassignTask(mockReqReassignTask, mockRes);
    if (responseStatus !== 200 || !responseData?.success) {
      throw new Error(`Task reassignment failed: ${JSON.stringify(responseData)}`);
    }
    console.log('✅ Task successfully reassigned to User 2.');

    // Verify task reassignment notification saved to DB targeting testEmployee2
    const notifReassign = await Notification.findOne({
      user: testEmployee2._id,
      title: 'Task Reassigned'
    });
    if (!notifReassign) {
      throw new Error('❌ Task reassignment notification not found in database!');
    }
    console.log('✅ Task reassignment notification successfully saved:', notifReassign.body);


    // --- TEST 4: Training Assignment Notification ---
    console.log('\n--- 📚 Test 4: Training Assignment ---');
    // Setup mock Module & Training
    const mockModule = await Module.create({
      moduleName: 'TEST_TEMP_Module_1',
      description: 'Test Module 1 description',
      videos: [{
        title: 'TEST_TEMP_Video_1',
        videoUri: 'https://test-uri.com/video1.mp4',
        questions: [{
          questionText: 'Test question?',
          options: ['Yes', 'No'],
          correctAnswer: 'Yes'
        }]
      }]
    });

    const mockTraining = await Training.create({
      trainingName: 'TEST_TEMP_Training_1',
      description: 'Test Training 1 description',
      modules: [mockModule._id],
      deadline: 7
    });

    const mockReqAssignTraining = {
      admin: {
        username: 'TEST_TEMP_Admin'
      },
      body: {
        assignedTo: [testUser.empID],
        trainingId: mockTraining._id.toString()
      }
    };

    responseStatus = 200;
    responseData = null;
    await ReassignTraining(mockReqAssignTraining, mockRes);
    if (responseStatus !== 200) {
      throw new Error(`Training assignment failed: ${JSON.stringify(responseData)}`);
    }
    console.log('✅ Training assigned successfully.');

    // Verify training assignment notification saved to DB
    const notifAssignTraining = await Notification.findOne({
      user: testUser._id,
      title: 'New Training Assigned'
    });
    if (!notifAssignTraining) {
      throw new Error('❌ Training assignment notification not found in database!');
    }
    console.log('✅ Training assignment notification successfully saved:', notifAssignTraining.body);


    // --- TEST 5: Training Completion Notification ---
    console.log('\n--- 📚 Test 5: Training Completion ---');
    // Fetch newly created progress
    const progress = await TrainingProgress.findOne({
      userId: testUser._id,
      trainingId: mockTraining._id
    });
    if (!progress) {
      throw new Error('TrainingProgress not found in DB!');
    }

    const mockReqCompleteTraining = {
      body: {
        userId: testUser._id.toString(),
        trainingId: mockTraining._id.toString(),
        moduleId: progress.modules[0].moduleId.toString(),
        videoId: progress.modules[0].videos[0].videoId.toString(),
        watchTime: 100,
        totalDuration: 100
      }
    };

    responseStatus = 200;
    responseData = null;
    await UpdateuserTrainingprocess(mockReqCompleteTraining, mockRes);
    if (responseStatus !== 200) {
      throw new Error(`Training completion progress update failed: ${JSON.stringify(responseData)}`);
    }
    console.log('✅ Training progress video completed.');

    // Verify training completion notification saved to DB
    const notifCompleteTraining = await Notification.findOne({
      user: testUser._id,
      title: 'Training Completed'
    });
    if (!notifCompleteTraining) {
      throw new Error('❌ Training completion notification not found in database!');
    }
    console.log('✅ Training completion notification successfully saved:', notifCompleteTraining.body);


    // --- TEST 6: Message Fetching API endpoint (GetUserMessage) ---
    console.log('\n--- 📱 Test 6: GetUserMessage Fetch Endpoint ---');
    
    // Fetch for regular User (testUser) by Email
    const mockReqGetMessagesUserEmail = {
      params: {
        id: testUser.email
      }
    };

    responseStatus = 200;
    responseData = null;
    await GetUserMessage(mockReqGetMessagesUserEmail, mockRes);
    if (responseStatus !== 200 || !responseData?.notifications) {
      throw new Error(`Get messages user by email failed: ${JSON.stringify(responseData)}`);
    }
    if (responseData.notifications.length !== 3) {
      throw new Error(`❌ Expected 3 notifications for testUser (2 user, 1 employee), but got ${responseData.notifications.length}`);
    }
    console.log(`✅ Retrieved ${responseData.notifications.length} notifications (verified user received notifications from both User ID and linked Employee ID)`);

    // Fetch for regular User (testUser) by empID
    const mockReqGetMessagesUserEmpID = {
      params: {
        id: testUser.empID
      }
    };

    responseStatus = 200;
    responseData = null;
    await GetUserMessage(mockReqGetMessagesUserEmpID, mockRes);
    if (responseStatus !== 200 || !responseData?.notifications) {
      throw new Error(`Get messages user by empID failed: ${JSON.stringify(responseData)}`);
    }
    console.log(`✅ Retrieved ${responseData.notifications.length} notifications for user by empID: ${testUser.empID}`);
    
    // Check descending order sorting
    const returnedNotifications = responseData.notifications;
    let isSorted = true;
    for (let i = 0; i < returnedNotifications.length - 1; i++) {
      if (new Date(returnedNotifications[i].createdAt) < new Date(returnedNotifications[i + 1].createdAt)) {
        isSorted = false;
        break;
      }
    }
    if (!isSorted) {
      throw new Error('❌ Notifications returned from GetUserMessage are not sorted latest-first!');
    }
    console.log('✅ Verified notifications are correctly sorted latest-first.');

    // Fetch for Admin (testAdmin) by Email
    const mockReqGetMessagesAdminEmail = {
      params: {
        id: testAdmin.email
      }
    };

    responseStatus = 200;
    responseData = null;
    await GetUserMessage(mockReqGetMessagesAdminEmail, mockRes);
    if (responseStatus !== 200 || !responseData?.notifications) {
      throw new Error(`Get messages admin by email failed: ${JSON.stringify(responseData)}`);
    }
    console.log(`✅ Retrieved ${responseData.notifications.length} notifications for admin by email: ${testAdmin.email}`);

    // Fetch for Admin (testAdmin) by EmpId
    const mockReqGetMessagesAdminEmpID = {
      params: {
        id: testAdmin.EmpId
      }
    };

    responseStatus = 200;
    responseData = null;
    await GetUserMessage(mockReqGetMessagesAdminEmpID, mockRes);
    if (responseStatus !== 200 || !responseData?.notifications) {
      throw new Error(`Get messages admin by EmpId failed: ${JSON.stringify(responseData)}`);
    }
    console.log(`✅ Retrieved ${responseData.notifications.length} notifications for admin by EmpId: ${testAdmin.EmpId}`);

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
  } finally {
    // Cleanup databases
    await cleanup();
    console.log('🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('👋 Done.');
  }
};

runTests();

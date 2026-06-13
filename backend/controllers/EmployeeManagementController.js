import axios from 'axios';
import User from '../model/User.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import { Training } from '../model/Traning.js';
import Admin from '../model/Admin.js';
import Task from '../model/Task.js';
import {
  getExternalEmployeesNonBlocking,
  getProcessedCacheKey,
  getProcessedEmployees,
  setProcessedEmployees,
  refreshExternalEmployees,
  clearEmployeeCaches,
} from '../lib/employeeCache.js';

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
  'SUITOR GUY KANNUR': '21',
};

const USER_FIELDS = 'empID username designation workingBranch email phoneNumber training assignedAssessments locCode source';
const PROGRESS_FIELDS = 'userId trainingId pass deadline';

const parseDateParts = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [dd, mm, yyyy] = dateStr.split('/');
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) return new Date(dateStr);
    const [dd, mm, yyyy] = parts;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  return new Date(dateStr);
};

const computeStatus = (task) => {
  if (task.status === 'COMPLETED') return 'COMPLETED';
  if (task.status === 'IN PROGRESS') return 'IN PROGRESS';
  if (task.status === 'ON HOLD') return 'ON HOLD';
  if (task.status === 'UNDER REVIEW') return 'UNDER REVIEW';

  const end = parseDateParts(task.endDate);
  if (end) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (end < today) return 'OVERDUE';
  }
  return task.status || 'PENDING';
};

function filterExternalByBranch(externalEmployees, allowedLocCodes, isGlobalAdmin) {
  let filtered = externalEmployees.filter((emp) => {
    const storeName = emp?.store_name?.toUpperCase();
    return storeName && storeName !== 'NO STORE' && storeName !== '';
  });

  if (!isGlobalAdmin) {
    filtered = filtered.filter((emp) => {
      const storeName = emp?.store_name?.toUpperCase();
      const mappedLocCode = storeNameToLocCode[storeName];
      if (mappedLocCode && allowedLocCodes.includes(mappedLocCode)) return true;
      const empLocCode = emp?.store_code || emp?.locCode;
      return allowedLocCodes.includes(empLocCode);
    });
  }
  return filtered;
}

function buildEmployeeStats(localUser, userTrainingProgress, userTasks) {
  let trainingCount = 0;
  let passCountTraining = 0;
  let trainingDue = 0;
  let trainingPending = 0;
  
  let assignedAssessmentsCount = 0;
  let passCountAssessment = 0;
  let assessmentDue = 0;

  let taskCount = 0;
  let passCountTask = 0;
  let taskDue = 0;
  let taskPending = 0;

  const today = new Date();

  // 1. Calculate training and assessment stats
  if (localUser) {
    const progressMap = new Map();
    (userTrainingProgress || []).forEach(tp => {
      if (tp.trainingId) {
        progressMap.set(tp.trainingId.toString(), tp);
      }
    });

    const uniqueTrainingIds = new Set();
    const assignedTrainings = localUser.training || [];
    assignedTrainings.forEach(t => {
      if (t.trainingId) uniqueTrainingIds.add(t.trainingId.toString());
    });
    (userTrainingProgress || []).forEach(tp => {
      if (tp.trainingId) uniqueTrainingIds.add(tp.trainingId.toString());
    });

    uniqueTrainingIds.forEach(tId => {
      const progressDoc = progressMap.get(tId);
      const userTrainingDoc = assignedTrainings.find(t => t.trainingId && t.trainingId.toString() === tId);

      let pass = false;
      let deadline = null;

      if (progressDoc) {
        pass = progressDoc.pass || progressDoc.status === 'Completed';
        deadline = progressDoc.deadline;
      } else if (userTrainingDoc) {
        pass = userTrainingDoc.pass || userTrainingDoc.status === 'Completed';
        deadline = userTrainingDoc.deadline;
      }

      trainingCount++;
      if (pass) {
        passCountTraining++;
      } else {
        if (deadline && new Date(deadline) < today) {
          trainingDue++;
        } else {
          trainingPending++;
        }
      }
    });

    if (localUser.assignedAssessments?.length) {
      assignedAssessmentsCount = localUser.assignedAssessments.length;
      passCountAssessment = localUser.assignedAssessments.filter((a) => a.pass).length;
      assessmentDue = localUser.assignedAssessments.filter(
        (a) => new Date(a.deadline) < today && !a.pass
      ).length;
    }
  }

  // 2. Calculate operational task stats
  if (userTasks && userTasks.length) {
    taskCount = userTasks.length;
    userTasks.forEach(task => {
      const status = computeStatus(task);
      if (status === 'COMPLETED') {
        passCountTask++;
      } else if (status === 'OVERDUE') {
        taskDue++;
      } else {
        taskPending++;
      }
    });
  }

  return {
    trainingCount,
    passCountTraining,
    trainingDue,
    trainingPending,
    trainingCompletionPercentage:
      trainingCount > 0 ? Math.round((passCountTraining / trainingCount) * 100) : 0,
    
    assignedAssessmentsCount,
    passCountAssessment,
    assessmentDue,
    assessmentCompletionPercentage:
      assignedAssessmentsCount > 0
        ? Math.round((passCountAssessment / assignedAssessmentsCount) * 100)
        : 0,
    
    taskCount,
    passCountTask,
    taskDue,
    taskPending,
  };
}

function getEmpSortKey(empID) {
  const raw = String(empID || '').trim();
  const match = raw.match(/^(.*?)(\d+)$/);

  if (!match) {
    return {
      prefix: raw.toLowerCase(),
      number: Number.MAX_SAFE_INTEGER,
      raw: raw.toLowerCase(),
    };
  }

  return {
    prefix: match[1].toLowerCase(),
    number: parseInt(match[2], 10) || 0,
    raw: raw.toLowerCase(),
  };
}

async function buildProcessedEmployees(admin) {
  const allowedLocCodes = admin.branches.map((branch) => branch.locCode);
  const isGlobalAdmin = ['super_admin', 'admin', 'hr_admin'].includes(admin.role) || allowedLocCodes.length === 0;
  const cacheKey = getProcessedCacheKey(admin._id.toString(), allowedLocCodes, isGlobalAdmin);

  const cached = getProcessedEmployees(cacheKey);
  if (cached) return { employees: cached, isGlobalAdmin, cacheKey };

  const localUsersQuery =
    !isGlobalAdmin && allowedLocCodes.length > 0
      ? {
          $and: [
            { locCode: { $in: allowedLocCodes } },
            {
              $nor: [
                { workingBranch: 'No Store' },
                { workingBranch: 'NO STORE' },
                { workingBranch: '' },
              ],
            },
          ],
        }
      : {
          $nor: [
            { workingBranch: 'No Store' },
            { workingBranch: 'NO STORE' },
            { workingBranch: '' },
          ],
        };

  const externalEmployees = getExternalEmployeesNonBlocking();
  const filteredExternal = filterExternalByBranch(
    externalEmployees,
    allowedLocCodes,
    isGlobalAdmin
  );

  const localUsers = await User.find(localUsersQuery).select(USER_FIELDS).lean();
  const localUsersByEmpId = new Map(localUsers.map((u) => [String(u.empID).toLowerCase(), u]));
  const allUserIds = localUsers.map((u) => u._id);

  const allTrainingProgress = allUserIds.length
    ? await TrainingProgress.find({ userId: { $in: allUserIds } })
        .select(PROGRESS_FIELDS)
        .lean()
    : [];

  const trainingProgressMap = new Map();
  allTrainingProgress.forEach((p) => {
    const key = p.userId.toString();
    if (!trainingProgressMap.has(key)) trainingProgressMap.set(key, []);
    trainingProgressMap.get(key).push(p);
  });

  const employeeDataMap = new Map();

  for (const emp of filteredExternal) {
    if (!emp.emp_code) continue;
    const lowerEmpCode = String(emp.emp_code).toLowerCase();
    employeeDataMap.set(lowerEmpCode, {
      empID: emp.emp_code,
      username: emp.name || '',
      designation: emp.role_name || '',
      workingBranch: emp.store_name || '',
      email: emp.email || '',
      phoneNumber: emp.phone || '',
      localUser: localUsersByEmpId.get(lowerEmpCode) || null,
    });
  }

  localUsers.forEach((user) => {
    const lowerEmpId = String(user.empID).toLowerCase();
    if (employeeDataMap.has(lowerEmpId)) {
      employeeDataMap.get(lowerEmpId).localUser = user;
      return;
    }
    employeeDataMap.set(lowerEmpId, {
      empID: user.empID,
      username: user.username || '',
      designation: user.designation || '',
      workingBranch: user.workingBranch || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      localUser: user,
    });
  });

  // Fetch all tasks for these users
  const empIDs = Array.from(employeeDataMap.keys());
  const usernames = Array.from(employeeDataMap.values()).map(e => e.username).filter(Boolean);
  const allTasks = allUserIds.length || empIDs.length || usernames.length
    ? await Task.find({
        assignedTo: { $in: [...allUserIds.map(id => id.toString()), ...empIDs, ...usernames] }
      }).lean()
    : [];

  const tasksByAssigneeMap = new Map();
  allTasks.forEach(task => {
    if (task.assignedTo) {
      const assigneeKey = String(task.assignedTo).toLowerCase();
      if (!tasksByAssigneeMap.has(assigneeKey)) {
        tasksByAssigneeMap.set(assigneeKey, []);
      }
      tasksByAssigneeMap.get(assigneeKey).push(task);
    }
  });

  const processedEmployees = [];

  for (const employeeData of employeeDataMap.values()) {
    const localUser = employeeData.localUser;
    const userProgress = localUser ? (trainingProgressMap.get(localUser._id.toString()) || []) : [];

    let userTasks = [];
    if (localUser) {
      userTasks.push(...(tasksByAssigneeMap.get(localUser._id.toString().toLowerCase()) || []));
      if (localUser.username) {
        userTasks.push(...(tasksByAssigneeMap.get(String(localUser.username).toLowerCase()) || []));
      }
    }
    userTasks.push(...(tasksByAssigneeMap.get(String(employeeData.empID).toLowerCase()) || []));
    if (employeeData.username) {
      userTasks.push(...(tasksByAssigneeMap.get(String(employeeData.username).toLowerCase()) || []));
    }

    // Deduplicate tasks
    const uniqueTasksMap = new Map();
    userTasks.forEach(t => {
      uniqueTasksMap.set(t._id.toString(), t);
    });
    const uniqueTasks = Array.from(uniqueTasksMap.values());

    const stats = buildEmployeeStats(localUser, userProgress, uniqueTasks);

    processedEmployees.push({
      empID: employeeData.empID,
      username: employeeData.username,
      designation: employeeData.designation,
      workingBranch: employeeData.workingBranch,
      email: employeeData.email,
      phoneNumber: employeeData.phoneNumber,
      ...stats,
      isLocalUser: Boolean(localUser),
      hasTrainingData: Boolean(localUser),
    });
  }

  processedEmployees.sort((a, b) => {
    const left = getEmpSortKey(a.empID);
    const right = getEmpSortKey(b.empID);
    if (left.prefix !== right.prefix) return left.prefix.localeCompare(right.prefix);
    if (left.number !== right.number) return left.number - right.number;
    return left.raw.localeCompare(right.raw);
  });

  setProcessedEmployees(cacheKey, processedEmployees);
  return { employees: processedEmployees, isGlobalAdmin, cacheKey };
}

function applyFilters(employees, { search, store, role }) {
  const q = (search || '').trim().toLowerCase();
  const cleanQ = q.replace(/\s+/g, '');
  return employees.filter((e) => {
    const matchSearch =
      !q ||
      [e.username, e.empID, e.workingBranch, e.designation].some((v) => {
        const val = String(v || '').toLowerCase();
        const cleanVal = val.replace(/\s+/g, '');
        return val.includes(q) || cleanVal.includes(cleanQ);
      });
    const isAllStores = e.workingBranch === 'All Stores' || 
                        (e.workingBranch && e.workingBranch.split(',').length > 5);
    const matchStore = !store || store === 'All' || 
                       (!isAllStores && e.workingBranch === store);
    const matchRole = !role || role === 'All' || e.designation === role;
    return matchSearch && matchStore && matchRole;
  });
}

export const getAllEmployeesWithTrainingDetailsV2 = async (req, res) => {
  try {
    const admin = await Admin.findById(req?.admin?.userId).populate('branches');
    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search || '';
    const store = req.query.store || 'All';
    const role = req.query.role || 'All';
    const refresh = req.query.refresh === 'true';

    if (refresh) {
      await refreshExternalEmployees(true);
    }

    const { employees: allEmployees, isGlobalAdmin } = await buildProcessedEmployees(admin);

    const stores = [
      'All',
      ...new Set(allEmployees.map((e) => e.workingBranch).filter(Boolean)),
    ].sort((a, b) => (a === 'All' ? -1 : a.localeCompare(b)));

    const roles = [
      'All',
      ...new Set(allEmployees.map((e) => e.designation).filter(Boolean)),
    ].sort((a, b) => (a === 'All' ? -1 : a.localeCompare(b)));

    const filtered = applyFilters(allEmployees, { search, store, role });
    const totalEmployees = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalEmployees / limit));
    const safePage = Math.min(page, totalPages);
    const data = filtered.slice((safePage - 1) * limit, safePage * limit);

    res.status(200).json({
      success: true,
      message: 'Employee data fetched successfully',
      data,
      totalEmployees,
      page: safePage,
      limit,
      totalPages,
      filters: { stores, roles },
      isGlobalAdmin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee data',
      error: error.message,
    });
  }
};

const assignMandatoryTrainingsToUser = async (user) => {
  try {
    const flatten = (str) => str.toLowerCase().replace(/\s+/g, '');
    const flatDesignation = flatten(user.designation);
    const allTrainings = await Training.find({ Trainingtype: 'Mandatory' }).populate('modules');
    const mandatoryTraining = allTrainings.filter((training) =>
      training.Assignedfor.some((role) => flatten(role) === flatDesignation)
    );
    if (mandatoryTraining.length === 0) return;

    await Promise.all(
      mandatoryTraining.map(async (training) => {
        const existingProgress = await TrainingProgress.findOne({
          userId: user._id,
          trainingId: training._id,
        });
        if (existingProgress) return;

        const deadlineDate = new Date(Date.now() + training.deadline * 24 * 60 * 60 * 1000);
        const trainingProgress = new TrainingProgress({
          userId: user._id,
          trainingName: training.trainingName,
          trainingId: training._id,
          deadline: deadlineDate,
          pass: false,
          modules: training.modules.map((module) => ({
            moduleId: module._id,
            pass: false,
            videos: module.videos.map((video) => ({ videoId: video._id, pass: false })),
          })),
        });
        await trainingProgress.save();
      })
    );
  } catch (error) {
    console.error(`Error assigning mandatory trainings to user ${user.empID}:`, error.message);
  }
};

export const autoSyncEmployees = async (req, res) => {
  try {
    const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';
    const response = await axios.post('https://rootments.in/api/employee_range', {
      startEmpId: 'EMP1',
      endEmpId: 'EMP9999',
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
      },
    });

    const externalEmployees = response.data?.data || [];
    if (externalEmployees.length === 0) {
      return res.status(200).json({ success: true, message: 'External API returned 0 employees. Sync skipped.' });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const extEmp of externalEmployees) {
      try {
        const empID = extEmp.emp_code;
        if (!empID) {
          skippedCount++;
          continue;
        }

        let user = await User.findOne({ empID });
        if (!user) {
          let locCode = extEmp.store_code || '';
          if (!locCode) {
            const nameUpper = (extEmp.store_name || '').toUpperCase();
            locCode = storeNameToLocCode[nameUpper] || '1';
          }

          user = new User({
            username: extEmp.name || '',
            email: extEmp.email || `${empID}@company.com`,
            empID: empID,
            designation: extEmp.role_name || '',
            workingBranch: extEmp.store_name || 'No Store',
            locCode: locCode,
            phoneNumber: extEmp.phone || '',
            source: 'external-sync',
            training: [],
            assignedAssessments: [],
          });

          await user.save();
          createdCount++;
          try {
            await assignMandatoryTrainingsToUser(user);
          } catch {
            /* silent */
          }
        } else {
          let hasChanges = false;
          if (extEmp.name && user.username !== extEmp.name) {
            user.username = extEmp.name;
            hasChanges = true;
          }
          if (extEmp.role_name && user.designation !== extEmp.role_name) {
            user.designation = extEmp.role_name;
            hasChanges = true;
          }
          if (extEmp.store_name && user.workingBranch !== extEmp.store_name) {
            user.workingBranch = extEmp.store_name;
            hasChanges = true;
            let mapped = extEmp.store_code || storeNameToLocCode[extEmp.store_name.toUpperCase()];
            if (mapped) {
              user.locCode = mapped;
              hasChanges = true;
            }
          }
          if (hasChanges) {
            await user.save();
            updatedCount++;
          }
          try {
            const existing = await TrainingProgress.countDocuments({ userId: user._id });
            if (existing === 0) await assignMandatoryTrainingsToUser(user);
          } catch {
            /* silent */
          }
        }
      } catch {
        skippedCount++;
      }
    }

    clearEmployeeCaches();
    await refreshExternalEmployees(true);

    if (res) {
      res.status(200).json({
        success: true,
        message: 'Employee auto-sync completed',
        results: {
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          totalInDatabase: await User.countDocuments(),
          externalApiCount: externalEmployees.length,
        },
      });
    }
  } catch (error) {
    if (res) {
      res.status(500).json({ success: false, message: 'Auto-sync failed', error: error.message });
    } else {
      throw error;
    }
  }
};

export const getAllAppRegisteredEmployees = async (req, res) => {
  try {
    const admin = await Admin.findById(req?.admin?.userId).populate('branches');
    if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim().toLowerCase();
    const store  = req.query.store || 'All';
    const role   = req.query.role  || 'All';

    const allowedLocCodes = admin.branches.map((b) => b.locCode);
    const isGlobalAdmin   = ['super_admin', 'admin', 'hr_admin'].includes(admin.role) || allowedLocCodes.length === 0;

    // ── 1. Build base query (branch-scoped for non-super admins) ──
    // Include legacy/imported users saved from external sync so the employee page
    // can show the full User collection, not just app/admin-created records.
    const appUserSourceQuery = { source: { $in: ['app', 'admin', 'external-sync'] } };
    const baseQuery = isGlobalAdmin
      ? appUserSourceQuery
      : { 
          $and: [
            { 
              $or: [
                { locCode: { $in: allowedLocCodes } },
                { locCode: "All" }
              ] 
            }, 
            appUserSourceQuery
          ] 
        };

    // ── 2. Load all matching users ──
    const allUsers = await User.find(baseQuery)
      .select('empID username designation workingBranch email phoneNumber locCode training assignedAssessments createdAt source')
      .lean();

    // ── 3. Load TrainingProgress for mandatory trainings ──
    const userIds = allUsers.map((u) => u._id);
    const allProgress = userIds.length
      ? await TrainingProgress.find({ userId: { $in: userIds } })
          .select('userId trainingId pass deadline')
          .lean()
      : [];

    const progressMap = new Map();
    allProgress.forEach((p) => {
      const key = p.userId.toString();
      if (!progressMap.has(key)) progressMap.set(key, []);
      progressMap.get(key).push(p);
    });

    // ── 4. Load Tasks for these users ──
    const empIDs = allUsers.map((u) => u.empID).filter(Boolean);
    const usernames = allUsers.map((u) => u.username).filter(Boolean);
    const allTasks = userIds.length || empIDs.length || usernames.length
      ? await Task.find({
          assignedTo: { $in: [...userIds.map(id => id.toString()), ...empIDs, ...usernames] }
        }).lean()
      : [];

    const tasksByAssigneeMap = new Map();
    allTasks.forEach(task => {
      if (task.assignedTo) {
        const assigneeKey = String(task.assignedTo).toLowerCase();
        if (!tasksByAssigneeMap.has(assigneeKey)) {
          tasksByAssigneeMap.set(assigneeKey, []);
        }
        tasksByAssigneeMap.get(assigneeKey).push(task);
      }
    });

    // ── 5. Build enriched employee list ──
    const employees = allUsers.map((user) => {
      const userProgress = progressMap.get(user._id.toString()) || [];
      
      let userTasks = [];
      userTasks.push(...(tasksByAssigneeMap.get(user._id.toString().toLowerCase()) || []));
      if (user.empID) {
        userTasks.push(...(tasksByAssigneeMap.get(String(user.empID).toLowerCase()) || []));
      }
      if (user.username) {
        userTasks.push(...(tasksByAssigneeMap.get(String(user.username).toLowerCase()) || []));
      }

      // Deduplicate tasks
      const uniqueTasksMap = new Map();
      userTasks.forEach(t => {
        uniqueTasksMap.set(t._id.toString(), t);
      });
      const uniqueTasks = Array.from(uniqueTasksMap.values());

      const stats = buildEmployeeStats(user, userProgress, uniqueTasks);

      return {
        empID:      user.empID,
        username:   user.username,
        designation: user.designation,
        workingBranch: user.workingBranch,
        email:      user.email,
        phoneNumber: user.phoneNumber,
        locCode:    user.locCode,
        joinedAt:   user.createdAt,
        ...stats,
      };
    });

    // ── 6. Apply search / store / role filters ──
    const cleanSearch = search.replace(/\s+/g, '');
    const filtered = employees.filter((e) => {
      const matchSearch = !search || [e.username, e.empID, e.workingBranch, e.designation, e.email]
        .some((v) => {
          const val = String(v || '').toLowerCase();
          const cleanVal = val.replace(/\s+/g, '');
          return val.includes(search) || cleanVal.includes(cleanSearch);
        });
      const isAllStores = e.workingBranch === 'All Stores' || 
                          (e.workingBranch && e.workingBranch.split(',').length > 5);
      const matchStore = store === 'All' || 
                         (!isAllStores && (
                           e.workingBranch === store || 
                           String(e.workingBranch || '').split(', ').includes(store)
                         ));
      const matchRole  = role  === 'All' || e.designation   === role;
      return matchSearch && matchStore && matchRole;
    });

    // Sort by empID numerically (e.g., emp01, Emp02, Emp545)
    filtered.sort((a, b) => {
      const numA = parseInt(String(a.empID || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.empID || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });


    // ── 7. Build filter options ──
    const individualStoresList = [];
    employees.forEach(e => {
      if (e.workingBranch === 'All Stores') {
        individualStoresList.push('All Stores');
      } else if (e.workingBranch) {
        String(e.workingBranch).split(', ').forEach(s => {
          if (s) individualStoresList.push(s);
        });
      }
    });
    const stores = ['All', ...new Set(individualStoresList)].sort((a, b) => a === 'All' ? -1 : a.localeCompare(b));
    const roles  = ['All', ...new Set(employees.map((e) => e.designation).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : a.localeCompare(b));

    // ── 8. Paginate ──
    const totalEmployees = filtered.length;
    const totalPages     = Math.max(1, Math.ceil(totalEmployees / limit));
    const safePage       = Math.min(page, totalPages);
    const data           = filtered.slice((safePage - 1) * limit, safePage * limit);

    res.status(200).json({
      success: true,
      message: 'App-registered employees fetched successfully',
      data,
      totalEmployees,
      page: safePage,
      limit,
      totalPages,
      filters: { stores, roles },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app-registered employees',
      error: error.message,
    });
  }
};

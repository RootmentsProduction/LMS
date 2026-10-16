import mongoose from 'mongoose';
import User from '../model/User.js';
import Admin from '../model/Admin.js';
import Employee from '../model/Employee.js';
import Branch from '../model/Branch.js';
import Cluster from '../model/Cluster.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import AssessmentProcess from '../model/Assessmentprocessschema.js';
import Task from '../model/Task.js';
import Walkin from '../model/Walkin.js';
import WalkinCount from '../model/WalkinCount.js';
import WalkinCameraCheck from '../model/WalkinCameraCheck.js';
import BranchAudit from '../model/BranchAudit.js';
import StaffPerformance from '../model/StaffPerformance.js';
import StoreTarget from '../model/StoreTarget.js';
import DapprAttribution from '../model/DapprAttribution.js';
import CustomizationAttribution from '../model/CustomizationAttribution.js';
import UserLoginSession from '../model/UserLoginSession.js';
import GoogleReviewEntry from '../model/GoogleReviewEntry.js';
import Escalation from '../model/Escalation.js';
import { normalizeStoreKey } from '../routes/StoreTargetRoute.js';

/**
 * Escapes characters for regex matching safely.
 */
function escapeRegex(text) {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * GET /api/external/employee-overview
 * Query params:
 *   - empId   : Employee ID (e.g. "emp8899", "EMP101")
 *   - userId  : User or Admin MongoDB ObjectId
 *   - email   : Email address of user/admin/employee
 */
export const getExternalEmployeeOverview = async (req, res) => {
  try {
    const { empId, userId, email } = req.query;

    if (!empId && !userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one identifier query param is required: empId, userId, or email',
      });
    }

    const trimmedEmpId = empId ? String(empId).trim() : null;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const validObjectId = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    // 1. Find User document
    let userQuery = [];
    if (validObjectId) userQuery.push({ _id: validObjectId });
    if (trimmedEmpId) userQuery.push({ empID: { $regex: `^${escapeRegex(trimmedEmpId)}$`, $options: 'i' } });
    if (trimmedEmail) userQuery.push({ email: { $regex: `^${escapeRegex(trimmedEmail)}$`, $options: 'i' } });

    const userDoc = userQuery.length > 0 ? await User.findOne({ $or: userQuery }).lean() : null;

    // 2. Find Admin document
    let adminQuery = [];
    if (validObjectId) adminQuery.push({ _id: validObjectId });
    if (trimmedEmpId) {
      adminQuery.push({ EmpId: { $regex: `^${escapeRegex(trimmedEmpId)}$`, $options: 'i' } });
      adminQuery.push({ employeeId: { $regex: `^${escapeRegex(trimmedEmpId)}$`, $options: 'i' } });
    }
    if (trimmedEmail) adminQuery.push({ email: { $regex: `^${escapeRegex(trimmedEmail)}$`, $options: 'i' } });
    if (userDoc?.empID) {
      adminQuery.push({ EmpId: { $regex: `^${escapeRegex(userDoc.empID)}$`, $options: 'i' } });
    }

    const adminDoc = adminQuery.length > 0
      ? await Admin.findOne({ $or: adminQuery })
          .populate('branches', 'locCode workingBranch location address manager')
          .populate('assignedClusters', 'name')
          .lean()
      : null;

    // 3. Find Employee document from employeedata collection
    let empDataQuery = [];
    if (trimmedEmpId) empDataQuery.push({ employeeId: { $regex: `^${escapeRegex(trimmedEmpId)}$`, $options: 'i' } });
    if (trimmedEmail) empDataQuery.push({ email: { $regex: `^${escapeRegex(trimmedEmail)}$`, $options: 'i' } });
    if (userDoc?._id) empDataQuery.push({ userId: userDoc._id });
    if (userDoc?.empID) empDataQuery.push({ employeeId: { $regex: `^${escapeRegex(userDoc.empID)}$`, $options: 'i' } });

    const employeeRecord = empDataQuery.length > 0
      ? await Employee.findOne({ $or: empDataQuery }).populate('storeId').lean()
      : null;

    if (!userDoc && !adminDoc && !employeeRecord) {
      return res.status(404).json({
        success: false,
        message: 'No employee record found for the provided identifier(s).',
      });
    }

    // Consolidated identifiers & names
    const resolvedUserId = userDoc?._id || adminDoc?._id || employeeRecord?.userId || null;
    const resolvedEmpId = userDoc?.empID || adminDoc?.EmpId || adminDoc?.employeeId || employeeRecord?.employeeId || trimmedEmpId;
    const resolvedName = userDoc?.username || adminDoc?.name || (employeeRecord ? `${employeeRecord.firstName} ${employeeRecord.lastName}`.trim() : '');
    const resolvedEmail = userDoc?.email || adminDoc?.email || employeeRecord?.email || '';
    const resolvedLocCode = userDoc?.locCode || (adminDoc?.branches?.[0]?.locCode) || employeeRecord?.storeId?.locCode || '';
    const resolvedWorkingBranch = userDoc?.workingBranch || (adminDoc?.branches?.[0]?.workingBranch) || employeeRecord?.storeId?.workingBranch || '';

    // 4. Branch details
    let branchInfo = null;
    if (adminDoc?.branches && adminDoc.branches.length > 0) {
      branchInfo = adminDoc.branches;
    } else if (resolvedLocCode || resolvedWorkingBranch) {
      const branchConditions = [];
      if (resolvedLocCode) branchConditions.push({ locCode: String(resolvedLocCode) });
      if (resolvedWorkingBranch) branchConditions.push({ workingBranch: { $regex: `^${escapeRegex(resolvedWorkingBranch)}$`, $options: 'i' } });
      branchInfo = await Branch.find({ $or: branchConditions }).populate('clusterId', 'name').lean();
    }

    // 5. Gather Training Progress
    let trainingProgressList = [];
    if (resolvedUserId) {
      trainingProgressList = await TrainingProgress.find({ userId: resolvedUserId })
        .populate('trainingId', 'trainingName description category status')
        .populate('modules.moduleId', 'moduleName description videos')
        .lean();
    }

    // 6. Gather Assessment Process Attempts
    let assessmentAttempts = [];
    if (resolvedUserId) {
      assessmentAttempts = await AssessmentProcess.find({ userId: resolvedUserId })
        .populate('assessmentId', 'assessmentName description passingMarks totalMarks')
        .lean();
    }

    // 7. Assigned Tasks & Created Tasks
    const taskAssigneeFilters = [];
    if (resolvedUserId) taskAssigneeFilters.push(String(resolvedUserId));
    if (resolvedEmpId) taskAssigneeFilters.push(String(resolvedEmpId));
    if (resolvedName) taskAssigneeFilters.push(resolvedName);

    const [assignedTasks, createdTasks] = await Promise.all([
      Task.find({
        $or: [
          { assignedTo: { $in: taskAssigneeFilters } },
          { 'workMap.assignedTo': { $in: taskAssigneeFilters } },
        ],
      })
        .select('-attachment -reviewAttachment -attachments')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      adminDoc?._id
        ? Task.find({ createdBy: adminDoc._id })
            .select('-attachment -reviewAttachment -attachments')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
        : [],
    ]);

    // 8. Walk-in Leads handled by this staff
    const staffNameRegexes = [];
    if (resolvedName) staffNameRegexes.push(new RegExp(`^${escapeRegex(resolvedName)}$`, 'i'));
    if (resolvedEmpId) staffNameRegexes.push(new RegExp(escapeRegex(resolvedEmpId), 'i'));

    const walkinsHandled = staffNameRegexes.length > 0
      ? await Walkin.find({ staff: { $in: staffNameRegexes } })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
      : [];

    // 9. Staff Performance Reviews
    const performanceReviews = await StaffPerformance.find({
      $or: [
        ...(resolvedEmpId ? [{ empID: { $regex: `^${escapeRegex(resolvedEmpId)}$`, $options: 'i' } }] : []),
        ...(resolvedName ? [{ staffName: { $regex: `^${escapeRegex(resolvedName)}$`, $options: 'i' } }] : []),
      ],
    })
      .populate('managerId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // 10. Attributions (Dappr & Customization)
    const [dapprDocs, customizationDocs] = await Promise.all([
      DapprAttribution.find({
        'attributions.staffName': { $regex: `^${escapeRegex(resolvedName)}$`, $options: 'i' },
      }).lean(),
      CustomizationAttribution.find({
        'attributions.staffName': { $regex: `^${escapeRegex(resolvedName)}$`, $options: 'i' },
      }).lean(),
    ]);

    const employeeDapprAttributions = dapprDocs.map((doc) => ({
      storeName: doc.storeName,
      month: doc.month,
      year: doc.year,
      week: doc.week,
      attribution: doc.attributions.find(
        (a) => a.staffName.toLowerCase() === resolvedName.toLowerCase()
      ) || null,
    }));

    const employeeCustomizationAttributions = customizationDocs.map((doc) => ({
      storeName: doc.storeName,
      date: doc.date,
      month: doc.month,
      year: doc.year,
      week: doc.week,
      attribution: doc.attributions.find(
        (a) => a.staffName.toLowerCase() === resolvedName.toLowerCase()
      ) || null,
    }));

    // 11. Target breakdown for this employee
    const storeTargets = await StoreTarget.find({
      'employeeTargets.staffName': { $regex: `^${escapeRegex(resolvedName)}$`, $options: 'i' },
    }).lean();

    const employeeTargets = storeTargets.map((st) => ({
      storeName: st.storeName,
      month: st.month,
      year: st.year,
      weekRanges: st.weekRanges,
      targets: st.employeeTargets.find(
        (et) => et.staffName.toLowerCase() === resolvedName.toLowerCase()
      ) || null,
    }));

    // 12. Recent User Login Sessions
    const loginSessions = resolvedUserId
      ? await UserLoginSession.find({ userId: resolvedUserId })
          .sort({ loginTime: -1 })
          .limit(25)
          .lean()
      : [];

    // 13. Escalations
    const escalations = resolvedUserId
      ? await Escalation.find({ toUser: resolvedUserId }).sort({ deadline: -1 }).lean()
      : [];

    // Construct unified profile payload (removing sensitive hash passwords)
    const safeUser = userDoc ? { ...userDoc } : null;
    if (safeUser) delete safeUser.password;

    const safeAdmin = adminDoc ? { ...adminDoc } : null;
    if (safeAdmin) delete safeAdmin.password;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          empId: resolvedEmpId,
          name: resolvedName,
          email: resolvedEmail,
          designation: userDoc?.designation || adminDoc?.role || employeeRecord?.designation || '',
          workingBranch: resolvedWorkingBranch,
          locCode: resolvedLocCode,
          registrationStatus: userDoc?.registrationStatus || adminDoc?.registrationStatus || 'approved',
          source: userDoc?.source || 'app',
          isSystemAdmin: Boolean(adminDoc),
        },
        profile: {
          user: safeUser,
          admin: safeAdmin,
          employeeRecord: employeeRecord,
        },
        branches: branchInfo,
        learning: {
          assignedModules: userDoc?.assignedModules || [],
          assignedAssessments: userDoc?.assignedAssessments || [],
          assignedTrainings: userDoc?.training || [],
          trainingProgress: trainingProgressList,
          assessmentAttempts: assessmentAttempts,
        },
        tasks: {
          assignedTasksCount: assignedTasks.length,
          assignedTasks,
          createdTasksCount: createdTasks.length,
          createdTasks,
        },
        operations: {
          walkinsHandledCount: walkinsHandled.length,
          walkinsHandled,
          performanceReviews,
          escalations,
        },
        salesAttributions: {
          targets: employeeTargets,
          dappr: employeeDapprAttributions,
          customization: employeeCustomizationAttributions,
        },
        securityAndSessions: {
          recentLogins: loginSessions,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in getExternalEmployeeOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve comprehensive employee overview',
      error: error.message,
    });
  }
};

/**
 * GET /api/external/store-overview
 * Query params:
 *   - locCode   : Branch location code (e.g. "3", "102")
 *   - storeName : Branch name / workingBranch (e.g. "Suitor Guy Edappally", "Z-Edappally1")
 *   - branchId  : MongoDB ObjectId of Branch
 */
export const getExternalStoreOverview = async (req, res) => {
  try {
    const { locCode, storeName, branchId } = req.query;

    if (!locCode && !storeName && !branchId) {
      return res.status(400).json({
        success: false,
        message: 'At least one identifier query param is required: locCode, storeName, or branchId',
      });
    }

    const trimmedLocCode = locCode ? String(locCode).trim() : null;
    const trimmedStoreName = storeName ? String(storeName).trim() : null;
    const validBranchId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : null;

    // 1. Find the Branch
    let branchQuery = [];
    if (validBranchId) branchQuery.push({ _id: validBranchId });
    if (trimmedLocCode) branchQuery.push({ locCode: trimmedLocCode });
    if (trimmedStoreName) {
      branchQuery.push({ workingBranch: { $regex: `^${escapeRegex(trimmedStoreName)}$`, $options: 'i' } });
      branchQuery.push({ location: { $regex: `^${escapeRegex(trimmedStoreName)}$`, $options: 'i' } });
    }

    const branchDoc = await Branch.findOne({ $or: branchQuery })
      .populate('clusterId', 'name')
      .lean();

    if (!branchDoc && !trimmedStoreName && !trimmedLocCode) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found for the provided identifier(s).',
      });
    }

    const resolvedBranchId = branchDoc?._id || null;
    const resolvedLocCode = branchDoc?.locCode || trimmedLocCode;
    const resolvedWorkingBranch = branchDoc?.workingBranch || trimmedStoreName;

    // Build branch matching regex and name aliases (handles "Z-Edappally1", "Suitor Guy Edappally", "G-Edappally", etc.)
    const nameRegex = resolvedWorkingBranch ? new RegExp(escapeRegex(resolvedWorkingBranch), 'i') : null;

    // 2. Fetch Users assigned to this store
    const userConditions = [];
    if (resolvedLocCode) userConditions.push({ locCode: resolvedLocCode });
    if (nameRegex) userConditions.push({ workingBranch: nameRegex });

    const storeUsers = userConditions.length > 0
      ? await User.find({ $or: userConditions }, '-password').lean()
      : [];

    // 3. Fetch Admins assigned to this branch
    const adminConditions = [];
    if (resolvedBranchId) adminConditions.push({ branches: resolvedBranchId });

    const storeAdmins = adminConditions.length > 0
      ? await Admin.find({ $or: adminConditions }, '-password')
          .populate('assignedClusters', 'name')
          .lean()
      : [];

    // 4. Fetch Employees in employeedata collection
    const empConditions = [];
    if (resolvedBranchId) empConditions.push({ storeId: resolvedBranchId });

    const storeEmployees = empConditions.length > 0
      ? await Employee.find({ $or: empConditions }).lean()
      : [];

    // 5. Store Targets (MTD, WTD, and individual staff targets)
    const targetConditions = [];
    if (nameRegex) targetConditions.push({ storeName: nameRegex });
    targetConditions.push({ storeName: 'All' });

    const storeTargets = await StoreTarget.find({ $or: targetConditions })
      .sort({ year: -1, month: -1 })
      .limit(12)
      .lean();

    // 6. Sales Attributions (Dappr and Customization)
    const [dapprAttributions, customizationAttributions] = await Promise.all([
      nameRegex
        ? DapprAttribution.find({ storeName: nameRegex }).sort({ year: -1, month: -1, week: -1 }).limit(10).lean()
        : [],
      nameRegex
        ? CustomizationAttribution.find({ storeName: nameRegex }).sort({ year: -1, month: -1, week: -1 }).limit(10).lean()
        : [],
    ]);

    // 7. Walk-in Leads for this store
    const walkinConditions = [];
    if (nameRegex) walkinConditions.push({ store: nameRegex });

    const [recentWalkins, totalWalkinsCount] = await Promise.all([
      walkinConditions.length > 0
        ? Walkin.find({ $or: walkinConditions }).sort({ createdAt: -1 }).limit(100).lean()
        : [],
      walkinConditions.length > 0
        ? Walkin.countDocuments({ $or: walkinConditions })
        : 0,
    ]);

    // 8. Camera Checks & Walkin Counts
    const cameraCheckConditions = [];
    if (resolvedBranchId) cameraCheckConditions.push({ storeId: resolvedBranchId });
    if (nameRegex) cameraCheckConditions.push({ store: nameRegex });

    const [cameraAudits, walkinCounts] = await Promise.all([
      cameraCheckConditions.length > 0
        ? WalkinCameraCheck.find({ $or: cameraCheckConditions }).sort({ date: -1 }).limit(30).lean()
        : [],
      cameraCheckConditions.length > 0
        ? WalkinCount.find({ $or: cameraCheckConditions }).sort({ date: -1 }).limit(30).lean()
        : [],
    ]);

    // 9. Branch Inspection Audits
    const auditConditions = [];
    if (resolvedBranchId) auditConditions.push({ storeId: resolvedBranchId });
    if (nameRegex) auditConditions.push({ store: nameRegex });

    const branchAudits = auditConditions.length > 0
      ? await BranchAudit.find({ $or: auditConditions }).sort({ createdAt: -1 }).limit(20).lean()
      : [];

    // 10. Store Tasks
    const taskConditions = [];
    if (resolvedLocCode) taskConditions.push({ storeCode: resolvedLocCode });
    if (nameRegex) taskConditions.push({ storeName: nameRegex });

    const storeTasks = taskConditions.length > 0
      ? await Task.find({ $or: taskConditions })
          .select('-attachment -reviewAttachment -attachments')
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
      : [];

    // 11. Google Reviews logged for this store
    const googleReviewConditions = [];
    if (resolvedBranchId) googleReviewConditions.push({ branchId: resolvedBranchId });
    if (nameRegex) googleReviewConditions.push({ branchName: nameRegex });

    const googleReviews = googleReviewConditions.length > 0
      ? await GoogleReviewEntry.find({ $or: googleReviewConditions }).sort({ date: -1 }).limit(30).lean()
      : [];

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          branchId: resolvedBranchId,
          locCode: resolvedLocCode,
          workingBranch: resolvedWorkingBranch,
          location: branchDoc?.location || '',
          manager: branchDoc?.manager || '',
          phoneNumber: branchDoc?.phoneNumber || '',
          cluster: branchDoc?.clusterId?.name || null,
          isActive: branchDoc?.isActive ?? true,
          totalStaffCount: storeUsers.length + storeAdmins.length,
          totalWalkinsLogged: totalWalkinsCount,
        },
        branch: branchDoc,
        staff: {
          totalUsers: storeUsers.length,
          users: storeUsers,
          totalAdmins: storeAdmins.length,
          admins: storeAdmins,
          totalEmployeeRecords: storeEmployees.length,
          employees: storeEmployees,
        },
        targets: storeTargets,
        attributions: {
          dappr: dapprAttributions,
          customization: customizationAttributions,
        },
        operations: {
          recentWalkins,
          totalWalkinsCount,
          cameraAudits,
          walkinCounts,
          branchAudits,
          storeTasks,
          googleReviews,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in getExternalStoreOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve comprehensive store overview',
      error: error.message,
    });
  }
};

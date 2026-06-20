import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Task from '../model/Task.js';
import Admin from '../model/Admin.js';
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Branch from '../model/Branch.js';
import { getAccessibleEmployeeIds, getAccessibleStoreIds, isFullAccessAdmin, validateEmployeeAccess } from '../lib/permissions.js';
import { sendNotification } from '../utils/notificationHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveAssigneeId = async (assignedTo) => {
  if (!assignedTo) return null;

  // 1. If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(assignedTo)) {
    return assignedTo.toString();
  }

  // 2. If it is a group selection key, return it
  if (['all_employees', 'all_store_admins', 'all_cluster_admins', 'all_hr_admins'].includes(assignedTo)) {
    return assignedTo;
  }

  // Support group labels
  if (assignedTo.toLowerCase() === 'all employees') return 'all_employees';
  if (assignedTo.toLowerCase() === 'all store admins') return 'all_store_admins';
  if (assignedTo.toLowerCase() === 'all cluster admins') return 'all_cluster_admins';
  if (assignedTo.toLowerCase() === 'all hr admins') return 'all_hr_admins';

  // 3. Parse formatted label, e.g. "Test Staff 1 - Fashion Stylist - G-Edappally"
  const parts = assignedTo.split(' - ');
  const namePart = parts[0]?.trim();
  if (!namePart) return assignedTo;

  // Search Admin
  const admin = await Admin.findOne({ name: { $regex: new RegExp('^' + namePart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (admin) return admin._id.toString();

  // Search User
  const user = await User.findOne({ username: { $regex: new RegExp('^' + namePart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (user) return user._id.toString();

  // Search Employee (check firstName + lastName, or username)
  const employees = await Employee.find({});
  for (const emp of employees) {
    const fullName = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || '');
    if (fullName.toLowerCase() === namePart.toLowerCase()) {
      return emp._id.toString();
    }
  }

  return assignedTo;
};

const ASSIGNED_TO_LABELS = {
  store_admin: 'Store Admin',
  cluster_admin: 'Cluster Admin',
  all_stores: 'All Stores',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  cluster_admin: 'Cluster Admin',
  store_admin: 'Store Admin',
};

/** Map form priority to table display priority */
const normalizePriority = (p) => {
  const map = { Urgent: 'High', High: 'High', Normal: 'Medium', Low: 'Low', Medium: 'Medium', Not: 'Not' };
  return map[p] || p;
};

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

const formatDisplayDate = (dateStr) => {
  const d = parseDateParts(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDetailDate = (dateStr) => {
  const d = dateStr instanceof Date
    ? dateStr
    : parseDateParts(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const isBase64String = (str) => {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.replace(/[\s]/g, '');
  if (cleaned.startsWith('data:')) return true;
  if (cleaned.length < 100) return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(cleaned);
};

const getMimeTypeFromBase64 = (base64Str) => {
  if (base64Str.startsWith('/9j/')) return 'image/jpeg';
  if (base64Str.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64Str.startsWith('R0lGODlh')) return 'image/gif';
  if (base64Str.startsWith('JVBERi0')) return 'application/pdf';
  if (base64Str.startsWith('UESDBBQ')) return 'application/zip';
  return 'application/octet-stream';
};

const normalizeAttachmentToDataUri = (str) => {
  if (!str) return '';
  const cleaned = str.replace(/[\s]/g, '');
  if (cleaned.startsWith('data:')) return cleaned;
  if (isBase64String(cleaned)) {
    const mime = getMimeTypeFromBase64(cleaned);
    return `data:${mime};base64,${cleaned}`;
  }
  return str;
};

const mapTaskForClient = (doc, overrideBranch) => {
  const task = doc.toObject ? doc.toObject() : doc;
  const status = computeStatus(task);
  const priority = normalizePriority(task.priority);
  const taskId = task.taskCode || task._id?.toString();

  let attachmentVal = task.attachment || '';
  attachmentVal = normalizeAttachmentToDataUri(attachmentVal);
  if (attachmentVal.startsWith('data:')) {
    attachmentVal = `/api/task/${taskId}/attachment`;
  }

  let reviewAttachmentVal = task.reviewAttachment || '';
  reviewAttachmentVal = normalizeAttachmentToDataUri(reviewAttachmentVal);
  if (reviewAttachmentVal.startsWith('data:')) {
    reviewAttachmentVal = `/api/task/${taskId}/review-attachment`;
  }

  return {
    id: taskId,
    _id: task._id?.toString(),
    title: task.title,
    category: task.category,
    categorySub: task.storeName || task.storeCode || task.subCategory,
    categoryDetail: task.subCategory,
    assignedTo: task.assignedTo,
    createdBy: task.createdBy?.toString() || '',
    assignee: task.assignedToLabel || ASSIGNED_TO_LABELS[task.assignedTo] || task.assignedTo,
    assigneeSub: overrideBranch ?? task.storeName ?? task.storeCode ?? '—',
    assigneeRole: task.assignedToLabel || ASSIGNED_TO_LABELS[task.assignedTo] || task.assignedTo,
    priority,
    startDate: formatDisplayDate(task.startDate),
    startTime: task.startTime || '—',
    endDate: task.endDate ? formatDisplayDate(task.endDate) : '—',
    endTime: task.endTime || '—',
    description: task.description?.trim() || '—',
    status,
    assignedBy: task.assignedByName || '—',
    assignedByRole: task.assignedByRole || '—',
    assignedDate: formatDetailDate(task.createdAt ? new Date(task.createdAt) : task.startDate),
    assignedTime: task.startTime || '—',
    startDateDetail: formatDetailDate(task.startDate),
    endDateDetail: task.endDate ? formatDetailDate(task.endDate) : '—',
    mode: task.mode,
    additionalInfo: task.additionalInfo,
    attachment: attachmentVal,
    attachmentName: task.attachmentName || '',
    reviewAttachment: reviewAttachmentVal,
    reviewAttachmentName: task.reviewAttachmentName || '',
    requestedExtensionDate: task.requestedExtensionDate || '',
    previousStatus: task.previousStatus || '',
    workMap: (() => {
      const list = task.workMap || [];
      const filtered = [];
      let lastAssignee = null;
      for (const step of list) {
        if (step.action !== 'ASSIGNED' && step.action !== 'REASSIGNED' && step.action !== 'COMPLETED' && step.action !== 'EXTENSION REQUESTED' && step.action !== 'EXTENSION APPROVED' && step.action !== 'EXTENSION REJECTED') {
          continue;
        }
        if (step.action === 'ASSIGNED') {
          filtered.push(step);
          lastAssignee = step.assignedTo;
        } else if (step.action === 'REASSIGNED') {
          if (step.assignedTo && lastAssignee && String(step.assignedTo) !== String(lastAssignee)) {
            filtered.push(step);
            lastAssignee = step.assignedTo;
          }
        } else if (step.action === 'COMPLETED' || step.action === 'EXTENSION REQUESTED' || step.action === 'EXTENSION APPROVED' || step.action === 'EXTENSION REJECTED') {
          filtered.push(step);
        }
      }
      return filtered;
    })(),
    createdAt: task.createdAt,
  };
};

const nextTaskCode = async () => {
  const count = await Task.countDocuments();
  return `TSK-${String(count + 1).padStart(3, '0')}`;
};

export const createTask = async (req, res) => {
  try {
    let creator = await Admin.findById(req.admin.userId).populate('branches');
    let isCreatorAdmin = true;
    if (!creator) {
      creator = await User.findById(req.admin.userId);
      isCreatorAdmin = false;
      if (!creator) {
        return res.status(404).json({ success: false, message: 'Creator not found' });
      }
    }

    const {
      title,
      category,
      subCategory,
      assignedTo,
      assignedToLabel,
      mode = 'task',
      startDate,
      startTime = '',
      endDate = '',
      endTime = '',
      description = '',
      additionalInfo = '',
      priority = 'Normal',
      fileAttachment,
    } = req.body;

    if (!title || !category || !subCategory || !assignedTo || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'title, category, subCategory, assignedTo, and startDate are required',
      });
    }

    // Resolve assignedTo string to proper ObjectID if needed (e.g. from Flutter label)
    const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
    const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : assignedToLabel;

    let attachment = '';
    let attachmentName = '';
    if (fileAttachment && fileAttachment.base64) {
      attachment = fileAttachment.base64;
      attachmentName = fileAttachment.name;
    }

    const branch = isCreatorAdmin ? creator.branches?.[0] : null;
    let storeName = '';
    let storeCode = '';

    if (isCreatorAdmin) {
      storeName = branch?.workingBranch || '';
      storeCode = branch?.locCode ? `Z-${branch.locCode}` : '';
    } else {
      storeName = creator.workingBranch || '';
      storeCode = creator.locCode ? (Array.isArray(creator.locCode) ? `Z-${creator.locCode[0]}` : `Z-${creator.locCode}`) : '';
    }

    const roleLabel = isCreatorAdmin ? (ROLE_LABELS[creator.role] || creator.role) : 'Staff';
    const subRole = isCreatorAdmin && creator.subRole && creator.subRole !== 'NR' ? creator.subRole : '';

    // Resolve all target assignees
    const targets = [];

    if (resolvedAssignedTo === 'all_employees') {
      const storeIds = await getAccessibleStoreIds(creator._id);
      let employeeIds = await getAccessibleEmployeeIds(creator._id);
      
      const dbEmployees = await Employee.find({ _id: { $in: employeeIds }, storeId: { $in: storeIds }, status: 'Active' }).populate('storeId');
      const branchesList = await Branch.find({ _id: { $in: storeIds } });
      const locCodes = branchesList.map(b => b.locCode);
      const users = await User.find({ locCode: { $in: locCodes } }).lean();

      const combinedList = [];
      dbEmployees.forEach(emp => {
        const name = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || 'Employee');
        const designation = emp.designation || 'Staff';
        const storeNameVal = (emp.storeId && emp.storeId.workingBranch) || emp.workingBranch || 'Store';
        combinedList.push({
          id: emp._id.toString(),
          label: `${name} - ${designation} - ${storeNameVal}`
        });
      });
      users.forEach(u => {
        if (!combinedList.some(item => item.id === u._id.toString())) {
          combinedList.push({
            id: u._id.toString(),
            label: `${u.username || 'Employee'} - ${u.designation || 'Staff'} - ${u.workingBranch || 'Store'}`
          });
        }
      });

      targets.push(...combinedList);
    } 
    else if (resolvedAssignedTo === 'all_store_admins') {
      const storeIds = await getAccessibleStoreIds(creator._id);
      const adminQuery = { role: 'store_admin', branches: { $in: storeIds }, isActive: true };
      const adminsList = await Admin.find(adminQuery).populate('branches');
      adminsList.forEach(ad => {
        const storeNameVal = ad.branches?.[0]?.workingBranch || 'Store';
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - Store Admin - ${storeNameVal}`
        });
      });
    }
    else if (resolvedAssignedTo === 'all_cluster_admins') {
      const adminsList = await Admin.find({ role: 'cluster_admin', isActive: true });
      adminsList.forEach(ad => {
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - Cluster Admin - Cluster`
        });
      });
    }
    else if (resolvedAssignedTo === 'all_hr_admins') {
      const adminsList = await Admin.find({ role: 'hr_admin', isActive: true });
      adminsList.forEach(ad => {
        targets.push({
          id: ad._id.toString(),
          label: `${ad.name} - HR Admin - Admin`
        });
      });
    }
    else {
      targets.push({
        id: resolvedAssignedTo,
        label: resolvedAssignedToLabel || ASSIGNED_TO_LABELS[resolvedAssignedTo] || resolvedAssignedTo
      });
    }

    if (targets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No employees or admins match this group selection',
      });
    }

    const createdTasks = [];
    const baseTaskCode = await nextTaskCode();
    let index = 0;

    for (const target of targets) {
      const taskCode = targets.length > 1
        ? `${baseTaskCode}-${index + 1}`
        : baseTaskCode;

      // Resolve store for individual assignee dynamically
      let targetStoreName = '';
      let targetStoreCode = '';
      try {
        const targetAdmin = await Admin.findById(target.id).populate('branches');
        if (targetAdmin) {
          if (['super_admin', 'admin', 'hr_admin'].includes(targetAdmin.role)) {
            targetStoreName = 'Office';
            targetStoreCode = '';
          } else {
            const targetBranch = targetAdmin.branches?.[0];
            targetStoreName = targetBranch?.workingBranch || '';
            targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
          }
        } else {
          const targetUser = await User.findById(target.id);
          if (targetUser) {
            targetStoreName = targetUser.workingBranch || '';
            targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
          }
        }
      } catch (err) {
        console.error('Error resolving target assignee store:', err);
      }

      if (!targetStoreName && !targetStoreCode) {
        targetStoreName = storeName;
        targetStoreCode = storeCode;
      }

      const task = await Task.create({
        taskCode,
        title: title.trim(),
        category: category.trim(),
        subCategory: subCategory.trim(),
        assignedTo: target.id,
        assignedToLabel: target.label,
        mode,
        startDate,
        startTime,
        endDate: mode === 'auto' ? startDate : endDate,
        endTime: mode === 'auto' ? startTime : endTime,
        description,
        additionalInfo,
        priority,
        status: 'PENDING',
        storeName: targetStoreName,
        storeCode: targetStoreCode,
        createdBy: creator._id,
        assignedByName: isCreatorAdmin ? creator.name : creator.username,
        assignedByRole: subRole ? `${roleLabel} · ${subRole}` : roleLabel,
        attachment,
        attachmentName,
        workMap: [{
          assignedTo: target.id,
          assignedToLabel: target.label,
          assignedBy: isCreatorAdmin ? creator.name : creator.username,
          assignedAt: new Date(),
          action: 'ASSIGNED'
        }],
      });
      createdTasks.push(task);
      
      // Send notification to the assignee
      const creatorName = isCreatorAdmin ? creator.name : creator.username;
      await sendNotification({
        title: 'New Task Assigned',
        body: `You have been assigned a new task: "${title.trim()}" by ${creatorName}`,
        userIds: [target.id],
        senderName: creatorName,
        category: 'Task'
      });

      index++;
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: mapTaskForClient(createdTasks[0]),
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message,
    });
  }
};

import { buildTaskFilter } from '../lib/permissions.js';

export const getTasks = async (req, res) => {
  try {
    const adminId = req.admin.userId;
    const { search, category, priority, status, storeId, employeeId, mine, mobile } = req.query;
    
    // 1. Build Base Query
    let baseQuery = {};
    if (storeId) {
        baseQuery.storeCode = storeId;
    }
    if (employeeId) {
      // 1. Determine caller identity and role
      const callerAdmin = await Admin.findById(adminId);
      if (callerAdmin) {
        // If they are not full access (Super/HR Admin), validate they have store/cluster access to this employee
        if (!isFullAccessAdmin(callerAdmin.role)) {
          const accessibleStoreIds = await getAccessibleStoreIds(adminId);

          const accessibleEmployees = await Employee.find({
              storeId: { $in: accessibleStoreIds },
              status: 'Active'
          }).select('_id').lean();

          const accessibleBranches = await Branch.find({ _id: { $in: accessibleStoreIds } });
          const locCodes = accessibleBranches.map(b => b.locCode);
          const accessibleUsers = await User.find({ locCode: { $in: locCodes } }).select('_id').lean();

          const accessibleAdmins = await Admin.find({
              branches: { $in: accessibleStoreIds },
              isActive: true
          }).select('_id').lean();

          const accessibleAssigneeIds = [
              ...accessibleEmployees.map(e => e._id.toString()),
              ...accessibleUsers.map(u => u._id.toString()),
              ...accessibleAdmins.map(a => a._id.toString()),
          ];

          if (!accessibleAssigneeIds.includes(employeeId.toString())) {
            return res.status(403).json({ success: false, message: 'Access denied: You do not have access to this employee\'s tasks' });
          }
        }
      } else {
        // Regular user/employee: can only view their own tasks
        const callerUser = await User.findById(adminId);
        if (!callerUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check if the requested employeeId belongs to the caller
        const callerEmployee = await Employee.findOne({
          $or: [
            { email: callerUser.email },
            { contactNo: callerUser.contactNo },
            { username: callerUser.username }
          ]
        });
        const allowedIds = [callerUser._id.toString()];
        if (callerEmployee) {
          allowedIds.push(callerEmployee._id.toString());
        }

        if (!allowedIds.includes(employeeId.toString())) {
          return res.status(403).json({ success: false, message: 'Access denied: You cannot view tasks of other employees' });
        }
      }

      baseQuery.assignedTo = employeeId;
    }
    if (category && category !== 'All') {
      baseQuery.category = { $regex: new RegExp(category, 'i') };
    }
    if (priority && priority !== 'All') {
      baseQuery.priority = priority;
    }
    if (status && status !== 'All') {
      if (status === 'OVERDUE') {
        baseQuery.status = { $nin: ['COMPLETED', 'IN PROGRESS', 'ON HOLD', 'UNDER REVIEW'] };
      } else {
        baseQuery.status = status;
      }
    }

    // 2. Wrap with RBAC Filter
    //    For mobile/flutter app: only show tasks assigned to the user (not tasks they created)
    //    For web: apply normal RBAC filtering
    let secureQuery;
    if (mobile === 'true') {
      // Mobile app: only show tasks assigned to the user (every role admins and employees)
      const assignedIds = [adminId.toString()];
      
      let empID = null;
      
      // Check if caller is Admin
      const adminUser = await Admin.findById(adminId);
      if (adminUser) {
        empID = adminUser.EmpId;
      } else {
        // Check if caller is User
        const user = await User.findById(adminId);
        if (user) {
          empID = user.empID;
        }
      }
      
      if (empID) {
        // Add the raw employee ID string itself
        assignedIds.push(empID.toString());
        
        // Find associated Employee ID
        const employee = await Employee.findOne({
          employeeId: { $regex: `^${empID}$`, $options: 'i' }
        });
        if (employee) {
          assignedIds.push(employee._id.toString());
        }
        
        // Find associated User ID
        const userRecord = await User.findOne({
          empID: { $regex: `^${empID}$`, $options: 'i' }
        });
        if (userRecord) {
          assignedIds.push(userRecord._id.toString());
        }
        
        // Find associated Admin ID
        const adminRecord = await Admin.findOne({
          EmpId: { $regex: `^${empID}$`, $options: 'i' }
        });
        if (adminRecord) {
          assignedIds.push(adminRecord._id.toString());
        }
      }
      
      const uniqueAssignedIds = [...new Set(assignedIds)];
      
      secureQuery = {
        ...baseQuery,
        assignedTo: { $in: uniqueAssignedIds }
      };
    } else if (mine === 'true') {
      secureQuery = {
        ...baseQuery,
        $or: [
          { createdBy: adminId },
          { assignedTo: adminId.toString() },
        ],
      };
    } else {
      secureQuery = await buildTaskFilter(adminId, baseQuery);
      if (secureQuery._id === null) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }


    // 3. Fetch filtered tasks directly from MongoDB
    let tasks = await Task.find(secureQuery).sort({ createdAt: -1 }).lean();

    // 4. Batch-resolve assignee working branches (2 queries total)
    const assigneeIds = [...new Set(tasks.map(t => t.assignedTo?.toString()).filter(Boolean))];
    const [assigneeAdmins, assigneeUsers] = await Promise.all([
      Admin.find({ _id: { $in: assigneeIds } }, { role: 1, branches: 1 }).populate('branches', 'workingBranch locCode').lean(),
      User.find({ _id: { $in: assigneeIds } }, { workingBranch: 1, locCode: 1 }).lean(),
    ]);
    const branchByAssignee = {};
    assigneeAdmins.forEach(ad => {
      if (['super_admin', 'admin', 'hr_admin'].includes(ad.role)) {
        branchByAssignee[ad._id.toString()] = 'Office';
      } else {
        branchByAssignee[ad._id.toString()] = ad.branches?.[0]?.workingBranch || '';
      }
    });
    assigneeUsers.forEach(u => {
      branchByAssignee[u._id.toString()] = u.workingBranch || '';
    });

    let mapped = tasks.map((t) => mapTaskForClient(t, branchByAssignee[t.assignedTo?.toString()] || null));

    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter((t) => [
        t.title, t.id, t.assignee, t.categorySub, t.category, t.description,
      ].some((v) => String(v).toLowerCase().includes(q)));
    }

    if (category && category !== 'All') {
      mapped = mapped.filter((t) => t.category.toLowerCase().includes(category.toLowerCase()));
    }

    if (priority && priority !== 'All') {
      mapped = mapped.filter((t) => t.priority === priority);
    }

    if (status && status !== 'All') {
      mapped = mapped.filter((t) => t.status === status);
    }

    return res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message,
    });
  }
};

function assignedToMatchesRole(assignedTo, role) {
  if (role === 'cluster_admin') {
    return assignedTo === 'cluster_admin' || assignedTo === 'all_stores' || assignedTo === 'store_admin';
  }
  if (role === 'store_admin') {
    return assignedTo === 'store_admin';
  }
  return true;
}

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Resolve assignee's actual working branch
    let assigneeBranch = null;
    try {
      const assigneeId = task.assignedTo?.toString();
      if (assigneeId) {
        const assigneeAdmin = await Admin.findById(assigneeId, { role: 1, branches: 1 }).populate('branches', 'workingBranch').lean();
        if (assigneeAdmin) {
          assigneeBranch = ['super_admin', 'admin', 'hr_admin'].includes(assigneeAdmin.role)
            ? 'Office'
            : (assigneeAdmin.branches?.[0]?.workingBranch || null);
        } else {
          const assigneeUser = await User.findById(assigneeId, { workingBranch: 1 }).lean();
          assigneeBranch = assigneeUser?.workingBranch || null;
        }
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      data: mapTaskForClient(task, assigneeBranch),
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message,
    });
  }
};

export const getTaskAssignees = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const adminId = req.admin.userId;
    let user = await Admin.findById(adminId).populate('branches');
    let role = user ? user.role : '';
    let isUserAdmin = true;

    if (!user) {
      user = await User.findById(adminId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User or Admin not found' });
      }
      role = 'user';
      isUserAdmin = false;
    }

    // Helper to determine if a user/admin is associated with all/multiple stores
    const isAllStoreEmployee = (item, designationOrRole) => {
      const design = String(designationOrRole || '').toLowerCase();
      const workingBranch = String(item.workingBranch || '').toLowerCase();
      
      const hasAllStoreRole = ['super_admin', 'admin', 'hr_admin'].includes(design) || 
                              design.includes('hr admin') || 
                              design.includes('super admin') || 
                              design.includes('admin');
      
      const hasAllStoreBranch = workingBranch.includes(',') || 
                                workingBranch.includes('all store') || 
                                workingBranch.includes('office');
                                
      const hasManyLocCodes = Array.isArray(item.locCode) && item.locCode.length > 3;
      const hasManyBranches = Array.isArray(item.branches) && item.branches.length > 3;
      
      return hasAllStoreRole || hasAllStoreBranch || hasManyLocCodes || hasManyBranches || item.locCode === 'All';
    };

    // 1. Parse target branch from query parameters (locCode or storeId)
    const { locCode, storeId } = req.query;
    let targetBranchId = null;
    let targetBranchName = null;

    if (locCode) {
      const branch = await Branch.findOne({ locCode: String(locCode).trim() });
      if (branch) {
        targetBranchId = branch._id.toString();
        targetBranchName = branch.workingBranch;
      }
    } else if (storeId) {
      const branch = await Branch.findOne({ 
        $or: [
          ...(storeId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: storeId }] : []),
          { locCode: String(storeId).trim() }
        ]
      });
      if (branch) {
        targetBranchId = branch._id.toString();
        targetBranchName = branch.workingBranch;
      }
    }

    // 2. Build generic options list based on role
    const genericOptions = [];
    if (role === 'super_admin' || role === 'admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_hr_admins', label: 'All HR Admins', type: 'group' },
        { value: 'all_cluster_admins', label: 'All Cluster Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'hr_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_cluster_admins', label: 'All Cluster Admins', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'cluster_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' },
        { value: 'all_store_admins', label: 'All Store Admins', type: 'group' }
      );
    } else if (role === 'store_admin') {
      genericOptions.push(
        { value: 'all_employees', label: 'All Employees', type: 'group' }
      );
    }

    // 3. Fetch accessible stores for the logged-in admin/user
    let accessibleStoreIds = await getAccessibleStoreIds(adminId);

    // Restrict accessible stores to the queried target branch if provided
    if (targetBranchId) {
      if (accessibleStoreIds.includes(targetBranchId)) {
        accessibleStoreIds = [targetBranchId];
      } else {
        accessibleStoreIds = [];
      }
    }

    // 4. Get Accessible Employees under these stores
    let employeeIds = await getAccessibleEmployeeIds(adminId, targetBranchId || null);

    // 5. Fetch Accessible Admins based on logged-in user's role
    let adminQuery = { isActive: true };
    if (role === 'super_admin' || role === 'admin') {
      adminQuery.role = { $in: ['hr_admin', 'cluster_admin', 'store_admin', 'super_admin', 'admin'] };
    } else if (role === 'hr_admin') {
      adminQuery.role = { $in: ['cluster_admin', 'store_admin', 'hr_admin'] };
    } else if (role === 'cluster_admin') {
      adminQuery.role = 'store_admin';
      adminQuery.branches = { $in: accessibleStoreIds };
    } else if (role === 'store_admin') {
      adminQuery = null;
    } else if (role === 'user') {
      // Regular employees can assign to their store admin
      adminQuery.role = 'store_admin';
      adminQuery.branches = { $in: accessibleStoreIds };
    }

    let admins = [];
    if (adminQuery) {
      admins = await Admin.find(adminQuery).populate('branches');
    }

    // 6. Format individual lists
    const individualAssignees = [];

    // Add Admins
    admins.forEach(ad => {
      const designation = ad.subRole && ad.subRole !== 'NR' 
        ? ad.subRole 
        : (ad.role === 'super_admin' ? 'Super Admin' : (ad.role === 'admin' ? 'Admin' : (ad.role === 'hr_admin' ? 'HR Admin' : (ad.role === 'cluster_admin' ? 'Cluster Admin' : 'Store Admin'))));
      
      let storeName = (ad.role === 'super_admin' || ad.role === 'admin' || ad.role === 'hr_admin')
        ? 'All Store'
        : (ad.branches && ad.branches.length > 0 ? ad.branches[0].workingBranch : 'Store');

      const isAllStore = isAllStoreEmployee(ad, ad.role);
      if (isAllStore) {
        storeName = 'All Store';
      }

      individualAssignees.push({
        value: ad._id.toString(),
        label: `${ad.name} - ${designation} - ${storeName}`,
        type: 'admin',
        role: ad.role,
        isAllStore,
        storeNameNormalized: storeName
      });
    });

    // Make sure logged-in admin is in the list
    if (isUserAdmin && !individualAssignees.some(ad => ad.value === adminId.toString())) {
      const designation = user.subRole && user.subRole !== 'NR'
        ? user.subRole
        : (user.role === 'super_admin' ? 'Super Admin' : (user.role === 'admin' ? 'Admin' : (user.role === 'hr_admin' ? 'HR Admin' : (user.role === 'cluster_admin' ? 'Cluster Admin' : 'Store Admin'))));
      let storeName = (user.role === 'super_admin' || user.role === 'admin' || user.role === 'hr_admin')
        ? 'All Store'
        : (user.branches && user.branches.length > 0 ? user.branches[0].workingBranch : 'Store');

      const isAllStore = isAllStoreEmployee(user, user.role);
      if (isAllStore) {
        storeName = 'All Store';
      }

      individualAssignees.push({
        value: user._id.toString(),
        label: `${user.name} - ${designation} - ${storeName}`,
        type: 'admin',
        role: user.role,
        isAllStore,
        storeNameNormalized: storeName
      });
    }

    // Add Employees from Employee collection
    const dbEmployees = await Employee.find({ _id: { $in: employeeIds }, storeId: { $in: accessibleStoreIds }, status: 'Active' }).populate('storeId');
    dbEmployees.forEach(emp => {
      if (!individualAssignees.some(item => item.value === emp._id.toString())) {
        const name = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : (emp.username || 'Employee');
        const designation = emp.designation || 'Staff';
        let storeNameVal = (emp.storeId && emp.storeId.workingBranch) || emp.workingBranch || 'Store';

        const isAllStore = isAllStoreEmployee(emp, designation);
        if (isAllStore) {
          storeNameVal = 'All Store';
        }

        individualAssignees.push({
          value: emp._id.toString(),
          label: `${name} - ${designation} - ${storeNameVal}`,
          type: 'employee',
          isAllStore,
          storeNameNormalized: storeNameVal
        });
      }
    });

    // Add Users from User collection
    const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const locCodes = branches.map(b => b.locCode);
    const dbUsers = await User.find({ _id: { $in: employeeIds }, locCode: { $in: locCodes } }).lean();
    dbUsers.forEach(u => {
      if (!individualAssignees.some(item => item.value === u._id.toString())) {
        const designation = u.designation || 'Staff';
        let storeNameVal = u.workingBranch || 'Store';

        const isAllStore = isAllStoreEmployee(u, designation);
        if (isAllStore) {
          storeNameVal = 'All Store';
        }

        individualAssignees.push({
          value: u._id.toString(),
          label: `${u.username || 'Employee'} - ${designation} - ${storeNameVal}`,
          type: 'employee',
          isAllStore,
          storeNameNormalized: storeNameVal
        });
      }
    });

    // Make sure logged-in regular user is in the list
    if (!isUserAdmin && !individualAssignees.some(emp => emp.value === adminId.toString())) {
      const designation = user.designation || 'Staff';
      let storeNameVal = user.workingBranch || 'Store';

      const isAllStore = isAllStoreEmployee(user, designation);
      if (isAllStore) {
        storeNameVal = 'All Store';
      }

      individualAssignees.push({
        value: user._id.toString(),
        label: `${user.username || 'Employee'} - ${designation} - ${storeNameVal}`,
        type: 'employee',
        isAllStore,
        storeNameNormalized: storeNameVal
      });
    }

    // 7. Filter individual options
    let filteredAssignees = individualAssignees;

    if (role === 'user' || role === 'store_admin') {
      // Build a list of allowed store names for the logged-in user or store admin
      let allowedStoreNames = [];
      if (role === 'user') {
        if (user.workingBranch) {
          allowedStoreNames.push(user.workingBranch.trim().toLowerCase());
        }
      } else if (role === 'store_admin') {
        if (user.branches && user.branches.length > 0) {
          user.branches.forEach(b => {
            if (b.workingBranch) {
              allowedStoreNames.push(b.workingBranch.trim().toLowerCase());
            }
          });
        }
      }

      filteredAssignees = individualAssignees.filter(assignee => {
        if (assignee.isAllStore) return false;
        const assigneeStore = String(assignee.storeNameNormalized || '').trim().toLowerCase();
        return allowedStoreNames.includes(assigneeStore);
      });
    } else if (targetBranchName) {
      // If a specific store is requested via locCode/storeId parameter, filter to just that store
      const normalizedTarget = String(targetBranchName).trim().toLowerCase();
      filteredAssignees = individualAssignees.filter(assignee => {
        const assigneeStore = String(assignee.storeNameNormalized || '').trim().toLowerCase();
        return assigneeStore === normalizedTarget;
      });
    }

    // Sort individual options alphabetically by label
    filteredAssignees.sort((a, b) => a.label.localeCompare(b.label));

    // Combine generic group options with individual options
    const finalOptions = [...genericOptions, ...filteredAssignees];

    return res.status(200).json({
      success: true,
      data: finalOptions,
    });
  } catch (error) {
    console.error('Error fetching task assignees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task assignees',
      error: error.message,
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, fileAttachment } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    let normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === 'REVIEW') {
      normalizedStatus = 'UNDER REVIEW';
    }
    if (normalizedStatus === 'REASSIGN') {
      normalizedStatus = 'REASSIGNED';
    }
    const validStatuses = ['PENDING', 'IN PROGRESS', 'COMPLETED', 'OVERDUE', 'ON HOLD', 'UNDER REVIEW', 'REASSIGNED', 'EXTENSION REQUESTED'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find the task by Mongo ID or taskCode
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Role-based validation
    const userId = req.admin.userId;
    const userRole = req.admin.role;
    const isUserAdmin = userRole && userRole !== 'employee' && userRole !== 'user';

    // Verify permissions for status update (non-reassign status changes)
    if (normalizedStatus !== 'REASSIGNED') {
      if (!isUserAdmin) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        const employee = await Employee.findOne({
          $or: [
            { userId: user._id },
            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
          ]
        });
        const assignedIds = [user._id.toString()];
        if (employee) {
          assignedIds.push(employee._id.toString());
        }

        const isAssignedToMe = assignedIds.includes(task.assignedTo);
        const isMyStore = task.storeCode === `Z-${user.locCode}`;
        if (!isAssignedToMe && !isMyStore) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to update this task',
          });
        }
      }
    } else {
      // Reassigning power check: only current assignee or admin can reassign
      if (!isUserAdmin) {
        const user = await User.findById(userId);
        const employee = user ? await Employee.findOne({
          $or: [
            { userId: user._id },
            { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
          ]
        }) : null;
        const assignedIds = [userId.toString()];
        if (employee) {
          assignedIds.push(employee._id.toString());
        }
        if (!assignedIds.includes(task.assignedTo)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to reassign this task',
          });
        }
      }
    }

    // Only the creator (assigner) can mark a task as COMPLETED.
    const isTaskCreator = task.createdBy.toString() === userId.toString();

    if (normalizedStatus === 'COMPLETED') {
      if (!isTaskCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only the assigner (creator) of this task can mark it as COMPLETED.',
        });
      }
    }

    if (normalizedStatus === 'UNDER REVIEW') {
      if (!fileAttachment || !fileAttachment.base64) {
        return res.status(400).json({
          success: false,
          message: 'Attachment is required to submit this task for review.',
        });
      }

      task.reviewAttachment = fileAttachment.base64;
      task.reviewAttachmentName = fileAttachment.name;
    }

    // Resolve executor's display name
    let executorName = 'Unknown';
    try {
      const executorAdmin = await Admin.findById(userId);
      if (executorAdmin) {
        executorName = executorAdmin.name;
      } else {
        const executorUser = await User.findById(userId);
        if (executorUser) {
          executorName = executorUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving executor details:', err);
    }

    if (!task.workMap) {
      task.workMap = [];
    }
    if (task.workMap.length === 0) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: task.assignedByName || 'Creator',
        assignedAt: task.createdAt || new Date(),
        action: 'ASSIGNED'
      });
    }

    if (normalizedStatus === 'REASSIGNED') {
      const { assignedTo, assignedToLabel } = req.body;
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          message: 'assignedTo is required when updating status to REASSIGNED',
        });
      }

      const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
      const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : (assignedToLabel || assignedTo);

      task.assignedTo = resolvedAssignedTo;
      task.assignedToLabel = resolvedAssignedToLabel;

      task.workMap.push({
        assignedTo: resolvedAssignedTo,
        assignedToLabel: resolvedAssignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'REASSIGNED'
      });

      // Update store details
      try {
        const targetAdmin = await Admin.findById(resolvedAssignedTo).populate('branches');
        let targetStoreName = '';
        let targetStoreCode = '';
        if (targetAdmin) {
          const targetBranch = targetAdmin.branches?.[0];
          targetStoreName = targetBranch?.workingBranch || '';
          targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
        } else {
          const targetUser = await User.findById(resolvedAssignedTo);
          if (targetUser) {
            targetStoreName = targetUser.workingBranch || '';
            targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
          }
        }
        if (targetStoreName || targetStoreCode) {
          task.storeName = targetStoreName;
          task.storeCode = targetStoreCode;
        }
      } catch (err) {
        console.error('Error updating task store on status-reassign:', err);
      }
    } else if (normalizedStatus === 'COMPLETED') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'COMPLETED'
      });
    } else if (normalizedStatus === 'UNDER REVIEW') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'UNDER REVIEW'
      });
    } else if (normalizedStatus === 'IN PROGRESS') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'IN PROGRESS'
      });
    } else if (normalizedStatus === 'ON HOLD') {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'ON HOLD'
      });
    } else if (normalizedStatus === 'EXTENSION REQUESTED') {
      const { requestedExtensionDate } = req.body;
      if (!requestedExtensionDate) {
        return res.status(400).json({
          success: false,
          message: 'requestedExtensionDate is required when status is EXTENSION REQUESTED',
        });
      }
      task.previousStatus = task.status;
      task.requestedExtensionDate = requestedExtensionDate;
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: executorName,
        assignedAt: new Date(),
        action: 'EXTENSION REQUESTED',
        details: requestedExtensionDate
      });
    }

    task.status = normalizedStatus;
    await task.save();

    // Trigger status-change notifications
    if (normalizedStatus === 'REASSIGNED') {
      await sendNotification({
        title: 'Task Reassigned',
        body: `Task "${task.title}" has been reassigned to you by ${executorName}`,
        userIds: [task.assignedTo],
        senderName: executorName,
        category: 'Task'
      });
    } else if (normalizedStatus === 'UNDER REVIEW') {
      await sendNotification({
        title: 'Task Submitted for Review',
        body: `Task "${task.title}" has been submitted for review by ${executorName}`,
        userIds: [task.createdBy],
        senderName: executorName,
        category: 'Task'
      });
    } else if (normalizedStatus === 'EXTENSION REQUESTED') {
      await sendNotification({
        title: 'Task Extension Requested',
        body: `Task "${task.title}" has an extension requested to ${requestedExtensionDate} by ${executorName}`,
        userIds: [task.createdBy],
        senderName: executorName,
        category: 'Task'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: mapTaskForClient(task),
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message,
    });
  }
};

export const reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedToLabel } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'assignedTo is required' });
    }

    const resolvedAssignedTo = await resolveAssigneeId(assignedTo);
    const resolvedAssignedToLabel = resolvedAssignedTo !== assignedTo ? assignedTo : (assignedToLabel || assignedTo);

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const userId = req.admin.userId;
    const userRole = req.admin.role;
    const isUserAdmin = userRole && userRole !== 'employee' && userRole !== 'user';

    // Verify permissions: only current assignee or admin can reassign
    if (!isUserAdmin) {
      const user = await User.findById(userId);
      const employee = user ? await Employee.findOne({
        $or: [
          { userId: user._id },
          { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
        ]
      }) : null;
      const assignedIds = [userId.toString()];
      if (employee) {
        assignedIds.push(employee._id.toString());
      }
      if (!assignedIds.includes(task.assignedTo)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to reassign this task',
        });
      }
    }

    // Resolve reassigner's display name
    let reassignerName = 'Unknown';
    try {
      const reassignerAdmin = await Admin.findById(userId);
      if (reassignerAdmin) {
        reassignerName = reassignerAdmin.name;
      } else {
        const reassignerUser = await User.findById(userId);
        if (reassignerUser) {
          reassignerName = reassignerUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving reassigner details:', err);
    }

    if (!task.workMap) {
      task.workMap = [];
    }
    if (task.workMap.length === 0) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: task.assignedByName || 'Creator',
        assignedAt: task.createdAt || new Date(),
        action: 'ASSIGNED'
      });
    }

    task.assignedTo = resolvedAssignedTo;
    task.assignedToLabel = resolvedAssignedToLabel;
    task.status = 'REASSIGNED'; // Reset status to REASSIGNED

    task.workMap.push({
      assignedTo: resolvedAssignedTo,
      assignedToLabel: resolvedAssignedToLabel,
      assignedBy: reassignerName,
      assignedAt: new Date(),
      action: 'REASSIGNED'
    });

    // Update storeName and storeCode to the new assignee's store dynamically
    try {
      const targetAdmin = await Admin.findById(resolvedAssignedTo).populate('branches');
      let targetStoreName = '';
      let targetStoreCode = '';
      if (targetAdmin) {
        if (['super_admin', 'admin', 'hr_admin'].includes(targetAdmin.role)) {
          targetStoreName = 'Office';
          targetStoreCode = '';
        } else {
          const targetBranch = targetAdmin.branches?.[0];
          targetStoreName = targetBranch?.workingBranch || '';
          targetStoreCode = targetBranch?.locCode ? `Z-${targetBranch.locCode}` : '';
        }
      } else {
        const targetUser = await User.findById(resolvedAssignedTo);
        if (targetUser) {
          targetStoreName = targetUser.workingBranch || '';
          targetStoreCode = targetUser.locCode ? (Array.isArray(targetUser.locCode) ? `Z-${targetUser.locCode[0]}` : `Z-${targetUser.locCode}`) : '';
        }
      }
      if (targetStoreName || targetStoreCode) {
        task.storeName = targetStoreName;
        task.storeCode = targetStoreCode;
      }
    } catch (err) {
      console.error('Error updating task store on reassign:', err);
    }

    await task.save();

    // Send notification to the new assignee
    await sendNotification({
      title: 'Task Reassigned',
      body: `Task "${task.title}" has been reassigned to you by ${reassignerName}`,
      userIds: [task.assignedTo],
      senderName: reassignerName,
      category: 'Task'
    });

    return res.status(200).json({
      success: true,
      message: 'Task reassigned successfully',
      data: mapTaskForClient(task),
    });
  } catch (error) {
    console.error('Error reassigning task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reassign task',
      error: error.message,
    });
  }
};

export const getTaskAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task || !task.attachment) {
      return res.status(404).send('Attachment not found');
    }

    const attachmentVal = normalizeAttachmentToDataUri(task.attachment);

    if (attachmentVal.startsWith('data:')) {
      const matches = attachmentVal.match(/^data:([^;]+);base64,(.*)$/i);
      if (!matches) {
        return res.status(400).send('Invalid data URI format');
      }
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${task.attachmentName || 'attachment'}"`);
      return res.send(buffer);
    } else {
      // Legacy disk file fallback
      const uploadDir = path.join(__dirname, '..');
      const filePath = path.join(uploadDir, task.attachment);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send('File not found on server');
      }
    }
  } catch (error) {
    console.error('Error fetching task attachment:', error);
    return res.status(500).send('Failed to fetch task attachment');
  }
};

export const getTaskReviewAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task || !task.reviewAttachment) {
      return res.status(404).send('Review proof not found');
    }

    const reviewAttachmentVal = normalizeAttachmentToDataUri(task.reviewAttachment);

    if (reviewAttachmentVal.startsWith('data:')) {
      const matches = reviewAttachmentVal.match(/^data:([^;]+);base64,(.*)$/i);
      if (!matches) {
        return res.status(400).send('Invalid data URI format');
      }
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${task.reviewAttachmentName || 'review-proof'}"`);
      return res.send(buffer);
    } else {
      // Legacy disk file fallback
      const uploadDir = path.join(__dirname, '..');
      const filePath = path.join(uploadDir, task.reviewAttachment);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send('File not found on server');
      }
    }
  } catch (error) {
    console.error('Error fetching task review attachment:', error);
    return res.status(500).send('Failed to fetch task review attachment');
  }
};

// ─── REQUEST EXTENSION (called by mobile assignee) ───────────────────────────
export const requestExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedExtensionDate } = req.body;

    if (!requestedExtensionDate) {
      return res.status(400).json({ success: false, message: 'requestedExtensionDate is required (YYYY-MM-DD)' });
    }

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status === 'EXTENSION REQUESTED') {
      return res.status(400).json({ success: false, message: 'An extension request is already pending for this task' });
    }

    if (task.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot request extension for a completed task' });
    }

    // Resolve caller display name
    const userId = req.admin.userId;
    let executorName = 'Unknown';
    try {
      const execAdmin = await Admin.findById(userId);
      executorName = execAdmin ? execAdmin.name : (await User.findById(userId))?.username || 'Unknown';
    } catch (_) {}

    // Normalize date — strip time component if present
    const normalizedDate = requestedExtensionDate.includes('T')
      ? requestedExtensionDate.split('T')[0]
      : requestedExtensionDate;

    task.previousStatus = task.status;
    task.requestedExtensionDate = normalizedDate;
    task.status = 'EXTENSION REQUESTED';
    task.workMap.push({
      assignedTo: task.assignedTo,
      assignedToLabel: task.assignedToLabel,
      assignedBy: executorName,
      assignedAt: new Date(),
      action: 'EXTENSION REQUESTED',
      details: normalizedDate,
    });

    await task.save();

    // Notify the task creator
    await sendNotification({
      title: 'Task Extension Requested',
      body: `"${task.title}" — ${executorName} is requesting a deadline extension to ${normalizedDate}`,
      userIds: [task.createdBy],
      senderName: executorName,
      category: 'Task',
    });

    return res.status(200).json({
      success: true,
      message: 'Extension request submitted successfully',
      data: mapTaskForClient(task),
    });
  } catch (error) {
    console.error('Error requesting task extension:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit extension request', error: error.message });
  }
};

export const resolveExtensionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, endDate } = req.body; // 'APPROVE' or 'REJECT' and optional endDate

    if (!action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Task MUST be in EXTENSION REQUESTED status — no exceptions
    if (task.status !== 'EXTENSION REQUESTED') {
      return res.status(400).json({ success: false, message: 'Task does not have a pending extension request' });
    }

    // Permissions check: only the creator (assigner) of the task can resolve extension requests
    const userId = req.admin.userId;
    if (task.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the creator of this task can approve or reject extension requests',
      });
    }

    // Resolve executor/creator display name
    let resolverName = 'Unknown';
    try {
      const resolverAdmin = await Admin.findById(userId);
      if (resolverAdmin) {
        resolverName = resolverAdmin.name;
      } else {
        const resolverUser = await User.findById(userId);
        if (resolverUser) {
          resolverName = resolverUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving executor details:', err);
    }

    const nextStatus = task.status === 'EXTENSION REQUESTED' ? (task.previousStatus || 'IN PROGRESS') : task.status;

    if (action.toUpperCase() === 'APPROVE') {
      let newEndDate = endDate || task.requestedExtensionDate;
      if (!newEndDate) {
        return res.status(400).json({ success: false, message: 'New end date is required to approve extension' });
      }
      if (newEndDate.includes('T')) {
        newEndDate = newEndDate.split('T')[0];
      }
      task.endDate = newEndDate;
      task.status = nextStatus;
      
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: resolverName,
        assignedAt: new Date(),
        action: 'EXTENSION APPROVED',
        details: newEndDate
      });

      task.requestedExtensionDate = '';
      task.previousStatus = '';
    } else {
      task.status = nextStatus;
      
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: resolverName,
        assignedAt: new Date(),
        action: 'EXTENSION REJECTED',
        details: ''
      });

      task.requestedExtensionDate = '';
      task.previousStatus = '';
    }

    await task.save();

    // Trigger notification to the assignee
    await sendNotification({
      title: `Extension Request ${action.toUpperCase() === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      body: `Your extension request for task "${task.title}" has been ${action.toUpperCase() === 'APPROVE' ? 'approved' : 'rejected'} by ${resolverName}`,
      userIds: [task.assignedTo],
      senderName: resolverName,
      category: 'Task'
    });

    return res.status(200).json({
      success: true,
      message: `Extension request ${action.toLowerCase()}d successfully`,
      data: mapTaskForClient(task),
    });
  } catch (error) {
    console.error('Error resolving extension request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve extension request',
      error: error.message,
    });
  }
};

export const updateTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      subCategory,
      assignedTo,
      assignedToLabel,
      endDate,
      priority,
      description,
      additionalInfo,
    } = req.body;

    const task = await Task.findOne({
      $or: [{ taskCode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Permissions check: only task creator can edit task details
    const userId = req.admin.userId;
    if (task.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the creator of this task can edit its details',
      });
    }

    // Resolve editor's name
    let editorName = 'Unknown';
    try {
      const editorAdmin = await Admin.findById(userId);
      if (editorAdmin) {
        editorName = editorAdmin.name;
      } else {
        const editorUser = await User.findById(userId);
        if (editorUser) {
          editorName = editorUser.username;
        }
      }
    } catch (err) {
      console.error('Error resolving editor details:', err);
    }

    if (title) task.title = title;
    if (category) task.category = category;
    if (subCategory) task.subCategory = subCategory;

    let assigneeChanged = false;
    let oldAssigneeLabel = task.assignedToLabel || task.assignedTo;
    if (assignedTo && assignedTo !== task.assignedTo) {
      task.assignedTo = assignedTo;
      if (assignedToLabel) task.assignedToLabel = assignedToLabel;
      assigneeChanged = true;
    }

    if (endDate) {
      let trimmedDate = endDate;
      if (trimmedDate.includes('T')) {
        trimmedDate = trimmedDate.split('T')[0];
      }
      task.endDate = trimmedDate;
    }

    if (priority) task.priority = priority;
    if (description !== undefined) task.description = description;
    if (additionalInfo !== undefined) task.additionalInfo = additionalInfo;

    if (assigneeChanged) {
      task.workMap.push({
        assignedTo: task.assignedTo,
        assignedToLabel: task.assignedToLabel,
        assignedBy: editorName,
        assignedAt: new Date(),
        action: 'REASSIGNED',
        details: `Details updated. Reassigned from ${oldAssigneeLabel} to ${task.assignedToLabel}`,
      });
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task details updated successfully',
      data: mapTaskForClient(task),
    });
  } catch (error) {
    console.error('Error updating task details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task details',
      error: error.message,
    });
  }
};


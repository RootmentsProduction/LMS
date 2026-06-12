/**
 * AutoTaskController.js
 *
 * CRUD for AutoTaskTemplate documents + a manual generate-now trigger.
 * All responses follow the same { success, message, data } shape used
 * throughout the rest of the LMS backend.
 */

import mongoose from 'mongoose';
import AutoTaskTemplate  from '../model/AutoTaskTemplate.js';
import Admin             from '../model/Admin.js';
import User              from '../model/User.js';
import { generateAutoTasks } from '../services/autoTaskGenerationService.js';

// ─────────────────────────────────────────────────────────────────
// Helper: Resolve creator from req.admin (Admin or User fallback)
// ─────────────────────────────────────────────────────────────────
const resolveCreator = async (userId) => {
  const admin = await Admin.findById(userId);
  if (admin) return { creator: admin, isAdmin: true };
  const user = await User.findById(userId);
  return { creator: user, isAdmin: false };
};

// ─────────────────────────────────────────────────────────────────
// CREATE Auto Task Template
// POST /api/auto-task/save
// ─────────────────────────────────────────────────────────────────
export const createAutoTask = async (req, res) => {
  try {
    const { creator, isAdmin } = await resolveCreator(req.admin.userId);
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    const {
      title,
      category,
      subCategory,
      description   = '',
      priority      = 'Normal',
      repeatType    = 'daily',
      startDate,
      startTime     = '',
      endDate       = '',
      endTime       = '',
      assignMode    = 'all_employees',
      selectedStores = [],
      selectedRoles  = [],
      selectedUsers  = [],
      isActive      = true,
      fileAttachment,
    } = req.body;

    if (!title || !category || !subCategory || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'title, category, subCategory, and startDate are required',
      });
    }

    const validRepeatTypes = ['daily', 'weekly', 'monthly', 'custom'];
    if (!validRepeatTypes.includes(repeatType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `repeatType must be one of: ${validRepeatTypes.join(', ')}`,
      });
    }

    const validAssignModes = ['all_employees', 'store', 'role', 'individual'];
    if (!validAssignModes.includes(assignMode)) {
      return res.status(400).json({
        success: false,
        message: `assignMode must be one of: ${validAssignModes.join(', ')}`,
      });
    }

    let attachment     = '';
    let attachmentName = '';
    if (fileAttachment && fileAttachment.base64) {
      attachment     = fileAttachment.base64;
      attachmentName = fileAttachment.name || '';
    }

    const template = await AutoTaskTemplate.create({
      title:         title.trim(),
      category:      category.trim(),
      subCategory:   subCategory.trim(),
      description:   description.trim(),
      priority,
      attachment,
      attachmentName,
      repeatType:    repeatType.toLowerCase(),
      startDate,
      startTime,
      endDate,
      endTime,
      assignMode,
      selectedStores,
      selectedRoles,
      selectedUsers,
      isActive,
      createdBy: isAdmin ? creator._id : (await Admin.findOne({ role: 'super_admin' }))?._id || creator._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Auto Task Template created successfully',
      data: template,
    });
  } catch (err) {
    console.error('Error creating auto task template:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create auto task template',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET All Auto Task Templates (RBAC)
// GET /api/auto-task/list
// ─────────────────────────────────────────────────────────────────
export const getAutoTasks = async (req, res) => {
  try {
    const adminId = req.admin.userId;
    const admin   = await Admin.findById(adminId);

    let query = {};

    // Super admin and HR admin can see all templates
    if (!admin || !['super_admin', 'admin', 'hr_admin'].includes(admin.role)) {
      // Others only see their own templates
      query.createdBy = new mongoose.Types.ObjectId(adminId);
    }

    const templates = await AutoTaskTemplate.find(query)
      .populate('createdBy', 'name role email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (err) {
    console.error('Error fetching auto task templates:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch auto task templates',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET Single Auto Task Template
// GET /api/auto-task/:id
// ─────────────────────────────────────────────────────────────────
export const getAutoTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await AutoTaskTemplate.findById(id)
      .populate('createdBy', 'name role email')
      .lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Auto task template not found' });
    }

    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    console.error('Error fetching auto task template:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch auto task template',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// UPDATE Auto Task Template
// PUT /api/auto-task/:id
// ─────────────────────────────────────────────────────────────────
export const updateAutoTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await AutoTaskTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Auto task template not found' });
    }

    // Only creator or super/hr admin can update
    const adminId = req.admin.userId;
    const admin   = await Admin.findById(adminId);
    const isFullAccess = admin && ['super_admin', 'admin', 'hr_admin'].includes(admin.role);
    if (!isFullAccess && template.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowedFields = [
      'title', 'category', 'subCategory', 'description', 'priority',
      'repeatType', 'startDate', 'startTime', 'endDate', 'endTime',
      'assignMode', 'selectedStores', 'selectedRoles', 'selectedUsers', 'isActive',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        template[field] = field === 'title' || field === 'category' || field === 'subCategory' || field === 'description'
          ? String(req.body[field]).trim()
          : req.body[field];
      }
    });

    // Handle attachment update
    if (req.body.fileAttachment && req.body.fileAttachment.base64) {
      template.attachment     = req.body.fileAttachment.base64;
      template.attachmentName = req.body.fileAttachment.name || '';
    }

    if (template.repeatType) {
      template.repeatType = template.repeatType.toLowerCase();
    }

    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Auto task template updated successfully',
      data: template,
    });
  } catch (err) {
    console.error('Error updating auto task template:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update auto task template',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// TOGGLE Active/Inactive
// PATCH /api/auto-task/:id/toggle
// ─────────────────────────────────────────────────────────────────
export const toggleAutoTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await AutoTaskTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Auto task template not found' });
    }

    // Only creator or super/hr admin can toggle
    const adminId = req.admin.userId;
    const admin   = await Admin.findById(adminId);
    const isFullAccess = admin && ['super_admin', 'admin', 'hr_admin'].includes(admin.role);
    if (!isFullAccess && template.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    template.isActive = !template.isActive;
    await template.save();

    return res.status(200).json({
      success: true,
      message: `Auto task template ${template.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: template.isActive },
    });
  } catch (err) {
    console.error('Error toggling auto task template:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle auto task template',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// DELETE Auto Task Template
// DELETE /api/auto-task/:id
// ─────────────────────────────────────────────────────────────────
export const deleteAutoTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await AutoTaskTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Auto task template not found' });
    }

    // Only creator or super/hr admin can delete
    const adminId = req.admin.userId;
    const admin   = await Admin.findById(adminId);
    const isFullAccess = admin && ['super_admin', 'admin', 'hr_admin'].includes(admin.role);
    if (!isFullAccess && template.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await AutoTaskTemplate.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Auto task template deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting auto task template:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete auto task template',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// GENERATE NOW (manual trigger for testing)
// POST /api/auto-task/:id/generate-now
// ─────────────────────────────────────────────────────────────────
export const generateNow = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDate } = req.body; // optional YYYY-MM-DD override

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await AutoTaskTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Auto task template not found' });
    }

    const result = await generateAutoTasks(targetDate || null, id);

    return res.status(200).json({
      success: true,
      message: `Generation complete: ${result.generated} created, ${result.skipped} skipped, ${result.errors} errors`,
      data: result,
    });
  } catch (err) {
    console.error('Error in generate-now:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate tasks',
      error: err.message,
    });
  }
};

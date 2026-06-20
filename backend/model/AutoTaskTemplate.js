import mongoose from 'mongoose';

/**
 * AutoTaskTemplate — stores a recurring task schedule definition.
 * When the cron job fires it reads this collection and generates real Task
 * documents in the existing Task collection (same model, same APIs, same
 * Flutter/web flows).
 */
const autoTaskTemplateSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    category:    { type: String, required: true, trim: true },
    subCategory: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority:    { type: String, required: true, trim: true },

    // Attachment stored as base64 data URI (same pattern as Task.attachment)
    attachment:     { type: String, default: '' },
    attachmentName: { type: String, default: '' },

    // Recurrence
    repeatType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      required: true,
      default: 'daily',
    },

    weekDays:  [{ type: String }],
    monthDays: [{ type: Number }],

    startDate: { type: String, required: true },  // YYYY-MM-DD
    startTime: { type: String, default: '' },      // e.g. '09:00am'
    endDate:   { type: String, default: '' },      // YYYY-MM-DD — empty = no end
    endTime:   { type: String, default: '' },

    // Assignment mode
    assignMode: {
      type: String,
      enum: ['all_employees', 'store', 'role', 'individual'],
      required: true,
      default: 'all_employees',
    },

    // Store names (workingBranch strings) when assignMode = 'store'
    selectedStores: [{ type: String }],

    // Role keys when assignMode = 'role'
    // e.g. ['super_admin', 'store_admin', 'employee']
    selectedRoles: [{ type: String }],

    // Individual user/admin ids + display labels when assignMode = 'individual'
    selectedUsers: [
      {
        id:    { type: String, required: true },
        label: { type: String, default: '' },
      },
    ],

    isActive: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

// Quick lookups
autoTaskTemplateSchema.index({ isActive: 1 });
autoTaskTemplateSchema.index({ createdBy: 1 });
autoTaskTemplateSchema.index({ repeatType: 1 });

const AutoTaskTemplate = mongoose.model('AutoTaskTemplate', autoTaskTemplateSchema);
export default AutoTaskTemplate;

import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
  trainingName: { type: String, required: true }, // Name of the training
  description: { type: String },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }], // Reference to Module
  numberOfModules: { type: Number, default: 0 }, // Auto-calculated field
  deadline: { type: Number, required: true }, // Original deadline in days (keeping existing data intact)
  deadlineDate: { type: Date }, // Actual calculated deadline date (new field)
  Trainingtype: { type: String, default: "Assigned" },
  Assignedfor: [{ type: String, default: 'Normal' }],
  createdBY: { type: String, default: 'admin' },
  createdDate: { type: Date, default: Date.now }, // Creation date
  editedDate: { type: Date, default: Date.now }, // Last edited date
});

// Pre-save hook to calculate number of modules, deadline date, and update edited date
trainingSchema.pre('save', function (next) {
  this.numberOfModules = this.modules.length;
  
  if (this.deadline && !this.deadlineDate) {
    this.deadlineDate = new Date(Date.now() + this.deadline * 24 * 60 * 60 * 1000);
  }
  
  this.editedDate = new Date();
  next();
});

// Queried by type to separate mandatory vs assigned trainings
trainingSchema.index({ Trainingtype: 1 });
// Queried by Assignedfor (designation-based mandatory training lookup)
trainingSchema.index({ Assignedfor: 1 });
// Compound: type + assignedfor — the core mandatory training filter
trainingSchema.index({ Trainingtype: 1, Assignedfor: 1 });

export const Training = mongoose.model('Training', trainingSchema);

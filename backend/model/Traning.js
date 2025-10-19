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
  this.numberOfModules = this.modules.length; // Count the modules
  
  // Calculate deadlineDate if deadline (days) is provided but deadlineDate is not set
  if (this.deadline && !this.deadlineDate) {
    this.deadlineDate = new Date(Date.now() + this.deadline * 24 * 60 * 60 * 1000);
  }
  
  this.editedDate = new Date(); // Update edited date whenever saved
  next();
});

export const Training = mongoose.model('Training', trainingSchema);

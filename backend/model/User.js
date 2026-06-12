import mongoose from 'mongoose';

// Define schema for assigned modules
const assignedModuleSchema = new mongoose.Schema({
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true }, // Reference to a module
    deadline: { type: Date, required: true }, // Deadline for the module
    pass: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' } // Current status
});

// Define schema for assigned assessments
const assignedAssessmentSchema = new mongoose.Schema({
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true }, // Reference to an assessment
    deadline: { type: Date, required: true }, // Deadline for the assessment
    pass: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    complete: { type: Number, default: 0 }// Current status
});
const trainingSchema = new mongoose.Schema({
    trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true }, // Reference to an assessment
    deadline: { type: Date, required: true }, // Deadline for the assessment
    pass: { type: Boolean, default: false },

    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' } // Current status
});


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, }, // User's username
    email: { type: String, required: true, unique: true },
    password: { type: String, default: "" },
    phoneNumber: { type: String, default: "" }, // Store as a string
    locCode: { type: mongoose.Schema.Types.Mixed, required: true }, // User's email
    empID: { type: String, required: true, unique: true }, // Employee ID
    designation: { type: String, required: true },
    workingBranch: { type: String, required: true }, // User's working branch
    source: {
        type: String,
        enum: ['app', 'admin', 'external-sync'],
        default: 'app',
        index: true,
    },
    assignedModules: [assignedModuleSchema], // Array of assigned modules
    assignedAssessments: [assignedAssessmentSchema],
    training: [trainingSchema],// Array of assigned assessments
    createdAt: { type: Date, default: Date.now }, // Timestamp when the user was created
    updatedAt: { type: Date, default: Date.now }, // Timestamp when the user was last updated
});

userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Frequently queried by locCode (branch filtering across all controllers)
userSchema.index({ locCode: 1 });
// Queried by designation for mandatory training assignment
userSchema.index({ designation: 1 });
// Compound: locCode + designation used together in branch+role queries
userSchema.index({ locCode: 1, designation: 1 });
// Branch + working branch lookups used by dashboard grouping and filters
userSchema.index({ locCode: 1, workingBranch: 1 });
// Reassignment / admin search patterns by source and role
userSchema.index({ source: 1, designation: 1 });
// Sub-document queries on assigned trainings
userSchema.index({ 'training.trainingId': 1 });
userSchema.index({ 'training.trainingId': 1, 'training.status': 1 });
// Sub-document queries on assigned assessments
userSchema.index({ 'assignedAssessments.assessmentId': 1 });
userSchema.index({ 'assignedAssessments.assessmentId': 1, 'assignedAssessments.status': 1 });
// Sub-document queries on assigned modules
userSchema.index({ 'assignedModules.moduleId': 1 });
userSchema.index({ 'assignedModules.moduleId': 1, 'assignedModules.status': 1 });

const User = mongoose.model('User', userSchema);
export default User;


// //user designation

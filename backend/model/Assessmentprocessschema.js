import mongoose from 'mongoose';

const assessmentProcessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentQuestion',
        required: true,
      },
      selectedAnswer: {
        type: String,
        default: ""
      },
      correctAnswer: {
        type: String,
        default: ""
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
    },
  ],
  totalMarks: {
    type: Number,
    default: 0,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update the `updatedAt` field
assessmentProcessSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Fetch all attempts for a user
assessmentProcessSchema.index({ userId: 1 });
// Fetch all attempts on a specific assessment
assessmentProcessSchema.index({ assessmentId: 1 });
// Compound: the most common lookup — did this user attempt this assessment?
assessmentProcessSchema.index({ userId: 1, assessmentId: 1 });
// Filter by pass/fail results
assessmentProcessSchema.index({ passed: 1 });

const AssessmentProcess = mongoose.model('AssessmentProcess', assessmentProcessSchema);
export default AssessmentProcess;

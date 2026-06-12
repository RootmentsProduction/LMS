import mongoose from 'mongoose';

// Define schema for questions in the assessment
const assessmentQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true }, // The question text
  options: [{ type: String, required: true }], // Array of multiple-choice options
  correctAnswer: { type: String, required: true }, // Correct answer text
});

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [assessmentQuestionSchema],
  duration: { type: Number, require: true },
  deadline: { type: Number, require: true },
  createBy: { type: String, default: "admin" },
  state: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Filter assessments by state
assessmentSchema.index({ state: 1 });
// Sort/filter by creation date
assessmentSchema.index({ createdAt: -1 });

const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;

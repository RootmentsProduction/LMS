import mongoose from 'mongoose'
// Define schema for questions
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true }, // The question text
    options: [{ type: String, required: true }], // Array of multiple-choice options
    correctAnswer: { type: String, required: true }, // Correct answer text


});

// Define schema for each video
const videoSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Title of the video
    videoUri: { type: String, required: true }, // Video link or URI
    questions: [questionSchema],
    // Array of questions related to the video
});

const moduleSchema = new mongoose.Schema({
    moduleName: { type: String, required: true },
    description: { type: String, required: true },
    videos: [videoSchema],
    createdBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

// Modules are bulk-fetched by _id array from Training.modules[]
// _id index is automatic; add moduleName for search
moduleSchema.index({ moduleName: 1 });

const Module = mongoose.model('Module', moduleSchema)
export default Module

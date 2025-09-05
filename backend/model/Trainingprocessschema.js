import mongoose from "mongoose";
const TrainingProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
     trainingName: { type: String, required: true },
    trainingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training',
        required: true,
    },
    pass: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        default: 'Pending',
    },
    deadline: {
        type: Date,
        required: true,
    },
    modules: [
        {
            moduleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Module',
                required: true,
            },
            pass: {
                type: Boolean,
                default: false,
            },
            videos: [
                {
                    videoId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Video',
                        required: true,
                    },
                    pass: {
                        type: Boolean,
                        default: false,
                    },
                    watchTime: {
                        type: Number,
                        default: 0, // Time watched in seconds
                    },
                    totalDuration: {
                        type: Number,
                        default: 0, // Total video duration in seconds
                    },
                    watchPercentage: {
                        type: Number,
                        default: 0, // Percentage of video watched (0-100)
                    },
                    lastWatchedAt: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],
        },
    ],
});

const TrainingProgress = mongoose.model('TrainingProgress', TrainingProgressSchema);
export default TrainingProgress;

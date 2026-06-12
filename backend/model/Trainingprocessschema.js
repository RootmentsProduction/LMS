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
                        default: 0,
                    },
                    totalDuration: {
                        type: Number,
                        default: 0,
                    },
                    watchPercentage: {
                        type: Number,
                        default: 0,
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

// Most queried: fetch all progress for a user
TrainingProgressSchema.index({ userId: 1 });
// Fetch all users on a specific training (reassign, reports)
TrainingProgressSchema.index({ trainingId: 1 });
// Compound: the most common query pattern - user + training lookup
TrainingProgressSchema.index({ userId: 1, trainingId: 1 }, { unique: true });
// Dashboard and reassignment reports frequently filter training progress by training + status
TrainingProgressSchema.index({ trainingId: 1, status: 1 });
// Filter by status (Pending/In Progress/Completed dashboards)
TrainingProgressSchema.index({ status: 1 });
// Overdue detection queries filter by deadline
TrainingProgressSchema.index({ deadline: 1 });
TrainingProgressSchema.index({ trainingId: 1, deadline: 1 });
// Bulk user queries: find all progress for a set of userIds
TrainingProgressSchema.index({ userId: 1, status: 1 });
TrainingProgressSchema.index({ userId: 1, deadline: 1 });

const TrainingProgress = mongoose.model('TrainingProgress', TrainingProgressSchema);
export default TrainingProgress;

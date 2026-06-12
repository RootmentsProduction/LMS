import mongoose from 'mongoose';

/**
 * CronLog — persists a record for every cron job execution so admins can
 * review history and verify that the scheduled sync is actually running.
 */
const cronLogSchema = new mongoose.Schema(
    {
        // Which job fired: 'walkin_status_sync' | 'walkin_loss_expiry'
        jobType: {
            type: String,
            required: true,
            enum: ['walkin_status_sync', 'walkin_loss_expiry'],
            index: true,
        },

        // 'success' | 'error'
        status: {
            type: String,
            required: true,
            enum: ['success', 'error'],
        },

        // When the job started
        startedAt: { type: Date, required: true },

        // When the job finished
        completedAt: { type: Date },

        // Duration in milliseconds
        durationMs: { type: Number },

        // Summary data for walkin_status_sync
        summary: {
            totalBookings:      { type: Number, default: 0 },
            totalRentouts:      { type: Number, default: 0 },
            totalReturns:       { type: Number, default: 0 },
            totalDeletes:       { type: Number, default: 0 },
            totalWalkinsUpdated: { type: Number, default: 0 },
            errorsCount:        { type: Number, default: 0 },
        },

        // Summary for walkin_loss_expiry
        expiredCount: { type: Number, default: 0 },

        // Array of per-branch results (walkin_status_sync only)
        branchResults: [
            {
                locCode:         String,
                workingBranch:   String,
                bookings:        Number,
                rentouts:        Number,
                returns:         Number,
                deletes:         Number,
                matched:         Number,
                updated:         Number,
                skipped:         Number,
            }
        ],

        // Array of per-branch errors
        errorDetails: [
            {
                branch: String,
                type:   String,
                error:  String,
            }
        ],

        // High-level error message if the entire job failed
        errorMessage: { type: String },
    },
    {
        timestamps: true, // adds createdAt / updatedAt automatically
        collection: 'cronlogs',
    }
);

// Keep only 90 days of logs to avoid unbounded growth
cronLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model('CronLog', cronLogSchema);

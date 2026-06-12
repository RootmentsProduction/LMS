import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    body: {
        type: String,
        required: true,
        trim: true,
    },
    branch: {
        type: [String],
        default: [],
    },
    user: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
    Role: {
        type: [String],
        default: [],
    },
    useradmin: {
        type: String,
        default: "",
    },
    category: {
        type: String,
        default: "Training",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Sorted by latest first on every fetch
notificationSchema.index({ createdAt: -1 });
// Filter notifications by category
notificationSchema.index({ category: 1 });
// Filter notifications targeted at specific users
notificationSchema.index({ user: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

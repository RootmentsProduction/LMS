import mongoose from "mongoose";

const userLoginSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    // Enhanced device information
    deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        required: true
    },
    deviceOS: {
        type: String,
        enum: ['windows', 'mac', 'linux', 'android', 'ios', 'unknown'],
        required: true
    },
    deviceModel: {
        type: String,
        default: 'Unknown'
    },
    deviceBrand: {
        type: String,
        default: 'Unknown'
    },
    deviceManufacturer: {
        type: String,
        default: 'Unknown'
    },
    // Enhanced browser information
    browser: {
        type: String,
        required: true
    },
    browserVersion: {
        type: String,
        required: true
    },
    browserEngine: {
        type: String,
        default: 'Unknown'
    },
    browserEngineVersion: {
        type: String,
        default: 'Unknown'
    },
    // Platform information
    platform: {
        type: String,
        default: 'Unknown'
    },
    platformVersion: {
        type: String,
        default: 'Unknown'
    },
    // Screen information
    screenResolution: {
        width: Number,
        height: Number
    },
    screenOrientation: {
        type: String,
        enum: ['portrait', 'landscape', 'unknown'],
        default: 'unknown'
    },
    // Network information
    connectionType: {
        type: String,
        default: 'Unknown'
    },
    // Original fields
    userAgent: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        country: String,
        city: String,
        region: String,
        timezone: String,
        latitude: Number,
        longitude: Number
    },
    loginTime: {
        type: Date,
        default: Date.now
    },
    logoutTime: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sessionDuration: {
        type: Number, // in minutes
        default: 0
    },
    loginSource: {
        type: String,
        enum: ['main-app', 'lms-website', 'mobile-app'],
        default: 'main-app'
    }
}, {
    timestamps: true
});

// Index for better query performance
userLoginSessionSchema.index({ userId: 1, loginTime: -1 });
userLoginSessionSchema.index({ deviceType: 1, deviceOS: 1 });
userLoginSessionSchema.index({ browser: 1, browserVersion: 1 });
userLoginSessionSchema.index({ deviceBrand: 1, deviceModel: 1 });
userLoginSessionSchema.index({ isActive: 1 });
userLoginSessionSchema.index({ loginSource: 1 });

const UserLoginSession = mongoose.model('UserLoginSession', userLoginSessionSchema);

export default UserLoginSession;

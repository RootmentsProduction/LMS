import mongoose from 'mongoose';

const walkinSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        type: String,
        required: true,
        trim: true,
        index: true          // unique customer lookup
    },
    functionDate: {
        type: String,
        default: '-',
        trim: true
    },
    store: {
        type: String,
        default: '-',
        trim: true
    },
    staff: {
        type: String,
        default: 'None',
        trim: true
    },
    managerName: {
        type: String,
        default: '-',
        trim: true
    },
    category: {
        type: String,
        default: '-',
        trim: true
    },
    subCategory: {
        type: String,
        default: '-',
        trim: true
    },
    remarks: {
        type: String,
        default: '-',
        trim: true
    },
    repeatCount: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        default: 'New Walkin',
        trim: true
    },
    lastStatusChangeDate: {
        type: Date,
        default: null
    },
    statusChangedToday: {
        type: Boolean,
        default: false
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    attachment: {
        type: String,
        default: ''
    },
    attachmentName: {
        type: String,
        default: ''
    },
    legacyMeta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Role-based filtering queries by store
walkinSchema.index({ store: 1 });
walkinSchema.index({ storeId: 1 });
walkinSchema.index({ employeeId: 1 });
// Dashboard date-range filtering
walkinSchema.index({ createdAt: -1 });
// Status filter (New Walkin, Booked, etc.)
walkinSchema.index({ status: 1 });
// Compound: store + createdAt — the most common dashboard query
walkinSchema.index({ store: 1, createdAt: -1 });
walkinSchema.index({ storeId: 1, createdAt: -1 });
walkinSchema.index({ employeeId: 1, createdAt: -1 });
walkinSchema.index({ contact: 1, createdAt: -1 });

const Walkin = mongoose.model('Walkin', walkinSchema);

export default Walkin;

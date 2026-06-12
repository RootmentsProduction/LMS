import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'hr_admin', 'cluster_admin', 'store_admin'],
        required: true,
        unique: true,
    },
    permissions: {
        canCreateTraining: { type: Boolean, default: false },
        canCreateAssessment: { type: Boolean, default: false },
        canReassignTraining: { type: Boolean, default: false },
        canReassignAssessment: { type: Boolean, default: false },
        canDeleteTraining: { type: Boolean, default: false },
        canDeleteAssessment: { type: Boolean, default: false },
    },
}, { timestamps: true });

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;

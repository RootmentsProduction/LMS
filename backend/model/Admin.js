import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phoneNumber: { type: String, default: "", },
    EmpId: { type: String, required: true },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'hr_admin', 'cluster_admin', 'store_admin', 'employee'],
        required: true,
    },
    subRole: {
        type: String,
        default: 'NR',
        required: true,
    },
    password: { type: String, min: 6, },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    assignedClusters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' }],
    employeeId: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Queried by role to find super_admins and filter by admin type
adminSchema.index({ role: 1 });
// EmpId lookups during sync
adminSchema.index({ EmpId: 1 });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;








import mongoose from "mongoose";


const branchSchema = new mongoose.Schema({
    locCode: {
        type: String,
        required: true,
        unique: true,
    },
    workingBranch: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        default: "",
        required: true,
    },
    location: {
        type: String,
        default: "",
        required: true,
    }, address: {
        type: String,
        default: "",
        required: true
    },
    manager: {
        type: String,
        default: "",
        required: true
    },
    clusterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cluster'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});

// locCode is already unique (acts as index), add workingBranch for name-based lookups
branchSchema.index({ workingBranch: 1 });
branchSchema.index({ locCode: 1, workingBranch: 1 });
branchSchema.index({ isActive: 1, workingBranch: 1 });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;

import mongoose from 'mongoose';

const clusterSchema = new mongoose.Schema({
    clusterName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

const Cluster = mongoose.model('Cluster', clusterSchema);

export default Cluster;

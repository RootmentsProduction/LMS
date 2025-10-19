import mongoose from 'mongoose';

const googleFormLinkSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'Google Form Assessment'
    },
    url: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Basic URL validation - should be a valid Google Forms URL
                return /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9-_]+\/.*$/.test(v);
            },
            message: 'Please provide a valid Google Forms URL'
        }
    },
    description: {
        type: String,
        trim: true,
        default: 'Complete this assessment form'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Index for faster queries
googleFormLinkSchema.index({ isActive: 1 });

const GoogleFormLink = mongoose.model('GoogleFormLink', googleFormLinkSchema);

export default GoogleFormLink;

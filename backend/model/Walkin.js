import mongoose from 'mongoose';

const walkinSchema = new mongoose.Schema({
    date: {
        type: String,
        default: '-'
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
    functionType: {
        type: String,
        default: '-',
        trim: true
    },
    remarks: {
        type: String,
        default: '-',
        trim: true
    },
    notes: {
        type: String,
        default: '',
        trim: true
    },
    lossProductType: {
        type: String,
        default: '',
        trim: true
    },
    lossSize: {
        type: String,
        default: '',
        trim: true
    },
    lossColour: {
        type: String,
        default: '',
        trim: true
    },
    lossSalesPrice: {
        type: String,
        default: '',
        trim: true
    },
    lossSelectRemarks: {
        type: String,
        default: '',
        trim: true
    },
    lossReason: {
        type: String,
        default: '',
        trim: true
    },
    lossEnquiryTrailOption: {
        type: String,
        default: '',
        trim: true
    },
    lossEnquiryRevisitDate: {
        type: String,
        default: '',
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
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        category: {
            type: String,
            default: '-'
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    bookingDate: {
        type: Date,
        default: null
    },
    rentoutDate: {
        type: Date,
        default: null
    },
    returnDate: {
        type: Date,
        default: null
    },
    cancelDate: {
        type: Date,
        default: null
    },
    cancellationDate: {
        type: Date,
        default: null
    },
    rentalStatus: {
        type: String,
        default: 'New Walkin',
        trim: true
    },
    shoeStatus: {
        type: String,
        default: '-',
        trim: true
    },
    billedDate: {
        type: Date,
        default: null
    },
    billReturnedDate: {
        type: Date,
        default: null
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
    invoiceNo: {
        type: String,
        default: null,
        trim: true
    },
    shoeInvoiceNo: {
        type: String,
        default: null,
        trim: true
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
// Sort by latest changed or updated
walkinSchema.index({ updatedAt: -1 });
// Status filter (New Walkin, Booked, etc.)
walkinSchema.index({ status: 1 });
walkinSchema.index({ rentalStatus: 1 });
walkinSchema.index({ shoeStatus: 1 });
// Compound: store + createdAt — the most common dashboard query
walkinSchema.index({ store: 1, createdAt: -1 });
walkinSchema.index({ storeId: 1, createdAt: -1 });
walkinSchema.index({ employeeId: 1, createdAt: -1 });
walkinSchema.index({ contact: 1, createdAt: -1 });
// Compound: store + updatedAt — optimized query patterns
walkinSchema.index({ store: 1, updatedAt: -1 });
walkinSchema.index({ storeId: 1, updatedAt: -1 });
walkinSchema.index({ employeeId: 1, updatedAt: -1 });
walkinSchema.index({ contact: 1, updatedAt: -1 });
// Invoice-based matching for sync
walkinSchema.index({ invoiceNo: 1 }, { sparse: true });
walkinSchema.index({ storeId: 1, invoiceNo: 1 });
walkinSchema.index({ shoeInvoiceNo: 1 }, { sparse: true });
walkinSchema.index({ storeId: 1, shoeInvoiceNo: 1 });

const Walkin = mongoose.model('Walkin', walkinSchema);

export default Walkin;

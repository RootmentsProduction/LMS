import mongoose from 'mongoose';

// Define schema for employee data
const employeeSchema = new mongoose.Schema({
    employeeId: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    firstName: { 
        type: String, 
        required: true,
        trim: true
    },
    lastName: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: { 
        type: String, 
        required: true,
        trim: true
    },
    department: { 
        type: String, 
        required: true,
        trim: true
    },
    designation: { 
        type: String, 
        required: true,
        trim: true
    },
    dateOfJoining: { 
        type: Date, 
        required: true 
    },
    salary: { 
        type: Number, 
        required: true,
        min: 0
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'India' }
    },
    emergencyContact: {
        name: { type: String, trim: true },
        relationship: { type: String, trim: true },
        phoneNumber: { type: String, trim: true }
    },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Terminated'], 
        default: 'Active' 
    },
    manager: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Pre-save middleware to update the updatedAt field
employeeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for better query performance
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });

// Create the model with collection name 'employeedata'
const Employee = mongoose.model('Employee', employeeSchema, 'employeedata');

export default Employee;
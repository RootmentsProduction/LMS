import mongoose from 'mongoose';

// Define the schema for Visibility
const visibilitySchema = new mongoose.Schema(
  {
    Assessment: [
      {
        role: {
          type: String,
          enum: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'telecaller'],
          required: true,
        },
        visibility: {
          type: Boolean,
          required: true,
        },
      },
    ],
    training: [
      {
        role: {
          type: String,
          enum: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'telecaller'],
          required: true,
        },
        visibility: {
          type: Boolean,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Model: Visibility
const Visibility = mongoose.model('Visibility', visibilitySchema);

export default Visibility;

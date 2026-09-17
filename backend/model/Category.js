import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['task', 'auto'], default: 'task', index: true },
  subCategories: [{ type: String, trim: true }],
  allowedRoles: [{ type: String, trim: true }] // E.g., ['super_admin', 'admin', 'store_admin']
}, { timestamps: true });

categorySchema.index({ name: 1, type: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

export const seedDefaultCategories = async () => {
  try {
    // Drop the old unique index on 'name' if it exists, to allow the compound index { name: 1, type: 1 }
    try {
      await Category.collection.dropIndex('name_1');
      console.log('🗑️ Dropped legacy unique index name_1 from categories collection');
    } catch (e) {
      // Index might not exist or already dropped, ignore
    }

    const defaults = [
      {
        name: 'REPORTS&PERFORMANCE',
        subCategories: ['POS REPORTS', 'PERFORMANCE REPORTS', 'RECORDS&DOCUMENTS'],
        allowedRoles: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'employee'],
        type: 'task'
      },
      {
        name: 'STORE HYGIENE&CLEANING',
        subCategories: ['DEEP CLEANING', 'VISUAL MERCHANDISING', 'PRODUCT CLEANING'],
        allowedRoles: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'employee'],
        type: 'task'
      },
      {
        name: 'INVENTORY AUDIT&MANAGEMENT',
        subCategories: ['STOCK VALUATION&VERIFICATION', 'INTER STORE STOCK TRANSFER'],
        allowedRoles: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'employee'],
        type: 'task'
      },
      {
        name: 'EMPLOYEE MANAGEMENT&DEVELOPMENT',
        subCategories: ['EMPLOYEE TRAININGS', 'EMPLOYEE PERFORMANCE REVIEW', 'EMPLOYEE SPECIFIC TASK'],
        allowedRoles: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'employee'],
        type: 'task'
      },
      {
        name: 'MAINTENANCE',
        subCategories: ['ELECTRICAL', 'PLUMBING', 'CLEANING'],
        allowedRoles: ['super_admin', 'admin', 'hr_admin', 'process_control_manager', 'cluster_admin', 'store_admin', 'office_admin', 'employee'],
        type: 'task'
      }
    ];

    const taskCount = await Category.countDocuments({ type: 'task' });
    if (taskCount === 0) {
      console.log('🌱 Seeding default task categories...');
      await Category.insertMany(defaults);
      console.log('✅ Default task categories seeded successfully!');
    }

    const autoCount = await Category.countDocuments({ type: 'auto' });
    if (autoCount === 0) {
      console.log('🌱 Seeding default auto task categories...');
      const autoDefaults = defaults.map(d => ({
        ...d,
        type: 'auto'
      }));
      await Category.insertMany(autoDefaults);
      console.log('✅ Default auto task categories seeded successfully!');
    }
  } catch (error) {
    console.error('❌ Error seeding default task categories:', error);
  }
};

export default Category;


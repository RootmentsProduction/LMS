import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Flexible schema for trainings
const Training = mongoose.model(
  'Training',
  new mongoose.Schema({}, { strict: false }),
  'trainings'
);

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find and update training(s)
    const result = await Training.updateMany(
      {
        trainingName: { $regex: /^foundation of service$/i },
        Trainingtype: { $regex: /^assigned$/i }
      },
      {
        $set: { Trainingtype: 'Mandatory' }
      }
    );

    console.log(`✅ Update complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Error during update:', error);
  } finally {
    await mongoose.disconnect();
  }
})();

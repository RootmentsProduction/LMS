import mongoose from 'mongoose';
import { Training } from '../model/Traning.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your-db-name', { // Replace with your actual DB connection string
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateTrainingDeadlineDates() {
  try {
    console.log('🔄 Starting to update training deadline dates...');
    
    // Find all trainings that have deadline in days but no deadlineDate
    const trainingsToUpdate = await Training.find({
      deadline: { $type: 'number' }, // Deadline is a number (days)
      $or: [
        { deadlineDate: { $exists: false } }, // deadlineDate doesn't exist
        { deadlineDate: null } // deadlineDate is null
      ]
    });
    
    console.log(`Found ${trainingsToUpdate.length} trainings to update`);
    
    let updatedCount = 0;
    
    for (const training of trainingsToUpdate) {
      try {
        // Calculate deadlineDate from deadline (days) and createdDate
        const deadlineDate = new Date(
          new Date(training.createdDate).getTime() + 
          training.deadline * 24 * 60 * 60 * 1000
        );
        
        // Update the training with deadlineDate
        await Training.findByIdAndUpdate(training._id, {
          deadlineDate: deadlineDate
        });
        
        console.log(`✅ Updated training "${training.trainingName}":`);
        console.log(`   - Original deadline: ${training.deadline} days`);
        console.log(`   - Created date: ${training.createdDate}`);
        console.log(`   - Calculated deadline date: ${deadlineDate}`);
        
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating training ${training._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} out of ${trainingsToUpdate.length} trainings`);
    
    // Show example of updated data
    const sampleTraining = await Training.findOne({ deadlineDate: { $exists: true } });
    if (sampleTraining) {
      console.log('📋 Sample updated training:');
      console.log(`   - Name: ${sampleTraining.trainingName}`);
      console.log(`   - Deadline (days): ${sampleTraining.deadline}`);
      console.log(`   - Deadline Date: ${sampleTraining.deadlineDate}`);
      console.log(`   - Created Date: ${sampleTraining.createdDate}`);
    }
    
  } catch (error) {
    console.error('❌ Error updating deadline dates:', error);
  }
  
  // Close database connection
  mongoose.connection.close();
}

// Run the update
updateTrainingDeadlineDates();

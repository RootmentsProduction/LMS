import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/User.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Test function to check training data
const testDatabase = async () => {
    try {
        console.log('🔍 Testing database for training data...\n');
        
        // Find users with training
        const usersWithTraining = await User.find({
            'training.0': { $exists: true },
            'training': { $ne: [] }
        });
        
        console.log(`📊 Found ${usersWithTraining.length} users with training assignments\n`);
        
        // Check first 5 users
        for (let i = 0; i < Math.min(5, usersWithTraining.length); i++) {
            const user = usersWithTraining[i];
            const training = user.training || [];
            
            console.log(`👤 User: ${user.username || user.name}`);
            console.log(`🏢 Branch: ${user.workingBranch}`);
            console.log(`📚 Total Training: ${training.length}`);
            
            // Count completed vs pending
            const completed = training.filter(t => t.pass === true).length;
            const pending = training.filter(t => t.pass === false).length;
            
            console.log(`✅ Completed: ${completed}`);
            console.log(`⏳ Pending: ${pending}`);
            
            // Show first few training items
            training.slice(0, 3).forEach((item, index) => {
                console.log(`  ${index + 1}. Training ID: ${item.trainingId}, Pass: ${item.pass}, Progress: ${item.progress || 'N/A'}`);
            });
            
            console.log('---\n');
        }
        
        // Check if there are any completed trainings
        const completedTrainings = await User.find({
            'training.pass': true
        });
        
        console.log(`🎯 Users with completed training: ${completedTrainings.length}`);
        
        if (completedTrainings.length > 0) {
            console.log('✅ Database has completed training data!');
        } else {
            console.log('❌ No completed training found in database');
        }
        
    } catch (error) {
        console.error('❌ Error testing database:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await testDatabase();
    } catch (error) {
        console.error('❌ Script failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the script
main();

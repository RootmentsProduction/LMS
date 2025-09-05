import mongoose from 'mongoose';
import TrainingProgress from './model/Trainingprocessschema.js';

const checkTrainingProgress = async () => {
    console.log('🔍 Checking Training Progress...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/lms');
        console.log('✅ Connected to MongoDB');
        
        const userId = '68b2ecf4c8ad2931fc91b8b6';
        const trainingId = '68ac20df6c7886e2b95ae53a';
        
        console.log('🔍 Looking for training progress...');
        console.log('User ID:', userId);
        console.log('Training ID:', trainingId);
        
        // Check if training progress exists
        const trainingProgress = await TrainingProgress.findOne({ 
            userId, 
            trainingId 
        });
        
        if (trainingProgress) {
            console.log('✅ Training progress found!');
            console.log('📊 Training Progress Data:');
            console.log(JSON.stringify(trainingProgress, null, 2));
            
            // Check modules
            console.log('📋 Modules count:', trainingProgress.modules.length);
            trainingProgress.modules.forEach((module, index) => {
                console.log(`📋 Module ${index + 1}: ${module.moduleId}`);
                console.log(`  Videos count: ${module.videos.length}`);
                module.videos.forEach((video, vIndex) => {
                    console.log(`    🎥 Video ${vIndex + 1}: ${video.videoId} (pass: ${video.pass})`);
                });
            });
        } else {
            console.log('❌ No training progress found for this user and training');
            console.log('🔍 Creating training progress...');
            
            // Create training progress with required fields
            const newTrainingProgress = new TrainingProgress({
                userId: userId,
                trainingId: trainingId,
                trainingName: 'TEST_TRAINING', // Required field
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                pass: false,
                status: 'Pending',
                modules: [
                    {
                        moduleId: '67fe07c109e746f231ec512a',
                        pass: false,
                        videos: [
                            {
                                videoId: '67fe07c109e746f231ec512b',
                                pass: false,
                                watchTime: 0,
                                totalDuration: 0,
                                watchPercentage: 0
                            },
                            {
                                videoId: '67fe07c109e746f231ec512c',
                                pass: false,
                                watchTime: 0,
                                totalDuration: 0,
                                watchPercentage: 0
                            },
                            {
                                videoId: '67fe07c109e746f231ec512d',
                                pass: false,
                                watchTime: 0,
                                totalDuration: 0,
                                watchPercentage: 0
                            },
                            {
                                videoId: '67fe07c109e746f231ec512e',
                                pass: false,
                                watchTime: 0,
                                totalDuration: 0,
                                watchPercentage: 0
                            }
                        ]
                    }
                ]
            });
            
            await newTrainingProgress.save();
            console.log('✅ Training progress created successfully!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
};

checkTrainingProgress();

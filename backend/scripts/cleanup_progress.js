import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../model/User.js';
import TrainingProgress from '../model/Trainingprocessschema.js';
import AssessmentProcess from '../model/Assessmentprocessschema.js';

async function run() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("MONGODB_URI not found in environment variables.");
            process.exit(1);
        }

        console.log(`Connecting to database...`);
        await mongoose.connect(mongoUri);
        console.log(`Connected to database successfully.`);

        // 1. Delete all training progress records
        console.log("Deleting training progress logs...");
        const tpResult = await TrainingProgress.deleteMany({});
        console.log(`Deleted ${tpResult.deletedCount} training progress records.`);

        // 2. Delete all assessment progress records
        console.log("Deleting assessment progress logs...");
        const apResult = await AssessmentProcess.deleteMany({});
        console.log(`Deleted ${apResult.deletedCount} assessment progress records.`);

        // 3. Clear progress assignments from all users
        console.log("Clearing assigned training and assessments from users...");
        const userResult = await User.updateMany({}, {
            $set: {
                assignedModules: [],
                assignedAssessments: [],
                training: []
            }
        });
        console.log(`Updated ${userResult.modifiedCount} user profiles.`);

        console.log("Database cleanup completed successfully! All training and assessment progress has been reset.");
        process.exit(0);
    } catch (err) {
        console.error("Error during cleanup:", err);
        process.exit(1);
    }
}

run();

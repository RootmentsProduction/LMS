import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    console.log('--- DETAILED LATEST CRON LOG ---');
    const log = await db.collection('cronlogs').findOne({}, { sort: { runAt: -1, _id: -1 } });
    if (!log) {
        console.log('No cron logs found.');
    } else {
        console.log(`Job ID: ${log._id}`);
        console.log(`Job Type: ${log.jobType}`);
        console.log(`StartedAt: ${log.startedAt || log.runAt}`);
        console.log(`CompletedAt: ${log.completedAt}`);
        console.log(`Status: ${log.status}`);
        console.log(`Duration: ${log.durationMs}ms`);
        console.log(`Summary:`, JSON.stringify(log.summary, null, 2));
        
        if (log.errors && log.errors.length > 0) {
            console.log(`Errors count: ${log.errors.length}`);
            console.log(`Sample Errors:`, JSON.stringify(log.errors.slice(0, 10), null, 2));
        } else {
            console.log('No errors recorded in this run.');
        }

        // Let's check some logs or properties if they exist
        const fields = Object.keys(log);
        console.log(`Log document keys:`, fields);
    }

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
});

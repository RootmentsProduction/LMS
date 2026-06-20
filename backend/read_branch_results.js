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

    const log = await db.collection('cronlogs').findOne({}, { sort: { runAt: -1, _id: -1 } });
    if (log && log.branchResults) {
        console.log('--- BRANCH RESULTS FROM LATEST CRON LOG ---');
        console.log(JSON.stringify(log.branchResults, null, 2));
    } else {
        console.log('No branch results found.');
    }

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
});

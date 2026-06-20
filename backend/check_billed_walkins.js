import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Walkin from './model/Walkin.js';

async function main() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to database.');

    // Count by shoeStatus
    const billedCount = await Walkin.countDocuments({ shoeStatus: 'Billed' });
    const billReturnedCount = await Walkin.countDocuments({ shoeStatus: 'Bill Returned' });
    const emptyShoeStatusCount = await Walkin.countDocuments({ shoeStatus: '-' });
    const totalWalkins = await Walkin.countDocuments({});

    console.log(`\n--- SHOE STATUS STATISTICS ---`);
    console.log(`Total Walk-ins in DB: ${totalWalkins}`);
    console.log(`Shoe Status 'Billed': ${billedCount}`);
    console.log(`Shoe Status 'Bill Returned': ${billReturnedCount}`);
    console.log(`Shoe Status '-': ${emptyShoeStatusCount}`);

    // Print some sample Billed/Bill Returned walk-ins
    console.log(`\n--- SAMPLE BILLED WALK-INS (First 5) ---`);
    const samples = await Walkin.find({ shoeStatus: { $in: ['Billed', 'Bill Returned'] } }).limit(5).lean();
    if (samples.length === 0) {
        console.log('No walk-ins with shoe status Billed or Bill Returned found in the database!');
    } else {
        samples.forEach(s => {
            console.log(`Name: ${s.customerName} | Contact: ${s.contact} | Store: ${s.store} | Status: ${s.status} | Rental: ${s.rentalStatus} | Shoe: ${s.shoeStatus} | UpdatedAt: ${s.updatedAt}`);
        });
    }

    // Check Cron logs
    console.log(`\n--- LATEST CRON LOGS ---`);
    const db = mongoose.connection.db;
    const logs = await db.collection('cronlogs').find({}).sort({ runAt: -1, _id: -1 }).limit(3).toArray();
    logs.forEach(l => {
        console.log(`StartedAt: ${l.startedAt || l.runAt} | Status: ${l.status} | Duration: ${l.durationMs}ms`);
        console.log(`  Summary: ${JSON.stringify(l.summary)}`);
        if (l.errors && l.errors.length > 0) {
            console.log(`  Errors (First 5):`);
            l.errors.slice(0, 5).forEach(e => console.log(`    - Branch ${e.branch} (${e.type}): ${e.error}`));
        }
    });

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
});

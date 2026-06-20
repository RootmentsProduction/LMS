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

    const walkin = await db.collection('walkins').findOne({ _id: new mongoose.Types.ObjectId("6a2fc4d410bf0bc7d1757969") });
    if (!walkin) {
        console.log('Walk-in not found');
    } else {
        console.log('Full Walk-in Record:');
        console.log(JSON.stringify(walkin, null, 2));
    }

    await mongoose.disconnect();
}

main().catch(console.error);

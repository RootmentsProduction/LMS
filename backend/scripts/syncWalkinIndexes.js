import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Walkin from '../model/Walkin.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const indexes = await Walkin.syncIndexes();
  console.log('Walkin indexes synced:', indexes);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Failed to sync walkin indexes:', error);
  process.exit(1);
});

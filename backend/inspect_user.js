import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Admin from './model/Admin.js';
import User from './model/User.js';
import Employee from './model/Employee.js';
import Branch from './model/Branch.js';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected');

  const id = '6a1fe984b7cd1be0b146e594';
  
  console.log('\n--- Checking Admin collection ---');
  const admin = await Admin.findById(id).populate('branches').lean();
  console.log(JSON.stringify(admin, null, 2));

  console.log('\n--- Checking User collection ---');
  const user = await User.findById(id).lean();
  console.log(JSON.stringify(user, null, 2));

  console.log('\n--- Checking Employee collection ---');
  const emp = await Employee.findOne({ userId: id }).populate('storeId').lean();
  console.log(JSON.stringify(emp, null, 2));

  // Search by name/username for HRDEPARTMENT
  console.log('\n--- Searching for HR DEPARTMENT or HR Admin ---');
  const allAdmins = await Admin.find({ $or: [{ name: /hr/i }, { email: /hr/i }] }).populate('branches').lean();
  console.log('Admins found:', allAdmins);

  const allUsers = await User.find({ $or: [{ username: /hr/i }, { email: /hr/i }] }).lean();
  console.log('Users found:', allUsers);

  await mongoose.disconnect();
}

main().catch(console.error);

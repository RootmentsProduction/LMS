import mongoose from 'mongoose';
import connectMongoDB from './db/database.js';
import User from './model/User.js';
import Admin from './model/Admin.js';
import Branch from './model/Branch.js';
import Employee from './model/Employee.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectMongoDB();
  try {
    const emp = await Employee.findOne({ $or: [{ employeeId: 'Emp515' }, { firstName: /farsin/i }] }).lean();
    console.log('--- Employee Record (Employee collection) ---');
    console.log(emp ? JSON.stringify(emp, null, 2) : 'Not found in Employee collection');

    const user = await User.findOne({ $or: [{ empID: 'Emp515' }, { username: /farsin/i }] }).lean();
    console.log('--- User Record (User collection) ---');
    console.log(user ? JSON.stringify(user, null, 2) : 'Not found in User collection');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();

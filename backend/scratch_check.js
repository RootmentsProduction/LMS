import mongoose from 'mongoose';
import connectMongoDB from './db/database.js';
import User from './model/User.js';
import Employee from './model/Employee.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectMongoDB();
  try {
    const employees = await Employee.find({ $or: [{ firstName: /sumesh/i }, { lastName: /sumesh/i }] }).lean();
    console.log('--- Matching Employees in Employee collection ---');
    console.log(JSON.stringify(employees, null, 2));

    const users = await User.find({ $or: [{ username: /sumesh/i }, { email: /sumesh/i }] }).lean();
    console.log('--- Matching Users in User collection ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();

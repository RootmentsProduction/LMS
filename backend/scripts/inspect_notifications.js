import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  console.log("Connected to MongoDB");
  const targetId = new mongoose.Types.ObjectId('6a1fe984b7cd1be0b146e594');

  const User = mongoose.connection.collection('users');
  const Employee = mongoose.connection.collection('employeedata');
  const Admin = mongoose.connection.collection('admins');

  const isUser = await User.findOne({ _id: targetId });
  const isEmployee = await Employee.findOne({ _id: targetId });
  const isAdmin = await Admin.findOne({ _id: targetId });

  console.log(`Checking ID: 6a1fe984b7cd1be0b146e594`);
  console.log(`- Is User: ${isUser ? `Yes, username=${isUser.username}, email=${isUser.email}` : 'No'}`);
  console.log(`- Is Employee: ${isEmployee ? `Yes, name=${isEmployee.firstName} ${isEmployee.lastName}, email=${isEmployee.email}` : 'No'}`);
  console.log(`- Is Admin: ${isAdmin ? `Yes, name=${isAdmin.name}, email=${isAdmin.email}` : 'No'}`);

  process.exit(0);
}).catch(err => {
  console.error("DB connection error:", err);
  process.exit(1);
});

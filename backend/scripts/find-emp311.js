import mongoose from 'mongoose';
import User from '../model/User.js';

const MONGODB_URL = 'mongodb://localhost:27017/lms';

async function findEmp311() {
    try {
        await mongoose.connect(MONGODB_URL);
        
        // Search for users with 311 in empID (case insensitive)
        const users311 = await User.find({ 
            empID: { $regex: '311', $options: 'i' } 
        });
        
        console.log('Users with 311 in empID:');
        users311.forEach(u => {
            console.log(`- empID: ${u.empID} | Name: ${u.username} | Email: ${u.email}`);
        });
        
        // Direct search for exact variations
        const directSearch = await User.find({ 
            empID: { $in: ['emp311', 'Emp311', 'EMP311'] } 
        });
        
        console.log('\nDirect emp311 variations found:');
        directSearch.forEach(u => {
            console.log(`- empID: ${u.empID} | Name: ${u.username} | Email: ${u.email}`);
        });
        
        // Search by email
        const byEmail = await User.findOne({ email: 'akashavk710@gmail.com' });
        if (byEmail) {
            console.log('\nUser found by email:');
            console.log(`- empID: ${byEmail.empID} | Name: ${byEmail.username}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

findEmp311();

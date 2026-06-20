import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Branch from './model/Branch.js';
import Employee from './model/Employee.js';
import User from './model/User.js';
import Admin from './model/Admin.js';

// Helpers duplicate from backend controller
const getLocalDateStringIST = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

async function main() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not found');
        process.exit(1);
    }
    await mongoose.connect(mongoUri);

    // 1. Resolve Branch for locCode 144
    const resolvedStore = await Branch.findOne({ locCode: '144' });
    if (!resolvedStore) {
        console.log(JSON.stringify({ employees: [] }, null, 2));
        await mongoose.disconnect();
        return;
    }

    // 2. Fetch Active Employees for storeId
    let employees = await Employee.find({ storeId: resolvedStore._id, status: 'Active' }).lean();
    employees = employees.map(emp => ({
        ...emp,
        username: emp.username || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    }));

    // 3. Fallback: If no employees in employeedata, query User collection
    if (employees.length === 0) {
        const users = await User.find({ locCode: '144' }).lean();
        employees = users.map(u => ({
            _id: u._id,
            employeeId: u.empID,
            username: u.username,
            firstName: u.username.split(' ')[0] || '',
            lastName: u.username.split(' ').slice(1).join(' ') || '',
            email: u.email,
            phoneNumber: u.phoneNumber,
            designation: u.designation,
            workingBranch: u.workingBranch,
            locCode: u.locCode,
            status: 'Active'
        }));
    }

    // 4. Fetch store admins and cluster admins for the store
    const storeAdmins = await Admin.find({ 
        role: { $in: ['store_admin', 'cluster_admin'] }, 
        isActive: true,
        branches: resolvedStore._id
    }).lean();

    const mappedStoreAdmins = storeAdmins.map(sa => {
        return {
            _id: sa._id,
            employeeId: sa.EmpId || sa.employeeId || '',
            username: sa.name,
            firstName: sa.name.split(' ')[0] || '',
            lastName: sa.name.split(' ').slice(1).join(' ') || '',
            email: sa.email,
            phoneNumber: sa.phoneNumber,
            designation: sa.role === 'cluster_admin' ? 'Cluster Admin' : 'Store Admin',
            workingBranch: resolvedStore.workingBranch,
            status: 'Active'
        };
    });

    // 5. Combine and deduplicate
    const combinedEmployees = [...employees, ...mappedStoreAdmins];
    const seenIds = new Set();
    const seenEmails = new Set();
    const seenEmpIds = new Set();
    const uniqueEmployees = [];

    for (const emp of combinedEmployees) {
        const empIdStr = emp._id.toString();
        const emailKey = emp.email?.toLowerCase().trim();
        const empCodeKey = (emp.employeeId || emp.empID || '').toString().toLowerCase().trim();
        
        if (seenIds.has(empIdStr)) continue;
        if (emailKey && seenEmails.has(emailKey)) continue;
        if (empCodeKey && seenEmpIds.has(empCodeKey)) continue;
        
        seenIds.add(empIdStr);
        if (emailKey) seenEmails.add(emailKey);
        if (empCodeKey) seenEmpIds.add(empCodeKey);
        
        uniqueEmployees.push(emp);
    }

    // 6. Exclude Super Admins, Admins, and HR Admins
    const excludedAdminRoles = ['super_admin', 'admin', 'hr_admin'];
    const adminsList = await Admin.find({ role: { $in: excludedAdminRoles } }).select('email EmpId employeeId').lean();
    const adminEmails = new Set(adminsList.map(a => a.email?.toLowerCase().trim()).filter(Boolean));
    const adminEmpIds = new Set([
        ...adminsList.map(a => a.EmpId?.toLowerCase().trim()).filter(Boolean),
        ...adminsList.map(a => (a.employeeId || '')?.toLowerCase().trim()).filter(Boolean)
    ]);

    const filteredEmployees = uniqueEmployees.filter(emp => {
        const empEmail = emp.email?.toLowerCase().trim();
        const empId = (emp.employeeId || emp.empID)?.toLowerCase().trim();
        const isMatch = adminEmails.has(empEmail) || adminEmpIds.has(empId);
        return !isMatch;
    });

    // Print JSON output
    console.log(JSON.stringify({ employees: filteredEmployees }, null, 2));

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
});

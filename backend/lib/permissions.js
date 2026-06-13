import Admin from '../model/Admin.js';
import Branch from '../model/Branch.js';
import Employee from '../model/Employee.js';
import Cluster from '../model/Cluster.js';
import User from '../model/User.js';

/**
 * Validates if the user is a super admin or hr admin (full access)
 */
export const isFullAccessAdmin = (adminRole) => {
    return ['super_admin', 'admin', 'hr_admin'].includes(adminRole);
};

/**
 * Gets an array of accessible store ObjectIds based on admin role
 */
export const getAccessibleStoreIds = async (adminId) => {
    const admin = await Admin.findById(adminId).populate('branches assignedClusters');
    if (!admin) {
        // Fallback: Check if this is a regular User (employee)
        const user = await User.findById(adminId);
        if (!user) return [];
        
        // Find the Branch matching the user's locCode/workingBranch
        const branch = await Branch.findOne({ 
            $or: [
                { locCode: user.locCode },
                { workingBranch: user.workingBranch }
            ]
        });
        return branch ? [branch._id.toString()] : [];
    }

    if (isFullAccessAdmin(admin.role)) {
        // Full access: return all branch IDs
        const allBranches = await Branch.find({ isActive: true }).select('_id');
        return allBranches.map(b => b._id.toString());
    }

    if (admin.role === 'cluster_admin') {
        // Can access all stores in their assigned clusters, plus any individually assigned stores
        const clusterIds = admin.assignedClusters.map(c => c._id);
        const clusterBranches = await Branch.find({ clusterId: { $in: clusterIds }, isActive: true }).select('_id');

        const branchIds = new Set([
            ...clusterBranches.map(b => b._id.toString()),
            ...admin.branches.map(b => (b._id || b).toString())
        ]);
        return Array.from(branchIds);
    }

    if (admin.role === 'store_admin') {
        // Can access only specifically assigned stores
        return admin.branches.map(b => (b._id || b).toString());
    }

    return [];
};

/**
 * Validates if an admin has access to a specific store
 */
export const validateStoreAccess = async (adminId, storeId) => {
    const accessibleStoreIds = await getAccessibleStoreIds(adminId);
    if (!accessibleStoreIds.includes(storeId.toString())) {
        throw new Error('Access denied: You do not have permission to access this store.');
    }
    return true;
};

/**
 * Gets an array of accessible employee ObjectIds based on admin role
 */
export const getAccessibleEmployeeIds = async (adminId, storeId = null) => {
    const admin = await Admin.findById(adminId);
    let accessibleStoreIds = [];
    
    if (!admin) {
        // Fallback: Check if this is a regular User (employee)
        const user = await User.findById(adminId);
        if (!user) return [];
        
        const branch = await Branch.findOne({ 
            $or: [
                { locCode: user.locCode },
                { workingBranch: user.workingBranch }
            ]
        });
        accessibleStoreIds = branch ? [branch._id.toString()] : [];
    } else {
        if (isFullAccessAdmin(admin.role)) {
            // Full access: all stores are accessible
            const allBranches = await Branch.find({ isActive: true }).select('_id');
            accessibleStoreIds = allBranches.map(b => b._id.toString());
        } else {
            accessibleStoreIds = await getAccessibleStoreIds(adminId);
        }
    }

    // If a specific store is requested, validate it's within accessible stores
    if (storeId) {
        if (!accessibleStoreIds.includes(storeId.toString())) {
            return []; // Access denied to this specific store
        }
        // Restrict to just the requested store
        accessibleStoreIds = [storeId.toString()];
    }

    // Get employees that belong to accessible stores
    const accessibleEmployees = await Employee.find({
        storeId: { $in: accessibleStoreIds },
        status: 'Active'
    }).select('_id');

    // Also get users that belong to accessible stores from User collection (fallback/merge)
    const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const locCodes = branches.map(b => b.locCode);
    const users = await User.find({ locCode: { $in: locCodes } }).select('_id');

    // Also get admins (store/cluster admins) associated with accessible stores, and always include the admin themselves
    const admins = await Admin.find({
        $or: [
            { branches: { $in: accessibleStoreIds } },
            { _id: adminId }
        ]
    }).select('_id');

    const allIds = new Set([
        ...accessibleEmployees.map(e => e._id.toString()),
        ...users.map(u => u._id.toString()),
        ...admins.map(a => a._id.toString()),
        adminId.toString()
    ]);

    return Array.from(allIds);
};

/**
 * Validates if an admin has access to a specific employee
 */
export const validateEmployeeAccess = async (adminId, employeeId) => {
    const accessibleEmployeeIds = await getAccessibleEmployeeIds(adminId);
    if (!accessibleEmployeeIds.includes(employeeId.toString())) {
        throw new Error('Access denied: You do not have permission to access this employee.');
    }
    return true;
};

/**
 * Builds a MongoDB query filter for walk-ins based on admin role
 */
export const buildWalkinFilter = async (adminId, baseQuery = {}) => {
    const admin = await Admin.findById(adminId);
    if (!admin || admin.role === 'employee') {
        // Fallback or Admin employee: Check if this is a regular User (employee)
        const user = admin ? admin : await User.findById(adminId);
        if (!user) return { _id: null }; // Return impossible query if admin or user not found
        
        // Find the Employee document matching the user
        const employee = await Employee.findOne({
            $or: [
                { userId: user._id },
                { employeeId: { $regex: `^${user.empID || user.EmpId || ''}$`, $options: 'i' } }
            ]
        });

        const employeeIds = [user._id.toString()];
        if (employee) {
            employeeIds.push(employee._id.toString());
        }

        const username = user.username || user.name || '';
        const walkinRestriction = {
            $or: [
                { employeeId: { $in: employeeIds } },
                { createdBy: user._id },
                { staff: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
            ]
        };

        // If baseQuery already has a $or (e.g., from a search filter), combine both using $and
        if (baseQuery.$or) {
            const { $or: existingOr, ...rest } = baseQuery;
            return { ...rest, $and: [{ $or: existingOr }, walkinRestriction] };
        }
        return { ...baseQuery, ...walkinRestriction };
    }

    if (isFullAccessAdmin(admin.role)) {
        return baseQuery;
    }

    const accessibleStoreIds = await getAccessibleStoreIds(adminId);

    const branches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const locCodes = branches.map(b => b.locCode);
    const workingBranches = branches.map(b => b.workingBranch);

    const storeRestriction = [
        { storeId: { $in: accessibleStoreIds } },
        { store: { $in: [...locCodes, ...workingBranches] } }
    ];

    // If baseQuery already has a $or (e.g., from a search filter), combine both using $and
    if (baseQuery.$or) {
        const { $or: existingOr, ...rest } = baseQuery;
        return { ...rest, $and: [{ $or: existingOr }, { $or: storeRestriction }] };
    }
    return { ...baseQuery, $or: storeRestriction };
};

/**
 * Builds a MongoDB query filter for tasks based on admin role.
 *
 * Visibility rules:
 *  - Super Admin / HR Admin  → see all tasks
 *  - Cluster Admin           → see tasks they CREATED or where the assignee
 *                              belongs to one of their cluster's stores
 *  - Store Admin             → see tasks they CREATED or where the assignee
 *                              belongs to their store
 *  - Employee / User         → see only tasks assigned directly to them
 */
export const buildTaskFilter = async (adminId, baseQuery = {}) => {
    const admin = await Admin.findById(adminId);

    // ── Employee / User (not in Admin collection) ─────────────────────────────
    if (!admin) {
        const user = await User.findById(adminId);
        if (!user) return { _id: null };

        const employee = await Employee.findOne({
            $or: [
                { userId: user._id },
                { employeeId: { $regex: `^${user.empID}$`, $options: 'i' } }
            ]
        });

        // Employees only see tasks assigned directly to them (by their User ID
        // or linked Employee ID). They do NOT see all store tasks.
        const assignedIds = [user._id.toString()];
        if (employee) {
            assignedIds.push(employee._id.toString());
        }

        const restriction = {
            $or: [
                { assignedTo: { $in: assignedIds } },
                { createdBy: user._id }
            ]
        };

        if (baseQuery.$or) {
            const { $or: existingOr, ...rest } = baseQuery;
            return { ...rest, $and: [{ $or: existingOr }, restriction] };
        }
        return { ...baseQuery, ...restriction };
    }

    // ── Super Admin → full access ─────────────────────────────────────
    if (admin.role === 'super_admin') {
        return baseQuery;
    }

    // ── Admin → creator OR assignee (only tasks assigned to them or created by them) ─────
    if (admin.role === 'admin') {
        const restriction = {
            $or: [
                { createdBy: admin._id },
                { assignedTo: admin._id.toString() }
            ]
        };

        if (baseQuery.$or) {
            const { $or: existingOr, ...rest } = baseQuery;
            return { ...rest, $and: [{ $or: existingOr }, restriction] };
        }
        return { ...baseQuery, ...restriction };
    }

    // ── HR Admin → creator OR assignee ────────────────────────────────────────
    if (admin.role === 'hr_admin') {
        const restriction = {
            $or: [
                { createdBy: admin._id },
                { assignedTo: admin._id.toString() }
            ]
        };

        if (baseQuery.$or) {
            const { $or: existingOr, ...rest } = baseQuery;
            return { ...rest, $and: [{ $or: existingOr }, restriction] };
        }
        return { ...baseQuery, ...restriction };
    }

    // ── Cluster Admin / Store Admin → creator OR assignee in their stores ─────
    const accessibleStoreIds = await getAccessibleStoreIds(adminId);

    // Resolve all employee/user IDs that belong to accessible stores
    const accessibleEmployees = await Employee.find({
        storeId: { $in: accessibleStoreIds },
        status: 'Active'
    }).select('_id').lean();

    const accessibleBranches = await Branch.find({ _id: { $in: accessibleStoreIds } });
    const locCodes = accessibleBranches.map(b => b.locCode);
    const accessibleUsers = await User.find({ locCode: { $in: locCodes } }).select('_id').lean();

    // Also include admins (store_admins) that belong to accessible stores
    const accessibleAdmins = await Admin.find({
        branches: { $in: accessibleStoreIds },
        isActive: true
    }).select('_id').lean();

    const accessibleAssigneeIds = [
        ...accessibleEmployees.map(e => e._id.toString()),
        ...accessibleUsers.map(u => u._id.toString()),
        ...accessibleAdmins.map(a => a._id.toString()),
    ];

    // A task is visible if:
    //   1. The current admin created it (they are the assigner), OR
    //   2. The task's assignedTo is someone within their accessible stores
    const restriction = {
        $or: [
            { createdBy: admin._id },
            { assignedTo: { $in: accessibleAssigneeIds } },
        ]
    };

    if (baseQuery.$or) {
        const { $or: existingOr, ...rest } = baseQuery;
        return { ...rest, $and: [{ $or: existingOr }, restriction] };
    }
    return { ...baseQuery, ...restriction };
};


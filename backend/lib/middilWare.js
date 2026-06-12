import jwt from 'jsonwebtoken';
import Admin from '../model/Admin.js';

export const MiddilWare = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Extract token from header
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // Allow the static system API token used by mobile/Flutter apps
    if (token === 'RootX-production-9d17d9485eb772e79df8564004d4a4d4') {
        try {
            const systemAdmin = await Admin.findOne({ role: 'super_admin' }) || await Admin.findOne();
            if (systemAdmin) {
                req.admin = { 
                    userId: systemAdmin._id.toString(), 
                    role: systemAdmin.role,
                    isSystem: true 
                };
            } else {
                req.admin = { 
                    userId: '000000000000000000000000', 
                    role: 'super_admin',
                    isSystem: true 
                };
            }
            return next();
        } catch (err) {
            console.error('Error resolving system token admin context:', err);
            return res.status(500).json({ message: 'Internal server error during authorization' });
        }
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
        req.admin = decoded; // Attach user info to the request object
        // console.log(token);

        next(); // Pass control to the next middleware/handler
    } catch (err) {
        console.error(err);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

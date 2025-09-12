import jwt from 'jsonwebtoken'
const verifyJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Extract token from Authorization header
    if (!token) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded user data to the request object
        next(); // Proceed to the next middleware or route
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Example protected route

export { verifyJWT };

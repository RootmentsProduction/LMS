import UserLoginSession from '../model/UserLoginSession.js';
import { detectDeviceInfo, getLocationFromIP } from '../utils/deviceDetection.js';

// Track LMS website login (external LMS website)
export const trackLMSWebsiteLogin = async (req, res) => {
    try {
        const { userId, username, email } = req.body;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        
        // Detect device information
        const deviceInfo = detectDeviceInfo(userAgent, ipAddress);
        const location = await getLocationFromIP(ipAddress);
        
        // Create login session with LMS website identifier
        const loginSession = new UserLoginSession({
            userId,
            username,
            email,
            ...deviceInfo,
            location,
            ipAddress,
            loginSource: 'lms-website' // Only LMS website logins
        });
        
        await loginSession.save();
        
        res.status(201).json({
            success: true,
            message: 'LMS website login tracked successfully',
            sessionId: loginSession._id
        });
    } catch (error) {
        console.error('Error tracking LMS website login:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track LMS website login',
            error: error.message
        });
    }
};

// Get count of people who logged into LMS website
export const getLMSWebsiteLoginCount = async (req, res) => {
    try {
        const { period = 'all' } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        switch (period) {
            case '24h':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case '7d':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case '30d':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case 'all':
            default:
                dateFilter = { loginSource: 'lms-website' };
        }
        
        // Get total LMS website logins
        const totalLMSLogins = await UserLoginSession.countDocuments(dateFilter);
        
        // Get unique users who logged into LMS website
        const uniqueLMSUsers = await UserLoginSession.distinct('userId', dateFilter);
        const uniqueLMSUserCount = uniqueLMSUsers.length;
        
        // Get active LMS website sessions
        const activeLMSSessions = await UserLoginSession.countDocuments({ 
            ...dateFilter, 
            isActive: true 
        });
        
        // Get recent LMS website logins (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLMSLogins = await UserLoginSession.countDocuments({
            loginTime: { $gte: last24Hours },
            loginSource: 'lms-website'
        });
        
        // Get device breakdown for LMS website logins
        const deviceStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$deviceType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get OS breakdown for LMS website logins
        const osStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$deviceOS', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get browser breakdown for LMS website logins
        const browserStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                totalLMSLogins,
                uniqueLMSUserCount,
                activeLMSSessions,
                recentLMSLogins,
                deviceStats,
                osStats,
                browserStats,
                period,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting LMS website login count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get LMS website login count',
            error: error.message
        });
    }
};

// Get simple count for frontend display (no authentication required)
export const getLMSWebsiteLoginCountSimple = async (req, res) => {
    try {
        // Get total unique users who logged into LMS website
        const uniqueLMSUsers = await UserLoginSession.distinct('userId', { 
            loginSource: 'lms-website' 
        });
        const uniqueLMSUserCount = uniqueLMSUsers.length;
        
        // Get total LMS website logins
        const totalLMSLogins = await UserLoginSession.countDocuments({ 
            loginSource: 'lms-website' 
        });
        
        // Get active LMS website sessions
        const activeLMSSessions = await UserLoginSession.countDocuments({ 
            loginSource: 'lms-website',
            isActive: true 
        });
        
        // Get recent LMS website logins (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLMSLogins = await UserLoginSession.countDocuments({
            loginTime: { $gte: last24Hours },
            loginSource: 'lms-website'
        });
        
        res.status(200).json({
            success: true,
            data: {
                uniqueLMSUserCount,
                totalLMSLogins,
                activeLMSSessions,
                recentLMSLogins,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting simple LMS website login count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get LMS website login count',
            error: error.message
        });
    }
};

// Get LMS website login analytics
export const getLMSWebsiteLoginAnalytics = async (req, res) => {
    try {
        const { period = '7d', groupBy = 'day' } = req.query;
        
        let dateFilter = {};
        const now = new Date();
        
        switch (period) {
            case '24h':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case '7d':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case '30d':
                dateFilter = { 
                    loginTime: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
                    loginSource: 'lms-website'
                };
                break;
            case 'all':
            default:
                dateFilter = { loginSource: 'lms-website' };
        }
        
        // Get total LMS website logins
        const totalLMSLogins = await UserLoginSession.countDocuments(dateFilter);
        
        // Get unique users who logged into LMS website
        const uniqueLMSUsers = await UserLoginSession.distinct('userId', dateFilter);
        const uniqueLMSUserCount = uniqueLMSUsers.length;
        
        // Get device type distribution for LMS website
        const deviceTypeStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$deviceType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get OS distribution for LMS website
        const osStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$deviceOS', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get browser distribution for LMS website
        const browserStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get device brand distribution for LMS website
        const deviceBrandStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$deviceBrand', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        // Get platform distribution for LMS website
        const platformStats = await UserLoginSession.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$platform', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Get active LMS website sessions
        const activeLMSSessions = await UserLoginSession.countDocuments({ 
            ...dateFilter, 
            isActive: true 
        });
        
        // Get login trends by time period for LMS website
        let loginTrends = [];
        if (groupBy === 'day') {
            loginTrends = await UserLoginSession.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$loginTime' },
                            month: { $month: '$loginTime' },
                            day: { $dayOfMonth: '$loginTime' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);
        } else if (groupBy === 'week') {
            loginTrends = await UserLoginSession.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$loginTime' },
                            week: { $week: '$loginTime' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.week': 1 } }
            ]);
        } else if (groupBy === 'month') {
            loginTrends = await UserLoginSession.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$loginTime' },
                            month: { $month: '$loginTime' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
        }
        
        // Get recent LMS website logins
        const recentLMSLogins = await UserLoginSession.find(dateFilter)
            .sort({ loginTime: -1 })
            .limit(10)
            .populate('userId', 'username email')
            .select('-userAgent -ipAddress');
        
        res.status(200).json({
            success: true,
            data: {
                totalLMSLogins,
                uniqueLMSUserCount,
                activeLMSSessions,
                deviceTypeStats,
                osStats,
                browserStats,
                deviceBrandStats,
                platformStats,
                loginTrends,
                recentLMSLogins,
                period,
                groupBy
            }
        });
    } catch (error) {
        console.error('Error getting LMS website login analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get LMS website login analytics',
            error: error.message
        });
    }
};

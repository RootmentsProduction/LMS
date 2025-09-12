import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * Debug endpoint to check database connection details
 */
router.get('/debug/database', async (req, res) => {
    try {
        const currentUri = process.env.MONGODB_URI;
        const fallbackUri = 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
        
        const connectionState = mongoose.connection.readyState;
        const connectionStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        const debugInfo = {
            environment: process.env.NODE_ENV || 'development',
            currentMongoUri: currentUri ? currentUri.substring(0, 50) + '...' : 'NOT SET',
            fallbackUri: fallbackUri.substring(0, 50) + '...',
            connectionState: connectionStates[connectionState],
            connectionReadyState: connectionState,
            databaseName: mongoose.connection.db?.databaseName || 'Not connected',
            host: mongoose.connection.host || 'Not connected',
            port: mongoose.connection.port || 'Not connected',
            timestamp: new Date().toISOString()
        };

        console.log('=== DATABASE DEBUG INFO ===');
        console.log(debugInfo);
        console.log('===========================');

        res.status(200).json({
            message: 'Database debug info',
            data: debugInfo
        });

    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({
            message: 'Debug endpoint error',
            error: error.message
        });
    }
});

/**
 * Force database reconnection
 */
router.post('/debug/reconnect', async (req, res) => {
    try {
        console.log('=== FORCING DATABASE RECONNECTION ===');
        
        // Disconnect if connected
        if (mongoose.connection.readyState === 1) {
            console.log('Disconnecting from current database...');
            await mongoose.disconnect();
        }

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reconnect with current environment
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
        
        console.log('Connecting to:', mongoUri.substring(0, 50) + '...');
        await mongoose.connect(mongoUri);
        
        console.log('✅ Reconnected successfully');
        console.log('Database name:', mongoose.connection.db.databaseName);

        res.status(200).json({
            message: 'Database reconnected successfully',
            databaseName: mongoose.connection.db.databaseName,
            connectionState: 'connected'
        });

    } catch (error) {
        console.error('Reconnection error:', error);
        res.status(500).json({
            message: 'Reconnection failed',
            error: error.message
        });
    }
});

/**
 * Test database query to verify we're getting data from the right database
 */
router.get('/debug/test-query', async (req, res) => {
    try {
        // Import User model
        const User = (await import('../model/User.js')).default;
        
        // Get a sample user to verify database
        const sampleUser = await User.findOne().select('empID username email createdAt').sort({ createdAt: -1 });
        
        // Get total user count
        const totalUsers = await User.countDocuments();
        
        const queryResult = {
            databaseName: mongoose.connection.db.databaseName,
            sampleUser: sampleUser,
            totalUsers: totalUsers,
            queryTimestamp: new Date().toISOString()
        };

        console.log('=== TEST QUERY RESULT ===');
        console.log(queryResult);
        console.log('========================');

        res.status(200).json({
            message: 'Test query completed',
            data: queryResult
        });

    } catch (error) {
        console.error('Test query error:', error);
        res.status(500).json({
            message: 'Test query failed',
            error: error.message
        });
    }
});

export default router;

import cron from 'node-cron';
import { autoSyncEmployees } from '../controllers/EmployeeManagementController.js';

// Mock request and response objects for the cron job
const createMockReqRes = () => {
    const req = {
        admin: { userId: null } // Will be handled gracefully in the controller
    };
    
    const res = {
        status: (code) => ({
            json: (data) => {
                if (code === 200) {
                    console.log('✅ Scheduled auto-sync completed successfully:', data.results);
                } else {
                    console.error('❌ Scheduled auto-sync failed:', data);
                }
            }
        })
    };
    
    return { req, res };
};

// Schedule auto-sync every 6 hours (at 00:00, 06:00, 12:00, 18:00)
export const startEmployeeAutoSync = () => {
    console.log('🕐 Starting employee auto-sync scheduler...');
    
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('⏰ Running scheduled employee auto-sync...');
        const { req, res } = createMockReqRes();
        
        try {
            await autoSyncEmployees(req, res);
        } catch (error) {
            console.error('❌ Scheduled auto-sync error:', error);
        }
    }, {
        timezone: "Asia/Kolkata" // Adjust timezone as needed
    });
    
    // Also run once at startup (after 30 seconds delay)
    setTimeout(async () => {
        console.log('🚀 Running initial employee auto-sync...');
        const { req, res } = createMockReqRes();
        
        try {
            await autoSyncEmployees(req, res);
        } catch (error) {
            console.error('❌ Initial auto-sync error:', error);
        }
    }, 30000);
    
    console.log('✅ Employee auto-sync scheduler started (runs every 6 hours)');
};

// Manual trigger for testing
export const triggerManualSync = async () => {
    console.log('🔄 Triggering manual employee sync...');
    const { req, res } = createMockReqRes();
    
    try {
        await autoSyncEmployees(req, res);
        return true;
    } catch (error) {
        console.error('❌ Manual sync error:', error);
        return false;
    }
};

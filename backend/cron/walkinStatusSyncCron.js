import cron from 'node-cron';
import { syncWalkinStatuses, expireWalkinsToLoss } from '../services/walkinStatusSyncService.js';

let isScheduled = false;
let isRunning = false;
let isLossExpiryRunning = false;

export const startWalkinStatusSyncCron = () => {
    if (isScheduled) {
        console.log('⚠️ [Walkin Status Sync Cron] Scheduler is already started. Skipping duplicate registration.');
        return;
    }
    isScheduled = true;
    console.log('🕐 Starting Walk-in Status Sync Scheduler...');

    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        if (isRunning) {
            console.log('⚠️ [Walkin Status Sync Cron] Sync Skipped (Already Running).');
            return;
        }

        isRunning = true;
        try {
            console.log('🔄 [Walkin Status Sync Cron] Sync Started');
            await syncWalkinStatuses();
            console.log('✅ [Walkin Status Sync Cron] Sync Completed');
        } catch (error) {
            console.error('❌ [Walkin Status Sync Cron] Sync Failed:', error);
        } finally {
            isRunning = false;
        }
    });

    // Run daily at 12:00 AM IST (6:30 PM UTC server time)
    cron.schedule('30 18 * * *', async () => {
        if (isLossExpiryRunning) {
            console.log('⚠️ [Walkin Loss Expiry Cron] Previous loss expiry job is still running. Skipping this execution.');
            return;
        }

        isLossExpiryRunning = true;
        try {
            console.log('⏰ Running scheduled daily Walk-in Loss Expiry...');
            await expireWalkinsToLoss();
        } catch (error) {
            console.error('❌ Scheduled Walk-in Loss Expiry Cron encountered an error:', error);
        } finally {
            isLossExpiryRunning = false;
        }
    });

    console.log('✅ Walk-in Status Sync Scheduler started (runs every 15 minutes, loss expiry runs daily at 12:00 AM)');
};


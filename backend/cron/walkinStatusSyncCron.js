import cron from 'node-cron';
import { syncWalkinStatuses, expireWalkinsToLoss } from '../services/walkinStatusSyncService.js';

let isRunning = false;
let isLossExpiryRunning = false;

export const startWalkinStatusSyncCron = () => {
    console.log('🕐 Starting Walk-in Status Sync Scheduler...');

    // Run every 1 hour
    cron.schedule('0 * * * *', async () => {
        if (isRunning) {
            console.log('⚠️ [Walkin Status Sync Cron] Previous sync job is still running. Skipping this execution.');
            return;
        }

        isRunning = true;
        try {
            console.log('⏰ Running scheduled Walk-in Status Sync...');
            await syncWalkinStatuses();
        } catch (error) {
            console.error('❌ Scheduled Walk-in Status Sync Cron encountered an error:', error);
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

    console.log('✅ Walk-in Status Sync Scheduler started (runs every 1 hour, loss expiry runs daily at 12:00 AM)');
};


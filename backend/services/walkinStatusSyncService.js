import axios from 'axios';
import Branch from '../model/Branch.js';
import Walkin from '../model/Walkin.js';
import CronLog from '../model/CronLog.js';
import { normalizePhone } from '../utils/normalizePhone.js';

/**
 * Returns YYYY-MM-DD format date string for a given offset of days from today
 */
const getPastDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

/**
 * Helper to dynamically extract mobile/phone numbers case-insensitively from an item object
 */
const extractPhoneNumber = (item) => {
    if (!item) return null;
    const phoneKeys = ['mobile', 'mobilenumber', 'phone', 'phonenumber', 'phoneno', 'contact', 'customermobile', 'custmobile', 'customerphone', 'telephone', 'mobile_no', 'phone_no'];
    for (const key of Object.keys(item)) {
        if (phoneKeys.includes(key.toLowerCase())) {
            return String(item[key]);
        }
    }
    return null;
};

/**
 * Helper to define hierarchy rankings for walk-in statuses
 */
const getStatusRank = (status) => {
    const ranks = {
        'New Walkin': 1,
        'Booked': 2,
        'Rentout': 3,
        'Return': 4,
        'Cancel': 5
    };
    return ranks[status] || 1; // Default rank is 1 for any other statuses
};

/**
 * Automatically sync Walkin statuses with the external Rental APIs
 */
export const syncWalkinStatuses = async () => {
    const jobStartedAt = new Date();
    console.log('🔄 [Walkin Status Sync] Job started at:', jobStartedAt.toISOString());

    const dateFrom = getPastDateString(6); // Last 7 days (Today - 6)
    const dateTo = getPastDateString(0);   // Today (Today - 0)

    console.log(`📅 [Walkin Status Sync] Range: ${dateFrom} to ${dateTo}`);

    // Fetch active stores
    const branches = await Branch.find({ isActive: true });
    console.log(`🏬 [Walkin Status Sync] Found ${branches.length} active branches to process.`);

    let totalBookings = 0;
    let totalRentouts = 0;
    let totalReturns = 0;
    let totalDeletes = 0;
    let totalWalkinsUpdated = 0;
    const errorsList = [];
    const branchResultsList = [];

    for (const branch of branches) {
        const { locCode, workingBranch, _id: storeId } = branch;
        console.log(`📍 [Walkin Status Sync] Processing branch: ${workingBranch} (locCode: ${locCode})`);

        try {
            // Define endpoints
            const bookingUrl = `https://rentalapi.rootments.live/api/GetBooking/GetBookingList?LocCode=${locCode}&DateFrom=${dateFrom}&DateTo=${dateTo}`;
            const rentoutUrl = `https://rentalapi.rootments.live/api/GetBooking/GetRentoutList?LocCode=${locCode}&DateFrom=${dateFrom}&DateTo=${dateTo}`;
            const returnUrl = `https://rentalapi.rootments.live/api/GetBooking/GetReturnList?LocCode=${locCode}&DateFrom=${dateFrom}&DateTo=${dateTo}`;
            const deleteUrl = `https://rentalapi.rootments.live/api/GetBooking/GetDeleteList?LocCode=${locCode}&DateFrom=${dateFrom}&DateTo=${dateTo}`;

            // Fetch from all four APIs in parallel, but handle individual request errors safely
            const fetchListSafe = async (url, typeName) => {
                try {
                    const response = await axios.get(url, { timeout: 15000 });
                    const rawData = response.data;
                    let list = [];
                    if (rawData) {
                        if (Array.isArray(rawData)) {
                            list = rawData;
                        } else if (rawData.dataSet && Array.isArray(rawData.dataSet.data)) {
                            list = rawData.dataSet.data;
                        } else if (Array.isArray(rawData.data)) {
                            list = rawData.data;
                        }
                    }
                    return list;
                } catch (err) {
                    console.warn(`⚠️ [Walkin Status Sync] Failed to fetch ${typeName} for branch ${locCode}:`, err.message);
                    errorsList.push({ branch: locCode, type: typeName, error: err.message });
                    return [];
                }
            };

            const [bookings, rentouts, returns, deletes] = await Promise.all([
                fetchListSafe(bookingUrl, 'Booking'),
                fetchListSafe(rentoutUrl, 'Rentout'),
                fetchListSafe(returnUrl, 'Return'),
                fetchListSafe(deleteUrl, 'Delete')
            ]);

            console.log(`📊 [Walkin Status Sync] locCode ${locCode}: Bookings = ${bookings.length}, Rentouts = ${rentouts.length}, Returns = ${returns.length}, Deletes = ${deletes.length}`);
            totalBookings += bookings.length;
            totalRentouts += rentouts.length;
            totalReturns += returns.length;
            totalDeletes += deletes.length;

            // Priority Rule: Cancel > Return > Rentout > Booked
            const phoneStatusMap = new Map();

            // Bookings (Priority 3)
            for (const item of bookings) {
                const phone = normalizePhone(extractPhoneNumber(item));
                if (phone) {
                    phoneStatusMap.set(phone, 'Booked');
                }
            }

            // Rentouts (Priority 2)
            for (const item of rentouts) {
                const phone = normalizePhone(extractPhoneNumber(item));
                if (phone) {
                    phoneStatusMap.set(phone, 'Rentout');
                }
            }

            // Returns (Priority 1)
            for (const item of returns) {
                const phone = normalizePhone(extractPhoneNumber(item));
                if (phone) {
                    phoneStatusMap.set(phone, 'Return');
                }
            }

            // Deletes (Priority 4 - Cancel)
            for (const item of deletes) {
                const phone = normalizePhone(extractPhoneNumber(item));
                if (phone) {
                    phoneStatusMap.set(phone, 'Cancel');
                }
            }

            // Update matching walk-ins
            const normalizedPhones = Array.from(phoneStatusMap.keys());
            let branchWalkinsMatched = 0;
            let branchWalkinsUpdated = 0;
            let branchWalkinsSkipped = 0;

            if (normalizedPhones.length > 0) {
                // Build queries for 4 phone variants to search DB
                const queryPhones = [];
                for (const p of normalizedPhones) {
                    queryPhones.push(p);
                    queryPhones.push(`+91${p}`);
                    queryPhones.push(`91${p}`);
                    queryPhones.push(`0${p}`);
                }

                // Batch find all matching walk-ins for this branch
                const walkins = await Walkin.find({
                    contact: { $in: queryPhones },
                    storeId: storeId
                }).sort({ createdAt: -1 });

                // Group by normalized contact to select only the latest walk-in per phone number
                const walkinMap = new Map();
                for (const walkin of walkins) {
                    const norm = normalizePhone(walkin.contact);
                    if (norm && !walkinMap.has(norm)) {
                        walkinMap.set(norm, walkin);
                    }
                }

                // Apply hierarchy and perform the updates
                for (const [normalizedPhone, targetStatus] of phoneStatusMap.entries()) {
                    const walkin = walkinMap.get(normalizedPhone);
                    if (walkin) {
                        branchWalkinsMatched++;
                        const currentRank = getStatusRank(walkin.status);
                        const targetRank = getStatusRank(targetStatus);

                        if (targetRank > currentRank) {
                            const oldStatus = walkin.status;
                            walkin.status = targetStatus;
                            walkin.repeatCount = (walkin.repeatCount || 1) + 1;

                            await walkin.save();

                            branchWalkinsUpdated++;
                            totalWalkinsUpdated++;
                            console.log(`✅ [Walkin Status Sync] Updated lead ending in ...${normalizedPhone.slice(-4)} at ${workingBranch}: ${oldStatus} ➔ ${targetStatus} (repeatCount: ${walkin.repeatCount})`);
                        } else {
                            branchWalkinsSkipped++;
                            console.log(`ℹ️ [Walkin Status Sync] Skipped lead ending in ...${normalizedPhone.slice(-4)} at ${workingBranch}: current status '${walkin.status}' (rank ${currentRank}) >= target status '${targetStatus}' (rank ${targetRank})`);
                        }
                    }
                }
            }

            console.log(`📈 [Walkin Status Sync] Branch ${locCode} execution results: Matched = ${branchWalkinsMatched}, Updated = ${branchWalkinsUpdated}, Skipped (hierarchy) = ${branchWalkinsSkipped}`);

            branchResultsList.push({
                locCode,
                workingBranch,
                bookings:  bookings.length,
                rentouts:  rentouts.length,
                returns:   returns.length,
                deletes:   deletes.length,
                matched:   branchWalkinsMatched,
                updated:   branchWalkinsUpdated,
                skipped:   branchWalkinsSkipped,
            });

        } catch (error) {
            console.error(`❌ [Walkin Status Sync] Unhandled error for locCode ${locCode}:`, error);
            errorsList.push({ branch: locCode, type: 'All', error: error.message });
        }
    }

    const jobCompletedAt = new Date();
    const durationMs = jobCompletedAt - jobStartedAt;

    console.log('🏁 [Walkin Status Sync] Job completed.');
    console.log(`📝 [Walkin Status Sync] Summary:
      - Total Bookings processed: ${totalBookings}
      - Total Rentouts processed: ${totalRentouts}
      - Total Returns processed: ${totalReturns}
      - Total Deletes processed: ${totalDeletes}
      - Total Walk-ins updated: ${totalWalkinsUpdated}
      - Total locCode errors encountered: ${errorsList.length}
      - Duration: ${durationMs}ms
    `);

    // ── Persist run log to DB ──
    try {
        await CronLog.create({
            jobType:      'walkin_status_sync',
            status:       errorsList.length > 0 && totalWalkinsUpdated === 0 ? 'error' : 'success',
            startedAt:    jobStartedAt,
            completedAt:  jobCompletedAt,
            durationMs,
            summary: {
                totalBookings,
                totalRentouts,
                totalReturns,
                totalDeletes,
                totalWalkinsUpdated,
                errorsCount: errorsList.length,
            },
            branchResults: branchResultsList,
            errorDetails:  errorsList,
        });
        console.log('💾 [Walkin Status Sync] Run log saved to DB.');
    } catch (logErr) {
        console.error('⚠️ [Walkin Status Sync] Failed to save run log to DB:', logErr.message);
    }

    return {
        success: true,
        summary: {
            totalBookings,
            totalRentouts,
            totalReturns,
            totalDeletes,
            totalWalkinsUpdated,
            errorsCount: errorsList.length,
            errors: errorsList
        }
    };
};

/**
 * Automatically expire walk-ins to 'Loss' if they were created before today,
 * have status 'New Walkin', and have not been updated since creation.
 */
export const expireWalkinsToLoss = async () => {
    const jobStartedAt = new Date();
    console.log('🔄 [Walkin Loss Expiry] Job started at:', jobStartedAt.toISOString());
    try {
        const now = new Date();
        
        // Calculate the local start of today in Asia/Kolkata timezone (UTC+5:30)
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        const parts = formatter.formatToParts(now);
        const dateObj = {};
        parts.forEach(p => { dateObj[p.type] = p.value; });
        
        const startOfToday = new Date(Date.UTC(
            parseInt(dateObj.year, 10),
            parseInt(dateObj.month, 10) - 1,
            parseInt(dateObj.day, 10),
            0, 0, 0, 0
        ));
        startOfToday.setTime(startOfToday.getTime() - (5.5 * 60 * 60 * 1000));
        
        console.log(`📅 [Walkin Loss Expiry] Expiry threshold: walk-ins created before ${startOfToday.toISOString()} (IST midnight)`);

        // Perform bulk update of walk-ins that:
        // 1. status is 'New Walkin'
        // 2. createdAt < startOfToday
        // 3. updatedAt === createdAt (no updates occurred)
        // Set status to 'Loss' and update updatedAt to the current time.
        const result = await Walkin.updateMany(
            {
                status: 'New Walkin',
                $or: [
                    { repeatCount: 1 },
                    { repeatCount: { $exists: false } }
                ],
                createdAt: { $lt: startOfToday },
                $expr: { $eq: ['$createdAt', '$updatedAt'] }
            },
            {
                $set: {
                    status: 'Loss',
                    updatedAt: now
                }
            }
        );

        const jobCompletedAt = new Date();
        const durationMs = jobCompletedAt - jobStartedAt;

        console.log(`🏁 [Walkin Loss Expiry] Job completed. Updated ${result.modifiedCount} walk-ins to status 'Loss'. Duration: ${durationMs}ms`);

        // ── Persist run log to DB ──
        try {
            await CronLog.create({
                jobType:     'walkin_loss_expiry',
                status:      'success',
                startedAt:   jobStartedAt,
                completedAt: jobCompletedAt,
                durationMs,
                expiredCount: result.modifiedCount,
            });
            console.log('💾 [Walkin Loss Expiry] Run log saved to DB.');
        } catch (logErr) {
            console.error('⚠️ [Walkin Loss Expiry] Failed to save run log to DB:', logErr.message);
        }

        return { success: true, expiredCount: result.modifiedCount };
    } catch (error) {
        const jobCompletedAt = new Date();
        console.error('❌ [Walkin Loss Expiry] Error during daily expiry job:', error);

        // Log the failure too
        try {
            await CronLog.create({
                jobType:      'walkin_loss_expiry',
                status:       'error',
                startedAt:    jobStartedAt,
                completedAt:  jobCompletedAt,
                durationMs:   jobCompletedAt - jobStartedAt,
                errorMessage: error.message,
            });
        } catch { /* silent */ }

        return { success: false, error: error.message };
    }
};


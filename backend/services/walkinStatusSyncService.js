import axios from 'axios';
import Branch from '../model/Branch.js';
import Walkin from '../model/Walkin.js';
import CronLog from '../model/CronLog.js';
import { normalizePhone } from '../utils/normalizePhone.js';

let isSyncInProgress = false;

/**
 * Returns YYYY-MM-DD format date string for a given offset of days from today
 */
const getPastDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

const getLocalDateStringIST = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        'Cancel': 5,
        'Cancelled': 5
    };
    return ranks[status] || 1; // Default rank is 1 for any other statuses
};

/**
 * Helper to extract invoice number from an item object
 */
const extractInvoiceNo = (item) => {
    if (!item) return null;
    const invoiceKeys = ['invoiceno', 'invoice_no', 'invoice', 'billno', 'bill_no'];
    for (const key of Object.keys(item)) {
        if (invoiceKeys.includes(key.toLowerCase())) {
            return String(item[key]).trim();
        }
    }
    return null;
};

/**
 * Helper to combine rental and shoe statuses
 */
const getCombinedStatus = (rental, shoe) => {
    const r = (rental || 'New Walkin').trim();
    const s = (shoe || '').trim();
    if (!s || s === '-' || s === 'None') return r;
    if (r === 'New Walkin' || r === '-') return s;
    return `${r}, ${s}`;
};

/**
 * Helper to extract and parse date values from an item object based on priority keys
 */
const extractDateValue = (itm, priorityKeys) => {
    if (!itm) return null;
    const itemKeyMap = {};
    for (const k of Object.keys(itm)) {
        itemKeyMap[k.toLowerCase()] = itm[k];
    }
    for (const key of priorityKeys) {
        const val = itemKeyMap[key.toLowerCase()];
        if (val) {
            let dateStr = String(val).trim();
            if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-') && dateStr.includes('T')) {
                dateStr = dateStr + '+05:30';
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
};

/**
 * Automatically sync Walkin statuses with the external Rental APIs
 */
export const syncWalkinStatuses = async () => {
    if (isSyncInProgress) {
        console.log('⚠️ [Walkin Status Sync] Sync Skipped (Already Running).');
        return {
            success: false,
            message: 'Sync job is already in progress.'
        };
    }

    isSyncInProgress = true;
    const jobStartedAt = new Date();
    console.log('🔄 [Walkin Status Sync] Sync Started at:', jobStartedAt.toISOString());

    const dateFrom = getPastDateString(7); // Last 7 days (Today - 7)
    const dateTo = getPastDateString(0);   // Today (Today - 0)

    console.log(`📅 [Walkin Status Sync] Range: ${dateFrom} to ${dateTo}`);

    try {
        // Fetch active stores
        const branches = await Branch.find({ isActive: true });
        console.log(`🏬 [Walkin Status Sync] Found ${branches.length} active branches to process.`);

        let totalBookings = 0;
        let totalRentouts = 0;
        let totalReturns = 0;
        let totalDeletes = 0;
        let totalShoeBilled = 0;
        let totalShoeBillReturned = 0;
        let totalWalkinsMatched = 0;
        let totalWalkinsUpdated = 0;
        let totalWalkinsSameStatus = 0;
        let totalWalkinsSameDayRepeat = 0;
        let totalWalkinsSkippedHierarchy = 0;
        let totalStatusChanges = 0;
        let totalRepeatCountChanges = 0;
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
                const shoeBilledUrl = `https://backend.brynex.com/api/external/shoe-sales/bookings?fromDate=${dateFrom}&toDate=${dateTo}&locCode=${locCode}`;
                const shoeBillReturnedUrl = `https://backend.brynex.com/api/external/shoe-sales/returns?fromDate=${dateFrom}&toDate=${dateTo}&locCode=${locCode}`;

                // Fetch from all six APIs in parallel, but handle individual request errors safely
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

                const [bookings, rentouts, returns, deletes, shoeBilled, shoeBillReturned] = await Promise.all([
                    fetchListSafe(bookingUrl, 'Booking'),
                    fetchListSafe(rentoutUrl, 'Rentout'),
                    fetchListSafe(returnUrl, 'Return'),
                    fetchListSafe(deleteUrl, 'Delete'),
                    fetchListSafe(shoeBilledUrl, 'ShoeBilled'),
                    fetchListSafe(shoeBillReturnedUrl, 'ShoeBillReturned')
                ]);

                console.log(`📊 [Walkin Status Sync] locCode ${locCode}: Bookings = ${bookings.length}, Rentouts = ${rentouts.length}, Returns = ${returns.length}, Deletes = ${deletes.length}, ShoeBilled = ${shoeBilled.length}, ShoeBillReturned = ${shoeBillReturned.length}`);
                totalBookings += bookings.length;
                totalRentouts += rentouts.length;
                totalReturns += returns.length;
                totalDeletes += deletes.length;
                totalShoeBilled += shoeBilled.length;
                totalShoeBillReturned += shoeBillReturned.length;

                // Specific API maps to source exact dates from their respective endpoints
                const bookingMap = new Map();
                const rentoutMap = new Map();
                const returnMap = new Map();
                const cancelMap = new Map();
                const shoeBilledMap = new Map();
                const shoeBillReturnedMap = new Map();

                // Priority Maps: rental statuses and shoe statuses are independent
                // Both flows will be invoice-based
                const invoiceRentalMap = new Map(); // invoiceNo -> { status, phone, item }
                const invoiceShoeMap = new Map();   // shoeInvoiceNo -> { status, phone, item }

                // 1. Rental Flow Mapping (Priority: Cancelled > Return > Rentout > Booked)
                for (const item of bookings) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const invoiceNo = extractInvoiceNo(item);
                    if (invoiceNo && phone) {
                        bookingMap.set(invoiceNo, item);
                        invoiceRentalMap.set(invoiceNo, { status: 'Booked', phone, item });
                    }
                }
                for (const item of rentouts) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const invoiceNo = extractInvoiceNo(item);
                    if (invoiceNo && phone) {
                        rentoutMap.set(invoiceNo, item);
                        invoiceRentalMap.set(invoiceNo, { status: 'Rentout', phone, item });
                    }
                }
                for (const item of returns) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const invoiceNo = extractInvoiceNo(item);
                    if (invoiceNo && phone) {
                        returnMap.set(invoiceNo, item);
                        invoiceRentalMap.set(invoiceNo, { status: 'Return', phone, item });
                    }
                }
                for (const item of deletes) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const invoiceNo = extractInvoiceNo(item);
                    if (invoiceNo && phone) {
                        cancelMap.set(invoiceNo, item);
                        invoiceRentalMap.set(invoiceNo, { status: 'Cancelled', phone, item });
                    }
                }

                // 2. Shoe Flow Mapping (Priority: Bill Returned > Billed)
                for (const item of shoeBilled) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const shoeInvoiceNo = extractInvoiceNo(item);
                    if (shoeInvoiceNo && phone) {
                        shoeBilledMap.set(shoeInvoiceNo, item);
                        invoiceShoeMap.set(shoeInvoiceNo, { status: 'Billed', phone, item });
                    }
                }
                for (const item of shoeBillReturned) {
                    const phone = normalizePhone(extractPhoneNumber(item));
                    const shoeInvoiceNo = extractInvoiceNo(item);
                    if (shoeInvoiceNo && phone) {
                        shoeBillReturnedMap.set(shoeInvoiceNo, item);
                        invoiceShoeMap.set(shoeInvoiceNo, { status: 'Bill Returned', phone, item });
                    }
                }

                // Gather union of all phones to check walk-ins in DB
                const allPhones = new Set();
                for (const info of invoiceRentalMap.values()) {
                    allPhones.add(info.phone);
                }
                for (const info of invoiceShoeMap.values()) {
                    allPhones.add(info.phone);
                }
                const normalizedPhones = Array.from(allPhones);
                const invoiceNos = Array.from(invoiceRentalMap.keys());
                const shoeInvoiceNos = Array.from(invoiceShoeMap.keys());

                let branchWalkinsMatched = 0;
                let branchWalkinsUpdated = 0;
                let branchWalkinsSameStatus = 0;
                let branchWalkinsSameDayRepeat = 0;
                let branchWalkinsSkippedHierarchy = 0;

                const queryFilters = [];
                // Match by existing invoiceNo
                if (invoiceNos.length > 0) {
                    queryFilters.push({ invoiceNo: { $in: invoiceNos } });
                }
                // Match by existing shoeInvoiceNo
                if (shoeInvoiceNos.length > 0) {
                    queryFilters.push({ shoeInvoiceNo: { $in: shoeInvoiceNos } });
                }
                // Match by phone number formats
                for (const p of normalizedPhones) {
                    queryFilters.push({ contact: p });
                    queryFilters.push({ contact: `+91${p}` });
                    queryFilters.push({ contact: `91${p}` });
                    queryFilters.push({ contact: `0${p}` });
                    
                    const regexStr = p.split('').join('\\D*') + '$';
                    queryFilters.push({ contact: { $regex: regexStr } });
                }

                let walkins = [];
                if (queryFilters.length > 0) {
                    walkins = await Walkin.find({
                        storeId: storeId,
                        $or: queryFilters
                    }).sort({ createdAt: -1 });
                }

                // Group retrieved walkins by invoiceNo, shoeInvoiceNo, and unassigned lists by phone
                const invoiceToWalkinMap = new Map();
                const shoeInvoiceToWalkinMap = new Map();
                const phoneToUnassignedRentalWalkins = new Map(); // phone -> Array of walkins (no invoiceNo)
                const phoneToUnassignedShoeWalkins = new Map();   // phone -> Array of walkins (no shoeInvoiceNo)

                for (const walkin of walkins) {
                    if (walkin.invoiceNo) {
                        invoiceToWalkinMap.set(walkin.invoiceNo, walkin);
                    }
                    if (walkin.shoeInvoiceNo) {
                        shoeInvoiceToWalkinMap.set(walkin.shoeInvoiceNo, walkin);
                    }
                    
                    const norm = normalizePhone(walkin.contact);
                    if (norm) {
                        if (!walkin.invoiceNo) {
                            if (!phoneToUnassignedRentalWalkins.has(norm)) {
                                phoneToUnassignedRentalWalkins.set(norm, []);
                            }
                            phoneToUnassignedRentalWalkins.get(norm).push(walkin);
                        }
                        if (!walkin.shoeInvoiceNo) {
                            if (!phoneToUnassignedShoeWalkins.has(norm)) {
                                phoneToUnassignedShoeWalkins.set(norm, []);
                            }
                            phoneToUnassignedShoeWalkins.get(norm).push(walkin);
                        }
                    }
                }

                // Track trackers for all matched walkins
                const walkinTrackers = new Map(); // walkinId -> { walkin, docUpdated, rentalStatusChanged, shoeStatusChanged }
                const getTracker = (w) => {
                    const idStr = w._id.toString();
                    if (!walkinTrackers.has(idStr)) {
                        walkinTrackers.set(idStr, {
                            walkin: w,
                            docUpdated: false,
                            rentalStatusChanged: false,
                            shoeStatusChanged: false
                        });
                    }
                    return walkinTrackers.get(idStr);
                };

                // 1. Process Rental updates using invoice-based mapping
                for (const [invoiceNo, rentalInfo] of invoiceRentalMap.entries()) {
                    let walkin = invoiceToWalkinMap.get(invoiceNo);

                    // If not found by invoiceNo, perform the first-time assignment
                    if (!walkin) {
                        const unassignedList = phoneToUnassignedRentalWalkins.get(rentalInfo.phone) || [];
                        if (unassignedList.length > 0) {
                            // Find the best walkin whose creation date is closest to (but <=) transaction booking/creation date.
                            let txDate = null;
                            const bookingItem = bookingMap.get(invoiceNo);
                            if (bookingItem) {
                                txDate = extractDateValue(bookingItem, ['bookingDate', 'bookingdate', 'booking_date', 'bookeddate']);
                            }
                            if (!txDate) {
                                const rentoutItem = rentoutMap.get(invoiceNo);
                                if (rentoutItem) {
                                    txDate = extractDateValue(rentoutItem, ['bookingDate', 'bookingdate', 'booking_date', 'bookeddate', 'rentOutDate', 'rentoutdate']);
                                }
                            }
                            if (!txDate) {
                                const returnItem = returnMap.get(invoiceNo);
                                if (returnItem) {
                                    txDate = extractDateValue(returnItem, ['bookingDate', 'bookingdate', 'returnedDate', 'returneddate']);
                                }
                            }
                            if (!txDate) {
                                const cancelItem = cancelMap.get(invoiceNo);
                                if (cancelItem) {
                                    txDate = extractDateValue(cancelItem, ['bookingDate', 'bookingdate', 'cancelDate', 'canceldate']);
                                }
                            }
                            if (!txDate) {
                                txDate = new Date();
                            }

                            let bestMatchIdx = -1;
                            let minDiff = Infinity;

                            for (let i = 0; i < unassignedList.length; i++) {
                                const w = unassignedList[i];
                                const wDate = w.createdAt || w.updatedAt || new Date();
                                const diff = txDate.getTime() - wDate.getTime();
                                if (diff >= 0 && diff < minDiff) {
                                    minDiff = diff;
                                    bestMatchIdx = i;
                                }
                            }

                            // Fallback if no walkin has createdAt <= txDate
                            if (bestMatchIdx === -1) {
                                let minAbsDiff = Infinity;
                                for (let i = 0; i < unassignedList.length; i++) {
                                    const w = unassignedList[i];
                                    const wDate = w.createdAt || w.updatedAt || new Date();
                                    const diff = Math.abs(txDate.getTime() - wDate.getTime());
                                    if (diff < minAbsDiff) {
                                        minAbsDiff = diff;
                                        bestMatchIdx = i;
                                    }
                                }
                            }

                            if (bestMatchIdx !== -1) {
                                walkin = unassignedList[bestMatchIdx];
                                unassignedList.splice(bestMatchIdx, 1); // Remove so it won't be reused for another invoice
                                walkin.invoiceNo = invoiceNo;
                                invoiceToWalkinMap.set(invoiceNo, walkin);
                                console.log(`🔗 [Walkin Status Sync] Assigned invoiceNo '${invoiceNo}' to walkin ...${rentalInfo.phone.slice(-4)} (ID: ${walkin._id})`);
                            }
                        }
                    }

                    if (walkin) {
                        const tracker = getTracker(walkin);
                        const targetRentalStatus = rentalInfo.status;
                        const currentRentalStatus = tracker.walkin.rentalStatus || tracker.walkin.status || 'New Walkin';

                        // Sourced dates strictly from specific API endpoints for this invoiceNo
                        const bookingItem = bookingMap.get(invoiceNo);
                        if (bookingItem) {
                            const bDate = extractDateValue(bookingItem, ['bookingDate', 'bookingdate', 'booking_date', 'bookeddate']);
                            if (bDate && (!tracker.walkin.bookingDate || tracker.walkin.bookingDate.getTime() !== bDate.getTime())) {
                                tracker.walkin.bookingDate = bDate;
                                tracker.docUpdated = true;
                            }
                        }

                        const rentoutItem = rentoutMap.get(invoiceNo);
                        if (rentoutItem) {
                            const roDate = extractDateValue(rentoutItem, ['rentOutDate', 'rentoutdate', 'rent_out_date', 'rentdate']);
                            if (roDate && (!tracker.walkin.rentoutDate || tracker.walkin.rentoutDate.getTime() !== roDate.getTime())) {
                                tracker.walkin.rentoutDate = roDate;
                                tracker.docUpdated = true;
                            }
                        }

                        const returnItem = returnMap.get(invoiceNo);
                        if (returnItem) {
                            const retDate = extractDateValue(returnItem, ['returnedDate', 'returneddate', 'returndate', 'return_date']);
                            if (retDate && (!tracker.walkin.returnDate || tracker.walkin.returnDate.getTime() !== retDate.getTime())) {
                                tracker.walkin.returnDate = retDate;
                                tracker.docUpdated = true;
                            }
                        }

                        const cancelItem = cancelMap.get(invoiceNo);
                        if (cancelItem) {
                            const cDate = extractDateValue(cancelItem, ['cancelDate', 'canceldate', 'cancellationdate', 'cancelleddate']);
                            if (cDate && (!tracker.walkin.cancelDate || tracker.walkin.cancelDate.getTime() !== cDate.getTime())) {
                                tracker.walkin.cancelDate = cDate;
                                tracker.walkin.cancellationDate = cDate;
                                tracker.docUpdated = true;
                            }
                        }

                        const normalizeStatusForCompare = (s) => {
                            const val = String(s || '').trim().toLowerCase();
                            if (val === 'cancel') return 'cancelled';
                            return val;
                        };

                        if (normalizeStatusForCompare(currentRentalStatus) !== normalizeStatusForCompare(targetRentalStatus)) {
                            const currentRank = getStatusRank(currentRentalStatus);
                            const targetRank = getStatusRank(targetRentalStatus);

                            if (targetRank >= currentRank) {
                                const oldRental = currentRentalStatus;
                                tracker.walkin.rentalStatus = targetRentalStatus;
                                tracker.rentalStatusChanged = true;
                                tracker.docUpdated = true;

                                let matchedDate = null;
                                if (targetRentalStatus === 'Booked') {
                                    matchedDate = tracker.walkin.bookingDate;
                                } else if (targetRentalStatus === 'Rentout') {
                                    matchedDate = tracker.walkin.rentoutDate;
                                } else if (targetRentalStatus === 'Return') {
                                    matchedDate = tracker.walkin.returnDate;
                                } else if (targetRentalStatus === 'Cancelled') {
                                    matchedDate = tracker.walkin.cancelDate;
                                }

                                if (!tracker.walkin.statusHistory) {
                                    tracker.walkin.statusHistory = [];
                                }
                                tracker.walkin.statusHistory.push({
                                    status: targetRentalStatus,
                                    category: tracker.walkin.category && tracker.walkin.category !== '-' ? tracker.walkin.category : 'Product',
                                    date: matchedDate || new Date()
                                });
                                console.log(`✅ [Walkin Status Sync] Rental Flow update for invoice ${invoiceNo} (...${rentalInfo.phone.slice(-4)}): ${oldRental} ➔ ${targetRentalStatus}`);
                            } else {
                                branchWalkinsSkippedHierarchy++;
                                totalWalkinsSkippedHierarchy++;
                                console.log(`ℹ️ [Walkin Status Sync] Skipped rental update for invoice ${invoiceNo} (...${rentalInfo.phone.slice(-4)}): current '${currentRentalStatus}' >= target '${targetRentalStatus}'`);
                            }
                        }
                    } else {
                        console.log(`⚠️ [Walkin Status Sync] No unassigned walkin found for invoiceNo '${invoiceNo}' (phone: ${rentalInfo.phone})`);
                    }
                }

                // 2. Process Shoe updates using shoe invoice-based mapping
                for (const [shoeInvoiceNo, shoeInfo] of invoiceShoeMap.entries()) {
                    let walkin = shoeInvoiceToWalkinMap.get(shoeInvoiceNo);

                    // If not found by shoeInvoiceNo, perform the first-time assignment
                    if (!walkin) {
                        const unassignedList = phoneToUnassignedShoeWalkins.get(shoeInfo.phone) || [];
                        if (unassignedList.length > 0) {
                            // Find the best walkin whose creation date is closest to transaction shoe billing date.
                            let txDate = null;
                            const billedItem = shoeBilledMap.get(shoeInvoiceNo);
                            if (billedItem) {
                                txDate = extractDateValue(billedItem, ['billedDate', 'billingDate', 'billeddate', 'billdate', 'billingdate']);
                            }
                            if (!txDate) {
                                const billReturnedItem = shoeBillReturnedMap.get(shoeInvoiceNo);
                                if (billReturnedItem) {
                                    txDate = extractDateValue(billReturnedItem, ['billedReturnedDate', 'billedreturneddate', 'billReturnedDate', 'returnedDate', 'billreturneddate', 'returneddate', 'returndate']);
                                }
                            }
                            if (!txDate) {
                                txDate = new Date();
                            }

                            let bestMatchIdx = -1;
                            let minDiff = Infinity;

                            for (let i = 0; i < unassignedList.length; i++) {
                                const w = unassignedList[i];
                                const wDate = w.createdAt || w.updatedAt || new Date();
                                const diff = txDate.getTime() - wDate.getTime();
                                if (diff >= 0 && diff < minDiff) {
                                    minDiff = diff;
                                    bestMatchIdx = i;
                                }
                            }

                            // Fallback if no walkin has createdAt <= txDate
                            if (bestMatchIdx === -1) {
                                let minAbsDiff = Infinity;
                                for (let i = 0; i < unassignedList.length; i++) {
                                    const w = unassignedList[i];
                                    const wDate = w.createdAt || w.updatedAt || new Date();
                                    const diff = Math.abs(txDate.getTime() - wDate.getTime());
                                    if (diff < minAbsDiff) {
                                        minAbsDiff = diff;
                                        bestMatchIdx = i;
                                    }
                                }
                            }

                            if (bestMatchIdx !== -1) {
                                walkin = unassignedList[bestMatchIdx];
                                unassignedList.splice(bestMatchIdx, 1); // Remove so it won't be reused for another shoe invoice
                                walkin.shoeInvoiceNo = shoeInvoiceNo;
                                shoeInvoiceToWalkinMap.set(shoeInvoiceNo, walkin);
                                console.log(`🔗 [Walkin Status Sync] Assigned shoeInvoiceNo '${shoeInvoiceNo}' to walkin ...${shoeInfo.phone.slice(-4)} (ID: ${walkin._id})`);
                            }
                        }
                    }

                    if (walkin) {
                        const tracker = getTracker(walkin);
                        const targetShoeStatus = shoeInfo.status;
                        const currentShoeStatus = tracker.walkin.shoeStatus || '-';

                        const billedItem = shoeBilledMap.get(shoeInvoiceNo);
                        if (billedItem) {
                            const bldDate = extractDateValue(billedItem, ['billedDate', 'billingDate', 'billeddate', 'billdate', 'billingdate']);
                            if (bldDate && (!tracker.walkin.billedDate || tracker.walkin.billedDate.getTime() !== bldDate.getTime())) {
                                tracker.walkin.billedDate = bldDate;
                                tracker.docUpdated = true;
                            }
                        }

                        const billReturnedItem = shoeBillReturnedMap.get(shoeInvoiceNo);
                        if (billReturnedItem) {
                            const brDate = extractDateValue(billReturnedItem, ['billedReturnedDate', 'billedreturneddate', 'billReturnedDate', 'returnedDate', 'billreturneddate', 'returneddate', 'returndate']);
                            if (brDate && (!tracker.walkin.billReturnedDate || tracker.walkin.billReturnedDate.getTime() !== brDate.getTime())) {
                                tracker.walkin.billReturnedDate = brDate;
                                tracker.docUpdated = true;
                            }
                        }

                        if (currentShoeStatus !== targetShoeStatus) {
                            const getShoeStatusRank = (s) => {
                                const ranks = { 'Billed': 1, 'Bill Returned': 2 };
                                return ranks[s] || 0;
                            };
                            const currentShoeRank = getShoeStatusRank(currentShoeStatus);
                            const targetShoeRank = getShoeStatusRank(targetShoeStatus);

                            if (targetShoeRank >= currentShoeRank) {
                                const oldShoe = currentShoeStatus;
                                tracker.walkin.shoeStatus = targetShoeStatus;
                                tracker.shoeStatusChanged = true;
                                tracker.docUpdated = true;

                                let matchedShoeDate = null;
                                if (targetShoeStatus === 'Billed') {
                                    matchedShoeDate = tracker.walkin.billedDate;
                                } else if (targetShoeStatus === 'Bill Returned') {
                                    matchedShoeDate = tracker.walkin.billReturnedDate;
                                }

                                if (!tracker.walkin.statusHistory) {
                                    tracker.walkin.statusHistory = [];
                                }
                                tracker.walkin.statusHistory.push({
                                    status: targetShoeStatus,
                                    category: 'Sales',
                                    date: matchedShoeDate || new Date()
                                });
                                console.log(`✅ [Walkin Status Sync] Shoe Flow update for shoeInvoice ${shoeInvoiceNo} (...${shoeInfo.phone.slice(-4)}): ${oldShoe} ➔ ${targetShoeStatus}`);
                            } else {
                                console.log(`ℹ️ [Walkin Status Sync] Skipped shoe update for shoeInvoice ${shoeInvoiceNo} (...${shoeInfo.phone.slice(-4)}): current '${currentShoeStatus}' >= target '${targetShoeStatus}'`);
                            }
                        }
                    } else {
                        console.log(`⚠️ [Walkin Status Sync] No unassigned walkin found for shoeInvoiceNo '${shoeInvoiceNo}' (phone: ${shoeInfo.phone})`);
                    }
                }

                // 3. Save updated walkins and record metrics
                for (const tracker of walkinTrackers.values()) {
                    const { walkin, docUpdated, rentalStatusChanged, shoeStatusChanged } = tracker;
                    
                    branchWalkinsMatched++;
                    totalWalkinsMatched++;

                    if (docUpdated) {
                        const todayDateStr = getLocalDateStringIST(new Date());
                        const walkinDateStr = walkin.date && walkin.date !== '-' ?
                            walkin.date.substring(0, 10) :
                            (walkin.createdAt ? getLocalDateStringIST(walkin.createdAt) : null);

                        if (rentalStatusChanged || shoeStatusChanged) {
                            totalStatusChanges++;
                            
                            const nextCombinedStatus = getCombinedStatus(walkin.rentalStatus, walkin.shoeStatus);
                            const isCancelled = walkin.rentalStatus === 'Cancelled' || walkin.rentalStatus === 'Cancel' || 
                                                nextCombinedStatus.includes('Cancelled') || nextCombinedStatus.includes('Cancel');

                            const lastChangeIST = getLocalDateStringIST(walkin.lastStatusChangeDate);

                            if (walkinDateStr && walkinDateStr !== todayDateStr) {
                                if (!isCancelled) {
                                    if (lastChangeIST && lastChangeIST === todayDateStr) {
                                        console.log(`ℹ️ [Walkin Status Sync] Skipping repeatCount increment for ...${normalizePhone(walkin.contact).slice(-4)}: status already updated today (${todayDateStr})`);
                                        branchWalkinsSameDayRepeat++;
                                        totalWalkinsSameDayRepeat++;
                                    } else {
                                        walkin.repeatCount = (walkin.repeatCount || 1) + 1;
                                        totalRepeatCountChanges++;
                                        console.log(`📈 [Walkin Status Sync] Incrementing repeatCount to ${walkin.repeatCount} for ...${normalizePhone(walkin.contact).slice(-4)}`);
                                    }
                                }
                            } else if (walkinDateStr === todayDateStr) {
                                branchWalkinsSameDayRepeat++;
                                totalWalkinsSameDayRepeat++;
                            }

                            // Update status change tracking fields
                            walkin.lastStatusChangeDate = new Date();
                            walkin.statusChangedToday = true;
                        }

                        walkin.status = getCombinedStatus(walkin.rentalStatus, walkin.shoeStatus);
                        if (rentalStatusChanged || shoeStatusChanged) {
                            await walkin.save();
                        } else {
                            await walkin.save({ timestamps: false });
                        }

                        branchWalkinsUpdated++;
                        totalWalkinsUpdated++;
                    } else {
                        branchWalkinsSameStatus++;
                        totalWalkinsSameStatus++;
                    }
                }

                console.log(`📈 [Walkin Status Sync] Branch ${locCode} execution results: Matched = ${branchWalkinsMatched}, Updated = ${branchWalkinsUpdated}, SameStatus = ${branchWalkinsSameStatus}, SameDayRepeatSkip = ${branchWalkinsSameDayRepeat}, Skipped (hierarchy/skipped) = ${branchWalkinsSkippedHierarchy}`);

                branchResultsList.push({
                    locCode,
                    workingBranch,
                    bookings: bookings.length,
                    rentouts: rentouts.length,
                    returns: returns.length,
                    deletes: deletes.length,
                    shoeBilled: shoeBilled.length,
                    shoeBillReturned: shoeBillReturned.length,
                    matched: branchWalkinsMatched,
                    updated: branchWalkinsUpdated,
                    sameStatus: branchWalkinsSameStatus,
                    sameDayRepeatSkip: branchWalkinsSameDayRepeat,
                    skipped: branchWalkinsSkippedHierarchy,
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
          - Total Shoe Billed processed: ${totalShoeBilled}
          - Total Shoe Bill Returned processed: ${totalShoeBillReturned}
          - Total Walk-ins matched: ${totalWalkinsMatched}
          - Total Walk-ins updated: ${totalWalkinsUpdated}
          - Total Status Changes: ${totalStatusChanges}
          - Total Repeat Count Changes: ${totalRepeatCountChanges}
          - Total Walk-ins skipped (same status): ${totalWalkinsSameStatus}
          - Total Walk-ins skipped (same day repeat): ${totalWalkinsSameDayRepeat}
          - Total Walk-ins skipped (hierarchy): ${totalWalkinsSkippedHierarchy}
          - Total locCode errors encountered: ${errorsList.length}
          - Duration: ${durationMs}ms
        `);

        // ── Persist run log to DB ──
        try {
            await CronLog.create({
                jobType: 'walkin_status_sync',
                status: errorsList.length > 0 && totalWalkinsUpdated === 0 ? 'error' : 'success',
                startedAt: jobStartedAt,
                completedAt: jobCompletedAt,
                durationMs,
                summary: {
                    totalBookings,
                    totalRentouts,
                    totalReturns,
                    totalDeletes,
                    totalShoeBilled,
                    totalShoeBillReturned,
                    totalWalkinsMatched,
                    totalWalkinsUpdated,
                    totalStatusChanges,
                    totalRepeatCountChanges,
                    totalWalkinsSameStatus,
                    totalWalkinsSameDayRepeat,
                    totalWalkinsSkippedHierarchy,
                    errorsCount: errorsList.length,
                },
                branchResults: branchResultsList,
                errorDetails: errorsList,
            });
            console.log('💾 [Walkin Status Sync] Run log saved to DB.');
        } catch (logErr) {
            console.error('⚠️ [Walkin Status Sync] Failed to save run log to DB:', logErr.message);
        }

        console.log('🏁 [Walkin Status Sync] Sync Completed.');

        return {
            success: true,
            summary: {
                totalBookings,
                totalRentouts,
                totalReturns,
                totalDeletes,
                totalWalkinsUpdated,
                totalStatusChanges,
                totalRepeatCountChanges,
                totalWalkinsSameStatus,
                totalWalkinsSameDayRepeat,
                totalWalkinsSkippedHierarchy,
                errorsCount: errorsList.length,
                errors: errorsList
            }
        };

    } catch (error) {
        console.error('❌ [Walkin Status Sync] Sync Failed:', error);

        // ── Persist error run log to DB ──
        try {
            await CronLog.create({
                jobType: 'walkin_status_sync',
                status: 'error',
                startedAt: jobStartedAt,
                completedAt: new Date(),
                durationMs: new Date() - jobStartedAt,
                errorMessage: error.message,
                errorDetails: [{ branch: 'All', type: 'Fatal', error: error.message }],
            });
            console.log('💾 [Walkin Status Sync] Error run log saved to DB.');
        } catch (logErr) {
            console.error('⚠️ [Walkin Status Sync] Failed to save error run log to DB:', logErr.message);
        }

        throw error;
    } finally {
        isSyncInProgress = false;
    }
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
                jobType: 'walkin_loss_expiry',
                status: 'success',
                startedAt: jobStartedAt,
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
                jobType: 'walkin_loss_expiry',
                status: 'error',
                startedAt: jobStartedAt,
                completedAt: jobCompletedAt,
                durationMs: jobCompletedAt - jobStartedAt,
                errorMessage: error.message,
            });
        } catch { /* silent */ }

        return { success: false, error: error.message };
    }
};


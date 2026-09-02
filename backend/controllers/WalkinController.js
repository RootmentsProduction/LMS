import Walkin from '../model/Walkin.js';
import Admin from '../model/Admin.js';
import User from '../model/User.js';
import Branch from '../model/Branch.js';
import CronLog from '../model/CronLog.js';
import WalkinCount from '../model/WalkinCount.js';
import WalkinCameraCheck from '../model/WalkinCameraCheck.js';
import mongoose from 'mongoose';
import { validateStoreAccess, validateEmployeeAccess, buildWalkinFilter, buildStoreWideWalkinFilter } from '../lib/permissions.js';
import { getISTDayRange, getISTRangeBetween, isInISTRange } from '../utils/dateRange.js';


/* ---------- Location Name Normalization helpers ---------- */
const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

function canonFixes(s) {
    return s
        .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
        .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")
        .replace(/\bmanjeri\b/g, "manjery")
        .replace(/\bperinthalmana\b/g, "perinthalmanna")
        .replace(/\bkottakal\b/g, "kottakkal")
        .replace(/\bkalpeta\b/g, "kalpetta")
        .replace(/\bzoruc+i\b/g, "zorucci");
}

function norm(s) {
    const x = String(s || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    return canonFixes(x);
}

function locationKey(name) {
    const tokens = norm(name)
        .split(" ")
        .filter((t) => t && !BRAND_TOKENS.has(t));
    return tokens.join(" ");
}

const resolveStoreConditions = async (storeParam) => {
    if (!storeParam || storeParam.toLowerCase() === 'all') return null;

    const storeArr = storeParam.split(',').map(s => s.trim()).filter(Boolean);
    if (storeArr.length === 0) return null;

    const allBranches = await Branch.find({}).lean();
    const allWalkinStores = await Walkin.distinct("store").catch(() => []);

    const matchedBranchIds = new Set();
    const matchedStoreNames = new Set();

    storeArr.forEach(s => {
        const key = locationKey(s);
        matchedStoreNames.add(s);

        if (key) {
            allBranches.forEach(b => {
                const bKey = locationKey(b.workingBranch || b.location || "");
                if (bKey === key || norm(b.workingBranch).includes(key)) {
                    if (b._id) matchedBranchIds.add(b._id.toString());
                    if (b.workingBranch) matchedStoreNames.add(b.workingBranch);
                }
            });

            allWalkinStores.forEach(ws => {
                if (typeof ws === 'string') {
                    const wsKey = locationKey(ws);
                    if (wsKey === key || norm(ws).includes(key)) {
                        matchedStoreNames.add(ws);
                    }
                }
            });
        }
    });

    const matchedIdsArray = [];
    matchedBranchIds.forEach(id => {
        matchedIdsArray.push(id);
        try {
            matchedIdsArray.push(new mongoose.Types.ObjectId(id));
        } catch {
            // ignore
        }
    });

    const matchedNamesArray = Array.from(matchedStoreNames);

    return {
        query: {
            $or: [
                { store: { $in: matchedNamesArray } },
                { storeId: { $in: matchedIdsArray } }
            ]
        },
        matchedIdsArray,
        matchedNamesArray
    };
};

const getFormattedDateTime = (date = new Date()) => {
    const d = new Date(date);
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const hour = String(istDate.getUTCHours()).padStart(2, '0');
    const minute = String(istDate.getUTCMinutes()).padStart(2, '0');
    const second = String(istDate.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const getLocalDateStringIST = (date) => {
    if (!date) return null;
    const d = new Date(date);
    // Convert to IST offset string
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(d); // YYYY-MM-DD
};

const pushToStatusHistory = (walkinRecord, entry) => {
    if (!walkinRecord.statusHistory) {
        walkinRecord.statusHistory = [];
    }
    const status = String(entry.status || '').trim();
    const date = entry.date ? new Date(entry.date) : new Date();
    const source = String(entry.source || 'manual').trim();
    const category = entry.category && entry.category !== '-' ? entry.category : 'Product';
    const subCategory = entry.subCategory || '-';

    // Duplicate check: same status + same IST date + same source
    const targetIST = getLocalDateStringIST(date);
    const isDuplicate = walkinRecord.statusHistory.some(h => {
        const hStatus = String(h.status || '').trim();
        const hSource = String(h.source || '-').trim();
        const hIST = getLocalDateStringIST(h.date);
        return hStatus === status && hSource === source && hIST === targetIST;
    });

    if (!isDuplicate) {
        walkinRecord.statusHistory.push({
            status,
            category,
            subCategory,
            date,
            source
        });
        return true;
    }
    return false;
};

const updateStatusAndDates = (walkinRecord, statusInput, source = 'manual') => {
    if (!statusInput) return false;
    const cleanInput = statusInput.trim();
    
    const isShoeStatus = (s) => ['Billed', 'Bill Returned'].includes(s);
    
    let rentalUpdated = false;
    let shoeUpdated = false;
    
    if (cleanInput.includes(',')) {
        const parts = cleanInput.split(',').map(p => p.trim());
        const shoePart = parts.find(isShoeStatus);
        const rentalPart = parts.find(p => !isShoeStatus(p));
        
        if (rentalPart && walkinRecord.rentalStatus !== rentalPart) {
            walkinRecord.rentalStatus = rentalPart;
            rentalUpdated = true;
        }
        if (shoePart && walkinRecord.shoeStatus !== shoePart) {
            walkinRecord.shoeStatus = shoePart;
            shoeUpdated = true;
        }
    } else {
        if (isShoeStatus(cleanInput)) {
            if (walkinRecord.shoeStatus !== cleanInput) {
                walkinRecord.shoeStatus = cleanInput;
                shoeUpdated = true;
            }
        } else {
            if (walkinRecord.rentalStatus !== cleanInput) {
                walkinRecord.rentalStatus = cleanInput;
                rentalUpdated = true;
            }
        }
    }
    
    if (rentalUpdated) {
        const rStatus = walkinRecord.rentalStatus;
        const statusLower = rStatus.toLowerCase();
        if (statusLower.includes('booking') || statusLower === 'booked') {
            walkinRecord.bookingDate = new Date();
        } else if (statusLower.includes('rentout') || statusLower === 'rent out') {
            walkinRecord.rentoutDate = new Date();
        } else if (statusLower === 'return') {
            walkinRecord.returnDate = new Date();
        } else if (statusLower === 'cancelled' || statusLower === 'cancel') {
            walkinRecord.cancelDate = new Date();
            walkinRecord.cancellationDate = new Date();
        }
        
        pushToStatusHistory(walkinRecord, {
            status: rStatus,
            category: walkinRecord.category && walkinRecord.category !== '-' ? walkinRecord.category : 'Product',
            subCategory: walkinRecord.subCategory || '-',
            date: new Date(),
            source
        });
    }
    
    if (shoeUpdated) {
        const sStatus = walkinRecord.shoeStatus;
        if (sStatus === 'Billed') {
            walkinRecord.billedDate = new Date();
        } else if (sStatus === 'Bill Returned') {
            walkinRecord.billReturnedDate = new Date();
        }
        
        pushToStatusHistory(walkinRecord, {
            status: sStatus,
            category: 'Sales',
            subCategory: '-',
            date: new Date(),
            source
        });
    }
    
    if (rentalUpdated || shoeUpdated) {
        const getCombinedStatus = (rental, shoe) => {
            const r = (rental || 'New Walkin').trim();
            const s = (shoe || '').trim();
            if (!s || s === '-' || s === 'None') return r;
            if (r === 'New Walkin' || r === '-') return s;
            return `${r}, ${s}`;
        };
        walkinRecord.status = getCombinedStatus(walkinRecord.rentalStatus, walkinRecord.shoeStatus);
        return true;
    }
    return false;
};

// Lock set to prevent concurrent double-click/race condition submissions
const activeSubmissions = new Set();



/**
 * Helper to match stores based on normalized location keys
 */
function isStoreAllowed(walkinStore, allowedBranches) {
    const normWalkinStore = locationKey(walkinStore);
    return allowedBranches.some(branch => {
        const normBranchName = locationKey(branch.workingBranch);
        return normBranchName === normWalkinStore || branch.locCode === walkinStore;
    });
}

/**
 * Check if a customer already exists by their contact phone number
 */
export const checkCustomerExists = async (req, res) => {
    try {
        const { contact } = req.params;
        console.log(`\n--- [checkCustomerExists] ---`);
        console.log(`Incoming phone: "${contact}"`);
        console.log(`req.admin:`, req.admin);

        if (!contact) {
            return res.status(400).json({ success: false, message: 'Contact phone number is required' });
        }

        let query = { contact: contact.trim() };

        // Apply store-wide filtering if admin token is present
        if (req.admin) {
            const adminId = req.admin.userId;
            query = await buildStoreWideWalkinFilter(adminId, query);
            console.log(`Resolved query with permissions:`, JSON.stringify(query, null, 2));
            if (query._id === null) {
                console.log(`Access denied: query._id is null`);
                return res.status(403).json({ success: false, message: 'Admin not found or access denied' });
            }
        } else {
            console.log(`No req.admin found, querying globally:`, query);
        }

        // Find the latest walkin record for this customer
        const latestWalkin = await Walkin.findOne(query)
            .sort({ createdAt: -1 });

        console.log(`Query Result found?`, latestWalkin ? `Yes (ID: ${latestWalkin._id}, Store: ${latestWalkin.store}, StoreId: ${latestWalkin.storeId})` : 'No');

        if (latestWalkin) {
            return res.status(200).json({
                success: true,
                exists: true,
                message: 'Customer exists',
                data: latestWalkin
            });
        }

        return res.status(200).json({
            success: true,
            exists: false,
            message: 'New customer'
        });
    } catch (error) {
        console.error('Error checking customer existence:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while checking customer',
            error: error.message
        });
    }
};

/**
 * Save a new walk-in record to the database
 */
export const saveWalkin = async (req, res) => {
    try {
        const isNewWalkinStatus = (s) => {
            if (!s) return true;
            const norm = s.replace(/[^a-z0-9]/gi, '').toLowerCase();
            return norm === 'newwalkin' || norm === 'newwalk';
        };
        const source = req.body.source || (req.headers['x-source-app'] ? 'app' : (req.headers['x-source-web'] ? 'web' : 'manual'));
        if (req.admin && req.admin.role === 'telecaller') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Telecallers are not allowed to add or edit walk-ins.'
            });
        }

        let {
            _id,
            customerName,
            contact,
            functionDate,
            store,
            staff,
            storeId,
            employeeId,
            category,
            subCategory,
            functionType,
            remarks,
            status,
            date,
            fileAttachment,
            notes,
            lossProductType,
            lossSize,
            lossColour,
            lossSalesPrice,
            lossSelectRemarks,
            lossEnquiryTrailOption,
            lossEnquiryRevisitDate,
            lossReason
        } = req.body;

        // Parse optional fields with fallback to aliases posted from Flutter / Web panel
        const notesVal = notes !== undefined ? notes : (req.body.note !== undefined ? req.body.note : req.body.lossNote);
        const lossProductTypeVal = lossProductType !== undefined ? lossProductType : req.body.productType;
        const lossSizeVal = lossSize !== undefined ? lossSize : req.body.size;
        const lossColourVal = lossColour !== undefined ? lossColour : (req.body.colour !== undefined ? req.body.colour : (req.body.color !== undefined ? req.body.color : req.body.lossColor));
        const lossSalesPriceVal = lossSalesPrice !== undefined ? lossSalesPrice : (req.body.salesPrice !== undefined ? req.body.salesPrice : req.body.price);
        const lossSelectRemarksVal = lossSelectRemarks !== undefined ? lossSelectRemarks : (req.body.priceRemarks !== undefined ? req.body.priceRemarks : req.body.selectRemarks);
        const lossEnquiryTrailOptionVal = lossEnquiryTrailOption !== undefined ? lossEnquiryTrailOption : req.body.trialOption;
        const lossEnquiryRevisitDateVal = lossEnquiryRevisitDate !== undefined ? lossEnquiryRevisitDate : req.body.revisitDate;
        const lossReasonVal = lossReason !== undefined ? lossReason : req.body.lossReason;
        const categoryTierVal = req.body.productCategory !== undefined 
            ? req.body.productCategory 
            : (req.body.workSize !== undefined 
                ? req.body.workSize 
                : (req.body.lossProductCategory !== undefined 
                    ? req.body.lossProductCategory 
                    : (req.body.lossWorkSize !== undefined 
                        ? req.body.lossWorkSize 
                        : req.body.productCategoryTier)));
        const productCategoryVal = categoryTierVal;
        const workSizeVal = categoryTierVal;
        const workTypeVal = req.body.workType !== undefined ? req.body.workType : req.body.lossWorkType;

        const setOptionalLossFields = (record) => {
            if (notesVal !== undefined) record.notes = String(notesVal).trim();
            if (lossProductTypeVal !== undefined) record.lossProductType = String(lossProductTypeVal).trim();
            if (lossSizeVal !== undefined) record.lossSize = String(lossSizeVal).trim();
            if (lossColourVal !== undefined) record.lossColour = String(lossColourVal).trim();
            if (lossSalesPriceVal !== undefined) record.lossSalesPrice = String(lossSalesPriceVal).trim();
            if (lossSelectRemarksVal !== undefined) record.lossSelectRemarks = String(lossSelectRemarksVal).trim();
            if (lossEnquiryTrailOptionVal !== undefined) record.lossEnquiryTrailOption = String(lossEnquiryTrailOptionVal).trim();
            if (lossEnquiryRevisitDateVal !== undefined) record.lossEnquiryRevisitDate = String(lossEnquiryRevisitDateVal).trim();
            if (lossReasonVal !== undefined) record.lossReason = String(lossReasonVal).trim();
            if (productCategoryVal !== undefined) record.productCategory = String(productCategoryVal).trim();
            if (workTypeVal !== undefined) record.workType = String(workTypeVal).trim();
            if (workSizeVal !== undefined) record.workSize = String(workSizeVal).trim();
        };

        if (!_id && (!customerName || !contact)) {
            return res.status(400).json({
                success: false,
                message: 'customerName and contact are required fields'
            });
        }

        // Validate mandatory fields for Design / Colour Not Available reasons
        const incomingStatusStr = status ? String(status).trim() : '';
        const incomingReasonStr = String(lossReasonVal || '').toLowerCase().trim();
        const isDesignNotAvailableReason = incomingReasonStr === 'design not available' || incomingReasonStr === 'design and colour not available' || incomingReasonStr === 'design & colour not available' || incomingReasonStr === 'design and color unavailable' || incomingReasonStr === 'model, design and colour not available';
        const isColourNotAvailableReason = incomingReasonStr === 'colour not available' || incomingReasonStr === 'color not available';

        if (incomingStatusStr === 'Loss' && isDesignNotAvailableReason) {
            const hasAttachment = (fileAttachment && (fileAttachment.base64 || fileAttachment.name)) || (req.body.attachment && String(req.body.attachment).trim() !== '') || (_id && (await Walkin.findById(_id))?.attachment);
            if (!hasAttachment && (!notesVal || String(notesVal).trim() === '')) {
                return res.status(400).json({ success: false, message: 'Note is required when no attachment is provided.' });
            }
            if (!workTypeVal || String(workTypeVal).trim() === '') {
                return res.status(400).json({ success: false, message: 'Work Type is required when reason is Design Not Available' });
            }
            if (!lossSizeVal || String(lossSizeVal).trim() === '') {
                return res.status(400).json({ success: false, message: 'Size is required when reason is Design Not Available' });
            }
            if (!productCategoryVal || String(productCategoryVal).trim() === '') {
                return res.status(400).json({ success: false, message: 'Product Category is required when reason is Design Not Available' });
            }
        }

        if (incomingStatusStr === 'Loss' && isColourNotAvailableReason) {
            const hasAttachment = (fileAttachment && (fileAttachment.base64 || fileAttachment.name)) || (req.body.attachment && String(req.body.attachment).trim() !== '') || (_id && (await Walkin.findById(_id))?.attachment);
            if (!hasAttachment && (!notesVal || String(notesVal).trim() === '')) {
                return res.status(400).json({ success: false, message: 'Note is required when no attachment is provided.' });
            }
            if (!lossColourVal || String(lossColourVal).trim() === '') {
                return res.status(400).json({ success: false, message: 'Colour is required when reason is Colour Not Available' });
            }
            if (!productCategoryVal || String(productCategoryVal).trim() === '') {
                return res.status(400).json({ success: false, message: 'Product Category is required when reason is Colour Not Available' });
            }
        }

        const trimmedContact = contact ? contact.trim() : '-';

        // Validate first-time mobile numbers with zero history must start with 'New Walkin' status
        if (!_id && trimmedContact && trimmedContact !== '-') {
            const historyCount = await Walkin.countDocuments({ contact: trimmedContact });
            const isNewStatus = !incomingStatusStr || isNewWalkinStatus(incomingStatusStr);
            if (historyCount === 0 && !isNewStatus) {
                return res.status(400).json({
                    success: false,
                    message: "First-time walk-in for a new customer mobile number must start with status 'New Walkin'"
                });
            }
        }

        // Automatically fetch current date and time when adding walk-ins
        const todayStr = _id ? (date || getFormattedDateTime()) : getFormattedDateTime();

        // Process token / Role-based overrides
        let finalStore = store ? store.trim() : '-';
        let finalStaff = staff ? staff.trim() : 'None';
        let finalStoreId = storeId;
        let finalEmployeeId = employeeId;
        let createdBy = null;

        // Try to find employee by passed empID / empid or req.admin.userId
        let lookupUser = null;

        const passedEmpId = req.body.empID || req.body.empid || req.body.employeeId || req.body.staff;
        if (passedEmpId) {
            lookupUser = await User.findOne({ 
                $or: [
                    { empID: { $regex: `^${String(passedEmpId).trim()}$`, $options: 'i' } },
                    { username: { $regex: `^${String(passedEmpId).trim()}$`, $options: 'i' } }
                ]
            });
            if (!lookupUser) {
                lookupUser = await Admin.findOne({ 
                    $or: [
                        { EmpId: { $regex: `^${String(passedEmpId).trim()}$`, $options: 'i' } },
                        { name: { $regex: `^${String(passedEmpId).trim()}$`, $options: 'i' } }
                    ]
                }).populate('branches');
            }
            if (!lookupUser && mongoose.Types.ObjectId.isValid(passedEmpId)) {
                lookupUser = await User.findById(passedEmpId);
                if (!lookupUser) {
                    lookupUser = await Admin.findById(passedEmpId).populate('branches');
                }
            }
        }

        if (!lookupUser && req.admin && req.admin.userId) {
            lookupUser = await User.findById(req.admin.userId);
            if (!lookupUser) {
                lookupUser = await Admin.findById(req.admin.userId).populate('branches');
            }
        }

        if (lookupUser) {
            const isUser = lookupUser.empID !== undefined;
            if (isUser) {
                finalStaff = (staff && staff !== '-' && staff !== 'None') ? staff.trim() : lookupUser.username;
                finalStore = (store && store !== '-' && store !== '') ? store.trim() : lookupUser.workingBranch;
                finalEmployeeId = lookupUser._id;

                const branch = await Branch.findOne({
                    $or: [
                        { locCode: lookupUser.locCode },
                        { workingBranch: lookupUser.workingBranch }
                    ]
                });
                if (branch) {
                    finalStoreId = branch._id;
                }
            } else {
                finalStaff = (staff && staff !== '-' && staff !== 'None') ? staff.trim() : lookupUser.name;
                finalEmployeeId = lookupUser._id;

                const isSuperOrHrAdmin = ['super_admin', 'admin', 'hr_admin'].includes(lookupUser.role);
                if ((!store || store === '-' || store === '') && !isSuperOrHrAdmin) {
                    if (lookupUser.branches && lookupUser.branches.length > 0) {
                        finalStore = lookupUser.branches[0].workingBranch;
                        finalStoreId = lookupUser.branches[0]._id;
                    } else if (lookupUser.workingBranch) {
                        finalStore = lookupUser.workingBranch;
                        const branch = await Branch.findOne({ workingBranch: lookupUser.workingBranch });
                        if (branch) {
                            finalStoreId = branch._id;
                        }
                    }
                }
            }
            createdBy = req.admin ? req.admin.userId : lookupUser._id;
        } else if (req.admin) {
            createdBy = req.admin.userId;
        }

        // Resolve storeId from store name if missing
        if (finalStore && finalStore !== '-' && !finalStoreId) {
            const branch = await Branch.findOne({
                $or: [
                    { locCode: finalStore },
                    { workingBranch: finalStore }
                ]
            });
            if (branch) {
                finalStoreId = branch._id;
            }
        }

        if (req.admin && !req.admin.isSystem) {
            const adminId = req.admin.userId;
            const isAdminManager = ['super_admin', 'admin', 'hr_admin'].includes(req.admin.role);
            if (!isAdminManager) {
                if (finalStoreId && mongoose.Types.ObjectId.isValid(finalStoreId)) {
                    await validateStoreAccess(adminId, finalStoreId);
                }
                if (finalEmployeeId && mongoose.Types.ObjectId.isValid(finalEmployeeId)) {
                    await validateEmployeeAccess(adminId, finalEmployeeId);
                }
            }
        }

        // Sanitize IDs to prevent Cast to ObjectId BSONErrors
        if (finalStoreId !== undefined && finalStoreId !== null && !mongoose.Types.ObjectId.isValid(finalStoreId)) {
            finalStoreId = undefined;
        }
        if (finalEmployeeId !== undefined && finalEmployeeId !== null && !mongoose.Types.ObjectId.isValid(finalEmployeeId)) {
            finalEmployeeId = undefined;
        }


        // Direct update by _id (e.g. edited from list view)
        if (_id) {
            let updateQuery = { _id };
            if (req.admin) {
                const adminId = req.admin.userId;
                updateQuery = await buildStoreWideWalkinFilter(adminId, updateQuery);
                if (updateQuery._id === null) {
                    return res.status(403).json({ success: false, message: 'Access denied to this walk-in record' });
                }
            }

            const walkinRecord = await Walkin.findOne(updateQuery);
            if (!walkinRecord) {
                return res.status(404).json({ success: false, message: 'Walk-in record not found or access denied' });
            }

            const incomingStatus = status ? status.trim() : '';
            if (isNewWalkinStatus(incomingStatus) && !isNewWalkinStatus(walkinRecord.status)) {
                // Reset option: Keep existing walk-in with the same data, and create a brand new one with repeatCount = 1
                const newWalkin = new Walkin({
                    customerName: customerName ? customerName.trim() : walkinRecord.customerName,
                    contact: trimmedContact !== '-' ? trimmedContact : walkinRecord.contact,
                    functionDate: functionDate ? functionDate.trim() : walkinRecord.functionDate,
                    store: store ? store.trim() : walkinRecord.store,
                    staff: staff ? staff.trim() : walkinRecord.staff,
                    storeId: finalStoreId || walkinRecord.storeId,
                    employeeId: finalEmployeeId || walkinRecord.employeeId,
                    createdBy: createdBy || walkinRecord.createdBy,
                    category: category ? category.trim() : walkinRecord.category,
                    subCategory: subCategory ? subCategory.trim() : walkinRecord.subCategory,
                    functionType: (functionType && functionType !== '-') ? functionType.trim() : (walkinRecord.functionType || '-'),
                    attachment: (fileAttachment && fileAttachment.base64) ? fileAttachment.base64 : walkinRecord.attachment,
                    attachmentName: (fileAttachment && fileAttachment.name) ? fileAttachment.name : walkinRecord.attachmentName,
                    remarks: remarks ? remarks.trim() : walkinRecord.remarks,
                    notes: notesVal !== undefined ? String(notesVal).trim() : walkinRecord.notes,
                    lossProductType: lossProductTypeVal !== undefined ? String(lossProductTypeVal).trim() : walkinRecord.lossProductType,
                    lossSize: lossSizeVal !== undefined ? String(lossSizeVal).trim() : walkinRecord.lossSize,
                    lossColour: lossColourVal !== undefined ? String(lossColourVal).trim() : walkinRecord.lossColour,
                    lossSalesPrice: lossSalesPriceVal !== undefined ? String(lossSalesPriceVal).trim() : walkinRecord.lossSalesPrice,
                    lossSelectRemarks: lossSelectRemarksVal !== undefined ? String(lossSelectRemarksVal).trim() : walkinRecord.lossSelectRemarks,
                    lossEnquiryTrailOption: lossEnquiryTrailOptionVal !== undefined ? String(lossEnquiryTrailOptionVal).trim() : walkinRecord.lossEnquiryTrailOption,
                    lossEnquiryRevisitDate: lossEnquiryRevisitDateVal !== undefined ? String(lossEnquiryRevisitDateVal).trim() : walkinRecord.lossEnquiryRevisitDate,
                    lossReason: lossReasonVal !== undefined ? String(lossReasonVal).trim() : walkinRecord.lossReason,
                    productCategory: productCategoryVal !== undefined ? String(productCategoryVal).trim() : walkinRecord.productCategory,
                    workType: workTypeVal !== undefined ? String(workTypeVal).trim() : (walkinRecord.workType || ''),
                    workSize: workSizeVal !== undefined ? String(workSizeVal).trim() : (walkinRecord.workSize || ''),
                    repeatCount: 1,
                    date: todayStr
                });
                updateStatusAndDates(newWalkin, 'New Walkin', source);
                pushToStatusHistory(newWalkin, {
                    status: 'New Walkin',
                    category: newWalkin.category || '-',
                    subCategory: newWalkin.subCategory || '-',
                    date: newWalkin.createdAt || new Date(),
                    source
                });
                await newWalkin.save();

                return res.status(201).json({
                    success: true,
                    message: 'New walk-in reset created successfully',
                    data: newWalkin
                });
            }

            if (customerName !== undefined && customerName !== null) walkinRecord.customerName = customerName.trim();
            if (contact !== undefined && contact !== null) walkinRecord.contact = trimmedContact;
            if (functionDate) walkinRecord.functionDate = functionDate.trim();
            if (store !== undefined && store !== null) walkinRecord.store = store.trim();
            
            // Keep the original employeeId, createdBy, and staff unless they are not set on the walkinRecord
            if (!walkinRecord.employeeId && finalEmployeeId !== undefined && finalEmployeeId !== null) {
                walkinRecord.employeeId = finalEmployeeId;
            }
            if (!walkinRecord.staff || walkinRecord.staff === 'None' || walkinRecord.staff === '-') {
                if (staff !== undefined && staff !== null) {
                    walkinRecord.staff = staff.trim();
                } else if (finalStaff && finalStaff !== 'None') {
                    walkinRecord.staff = finalStaff;
                }
            }
            if (finalStoreId !== undefined && finalStoreId !== null) walkinRecord.storeId = finalStoreId;

            if (category) walkinRecord.category = category.trim();
            if (subCategory) walkinRecord.subCategory = subCategory.trim();
            if (functionType) {
                walkinRecord.functionType = functionType.trim();
            }
            if (fileAttachment && fileAttachment.base64) {
                walkinRecord.attachment = fileAttachment.base64;
                walkinRecord.attachmentName = fileAttachment.name;
            }
            if (remarks) walkinRecord.remarks = remarks.trim();
            setOptionalLossFields(walkinRecord);
            let statusChanged = false;
            if (status) {
                const trimmedStatus = status.trim();
                if (walkinRecord.status !== trimmedStatus) {
                    statusChanged = true;
                    // Check if status was already changed today
                    const currentTodayIST = getLocalDateStringIST(new Date());
                    const lastChangeIST = getLocalDateStringIST(walkinRecord.lastStatusChangeDate);

                    if (lastChangeIST && lastChangeIST === currentTodayIST) {
                        return res.status(400).json({
                            success: false,
                            message: 'Status can only be changed once per day. Please try again tomorrow.',
                            lastStatusChange: walkinRecord.lastStatusChangeDate
                        });
                    }

                    // Only increment repeatCount if the status change happens on a DIFFERENT day and is not Cancelled
                    const existingDateStr = walkinRecord.date ? walkinRecord.date.substring(0, 10) : null;
                    const todayDateStr = todayStr.substring(0, 10);
                    const isCancelled = trimmedStatus === 'Cancelled' || trimmedStatus === 'Cancel' || trimmedStatus.includes('Cancelled') || trimmedStatus.includes('Cancel');
                    if (existingDateStr !== todayDateStr && !isCancelled) {
                        walkinRecord.repeatCount = (walkinRecord.repeatCount || 1) + 1;
                    }

                    // Update status change tracking
                    walkinRecord.lastStatusChangeDate = new Date();
                    walkinRecord.statusChangedToday = true;

                    updateStatusAndDates(walkinRecord, trimmedStatus, source);
                }
            }
            if (!walkinRecord.createdBy && createdBy) {
                walkinRecord.createdBy = createdBy;
            }
            walkinRecord.date = todayStr; // Update visit date to the requested value

            if (statusChanged) {
                await walkinRecord.save();
            } else {
                await walkinRecord.save({ timestamps: false });
            }
            return res.status(200).json({
                success: true,
                message: 'Walk-in updated successfully',
                data: walkinRecord
            });
        }

        let walkinRecord = null;
        if (trimmedContact !== '-' && trimmedContact !== '') {
            let query = { contact: trimmedContact };
            if (req.admin) {
                const adminId = req.admin.userId;
                query = await buildStoreWideWalkinFilter(adminId, query);
            }
            walkinRecord = await Walkin.findOne(query).sort({ createdAt: -1 });
        }

        const isSameStore = walkinRecord && (
            locationKey(walkinRecord.store) === locationKey(finalStore) ||
            (walkinRecord.storeId && finalStoreId && walkinRecord.storeId.toString() === finalStoreId.toString())
        );

        if (walkinRecord && !isNewWalkinStatus(status) && isSameStore) {
            let statusChanged = false;
            // Check if status was already changed today
            if (status && status.trim() !== walkinRecord.status) {
                statusChanged = true;
                const currentTodayIST = getLocalDateStringIST(new Date());
                const lastChangeIST = getLocalDateStringIST(walkinRecord.lastStatusChangeDate);

                if (lastChangeIST && lastChangeIST === currentTodayIST) {
                    return res.status(400).json({
                        success: false,
                        message: 'Status can only be changed once per day. Please try again tomorrow.',
                        lastStatusChange: walkinRecord.lastStatusChangeDate
                    });
                }

                // Only increment repeatCount if status change happens on a DIFFERENT day than last recorded and is not Cancelled
                const existingDateStr = walkinRecord.date ? walkinRecord.date.substring(0, 10) : null;
                const todayDateStr = todayStr.substring(0, 10);
                const isCancelled = status.trim() === 'Cancelled' || status.trim() === 'Cancel' || status.trim().includes('Cancelled') || status.trim().includes('Cancel');
                if (existingDateStr !== todayDateStr && !isCancelled) {
                    walkinRecord.repeatCount += 1;
                }
            }

            if (customerName !== undefined && customerName !== null) walkinRecord.customerName = customerName.trim();
            if (functionDate) walkinRecord.functionDate = functionDate.trim();
            if (store !== undefined && store !== null) walkinRecord.store = store.trim();
            
            // Keep the original employeeId, createdBy, and staff unless they are not set on the walkinRecord
            if (!walkinRecord.employeeId && finalEmployeeId !== undefined && finalEmployeeId !== null) {
                walkinRecord.employeeId = finalEmployeeId;
            }
            if (!walkinRecord.staff || walkinRecord.staff === 'None' || walkinRecord.staff === '-') {
                if (staff !== undefined && staff !== null) {
                    walkinRecord.staff = staff.trim();
                } else if (finalStaff && finalStaff !== 'None') {
                    walkinRecord.staff = finalStaff;
                }
            }
            if (finalStoreId !== undefined && finalStoreId !== null) walkinRecord.storeId = finalStoreId;

            if (category) walkinRecord.category = category.trim();
            if (subCategory) walkinRecord.subCategory = subCategory.trim();
            if (functionType) {
                walkinRecord.functionType = functionType.trim();
            }
            if (fileAttachment && fileAttachment.base64) {
                walkinRecord.attachment = fileAttachment.base64;
                walkinRecord.attachmentName = fileAttachment.name;
            }
            if (remarks) walkinRecord.remarks = remarks.trim();
            setOptionalLossFields(walkinRecord);
            if (status) {
                const trimmedStatus = status.trim();
                if (walkinRecord.status !== trimmedStatus) {
                    walkinRecord.lastStatusChangeDate = new Date();
                    walkinRecord.statusChangedToday = true;

                    updateStatusAndDates(walkinRecord, trimmedStatus, source);
                }
            }
            if (!walkinRecord.createdBy && createdBy) {
                walkinRecord.createdBy = createdBy;
            }
            walkinRecord.date = todayStr; // Update to latest visit date

            if (statusChanged) {
                await walkinRecord.save();
            } else {
                await walkinRecord.save({ timestamps: false });
            }
            return res.status(200).json({
                success: true,
                message: 'Existing walk-in updated successfully',
                data: walkinRecord
            });
        } else {
            // Check for rapid duplicate submission (created within 2 minutes) for same contact and store
            if (trimmedContact !== '-' && trimmedContact !== '') {
                const lockKey = `${finalStoreId || finalStore || 'store'}_${trimmedContact}`;
                if (activeSubmissions.has(lockKey)) {
                    console.log(`[saveWalkin] Concurrent request locked for key: "${lockKey}"`);
                    return res.status(200).json({
                        success: true,
                        message: 'Walk-in submission is already being processed',
                        isDuplicatePrevented: true
                    });
                }
                // Acquire lock synchronously before any async operations
                activeSubmissions.add(lockKey);

                try {
                    // Deduplication check: check if a walk-in was created within the last 2 minutes
                    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
                    let recentDupQuery = {
                        contact: trimmedContact,
                        createdAt: { $gte: twoMinutesAgo }
                    };
                    if (finalStoreId) {
                        recentDupQuery.storeId = finalStoreId;
                    } else if (finalStore && finalStore !== '-') {
                        recentDupQuery.store = finalStore;
                    }

                    const recentDup = await Walkin.findOne(recentDupQuery).sort({ createdAt: -1 });
                    if (recentDup) {
                        console.log(`[saveWalkin] Rapid duplicate prevented for contact "${trimmedContact}" at store "${finalStore}" (Existing ID: ${recentDup._id})`);
                        return res.status(200).json({
                            success: true,
                            message: 'Walk-in record was already saved recently',
                            isDuplicatePrevented: true,
                            data: recentDup
                        });
                    }

                    // Query the latest walk-in for this contact AT THE SAME STORE to base the repeatCount on the store-specific history.
                    let storeLatest = null;
                    if (finalStoreId) {
                        storeLatest = await Walkin.findOne({
                            contact: trimmedContact,
                            storeId: finalStoreId
                        }).sort({ createdAt: -1 });
                    } else if (finalStore && finalStore !== '-') {
                        storeLatest = await Walkin.findOne({
                            contact: trimmedContact,
                            store: finalStore
                        }).sort({ createdAt: -1 });
                    }
                    const initialStatus = isNewWalkinStatus(status) ? 'New Walkin' : (status ? status.trim() : 'New Walkin');
                    const nextRepeatCount = initialStatus === 'New Walkin' ? 1 : (storeLatest ? (storeLatest.repeatCount || 1) + 1 : 1);

                    const newWalkin = new Walkin({
                        customerName: customerName ? customerName.trim() : '-',
                        contact: trimmedContact,
                        functionDate: functionDate ? functionDate.trim() : '-',
                        store: finalStore,
                        staff: finalStaff,
                        storeId: finalStoreId || undefined,
                        employeeId: finalEmployeeId || undefined,
                        createdBy: createdBy || undefined,
                        category: category ? category.trim() : '-',
                        functionType: functionType ? functionType.trim() : '-',
                        attachment: (fileAttachment && fileAttachment.base64) ? fileAttachment.base64 : '',
                        attachmentName: (fileAttachment && fileAttachment.name) ? fileAttachment.name : '',
                        remarks: remarks ? remarks.trim() : '-',
                        notes: notesVal !== undefined ? String(notesVal).trim() : '',
                        lossProductType: lossProductTypeVal !== undefined ? String(lossProductTypeVal).trim() : '',
                        lossSize: lossSizeVal !== undefined ? String(lossSizeVal).trim() : '',
                        lossColour: lossColourVal !== undefined ? String(lossColourVal).trim() : '',
                        lossSalesPrice: lossSalesPriceVal !== undefined ? String(lossSalesPriceVal).trim() : '',
                        lossSelectRemarks: lossSelectRemarksVal !== undefined ? String(lossSelectRemarksVal).trim() : '',
                        lossEnquiryTrailOption: lossEnquiryTrailOptionVal !== undefined ? String(lossEnquiryTrailOptionVal).trim() : '',
                        lossEnquiryRevisitDate: lossEnquiryRevisitDateVal !== undefined ? String(lossEnquiryRevisitDateVal).trim() : '',
                        lossReason: lossReasonVal !== undefined ? String(lossReasonVal).trim() : '',
                        productCategory: productCategoryVal !== undefined ? String(productCategoryVal).trim() : '',
                        workType: workTypeVal !== undefined ? String(workTypeVal).trim() : '',
                        workSize: workSizeVal !== undefined ? String(workSizeVal).trim() : '',
                        repeatCount: nextRepeatCount,
                        date: todayStr
                    });
                    updateStatusAndDates(newWalkin, initialStatus, source);
                    pushToStatusHistory(newWalkin, {
                        status: 'New Walkin',
                        category: newWalkin.category || '-',
                        subCategory: newWalkin.subCategory || '-',
                        date: newWalkin.createdAt || new Date(),
                        source
                    });
                    await newWalkin.save();
                    return res.status(201).json({
                        success: true,
                        message: 'New walk-in saved successfully',
                        data: newWalkin
                    });
                } finally {
                    activeSubmissions.delete(lockKey);
                }
            } else {
                // Anonymous walk-in (no contact number provided)
                const initialStatus = isNewWalkinStatus(status) ? 'New Walkin' : (status ? status.trim() : 'New Walkin');
                const newWalkin = new Walkin({
                    customerName: customerName ? customerName.trim() : '-',
                    contact: trimmedContact,
                    functionDate: functionDate ? functionDate.trim() : '-',
                    store: finalStore,
                    staff: finalStaff,
                    storeId: finalStoreId || undefined,
                    employeeId: finalEmployeeId || undefined,
                    createdBy: createdBy || undefined,
                    category: category ? category.trim() : '-',
                    functionType: functionType ? functionType.trim() : '-',
                    attachment: (fileAttachment && fileAttachment.base64) ? fileAttachment.base64 : '',
                    attachmentName: (fileAttachment && fileAttachment.name) ? fileAttachment.name : '',
                    remarks: remarks ? remarks.trim() : '-',
                    notes: notesVal !== undefined ? String(notesVal).trim() : '',
                    lossProductType: lossProductTypeVal !== undefined ? String(lossProductTypeVal).trim() : '',
                    lossSize: lossSizeVal !== undefined ? String(lossSizeVal).trim() : '',
                    lossColour: lossColourVal !== undefined ? String(lossColourVal).trim() : '',
                    lossSalesPrice: lossSalesPriceVal !== undefined ? String(lossSalesPriceVal).trim() : '',
                    lossSelectRemarks: lossSelectRemarksVal !== undefined ? String(lossSelectRemarksVal).trim() : '',
                    lossEnquiryTrailOption: lossEnquiryTrailOptionVal !== undefined ? String(lossEnquiryTrailOptionVal).trim() : '',
                    lossEnquiryRevisitDate: lossEnquiryRevisitDateVal !== undefined ? String(lossEnquiryRevisitDateVal).trim() : '',
                    lossReason: lossReasonVal !== undefined ? String(lossReasonVal).trim() : '',
                    productCategory: productCategoryVal !== undefined ? String(productCategoryVal).trim() : '',
                    workType: workTypeVal !== undefined ? String(workTypeVal).trim() : '',
                    workSize: workSizeVal !== undefined ? String(workSizeVal).trim() : '',
                    repeatCount: 1,
                    date: todayStr
                });
                updateStatusAndDates(newWalkin, initialStatus, source);
                pushToStatusHistory(newWalkin, {
                    status: 'New Walkin',
                    category: newWalkin.category || '-',
                    subCategory: newWalkin.subCategory || '-',
                    date: newWalkin.createdAt || new Date(),
                    source
                });
                await newWalkin.save();
                return res.status(201).json({
                    success: true,
                    message: 'New walk-in saved successfully',
                    data: newWalkin
                });
            }
        }
    } catch (error) {
        console.error('Error saving walk-in:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while saving walk-in',
            error: error.message
        });
    }
};

/**
 * Get all walk-in records with role-based filtering and date range support
 */
export const getWalkins = async (req, res) => {
    try {
        const { startDate, endDate, updatedStartDate, updatedEndDate, createdAtStartDate, createdAtEndDate, activityStartDate, activityEndDate, storeId, employeeId, page, limit, search = '', status = '', store = '', dashboard = '', countOnly = '', chartOnly = '', sortBy, functionType = '', eventType = '' } = req.query;
        const adminId = req.admin.userId;

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 0;
        const skipNum = (pageNum - 1) * limitNum;

        // 1. Build Base Query based on date/frontend filters
        let baseQuery = {};

        if (storeId) {
            await validateStoreAccess(adminId, storeId);
            baseQuery.storeId = storeId;
        }
        if (employeeId) {
            await validateEmployeeAccess(adminId, employeeId);
            baseQuery.employeeId = employeeId;
        }

        // Date Range Filter (IST-aware: treats startDate/endDate as IST calendar dates)
        if (startDate && endDate) {
            const { startUTC, nextDayStartUTC } = getISTRangeBetween(startDate, endDate);
            baseQuery.createdAt = { $gte: startUTC, $lt: nextDayStartUTC };
        }

        // Updated At Range Filter
        if (updatedStartDate || updatedEndDate) {
            baseQuery.updatedAt = {};
            if (updatedStartDate) {
                baseQuery.updatedAt.$gte = new Date(updatedStartDate);
            }
            if (updatedEndDate) {
                baseQuery.updatedAt.$lte = new Date(updatedEndDate);
            }
        }

        // Created At Range Filter
        if (createdAtStartDate || createdAtEndDate) {
            baseQuery.createdAt = {};
            if (createdAtStartDate) {
                baseQuery.createdAt.$gte = new Date(createdAtStartDate);
            }
            if (createdAtEndDate) {
                baseQuery.createdAt.$lte = new Date(createdAtEndDate);
            }
        }

        // Activity Date Range Filter (any activity date in IST calendar range)
        if (activityStartDate && activityEndDate) {
            const { startUTC, nextDayStartUTC } = getISTRangeBetween(activityStartDate, activityEndDate);
            const activityQuery = {
                $or: [
                    { createdAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { updatedAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { bookingDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { rentoutDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { returnDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { cancelDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billedDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billReturnedDate:     { $gte: startUTC, $lt: nextDayStartUTC } },
                    { lastStatusChangeDate: { $gte: startUTC, $lt: nextDayStartUTC } },
                    { statusHistory:        { $elemMatch: { date: { $gte: startUTC, $lt: nextDayStartUTC } } } }
                ]
            };
            if (!baseQuery.$and) {
                baseQuery.$and = [];
            }
            baseQuery.$and.push(activityQuery);
        }

        if (status && status !== 'All') {
            const statusList = String(status).split(',').map(s => s.trim()).filter(Boolean);
            const statusOrConditions = [];

            for (const st of statusList) {
                if (st === 'Cancelled' || st === 'Cancel') {
                    statusOrConditions.push(
                        { rentalStatus: { $in: ['Cancel', 'Cancelled'] } },
                        { shoeStatus: { $in: ['Cancel', 'Cancelled'] } },
                        { status: { $regex: '\\b(Cancel|Cancelled)\\b', $options: 'i' } }
                    );
                } else {
                    const escapedStatus = st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    statusOrConditions.push(
                        { rentalStatus: st },
                        { shoeStatus: st },
                        { status: { $regex: `\\b${escapedStatus}\\b`, $options: 'i' } }
                    );
                }
            }

            if (statusOrConditions.length > 0) {
                if (!baseQuery.$and) {
                    baseQuery.$and = [];
                }
                baseQuery.$and.push({ $or: statusOrConditions });
            }
        }

        if (store && store !== 'All') {
            const resolvedStoreObj = await resolveStoreConditions(store);
            if (resolvedStoreObj?.query) {
                if (!baseQuery.$and) baseQuery.$and = [];
                baseQuery.$and.push(resolvedStoreObj.query);
            }
        }

        const targetFunctionType = functionType || eventType;
        if (targetFunctionType && targetFunctionType !== 'All') {
            const types = targetFunctionType.split(',').map(t => t.trim()).filter(Boolean);
            if (types.length > 0) {
                const regexes = types.map(t => {
                    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (/^grooms?\s*men$/i.test(t)) {
                        return new RegExp('^(Grooms?\\s*Men)$', 'i');
                    } else if (/^office\s*(\/|or)\s*college$/i.test(t)) {
                        return new RegExp('^(Office\\s*(\\/|or)\\s*College)$', 'i');
                    } else if (/^(other\s*functions|others)$/i.test(t)) {
                        return new RegExp('^(Other\\s*Functions|Others)$', 'i');
                    }
                    return new RegExp(`^${escaped}$`, 'i');
                });
                baseQuery.functionType = { $in: regexes };
            }
        }

        if (search && search.trim()) {
            const q = search.trim();
            baseQuery.$or = [
                { customerName: { $regex: q, $options: 'i' } },
                { contact: { $regex: q, $options: 'i' } },
                { store: { $regex: q, $options: 'i' } },
                { staff: { $regex: q, $options: 'i' } }
            ];
        }

        // 2. Wrap with RBAC
        const secureQuery = await buildWalkinFilter(adminId, baseQuery);
        if (secureQuery._id === null) {
            return res.status(403).json({ success: false, message: 'Admin not found or access denied' });
        }

        // 3. Fetch filtered walkins directly from MongoDB
        const baseProjection = 'date customerName contact functionDate store staff managerName category subCategory functionType remarks repeatCount status storeId employeeId createdBy createdAt updatedAt lastStatusChangeDate statusChangedToday bookingDate rentoutDate returnDate cancelDate cancellationDate lossReason lossProductType lossSize lossColour lossSalesPrice lossSelectRemarks lossEnquiryTrailOption lossEnquiryRevisitDate notes attachment attachmentName statusHistory rentalStatus shoeStatus billedDate billReturnedDate invoiceNo shoeInvoiceNo productCategory workType workSize';

        const isCountOnlyFetch = String(countOnly).toLowerCase() === 'true';
        const isChartOnlyFetch = String(chartOnly).toLowerCase() === 'true';

        if (isCountOnlyFetch) {
            const total = await Walkin.countDocuments(secureQuery);
            return res.status(200).json({
                success: true,
                message: 'Walk-in count retrieved successfully',
                count: total,
                page: 1,
                limit: 0,
                data: [],
            });
        }

        if (isChartOnlyFetch) {
            const chartQuery = [
                { $match: secureQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
                        walkings: { $sum: 1 },
                        loss: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['Loss', 'loss', 'LOST']] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ];

            const chartData = await Walkin.aggregate(chartQuery);
            return res.status(200).json({
                success: true,
                message: 'Walk-in chart retrieved successfully',
                count: chartData.length,
                data: chartData,
            });
        }

        let sortQuery = { updatedAt: -1 };
        if (sortBy === 'createdAt') {
            sortQuery = { createdAt: -1 };
        } else if (sortBy === 'updatedAt') {
            sortQuery = { updatedAt: -1 };
        }

        let findQuery = Walkin.find(secureQuery)
            .sort(sortQuery)
            .select(baseProjection);

        if (limitNum > 0) {
            findQuery = findQuery.skip(skipNum).limit(limitNum);
        }

        const [total, filtered] = await Promise.all([
            Walkin.countDocuments(secureQuery),
            findQuery.lean(),
        ]);

        const todayStr = getLocalDateStringIST(new Date());
        const seenKeys = new Set();
        const deduplicatedMapped = [];

        for (const w of filtered) {
            const key = w.invoiceNo
                ? `inv_${w.invoiceNo}`
                : `key_${(w.customerName || '').toLowerCase().trim()}_${(w.contact || '').toLowerCase().trim()}_${(w.date || '').toLowerCase().trim()}_${(w.store || '').toLowerCase().trim()}_${(w.status || '').toLowerCase().trim()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                const lastChangeStr = getLocalDateStringIST(w.lastStatusChangeDate);
                deduplicatedMapped.push({
                    ...w,
                    statusChangedToday: !!(lastChangeStr && lastChangeStr === todayStr)
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Walk-ins retrieved successfully',
            count: deduplicatedMapped.length,
            page: limitNum > 0 ? pageNum : 1,
            limit: limitNum > 0 ? limitNum : deduplicatedMapped.length,
            data: deduplicatedMapped
        });

    } catch (error) {
        console.error('Error fetching walk-ins:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching walk-ins',
            error: error.message
        });
    }
};

/**
 * Get all walk-in records for external webpages (No authentication required)
 */
export const getAllWalkinsPublic = async (req, res) => {
    try {
        const { startDate, endDate, updatedStartDate, updatedEndDate, createdAtStartDate, createdAtEndDate, sortBy } = req.query;

        let query = {};

        // Date Range Filter (IST-aware: treats startDate/endDate as IST calendar dates)
        if (startDate && endDate) {
            const { startUTC, nextDayStartUTC } = getISTRangeBetween(startDate, endDate);
            query.createdAt = { $gte: startUTC, $lt: nextDayStartUTC };
        }

        // Updated At Range Filter
        if (updatedStartDate || updatedEndDate) {
            query.updatedAt = {};
            if (updatedStartDate) {
                query.updatedAt.$gte = new Date(updatedStartDate);
            }
            if (updatedEndDate) {
                query.updatedAt.$lte = new Date(updatedEndDate);
            }
        }

        // Created At Range Filter
        if (createdAtStartDate || createdAtEndDate) {
            query.createdAt = {};
            if (createdAtStartDate) {
                query.createdAt.$gte = new Date(createdAtStartDate);
            }
            if (createdAtEndDate) {
                query.createdAt.$lte = new Date(createdAtEndDate);
            }
        }

        let sortQuery = { updatedAt: -1 };
        if (sortBy === 'createdAt') {
            sortQuery = { createdAt: -1 };
        } else if (sortBy === 'updatedAt') {
            sortQuery = { updatedAt: -1 };
        }

        let filtered = await Walkin.find(query)
            .sort(sortQuery)
            .select('date customerName contact functionDate store staff managerName category subCategory functionType remarks repeatCount status storeId employeeId createdBy createdAt updatedAt lastStatusChangeDate statusChangedToday bookingDate rentoutDate returnDate cancelDate cancellationDate lossReason lossProductType lossSize lossColour lossSalesPrice lossSelectRemarks lossEnquiryTrailOption lossEnquiryRevisitDate notes attachment attachmentName statusHistory rentalStatus shoeStatus billedDate billReturnedDate invoiceNo shoeInvoiceNo productCategory workType workSize')
            .lean();

        const todayStr = getLocalDateStringIST(new Date());
        const mappedFiltered = filtered.map(w => {
            const lastChangeStr = getLocalDateStringIST(w.lastStatusChangeDate);
            return {
                ...w,
                statusChangedToday: !!(lastChangeStr && lastChangeStr === todayStr)
            };
        });

        return res.status(200).json({
            success: true,
            message: 'All walk-ins retrieved successfully for external view',
            count: mappedFiltered.length,
            data: mappedFiltered
        });

    } catch (error) {
        console.error('Error fetching public walk-ins:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching public walk-ins',
            error: error.message
        });
    }
};

/**
 * GET /api/walkin/cron-logs
 * Returns the last N cron job run records so admins can verify the scheduler is working.
 */
export const getCronLogs = async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const jobType = req.query.jobType; // optional filter: 'walkin_status_sync' | 'walkin_loss_expiry'

        const query = {};
        if (jobType && ['walkin_status_sync', 'walkin_loss_expiry'].includes(jobType)) {
            query.jobType = jobType;
        }

        const logs = await CronLog.find(query)
            .sort({ startedAt: -1 })
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching cron logs:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cron logs',
            error: error.message
        });
    }
};

const BACKEND_CATEGORIES = [
    { key: 'total_walkin', label: 'TOTAL WALKIN' },
    { key: 'walkin', label: 'WALKIN' },
    { key: 'new_loss', label: 'NEW LOSS' },
    { key: 'new_walkin_booking', label: 'NEW WALKIN BOOKING' },
    { key: 'new_walkin_rentout', label: 'NEW WALKIN RENTOUT' },
    { key: 'new_cancelled', label: 'NEW CANCELLED' },
    { key: 'new_others', label: 'NEW OTHERS' },
    { key: 'revisit_loss', label: 'REVISIT LOSS' },
    { key: 'revisit_rentout', label: 'REVISIT RENTOUT' },
    { key: 'revisit_return', label: 'RETURN' },
    { key: 'revisit_trial', label: 'REVISIT TRIAL' },
    { key: 'revisit_booking', label: 'REVISIT BOOKING' },
    { key: 'revisit_reissue', label: 'REVISIT REISSUE' },
    { key: 'revisit_cancelled', label: 'REVISIT CANCELLED' },
    { key: 'revisit_others', label: 'REVISIT OTHERS' }
];

export const STATUS_KEY_MAP = {
    'rentout': 'revisit_rentout',
    'rent_out': 'revisit_rentout',
    'rent-out': 'revisit_rentout',
    'new_rentout': 'new_walkin_rentout',
    'new_walkin_rentout': 'new_walkin_rentout',
    'revisit_rentout': 'revisit_rentout',
    'booking': 'new_walkin_booking',
    'new_booking': 'new_walkin_booking',
    'new_walkin_booking': 'new_walkin_booking',
    'revisit_booking': 'revisit_booking',
    'return': 'revisit_return',
    'revisit_return': 'revisit_return',
    'loss': 'new_loss',
    'new_loss': 'new_loss',
    'revisit_loss': 'revisit_loss',
    'trial': 'revisit_trial',
    'revisit_trial': 'revisit_trial',
    'reissue': 'revisit_reissue',
    'revisit_reissue': 'revisit_reissue',
    'cancelled': 'new_cancelled',
    'cancel': 'new_cancelled',
    'new_cancelled': 'new_cancelled',
    'revisit_cancelled': 'revisit_cancelled',
    'others': 'new_others',
    'new_others': 'new_others',
    'revisit_others': 'revisit_others',
    'walkin': 'walkin',
    'total_walkin': 'total_walkin'
};

const isValidYMD = (str) => {
    return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
};

export const getWalkinCountPageData = async (req, res) => {
    try {
        const { date, store, startDate, endDate } = req.query; // date is YYYY-MM-DD, store is store name

        // Log received request parameters
        console.log(`[Backend API] getWalkinCountPageData parameters - date: "${date}", store: "${store}", startDate: "${startDate}", endDate: "${endDate}"`);

        if (!date || !store) {
            console.warn(`[Backend API] Validation Error: date and store are required.`);
            return res.status(400).json({ success: false, message: 'Date and Store are required' });
        }

        if (!isValidYMD(date)) {
            console.warn(`[Backend API] Validation Error: date "${date}" is not a valid YYYY-MM-DD.`);
            return res.status(400).json({ success: false, message: 'Invalid Date format. Must be YYYY-MM-DD.' });
        }

        // Determine if range parameters are present
        const hasRange = (startDate !== undefined && startDate !== '') || (endDate !== undefined && endDate !== '');
        
        if (hasRange) {
            if (!isValidYMD(startDate) || !isValidYMD(endDate)) {
                console.warn(`[Backend API] Validation Error: invalid range. startDate: "${startDate}", endDate: "${endDate}"`);
                return res.status(400).json({ success: false, message: 'Invalid Date Range format. Both must be YYYY-MM-DD.' });
            }
        }


        // 1. Resolve store branch and storeId (supporting multi-store comma-separated strings & location aliases)
        let queryConditions = [];
        let resolvedStoreObj = null;

        let effectiveStoreParam = store;
        if (store.toLowerCase() === 'all' && req.admin && ['cluster_admin', 'store_admin', 'employee'].includes(req.admin.role)) {
            const adminDoc = await Admin.findById(req.admin.userId).populate('branches').lean();
            if (adminDoc?.branches?.length > 0) {
                const branchNames = adminDoc.branches.map(b => b.workingBranch || b.branchName).filter(Boolean);
                if (branchNames.length > 0) {
                    effectiveStoreParam = branchNames.join(',');
                }
            }
        }

        if (effectiveStoreParam.toLowerCase() !== 'all') {
            resolvedStoreObj = await resolveStoreConditions(effectiveStoreParam);
            if (resolvedStoreObj?.query) {
                queryConditions.push(resolvedStoreObj.query);
            }
        }

        // 2. Fetch all walkins for this store that have activity on the selected date or range
        let dateQuery = {};
        let activeDateRange = null;
        let startUTC = null;
        let nextDayStartUTC = null;

        if (hasRange) {
            // Date range case: treat startDate/endDate as inclusive IST calendar dates
            const range = getISTRangeBetween(startDate, endDate);
            startUTC = range.startUTC;
            nextDayStartUTC = range.nextDayStartUTC;

            dateQuery = {
                $or: [
                    { date: { $gte: startDate, $lte: endDate + ' 23:59:59' } },
                    { createdAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { updatedAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { bookingDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { rentoutDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { returnDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { cancelDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billedDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billReturnedDate:     { $gte: startUTC, $lt: nextDayStartUTC } },
                    { lastStatusChangeDate: { $gte: startUTC, $lt: nextDayStartUTC } },
                    { statusHistory:        { $elemMatch: { date: { $gte: startUTC, $lt: nextDayStartUTC } } } }
                ]
            };
            activeDateRange = { start: startDate, end: endDate };
        } else {
            // Single date case: treat date as an IST calendar date
            const range = getISTDayRange(date);
            startUTC = range.startUTC;
            nextDayStartUTC = range.nextDayStartUTC;

            dateQuery = {
                $or: [
                    { date: { $gte: date, $lte: date + ' 23:59:59' } },
                    { createdAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { updatedAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { bookingDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { rentoutDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { returnDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { cancelDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billedDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billReturnedDate:     { $gte: startUTC, $lt: nextDayStartUTC } },
                    { lastStatusChangeDate: { $gte: startUTC, $lt: nextDayStartUTC } },
                    { statusHistory:        { $elemMatch: { date: { $gte: startUTC, $lt: nextDayStartUTC } } } }
                ]
            };
            activeDateRange = { start: date, end: date };
        }

        console.log(`[Backend API] calculated IST UTC range - startUTC: "${startUTC ? startUTC.toISOString() : null}", nextDayStartUTC: "${nextDayStartUTC ? nextDayStartUTC.toISOString() : null}"`);

        if (queryConditions.length > 0) {
            queryConditions.push(dateQuery);
        } else {
            queryConditions = [dateQuery];
        }

        const rawWalkins = await Walkin.find({ $and: queryConditions }).lean();
        console.log(`[Backend API] total records considered (fetched from DB): ${rawWalkins.length}`);

        // Deduplicate walkins using the exact same logic as getWalkins (Walk In Report)
        const seenKeys = new Set();
        const walkins = [];
        for (const w of rawWalkins) {
            const key = w.invoiceNo
                ? `inv_${w.invoiceNo}`
                : `key_${(w.customerName || '').toLowerCase().trim()}_${(w.contact || '').toLowerCase().trim()}_${(w.date || '').toLowerCase().trim()}_${(w.store || '').toLowerCase().trim()}_${(w.status || '').toLowerCase().trim()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                walkins.push(w);
            }
        }


        // 3. Compute inApp counts based on the specified rules
        const counts = {
            total_walkin: 0,
            walkin: 0,
            revisit_walkin: 0,
            new_loss: 0,
            revisit_loss: 0,
            revisit_rentout: 0,
            revisit_return: 0,
            revisit_trial: 0,
            revisit_booking: 0,
            new_walkin_booking: 0,
            new_walkin_rentout: 0,
            new_cancelled: 0,
            new_others: 0,
            revisit_reissue: 0,
            revisit_cancelled: 0,
            revisit_others: 0,
            cancelled: 0,
            others: 0
        };

        const walkinSet = new Set();
        const repeatWalkinSet = new Set();

        walkins.forEach(w => {
            const isDateInRange = (dateVal) => {
                return isInISTRange(dateVal, startUTC, nextDayStartUTC);
            };

            const createdInRange = isDateInRange(w.createdAt);
            const hasBookingInRange = isDateInRange(w.bookingDate);
            const hasRentoutInRange = isDateInRange(w.rentoutDate);
            const hasReturnInRange = isDateInRange(w.returnDate);
            const hasCancelInRange = isDateInRange(w.cancelDate || w.cancellationDate);
            const hasBilledInRange = isDateInRange(w.billedDate);

            // Filter history in range
            const historyInRange = (w.statusHistory || []).filter(h => isDateInRange(h.date));
            
            // Normalized main status string
            const normStatus = String(w.status || '').toLowerCase().trim();

            const isReissue = (catStr) => {
                if (!catStr) return false;
                const c = catStr.toLowerCase();
                return c.includes('reissue') || c.includes('re-issue') || c.includes('re issue');
            };

            const isTrial = (catStr) => {
                if (!catStr) return false;
                const c = catStr.toLowerCase();
                return c.includes('trial');
            };

            const hasTrialHistoryInRange = historyInRange.some(h => {
                const hStatus = String(h.status || '').toLowerCase().trim();
                const hCategory = String(h.category || '').toLowerCase().trim().replace(/[^a-z]/g, '');
                return (hStatus.includes('trial') || isTrial(hCategory) || hStatus.includes('revisit') && isTrial(hCategory));
            });

            const hasReissueHistoryInRange = historyInRange.some(h => {
                const hStatus = String(h.status || '').toLowerCase().trim();
                const hCategory = String(h.category || '').toLowerCase().trim().replace(/[^a-z]/g, '');
                return hStatus.includes('revisit') && isReissue(hCategory);
            });

            const isLossState = normStatus === 'loss' || (w.statusHistory || []).some(h => isDateInRange(h.date) && String(h.status || '').toLowerCase().trim().includes('loss'));

            if (createdInRange) {
                walkinSet.add(w._id.toString());

                // Priority for New Walkin:
                if (hasCancelInRange) {
                    counts.new_cancelled++;
                }
                else if (hasRentoutInRange) {
                    counts.new_walkin_rentout++;
                }
                else if (hasBookingInRange || hasBilledInRange) {
                    counts.new_walkin_booking++;
                }
                else if (isLossState) {
                    counts.new_loss++;
                }
                else {
                    counts.new_others++;
                }
            } else {
                // Repeat Walkin: createdAt is NOT in range
                // 1. Revisit Cancelled
                if (hasCancelInRange) {
                    counts.revisit_cancelled++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 2. Revisit Return
                else if (hasReturnInRange) {
                    counts.revisit_return++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 3. Revisit Rentout
                else if (hasRentoutInRange) {
                    counts.revisit_rentout++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 4. Revisit Booking
                else if (hasBookingInRange || hasBilledInRange) {
                    counts.revisit_booking++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 5. Revisit Trial
                else if (hasTrialHistoryInRange) {
                    counts.revisit_trial++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 6. Revisit Reissue
                else if (hasReissueHistoryInRange) {
                    counts.revisit_reissue++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 7. Revisit Loss
                else if (isLossState) {
                    counts.revisit_loss++;
                    repeatWalkinSet.add(w._id.toString());
                }
                // 8. Revisit Others
                else {
                    counts.revisit_others++;
                    repeatWalkinSet.add(w._id.toString());
                }
            }
        });

        // Set higher level aggregations
        counts.walkin = walkinSet.size;
        counts.revisit_walkin = repeatWalkinSet.size;
        counts.total_walkin = counts.walkin + counts.revisit_walkin;


        // 4. Fetch camera checker entries for this date/range & store
        let cameraChecksQuery = {};
        if (hasRange) {
            cameraChecksQuery.date = { $gte: startDate, $lte: endDate };
        } else {
            cameraChecksQuery.date = date;
        }
        if (store.toLowerCase() !== 'all' && resolvedStoreObj) {
            const orList = [];
            if (resolvedStoreObj.matchedIdsArray && resolvedStoreObj.matchedIdsArray.length > 0) {
                orList.push({ storeId: { $in: resolvedStoreObj.matchedIdsArray } });
            }
            if (resolvedStoreObj.matchedNamesArray && resolvedStoreObj.matchedNamesArray.length > 0) {
                const storeRegexes = resolvedStoreObj.matchedNamesArray.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
                orList.push({ store: { $in: [...storeRegexes, ...resolvedStoreObj.matchedNamesArray] } });
            }
            if (orList.length > 0) {
                cameraChecksQuery.$or = orList;
            }
        }
        const cameraChecks = await WalkinCameraCheck.find(cameraChecksQuery)
            .populate('createdBy', 'name role')
            .lean();

        // Calculate sums per statusKey (supporting statusKey aliases e.g. 'rentout' -> 'revisit_rentout')
        const cameraCheckSums = {};
        cameraChecks.forEach(cc => {
            const rawKey = String(cc.statusKey || '').trim().toLowerCase();
            const mappedKey = STATUS_KEY_MAP[rawKey] || cc.statusKey;
            cameraCheckSums[mappedKey] = (cameraCheckSums[mappedKey] || 0) + (cc.inCamCount || 1);
            if (rawKey !== mappedKey) {
                cameraCheckSums[rawKey] = (cameraCheckSums[rawKey] || 0) + (cc.inCamCount || 1);
            }
        });

        // 5. Fetch saved comparison details (if any) for this date/range & store
        let savedCountsQuery = {};
        if (hasRange) {
            savedCountsQuery.date = { $gte: startDate, $lte: endDate };
        } else {
            savedCountsQuery.date = date;
        }
        if (store.toLowerCase() !== 'all' && resolvedStoreObj) {
            const orList = [];
            if (resolvedStoreObj.matchedNamesArray && resolvedStoreObj.matchedNamesArray.length > 0) {
                const storeRegexes = resolvedStoreObj.matchedNamesArray.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
                orList.push({ store: { $in: [...storeRegexes, ...resolvedStoreObj.matchedNamesArray] } });
            }
            if (resolvedStoreObj.matchedIdsArray && resolvedStoreObj.matchedIdsArray.length > 0) {
                orList.push({ storeId: { $in: resolvedStoreObj.matchedIdsArray } });
            }
            if (orList.length > 0) {
                savedCountsQuery.$or = orList;
            }
        }

        const savedCounts = await WalkinCount.find(savedCountsQuery).lean();

        const aggregatedCounts = BACKEND_CATEGORIES.map(cat => {
            let totalInCam = 0;
            let totalSalesReport = 0;
            let hasInCam = false;
            let hasSalesReport = false;
            const remarksSet = new Set();

            savedCounts.forEach(sc => {
                const existing = sc.counts.find(c => {
                    const existingKey = String(c.statusKey || '').trim().toLowerCase();
                    return existingKey === cat.key || STATUS_KEY_MAP[existingKey] === cat.key;
                });
                if (existing) {
                    if (existing.inCam !== '-') {
                        totalInCam += Number(existing.inCam) || 0;
                        hasInCam = true;
                    }
                    if (existing.salesReport !== '-') {
                        totalSalesReport += Number(existing.salesReport) || 0;
                        hasSalesReport = true;
                    }
                    if (existing.remarks && existing.remarks.trim()) {
                        remarksSet.add(existing.remarks.trim());
                    }
                }
            });

            const ccSum = cameraCheckSums[cat.key];
            const inCamVal = ccSum !== undefined ? String(ccSum) : (hasInCam ? String(totalInCam) : '-');
            const joinedRemarks = Array.from(remarksSet).join('; ');

            return {
                statusKey: cat.key,
                inCam: inCamVal,
                salesReport: hasSalesReport ? String(totalSalesReport) : '-',
                timeSeen: '',
                remarks: joinedRemarks
            };
        });

        // Automatically calculate 'walkin' and 'total_walkin' inCam counts from subcategories
        const newKeys = ['new_loss', 'new_walkin_booking', 'new_walkin_rentout'];
        const repeatKeys = [
            'revisit_loss', 'revisit_rentout', 'revisit_return', 'revisit_trial',
            'revisit_booking', 'revisit_reissue', 'revisit_cancelled', 'revisit_others'
        ];

        let sumNewInCam = 0;
        let hasAnyNewInCam = false;
        newKeys.forEach(k => {
            const item = aggregatedCounts.find(c => c.statusKey === k);
            if (item && item.inCam !== '-') {
                sumNewInCam += Number(item.inCam) || 0;
                hasAnyNewInCam = true;
            }
        });

        let sumTotalInCam = sumNewInCam;
        let hasAnyTotalInCam = hasAnyNewInCam;
        repeatKeys.forEach(k => {
            const item = aggregatedCounts.find(c => c.statusKey === k);
            if (item && item.inCam !== '-') {
                sumTotalInCam += Number(item.inCam) || 0;
                hasAnyTotalInCam = true;
            }
        });

        const walkinObj = aggregatedCounts.find(c => c.statusKey === 'walkin');
        if (walkinObj && (walkinObj.inCam === '-' || walkinObj.inCam === '0')) {
            walkinObj.inCam = hasAnyNewInCam ? String(sumNewInCam) : '-';
        }

        const totalWalkinObj = aggregatedCounts.find(c => c.statusKey === 'total_walkin');
        if (totalWalkinObj && (totalWalkinObj.inCam === '-' || totalWalkinObj.inCam === '0')) {
            totalWalkinObj.inCam = hasAnyTotalInCam ? String(sumTotalInCam) : '-';
        }

        if (req.admin?.role === 'store_admin') {
            aggregatedCounts.forEach(c => {
                c.inCam = '-';
            });
        }

        const savedStoreName = store.toLowerCase() === 'all' ? 'All' : (resolvedStoreObj?.matchedNamesArray?.[0] || store);
        const savedStoreId = store.toLowerCase() === 'all' ? null : (resolvedStoreObj?.matchedIdsArray?.[0] || null);

        const savedCount = {
            date: hasRange ? `${startDate} to ${endDate}` : date,
            store: savedStoreName,
            storeId: savedStoreId,
            counts: aggregatedCounts
        };

        console.log(`[Backend API] final counts computed:`, counts);

        return res.status(200).json({
            success: true,
            inApp: counts,
            saved: savedCount,
            cameraChecks: cameraChecks
        });


    } catch (error) {
        console.error('Error in getWalkinCountPageData:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * POST /api/walkin/walkin-count/save
 * Saves or updates telecaller entered counts, times, and remarks for comparison.
 */
export const saveWalkinCountPageData = async (req, res) => {
    try {
        const { date, store, counts } = req.body;
        const adminId = req.admin.userId;

        if (!date || !store || !Array.isArray(counts)) {
            return res.status(400).json({ success: false, message: 'Date, Store, and Counts array are required' });
        }

        // 1. Resolve store branch and storeId
        let resolvedStoreId = null;
        const branch = await Branch.findOne({ workingBranch: { $regex: `^${store.trim()}$`, $options: 'i' } });
        if (branch) {
            resolvedStoreId = branch._id;
        } else {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        // 2. Find and update or create
        const updated = await WalkinCount.findOneAndUpdate(
            { date, storeId: resolvedStoreId },
            {
                date,
                store: branch.workingBranch,
                storeId: resolvedStoreId,
                counts,
                createdBy: adminId
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Walkin count page data saved successfully',
            data: updated
        });

    } catch (error) {
        console.error('Error in saveWalkinCountPageData:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * Synchronize WalkinCount inCam totals based on WalkinCameraCheck logs
 */
const syncWalkinCountInCam = async (date, storeId, storeName) => {
    const cameraChecks = await WalkinCameraCheck.find({ date, storeId });
    const sums = {};
    cameraChecks.forEach(cc => {
        const rawKey = String(cc.statusKey || '').trim().toLowerCase();
        const mappedKey = STATUS_KEY_MAP[rawKey] || cc.statusKey;
        sums[mappedKey] = (sums[mappedKey] || 0) + (cc.inCamCount || 1);
        if (rawKey !== mappedKey) {
            sums[rawKey] = (sums[rawKey] || 0) + (cc.inCamCount || 1);
        }
    });

    let walkinCountDoc = await WalkinCount.findOne({ date, storeId });
    if (!walkinCountDoc) {
        const countsArray = BACKEND_CATEGORIES.map(cat => ({
            statusKey: cat.key,
            inCam: sums[cat.key] !== undefined ? String(sums[cat.key]) : '-',
            salesReport: '-',
            timeSeen: '',
            remarks: ''
        }));
        await WalkinCount.create({
            date,
            store: storeName,
            storeId,
            counts: countsArray
        });
    } else {
        BACKEND_CATEGORIES.forEach(cat => {
            const idx = walkinCountDoc.counts.findIndex(c => {
                const existingKey = String(c.statusKey || '').trim().toLowerCase();
                return existingKey === cat.key || STATUS_KEY_MAP[existingKey] === cat.key;
            });
            const newInCamVal = sums[cat.key] !== undefined ? String(sums[cat.key]) : '-';
            if (idx > -1) {
                walkinCountDoc.counts[idx].inCam = newInCamVal;
            } else {
                walkinCountDoc.counts.push({
                    statusKey: cat.key,
                    inCam: newInCamVal,
                    salesReport: '-',
                    timeSeen: '',
                    remarks: ''
                });
            }
        });
        await walkinCountDoc.save();
    }
};

/**
 * POST /api/walkin/camera-check
 * Saves or updates a camera checker log entry.
 */
export const saveCameraCheckEntry = async (req, res) => {
    try {
        const { date, store, entries } = req.body;
        const adminId = req.admin.userId;

        if (!date || !store || !Array.isArray(entries)) {
            return res.status(400).json({ success: false, message: 'date, store, and entries (array) are required' });
        }

        let resolvedStoreId = null;
        let resolvedStoreName = store.trim();
        let branch = await Branch.findOne({ workingBranch: { $regex: `^${store.trim()}$`, $options: 'i' } });
        if (!branch) {
            const key = locationKey(store);
            if (key) {
                const allBranches = await Branch.find({}).lean();
                branch = allBranches.find(b => {
                    const bKey = locationKey(b.workingBranch || b.location || "");
                    return bKey === key || norm(b.workingBranch).includes(key) || norm(store).includes(locationKey(b.workingBranch || ""));
                });
            }
        }

        if (branch) {
            resolvedStoreId = branch._id;
            resolvedStoreName = branch.workingBranch;
        } else if (mongoose.Types.ObjectId.isValid(store)) {
            resolvedStoreId = new mongoose.Types.ObjectId(store);
        }

        // Filter out empty rows: rows without a statusKey are considered empty or incomplete
        const validEntries = entries.filter(entry => entry.statusKey && entry.statusKey.trim() !== '');

        // 1. Delete all existing camera check entries for this store and date
        const deleteQuery = resolvedStoreId 
            ? { date, $or: [{ storeId: resolvedStoreId }, { store: { $regex: `^${resolvedStoreName}$`, $options: 'i' } }] }
            : { date, store: { $regex: `^${resolvedStoreName}$`, $options: 'i' } };
        await WalkinCameraCheck.deleteMany(deleteQuery);

        // 2. Insert the new valid entries
        if (validEntries.length > 0) {
            const documentsToInsert = validEntries.map(entry => {
                const inTimeClean = String(entry.inTime || '').trim();
                const outTimeClean = String(entry.outTime || '').trim();
                const identClean = String(entry.identification || '').substring(0, 20).trim();
                const rawStatusKey = String(entry.statusKey || '').trim();
                const mappedStatusKey = STATUS_KEY_MAP[rawStatusKey.toLowerCase()] || rawStatusKey;
                
                return {
                    date,
                    store: resolvedStoreName,
                    storeId: resolvedStoreId,
                    statusKey: mappedStatusKey,
                    timeDuration: (inTimeClean && outTimeClean) ? `${inTimeClean} to ${outTimeClean}` : '–',
                    inTime: inTimeClean,
                    outTime: outTimeClean,
                    identification: identClean,
                    inCamCount: 1, // each row increments count by 1
                    remarks: identClean,
                    createdBy: adminId
                };
            });
            await WalkinCameraCheck.insertMany(documentsToInsert);
        }

        // 3. Sync the aggregated counts in WalkinCount
        if (resolvedStoreId) {
            await syncWalkinCountInCam(date, resolvedStoreId, resolvedStoreName);
        }

        // 4. Retrieve the updated checks list to return to client
        const findQuery = resolvedStoreId
            ? { date, $or: [{ storeId: resolvedStoreId }, { store: { $regex: `^${resolvedStoreName}$`, $options: 'i' } }] }
            : { date, store: { $regex: `^${resolvedStoreName}$`, $options: 'i' } };

        const updatedChecks = await WalkinCameraCheck.find(findQuery)
            .populate('createdBy', 'name role')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Camera check logs saved successfully',
            cameraChecks: updatedChecks
        });
    } catch (error) {
        console.error('Error in saveCameraCheckEntry:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * GET /api/walkin/camera-check
 * Retrieves the camera checker log entries for a given date (or date range) and store.
 */
export const getCameraCheckEntries = async (req, res) => {
    try {
        const { date, store, startDate, endDate } = req.query;
        if (!store) {
            return res.status(400).json({ success: false, message: 'Store is required' });
        }
        if (!date && (!startDate || !endDate)) {
            return res.status(400).json({ success: false, message: 'Date or Date Range (startDate, endDate) is required' });
        }

        let storeConditions = null;
        if (store.toLowerCase() !== 'all') {
            const resolved = await resolveStoreConditions(store);
            if (resolved?.query) {
                storeConditions = resolved.query;
            } else {
                storeConditions = {
                    $or: [
                        { store: { $regex: `^${store.trim()}$`, $options: 'i' } },
                        { store: store.trim() }
                    ]
                };
            }
        }

        let dateConditions = {};
        if (startDate && endDate) {
            dateConditions = { date: { $gte: startDate, $lte: endDate } };
        } else if (date) {
            const dateArr = String(date).split(',').map(d => d.trim()).filter(Boolean);
            if (dateArr.length > 1) {
                dateConditions = { date: { $in: dateArr } };
            } else {
                dateConditions = { date: dateArr[0] || date };
            }
        }

        let finalQuery = dateConditions;
        if (storeConditions) {
            finalQuery = { $and: [dateConditions, storeConditions] };
        }

        const cameraChecks = await WalkinCameraCheck.find(finalQuery)
            .populate('createdBy', 'name role')
            .lean();

        return res.status(200).json({
            success: true,
            cameraChecks
        });
    } catch (error) {
        console.error('Error in getCameraCheckEntries:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * DELETE /api/walkin/camera-check/:id
 * Deletes a camera check log entry.
 */
export const deleteCameraCheckEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const check = await WalkinCameraCheck.findById(id);
        if (!check) {
            return res.status(404).json({ success: false, message: 'Camera check entry not found' });
        }

        // Restrict deletion to non-telecaller roles
        if (req.admin && req.admin.role === 'telecaller') {
            return res.status(403).json({ success: false, message: 'Access denied: Telecallers are not authorized to delete camera check logs' });
        }

        const { date, storeId, store } = check;

        await WalkinCameraCheck.findByIdAndDelete(id);

        await syncWalkinCountInCam(date, storeId, store);

        const updatedChecks = await WalkinCameraCheck.find({ date, storeId })
            .populate('createdBy', 'name role')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Camera check entry deleted successfully',
            cameraChecks: updatedChecks
        });
    } catch (error) {
        console.error('Error in deleteCameraCheckEntry:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

/**
 * GET /api/walkin/flutter/walkin-count
 * GET /api/walkin/flutter-count
 * Dedicated lightweight API for Flutter app to retrieve only the WALKIN count (new walk-ins)
 * Shares 100% identical calculation logic with the web dashboard Walkin Count page.
 */
export const getFlutterWalkinCount = async (req, res) => {
    try {
        let { date, store, startDate, endDate } = req.query;

        // Auto-detect store for store_admin or employee if store param is not passed
        if (!store) {
            if (req.admin?.role === 'store_admin' || req.admin?.role === 'employee') {
                const userDoc = await Admin.findById(req.admin.userId).populate('branches').lean()
                    || await User.findById(req.admin.userId).lean();
                if (userDoc?.branches?.length > 0) {
                    store = userDoc.branches[0].workingBranch || 'All';
                } else if (userDoc?.workingBranch) {
                    store = userDoc.workingBranch;
                } else {
                    store = 'All';
                }
            } else {
                store = 'All';
            }
        }

        // Default date to today's date in IST if no date filters provided
        if (!date && !startDate && !endDate) {
            const now = new Date();
            const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const y = istDate.getUTCFullYear();
            const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
            const d = String(istDate.getUTCDate()).padStart(2, '0');
            date = `${y}-${m}-${d}`;
        }

        // 1. Resolve store branch and storeId
        let resolvedStoreName = store;
        let resolvedStoreId = null;
        let queryConditions = [];

        if (store.toLowerCase() !== 'all') {
            const resolvedStoreObj = await resolveStoreConditions(store);
            if (resolvedStoreObj?.query) {
                queryConditions.push(resolvedStoreObj.query);
            }
        }

        const hasRange = (startDate !== undefined && startDate !== '') || (endDate !== undefined && endDate !== '');
        let dateQuery = {};
        let startUTC = null;
        let nextDayStartUTC = null;

        if (hasRange) {
            const range = getISTRangeBetween(startDate, endDate);
            startUTC = range.startUTC;
            nextDayStartUTC = range.nextDayStartUTC;

            dateQuery = {
                $or: [
                    { date: { $gte: startDate, $lte: endDate + ' 23:59:59' } },
                    { createdAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { updatedAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { bookingDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { rentoutDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { returnDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { cancelDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billedDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billReturnedDate:     { $gte: startUTC, $lt: nextDayStartUTC } },
                    { lastStatusChangeDate: { $gte: startUTC, $lt: nextDayStartUTC } },
                    { statusHistory:        { $elemMatch: { date: { $gte: startUTC, $lt: nextDayStartUTC } } } }
                ]
            };
        } else {
            const range = getISTDayRange(date);
            startUTC = range.startUTC;
            nextDayStartUTC = range.nextDayStartUTC;

            dateQuery = {
                $or: [
                    { date: { $gte: date, $lte: date + ' 23:59:59' } },
                    { createdAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { updatedAt:            { $gte: startUTC, $lt: nextDayStartUTC } },
                    { bookingDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { rentoutDate:          { $gte: startUTC, $lt: nextDayStartUTC } },
                    { returnDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { cancelDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billedDate:           { $gte: startUTC, $lt: nextDayStartUTC } },
                    { billReturnedDate:     { $gte: startUTC, $lt: nextDayStartUTC } },
                    { lastStatusChangeDate: { $gte: startUTC, $lt: nextDayStartUTC } },
                    { statusHistory:        { $elemMatch: { date: { $gte: startUTC, $lt: nextDayStartUTC } } } }
                ]
            };
        }

        if (queryConditions.length > 0) {
            queryConditions.push(dateQuery);
        } else {
            queryConditions = [dateQuery];
        }

        const rawWalkins = await Walkin.find({ $and: queryConditions }).lean();
        const walkinSet = new Set();
        const seenKeys = new Set();

        rawWalkins.forEach(w => {
            const isDateInRange = (dateVal) => isInISTRange(dateVal, startUTC, nextDayStartUTC);
            const createdInRange = isDateInRange(w.createdAt);
            if (createdInRange) {
                const key = w.invoiceNo
                    ? `inv_${w.invoiceNo}`
                    : `key_${(w.customerName || '').toLowerCase().trim()}_${(w.contact || '').toLowerCase().trim()}_${(w.date || '').toLowerCase().trim()}_${(w.store || '').toLowerCase().trim()}_${(w.status || '').toLowerCase().trim()}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    walkinSet.add(w._id.toString());
                }
            }
        });

        const walkinCount = walkinSet.size;

        const savedStoreName = store.toLowerCase() === 'all' ? 'All' : (resolvedStoreObj?.matchedNamesArray?.[0] || store);

        return res.status(200).json({
            success: true,
            date: hasRange ? `${startDate} to ${endDate}` : date,
            store: savedStoreName,
            walkinCount
        });
    } catch (error) {
        console.error('Error in getFlutterWalkinCount:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};


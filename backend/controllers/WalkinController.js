import Walkin from '../model/Walkin.js';
import Admin from '../model/Admin.js';
import User from '../model/User.js';
import Branch from '../model/Branch.js';
import CronLog from '../model/CronLog.js';
import mongoose from 'mongoose';
import { validateStoreAccess, validateEmployeeAccess, buildWalkinFilter } from '../lib/permissions.js';

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
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const updateStatusAndDates = (walkinRecord, statusInput) => {
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
        
        if (!walkinRecord.statusHistory) {
            walkinRecord.statusHistory = [];
        }
        walkinRecord.statusHistory.push({
            status: rStatus,
            category: walkinRecord.category && walkinRecord.category !== '-' ? walkinRecord.category : 'Product',
            date: new Date()
        });
    }
    
    if (shoeUpdated) {
        const sStatus = walkinRecord.shoeStatus;
        if (sStatus === 'Billed') {
            walkinRecord.billedDate = new Date();
        } else if (sStatus === 'Bill Returned') {
            walkinRecord.billReturnedDate = new Date();
        }
        
        if (!walkinRecord.statusHistory) {
            walkinRecord.statusHistory = [];
        }
        walkinRecord.statusHistory.push({
            status: sStatus,
            category: 'Sales',
            date: new Date()
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
        if (!contact) {
            return res.status(400).json({ success: false, message: 'Contact phone number is required' });
        }

        let query = { contact: contact.trim() };

        // Apply role-based filtering if admin token is present
        if (req.admin) {
            const adminId = req.admin.userId;
            query = await buildWalkinFilter(adminId, query);
            if (query._id === null) {
                return res.status(403).json({ success: false, message: 'Admin not found or access denied' });
            }
        }

        // Find the latest walkin record for this customer
        const latestWalkin = await Walkin.findOne(query)
            .sort({ createdAt: -1 });

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
        };

        if (!_id && (!customerName || !contact)) {
            return res.status(400).json({
                success: false,
                message: 'customerName and contact are required fields'
            });
        }

        const trimmedContact = contact ? contact.trim() : '-';

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
                updateQuery = await buildWalkinFilter(adminId, updateQuery);
                if (updateQuery._id === null) {
                    return res.status(403).json({ success: false, message: 'Access denied to this walk-in record' });
                }
            }

            const walkinRecord = await Walkin.findOne(updateQuery);
            if (!walkinRecord) {
                return res.status(404).json({ success: false, message: 'Walk-in record not found or access denied' });
            }

            const incomingStatus = status ? status.trim() : '';
            if (incomingStatus === 'New Walkin' && walkinRecord.status !== 'New Walkin') {
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
                    functionType: '-',
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
                    repeatCount: 1,
                    date: todayStr
                });
                updateStatusAndDates(newWalkin, 'New Walkin');
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
            if (staff !== undefined && staff !== null) walkinRecord.staff = staff.trim();
            if (finalStoreId !== undefined && finalStoreId !== null) walkinRecord.storeId = finalStoreId;
            if (finalEmployeeId !== undefined && finalEmployeeId !== null) walkinRecord.employeeId = finalEmployeeId;
            if (category) walkinRecord.category = category.trim();
            if (subCategory) walkinRecord.subCategory = subCategory.trim();
            if (status === 'Loss') {
                if (functionType) walkinRecord.functionType = functionType.trim();
            } else {
                walkinRecord.functionType = '-';
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

                    updateStatusAndDates(walkinRecord, trimmedStatus);
                }
            }
            if (createdBy) walkinRecord.createdBy = createdBy;
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
                query = await buildWalkinFilter(adminId, query);
            }
            walkinRecord = await Walkin.findOne(query).sort({ createdAt: -1 });
        }

        const isSameStore = walkinRecord && (
            locationKey(walkinRecord.store) === locationKey(finalStore) ||
            (walkinRecord.storeId && finalStoreId && walkinRecord.storeId.toString() === finalStoreId.toString())
        );

        if (walkinRecord && status !== 'New Walkin' && isSameStore) {
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
            if (staff !== undefined && staff !== null) walkinRecord.staff = staff.trim();
            if (storeId !== undefined && storeId !== null) walkinRecord.storeId = storeId;
            if (employeeId !== undefined && employeeId !== null) walkinRecord.employeeId = employeeId;
            if (category) walkinRecord.category = category.trim();
            if (subCategory) walkinRecord.subCategory = subCategory.trim();
            if (status === 'Loss') {
                if (functionType) walkinRecord.functionType = functionType.trim();
            } else {
                walkinRecord.functionType = '-';
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

                    updateStatusAndDates(walkinRecord, trimmedStatus);
                }
            }
            if (createdBy) walkinRecord.createdBy = createdBy;
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
            // ALWAYS Create new record if status is 'New Walkin' or if it is a different store.
            // Query the latest walk-in for this contact AT THE SAME STORE to base the repeatCount on the store-specific history.
            let storeLatest = null;
            if (trimmedContact !== '-' && trimmedContact !== '') {
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
            }
            const initialStatus = status ? status.trim() : 'New Walkin';
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
                subCategory: subCategory ? subCategory.trim() : '-',
                functionType: (initialStatus === 'Loss' && functionType) ? functionType.trim() : '-',
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
                repeatCount: nextRepeatCount,
                date: todayStr
            });
            updateStatusAndDates(newWalkin, initialStatus);
            await newWalkin.save();
            return res.status(201).json({
                success: true,
                message: 'New walk-in saved successfully',
                data: newWalkin
            });
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
        const { startDate, endDate, storeId, employeeId, page, limit, search = '', status = '', store = '', dashboard = '', countOnly = '', chartOnly = '' } = req.query;
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

        // Date Range Filter
        if (startDate && endDate) {
            const endOfDaySuffix = endDate.includes(' ') ? '' : ' 23:59:59';
            baseQuery.date = { $gte: startDate, $lte: `${endDate}${endOfDaySuffix}` };
        }

        if (status && status !== 'All') {
            let statusCondition;
            if (status === 'Cancelled' || status === 'Cancel') {
                statusCondition = {
                    $or: [
                        { rentalStatus: { $in: ['Cancel', 'Cancelled'] } },
                        { shoeStatus: { $in: ['Cancel', 'Cancelled'] } },
                        { status: { $regex: '\\b(Cancel|Cancelled)\\b', $options: 'i' } }
                    ]
                };
            } else {
                const escapedStatus = status.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                statusCondition = {
                    $or: [
                        { rentalStatus: status },
                        { shoeStatus: status },
                        { status: { $regex: `\\b${escapedStatus}\\b`, $options: 'i' } }
                    ]
                };
            }
            if (baseQuery.$or) {
                baseQuery.$and = [
                    { $or: baseQuery.$or },
                    statusCondition
                ];
                delete baseQuery.$or;
            } else {
                baseQuery.$or = statusCondition.$or;
            }
        }

        if (store && store !== 'All') {
            baseQuery.store = { $regex: `^${store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
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
        const baseProjection = 'date customerName contact functionDate store staff managerName category subCategory functionType remarks repeatCount status storeId employeeId createdBy createdAt updatedAt lastStatusChangeDate statusChangedToday bookingDate rentoutDate returnDate cancelDate cancellationDate lossReason lossProductType lossSize lossColour lossSalesPrice lossSelectRemarks lossEnquiryTrailOption lossEnquiryRevisitDate notes attachment attachmentName statusHistory rentalStatus shoeStatus billedDate billReturnedDate invoiceNo shoeInvoiceNo';

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
                        _id: { $substrBytes: ['$date', 0, 10] },
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

        let findQuery = Walkin.find(secureQuery)
            .sort({ updatedAt: -1 })
            .select(baseProjection);

        if (limitNum > 0) {
            findQuery = findQuery.skip(skipNum).limit(limitNum);
        }

        const [total, filtered] = await Promise.all([
            Walkin.countDocuments(secureQuery),
            findQuery.lean(),
        ]);

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
            message: 'Walk-ins retrieved successfully',
            count: total,
            page: limitNum > 0 ? pageNum : 1,
            limit: limitNum > 0 ? limitNum : total,
            data: mappedFiltered
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
        const { startDate, endDate } = req.query;

        let filtered = await Walkin.find({})
            .sort({ updatedAt: -1 })
            .select('date customerName contact functionDate store staff managerName category subCategory functionType remarks repeatCount status storeId employeeId createdBy createdAt updatedAt lastStatusChangeDate statusChangedToday bookingDate rentoutDate returnDate cancelDate cancellationDate lossReason lossProductType lossSize lossColour lossSalesPrice lossSelectRemarks lossEnquiryTrailOption lossEnquiryRevisitDate notes attachment attachmentName statusHistory rentalStatus shoeStatus billedDate billReturnedDate invoiceNo shoeInvoiceNo')
            .lean();

        // Date Range Filter
        if (startDate && endDate) {
            const endOfDaySuffix = endDate.includes(' ') ? '' : ' 23:59:59';
            filtered = filtered.filter(w => w.date >= startDate && w.date <= `${endDate}${endOfDaySuffix}`);
        }

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

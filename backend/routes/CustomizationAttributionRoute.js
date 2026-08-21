import express from 'express';
import mongoose from 'mongoose';
import { MiddilWare } from '../lib/middilWare.js';
import CustomizationAttribution from '../model/CustomizationAttribution.js';

const router = express.Router();

// Helper to derive month name and year from date string (YYYY-MM-DD)
const getMonthAndYearFromDate = (dateStr) => {
  if (!dateStr) return { month: 'August', year: new Date().getFullYear(), week: 1 };
  const d = new Date(dateStr);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[d.getMonth()] || 'August';
  const year = d.getFullYear() || new Date().getFullYear();
  const day = d.getDate();
  let week = 1;
  if (day > 21) week = 4;
  else if (day > 14) week = 3;
  else if (day > 7) week = 2;
  return { month, year, week };
};

// Helper to build flexible store name matching regexes
const buildStoreRegexes = (storeName) => {
  if (!storeName || storeName === 'All') return null;

  const raw = String(storeName).trim();
  const lower = raw.toLowerCase();
  const escaped = raw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

  const isZ = lower.startsWith('z');
  const cleanLoc = lower
    .replace(/^(zorucci|suitor\s*guy|grooms|sg|g|z)[\.\-\s]*/i, '')
    .replace(/\d+$/g, '')
    .trim();

  let locRegexStr = cleanLoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  if (/edap{1,3}a?l{1,3}[yi]*/i.test(cleanLoc)) {
    locRegexStr = 'edap{1,3}a?l{1,3}[yi]*\\d*';
  } else if (/edap{1,3}a?l/i.test(cleanLoc)) {
    locRegexStr = 'edap{1,3}a?l';
  } else if (/kottaka?l/i.test(cleanLoc)) {
    locRegexStr = 'kottaka?l';
  } else if (/perinthalman*a/i.test(cleanLoc)) {
    locRegexStr = 'perinthalman+a';
  } else if (/kalpeta|kalpetta/i.test(cleanLoc)) {
    locRegexStr = 'kalpet+a';
  } else if (/manjer[yi]/i.test(cleanLoc)) {
    locRegexStr = 'manjer[yi]';
  } else if (/perumbav[ou]{1,2}r/i.test(cleanLoc)) {
    locRegexStr = 'perumbav[ou]{1,2}r';
  } else if (/trivandrum|thiruvananthapuram|tvm/i.test(cleanLoc)) {
    locRegexStr = '(trivandrum|thiruvananthapuram|tvm)';
  } else if (/calicut|kozhikode/i.test(cleanLoc)) {
    locRegexStr = '(calicut|kozhikode)';
  } else if (/vadakara|vatakara/i.test(cleanLoc)) {
    locRegexStr = '(vadakara|vatakara)';
  } else if (/thrissur|tsr/i.test(cleanLoc)) {
    locRegexStr = '(thrissur|tsr)';
  }

  const prefixRegex = isZ 
    ? '^(z|zorucci)[\\.\\-\\s]*' 
    : '^(sg|g|suitor\\s*guy|grooms)?[\\.\\-\\s]*';

  const fullRegexPattern = `${prefixRegex}${locRegexStr}$`;

  return [
    { storeName: raw },
    { storeName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
    { storeName: { $regex: new RegExp(fullRegexPattern, 'i') } }
  ];
};

// GET attribution entries by date, storeName, month, year, week
router.get('/', MiddilWare, async (req, res) => {
  try {
    const { storeName, date, month, year, week } = req.query;
    const query = {};

    if (date) {
      query.date = date;
    }
    if (month && month !== 'All') {
      query.month = month;
    }
    if (year && year !== 'All') {
      query.year = Number(year);
    }
    if (storeName && storeName !== 'All') {
      const storeConditions = buildStoreRegexes(storeName);
      if (storeConditions) {
        query.$or = storeConditions;
      }
    }
    if (week !== undefined && week !== null && week !== '' && week !== 'All') {
      query.week = { $in: [Number(week), String(week)] };
    }

    const docs = await CustomizationAttribution.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: docs });
  } catch (error) {
    console.error("Error fetching CustomizationAttribution:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST save/update customization value entry
router.post('/', MiddilWare, async (req, res) => {
  try {
    const { storeName, date, totalValue, totalBills, totalQuantity, attributions } = req.body;
    let { month, year, week } = req.body;

    if (!storeName) {
      return res.status(400).json({ success: false, message: "storeName is required" });
    }

    const entryDate = date || new Date().toISOString().split('T')[0];
    const derived = getMonthAndYearFromDate(entryDate);

    month = month || derived.month;
    year = year ? Number(year) : derived.year;
    week = (week !== undefined && week !== null && week !== '') ? Number(week) : derived.week;

    // Look for an existing document for the same store and date/week
    let existingDoc = null;
    const storeOr = buildStoreRegexes(storeName);

    if (date && storeOr) {
      existingDoc = await CustomizationAttribution.findOne({
        date: entryDate,
        $or: storeOr
      });
    }

    if (!existingDoc && week && month && year && storeOr) {
      existingDoc = await CustomizationAttribution.findOne({
        week: Number(week),
        month,
        year: Number(year),
        $or: storeOr
      });
    }

    const finalAttributions = (attributions && Array.isArray(attributions) && attributions.length > 0) 
      ? attributions 
      : (existingDoc?.attributions && existingDoc.attributions.length > 0)
        ? existingDoc.attributions
        : [{
            staffName: 'Store Total',
            billWtd: Number(totalValue || 0),
            valWtd: Number(totalBills || 0),
            qtyWtd: Number(totalQuantity || 0)
          }];

    // Preserve existing totals if not explicitly sent in the update
    const val = (totalValue !== undefined && totalValue !== null)
      ? Number(totalValue)
      : (existingDoc?.totalValue ?? finalAttributions.reduce((s, a) => s + (Number(a.billWtd) || 0), 0));

    const bills = (totalBills !== undefined && totalBills !== null)
      ? Number(totalBills)
      : (existingDoc?.totalBills ?? finalAttributions.reduce((s, a) => s + (Number(a.valWtd) || 0), 0));

    const qty = (totalQuantity !== undefined && totalQuantity !== null)
      ? Number(totalQuantity)
      : (existingDoc?.totalQuantity ?? finalAttributions.reduce((s, a) => s + (Number(a.qtyWtd) || 0), 0));

    const filter = existingDoc ? { _id: existingDoc._id } : { storeName, date: entryDate };

    const update = {
      storeName: existingDoc ? existingDoc.storeName : storeName,
      date: existingDoc ? (existingDoc.date || entryDate) : entryDate,
      month,
      year: Number(year),
      week: Number(week),
      totalValue: val,
      totalBills: bills,
      totalQuantity: qty,
      attributions: finalAttributions
    };

    const doc = await CustomizationAttribution.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });

    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("Error saving CustomizationAttribution:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// DELETE entry by ID
router.delete('/:id', MiddilWare, async (req, res) => {
  try {
    const { id } = req.params;
    await CustomizationAttribution.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting CustomizationAttribution:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET mobile attribution details for Customization data with resolved full user details (Flutter API)
router.get('/mobile-customization', MiddilWare, async (req, res) => {
  try {
    const { month, year, week } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required parameters" });
    }

    const query = { month, year: Number(year) };
    if (week !== undefined && week !== null && week !== '' && week !== 'All') {
      query.week = Number(week);
    }

    const customDocs = await CustomizationAttribution.find(query).lean();

    const staffResolutionMap = new Map();
    const usersList = await mongoose.model('User').find({}, { username: 1, empID: 1, workingBranch: 1 }).lean();
    usersList.forEach(u => {
      if (u.username) {
        staffResolutionMap.set(u.username.trim().toLowerCase(), {
          fullName: u.username,
          empID: u.empID || '',
          storeName: u.workingBranch || ''
        });
      }
    });

    const employeesList = await mongoose.model('Employee').find({}, { firstName: 1, lastName: 1, employeeId: 1, storeId: 1 }).populate('storeId', 'workingBranch').lean();
    employeesList.forEach(e => {
      const fullNameStr = `${e.firstName} ${e.lastName}`.trim();
      if (fullNameStr) {
        staffResolutionMap.set(fullNameStr.toLowerCase(), {
          fullName: fullNameStr,
          empID: e.employeeId || '',
          storeName: e.storeId?.workingBranch || ''
        });
      }
    });

    const formattedCustomization = [];
    customDocs.forEach(doc => {
      const store = doc.storeName;
      if (doc.attributions && Array.isArray(doc.attributions)) {
        doc.attributions.forEach(attr => {
          const resolved = staffResolutionMap.get(attr.staffName.trim().toLowerCase()) || {
            fullName: attr.staffName,
            empID: '',
            storeName: store
          };

          formattedCustomization.push({
            employeeName: resolved.fullName,
            empID: resolved.empID,
            storeName: resolved.storeName || store,
            week: doc.week,
            month: doc.month,
            year: doc.year,
            billWtd: attr.valWtd ?? 0,
            valWtd: attr.billWtd ?? 0,
            qtyWtd: attr.qtyWtd ?? 0
          });
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: formattedCustomization
    });
  } catch (error) {
    console.error("Error inside GET /mobile-customization:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

export default router;

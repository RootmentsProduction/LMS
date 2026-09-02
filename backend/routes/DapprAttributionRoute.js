import express from 'express';
import mongoose from 'mongoose';
import { MiddilWare } from '../lib/middilWare.js';
import DapprAttribution from '../model/DapprAttribution.js';

const router = express.Router();

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

// GET attribution for specific store (or all stores), week, month, year
router.get('/', MiddilWare, async (req, res) => {
  try {
    const { storeName, month, year, week } = req.query;
    if (!year) {
      return res.status(400).json({ success: false, message: "year is required" });
    }

    const query = { year: Number(year) };
    if (month && month !== 'All') {
      query.month = month;
    }
    if (storeName && storeName !== 'All') {
      const storeConditions = buildStoreRegexes(storeName);
      if (storeConditions) {
        query.$or = storeConditions;
      }
    }
    if (week !== undefined && week !== null && week !== '' && week !== 'All') {
      query.week = Number(week);
    }

    const docs = await DapprAttribution.find(query).lean();
    return res.status(200).json({ success: true, data: docs });
  } catch (error) {
    console.error("Error fetching DapprAttribution:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST save/update attribution
router.post('/', MiddilWare, async (req, res) => {
  try {
    const { storeName, month, year, week, attributions } = req.body;
    if (!storeName || !month || !year || week === undefined) {
      return res.status(400).json({ success: false, message: "storeName, month, year, and week are required" });
    }

    const filter = { storeName, month, year: Number(year), week: Number(week) };
    const update = { attributions };

    const doc = await DapprAttribution.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });

    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("Error saving DapprAttribution:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET mobile attribution details for Dappr data with resolved full user details (Flutter API)
router.get('/mobile-dappr', MiddilWare, async (req, res) => {
  try {
    const { month, year, week } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required parameters" });
    }

    const query = { month, year: Number(year) };
    if (week !== undefined && week !== null && week !== '' && week !== 'All') {
      query.week = Number(week);
    }

    // Fetch matching Dappr documents
    const dapprDocs = await DapprAttribution.find(query).lean();

    // Helper map: staffName (lowercase) -> { fullName, empID, storeName }
    const staffResolutionMap = new Map();

    // Fetch all Users to resolve details
    const usersList = await DapprAttribution.db.model('User').find({}, { username: 1, empID: 1, workingBranch: 1 }).lean();
    usersList.forEach(u => {
      if (u.username) {
        staffResolutionMap.set(u.username.trim().toLowerCase(), {
          fullName: u.username,
          empID: u.empID || '',
          storeName: u.workingBranch || ''
        });
      }
    });

    // Fetch all Employees to fallback details
    const employeesList = await DapprAttribution.db.model('Employee').find({}, { firstName: 1, lastName: 1, employeeId: 1, storeId: 1 }).populate('storeId', 'workingBranch').lean();
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

    // Process Dappr Attributions
    const formattedDappr = [];
    dapprDocs.forEach(doc => {
      const store = doc.storeName;
      if (doc.attributions && Array.isArray(doc.attributions)) {
        doc.attributions.forEach(attr => {
          const resolved = staffResolutionMap.get(attr.staffName.trim().toLowerCase()) || {
            fullName: attr.staffName,
            empID: '',
            storeName: store
          };

          formattedDappr.push({
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
      data: formattedDappr
    });
  } catch (error) {
    console.error("Error inside GET /mobile-dappr:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

export default router;

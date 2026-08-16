import express from 'express';
import { MiddilWare } from '../lib/middilWare.js';
import StoreTarget from '../model/StoreTarget.js';
import Branch from '../model/Branch.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: given weekRanges + weeklyTargets, return which week is "current"
// and compute today's proportional daily target
// ─────────────────────────────────────────────────────────────────────────────
function parseWeekRange(rangeStr) {
  if (!rangeStr || rangeStr === 'Select Days') return null;
  const parts = rangeStr.split('-');
  if (parts.length < 2) return null;
  const start = parseInt(parts[0].trim(), 10);
  const endPart = parts[1].trim().split(' ')[0];
  const end = parseInt(endPart, 10);
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end, days: end - start + 1 };
}

function computeTargetSummary(weekRanges, weeklyTargets, todayDate) {
  const todayDay = todayDate.getDate();
  const totalMTD = [1, 2, 3, 4].reduce((sum, w) => sum + (weeklyTargets[w] || 0), 0);

  let currentWeek = null;
  let wtdTarget = 0;
  let dailyTarget = 0;
  let mtdAchievableSoFar = 0; // sum of targets for days 1..today

  for (const wk of [1, 2, 3, 4]) {
    const range = parseWeekRange(weekRanges[wk]);
    if (!range) continue;

    const wTarget = weeklyTargets[wk] || 0;
    const dailyRate = range.days > 0 ? wTarget / range.days : 0;

    // Days elapsed in this week up to today
    if (todayDay >= range.start && todayDay <= range.end) {
      currentWeek = wk;
      wtdTarget = wTarget;
      dailyTarget = Math.round(dailyRate);
      const daysElapsed = todayDay - range.start + 1;
      mtdAchievableSoFar += Math.round(dailyRate * daysElapsed);
    } else if (todayDay > range.end) {
      // This week is fully in the past — count all its days
      mtdAchievableSoFar += wTarget;
    }
  }

  return { totalMTD, wtdTarget, dailyTarget, currentWeek, mtdAchievableSoFar };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/store-targets/flutter
//
// Query params:
//   storeName  (required)  – exact store name, e.g. "G-Edappally"
//   month      (optional)  – e.g. "July"  (defaults to current month)
//   year       (optional)  – e.g. 2026    (defaults to current year)
//
// Returns full target breakdown for the store + all its staff
// ─────────────────────────────────────────────────────────────────────────────
router.get('/flutter', MiddilWare, async (req, res) => {
  try {
    const today = new Date();
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];

    const { storeName, month = monthNames[today.getMonth()], year = today.getFullYear() } = req.query;

    if (!storeName) {
      return res.status(400).json({ success: false, message: "storeName query param is required" });
    }

    // Fetch store-specific + global ("All") config for week ranges fallback
    const [storeDoc, globalDoc] = await Promise.all([
      StoreTarget.findOne({ storeName, month, year: Number(year) }).lean(),
      StoreTarget.findOne({ storeName: 'All', month, year: Number(year) }).lean()
    ]);

    const doc = storeDoc || globalDoc || null;

    if (!doc) {
      return res.status(200).json({
        success: true,
        storeName,
        month,
        year: Number(year),
        message: "No target configured for this store/month",
        store: null,
        staff: []
      });
    }

    // Merge week ranges: store-level overrides global
    const weekRanges = {
      1: storeDoc?.weekRanges?.[1] || globalDoc?.weekRanges?.[1] || 'Select Days',
      2: storeDoc?.weekRanges?.[2] || globalDoc?.weekRanges?.[2] || 'Select Days',
      3: storeDoc?.weekRanges?.[3] || globalDoc?.weekRanges?.[3] || 'Select Days',
      4: storeDoc?.weekRanges?.[4] || globalDoc?.weekRanges?.[4] || 'Select Days',
    };

    const weeklyTargets = doc.weeklyTargets || { 1: 0, 2: 0, 3: 0, 4: 0 };
    const summary = computeTargetSummary(weekRanges, weeklyTargets, today);

    // Build per-week detail
    const weeks = [1, 2, 3, 4].map(wk => ({
      week: wk,
      dateRange: weekRanges[wk],
      target: weeklyTargets[wk] || 0,
      isCurrent: summary.currentWeek === wk
    }));

    // Build per-staff detail
    const staff = (doc.employeeTargets || []).map(emp => {
      const empWeeklyTargets = emp.weeklyTargets || { 1: 0, 2: 0, 3: 0, 4: 0 };
      const empSummary = computeTargetSummary(weekRanges, empWeeklyTargets, today);
      return {
        staffName: emp.staffName,
        mtdTarget: empSummary.totalMTD,
        wtdTarget: empSummary.wtdTarget,
        dailyTarget: empSummary.dailyTarget,
        currentWeek: empSummary.currentWeek,
        mtdAchievableSoFar: empSummary.mtdAchievableSoFar,
        weeks: [1, 2, 3, 4].map(wk => ({
          week: wk,
          dateRange: weekRanges[wk],
          target: empWeeklyTargets[wk] || 0,
          isCurrent: empSummary.currentWeek === wk
        }))
      };
    });

    return res.status(200).json({
      success: true,
      storeName: doc.storeName,
      month: doc.month,
      year: doc.year,
      store: {
        mtdTarget: summary.totalMTD,
        wtdTarget: summary.wtdTarget,
        dailyTarget: summary.dailyTarget,
        currentWeek: summary.currentWeek,
        mtdAchievableSoFar: summary.mtdAchievableSoFar,
        weeks
      },
      staff
    });
  } catch (error) {
    console.error("Error in /store-targets/flutter:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET & POST /api/store-targets/week-by-date
//
// Parameters (Query or Body):
//   date       (optional) - date string (defaults to today/current date)
//   storeName  (optional) - store name (defaults to "All")
//   month      (optional) - month name (defaults to parsed month from date)
//   year       (optional) - year number (defaults to parsed year from date)
//
// Returns the week number, label, and ranges for the date based on config
// ─────────────────────────────────────────────────────────────────────────────
const getWeekByDateHandler = async (req, res) => {
  try {
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
    
    let dateVal = req.query.date || req.body.date;
    let parsedDate = new Date();
    if (dateVal) {
      parsedDate = new Date(dateVal);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format provided" });
      }
    }

    const day = parsedDate.getDate();
    const defaultMonthName = monthNames[parsedDate.getMonth()];
    const defaultYear = parsedDate.getFullYear();

    const storeName = req.query.storeName || req.body.storeName || 'All';
    const month = req.query.month || req.body.month || defaultMonthName;
    const year = Number(req.query.year || req.body.year || defaultYear);

    // Fetch store-specific + global ("All") config for week ranges fallback
    const [storeDoc, globalDoc] = await Promise.all([
      StoreTarget.findOne({ storeName, month, year }).lean(),
      StoreTarget.findOne({ storeName: 'All', month, year }).lean()
    ]);

    const weekRanges = {
      1: storeDoc?.weekRanges?.[1] || globalDoc?.weekRanges?.[1] || 'Select Days',
      2: storeDoc?.weekRanges?.[2] || globalDoc?.weekRanges?.[2] || 'Select Days',
      3: storeDoc?.weekRanges?.[3] || globalDoc?.weekRanges?.[3] || 'Select Days',
      4: storeDoc?.weekRanges?.[4] || globalDoc?.weekRanges?.[4] || 'Select Days',
    };

    let matchedWeek = null;
    let matchedRangeStr = null;
    let isConfigured = false;
    let configSource = 'fallback';

    for (const wk of [1, 2, 3, 4]) {
      // 1. Check store-specific range first
      const storeRangeStr = storeDoc?.weekRanges?.[wk];
      const storeRange = parseWeekRange(storeRangeStr);
      if (storeRange && day >= storeRange.start && day <= storeRange.end) {
        matchedWeek = wk;
        matchedRangeStr = storeRangeStr;
        isConfigured = true;
        configSource = 'store';
        break;
      }

      // 2. Check global "All" range second
      const globalRangeStr = globalDoc?.weekRanges?.[wk];
      const globalRange = parseWeekRange(globalRangeStr);
      if (globalRange && day >= globalRange.start && day <= globalRange.end) {
        matchedWeek = wk;
        matchedRangeStr = globalRangeStr;
        isConfigured = true;
        configSource = 'global';
        break;
      }
    }

    // Fallback standard weekly split
    if (matchedWeek === null) {
      if (day <= 7) {
        matchedWeek = 1;
        matchedRangeStr = `01 - 07 ${month.substring(0, 3)}`;
      } else if (day <= 14) {
        matchedWeek = 2;
        matchedRangeStr = `08 - 14 ${month.substring(0, 3)}`;
      } else if (day <= 21) {
        matchedWeek = 3;
        matchedRangeStr = `15 - 21 ${month.substring(0, 3)}`;
      } else {
        matchedWeek = 4;
        const lastDay = new Date(year, parsedDate.getMonth() + 1, 0).getDate();
        matchedRangeStr = `22 - ${lastDay} ${month.substring(0, 3)}`;
      }
      isConfigured = false;
      configSource = 'fallback';
    }

    // Build details for all weeks in the month
    const allWeeks = [1, 2, 3, 4].map(wk => {
      let rangeStr = weekRanges[wk];
      let isFallbackRange = false;
      if (!rangeStr || rangeStr === 'Select Days') {
        isFallbackRange = true;
        if (wk === 1) rangeStr = `01 - 07 ${month.substring(0, 3)}`;
        else if (wk === 2) rangeStr = `08 - 14 ${month.substring(0, 3)}`;
        else if (wk === 3) rangeStr = `15 - 21 ${month.substring(0, 3)}`;
        else {
          const lastDay = new Date(year, parsedDate.getMonth() + 1, 0).getDate();
          rangeStr = `22 - ${lastDay} ${month.substring(0, 3)}`;
        }
      }
      return {
        week: wk,
        weekLabel: `Week ${wk}`,
        dateRange: rangeStr,
        isFallback: isFallbackRange,
        isCurrent: matchedWeek === wk
      };
    });

    return res.status(200).json({
      success: true,
      storeName,
      month,
      year,
      inputDate: parsedDate.toISOString(),
      day,
      week: matchedWeek,
      weekLabel: `Week ${matchedWeek}`,
      dateRange: matchedRangeStr,
      isConfigured,
      configSource,
      storeConfig: {
        exists: !!storeDoc,
        weekRanges: storeDoc?.weekRanges || null
      },
      globalConfig: {
        exists: !!globalDoc,
        weekRanges: globalDoc?.weekRanges || null
      },
      allWeeks
    });
  } catch (error) {
    console.error("Error in /store-targets/week-by-date:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

router.get('/week-by-date', MiddilWare, getWeekByDateHandler);
router.post('/week-by-date', MiddilWare, getWeekByDateHandler);

// GET /api/store-targets/weeks-configuration
//
// Query params:
//   month (optional) - e.g. "July" (defaults to current month)
//   year  (optional) - e.g. 2026 (defaults to current year)
//
// Returns week configurations for all active branches and global config
router.get('/weeks-configuration', MiddilWare, async (req, res) => {
  try {
    const today = new Date();
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];

    const defaultMonth = monthNames[today.getMonth()];
    const defaultYear = today.getFullYear();

    const month = req.query.month || defaultMonth;
    const year = Number(req.query.year || defaultYear);

    // Fetch active branches and existing store targets
    const [branches, targets] = await Promise.all([
      Branch.find({ isActive: true }).select('workingBranch locCode').lean(),
      StoreTarget.find({ month, year }).lean()
    ]);

    // Create a map of store target documents by store name
    const targetsByStore = {};
    targets.forEach(t => {
      targetsByStore[t.storeName] = t;
    });

    const globalDoc = targetsByStore['All'] || null;

    // Helper to resolve short month name and last day of month
    const shortMonth = month.substring(0, 3);
    const monthIndex = monthNames.indexOf(month);
    const lastDay = new Date(year, monthIndex !== -1 ? monthIndex + 1 : today.getMonth() + 1, 0).getDate();

    // Map each active store to its configuration
    const storesList = branches.map(branch => {
      const storeName = branch.workingBranch;
      const storeDoc = targetsByStore[storeName];

      const weekRanges = {
        1: storeDoc?.weekRanges?.[1] || globalDoc?.weekRanges?.[1] || 'Select Days',
        2: storeDoc?.weekRanges?.[2] || globalDoc?.weekRanges?.[2] || 'Select Days',
        3: storeDoc?.weekRanges?.[3] || globalDoc?.weekRanges?.[3] || 'Select Days',
        4: storeDoc?.weekRanges?.[4] || globalDoc?.weekRanges?.[4] || 'Select Days',
      };

      // Resolve fallback ranges if any are "Select Days" or empty
      const resolvedWeekRanges = {
        1: (weekRanges[1] && weekRanges[1] !== 'Select Days') ? weekRanges[1] : `01 - 07 ${shortMonth}`,
        2: (weekRanges[2] && weekRanges[2] !== 'Select Days') ? weekRanges[2] : `08 - 14 ${shortMonth}`,
        3: (weekRanges[3] && weekRanges[3] !== 'Select Days') ? weekRanges[3] : `15 - 21 ${shortMonth}`,
        4: (weekRanges[4] && weekRanges[4] !== 'Select Days') ? weekRanges[4] : `22 - ${lastDay} ${shortMonth}`,
      };

      const weeklyTargets = {
        1: storeDoc?.weeklyTargets?.[1] ?? 0,
        2: storeDoc?.weeklyTargets?.[2] ?? 0,
        3: storeDoc?.weeklyTargets?.[3] ?? 0,
        4: storeDoc?.weeklyTargets?.[4] ?? 0,
      };

      return {
        storeName,
        locCode: branch.locCode,
        isConfigured: !!storeDoc,
        weekRanges: resolvedWeekRanges,
        weeklyTargets
      };
    });

    // Also resolve global config fallback ranges for display
    const globalWeekRanges = {
      1: globalDoc?.weekRanges?.[1] || 'Select Days',
      2: globalDoc?.weekRanges?.[2] || 'Select Days',
      3: globalDoc?.weekRanges?.[3] || 'Select Days',
      4: globalDoc?.weekRanges?.[4] || 'Select Days',
    };

    const resolvedGlobalWeekRanges = {
      1: (globalWeekRanges[1] && globalWeekRanges[1] !== 'Select Days') ? globalWeekRanges[1] : `01 - 07 ${shortMonth}`,
      2: (globalWeekRanges[2] && globalWeekRanges[2] !== 'Select Days') ? globalWeekRanges[2] : `08 - 14 ${shortMonth}`,
      3: (globalWeekRanges[3] && globalWeekRanges[3] !== 'Select Days') ? globalWeekRanges[3] : `15 - 21 ${shortMonth}`,
      4: (globalWeekRanges[4] && globalWeekRanges[4] !== 'Select Days') ? globalWeekRanges[4] : `22 - ${lastDay} ${shortMonth}`,
    };

    const globalWeeklyTargets = {
      1: globalDoc?.weeklyTargets?.[1] ?? 0,
      2: globalDoc?.weeklyTargets?.[2] ?? 0,
      3: globalDoc?.weeklyTargets?.[3] ?? 0,
      4: globalDoc?.weeklyTargets?.[4] ?? 0,
    };

    const resolvedGlobalConfig = {
      storeName: 'All',
      isConfigured: !!globalDoc,
      weekRanges: resolvedGlobalWeekRanges,
      weeklyTargets: globalWeeklyTargets
    };

    return res.status(200).json({
      success: true,
      month,
      year,
      stores: storesList,
      globalConfig: resolvedGlobalConfig,
      rawConfigs: targets
    });
  } catch (error) {
    console.error("Error in /store-targets/weeks-configuration:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// GET all store targets for a month and year
router.get('/', MiddilWare, async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    if (month) query.month = month;
    if (year) query.year = Number(year);

    const targets = await StoreTarget.find(query).lean();
    return res.status(200).json({ success: true, data: targets });
  } catch (error) {
    console.error("Error fetching StoreTargets:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST save/update a store target config
router.post('/', MiddilWare, async (req, res) => {
  try {
    const userRole = req.admin?.role;
    if (!['super_admin', 'admin', 'cluster_admin', 'store_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: Only admin, cluster admin, and store managers can assign targets." });
    }

    const { storeName, month, year, weekRanges, weeklyTargets, employeeTargets } = req.body;
    if (!storeName || !month) {
      return res.status(400).json({ success: false, message: "storeName and month are required" });
    }

    const targetYear = Number(year) || 2026;
    const normKey = String(storeName).toLowerCase().replace(/[^a-z0-9]/g, "");

    // Find all existing docs for this month & year that match storeName (exact or normalized)
    const existingDocs = await StoreTarget.find({ month, year: targetYear }).lean();
    const matchingDocs = existingDocs.filter(d => {
      if (d.storeName === storeName) return true;
      if (normKey && d.storeName.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey) return true;
      return false;
    });

    const update = {
      weekRanges,
      weeklyTargets
    };
    if (employeeTargets !== undefined) {
      update.employeeTargets = employeeTargets;
    }

    let doc = null;
    if (matchingDocs.length > 0) {
      // Update all matching docs to keep alias documents in sync
      const docIds = matchingDocs.map(d => d._id);
      await StoreTarget.updateMany({ _id: { $in: docIds } }, { $set: update });
      doc = await StoreTarget.findById(matchingDocs[0]._id).lean();
    } else {
      const filter = { storeName, month, year: targetYear };
      doc = await StoreTarget.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }).lean();
    }

    if (storeName === 'All' && weekRanges) {
      await StoreTarget.updateMany(
        { month, year: targetYear },
        { $set: { weekRanges } }
      );
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("Error saving StoreTarget:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

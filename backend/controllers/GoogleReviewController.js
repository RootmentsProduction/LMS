import GoogleReviewEntry from '../model/GoogleReviewEntry.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: today's date string in YYYY-MM-DD (IST)
// ─────────────────────────────────────────────────────────────────────────────
function getTodayIST() {
  const now = new Date();
  // IST = UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/google-reviews
// Body: { branchName, branchId?, count }
// Creates or updates today's review entry for the given branch
// ─────────────────────────────────────────────────────────────────────────────
export const upsertGoogleReview = async (req, res) => {
  try {
    const { branchName, branchId, count, rating } = req.body;

    if (!branchName) {
      return res.status(400).json({ success: false, message: 'branchName is required' });
    }
    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({ success: false, message: 'count must be a non-negative number' });
    }
    if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
      return res.status(400).json({ success: false, message: 'rating must be a number between 0 and 5' });
    }

    const today = getTodayIST();
    const adminId   = req.admin?.userId  || null;
    const adminName = req.admin?.username || '';

    const updateObj = {
      branchId:      branchId || null,
      count,
      enteredBy:     adminId,
      enteredByName: adminName,
      date:          today,
    };
    if (rating !== undefined) {
      updateObj.rating = rating;
    }

    // Upsert: one entry per branch per day
    const entry = await GoogleReviewEntry.findOneAndUpdate(
      { branchName, date: today },
      { $set: updateObj },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, data: entry });
  } catch (err) {
    console.error('❌ upsertGoogleReview error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google-reviews/dashboard
// Returns today, thisWeek, thisMonth, total counts for each branch
// ─────────────────────────────────────────────────────────────────────────────
export const getGoogleReviewDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = getTodayIST();
    const todayDate = new Date(today);

    // Week start (Monday) in IST
    const dayOfWeek = todayDate.getDay(); // 0=Sun,1=Mon,...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Month start
    const monthStartStr = today.slice(0, 7) + '-01';

    // Determine query range
    const qStart = startDate || monthStartStr;
    const qEnd = endDate || today;

    // Fetch entries for the specified date range
    const rangeEntries = await GoogleReviewEntry.find({
      date: { $gte: qStart, $lte: qEnd },
    }).lean();

    // Fetch all entries from the start of the month onwards as well (for today/week/month metrics)
    const monthEntries = (qStart === monthStartStr && qEnd === today)
      ? rangeEntries
      : await GoogleReviewEntry.find({ date: { $gte: monthStartStr } }).lean();

    // Fetch last year actual reviews for the same range
    let lyStart = "";
    let lyEnd = "";
    if (startDate && endDate && startDate.length >= 10 && endDate.length >= 10) {
      const startYear = Number(startDate.slice(0, 4)) - 1;
      const endYear = Number(endDate.slice(0, 4)) - 1;
      lyStart = startYear + startDate.slice(4);
      lyEnd = endYear + endDate.slice(4);
    } else {
      const lyYear = Number(today.slice(0, 4)) - 1;
      lyStart = lyYear + today.slice(4, 7) + '-01';
      lyEnd = lyYear + today.slice(4);
    }

    const lyEntries = await GoogleReviewEntry.find({
      date: { $gte: lyStart, $lte: lyEnd },
    }).lean();

    // Group period entries by branchName
    const periodByBranch = {};
    for (const entry of rangeEntries) {
      if (!periodByBranch[entry.branchName]) periodByBranch[entry.branchName] = 0;
      periodByBranch[entry.branchName] += entry.count;
    }

    // Group month/week/today entries by branchName
    const byBranch = {};
    for (const entry of monthEntries) {
      if (!byBranch[entry.branchName]) {
        byBranch[entry.branchName] = { today: 0, thisWeek: 0, thisMonth: 0 };
      }
      const g = byBranch[entry.branchName];
      if (entry.date === today)          g.today     += entry.count;
      if (entry.date >= weekStartStr)    g.thisWeek  += entry.count;
      if (entry.date >= monthStartStr)   g.thisMonth += entry.count;
    }

    const lyByBranch = {};
    for (const entry of lyEntries) {
      if (!lyByBranch[entry.branchName]) {
        lyByBranch[entry.branchName] = { count: 0 };
      }
      lyByBranch[entry.branchName].count += entry.count;
    }

    // Fetch total for all time (separate query)
    const totals = await GoogleReviewEntry.aggregate([
      { $group: { _id: '$branchName', total: { $sum: '$count' } } },
    ]);
    const totalByBranch = {};
    for (const t of totals) totalByBranch[t._id] = t.total;

    // Fetch average rating for each branch based on entered ratings
    const ratingStats = await GoogleReviewEntry.aggregate([
      { $match: { rating: { $gt: 0 } } },
      {
        $group: {
          _id: '$branchName',
          totalWeightedRating: { $sum: { $multiply: ['$rating', { $cond: [{ $gt: ['$count', 0] }, '$count', 1] }] } },
          totalWeight: { $sum: { $cond: [{ $gt: ['$count', 0] }, '$count', 1] } }
        }
      }
    ]);
    const ratingByBranch = {};
    for (const r of ratingStats) {
      ratingByBranch[r._id] = r.totalWeight > 0
        ? parseFloat((r.totalWeightedRating / r.totalWeight).toFixed(1))
        : 0;
    }

    // Merge
    const allBranches = new Set([
      ...Object.keys(periodByBranch),
      ...Object.keys(byBranch),
      ...Object.keys(totalByBranch),
    ]);

    const result = {};
    for (const branch of allBranches) {
      result[branch] = {
        periodCount: periodByBranch[branch]     || 0,
        today:       byBranch[branch]?.today    || 0,
        thisWeek:    byBranch[branch]?.thisWeek  || 0,
        thisMonth:   byBranch[branch]?.thisMonth || 0,
        lyThisMonth: lyByBranch[branch]?.count   || 0,
        total:       totalByBranch[branch]       || 0,
        rating:      ratingByBranch[branch]      || 0,
      };
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('❌ getGoogleReviewDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/google-reviews/history?branchName=X&limit=30
// Returns recent entries for a specific branch
// ─────────────────────────────────────────────────────────────────────────────
export const getGoogleReviewHistory = async (req, res) => {
  try {
    const { branchName, limit = 30 } = req.query;
    const query = branchName ? { branchName } : {};
    const entries = await GoogleReviewEntry.find(query)
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean();
    return res.status(200).json({ success: true, data: entries });
  } catch (err) {
    console.error('❌ getGoogleReviewHistory error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

import mongoose from "mongoose";
import BranchAudit from "../model/BranchAudit.js";
import Branch from "../model/Branch.js";
import Admin from "../model/Admin.js";

const toISODate = (value = new Date()) => {
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
};

const normalizeRatedBy = async (adminId) => {
  if (!adminId) return "HR DEPARTMENT";
  const admin = await Admin.findById(adminId).select("name username role");
  if (!admin) return "HR DEPARTMENT";
  return admin.name || admin.username || admin.role || "HR DEPARTMENT";
};

const computeOverallRating = (sections = []) => {
  const scores = [];
  sections.forEach((section) => {
    (section.items || []).forEach((item) => {
      const score = Number(item.score || 0);
      if (Number.isFinite(score)) scores.push(score);
    });
  });
  if (!scores.length) return 0;
  const total = scores.reduce((sum, n) => sum + n, 0);
  return Number((total / scores.length).toFixed(2));
};

const findBranchForAudit = async ({ storeId, store }) => {
  const trimmedStoreId = typeof storeId === "string" ? storeId.trim() : storeId;
  const trimmedStore = typeof store === "string" ? store.trim() : store;

  if (trimmedStoreId) {
    if (mongoose.isValidObjectId(trimmedStoreId)) {
      const byId = await Branch.findById(trimmedStoreId).select("locCode workingBranch");
      if (byId) return byId;
    }

    const byLocCode = await Branch.findOne({
      $or: [
        { locCode: trimmedStoreId },
        { workingBranch: trimmedStoreId },
      ],
    }).select("locCode workingBranch");

    if (byLocCode) return byLocCode;
  }

  if (trimmedStore) {
    return Branch.findOne({ workingBranch: trimmedStore }).select("locCode workingBranch");
  }

  return null;
};

export const createBranchAudit = async (req, res) => {
  try {
    const {
      store,
      storeId,
      sections = [],
      auditorRemarks = {},
      ratedOn,
      metadata = {},
    } = req.body || {};

    if (!store) {
      return res.status(400).json({ success: false, message: "Store is required" });
    }

    const normalizedSections = Array.isArray(sections)
      ? sections.map((section) => ({
          title: section.title || "",
          remarks: section.remarks || "",
          items: Array.isArray(section.items)
            ? section.items.map((item) => ({
                label: item.label || "",
                score: Number(item.score || 0),
              }))
            : [],
        }))
      : [];

    const overallRating = computeOverallRating(normalizedSections);
    const totalRatingsCount = normalizedSections.reduce((sum, section) => sum + (section.items?.length || 0), 0);

    const [branch, ratedBy] = await Promise.all([
      findBranchForAudit({ storeId, store }),
      normalizeRatedBy(req.admin?.userId),
    ]);

    const audit = await BranchAudit.create({
      store: branch?.workingBranch || store,
      storeId: branch?._id || storeId || undefined,
      ratedBy,
      ratedById: req.admin?.userId || undefined,
      ratedOn: ratedOn || toISODate(),
      overallRating,
      sections: normalizedSections,
      auditorRemarks: {
        observationAcknowledged: auditorRemarks?.observationAcknowledged || "",
        actionPlanForShortfalls: auditorRemarks?.actionPlanForShortfalls || "",
      },
      totalRatingsCount,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: "Branch audit saved successfully",
      data: audit,
    });
  } catch (error) {
    console.error("createBranchAudit error:", error);
    return res.status(500).json({ success: false, message: "Failed to save branch audit", error: error.message });
  }
};

export const getBranchAudits = async (req, res) => {
  try {
    const { store, search = "", limit = 1000 } = req.query || {};
    const query = {};

    if (store && store !== "All") query.store = store;
    if (search.trim()) {
      query.$or = [
        { store: { $regex: search.trim(), $options: "i" } },
        { ratedBy: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const audits = await BranchAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 1000, 2000))
      .lean();

    return res.status(200).json({
      success: true,
      count: audits.length,
      data: audits.map((audit) => ({
        ...audit,
        createdOn: toISODate(audit.createdAt),
      })),
    });
  } catch (error) {
    console.error("getBranchAudits error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch branch audits", error: error.message });
  }
};

export const getBranchAuditById = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await BranchAudit.findById(id).lean();

    if (!audit) {
      return res.status(404).json({ success: false, message: "Audit not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...audit,
        createdOn: toISODate(audit.createdAt),
      },
    });
  } catch (error) {
    console.error("getBranchAuditById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch branch audit", error: error.message });
  }
};

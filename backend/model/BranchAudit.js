import mongoose from "mongoose";

const auditItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 5 },
  },
  { _id: false }
);

const branchAuditSchema = new mongoose.Schema(
  {
    store: { type: String, required: true, trim: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    ratedBy: { type: String, required: true, trim: true },
    ratedById: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    ratedOn: { type: String, required: true, trim: true },
    overallRating: { type: Number, required: true, min: 0, max: 5 },
    sections: [
      {
        title: { type: String, required: true },
        items: [auditItemSchema],
        remarks: { type: String, default: "" },
      },
    ],
    auditorRemarks: {
      observationAcknowledged: { type: String, default: "" },
      actionPlanForShortfalls: { type: String, default: "" },
    },
    totalRatingsCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

branchAuditSchema.index({ store: 1, createdAt: -1 });
branchAuditSchema.index({ createdAt: -1 });
branchAuditSchema.index({ ratedBy: 1, createdAt: -1 });

const BranchAudit = mongoose.model("BranchAudit", branchAuditSchema);

export default BranchAudit;

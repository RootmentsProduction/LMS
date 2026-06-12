import mongoose from "mongoose";

// Define the Escalation Schema
const EscalationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toAdmin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: "" }],
    context: { type: String, required: true },
    deadline: { type: Date, required: true },
    level: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Automatically update `updatedAt` on document save
EscalationSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Fetch escalations for a specific user
EscalationSchema.index({ toUser: 1 });
// Filter pending vs completed escalations
EscalationSchema.index({ completed: 1 });
// Overdue escalation checks
EscalationSchema.index({ deadline: 1 });
// Compound: active escalations per user
EscalationSchema.index({ toUser: 1, completed: 1 });

const Escalation = mongoose.model("Escalation", EscalationSchema);

export default Escalation;

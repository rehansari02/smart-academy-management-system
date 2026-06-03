const mongoose = require("mongoose");

const assignmentSummarySchema = new mongoose.Schema(
  {
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToName: { type: String },
    count: { type: Number, default: 0 },
    rows: [{ type: Number }],
  },
  { _id: false }
);

const inquiryImportHistorySchema = new mongoose.Schema(
  {
    fileName: { type: String },
    source: { type: String },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    totalRows: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    assignmentSummary: [assignmentSummarySchema],
    errors: [{ type: String }],
  },
  { timestamps: true }
);

inquiryImportHistorySchema.index({ createdAt: -1 });
inquiryImportHistorySchema.index({ source: 1, createdAt: -1 });
inquiryImportHistorySchema.index({ importedBy: 1, createdAt: -1 });

module.exports = mongoose.model("InquiryImportHistory", inquiryImportHistorySchema);

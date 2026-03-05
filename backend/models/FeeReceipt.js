const mongoose = require("mongoose");

const feeReceiptSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    amountPaid: { type: Number, required: true },
    // Standardized to 3 receipt types: Cash, Cheque, Online/UPI
    paymentMode: {
      type: String,
      enum: ["Cash", "Cheque", "Online/UPI"],
      required: true,
    },
    installmentNumber: { type: Number, default: 1 }, // For tracking EMI payments
    // Dynamic Payment Fields
    bankName: { type: String },
    chequeNumber: { type: String },
    chequeDate: { type: Date },
    transactionDate: { type: Date },
    
    transactionId: { type: String }, // For Online/UPI payments
    remarks: { type: String },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes
feeReceiptSchema.index({ student: 1 });
feeReceiptSchema.index({ branch: 1, receiptNo: 1 }, { unique: true }); // Compound Index Limit duplicate per branch
// feeReceiptSchema.index({ receiptNo: 1 });
feeReceiptSchema.index({ date: -1 });
feeReceiptSchema.index({ createdAt: -1 }); // Optimized for sorting last Created

module.exports = mongoose.model("FeeReceipt", feeReceiptSchema);

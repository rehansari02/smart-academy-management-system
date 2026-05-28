const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Please add an amount'],
    },
    reason: {
      type: String,
      required: [true, 'Please add a reason'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: [true, 'Please select a category'],
    },
    paymentMode: {
      type: String,
      default: 'Cash',
      enum: ['Cash', 'Online', 'Other'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);

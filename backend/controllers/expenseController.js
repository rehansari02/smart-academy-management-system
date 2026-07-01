const asyncHandler = require('express-async-handler');
const moment = require('moment');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');

const getBranchScope = (req) => {
  if (req.user.role !== 'Super Admin') {
    return req.user.branchId || null;
  }

  return req.query.branchId || null;
};

const normalizeBranch = (branchId) => {
  if (!branchId) return null;
  if (!mongoose.Types.ObjectId.isValid(branchId)) return false;
  return new mongoose.Types.ObjectId(branchId.toString());
};

const buildBranchExpenseQuery = async (branchId) => {
  if (!branchId) return {};

  const branchUsers = await User.find({ branchId }).select('_id').lean();
  const branchUserIds = branchUsers.map(user => user._id);

  return {
    $or: [
      { branch: branchId },
      {
        $and: [
          { $or: [{ branch: { $exists: false } }, { branch: null }] },
          { addedBy: { $in: branchUserIds } }
        ]
      }
    ]
  };
};

// @desc    Get all expenses (with pagination)
// @route   GET /api/transaction/expenses
// @access  Private
const getExpenses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const fetchAll = req.query.all === 'true';
  const limit = fetchAll ? 0 : (parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  let query = {};
  const branchId = normalizeBranch(getBranchScope(req));
  if (branchId === false) {
    res.status(400);
    throw new Error('Invalid branch selected');
  }
  if (branchId) {
    query = { ...query, ...(await buildBranchExpenseQuery(branchId)) };
  }

  if (req.query.categoryId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.categoryId)) {
      res.status(400);
      throw new Error('Invalid category selected');
    }
    query.category = new mongoose.Types.ObjectId(req.query.categoryId);
  }
  
  const dateFilter = req.query.dateFilter;
  if (dateFilter) {
      let startDate, endDate;
      switch (dateFilter) {
          case 'today':
              startDate = moment().startOf('day');
              endDate = moment().endOf('day');
              break;
          case 'yesterday':
              startDate = moment().subtract(1, 'days').startOf('day');
              endDate = moment().subtract(1, 'days').endOf('day');
              break;
          case 'week':
              startDate = moment().startOf('week'); // Sunday
              endDate = moment().endOf('week'); // Saturday
              break;
          case 'month':
              startDate = moment().startOf('month');
              endDate = moment().endOf('month');
              break;
          case 'year':
              startDate = moment().startOf('year');
              endDate = moment().endOf('year');
              break;
          case 'custom':
              if (req.query.startDate) {
                  startDate = moment(req.query.startDate).startOf('day');
              }
              if (req.query.endDate) {
                  endDate = moment(req.query.endDate).endOf('day');
              }
              break;
      }
      if (startDate && endDate) {
          query.date = { $gte: startDate.toDate(), $lte: endDate.toDate() };
      } else if (startDate) {
          query.date = { $gte: startDate.toDate() };
      } else if (endDate) {
          query.date = { $lte: endDate.toDate() };
      }
  }
  
  const [total, totalAmountResult] = await Promise.all([
    Expense.countDocuments(query),
    Expense.aggregate([
      { $match: query },
      { $group: { _id: null, amount: { $sum: '$amount' } } }
    ])
  ]);

  let expenseQuery = Expense.find(query)
    .populate('addedBy', 'name email')
    .populate('branch', 'name')
    .populate('category', 'name')
    .sort({ date: -1 });

  if (!fetchAll) {
    expenseQuery = expenseQuery.skip(skip).limit(limit);
  }

  const expenses = await expenseQuery;
    
  res.status(200).json({
    data: expenses,
    currentPage: page,
    totalPages: fetchAll ? 1 : Math.ceil(total / limit),
    totalItems: total,
    totalAmount: totalAmountResult[0]?.amount || 0
  });
});

// @desc    Create new expense
// @route   POST /api/transaction/expenses
// @access  Private
const createExpense = asyncHandler(async (req, res) => {
  const { amount, reason, category, paymentMode, date, branch } = req.body;

  if (!amount || !reason || !category) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  const branchId = normalizeBranch(req.user.role === 'Super Admin' ? branch : req.user.branchId);
  if (!branchId) {
    res.status(400);
    throw new Error('Please select a branch');
  }
  if (branchId === false) {
    res.status(400);
    throw new Error('Invalid branch selected');
  }

  const expense = await Expense.create({
    amount,
    reason,
    category,
    paymentMode: paymentMode || 'Cash',
    date: date || Date.now(),
    addedBy: req.user._id,
    branch: branchId
  });

  const createdExpense = await Expense.findById(expense._id)
    .populate('addedBy', 'name email')
    .populate('branch', 'name')
    .populate('category', 'name');

  res.status(201).json(createdExpense);
});

// @desc    Update expense
// @route   PUT /api/transaction/expenses/:id
// @access  Private
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  if (req.user.role !== 'Super Admin' && expense.branch?.toString() !== req.user.branchId?.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this expense');
  }

  const updateData = { ...req.body };
  if (req.user.role !== 'Super Admin') {
    updateData.branch = req.user.branchId;
  } else if (updateData.branch) {
    const branchId = normalizeBranch(updateData.branch);
    if (branchId === false) {
      res.status(400);
      throw new Error('Invalid branch selected');
    }
    updateData.branch = branchId;
  }

  const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
  }).populate('addedBy', 'name email').populate('branch', 'name').populate('category', 'name');

  res.status(200).json(updatedExpense);
});

// @desc    Delete expense
// @route   DELETE /api/transaction/expenses/:id
// @access  Private
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  if (req.user.role !== 'Super Admin' && expense.branch?.toString() !== req.user.branchId?.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this expense');
  }

  await expense.deleteOne();
  res.status(200).json({ id: req.params.id });
});

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};

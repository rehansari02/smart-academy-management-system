const asyncHandler = require('express-async-handler');
const ExpenseCategory = require('../models/ExpenseCategory');

// @desc    Get all expense categories
// @route   GET /api/transaction/expense-categories
// @access  Private
const getExpenseCategories = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== 'Super Admin' && req.user.branchId) {
    query.$or = [{ branch: req.user.branchId }, { branch: { $exists: false } }, { branch: null }];
  } else if (req.query.branchId) {
    query.$or = [{ branch: req.query.branchId }, { branch: { $exists: false } }, { branch: null }];
  }
  
  // If 'all' is true, return without pagination (for dropdowns)
  if (req.query.all === 'true') {
      const categories = await ExpenseCategory.find(query).sort({ name: 1 });
      return res.status(200).json(categories);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await ExpenseCategory.countDocuments(query);
  const categories = await ExpenseCategory.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    data: categories,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalItems: total
  });
});

// @desc    Create new expense category
// @route   POST /api/transaction/expense-categories
// @access  Private
const createExpenseCategory = asyncHandler(async (req, res) => {
  const { name, branch } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Please provide category name');
  }

  const category = await ExpenseCategory.create({
    name,
    addedBy: req.user._id,
    branch: req.user.role === 'Super Admin' ? (branch || null) : req.user.branchId
  });

  res.status(201).json(category);
});

// @desc    Update expense category
// @route   PUT /api/transaction/expense-categories/:id
// @access  Private
const updateExpenseCategory = asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Expense category not found');
  }

  const updatedCategory = await ExpenseCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.status(200).json(updatedCategory);
});


// @desc    Delete expense category
// @route   DELETE /api/transaction/expense-categories/:id
// @access  Private
const deleteExpenseCategory = asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Expense category not found');
  }

  await category.deleteOne();
  res.status(200).json({ id: req.params.id });
});

module.exports = {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
};

const express = require('express');
const router = express.Router();
const {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} = require('../controllers/expenseCategoryController');
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.use(protect);

router.route('/')
  .get(checkPermission('Expenses', 'view'), getExpenseCategories)
  .post(checkPermission('Expenses', 'add'), createExpenseCategory);

router.route('/:id')
  .put(checkPermission('Expenses', 'edit'), updateExpenseCategory)
  .delete(checkPermission('Expenses', 'delete'), deleteExpenseCategory);

module.exports = router;

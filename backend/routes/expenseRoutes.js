const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.use(protect);

router.route('/')
  .get(checkPermission('Expenses', 'view'), getExpenses)
  .post(checkPermission('Expenses', 'add'), createExpense);

router.route('/:id')
  .put(checkPermission('Expenses', 'edit'), updateExpense)
  .delete(checkPermission('Expenses', 'delete'), deleteExpense);

module.exports = router;

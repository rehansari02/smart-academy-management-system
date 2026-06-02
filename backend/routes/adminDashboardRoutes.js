const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const { getAdminDashboard, getReferenceIncentive, updateIncentiveStatus } = require('../controllers/adminDashboardController');

router.get('/overview', protect, admin, getAdminDashboard);
router.get('/reference-incentive', protect, checkPermission('Reference Incentive', 'view'), getReferenceIncentive);
router.put('/reference-incentive/update-status', protect, updateIncentiveStatus);

module.exports = router;

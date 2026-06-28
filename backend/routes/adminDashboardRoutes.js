const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const { getAdminDashboard, getTeacherDashboard, getReferenceIncentive, updateIncentiveStatus } = require('../controllers/adminDashboardController');

router.get('/overview', protect, checkPermission('Dashboard', 'view'), getAdminDashboard);
router.get('/teacher-dashboard', protect, checkPermission('Teacher Dashboard', 'view'), getTeacherDashboard);
router.get('/reference-incentive', protect, checkPermission('Reference Incentive', 'view'), getReferenceIncentive);
router.put('/reference-incentive/update-status', protect, checkPermission('Reference Incentive', 'edit'), updateIncentiveStatus);

module.exports = router;

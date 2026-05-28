const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { getAdminDashboard, getReferenceIncentive, updateIncentiveStatus } = require('../controllers/adminDashboardController');

router.get('/overview', protect, admin, getAdminDashboard);
router.get('/reference-incentive', protect, admin, getReferenceIncentive);
router.put('/reference-incentive/update-status', protect, updateIncentiveStatus);

module.exports = router;

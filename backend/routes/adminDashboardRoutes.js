const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { getAdminDashboard } = require('../controllers/adminDashboardController');

router.get('/overview', protect, admin, getAdminDashboard);

module.exports = router;

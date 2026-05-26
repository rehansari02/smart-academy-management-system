const express = require('express');
const router = express.Router();
const {
    submitComplain,
    getMyComplains,
    getAllComplains,
    updateComplainStatus,
    deleteComplain
} = require('../controllers/complainController');
const { protect, checkRole } = require('../middlewares/authMiddleware');

// Student routes
router.route('/my')
    .get(protect, getMyComplains);

router.route('/')
    .post(protect, submitComplain)
    .get(protect, getAllComplains); // Admin can get all

router.route('/:id/status')
    .put(protect, updateComplainStatus);

router.route('/:id')
    .delete(protect, deleteComplain);

module.exports = router;

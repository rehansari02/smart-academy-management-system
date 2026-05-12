const express = require('express');
const router = express.Router();
const { submitFeedback, getAllFeedback, updateFeedback, deleteFeedback, getFeedbackStats, getPublicFeedbackStats } = require('../controllers/feedbackController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', submitFeedback);                          // Public
router.get('/public-stats', getPublicFeedbackStats);       // Public
router.get('/stats', protect, getFeedbackStats);           // Admin
router.get('/', protect, getAllFeedback);                   // Admin
router.put('/:id', protect, updateFeedback);               // Admin
router.delete('/:id', protect, deleteFeedback);            // Admin

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const {
    createTopperResult,
    getAllTopperResults,
    getPublicTopperResults,
    updateTopperResult,
    deleteTopperResult,
} = require('../controllers/topperResultController');

// Public route (homepage)
router.get('/public', getPublicTopperResults);

// Protected admin routes
router.route('/')
    .get(protect, getAllTopperResults)
    .post(protect, upload.single('image'), createTopperResult);

router.route('/:id')
    .put(protect, upload.single('image'), updateTopperResult)
    .delete(protect, deleteTopperResult);

module.exports = router;

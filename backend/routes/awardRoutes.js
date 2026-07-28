const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const bannerUpload = require('../middlewares/bannerUploadMiddleware');

const {
    createAward,
    getAllAwards,
    updateAward,
    deleteAward
} = require('../controllers/awardController');

// Public route for frontend home page
router.get('/public', (req, res, next) => {
    req.query.isActive = 'true';
    next();
}, getAllAwards);

// Protected Admin Routes
router.route('/')
    .get(protect, getAllAwards)
    .post(protect, bannerUpload.single('image'), createAward);

router.route('/:id')
    .put(protect, bannerUpload.single('image'), updateAward)
    .delete(protect, deleteAward);

module.exports = router;

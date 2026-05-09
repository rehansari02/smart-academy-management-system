const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const bannerUpload = require('../middlewares/bannerUploadMiddleware');
const {
    createBanner,
    getAllBanners,
    getPublicBanners,
    updateBanner,
    deleteBanner,
} = require('../controllers/bannerController');

// Public route (homepage)
router.get('/public', getPublicBanners);

// Protected admin routes
router.route('/')
    .get(protect, getAllBanners)
    .post(protect, bannerUpload.single('image'), createBanner);

router.route('/:id')
    .put(protect, bannerUpload.single('image'), updateBanner)
    .delete(protect, deleteBanner);

module.exports = router;

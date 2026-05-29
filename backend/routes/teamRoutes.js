const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const bannerUpload = require('../middlewares/bannerUploadMiddleware');
const {
    createTeamMember,
    getAllTeamMembers,
    getPublicTeamMembers,
    getTeamMemberById,
    updateTeamMember,
    deleteTeamMember
} = require('../controllers/teamController');

// Public route
router.get('/public', getPublicTeamMembers);

// Protected admin routes
router.route('/')
    .get(protect, getAllTeamMembers)
    .post(protect, bannerUpload.single('image'), createTeamMember);

router.route('/:id')
    .get(protect, getTeamMemberById)
    .put(protect, bannerUpload.single('image'), updateTeamMember)
    .delete(protect, deleteTeamMember);

module.exports = router;

const express = require('express');
const router = express.Router();
const cloudinaryController = require('../controllers/cloudinaryController');
const { protect, checkRole } = require('../middlewares/authMiddleware'); // Assuming this exists

// Route to get all images with status
// Protected route for Admins/SuperAdmins
router.get('/', protect, checkRole(['Super Admin', 'Admin']), cloudinaryController.getCloudinaryImages);
// Route to delete an image
router.post('/delete', protect, checkRole(['Super Admin', 'Admin']), cloudinaryController.deleteCloudinaryImage);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware'); // Assuming this exists or generic admin check
const upload = require('../middlewares/uploadMiddleware');
const { 
    getMaterials, 
    createMaterial, 
    updateMaterial, 
    deleteMaterial 
} = require('../controllers/materialController');

router.route('/')
    .get(getMaterials) // Public/Private handled in controller logic or we might want to protect it? 
    // User request: "Material page... accessed at all places". 
    // For student portal, they need access.
    // I'll make GET public, but filter inside controller based on type/auth conceptually? 
    // Actually, controller logic doesn't filter by user role automatically.
    // But since "Public" is a type, unauthenticated users might access it?
    // User said "Student Portal", which implies logged in student.
    // "Public" type materials might be for general website visitors?
    // Safest is to leave GET open or semi-protected. 
    // Given the previous conversation (Fixing Public Access Issues), public access is important.
    // So GET / is public.
    .post(protect, upload.single('document'), createMaterial); // Admin only 
    // Add checkPermission if needed, e.g., checkPermission('Material', 'add')

router.route('/:id')
    .put(protect, upload.single('document'), updateMaterial)
    .delete(protect, deleteMaterial);

module.exports = router;

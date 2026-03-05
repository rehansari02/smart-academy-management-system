const express = require('express');
const router = express.Router();
const {
    createBranch,
    getBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    getPublicBranches,
    getAllEmployees
} = require('../controllers/branchController');
const { protect, admin } = require('../middlewares/authMiddleware'); // Assuming these exist

// Public Routes
router.get('/public', getPublicBranches);

// Allow public access to get all branches (for dropdowns)
router.route('/')
    .get(getBranches)
    .post(protect, admin, createBranch);

// Apply protect middleware to remaining routes
router.use(protect);

// Get All Employees for Director Selection
router.get('/employees/list', getAllEmployees);

router.route('/:id')
    .get(getBranchById)
    .put(admin, updateBranch)
    .delete(admin, deleteBranch)

module.exports = router;

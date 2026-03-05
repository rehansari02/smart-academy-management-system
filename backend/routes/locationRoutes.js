const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getStates,
    createState,
    updateState,
    deleteState,
    getCities,
    createCity,
    updateCity,
    deleteCity
} = require('../controllers/locationController');

// --- State Routes ---
router.route('/states')
    .get(getStates) // Public Access (for contact page, online admission, etc.)
    .post(protect, createState); // Protected

router.route('/states/:id')
    .put(protect, updateState) // Protected
    .delete(protect, deleteState); // Protected

// --- City Routes ---
router.route('/cities')
    .get(getCities) // Public Access (for contact page, online admission, etc.)
    .post(protect, createCity); // Protected

router.route('/cities/:id')
    .put(protect, updateCity) // Protected
    .delete(protect, deleteCity); // Protected

module.exports = router;

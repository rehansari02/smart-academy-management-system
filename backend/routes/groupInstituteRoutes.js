const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getPublicGroupInstitutes,
    getAllGroupInstitutes,
    createGroupInstitute,
    updateGroupInstitute,
    deleteGroupInstitute
} = require('../controllers/groupInstituteController');

router.get('/public', getPublicGroupInstitutes);
router.get('/', protect, getAllGroupInstitutes);
router.post('/', protect, createGroupInstitute);
router.put('/:id', protect, updateGroupInstitute);
router.delete('/:id', protect, deleteGroupInstitute);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const documentUpload = require('../middlewares/documentUploadMiddleware');
const { 
    getMaterials, 
    previewMaterial,
    getMaterialPreviewMeta,
    getRawMaterial,
    downloadMaterial,
    createMaterial, 
    updateMaterial, 
    deleteMaterial 
} = require('../controllers/materialController');

router.route('/')
    .get(getMaterials)
    .post(protect, documentUpload.single('document'), createMaterial);

router.get('/preview-meta/:id', getMaterialPreviewMeta);
router.get('/raw/:id', getRawMaterial);
router.get('/preview/:id', previewMaterial);
router.get('/download/:id', downloadMaterial);

router.route('/:id')
    .put(protect, documentUpload.single('document'), updateMaterial)
    .delete(protect, deleteMaterial);

module.exports = router;

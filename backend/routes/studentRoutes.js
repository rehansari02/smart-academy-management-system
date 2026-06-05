const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { 
    getStudents, 
    getStudentById,
    createStudent, 
    updateStudent,
    deleteStudent, 
    toggleStudentStatus,
    confirmStudentRegistration,
    resetStudentLogin,
    cancelStudent,
    reactivateStudent,
    getNextRegNo,
    getExamPendingStudents,
    getUniqueReferences,
    verifyAdmissionStatus,
    checkUsername,
    updateStudentDocuments,
    getCancelledStudents
} = require('../controllers/studentController');

router.route('/exam-pending')
    .get(protect, checkPermission('Student', 'view'), getExamPendingStudents);

router.route('/verify-admission')
    .post(verifyAdmissionStatus);

router.route('/unique-references')
    .get(protect, checkPermission('Student', 'view'), getUniqueReferences);

router.route('/')
    .get(protect, checkPermission('Student', 'view'), getStudents)
    .post(protect, checkPermission('Student', 'add'), upload.single('studentPhoto'), createStudent);

// Check if username is available (MUST be before /:id routes)
router.route('/check-username/:username')
    .get(protect, checkPermission('Student', 'view'), checkUsername);

// Cancelled Students (MUST be before /:id routes)
router.route('/cancelled')
    .get(protect, checkPermission('Student', 'view'), getCancelledStudents);

// Preview Next Registration Number (MUST be before /:id routes)
router.route('/preview-regno')
    .get(protect, checkPermission('Student', 'view'), getNextRegNo);

router.route('/:id')
    .get(protect, checkPermission('Student', 'view'), getStudentById)
    .put(protect, checkPermission('Student', 'edit'), upload.single('studentPhoto'), updateStudent)
    .delete(protect, checkPermission('Student', 'delete'), deleteStudent);

// Registration Confirmation Route
router.route('/:id/confirm-registration')
    .post(protect, checkPermission('Student', 'edit'), confirmStudentRegistration);

router.route('/:id/toggle')
    .put(protect, checkPermission('Student', 'edit'), toggleStudentStatus);

router.route('/:id/reset-login')
    .put(protect, checkPermission('Student', 'edit'), resetStudentLogin);

router.route('/:id/cancel')
    .put(protect, checkPermission('Student', 'edit'), cancelStudent);

router.route('/:id/reactivate')
    .put(protect, checkPermission('Student', 'edit'), reactivateStudent);

router.route('/:id/documents')
    .put(protect, checkPermission('Student', 'edit'), updateStudentDocuments);

module.exports = router;
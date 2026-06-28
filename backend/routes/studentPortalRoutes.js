const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    getDashboardStats, 
    getCourseDetails, 
    submitFeedback,
    getStudyMaterials,
    getFreeLearningQuestions,
    submitFreeLearning,
    getFreeLearningReport,
    getStudentFees,
    getStudentExamSchedules,
    getStudentSyllabus,
    saveStudentSyllabusAck,
    saveStudentSyllabusComment
} = require('../controllers/studentPortalController');

router.get('/dashboard', protect, getDashboardStats);
router.get('/course', protect, getCourseDetails);
router.post('/feedback', protect, submitFeedback);
router.get('/fees', protect, getStudentFees);
router.get('/exam-schedules', protect, getStudentExamSchedules);
router.get('/syllabus', protect, getStudentSyllabus);
router.post('/syllabus/ack', protect, saveStudentSyllabusAck);
router.post('/syllabus/comment', protect, saveStudentSyllabusComment);

// Study Section Routes
router.get('/materials', protect, getStudyMaterials);
router.get('/learning/questions', protect, getFreeLearningQuestions);
router.post('/learning/submit', protect, submitFreeLearning);
router.get('/learning/report', protect, getFreeLearningReport);

module.exports = router;


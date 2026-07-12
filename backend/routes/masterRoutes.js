const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const { 
    getCourses, createCourse, updateCourse, deleteCourse,
    getBatches, createBatch, updateBatch, deleteBatch, 
    createEmployee, getEmployees, getPublicEmployeeReferences,
    getSubjects, createSubject, updateSubject, deleteSubject,
    getReferences, createReference, updateReference, deleteReference,
    getEducations, createEducation,
    getEmployeeRoles, createEmployeeRole, updateEmployeeRole, deleteEmployeeRole,
    getExams, createExam,
    updateExam, deleteExam,
    getPopularCourses, getPublicPopularCourses,
    createPopularCourse, updatePopularCourse, deletePopularCourse,
    getPopularCategories, createPopularCategory, updatePopularCategory, deletePopularCategory
} = require('../controllers/masterController');
const { getExamRequests, getExamRequestBranches, cancelExamRequest, createExamRequest, getPendingExams } = require('../controllers/examController');
const { getExamSchedules, createExamSchedule, updateExamSchedule, deleteExamSchedule, getExamScheduleDetails, getExamScheduleConductSummary, getMyExamSchedules, getExamStudentMarks, getExamStudentMarksDetail, getAbsentExamStudents, createAbsentReExamSchedules } = require('../controllers/examScheduleController');
const { getExamResults, createExamResult, updateExamResult, deleteExamResult, getExamResultById, getNextResultNumbers, getExamAttemptMarksForResult, verifyExamResult } = require('../controllers/examResultController');
const {
    getFinalExamQuestionPapers,
    getFinalExamQuestionPaperById,
    createFinalExamQuestionPaper,
    updateFinalExamQuestionPaper,
    deleteFinalExamQuestionPaper,
    getFinalExamQuestionPaperAccess,
    getFinalExamQuestionPaperAccessMeta,
    setFinalExamQuestionPaperAccess,
    verifyFinalExamQuestionPaperAccess
} = require('../controllers/finalExamQuestionPaperController');
const {
    createQuestion,
    getQuestions,
    updateQuestion,
    deleteQuestion,
    getFreeLearningSubjectsReport,
    getFreeLearningSubjectStudentReport,
    resetFreeLearningStudentProgress
} = require('../controllers/freeLearningController');
const {
    getTeachersBySubject,
    getTeacherSubjectAccess,
    assignTeacherToSubject,
    removeTeacherAssignment,
    getAssignmentsByBatchAndCourse
} = require('../controllers/teacherSubjectController');
const locationRoutes = require('./locationRoutes');

const upload = require('../middlewares/uploadMiddleware');

// --- Course Routes ---
router.route('/course')
    .get(getCourses) // Public Access
    .post(protect, checkPermission('Course', 'add'), upload.single('image'), createCourse);

router.route('/course/:id')
    .put(protect, checkPermission('Course', 'edit'), upload.single('image'), updateCourse)
    .delete(protect, checkPermission('Course', 'delete'), deleteCourse);

// --- Popular Course Routes ---
router.route('/popular-courses')
    .get(getPopularCourses) // Admin access
    .post(protect, checkPermission('Course', 'add'), createPopularCourse);
    
router.route('/popular-courses/public')
    .get(getPublicPopularCourses); // Public access for homepage
    
router.route('/popular-categories')
    .get(getPopularCategories)
    .post(protect, checkPermission('Course', 'add'), createPopularCategory);

router.route('/popular-categories/:id')
    .put(protect, checkPermission('Course', 'edit'), updatePopularCategory)
    .delete(protect, checkPermission('Course', 'delete'), deletePopularCategory);

router.route('/popular-courses/:id')
    .put(protect, checkPermission('Course', 'edit'), updatePopularCourse)
    .delete(protect, checkPermission('Course', 'delete'), deletePopularCourse);

// --- Batch Routes ---
router.route('/batch')
    .get(protect, checkPermission('Batch', 'view'), getBatches)
    .post(protect, checkPermission('Batch', 'add'), createBatch);

router.route('/batch/:id')
    .put(protect, checkPermission('Batch', 'edit'), updateBatch)
    .delete(protect, checkPermission('Batch', 'delete'), deleteBatch);

// --- Subject Routes ---
router.route('/subject')
    .get(getSubjects) // Public/General Access for dropdowns
    .post(protect, checkPermission('Subject', 'add'), createSubject);

router.route('/subject/:id')
    .put(protect, checkPermission('Subject', 'edit'), updateSubject)
    .delete(protect, checkPermission('Subject', 'delete'), deleteSubject);

// --- Employee Routes ---
router.route('/employee/public-references')
    .get(getPublicEmployeeReferences);

router.route('/employee')
    .get(protect, checkPermission('Employee', 'view'), getEmployees)
    .post(protect, checkPermission('Employee', 'add'), createEmployee);

// --- Reference Routes ---
router.route('/reference')
    .get(getReferences) // Public Access
    .post(protect, createReference);

router.route('/reference/:id')
    .put(protect, checkPermission('External Reference', 'edit'), updateReference)
    .delete(protect, checkPermission('External Reference', 'delete'), deleteReference);

// --- Education Routes ---
router.route('/education')
    .get(getEducations) // Public Access
    .post(protect, createEducation);

// --- Employee Role Routes ---
router.route('/employee-role')
    .get(protect, getEmployeeRoles)
    .post(protect, checkPermission('Employee', 'add'), createEmployeeRole);

router.route('/employee-role/:id')
    .put(protect, checkPermission('Employee', 'edit'), updateEmployeeRole)
    .delete(protect, checkPermission('Employee', 'delete'), deleteEmployeeRole);

// --- Exam Name Routes ---
router.route('/exam-name')
    .get(protect, getExams)
    .post(protect, createExam);

router.route('/exam-name/:id')
    .put(protect, updateExam)
    .delete(protect, deleteExam);
    
// --- Exam Request Routes ---
router.route('/exam-request')
    .get(protect, getExamRequests)
    .post(protect, createExamRequest);

router.get('/exam-request-branches', protect, getExamRequestBranches);
router.put('/exam-request/:id/cancel', protect, cancelExamRequest);
router.get('/exam-pending', protect, getPendingExams);

// --- Exam Schedule Routes ---
router.route('/exam-schedule')
    .get(protect, getExamSchedules)
    .post(protect, createExamSchedule);

router.get('/exam-schedule/absent-students', protect, getAbsentExamStudents);
router.post('/exam-schedule/absent-reexam', protect, createAbsentReExamSchedules);

router.route('/exam-schedule/:id')
    .put(protect, updateExamSchedule)
    .delete(protect, deleteExamSchedule);

router.get('/exam-schedule/:id/details', protect, getExamScheduleDetails);
router.get('/exam-schedule/:id/conduct', protect, getExamScheduleConductSummary);
router.get('/exam-schedule/my', protect, getMyExamSchedules);
router.get('/exam-student-marks', protect, getExamStudentMarks);
router.get('/exam-student-marks/:attemptId', protect, getExamStudentMarksDetail);

// --- Final Exam Question Paper Routes ---
router.route('/final-exam-question-paper')
    .get(protect, checkPermission('Final Exam Question Paper', 'view'), getFinalExamQuestionPapers)
    .post(protect, checkPermission('Final Exam Question Paper', 'add'), createFinalExamQuestionPaper);

router.route('/final-exam-question-paper/access')
    .get(protect, getFinalExamQuestionPaperAccess)
    .put(protect, setFinalExamQuestionPaperAccess);

router.get('/final-exam-question-paper/access/meta', protect, getFinalExamQuestionPaperAccessMeta);

router.post('/final-exam-question-paper/access/verify', protect, verifyFinalExamQuestionPaperAccess);

router.route('/final-exam-question-paper/:id')
    .get(protect, checkPermission('Final Exam Question Paper', 'view'), getFinalExamQuestionPaperById)
    .put(protect, checkPermission('Final Exam Question Paper', 'edit'), updateFinalExamQuestionPaper)
    .delete(protect, checkPermission('Final Exam Question Paper', 'delete'), deleteFinalExamQuestionPaper);

// --- Exam Results ---
router.post('/exam-result/verify', verifyExamResult); // Public Access
router.get('/exam-result/next-numbers', protect, getNextResultNumbers);
router.get('/exam-result/attempt-marks', protect, getExamAttemptMarksForResult);
router.route('/exam-result')
    .get(protect, getExamResults) 
    .post(protect, createExamResult); 

router.route('/exam-result/:id')
    .get(protect, getExamResultById)
    .put(protect, updateExamResult)
    .delete(protect, deleteExamResult);

// --- Free Learning Routes ---
router.route('/free-learning')
    .get(protect, getQuestions)
    .post(protect, createQuestion);

router.route('/free-learning/:id')
    .put(protect, updateQuestion)
    .delete(protect, deleteQuestion);

router.get('/free-learning-report/subjects', protect, getFreeLearningSubjectsReport);
router.get('/free-learning-report/subjects/:subjectId', protect, getFreeLearningSubjectStudentReport);
router.delete('/free-learning-report/subjects/:subjectId/students/:studentId', protect, resetFreeLearningStudentProgress);

// --- Teacher Subject Access Routes ---
router.get('/teacher-subject/subject/:subjectId', protect, checkPermission('Teacher Subject Management', 'view'), getTeachersBySubject);
router.get('/teacher-subject/employee/me', protect, getTeacherSubjectAccess);
router.get('/teacher-subject/employee/:employeeId', protect, checkPermission('Teacher Subject Management', 'view'), getTeacherSubjectAccess);
router.get('/teacher-subject/batch/:batchId/course/:courseId', protect, checkPermission('Teacher Subject Management', 'view'), getAssignmentsByBatchAndCourse);
router.post('/teacher-subject/assign', protect, checkPermission('Teacher Subject Management', 'add'), assignTeacherToSubject);
router.delete('/teacher-subject/remove', protect, checkPermission('Teacher Subject Management', 'delete'), removeTeacherAssignment);

// --- Location Routes ---
router.use('/location', locationRoutes);

module.exports = router;


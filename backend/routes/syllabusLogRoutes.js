const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createSyllabusLog,
  getLogsForStudentSubject,
  getLogsForSubjectBatch,
  updateSyllabusLog,
  deleteSyllabusLog,
} = require('../controllers/syllabusLogController');

// POST   /api/syllabus-logs              → create a new log entry
router.post('/', protect, createSyllabusLog);

// GET    /api/syllabus-logs/student/:studentId/subject/:subjectId  → per-student logs + analytics
router.get('/student/:studentId/subject/:subjectId', protect, getLogsForStudentSubject);

// GET    /api/syllabus-logs/subject/:subjectId/batch/:batchId  → batch-level summaries
router.get('/subject/:subjectId/batch/:batchId', protect, getLogsForSubjectBatch);

// PUT    /api/syllabus-logs/:id          → update a log entry
router.put('/:id', protect, updateSyllabusLog);

// DELETE /api/syllabus-logs/:id          → soft-delete a log entry
router.delete('/:id', protect, deleteSyllabusLog);

module.exports = router;

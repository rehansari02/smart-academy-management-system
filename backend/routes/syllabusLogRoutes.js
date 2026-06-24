const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createSyllabusLog,
  getLogsForStudentSubject,
  getLogsForSubjectBatch,
  updateSyllabusLog,
  deleteSyllabusLog,
  startChapter,
  completeChapter,
  completeProjects,
  getChapterStatus,
  getActivityLog,
  stopChapter,
  undoProject,
  undoCompleteChapter,
  finalCompleteChapter,
  getChangeRequests,
  approveChangeRequest,
  requestIncompleteChapter,
} = require('../controllers/syllabusLogController');

// POST   /api/syllabus-logs              → create a new log entry
router.post('/', protect, createSyllabusLog);

// POST   /api/syllabus-logs/chapter/start  → start a chapter
router.post('/chapter/start', protect, startChapter);

// POST   /api/syllabus-logs/chapter/complete  → complete a chapter
router.post('/chapter/complete', protect, completeChapter);

// POST   /api/syllabus-logs/project/complete  → complete projects
router.post('/project/complete', protect, completeProjects);

// GET    /api/syllabus-logs/activity  → activity log for super admin
router.get('/activity', protect, getActivityLog);

// GET    /api/syllabus-logs/student/:studentId/subject/:subjectId  → per-student logs + analytics
router.get('/student/:studentId/subject/:subjectId', protect, getLogsForStudentSubject);

// GET    /api/syllabus-logs/student/:studentId/subject/:subjectId/status  → chapter statuses
router.get('/student/:studentId/subject/:subjectId/status', protect, getChapterStatus);

// GET    /api/syllabus-logs/subject/:subjectId/batch/:batchId  → batch-level summaries
router.get('/subject/:subjectId/batch/:batchId', protect, getLogsForSubjectBatch);

// PUT    /api/syllabus-logs/:id          → update a log entry
router.put('/:id', protect, updateSyllabusLog);

// DELETE /api/syllabus-logs/:id          → soft-delete a log entry
router.delete('/:id', protect, deleteSyllabusLog);


// POST   /api/syllabus-logs/chapter/stop  → stop/reset a running chapter
router.post('/chapter/stop', protect, stopChapter);

// POST   /api/syllabus-logs/project/undo  → undo a project completion
router.post('/project/undo', protect, undoProject);

// POST   /api/syllabus-logs/chapter/undo-complete  → undo theory completion
router.post('/chapter/undo-complete', protect, undoCompleteChapter);

// POST   /api/syllabus-logs/chapter/final-complete  → final complete with reason
router.post('/chapter/final-complete', protect, finalCompleteChapter);

// POST   /api/syllabus-logs/chapter/incomplete  → request to modify a locked chapter
router.post('/chapter/incomplete', protect, requestIncompleteChapter);

// GET    /api/syllabus-logs/change-requests  → list change requests (super admin)
router.get('/change-requests', protect, getChangeRequests);

// POST   /api/syllabus-logs/change-requests/:id/approve  → approve/reject (super admin)
router.post('/change-requests/:id/approve', protect, approveChangeRequest);

module.exports = router;

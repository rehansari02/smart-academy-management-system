const fs = require('fs');

// ── Update Controller ─────────────────────────────────────────────
const ctrlPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/backend/controllers/syllabusLogController.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf-8');

// Add ChapterChangeRequest require after the existing requires
const newRequire = "const ChapterChangeRequest = require('../models/ChapterChangeRequest');\n";
ctrl = ctrl.replace("const Subject = require('../models/Subject');\n", "const Subject = require('../models/Subject');\n" + newRequire);

// Add new controller functions before the module.exports
const newFunctions = `
// ─────────────────────────────────────────────────────────────────────────────
// @desc  Stop/Reset a running chapter (set back to Not Started)
// @route POST /api/syllabus-logs/chapter/stop
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const stopChapter = asyncHandler(async (req, res) => {
  const { studentId, subjectId, chapterId, reason } = req.body;

  if (!studentId || !subjectId || !chapterId) {
    res.status(400);
    throw new Error('studentId, subjectId, and chapterId are required.');
  }

  const loggedByName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? \`\${req.user.firstName} \${req.user.lastName || ''}\`.trim()
      : '') ||
    'System';

  // Reset all logs for this chapter - remove chapterStatus
  await SyllabusLog.updateMany(
    { studentId, subjectId, chapterId, isDeleted: false },
    { chapterStatus: 'Running' }
  );

  // Create a log entry for the stop action
  await SyllabusLog.create({
    studentId,
    subjectId,
    batchId: req.body.batchId,
    courseId: req.body.courseId,
    branchId: req.body.branchId,
    sessionDate: new Date(),
    chapterId,
    chapterName: req.body.chapterName || '',
    projects: [],
    notes: reason ? \`Chapter stopped/reset: \${reason}\` : 'Chapter stopped/reset',
    chapterStatus: 'Running',
    loggedBy: req.user?.employeeId || req.user?._id || null,
    loggedByName,
  });

  res.json({ message: 'Chapter reset to Not Started.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Undo a single project completion (soft-deletes the log containing it)
// @route POST /api/syllabus-logs/project/undo
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const undoProject = asyncHandler(async (req, res) => {
  const { studentId, subjectId, chapterId, projectId } = req.body;

  if (!studentId || !subjectId || !chapterId || !projectId) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and projectId are required.');
  }

  // Find the most recent log that has this project and soft-delete it
  const log = await SyllabusLog.findOne({
    studentId,
    subjectId,
    chapterId,
    'projects.projectId': projectId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!log) {
    res.status(404);
    throw new Error('No project completion log found to undo.');
  }

  // Remove the specific project from the array
  log.projects = log.projects.filter(p => String(p.projectId) !== String(projectId));
  
  // If no projects left and notes mention project completion, soft-delete the whole log
  if (log.projects.length === 0 && log.notes === 'Projects completed') {
    log.isDeleted = true;
  }
  
  await log.save();

  res.json({ message: 'Project undone successfully.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Undo "All Theory Completed" — reset chapter back to Running
// @route POST /api/syllabus-logs/chapter/undo-complete
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const undoCompleteChapter = asyncHandler(async (req, res) => {
  const { studentId, subjectId, chapterId } = req.body;

  if (!studentId || !subjectId || !chapterId) {
    res.status(400);
    throw new Error('studentId, subjectId, and chapterId are required.');
  }

  // Find and soft-delete the "All theory completed" log
  const completedLog = await SyllabusLog.findOne({
    studentId,
    subjectId,
    chapterId,
    notes: 'All theory completed',
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (completedLog) {
    completedLog.isDeleted = true;
    await completedLog.save();
  }

  // Reset all logs for this chapter to Running
  await SyllabusLog.updateMany(
    { studentId, subjectId, chapterId, isDeleted: false },
    { chapterStatus: 'Running' }
  );

  res.json({ message: 'Chapter theory completion undone.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Final complete a chapter — theory + all projects done, asks for reason
//        Creates a change request for super admin approval
// @route POST /api/syllabus-logs/chapter/final-complete
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const finalCompleteChapter = asyncHandler(async (req, res) => {
  const {
    studentId, subjectId, batchId, courseId, branchId,
    chapterId, chapterName, reason,
  } = req.body;

  if (!studentId || !subjectId || !chapterId || !reason) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and reason are required.');
  }

  const loggedByName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? \`\${req.user.firstName} \${req.user.lastName || ''}\`.trim()
      : '') ||
    'System';

  const requestedBy = req.user?.employeeId || req.user?._id || null;

  // Create a change request for super admin
  const changeRequest = await ChapterChangeRequest.create({
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    chapterId,
    chapterName: chapterName || '',
    type: 'final_complete',
    reason,
    requestedBy,
    requestedByName: loggedByName,
    status: 'pending',
  });

  res.status(201).json({
    message: 'Final completion request sent to Super Admin for approval.',
    changeRequest,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get all pending/approved change requests for super admin
// @route GET /api/syllabus-logs/change-requests
// @access Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getChangeRequests = asyncHandler(async (req, res) => {
  const { status, subjectId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (subjectId) filter.subjectId = subjectId;

  const requests = await ChapterChangeRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ requests });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Approve or reject a change request (Super Admin)
// @route POST /api/syllabus-logs/change-requests/:id/approve
// @access Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const approveChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reviewNotes } = req.body; // action: 'approved' | 'rejected'

  if (!action || !['approved', 'rejected'].includes(action)) {
    res.status(400);
    throw new Error('action must be "approved" or "rejected".');
  }

  const request = await ChapterChangeRequest.findById(id);
  if (!request) {
    res.status(404);
    throw new Error('Change request not found.');
  }

  const reviewerName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? \`\${req.user.firstName} \${req.user.lastName || ''}\`.trim()
      : '') ||
    'Super Admin';

  request.status = action;
  request.reviewedBy = reviewerName;
  request.reviewedAt = new Date();
  if (reviewNotes) request.reviewNotes = reviewNotes;
  await request.save();

  // If approved, mark the chapter as fully completed
  if (action === 'approved') {
    const loggedByName =
      req.user?.name ||
      req.user?.fullName ||
      (req.user?.firstName
        ? \`\${req.user.firstName} \${req.user.lastName || ''}\`.trim()
        : '') ||
      'System';

    await SyllabusLog.create({
      studentId: request.studentId,
      subjectId: request.subjectId,
      batchId: request.batchId,
      courseId: request.courseId,
      branchId: request.branchId,
      sessionDate: new Date(),
      chapterId: request.chapterId,
      chapterName: request.chapterName,
      projects: [],
      notes: \`Final chapter completed. Reason: \${request.reason}\`,
      chapterStatus: 'Completed',
      loggedBy: req.user?.employeeId || req.user?._id || null,
      loggedByName,
    });

    await SyllabusLog.updateMany(
      {
        studentId: request.studentId,
        subjectId: request.subjectId,
        chapterId: request.chapterId,
        isDeleted: false,
      },
      { chapterStatus: 'Completed' }
    );
  }

  res.json({ message: \`Change request \${action}.\`, request });
});

`;

// Add new functions before module.exports
ctrl = ctrl.replace('module.exports = {', newFunctions + '\nmodule.exports = {');

// Add new exports to module.exports
ctrl = ctrl.replace(
  'module.exports = {',
  `module.exports = {
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
  approveChangeRequest,`
);

fs.writeFileSync(ctrlPath, ctrl, 'utf-8');
console.log('Controller updated!');

// ── Update Routes ────────────────────────────────────────────────
const routesPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/backend/routes/syllabusLogRoutes.js';
let routes = fs.readFileSync(routesPath, 'utf-8');

// Add new imports
const newImports = `  stopChapter,
  undoProject,
  undoCompleteChapter,
  finalCompleteChapter,
  getChangeRequests,
  approveChangeRequest,`;
routes = routes.replace(
  '} = require(\'../controllers/syllabusLogController\');',
  newImports + '\n} = require(\'../controllers/syllabusLogController\');'
);

// Add new routes before the module.exports
const newRoutes = `
// POST   /api/syllabus-logs/chapter/stop  → stop/reset a running chapter
router.post('/chapter/stop', protect, stopChapter);

// POST   /api/syllabus-logs/project/undo  → undo a project completion
router.post('/project/undo', protect, undoProject);

// POST   /api/syllabus-logs/chapter/undo-complete  → undo theory completion
router.post('/chapter/undo-complete', protect, undoCompleteChapter);

// POST   /api/syllabus-logs/chapter/final-complete  → final complete with reason
router.post('/chapter/final-complete', protect, finalCompleteChapter);

// GET    /api/syllabus-logs/change-requests  → list change requests (super admin)
router.get('/change-requests', protect, getChangeRequests);

// POST   /api/syllabus-logs/change-requests/:id/approve  → approve/reject (super admin)
router.post('/change-requests/:id/approve', protect, approveChangeRequest);
`;

routes = routes.replace('module.exports = router;', newRoutes + '\nmodule.exports = router;');

fs.writeFileSync(routesPath, routes, 'utf-8');
console.log('Routes updated!');

const asyncHandler = require('express-async-handler');
const SyllabusLog = require('../models/SyllabusLog');
const Subject = require('../models/Subject');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: count working days between two dates (exclude Sundays)
// ─────────────────────────────────────────────────────────────────────────────
const countWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    if (cur.getDay() !== 0) count++; // skip Sundays
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Create a new syllabus log entry
// @route POST /api/syllabus-logs
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const createSyllabusLog = asyncHandler(async (req, res) => {
  const {
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    sessionDate,
    chapterId,
    chapterName,
    projects,
    notes,
  } = req.body;

  if (!studentId || !subjectId || !batchId || !courseId || !branchId || !sessionDate) {
    res.status(400);
    throw new Error('studentId, subjectId, batchId, courseId, branchId, and sessionDate are required.');
  }

  // Resolve teacher name from the logged-in user (employee or admin)
  const loggedBy = req.user?.employeeId || req.user?._id || null;
  const loggedByName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : '') ||
    'System';

  const log = await SyllabusLog.create({
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    sessionDate: new Date(sessionDate),
    chapterId: chapterId || null,
    chapterName: chapterName || '',
    projects: Array.isArray(projects) ? projects : [],
    notes: notes || '',
    loggedBy,
    loggedByName,
  });

  res.status(201).json(log);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get all logs for a specific student + subject combination
//        Includes computed analytics
// @route GET /api/syllabus-logs/student/:studentId/subject/:subjectId
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getLogsForStudentSubject = asyncHandler(async (req, res) => {
  const { studentId, subjectId } = req.params;

  const logs = await SyllabusLog.find({
    studentId,
    subjectId,
    isDeleted: false,
  }).sort({ sessionDate: 1, createdAt: 1 });

  // Fetch subject for analytics
  const subject = await Subject.findById(subjectId).lean();

  // ── Compute analytics ──────────────────────────────────────────
  let analytics = {
    totalLogs: logs.length,
    daysToComplete: subject?.daysToComplete || 0,
    totalChapters: (subject?.chapters || []).length,
    totalProjects: (subject?.projects || []).length,
    chaptersLogged: 0,
    projectsLogged: 0,
    projectsPending: 0,
    firstSessionDate: null,
    lastSessionDate: null,
    elapsedDays: 0,
    completedChapterIds: [],
    completedProjectIds: [],
  };

  if (logs.length > 0) {
    analytics.firstSessionDate = logs[0].sessionDate;
    analytics.lastSessionDate = logs[logs.length - 1].sessionDate;
    analytics.elapsedDays = countWorkingDays(
      analytics.firstSessionDate,
      new Date()
    );

    // Unique chapter IDs covered
    const chapterIdSet = new Set();
    logs.forEach(l => {
      if (l.chapterId) chapterIdSet.add(l.chapterId.toString());
    });
    analytics.completedChapterIds = [...chapterIdSet];
    analytics.chaptersLogged = chapterIdSet.size;

    // Unique project IDs covered
    const projectIdSet = new Set();
    logs.forEach(l => {
      (l.projects || []).forEach(p => {
        if (p.projectId) projectIdSet.add(p.projectId.toString());
      });
    });
    analytics.completedProjectIds = [...projectIdSet];
    analytics.projectsLogged = projectIdSet.size;
    analytics.projectsPending = Math.max(
      0,
      analytics.totalProjects - analytics.projectsLogged
    );
  }

  res.json({ logs, analytics, subject });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get summary logs for ALL students in a batch+course+subject
//        Used to show per-student progress in the student list table
// @route GET /api/syllabus-logs/subject/:subjectId/batch/:batchId
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getLogsForSubjectBatch = asyncHandler(async (req, res) => {
  const { subjectId, batchId } = req.params;

  const logs = await SyllabusLog.find({
    subjectId,
    batchId,
    isDeleted: false,
  }).sort({ sessionDate: 1 });

  // Group by studentId
  const grouped = {};
  logs.forEach(l => {
    const sid = l.studentId.toString();
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(l);
  });

  const subject = await Subject.findById(subjectId).lean();
  const totalProjects = (subject?.projects || []).length;
  const totalChapters = (subject?.chapters || []).length;

  // Build per-student summary
  const summaries = Object.entries(grouped).map(([sid, sLogs]) => {
    const chapterIdSet = new Set();
    const projectIdSet = new Set();
    sLogs.forEach(l => {
      if (l.chapterId) chapterIdSet.add(l.chapterId.toString());
      (l.projects || []).forEach(p => {
        if (p.projectId) projectIdSet.add(p.projectId.toString());
      });
    });

    const firstSession = sLogs[0].sessionDate;
    const lastSession = sLogs[sLogs.length - 1].sessionDate;
    const elapsedDays = countWorkingDays(firstSession, new Date());

    return {
      studentId: sid,
      totalLogs: sLogs.length,
      chaptersLogged: chapterIdSet.size,
      totalChapters,
      projectsLogged: projectIdSet.size,
      projectsPending: Math.max(0, totalProjects - projectIdSet.size),
      totalProjects,
      firstSessionDate: firstSession,
      lastSessionDate: lastSession,
      elapsedDays,
      daysToComplete: subject?.daysToComplete || 0,
    };
  });

  res.json({ summaries });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Update a log entry (notes, chapter, projects, sessionDate)
// @route PUT /api/syllabus-logs/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const updateSyllabusLog = asyncHandler(async (req, res) => {
  const log = await SyllabusLog.findById(req.params.id);
  if (!log || log.isDeleted) {
    res.status(404);
    throw new Error('Log not found.');
  }

  const { sessionDate, chapterId, chapterName, projects, notes } = req.body;

  if (sessionDate !== undefined) log.sessionDate = new Date(sessionDate);
  if (chapterId !== undefined) log.chapterId = chapterId || null;
  if (chapterName !== undefined) log.chapterName = chapterName || '';
  if (projects !== undefined) log.projects = Array.isArray(projects) ? projects : [];
  if (notes !== undefined) log.notes = notes || '';

  const updated = await log.save();
  res.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Soft-delete a log entry
// @route DELETE /api/syllabus-logs/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const deleteSyllabusLog = asyncHandler(async (req, res) => {
  const log = await SyllabusLog.findById(req.params.id);
  if (!log || log.isDeleted) {
    res.status(404);
    throw new Error('Log not found.');
  }

  log.isDeleted = true;
  await log.save();

  res.json({ message: 'Log deleted successfully.' });
});

module.exports = {
  createSyllabusLog,
  getLogsForStudentSubject,
  getLogsForSubjectBatch,
  updateSyllabusLog,
  deleteSyllabusLog,
};

const asyncHandler = require('express-async-handler');
const SyllabusLog = require('../models/SyllabusLog');
const Subject = require('../models/Subject');
const ChapterChangeRequest = require('../models/ChapterChangeRequest');

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
    chapterStatus,
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
    chapterStatus: chapterStatus || 'Running',
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
      if (l.chapterId && l.chapterStatus !== 'Running') chapterIdSet.add(l.chapterId.toString());
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
      if (l.chapterId && l.chapterStatus !== 'Running') chapterIdSet.add(l.chapterId.toString());
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
      completedChapterIds: [...chapterIdSet],
      completedProjectIds: [...projectIdSet],
    };
  });

  res.json({ summaries, logs });
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

  const { sessionDate, chapterId, chapterName, projects, notes, chapterStatus } = req.body;

  if (sessionDate !== undefined) log.sessionDate = new Date(sessionDate);
  if (chapterId !== undefined) log.chapterId = chapterId || null;
  if (chapterName !== undefined) log.chapterName = chapterName || '';
  if (projects !== undefined) log.projects = Array.isArray(projects) ? projects : [];
  if (notes !== undefined) log.notes = notes || '';
  if (chapterStatus !== undefined) log.chapterStatus = chapterStatus || 'Running';

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

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Start a chapter (creates a log marking chapter as started)
// @route POST /api/syllabus-logs/chapter/start
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const startChapter = asyncHandler(async (req, res) => {
  const {
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    chapterId,
    chapterName,
    sessionDate,
  } = req.body;

  if (!studentId || !subjectId || !batchId || !courseId || !branchId || !chapterId) {
    res.status(400);
    throw new Error('studentId, subjectId, batchId, courseId, branchId, and chapterId are required.');
  }

  const loggedBy = req.user?.employeeId || req.user?._id || null;
  const loggedByName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : '') ||
    'System';

  // Check if chapter already started
  const existing = await SyllabusLog.findOne({
    studentId,
    subjectId,
    chapterId,
    isDeleted: false,
  });

  if (existing) {
    // Chapter already has logs, just add a new session log
    const log = await SyllabusLog.create({
      studentId,
      subjectId,
      batchId,
      courseId,
      branchId,
      sessionDate: new Date(sessionDate || Date.now()),
      chapterId,
      chapterName: chapterName || '',
      projects: [],
      notes: 'Chapter session started',
      chapterStatus: existing.chapterStatus || 'Running',
      loggedBy,
      loggedByName,
    });
    return res.status(201).json(log);
  }

  // First time starting this chapter
  const log = await SyllabusLog.create({
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    sessionDate: new Date(sessionDate || Date.now()),
    chapterId,
    chapterName: chapterName || '',
    projects: [],
    notes: 'Chapter started',
    chapterStatus: 'Running',
    loggedBy,
    loggedByName,
  });

  res.status(201).json(log);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Complete a chapter (marks chapter as Completed)
// @route POST /api/syllabus-logs/chapter/complete
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const completeChapter = asyncHandler(async (req, res) => {
  const {
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    chapterId,
    chapterName,
  } = req.body;

  if (!studentId || !subjectId || !chapterId) {
    res.status(400);
    throw new Error('studentId, subjectId, and chapterId are required.');
  }

  const loggedBy = req.user?.employeeId || req.user?._id || null;
  const loggedByName =
    req.user?.name ||
    req.user?.fullName ||
    (req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : '') ||
    'System';

  // Create a completion log entry
  const log = await SyllabusLog.create({
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    sessionDate: new Date(),
    chapterId,
    chapterName: chapterName || '',
    projects: [],
    notes: 'All theory completed',
    chapterStatus: 'Completed',
    loggedBy,
    loggedByName,
  });

  // Also update all existing logs for this chapter to Completed
  await SyllabusLog.updateMany(
    {
      studentId,
      subjectId,
      chapterId,
      isDeleted: false,
    },
    { chapterStatus: 'Completed' }
  );

  res.status(201).json({ message: 'Chapter completed successfully', log });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Complete projects for a chapter on a specific date
// @route POST /api/syllabus-logs/project/complete
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const completeProjects = asyncHandler(async (req, res) => {
  const {
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    chapterId,
    chapterName,
    projects,
    sessionDate,
  } = req.body;

  if (!studentId || !subjectId || !chapterId || !projects || projects.length === 0) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and projects are required.');
  }

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
    sessionDate: new Date(sessionDate || Date.now()),
    chapterId,
    chapterName: chapterName || '',
    projects: Array.isArray(projects) ? projects : [],
    notes: 'Projects completed',
    chapterStatus: 'Running',
    loggedBy,
    loggedByName,
  });

  res.status(201).json(log);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get chapter status for a student+subject
// @route GET /api/syllabus-logs/student/:studentId/subject/:subjectId/status
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getChapterStatus = asyncHandler(async (req, res) => {
  const { studentId, subjectId } = req.params;

  const logs = await SyllabusLog.find({
    studentId,
    subjectId,
    isDeleted: false,
  }).sort({ sessionDate: -1 });

  const subject = await Subject.findById(subjectId).lean();
  const chapters = subject?.chapters || [];

  // Fetch pending change requests for this student+subject
  const pendingRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    status: 'pending',
  }).lean();
  const pendingChapterIds = new Set(pendingRequests.map(r => r.chapterId.toString()));

  // Build chapter status map
  const chapterStatusMap = {};
  const chapterProjectMap = {};
  const chapterActivityMap = {};

  logs.forEach(log => {
    const cid = log.chapterId ? log.chapterId.toString() : null;
    if (!cid) return;

    // Track latest chapter status
    if (!chapterStatusMap[cid] || log.chapterStatus === 'Completed') {
      chapterStatusMap[cid] = {
        status: log.chapterStatus || null,
        startedAt: chapterStatusMap[cid]?.startedAt || log.sessionDate,
        completedAt: log.chapterStatus === 'Completed' ? log.sessionDate : null,
        startedBy: chapterStatusMap[cid]?.startedBy || log.loggedByName,
        completedBy: log.chapterStatus === 'Completed' ? log.loggedByName : null,
      };
    }

    if (!chapterStatusMap[cid]) {
      chapterStatusMap[cid] = {
        status: null,
        startedAt: log.sessionDate,
        completedAt: null,
        startedBy: log.loggedByName,
        completedBy: null,
      };
    }

    // Track completed projects for this chapter
    (log.projects || []).forEach(p => {
      if (p.projectId) {
        const pid = p.projectId.toString();
        if (!chapterProjectMap[cid]) chapterProjectMap[cid] = {};
        chapterProjectMap[cid][pid] = {
          ...p,
          completedAt: log.sessionDate,
          completedBy: log.loggedByName,
        };
      }
    });

    // Track activity
    if (!chapterActivityMap[cid]) chapterActivityMap[cid] = [];
    if (log.notes && log.notes !== 'Chapter session started') {
      chapterActivityMap[cid].push({
        date: log.sessionDate,
        action: log.notes,
        by: log.loggedByName,
        projects: log.projects,
      });
    }
  });

  
  // Check if chapters have been final-approved (locked)
  const approvedFinalRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    type: 'final_complete',
    status: 'approved',
  }).lean();
  const lockedChapterIds = new Set(approvedFinalRequests.map(r => r.chapterId.toString()));

  // Build response for each chapterpter
  const chapterStatuses = chapters.map(ch => {
    const cid = ch._id ? ch._id.toString() : null;
    const status = cid ? chapterStatusMap[cid] : null;
    const completedProjects = cid ? chapterProjectMap[cid] || {} : {};
    const activity = cid ? chapterActivityMap[cid] || [] : [];

    const chapterProjects = (subject?.projects || []).filter(
      p => String(p.chapterId) === cid
    );

    return {
      chapter: ch,
      status: status?.status || null,
      startedAt: status?.startedAt || null,
      completedAt: status?.completedAt || null,
      startedBy: status?.startedBy || null,
      completedBy: status?.completedBy || null,
      projects: chapterProjects.map(p => ({
        ...p,
        completed: completedProjects[String(p._id)] ? true : false,
        completedAt: completedProjects[String(p._id)]?.completedAt || null,
        completedBy: completedProjects[String(p._id)]?.completedBy || null,
      })),
      activity,
      changeRequestPending: cid ? pendingChapterIds.has(cid) : false,
      isLocked: cid ? lockedChapterIds.has(cid) : false,
    };
  });

  res.json({ chapterStatuses });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get activity log for super admin
// @route GET /api/syllabus-logs/activity
// @access Private (Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getActivityLog = asyncHandler(async (req, res) => {
  const { subjectId, batchId, days } = req.query;
  
  const filter = { isDeleted: false };
  if (subjectId) filter.subjectId = subjectId;
  if (batchId) filter.batchId = batchId;

  // Default to last 30 days
  const daysBack = Number(days) || 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);
  filter.createdAt = { $gte: sinceDate };

  const logs = await SyllabusLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const activities = logs.map(log => ({
    date: log.sessionDate,
    createdAt: log.createdAt,
    teacherName: log.loggedByName || 'Unknown',
    teacherId: log.loggedBy,
    action: log.notes || 'Session logged',
    chapterName: log.chapterName || '',
    chapterStatus: log.chapterStatus || '',
    projectsCount: (log.projects || []).length,
    projectNames: (log.projects || []).map(p => p.projectName).filter(Boolean),
  }));

  res.json({ activities, total: activities.length });
});


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
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : '') ||
    'System';

  // Reset all logs for this chapter - clear chapterStatus so it can be started again
  await SyllabusLog.updateMany(
    { studentId, subjectId, chapterId, isDeleted: false },
    { $unset: { chapterStatus: '' } }
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
    notes: reason ? `Chapter stopped/reset: ${reason}` : 'Chapter stopped/reset',
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
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
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
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : '') ||
    'Super Admin';

  // ⚠️ Process action LOGIC FIRST before saving status.
  // If the logic fails, the request stays 'pending' so teacher can retry.
  if (action === 'approved' && request.type === 'final_complete') {
    const loggedByName =
      req.user?.name ||
      req.user?.fullName ||
      (req.user?.firstName
        ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
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
      notes: `Final chapter completed. Reason: ${request.reason}`,
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

  // If modification request approved, remove the lock (delete approved final_complete requests)
  if (action === 'approved' && request.type === 'modification') {
    await ChapterChangeRequest.deleteMany({
      studentId: request.studentId,
      subjectId: request.subjectId,
      chapterId: request.chapterId,
      type: 'final_complete',
      status: 'approved',
    });
    // Update all logs for this chapter back to Running
    await SyllabusLog.updateMany(
      {
        studentId: request.studentId,
        subjectId: request.subjectId,
        chapterId: request.chapterId,
        isDeleted: false,
      },
      { chapterStatus: 'Running' }
    );
  }

  // ✅ Now save the request status only after logic succeeds
  request.status = action;
  request.reviewedBy = reviewerName;
  request.reviewedAt = new Date();
  if (reviewNotes) request.reviewNotes = reviewNotes;
  await request.save();

  res.json({ message: `Change request ${action}.`, request });
});



// ─────────────────────────────────────────────────────────────────────────────
// @desc  Request to make a locked chapter incomplete (modification request)
// @route POST /api/syllabus-logs/chapter/incomplete
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const requestIncompleteChapter = asyncHandler(async (req, res) => {
  const {
    studentId, subjectId, batchId, courseId, branchId,
    chapterId, chapterName, reason,
  } = req.body;

  if (!studentId || !subjectId || !chapterId || !reason) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and reason are required.');
  }

  const loggedByName =
    req.user?.name || req.user?.fullName ||
    (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : '') || 'System';
  const requestedBy = req.user?.employeeId || req.user?._id || null;

  const changeRequest = await ChapterChangeRequest.create({
    studentId, subjectId, batchId, courseId, branchId,
    chapterId, chapterName: chapterName || '',
    type: 'modification',
    reason,
    requestedBy, requestedByName: loggedByName,
    status: 'pending',
  });

  res.status(201).json({ message: 'Modification request sent to Super Admin.', changeRequest });
});

module.exports = {
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
};
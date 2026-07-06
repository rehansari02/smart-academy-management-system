const asyncHandler = require('express-async-handler');
const SyllabusLog = require('../models/SyllabusLog');
const Subject = require('../models/Subject');
const ChapterChangeRequest = require('../models/ChapterChangeRequest');
const StudentSyllabusResponse = require('../models/StudentSyllabusResponse');

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
const countCalendarDaysInclusive = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
};

const getLoggedBy = (req) => req.user?.employeeId || req.user?._id || null;

const getLoggedByName = (req, fallback = 'System') =>
  req.user?.name ||
  req.user?.fullName ||
  (req.user?.firstName
    ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
    : '') ||
  fallback;

const buildStudentSubjectSummary = (logs = [], subject = {}) => {
  const totalProjects = (subject?.projects || []).length;
  const totalChapters = (subject?.chapters || []).length;
  const targetDays = Number(subject?.daysToComplete || 0);

  const chapterStateMap = {};
  const projectIdSet = new Set();
  let latestLog = null;

  logs.forEach(log => {
    if (!latestLog || new Date(log.sessionDate).getTime() > new Date(latestLog.sessionDate).getTime()) {
      latestLog = log;
    }

    const cid = log.chapterId ? log.chapterId.toString() : null;
    if (cid) {
      if (!chapterStateMap[cid]) {
        chapterStateMap[cid] = {
          status: null,
          startedAt: null,
          stoppedAt: null,
          completedAt: null,
          startedBy: null,
          stoppedBy: null,
          completedBy: null,
          stopReason: '',
          firstActivityAt: null,
          lastActivityAt: null,
          chapterName: log.chapterName || '',
        };
      }

      const state = chapterStateMap[cid];
      const currentTime = new Date(log.sessionDate).getTime();
      const firstTime = state.firstActivityAt ? new Date(state.firstActivityAt).getTime() : null;
      const lastTime = state.lastActivityAt ? new Date(state.lastActivityAt).getTime() : null;

      if (!state.firstActivityAt || currentTime < firstTime) {
        state.firstActivityAt = log.sessionDate;
      }
      if (!state.lastActivityAt || currentTime > lastTime) {
        state.lastActivityAt = log.sessionDate;
      }
      if (log.chapterName) {
        state.chapterName = log.chapterName;
      }

      if (log.chapterStatus === 'Running') {
        state.status = 'Running';
        if (/chapter (started|restarted|session started)/i.test(log.notes || '') || !state.startedAt) {
          state.startedAt = log.sessionDate;
          state.startedBy = log.loggedByName;
        }
        state.stoppedAt = null;
        state.stoppedBy = null;
        state.stopReason = '';
      }

      if (log.chapterStatus === 'Stopped') {
        state.status = 'Stopped';
        state.stoppedAt = log.sessionDate;
        state.stoppedBy = log.loggedByName;
        state.stopReason = (log.notes || '').replace(/^Chapter stopped:\s*/i, '');
      }

      if (log.chapterStatus === 'Completed') {
        state.status = 'Completed';
        state.completedAt = log.sessionDate;
        state.completedBy = log.loggedByName;
      }
    }

    (log.projects || []).forEach(p => {
      if (p.projectId) {
        projectIdSet.add(p.projectId.toString());
      }
    });
  });

  const chapterStates = Object.entries(chapterStateMap);
  const runningChapters = chapterStates
    .filter(([, state]) => state.status === 'Running')
    .sort((a, b) => new Date(a[1].lastActivityAt || a[1].startedAt || 0).getTime() - new Date(b[1].lastActivityAt || b[1].startedAt || 0).getTime());
  const currentChapterState = runningChapters.length > 0 ? runningChapters[runningChapters.length - 1][1] : null;

  const completedChapterStates = chapterStates.filter(([, state]) => state.status === 'Completed');
  const subjectCompletedAt = totalChapters > 0 && completedChapterStates.length === totalChapters
    ? completedChapterStates.reduce((latest, [, state]) => {
        const time = new Date(state.completedAt || state.lastActivityAt || state.firstActivityAt || 0).getTime();
        return time > latest ? time : latest;
      }, 0)
    : null;

  const firstSessionDate = logs[0]?.sessionDate || null;
  const summaryEndDate = subjectCompletedAt ? new Date(subjectCompletedAt) : new Date();
  const elapsedDays = firstSessionDate ? countCalendarDaysInclusive(firstSessionDate, summaryEndDate) : 0;

  return {
    totalLogs: logs.length,
    daysToComplete: targetDays,
    totalChapters,
    totalProjects,
    chaptersLogged: completedChapterStates.length,
    projectsLogged: projectIdSet.size,
    projectsPending: Math.max(0, totalProjects - projectIdSet.size),
    firstSessionDate,
    lastSessionDate: logs[logs.length - 1]?.sessionDate || null,
    elapsedDays,
    actualDaysTaken: elapsedDays,
    subjectCompletedAt,
    currentChapterId: currentChapterState ? runningChapters[runningChapters.length - 1][0] : null,
    currentChapterName: currentChapterState?.chapterName || null,
    currentChapterStatus: currentChapterState?.status || null,
    currentTeacherName: latestLog?.loggedByName || currentChapterState?.startedBy || null,
    currentTeacherId: latestLog?.loggedBy || null,
    completedChapterIds: completedChapterStates.map(([chapterId]) => chapterId),
    completedProjectIds: [...projectIdSet],
    daysOverTarget: Math.max(elapsedDays - targetDays, 0),
    daysRemainingToTarget: Math.max(targetDays - elapsedDays, 0),
  };
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
  const loggedBy = getLoggedBy(req);
  const loggedByName = getLoggedByName(req);

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

  const subject = await Subject.findById(subjectId).lean();
  const analytics = buildStudentSubjectSummary(logs, subject);

  res.json({ logs, analytics, subject });
});

const getLogsForSubjectBatch = asyncHandler(async (req, res) => {
  const { subjectId, batchId } = req.params;

  const logs = await SyllabusLog.find({
    subjectId,
    batchId,
    isDeleted: false,
  }).sort({ sessionDate: 1 });

  const grouped = {};
  logs.forEach(l => {
    const sid = l.studentId.toString();
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(l);
  });

  const subject = await Subject.findById(subjectId).lean();
  const summaries = Object.entries(grouped).map(([sid, sLogs]) => ({
    studentId: sid,
    ...buildStudentSubjectSummary(sLogs, subject),
  }));

  res.json({ summaries, logs });
});

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

  const loggedBy = getLoggedBy(req);
  const loggedByName = getLoggedByName(req);

  const approvedUnlock = await ChapterChangeRequest.findOne({
    studentId,
    subjectId,
    chapterId,
    type: 'modification',
    status: 'approved',
  }).sort({ reviewedAt: -1, updatedAt: -1 });

  const finalLock = await ChapterChangeRequest.findOne({
    studentId,
    subjectId,
    chapterId,
    type: 'final_complete',
    status: 'approved',
    ...(approvedUnlock?.reviewedAt ? { updatedAt: { $gt: approvedUnlock.reviewedAt } } : {}),
  });

  if (finalLock) {
    res.status(400);
    throw new Error('Chapter is locked. Request unlock before making changes.');
  }

  const subjectLogs = await SyllabusLog.find({
    studentId,
    subjectId,
    isDeleted: false,
  }).sort({ sessionDate: 1, createdAt: 1 });
  const summary = buildStudentSubjectSummary(subjectLogs, {});
  if (
    summary.currentChapterStatus === 'Running' &&
    summary.currentChapterId &&
    String(summary.currentChapterId) !== String(chapterId)
  ) {
    res.status(400);
    throw new Error(`Complete ${summary.currentChapterName || 'running chapter'} before starting another chapter.`);
  }

  // Check if chapter already has active logs
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
      notes: existing.chapterStatus === 'Stopped' ? 'Chapter restarted' : 'Chapter session started',
      chapterStatus: 'Running',
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

  const loggedBy = getLoggedBy(req);
  const loggedByName = getLoggedByName(req);

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

  const loggedBy = getLoggedBy(req);
  const loggedByName = getLoggedByName(req);

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
  }).sort({ sessionDate: 1, createdAt: 1 });

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

    if (!chapterStatusMap[cid]) {
      chapterStatusMap[cid] = {
        status: null,
        startedAt: null,
        stoppedAt: null,
        completedAt: null,
        startedBy: null,
        stoppedBy: null,
        completedBy: null,
        stopReason: '',
        firstActivityAt: null,
      };
    }

    if (!chapterStatusMap[cid].firstActivityAt) {
      chapterStatusMap[cid].firstActivityAt = log.sessionDate;
    }

    if (log.chapterStatus === 'Running' && /chapter (started|restarted|session started)/i.test(log.notes || '')) {
      chapterStatusMap[cid].status = 'Running';
      chapterStatusMap[cid].startedAt = log.sessionDate;
      chapterStatusMap[cid].startedBy = log.loggedByName;
      chapterStatusMap[cid].stoppedAt = null;
      chapterStatusMap[cid].stoppedBy = null;
      chapterStatusMap[cid].stopReason = '';
    }

    if (log.chapterStatus === 'Stopped') {
      chapterStatusMap[cid].status = 'Stopped';
      chapterStatusMap[cid].stoppedAt = log.sessionDate;
      chapterStatusMap[cid].stoppedBy = log.loggedByName;
      chapterStatusMap[cid].stopReason = (log.notes || '').replace(/^Chapter stopped:\s*/i, '');
    }

    if (log.chapterStatus === 'Completed') {
      chapterStatusMap[cid].status = 'Completed';
      chapterStatusMap[cid].completedAt = log.sessionDate;
      chapterStatusMap[cid].completedBy = log.loggedByName;
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

  
  // Check if chapters have been final-completed after the latest approved unlock.
  const approvedFinalRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    type: 'final_complete',
    status: 'approved',
  }).lean();
  const approvedUnlockRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    type: 'modification',
    status: 'approved',
  }).lean();
  const latestUnlockByChapter = new Map();
  approvedUnlockRequests.forEach(r => {
    const cid = r.chapterId?.toString();
    if (!cid) return;
    const time = new Date(r.reviewedAt || r.updatedAt || r.createdAt).getTime();
    if (!latestUnlockByChapter.has(cid) || latestUnlockByChapter.get(cid) < time) {
      latestUnlockByChapter.set(cid, time);
    }
  });
  const lockedChapterIds = new Set(
    approvedFinalRequests
      .filter(r => {
        const cid = r.chapterId?.toString();
        const finalTime = new Date(r.reviewedAt || r.updatedAt || r.createdAt).getTime();
        return cid && finalTime > (latestUnlockByChapter.get(cid) || 0);
      })
      .map(r => r.chapterId.toString())
  );

  const studentResponses = await StudentSyllabusResponse.find({ studentId, subjectId }).lean();
  const studentResponseMap = {};
  studentResponses.forEach(response => {
    const key = [
      response.type,
      response.chapterId?.toString() || '',
      response.projectId ? response.projectId.toString() : '',
    ].join(':');
    const comments = (response.comments || []).map(item => ({
      comment: item.comment || '',
      commentedAt: item.commentedAt || item.createdAt || response.respondedAt || response.updatedAt || response.createdAt,
    })).filter(item => item.comment);
    if (response.comment && comments.length === 0) {
      comments.push({
        comment: response.comment,
        commentedAt: response.respondedAt || response.updatedAt || response.createdAt,
      });
    }
    studentResponseMap[key] = {
      understood: Boolean(response.understood),
      comment: response.comment || '',
      comments,
      respondedAt: response.respondedAt || response.updatedAt || response.createdAt,
    };
  });

  // Build response for each chapterpter
  const chapterStatuses = chapters.map(ch => {
    const cid = ch._id ? ch._id.toString() : null;
    const status = cid ? chapterStatusMap[cid] : null;
    const completedProjects = cid ? chapterProjectMap[cid] || {} : {};
    const activity = cid ? chapterActivityMap[cid] || [] : [];

    const chapterProjects = (subject?.projects || []).filter(
      p => String(p.chapterId) === cid
    );

    const getStudentResponse = (type, projectId = '') => (
      studentResponseMap[[type, cid || '', projectId ? String(projectId) : ''].join(':')] || null
    );

    return {
      chapter: ch,
      status: status?.status || null,
      startedAt: status?.startedAt || status?.firstActivityAt || null,
      stoppedAt: status?.stoppedAt || null,
      completedAt: status?.completedAt || null,
      startedBy: status?.startedBy || null,
      stoppedBy: status?.stoppedBy || null,
      completedBy: status?.completedBy || null,
      stopReason: status?.stopReason || '',
      theoryResponse: getStudentResponse('theory'),
      chapterResponse: getStudentResponse('chapter'),
      commentResponse: getStudentResponse('comment'),
      projects: chapterProjects.map(p => ({
        ...p,
        completed: completedProjects[String(p._id)] ? true : false,
        completedAt: completedProjects[String(p._id)]?.completedAt || null,
        completedBy: completedProjects[String(p._id)]?.completedBy || null,
        studentResponse: getStudentResponse('project', p._id),
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

  if (!studentId || !subjectId || !chapterId || !reason) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and reason are required.');
  }

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
    notes: `Chapter stopped: ${reason}`,
    chapterStatus: 'Stopped',
    loggedBy: getLoggedBy(req),
    loggedByName: getLoggedByName(req),
  });

  res.json({ message: 'Chapter stopped.' });
});

const resetChapter = asyncHandler(async (req, res) => {
  const { studentId, subjectId, chapterId, reason } = req.body;

  if (!studentId || !subjectId || !chapterId || !reason) {
    res.status(400);
    throw new Error('studentId, subjectId, chapterId, and reason are required.');
  }

  await SyllabusLog.updateMany(
    { studentId, subjectId, chapterId, isDeleted: false },
    { isDeleted: true }
  );

  await ChapterChangeRequest.deleteMany({
    studentId,
    subjectId,
    chapterId,
    type: 'final_complete',
    status: 'approved',
  });

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
    notes: `Chapter reset: ${reason}`,
    loggedBy: getLoggedBy(req),
    loggedByName: getLoggedByName(req),
  });

  res.json({ message: 'Chapter reset to not started.' });
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

  const loggedByName = getLoggedByName(req);
  const loggedBy = getLoggedBy(req);

  await SyllabusLog.create({
    studentId,
    subjectId,
    batchId,
    courseId,
    branchId,
    sessionDate: new Date(),
    chapterId,
    chapterName: chapterName || '',
    projects: [],
    notes: `Final chapter completed. Reason: ${reason}`,
    chapterStatus: 'Completed',
    loggedBy,
    loggedByName,
  });

  await SyllabusLog.updateMany(
    { studentId, subjectId, chapterId, isDeleted: false },
    { chapterStatus: 'Completed' }
  );

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
    requestedBy: loggedBy,
    requestedByName: loggedByName,
    status: 'approved',
    reviewedBy: loggedByName,
    reviewedAt: new Date(),
  });

  res.status(201).json({
    message: 'Chapter final completed and locked.',
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
  filter.status = status || 'pending';
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

  const reviewerName = getLoggedByName(req, 'Super Admin');

  // ⚠️ Process action LOGIC FIRST before saving status.
  // If the logic fails, the request stays 'pending' so teacher can retry.
  // Final completion locks immediately. Super Admin approval is only for unlock/change requests.
  if (action === 'approved' && request.type === 'modification') {
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
  resetChapter,
  undoProject,
  undoCompleteChapter,
  finalCompleteChapter,
  getChangeRequests,
  approveChangeRequest,
  requestIncompleteChapter,
};





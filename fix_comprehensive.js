const fs = require('fs');

// ===================== BACKEND CONTROLLER =====================
const ctrlPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/backend/controllers/syllabusLogController.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf-8');

// 1. Update getChapterStatus to include isLocked (check for approved final_complete requests)
const oldStatusReturn = ctrl.indexOf('// Build response for each chapter');
const isLockedCode = `
  // Check if chapters have been final-approved (locked)
  const approvedFinalRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    type: 'final_complete',
    status: 'approved',
  }).lean();
  const lockedChapterIds = new Set(approvedFinalRequests.map(r => r.chapterId.toString()));

  // Build response for each chapter`;

ctrl = ctrl.replace(
  ctrl.substring(ctrl.indexOf('// Build response for each chapter'), ctrl.indexOf('// Build response for each chapter') + 30),
  isLockedCode
);

// Add isLocked to each chapter status return
ctrl = ctrl.replace(
  `      changeRequestPending: cid ? pendingChapterIds.has(cid) : false,`,
  `      changeRequestPending: cid ? pendingChapterIds.has(cid) : false,
      isLocked: cid ? lockedChapterIds.has(cid) : false,`
);

// 2. Add incomplete-chapter endpoint (teacher requests to modify a locked chapter)
const incompleteEndpoint = `
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
    (req.user?.firstName ? \`\${req.user.firstName} \${req.user.lastName || ''}\`.trim() : '') || 'System';
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
});`;

// Add before module.exports (find the last function's closing });
// Find the final function (approveChangeRequest) and add after it
ctrl = ctrl.replace(
  'module.exports = {',
  incompleteEndpoint + '\n\nmodule.exports = {'
);

// Add to exports
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
  approveChangeRequest,
  requestIncompleteChapter,`
);

// Remove the old module.exports if it appears after (duplicate)
const secondExportStart = ctrl.indexOf('module.exports = {', ctrl.indexOf('module.exports = {') + 1);
if (secondExportStart > 0) {
  // Find the end of the SECOND exports
  const secondExportEnd = ctrl.indexOf('};', secondExportStart) + 2;
  // Remove everything from second exports to end
  ctrl = ctrl.substring(0, secondExportStart);
  // Add a clean closing
  ctrl += '\n};';
}

// Update approveChangeRequest to handle modification type
ctrl = ctrl.replace(
  `  // If approved, mark the chapter as fully completed
  if (action === 'approved') {`,
  `  // If approved: final_complete = lock chapter, modification = unlock chapter
  if (action === 'approved' && request.type === 'final_complete') {`
);

// Add modification type handling
ctrl = ctrl.replace(
  `  res.json({ message: \`Change request \${action}.\`, request });`,
  `  // If modification request approved, remove the lock (delete approved final_complete requests)
  if (action === 'approved' && request.type === 'modification') {
    await ChapterChangeRequest.deleteMany({
      studentId: request.studentId,
      subjectId: request.subjectId,
      chapterId: request.chapterId,
      type: 'final_complete',
      status: 'approved',
    });
    // Also delete the 'Final chapter completed' log entry so chapter goes back to Running
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

  res.json({ message: \`Change request \${action}.\`, request });`
);

fs.writeFileSync(ctrlPath, ctrl, 'utf-8');
console.log('Backend controller updated!');

// ===================== BACKEND ROUTES =====================
const routesPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/backend/routes/syllabusLogRoutes.js';
let routes = fs.readFileSync(routesPath, 'utf-8');

// Add import
routes = routes.replace(
  '} = require(\'../controllers/syllabusLogController\');',
  `  requestIncompleteChapter,
} = require('../controllers/syllabusLogController');`
);

// Add route
routes = routes.replace(
  "router.post('/chapter/final-complete', protect, finalCompleteChapter);",
  "router.post('/chapter/final-complete', protect, finalCompleteChapter);\n\n// POST   /api/syllabus-logs/chapter/incomplete  → request to modify a locked chapter\nrouter.post('/chapter/incomplete', protect, requestIncompleteChapter);"
);

fs.writeFileSync(routesPath, routes, 'utf-8');
console.log('Routes updated!');

// ===================== FRONTEND =====================
const frontPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';
let front = fs.readFileSync(frontPath, 'utf-8');

// 1. Remove "Undo Theory" button from completed chapters
const undoTheoryBtnPattern = `                          {isCompleted && (
                            <button
                              onClick={() => handleUndoTheoryComplete(ch, chIndex)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition ml-2"
                            >
                              {actionLoading === \`undocomplete_\${chIndex}\` ? (
                                <RefreshCw size={10} className="animate-spin" />
                              ) : (
                                <RefreshCw size={10} />
                              )}
                              Undo Theory
                            </button>
                          )}`;

front = front.replace(undoTheoryBtnPattern, '');

// 2. In the chapter activity section, add "Theory Completed" entry if chapter is completed
const activitySectionPattern = `                  {/* Chapter Activity */}
                  {chData.activity && chData.activity.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <History size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {chData.activity.map((act, aIdx) => (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            {moment(act.date).format('DD MMM')} — {act.by}
                            {act.projects?.length > 0 && \` (\${act.projects.map(p => p.projectName || p.projectId).join(', ')})\`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}`;

const newActivitySection = `                  {/* Chapter Activity */}
                  <div className="px-4 pb-3">
                    {(chData.activity.length > 0 || (isCompleted && chData.completedBy)) && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <History size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {isCompleted && chData.completedBy && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          <CheckCircle2 size={10} />
                          Theory Completed — {moment(chData.completedAt).format('DD MMM')} by {chData.completedBy}
                        </span>
                      )}
                      {chData.activity.map((act, aIdx) => (
                        <span
                          key={aIdx}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          {moment(act.date).format('DD MMM')} — {act.by}
                          {act.projects?.length > 0 && \` (\${act.projects.map(p => p.projectName || p.projectId).join(', ')})\`}
                        </span>
                      ))}
                      {/* Reactivity Changes */}
                      {chData.reactivityChanges && chData.reactivityChanges.length > 0 && (
                        <>
                          <span className="w-full text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Reactivity Changes:</span>
                          {chData.reactivityChanges.map((rc, rcIdx) => (
                            <span key={rcIdx} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              {moment(rc.date).format('DD MMM')} — {rc.by}: {rc.detail || rc.action}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>`;

front = front.replace(activitySectionPattern, newActivitySection);

// 3. Handle isLocked - modify chapter header to show locked state + Incomplete Chapter button
// Replace the completed chapter styling/buttons to show locked state
const chapterHeaderLocked = `                <div
                  key={ch._id || chIndex}
                  className={\`rounded-xl border-2 overflow-hidden transition-all duration-300 \${
                    chData.isLocked
                      ? 'border-slate-300 bg-slate-50/30'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isRunning
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : 'border-slate-200 bg-white'
                  }\`}
                >
                  {/* Chapter Header */}
                  <div className={\`px-4 py-3 flex items-center justify-between gap-3 \${
                    chData.isLocked ? 'bg-slate-100/50' : isCompleted ? 'bg-emerald-50/50' : isRunning ? 'bg-indigo-50/30' : 'bg-slate-50/50'
                  }\`}>`;

front = front.replace(
  `                <div
                  key={ch._id || chIndex}
                  className={\`rounded-xl border-2 overflow-hidden transition-all duration-300 \${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isRunning
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : 'border-slate-200 bg-white'
                  }\`}
                >
                  {/* Chapter Header */}
                  <div className={\`px-4 py-3 flex items-center justify-between gap-3 \${
                    isCompleted ? 'bg-emerald-50/50' : isRunning ? 'bg-indigo-50/30' : 'bg-slate-50/50'
                  }\`}>`,
  chapterHeaderLocked
);

// 4. Add isLocked to status badges and show Incomplete Chapter button
const lockedBadgeAndBtn = `                          {chData.isLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                              <CheckCircle2 size={10} /> Final Approved
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          ) : chData.changeRequestPending ? (`;

front = front.replace(
  `                          {isCompleted ? (
                            <span className=\"inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700\">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          ) : chData.changeRequestPending ? (`,
  lockedBadgeAndBtn
);

// 5. Add Locked icon for locked chapter header icon
const lockedIcon = `                        {chData.isLocked ? <Lock size={18} /> : isCompleted ? <Trophy size={18} /> : isRunning ? <Play size={18} /> : <BookMarked size={18} />}`;

front = front.replace(
  `{isCompleted ? <Trophy size={18} /> : isRunning ? <Play size={18} /> : <BookMarked size={18} />}`,
  lockedIcon
);

// 6. Add Incomplete Chapter button for locked chapters, and disable other buttons
// Replace the entire button section in the chapter header
const lockedButtonSection = `                    <div className="flex items-center gap-2 shrink-0">
                      {chData.isLocked ? (
                        <button
                          onClick={() => handleOpenIncompleteModal(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === \`incomplete_\${chIndex}\` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          Incomplete Chapter
                        </button>
                      ) : notStarted && (
                        <button
                          onClick={() => handleStartChapter(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === \`start_\${chIndex}\` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} />
                          )}
                          Start Chapter
                        </button>
                      )}
                      {!chData.isLocked && isRunning && completedCount === totalCount && (completedCount > 0 || totalCount === 0) && (
                        <button
                          onClick={() => handleOpenFinalComplete(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === \`final_\${chIndex}\` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Trophy size={12} />
                          )}
                          Final Complete
                        </button>
                      )}
                      {!chData.isLocked && isRunning && (
                        <>
                          <button
                            onClick={() => handleCompleteChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95"
                          >
                            {actionLoading === \`complete_\${chIndex}\` ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            All Theory Completed
                          </button>
                          <button
                            onClick={() => handleStopChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition active:scale-95"
                          >
                            {actionLoading === \`stop_\${chIndex}\` ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <X size={12} />
                            )}
                            Stop/Reset
                          </button>
                        </>
                      )}
                    </div>`;

// Find and replace the button section
const oldButtonSectionStart = front.indexOf('{notStarted && (');
const oldButtonSectionEnd = front.indexOf('</div>', front.indexOf('</div>', front.indexOf('</div>', oldButtonSectionStart) + 1) + 1);
// Find the exact button section: from `{notStarted && (` to the closing `</div>` of the buttons area
// Actually, I need to be more precise. Let me find the section from the first button condition to the last closing </div> of the button area.

// Find: `{notStarted && (`  
const buttonsStart = front.indexOf('{notStarted && (');
// Go backwards to find the opening <div className="flex items-center gap-2 shrink-0">
const divOpen = front.lastIndexOf('<div className="flex items-center gap-2 shrink-0">', buttonsStart);
// Find the matching closing </div>
let depth = 0;
let divEnd = divOpen;
for (let i = divOpen; i < front.length; i++) {
  if (front.substring(i, i + 4) === '<div') { depth++; i += 3; }
  else if (front.substring(i, i + 6) === '</div>') {
    depth--;
    if (depth === 0) { divEnd = i + 6; break; }
    i += 5;
  }
}

const oldButtonSection = front.substring(divOpen, divEnd);
front = front.replace(oldButtonSection, lockedButtonSection);

// 7. Add Lock icon import
front = front.replace(
  "  Check,\n  X,",
  "  Check,\n  Lock,\n  X,"
);

// 8. Add Incomplete Chapter handler functions
const incompleteHandlers = `
  // Open Incomplete Chapter modal
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteChapter, setIncompleteChapter] = useState(null);
  const [incompleteIndex, setIncompleteIndex] = useState(null);
  const [incompleteReason, setIncompleteReason] = useState('');

  const handleOpenIncompleteModal = (ch, index) => {
    setIncompleteChapter(ch);
    setIncompleteIndex(index);
    setIncompleteReason('');
    setShowIncompleteModal(true);
  };

  const handleSubmitIncomplete = async () => {
    if (!student || !selectedSubject || !incompleteChapter) return;
    if (!incompleteReason.trim()) {
      toast.error('Please provide a reason for making chapter incomplete.');
      return;
    }
    setActionLoading(\`incomplete_\${incompleteIndex}\`);
    setShowIncompleteModal(false);
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/incomplete\`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: incompleteChapter._id,
          chapterName: incompleteChapter.name || '',
          reason: incompleteReason.trim(),
        },
        { withCredentials: true }
      );
      toast.success('Modification request sent to Super Admin.');
      fetchChapterStatuses();
      fetchChangeRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit request.');
    } finally {
      setActionLoading(null);
      setIncompleteChapter(null);
      setIncompleteIndex(null);
    }
  };`;

front = front.replace(
  "  const [reviewNotes, setReviewNotes] = useState('');",
  "  const [reviewNotes, setReviewNotes] = useState('');" + incompleteHandlers
);

// 9. Add Incomplete Chapter Modal
const incompleteModal = `
      {/* Incomplete Chapter Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-amber-100 p-3 rounded-full mb-3">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Request Chapter Modification</h3>
              <p className="text-sm text-slate-500 mt-1">
                Request to make <span className="font-bold text-slate-800">{incompleteChapter?.name || ''}</span> incomplete so you can make changes.
                Super Admin must approve this request.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Reason for modification *</label>
              <textarea
                value={incompleteReason}
                onChange={e => setIncompleteReason(e.target.value)}
                placeholder="e.g. Need to add more content, project revision needed..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIncompleteModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitIncomplete}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition active:scale-95"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}`;

front = front.replace(
  '      {/* Final Complete Modal */}',
  incompleteModal + '\n\n      {/* Final Complete Modal */}'
);

// 10. Split super admin panel into two sections: Pending Approvals + Change Requests
// Fetch both types separately
front = front.replace(
  `      {isSuperAdmin && changeRequests.length > 0 && (
        <div className="border-t border-slate-100 bg-violet-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
              <Clock size={14} className="text-violet-600" /> Pending Approvals ({changeRequests.length})
            </h4>`,
  `      {/* Super Admin Pending Approvals (final_complete) */}
      {isSuperAdmin && (() => {
        const finalApprov = changeRequests.filter(r => r.type === 'final_complete');
        const modRequests = changeRequests.filter(r => r.type === 'modification');
        return (<>
        {finalApprov.length > 0 && (
        <div className="border-t border-slate-100 bg-violet-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
              <Clock size={14} className="text-violet-600" /> Pending Final Approvals ({finalApprov.length})
            </h4>`
);

// Change the end of the panel to close properly and add change requests section
front = front.replace(
  `      )}
    </div>`,
  `      )}
        </div>
        )}
        {modRequests.length > 0 && (
        <div className="border-t border-slate-100 bg-amber-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-600" /> Change Requests ({modRequests.length})
            </h4>
            <button
              onClick={fetchChangeRequests}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {modRequests.map((req) => (
              <div key={req._id} className="bg-white rounded-xl border border-amber-100 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{req.chapterName}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-700">
                        Modification
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested by <span className="font-bold text-slate-700">{req.requestedByName}</span>
                      {' · '}{moment(req.createdAt).format('DD MMM YYYY, h:mm A')}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1.5 italic">
                        "{req.reason}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveRequest(req._id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition active:scale-95"
                    >
                      <Check size={11} /> Approve
                    </button>
                    <button
                      onClick={() => handleApproveRequest(req._id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-rose-700 transition active:scale-95"
                    >
                      <X size={11} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
        </>);
      })()}
    </div>`
);

fs.writeFileSync(frontPath, front, 'utf-8');
console.log('Frontend updated!');

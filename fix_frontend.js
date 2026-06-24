const fs = require('fs');
const path = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';

// Read the entire file
let c = fs.readFileSync(path, 'utf-8');

// ============================================================
// 1. Add new state variables after the existing useState lines
// ============================================================
const newStates = `  const [changeRequests, setChangeRequests] = useState([]);
  const [showChangeRequests, setShowChangeRequests] = useState(false);
  const [finalCompleteReason, setFinalCompleteReason] = useState('');
  const [showFinalCompleteModal, setShowFinalCompleteModal] = useState(false);
  const [finalCompleteChapter, setFinalCompleteChapter] = useState(null);
  const [finalCompleteIndex, setFinalCompleteIndex] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');`;

// Find where the existing state declarations end and insert new ones
// Insert after "const [showActivity, setShowActivity] = useState(false);"
c = c.replace(
  "const [showActivity, setShowActivity] = useState(false);",
  "const [showActivity, setShowActivity] = useState(false);" + newStates
);

// ============================================================
// 2. Add new handler functions after existing handlers
// ============================================================

// a) Stop/Reset chapter handler
const stopHandler = `
  // Stop/Reset a running chapter
  const handleStopChapter = async (ch, index) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Stop/Reset Chapter?',
      text: \`Reset "\${ch.name || ch}" back to Not Started? Logs will be preserved.\`,
      icon: 'warning',
      input: 'text',
      inputLabel: 'Reason for stopping (optional)',
      inputPlaceholder: 'e.g. Teacher on leave, need to revisit...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    setActionLoading(\`stop_\${index}\`);
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/stop\`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: ch._id,
          chapterName: ch.name || ch,
          reason: result.value || '',
        },
        { withCredentials: true }
      );
      toast.success(\`"\${ch.name || ch}" reset to Not Started.\`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to stop chapter');
    } finally {
      setActionLoading(null);
    }
  };`;

// b) Undo project handler
const undoHandler = `
  // Undo a single project completion
  const handleUndoProject = async (ch, project, chIndex) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Undo Project?',
      text: \`Mark "\${project.name}" as pending again?\`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Undo',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    setActionLoading(\`undoproj_\${chIndex}_\${project._id}\`);
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/project/undo\`,
        {
          studentId,
          subjectId: selectedSubject._id,
          chapterId: ch._id,
          projectId: project._id,
        },
        { withCredentials: true }
      );
      toast.success(\`"\${project.name}" marked as pending.\`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to undo project');
    } finally {
      setActionLoading(null);
    }
  };`;

// c) Undo theory complete handler
const undoTheoryHandler = `
  // Undo "All Theory Completed"
  const handleUndoTheoryComplete = async (ch, index) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Undo Theory Completion?',
      text: \`Reset "\${ch.name || ch}" theory back to In Progress?\`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Undo',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    setActionLoading(\`undocomplete_\${index}\`);
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/undo-complete\`,
        {
          studentId,
          subjectId: selectedSubject._id,
          chapterId: ch._id,
        },
        { withCredentials: true }
      );
      toast.success(\`"\${ch.name || ch}" theory completion undone.\`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to undo theory completion');
    } finally {
      setActionLoading(null);
    }
  };`;

// d) Final complete handler
const finalCompleteHandler = `
  // Open Final Complete modal
  const handleOpenFinalComplete = (ch, index) => {
    setFinalCompleteChapter(ch);
    setFinalCompleteIndex(index);
    setFinalCompleteReason('');
    setShowFinalCompleteModal(true);
  };

  // Submit Final Complete request
  const handleSubmitFinalComplete = async () => {
    if (!student || !selectedSubject || !finalCompleteChapter) return;
    if (!finalCompleteReason.trim()) {
      toast.error('Please provide a reason for final completion.');
      return;
    }
    setActionLoading(\`final_\${finalCompleteIndex}\`);
    setShowFinalCompleteModal(false);
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/final-complete\`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: finalCompleteChapter._id,
          chapterName: finalCompleteChapter.name || '',
          reason: finalCompleteReason.trim(),
        },
        { withCredentials: true }
      );
      toast.success('Final completion request sent to Super Admin.');
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit final completion');
    } finally {
      setActionLoading(null);
      setFinalCompleteChapter(null);
      setFinalCompleteIndex(null);
    }
  };`;

// e) Approve/Reject change request handler (super admin)
const approveHandler = `
  // Fetch change requests (super admin)
  const fetchChangeRequests = async () => {
    try {
      const { data } = await axios.get(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/change-requests?status=pending\`,
        { withCredentials: true }
      );
      setChangeRequests(data.requests || []);
    } catch (e) {
      // silent
    }
  };

  // Approve or reject a change request
  const handleApproveRequest = async (reqId, action) => {
    const confirmMsg = action === 'approved'
      ? 'Approve this final completion request? Chapter will be marked as fully completed.'
      : 'Reject this request? Chapter will remain unchanged.';
    const result = await Swal.fire({
      title: action === 'approved' ? 'Approve Request?' : 'Reject Request?',
      text: confirmMsg,
      icon: action === 'approved' ? 'success' : 'warning',
      input: 'textarea',
      inputLabel: 'Review notes (optional)',
      inputPlaceholder: 'Add notes for the teacher...',
      showCancelButton: true,
      confirmButtonColor: action === 'approved' ? '#059669' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: action === 'approved' ? 'Yes, Approve' : 'Yes, Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    try {
      await axios.post(
        \`\${import.meta.env.VITE_API_URL}/syllabus-logs/change-requests/\${reqId}/approve\`,
        { action, reviewNotes: result.value || '' },
        { withCredentials: true }
      );
      toast.success(\`Request \${action} successfully.\`);
      fetchChangeRequests();
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to process request.');
    }
  };`;

// Insert all handlers after handleCompleteAllProjects function
c = c.replace(
  "  const startDate = student ? getStudentStartDate(student) : null;",
  stopHandler + "\n" + undoHandler + "\n" + undoTheoryHandler + "\n" + finalCompleteHandler + "\n" + approveHandler + "\n\n  const startDate = student ? getStudentStartDate(student) : null;"
);

// ============================================================
// 3. Fetch change requests when super admin opens detail view
// ============================================================
c = c.replace(
  "    fetchChapterStatuses();\n  }, [studentId, selectedSubject?._id]);",
  "    fetchChapterStatuses();\n    if (isSuperAdmin) {\n      fetchChangeRequests();\n    }\n  }, [studentId, selectedSubject?._id]);"
);

// ============================================================
// 4. Update the chapter header button section to add Stop/Reset
// ============================================================

// Find the Running section buttons section and add Stop/Reset
c = c.replace(
  `                      {isRunning && (
                        <>
                          <button
                            onClick={() => handleCompleteChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className=\"inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95\"
                          >
                            {actionLoading === \`complete_\${chIndex}\` ? (
                              <RefreshCw size={12} className=\"animate-spin\" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            All Theory Completed
                          </button>
                        </>
                      )}`,
  `                      {isRunning && completedCount === totalCount && totalCount > 0 && (
                        <button
                          onClick={() => handleOpenFinalComplete(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className=\"inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition active:scale-95\"
                        >
                          {actionLoading === \`final_\${chIndex}\` ? (
                            <RefreshCw size={12} className=\"animate-spin\" />
                          ) : (
                            <Trophy size={12} />
                          )}
                          Final Complete
                        </button>
                      )}
                      {isRunning && (
                        <>
                          <button
                            onClick={() => handleCompleteChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className=\"inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95\"
                          >
                            {actionLoading === \`complete_\${chIndex}\` ? (
                              <RefreshCw size={12} className=\"animate-spin\" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            All Theory Completed
                          </button>
                          <button
                            onClick={() => handleStopChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className=\"inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition active:scale-95\"
                          >
                            {actionLoading === \`stop_\${chIndex}\` ? (
                              <RefreshCw size={12} className=\"animate-spin\" />
                            ) : (
                              <X size={12} />
                            )}
                            Stop/Reset
                          </button>
                        </>
                      )}`
);

// ============================================================
// 5. Update the completed chapters section - add Undo Theory & Undo Projects
// ============================================================

// a) Add undo button for completed theory in chapter header
c = c.replace(
  `                          {chData.completedBy && (
                            <span className=\"text-[10px] font-semibold text-emerald-600\">
                              · Completed by {chData.completedBy}
                              {chData.completedAt && \` \${moment(chData.completedAt).format('DD MMM')}\`}
                            </span>
                          )}`,
  `                          {chData.completedBy && (
                            <span className=\"text-[10px] font-semibold text-emerald-600\">
                              · Completed by {chData.completedBy}
                              {chData.completedAt && \` \${moment(chData.completedAt).format('DD MMM')}\`}
                            </span>
                          )}
                          {isCompleted && (
                            <button
                              onClick={() => handleUndoTheoryComplete(ch, chIndex)}
                              disabled={actionLoading !== null}
                              className=\"inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition ml-2\"
                            >
                              {actionLoading === \`undocomplete_\${chIndex}\` ? (
                                <RefreshCw size={10} className=\"animate-spin\" />
                              ) : (
                                <RefreshCw size={10} />
                              )}
                              Undo Theory
                            </button>
                          )}`
);

// b) Add change request pending indicator
c = c.replace(
  `                          {isCompleted ? (
                            <span className=\"inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700\">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          ) : isRunning ? (`,
  `                          {isCompleted ? (
                            <span className=\"inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700\">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          ) : chData.changeRequestPending ? (
                            <span className=\"inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700\">
                              <Clock size={10} /> Awaiting Approval
                            </span>
                          ) : isRunning ? (`
);

// ============================================================
// 6. Update projects table action column - add Undo button for completed
// ============================================================
c = c.replace(
  `                                    <td className=\"px-3 py-2.5 text-center\">
                                      {proj.completed ? (
                                        <span className=\"text-[10px] text-emerald-500 font-bold\">✓ Completed</span>
                                      ) : (`,
  `                                    <td className=\"px-3 py-2.5 text-center\">
                                      {proj.completed ? (
                                        <div className=\"flex items-center justify-center gap-1\">
                                          <span className=\"text-[10px] text-emerald-500 font-bold\">✓ Completed</span>
                                          <button
                                            onClick={() => handleUndoProject(ch, proj, chIndex)}
                                            disabled={actionLoading !== null}
                                            className=\"rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition active:scale-95\"
                                          >
                                            {actionLoading === \`undoproj_\${chIndex}_\${proj._id}\` ? (
                                              <RefreshCw size={9} className=\"animate-spin\" />
                                            ) : (
                                              'Undo'
                                            )}
                                          </button>
                                        </div>
                                      ) : (`
);

// ============================================================
// 7. Add the Final Complete Modal (after the Main Content closing div)
// ============================================================
c = c.replace(
  `    </div>
  );
};`,
  `    </div>

      {/* Final Complete Modal */}
      {showFinalCompleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-violet-100 p-3 rounded-full mb-3">
                <Trophy size={28} className="text-violet-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Final Chapter Complete</h3>
              <p className="text-sm text-slate-500 mt-1">
                All theory and projects for <span className="font-bold text-slate-800">{finalCompleteChapter?.name || ''}</span> are done.
                This will send a request to Super Admin for approval.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Reason for final completion *</label>
              <textarea
                value={finalCompleteReason}
                onChange={e => setFinalCompleteReason(e.target.value)}
                placeholder="e.g. All topics covered, all projects completed..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-violet-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalCompleteModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFinalComplete}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition active:scale-95"
              >
                Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin: Pending Change Requests Panel */}
      {isSuperAdmin && changeRequests.length > 0 && (
        <div className="border-t border-slate-100 bg-violet-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
              <Clock size={14} className="text-violet-600" /> Pending Approvals ({changeRequests.length})
            </h4>
            <button
              onClick={fetchChangeRequests}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {changeRequests.map((req) => (
              <div key={req._id} className="bg-white rounded-xl border border-violet-100 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{req.chapterName}</span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">
                        {req.type === 'final_complete' ? 'Final Complete' : 'Modification'}
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
    </div>
  );
};`
);

fs.writeFileSync(path, c, 'utf-8');
console.log('Frontend updated successfully!');

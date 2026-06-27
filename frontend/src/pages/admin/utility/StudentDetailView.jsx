import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  FolderCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  Play,
  Check,
  Lock,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  UserCheck,
  TrendingUp,
  ListTodo,
  Trophy,
  History,
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import axios from 'axios';
import Swal from 'sweetalert2';

const StudentDetailView = ({
  studentId,
  onClose,
  student,
  selectedSubject,
  subjectChapters,
  subjectProjects,
  batchId,
  courseId,
  branchId,
  getStudentStartDate,
  getCourseEndDate,
  getDaysRemainingText,
  holidays,
  user,
}) => {
  const [chapterStatuses, setChapterStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [projectDate, setProjectDate] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const activityLog = [];
  const showActivity = false;
  const [showChangeRequests, setShowChangeRequests] = useState(false);
  const [finalCompleteReason, setFinalCompleteReason] = useState('');
  const [showFinalCompleteModal, setShowFinalCompleteModal] = useState(false);
  const [finalCompleteChapter, setFinalCompleteChapter] = useState(null);
  const [finalCompleteIndex, setFinalCompleteIndex] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
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
    setActionLoading(`incomplete_${incompleteIndex}`);
    setShowIncompleteModal(false);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/incomplete`,
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
  };

  const isSuperAdmin = !user || user.role === 'Super Admin' || user.type === 'Super Admin';

  // Fetch chapter statuses from API
  const fetchChapterStatuses = async () => {
    if (!studentId || !selectedSubject?._id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/student/${studentId}/subject/${selectedSubject._id}/status`,
        { withCredentials: true }
      );
      setChapterStatuses(data.chapterStatuses || []);
    } catch (e) {
      console.error('Failed to load chapter statuses', e);
      toast.error('Failed to load chapter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapterStatuses();
    if (isSuperAdmin) {
      fetchChangeRequests();
    }
  }, [studentId, selectedSubject?._id]);

  // Start a chapter
  const handleStartChapter = async (ch, index) => {
    if (!student || !selectedSubject) return;
    setActionLoading(`start_${index}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/start`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: ch._id,
          chapterName: ch.name || ch,
          sessionDate: moment().format('YYYY-MM-DD'),
        },
        { withCredentials: true }
      );
      toast.success(`Started Chapter: ${ch.name || ch}`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start chapter');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete a chapter (all theory done)
  const handleCompleteChapter = async (ch, index) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'All Theory Completed?',
      text: `Mark "${ch.name || ch}" as all theory completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Complete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        container: 'z-[9999]',
      },
    });
    if (!result.isConfirmed) return;
    setActionLoading(`complete_${index}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/complete`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: ch._id,
          chapterName: ch.name || ch,
        },
        { withCredentials: true }
      );
      toast.success(`"${ch.name || ch}" marked as Completed!`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to complete chapter');
    } finally {
      setActionLoading(null);
    }
  };

  // Mark a single project as done
  const handleMarkProjectDone = async (ch, project, chIndex) => {
    if (!student || !selectedSubject) return;
    const date = projectDate[`${ch._id}_${project._id}`] || moment().format('YYYY-MM-DD');
    setActionLoading(`proj_${chIndex}_${project._id}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/project/complete`,
        {
          studentId,
          subjectId: selectedSubject._id,
          batchId,
          courseId,
          branchId,
          chapterId: ch._id,
          chapterName: ch.name || ch,
          projects: [{ projectId: project._id, projectName: project.name }],
          sessionDate: date,
        },
        { withCredentials: true }
      );
      toast.success(`"${project.name}" marked done for ${moment(date).format('DD MMM')}`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark project');
    } finally {
      setActionLoading(null);
    }
  };

  // Mark all projects as completed for a chapter
  const handleCompleteAllProjects = async (ch, chapterData, index) => {
    if (!student || !selectedSubject) return;
    const pendingProjects = chapterData.projects.filter(p => !p.completed);
    if (pendingProjects.length === 0) {
      toast.info('All projects already completed.');
      return;
    }
    const confirmResult = await Swal.fire({
      title: 'All Projects Completed?',
      text: `Mark all ${pendingProjects.length} pending projects as completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Complete All',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!confirmResult.isConfirmed) return;
    setActionLoading(`allproj_${index}`);
    try {
      await Promise.all(
        pendingProjects.map(proj =>
          axios.post(
            `${import.meta.env.VITE_API_URL}/syllabus-logs/project/complete`,
            {
              studentId,
              subjectId: selectedSubject._id,
              batchId,
              courseId,
              branchId,
              chapterId: ch._id,
              chapterName: ch.name || ch,
              projects: [{ projectId: proj._id, projectName: proj.name }],
              sessionDate: moment().format('YYYY-MM-DD'),
            },
            { withCredentials: true }
          )
        )
      );
      toast.success(`All ${pendingProjects.length} projects marked done!`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error('Failed to mark all projects');
    } finally {
      setActionLoading(null);
    }
  };


  // Stop a running chapter
  const handleStopChapter = async (ch, index) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Stop Chapter?',
      text: `Stop "${ch.name || ch}" for now? The start date and work history will stay visible.`,
      icon: 'warning',
      input: 'text',
      inputLabel: 'Reason for stopping',
      inputPlaceholder: 'e.g. Teacher on leave, need to pause...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Stop',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Please enter a reason for stopping.';
        }
      },
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    setActionLoading(`stop_${index}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/stop`,
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
      toast.success(`"${ch.name || ch}" stopped.`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to stop chapter');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetChapter = async (ch, index) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Reset Chapter?',
      text: `Reset "${ch.name || ch}" back to not started? Progress entries for this chapter will be cleared.`,
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Reason for reset',
      inputPlaceholder: 'Why do you need to restart this chapter?',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Please enter a reason for reset.';
      },
      customClass: { container: 'z-[9999]' },
    });
    if (!result.isConfirmed) return;
    setActionLoading(`reset_${index}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/reset`,
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
      toast.success(`"${ch.name || ch}" reset to not started.`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reset chapter');
    } finally {
      setActionLoading(null);
    }
  };

  // Undo a single project completion
  const handleUndoProject = async (ch, project, chIndex) => {
    if (!student || !selectedSubject) return;
    const result = await Swal.fire({
      title: 'Undo Project?',
      text: `Mark "${project.name}" as pending again?`,
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
    setActionLoading(`undoproj_${chIndex}_${project._id}`);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/project/undo`,
        {
          studentId,
          subjectId: selectedSubject._id,
          chapterId: ch._id,
          projectId: project._id,
        },
        { withCredentials: true }
      );
      toast.success(`"${project.name}" marked as pending.`);
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to undo project');
    } finally {
      setActionLoading(null);
    }
  };

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
    setActionLoading(`final_${finalCompleteIndex}`);
    setShowFinalCompleteModal(false);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/final-complete`,
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
      toast.success('Chapter completed and locked.');
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit final completion');
    } finally {
      setActionLoading(null);
      setFinalCompleteChapter(null);
      setFinalCompleteIndex(null);
    }
  };

  // Fetch change requests (super admin)
  const fetchChangeRequests = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/change-requests`,
        { withCredentials: true }
      );
      setChangeRequests(data.requests || []);
    } catch (e) {
      // silent
    }
  };

  // Approve or reject a change request
  const handleApproveRequest = async (reqId, action) => {      const isModification = changeRequests.find(r => r._id === reqId)?.type === 'modification';
      const confirmMsg = action === 'approved'
        ? isModification
          ? 'Approve this modification request? Chapter will be unlocked for editing.'
          : 'Approve this final completion request? Chapter will be marked as fully completed.'
        : 'Reject this request? Chapter will remain unchanged.';
    const result = await Swal.fire({
      title: action === 'approved' ? 'Approve Request?' : 'Reject Request?',
      text: confirmMsg,
      icon: action === 'approved' ? (isModification ? 'question' : 'success') : 'warning',
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
        `${import.meta.env.VITE_API_URL}/syllabus-logs/change-requests/${reqId}/approve`,
        { action, reviewNotes: result.value || '' },
        { withCredentials: true }
      );
      toast.success(`Request ${action} successfully.`);
      fetchChangeRequests();
      fetchChapterStatuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to process request.');
    }
  };

  const startDate = student ? getStudentStartDate(student) : null;
  const endDate = student ? getCourseEndDate(student, holidays, branchId) : null;
  const remaining = student
    ? getDaysRemainingText(student, holidays, branchId)
    : { text: '-', colorClass: 'bg-slate-100 text-slate-500' };
  const getActivityLabel = (text = '') => {
    const value = String(text || '').toLowerCase();
    if (value.includes('chapter stopped')) return 'Stop';
    if (value.includes('chapter reset')) return 'Reset';
    if (value.includes('all theory completed')) return 'Theory Complete';
    if (value.includes('final chapter completed')) return 'Lock Chapter';
    if (value.includes('chapter restarted')) return 'Restart';
    if (value.includes('chapter started') || value.includes('chapter session started')) return 'Start Chapter';
    if (value.includes('projects completed')) return 'Projects Done';
    return text || 'Activity';
  };

  const isLoading = loading;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-all"
              title="Back to student list"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white truncate">{student?.name || 'Loading...'}</h3>
                <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {student?.enrollmentNo || '—'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-indigo-100">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  {startDate ? startDate.format('DD-MM-YY') : '—'} → {endDate ? endDate.format('DD-MM-YY') : '—'}
                </span>
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${remaining.colorClass}`}>
                  {remaining.text}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchChapterStatuses}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 disabled:opacity-50 transition"
              title="Refresh chapter data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {selectedSubject?.name || ''}
            </span>
          </div>
        </div>
      </div>

      {/* Activity Log Panel (Super Admin) */}
      {showActivity && isSuperAdmin && activityLog.length > 0 && (
        <div className="border-b border-slate-100 bg-amber-50/40 p-4">
          <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5 mb-3">
            <History size={14} className="text-amber-600" /> Recent Activity (Last 30 Days)
          </h4>
          <div className="max-h-[200px] overflow-y-auto space-y-1.5">
            {activityLog.map((act, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-white rounded-lg p-2 border border-amber-100">
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700 whitespace-nowrap">
                  {moment(act.date).format('DD MMM')}
                </span>
                <span className="font-semibold text-slate-700 min-w-[80px]">{act.teacherName}</span>
                <span className="text-slate-500 flex-1">
                  {act.action}
                  {act.chapterName && <span className="font-semibold text-indigo-600"> — {act.chapterName}</span>}
                  {act.projectNames.length > 0 && (
                    <span className="text-emerald-600"> — projects: {act.projectNames.join(', ')}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-5 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-indigo-600 font-bold">
            <RefreshCw size={20} className="animate-spin" /> Loading chapter data…
          </div>
        ) : chapterStatuses.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 py-12 text-center">
            <BookMarked size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-400 text-sm">No chapters defined for this subject.</p>
            <p className="text-xs text-slate-400 mt-1">Add chapters in the subject editor first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chapterStatuses.map((chData, chIndex) => {
              const ch = chData.chapter;
              const status = chData.status;
              const isRunning = status === 'Running';
              const isCompleted = status === 'Completed';
              const isStopped = status === 'Stopped';
              const notStarted = !status;
              const projects = chData.projects || [];
              const chapterActivity = chData.activity || [];
              const chapterRequests = changeRequests.filter(r => String(r.chapterId) === String(ch._id));
              const completedCount = projects.filter(p => p.completed).length;
              const totalCount = projects.length;
              const canEditChapter = !chData.isLocked && (isRunning || isCompleted);
              const startMoment = chData.startedAt ? moment(chData.startedAt) : null;
              const completeMoment = chData.completedAt ? moment(chData.completedAt) : null;
              const chapterDurationDays = startMoment && completeMoment
                ? Math.max(1, completeMoment.clone().startOf('day').diff(startMoment.clone().startOf('day'), 'days') + 1)
                : null;
              const isLoadingAction = actionLoading && (actionLoading.includes(`start_${chIndex}`) || actionLoading.includes(`complete_${chIndex}`) || actionLoading.includes(`allproj_${chIndex}`));

              return (
                <div
                  key={ch._id || chIndex}
                  className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                    chData.isLocked
                      ? 'border-slate-300 bg-slate-50/30'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isRunning
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : isStopped
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Chapter Header */}
                  <div className={`px-4 py-3 flex items-center justify-between gap-3 ${
                    chData.isLocked ? 'bg-slate-100/50' : isCompleted ? 'bg-emerald-50/50' : isRunning ? 'bg-emerald-50/40' : isStopped ? 'bg-rose-50/50' : 'bg-slate-50/50'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isRunning
                          ? 'bg-emerald-100 text-emerald-700'
                          : isStopped
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                                                {chData.isLocked ? <Lock size={18} /> : isCompleted ? <Trophy size={18} /> : isRunning ? <Play size={18} /> : isStopped ? <X size={18} /> : <BookMarked size={18} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-base truncate">
                          {ch.name || `Chapter ${chIndex + 1}`}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {chData.isLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                              <CheckCircle2 size={10} /> Locked
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                              <CheckCircle2 size={10} /> Completed
                            </span>
                          ) : chData.changeRequestPending ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700">
                              <Clock size={10} /> Awaiting Approval
                            </span>
                          ) : isRunning ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                              <Play size={10} /> Running
                            </span>
                          ) : isStopped ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                              <X size={10} /> Stopped
                            </span>
                          ) : chData.startedBy || (chData.activity && chData.activity.length > 0) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                              <Clock size={10} /> Coming Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                              <Circle size={10} /> Not Started
                            </span>
                          )}
                          {chData.startedBy && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Started by {chData.startedBy}
                              {startMoment && ` ${startMoment.format('DD MMM YYYY')}`}
                            </span>
                          )}
                          {chData.stoppedAt && (
                            <span className="text-[10px] font-semibold text-rose-600">
                              Stopped {moment(chData.stoppedAt).format('DD MMM')} by {chData.stoppedBy || 'Teacher'}
                            </span>
                          )}
                          {chData.stopReason && (
                            <span className="text-[10px] font-semibold text-rose-500">
                              Reason: {chData.stopReason}
                            </span>
                          )}
                          {chData.completedBy && (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              · Completed by {chData.completedBy}
                              {completeMoment && ` ${completeMoment.format('DD MMM YYYY')}`}
                            </span>
                          )}
                          {chapterDurationDays && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                              <CalendarDays size={10} />
                              {chapterDurationDays} {chapterDurationDays === 1 ? 'day' : 'days'}
                            </span>
                          )}

                        </div>
                      </div>
                    </div>
                                        <div className="flex items-center gap-2 shrink-0">
                      {chData.isLocked ? (
                        <button
                          onClick={() => handleOpenIncompleteModal(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === `incomplete_${chIndex}` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          Request Unlock
                        </button>
                      ) : (notStarted || isStopped) && (
                        <button
                          onClick={() => handleStartChapter(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === `start_${chIndex}` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Play size={12} />
                          )}
                          {isStopped ? 'Start Again' : 'Start Chapter'}
                        </button>
                      )}
                      {!chData.isLocked && isCompleted && completedCount === totalCount && (
                        <button
                          onClick={() => handleOpenFinalComplete(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === `final_${chIndex}` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Trophy size={12} />
                          )}
                          Chapter All Completed
                        </button>
                      )}
                      {!chData.isLocked && isRunning && (
                        <>
                          <button
                            onClick={() => handleCompleteChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition active:scale-95"
                          >
                            {actionLoading === `complete_${chIndex}` ? (
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
                            {actionLoading === `stop_${chIndex}` ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <X size={12} />
                            )}
                            Stop
                          </button>
                          <button
                            onClick={() => handleResetChapter(ch, chIndex)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
                          >
                            {actionLoading === `reset_${chIndex}` ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            Reset
                          </button>
                        </>
                      )}
                      {/* ⚠️ Safety net: if chapter is Completed but NOT locked, show Stop/Reset so teacher can recover */}
                      {!chData.isLocked && (isCompleted || isStopped) && (
                        <button
                          onClick={() => handleResetChapter(ch, chIndex)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
                        >
                          {actionLoading === `reset_${chIndex}` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                      {(startMoment || completeMoment || chapterDurationDays) && (
                        <div className="mb-3 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-lg bg-indigo-50 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Started</p>
                            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
                              {startMoment ? startMoment.format('DD MMM YYYY') : 'Not started'}
                            </p>
                            {chData.startedBy && (
                              <p className="text-[10px] font-semibold text-slate-500">by {chData.startedBy}</p>
                            )}
                          </div>
                          <div className="rounded-lg bg-emerald-50 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Completed</p>
                            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
                              {completeMoment ? completeMoment.format('DD MMM YYYY') : 'Pending'}
                            </p>
                            {chData.completedBy && (
                              <p className="text-[10px] font-semibold text-slate-500">by {chData.completedBy}</p>
                            )}
                          </div>
                          <div className="rounded-lg bg-amber-50 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Time Taken</p>
                            <p className="mt-0.5 text-xs font-extrabold text-slate-800">
                              {chapterDurationDays
                                ? `${chapterDurationDays} ${chapterDurationDays === 1 ? 'day' : 'days'}`
                                : 'Pending'}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500">chapter completion</p>
                          </div>
                        </div>
                      )}
                  {/* Projects Section */}
                  {totalCount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <FolderCheck size={14} className="text-amber-600" />
                          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                            Projects ({completedCount}/{totalCount})
                          </span>
                        </div>
                        {canEditChapter && completedCount < totalCount && (
                          <button
                            onClick={() => handleCompleteAllProjects(ch, chData, chIndex)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition"
                          >
                            {actionLoading === `allproj_${chIndex}` ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <Check size={10} />
                            )}
                            All Projects Completed
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2 w-8">#</th>
                              <th className="px-3 py-2">Project Name</th>
                              <th className="px-3 py-2 text-center w-28">Status</th>
                              <th className="px-3 py-2 text-center w-36">Completed Date</th>
                              <th className="px-3 py-2 text-center w-28">Completed By</th>
                              {canEditChapter && <th className="px-3 py-2 text-center w-40">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projects.map((proj, pIdx) => {
                              const projLoading = actionLoading === `proj_${chIndex}_${proj._id}`;
                              return (
                                <tr key={proj._id || pIdx} className={`hover:bg-slate-50/50 transition ${
                                  proj.completed ? 'bg-emerald-50/30' : ''
                                }`}>
                                  <td className="px-3 py-2.5 font-mono font-bold text-slate-400">{pIdx + 1}</td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-700">{proj.name}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    {proj.completed ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold">
                                        <CheckCircle2 size={12} /> Done
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                                        <Circle size={12} /> Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-slate-500 font-semibold">
                                    {proj.completedAt
                                      ? moment(proj.completedAt).format('DD MMM YYYY')
                                      : proj.completed
                                      ? 'Done'
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-slate-500 font-semibold">
                                    {proj.completedBy || (proj.completed ? 'Teacher' : '—')}
                                  </td>
                                  {canEditChapter && (
                                    <td className="px-3 py-2.5 text-center">
                                      {proj.completed ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <span className="text-[10px] text-emerald-500 font-bold">✓ Completed</span>
                                          <button
                                            onClick={() => handleUndoProject(ch, proj, chIndex)}
                                            disabled={actionLoading !== null}
                                            className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition active:scale-95"
                                          >
                                            {actionLoading === `undoproj_${chIndex}_${proj._id}` ? (
                                              <RefreshCw size={9} className="animate-spin" />
                                            ) : (
                                              'Undo'
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="date"
                                            value={projectDate[`${ch._id}_${proj._id}`] || moment().format('YYYY-MM-DD')}
                                            onChange={e =>
                                              setProjectDate(prev => ({
                                                ...prev,
                                                [`${ch._id}_${proj._id}`]: e.target.value,
                                              }))
                                            }
                                            className="rounded border border-slate-200 px-1.5 py-1 text-[10px] font-semibold w-28 focus:outline-none focus:border-indigo-400"
                                          />
                                          <button
                                            onClick={() => handleMarkProjectDone(ch, proj, chIndex)}
                                            disabled={actionLoading !== null}
                                            className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95 whitespace-nowrap"
                                          >
                                            {projLoading ? (
                                              <RefreshCw size={10} className="animate-spin" />
                                            ) : (
                                              'Done'
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                            {projects.length === 0 && (
                              <tr>
                                <td colSpan={canEditChapter ? 6 : 5} className="py-4 text-center text-slate-400 font-semibold text-xs">
                                  No projects for this chapter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                    </div>

                    {isSuperAdmin && (
                      <aside className="rounded-lg border border-slate-200 bg-white/80 p-3 lg:self-start">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <History size={13} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              Chapter Activity
                            </span>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {chapterActivity.length + (isCompleted && chData.completedBy ? 1 : 0)}
                          </span>
                        </div>

                        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                          {isCompleted && chData.completedBy && (
                            <div className="rounded-md bg-emerald-50 px-2.5 py-2 text-[11px] leading-snug text-emerald-800">
                              <div className="flex items-center gap-1 font-extrabold">
                                <CheckCircle2 size={11} />
                                Theory Completed
                              </div>
                              <div className="mt-0.5 font-semibold text-emerald-700">
                                {moment(chData.completedAt).format('DD MMM YYYY')} by {chData.completedBy}
                              </div>
                            </div>
                          )}

                          {chapterActivity.map((act, aIdx) => (
                            <div key={aIdx} className="rounded-md bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-600">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700">
                                  {getActivityLabel(act.action)}
                                </span>
                                <span className="font-extrabold text-slate-700">{moment(act.date).format('DD MMM YYYY')}</span>
                              </div>
                              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                by {act.by || 'Teacher'}
                              </div>
                              {act.projects?.length > 0 && (
                                <div className="mt-1 font-semibold text-emerald-700">
                                  {act.projects.map(p => p.projectName || p.projectId).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}

                          {chapterActivity.length === 0 && !(isCompleted && chData.completedBy) && (
                            <div className="rounded-md border border-dashed border-slate-200 px-2.5 py-3 text-center text-[11px] font-semibold text-slate-400">
                              No activity yet
                            </div>
                          )}

                          {chapterRequests.length > 0 && (
                            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  Requests / Approval
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  {chapterRequests.length}
                                </span>
                              </div>
                              {chapterRequests.map((req) => (
                                <div key={req._id} className="rounded-md bg-violet-50 px-2.5 py-2 text-[11px] leading-snug text-slate-600">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-slate-700">
                                      {req.type === 'modification' ? 'Unlock Request' : 'Final Complete'}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                      req.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : req.status === 'rejected'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {req.status || 'pending'}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    by {req.requestedByName || 'Teacher'} {req.createdAt ? `on ${moment(req.createdAt).format('DD MMM YYYY')}` : ''}
                                  </div>
                                  {req.reason && (
                                    <div className="mt-1 rounded bg-white/80 px-2 py-1 text-[10px] italic text-slate-600">
                                      Teacher reason: {req.reason}
                                    </div>
                                  )}
                                  {(req.reviewedBy || req.reviewNotes) && (
                                    <div className="mt-1 text-[10px] text-slate-500">
                                      {req.reviewedBy && <span className="font-semibold">Reviewed by {req.reviewedBy}</span>}
                                      {req.reviewNotes && (
                                        <span className="block italic text-slate-500">Note: {req.reviewNotes}</span>
                                      )}
                                    </div>
                                  )}
                                  {req.status && req.status !== 'pending' && (
                                    <div className="mt-1 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">
                                      {req.status}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </aside>
                    )}
                  </div>

                  {/* Chapter Activity */}
                  {false && isSuperAdmin && (
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
                          {act.projects?.length > 0 && ` (${act.projects.map(p => p.projectName || p.projectId).join(', ')})`}
                        </span>
                      ))}

                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress Summary */}
        {!isLoading && chapterStatuses.length > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-indigo-600" />
              <span className="text-sm font-black text-indigo-800">Progress Summary</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                <p className="text-xl font-black text-indigo-700">
                  {chapterStatuses.filter(c => c.status === 'Completed').length}
                  <span className="text-sm font-semibold text-slate-400">/{chapterStatuses.length}</span>
                </p>
                <p className="text-[10px] font-bold text-slate-500">Chapters Done</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                <p className="text-xl font-black text-amber-600">
                  {chapterStatuses.filter(c => c.status === 'Running').length}
                </p>
                <p className="text-[10px] font-bold text-slate-500">In Progress</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                <p className="text-xl font-black text-emerald-600">
                  {chapterStatuses.reduce((sum, c) => sum + c.projects.filter(p => p.completed).length, 0)}
                  <span className="text-sm font-semibold text-slate-400">
                    /{chapterStatuses.reduce((sum, c) => sum + c.projects.length, 0)}
                  </span>
                </p>
                <p className="text-[10px] font-bold text-slate-500">Projects Done</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-100 p-3 text-center">
                <p className="text-xl font-black text-rose-600">
                  {chapterStatuses.reduce((sum, c) => sum + c.projects.filter(p => !p.completed).length, 0)}
                </p>
                <p className="text-[10px] font-bold text-slate-500">Pending</p>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Incomplete Chapter Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="bg-amber-100 p-3 rounded-full mb-3">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Request Chapter Unlock</h3>
              <p className="text-sm text-slate-500 mt-1">
                Request to unlock <span className="font-bold text-slate-800">{incompleteChapter?.name || ''}</span> so you can make changes.
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
      )}

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
                This will lock the chapter. Future changes will need Super Admin unlock approval.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Completion note *</label>
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
                Lock Chapter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin: Pending Change Requests Panel */}
      {/* Super Admin Pending Approvals (final_complete) */}
      {isSuperAdmin && (() => {
        const finalApprov = [];
        const modRequests = changeRequests.filter(r => r.type === 'modification');
        return (<>
        {finalApprov.length > 0 && (
        <div className="border-t border-slate-100 bg-violet-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
              <Clock size={14} className="text-violet-600" /> Pending Final Approvals ({finalApprov.length})
            </h4>
            <button
              onClick={fetchChangeRequests}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {finalApprov.map((req) => (
              <div key={req._id} className="bg-white rounded-xl border border-violet-100 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{req.chapterName}</span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">
                        Final Complete
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
    </div>
  );
};

export default StudentDetailView;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader, Lock, Save, Send, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

const emptyState = {
  open: false,
  password: '',
  loading: false,
  error: ''
};

const formatClock = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return '--:--:--';
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const ExamAttempt = () => {
  const { scheduleId, subjectId } = useParams();
  const navigate = useNavigate();
  const saveTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const [gate, setGate] = useState(emptyState);
  const [examData, setExamData] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({ mcq: {}, qa: {} });
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 2-Step Submit Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const clearTimers = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const loadExistingAnswers = (currentAttempt) => {
    const next = { mcq: {}, qa: {} };
    (currentAttempt?.answers || []).forEach((item) => {
      if (item.type === 'mcq') {
        next.mcq[String(item.questionIndex)] = item.selectedOption || '';
      } else if (item.type === 'qa') {
        next.qa[String(item.questionIndex)] = item.answerText || '';
      }
    });
    setAnswers(next);
  };

  const openExam = async (password) => {
    setGate((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/student-portal/exam-conduct/${scheduleId}/${subjectId}/open`,
        { password },
        { withCredentials: true }
      );

      setExamData(data);
      setAttempt(data.attempt || null);
      loadExistingAnswers(data.attempt);
      setLocked(!data.canEdit || Boolean(data.attempt?.isSubmitted));
      setStatusMessage(data.status === 'live' ? 'Exam open' : data.status === 'ended' ? 'Exam closed' : 'Exam not started yet');
      setGate({ open: true, password: '', loading: false, error: '' });

      const endAt = data.attempt?.expiresAt || data.window?.endAt || data.schedule?.timeRow?.personalExpiresAt;
      if (endAt) {
        const tick = () => {
          const diff = moment(endAt).diff(moment(), 'seconds');
          if (diff <= 0) {
            setRemainingSeconds(0);
            setLocked(true);
            return;
          }
          setRemainingSeconds(diff);
        };
        tick();
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(tick, 1000);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Exam open nahi hua';
      setGate((prev) => ({
        ...prev,
        open: false,
        loading: false,
        error: msg === 'Password is required' ? '' : msg
      }));
    }
  };

  useEffect(() => {
    openExam('');
    return () => clearTimers();
  }, [scheduleId, subjectId]);

  const totalQuestions = useMemo(() => {
    return (examData?.paper?.mcqs?.length || 0) + (examData?.paper?.questionAnswers?.length || 0);
  }, [examData]);

  const answeredCount = useMemo(() => {
    return Object.values(answers.mcq).filter(Boolean).length + Object.values(answers.qa).filter((value) => String(value || '').trim()).length;
  }, [answers]);

  const compileAnswers = () => {
    const mcqAnswers = (examData?.paper?.mcqs || []).map((item, index) => ({
      type: 'mcq',
      questionIndex: index + 1,
      selectedOption: answers.mcq[String(index + 1)] || '',
      answerText: '',
      marks: Number(item.marks) || 0
    }));
    const qaAnswers = (examData?.paper?.questionAnswers || []).map((item, index) => ({
      type: 'qa',
      questionIndex: index + 1,
      selectedOption: '',
      answerText: answers.qa[String(index + 1)] || '',
      marks: Number(item.marks) || 0
    }));
    return [...mcqAnswers, ...qaAnswers];
  };

  const saveDraft = async () => {
    if (!examData?.schedule?._id || !examData?.paper?._id || locked) return;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/student-portal/exam-conduct/${scheduleId}/${subjectId}/save`,
        { answers: compileAnswers() },
        { withCredentials: true }
      );
      setAttempt(data.attempt || null);
    } catch (error) {
      const message = error.response?.data?.message || 'Draft save failed';
      setStatusMessage(message);
    }
  };

  useEffect(() => {
    if (!examData?.paper || locked) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, examData, locked]);

  const handleSubmit = async () => {
    if (locked && !examData?.attempt?.isSubmitted) {
      // allow submit when time is over, but no further edits
    }

    setSubmitting(true);
    try {
      await saveDraft();
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/student-portal/exam-conduct/${scheduleId}/${subjectId}/submit`,
        {},
        { withCredentials: true }
      );
      setAttempt(data.attempt || null);
      setLocked(true);
      toast.success('Exam submitted successfully');
      setStatusMessage(`Answered ${data.attempt?.answeredCount || answeredCount} of ${data.attempt?.totalQuestions || totalQuestions}`);
      window.dispatchEvent(new Event('exam-status-updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmitConfirmation = () => {
    setConfirmStep(1);
    setUserAcknowledged(false);
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    await handleSubmit();
  };

  const renderSubmitConfirmModal = () => {
    if (!showConfirmModal) return null;

    const unattemptedCount = Math.max(0, totalQuestions - answeredCount);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all">
          {confirmStep === 1 ? (
            /* STEP 1 OF 2 */
            <div>
              <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-base">
                  <ShieldAlert size={20} />
                  Step 1 of 2: Confirm Answer Submission
                </div>
                <span className="text-xs bg-white/25 font-extrabold px-3 py-1 rounded-full text-white backdrop-blur-xs">
                  Step 1 / 2
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-sm font-semibold text-gray-700 leading-relaxed">
                  Are you sure you want to submit your exam? Please verify all your answered & unattempted questions before proceeding.
                </div>

                {/* Attempt Summary Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="text-xl font-black text-slate-800">{totalQuestions}</div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Total</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="text-xl font-black text-emerald-700">{answeredCount}</div>
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Attempted</div>
                  </div>
                  <div className={unattemptedCount > 0 ? "bg-rose-50 border border-rose-200 rounded-xl p-3" : "bg-slate-50 border border-slate-200 rounded-xl p-3"}>
                    <div className={unattemptedCount > 0 ? "text-xl font-black text-rose-700" : "text-xl font-black text-slate-700"}>
                      {unattemptedCount}
                    </div>
                    <div className={unattemptedCount > 0 ? "text-[11px] font-bold text-rose-600 uppercase tracking-wider mt-0.5" : "text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5"}>
                      Unattempted
                    </div>
                  </div>
                </div>

                {unattemptedCount > 0 && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs font-semibold">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning:</strong> You still have <strong>{unattemptedCount} unattempted question(s)</strong>. Unanswered questions will receive 0 marks.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Back & Review Answers
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold shadow-xs hover:bg-amber-700 transition cursor-pointer"
                  >
                    Proceed to Final Submit (Step 2)
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2 OF 2 (FINAL SUBMISSION CONFIRMATION) */
            <div>
              <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-base">
                  <CheckCircle2 size={20} />
                  Step 2 of 2: Final Submit Confirmation
                </div>
                <span className="text-xs bg-white/25 font-extrabold px-3 py-1 rounded-full text-white backdrop-blur-xs">
                  Final Step
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-900 space-y-1">
                  <p className="font-bold text-sm text-rose-950">🚨 Final Warning - Paper Lock</p>
                  <p>
                    Once you click <strong>"Yes, Final Submit Paper"</strong>, your exam will be locked permanently and you CANNOT change any answers after this.
                  </p>
                </div>

                <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 cursor-pointer text-xs font-bold text-gray-800 hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={userAcknowledged}
                    onChange={(e) => setUserAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>I have checked all my answers ({answeredCount}/{totalQuestions}) and confirm to submit my paper.</span>
                </label>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <ArrowLeft size={15} />
                    Back to Step 1
                  </button>
                  <button
                    type="button"
                    disabled={!userAcknowledged || submitting}
                    onClick={handleFinalSubmit}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-md hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submitting ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
                    Yes, Final Submit Paper
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    await openExam(gate.password);
  };

  const renderPasswordGate = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border overflow-hidden">
        <div className="px-5 py-4 border-b bg-blue-50">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <Lock size={18} />
            Exam Password
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Question paper open karne ke liye password enter karein.
          </p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
          <input
            type="password"
            value={gate.password}
            onChange={(e) => setGate((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Enter password"
            autoFocus
          />
          {gate.error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertCircle size={16} />
              {gate.error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate('/student/exam')}
              className="px-4 py-2 rounded border text-sm font-bold hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={gate.loading}
              className="px-4 py-2 rounded bg-primary text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2"
            >
              {gate.loading ? <Loader className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              Open
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!examData) {
    return (
      <>
        {renderPasswordGate()}
      </>
    );
  }

  const durationText = examData.paper?.duration || examData.schedule?.timeRow?.total || '-';

  return (
    <div className="space-y-6">
      {!gate.open && renderPasswordGate()}

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
              <Clock3 size={16} />
              Exam Running
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{examData.schedule?.examName || 'Exam'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {examData.paper?.subject?.name || 'Subject'}{examData.schedule?.course?.name ? ` - ${examData.schedule.course.name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              Duration: {durationText}
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              Answered: {answeredCount} / {totalQuestions}
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              Status: {locked ? 'Locked' : 'Editable'}
            </div>
          </div>
        </div>
        {remainingSeconds !== null && (
          <div className="mt-4 text-sm text-gray-700 flex items-center gap-2">
            <Clock3 size={16} className="text-blue-600" />
            Time left: {formatClock(remainingSeconds)}
          </div>
        )}
        {attempt?.startedAt && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-gray-600">
            <span>Actual start: <strong className="text-emerald-700">{moment(attempt.startedAt).format('DD/MM/YYYY, hh:mm:ss A')}</strong></span>
            <span>Personal end: <strong className="text-blue-700">{moment(attempt.expiresAt).format('DD/MM/YYYY, hh:mm:ss A')}</strong></span>
          </div>
        )}
        {statusMessage && (
          <div className="mt-3 text-sm text-gray-600">{statusMessage}</div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">MCQ Questions</h2>
          <div className="space-y-4">
            {(examData.paper?.mcqs || []).map((question, index) => (
              <div key={`mcq-${index}`} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-semibold text-gray-900">
                    {index + 1}. {question.question}
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 rounded px-2 py-1">
                    {question.marks} marks
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                  {(question.options || []).map((option, optionIndex) => {
                    const optionValue = String.fromCharCode(65 + optionIndex);
                    const selected = answers.mcq[String(index + 1)] === optionValue;
                    return (
                      <label
                        key={optionIndex}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 bg-white ${
                          locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'
                        } ${selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}
                      >
                        <input
                          type="radio"
                          name={`mcq-${index + 1}`}
                          value={optionValue}
                          checked={selected}
                          disabled={locked}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              mcq: { ...prev.mcq, [String(index + 1)]: optionValue }
                            }))
                          }
                        />
                        <span className="text-sm text-gray-800">{optionValue}. {option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {(examData.paper?.mcqs || []).length === 0 && (
              <div className="text-sm text-gray-400">No MCQ questions available.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Question Answer</h2>
          <div className="space-y-4">
            {(examData.paper?.questionAnswers || []).map((question, index) => (
              <div key={`qa-${index}`} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-semibold text-gray-900">
                    {index + 1}. {question.question}
                  </div>
                  <span className="text-xs font-bold text-green-700 bg-green-100 rounded px-2 py-1">
                    {question.marks} marks
                  </span>
                </div>
                <textarea
                  value={answers.qa[String(index + 1)] || ''}
                  disabled={locked}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      qa: { ...prev.qa, [String(index + 1)]: e.target.value }
                    }))
                  }
                  rows={4}
                  className="mt-3 w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-100"
                  placeholder="Answer / solution"
                />
              </div>
            ))}
            {(examData.paper?.questionAnswers || []).length === 0 && (
              <div className="text-sm text-gray-400">No question-answer section available.</div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600">
          Answers are saved automatically. Reload ke baad open karne par existing draft wapas mil jayega.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/student/exam')}
            className="px-4 py-2 border rounded text-sm font-bold hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={locked}
            className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded text-sm font-bold hover:bg-blue-100 disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Save size={16} />
            Save
          </button>
          <button
            type="button"
            onClick={openSubmitConfirmation}
            disabled={submitting || locked}
            className="px-5 py-2 bg-primary text-white rounded text-sm font-bold hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {submitting ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
            Save & Submit
          </button>
        </div>
      </section>

      {/* Render 2-Step Submit Confirmation Modal */}
      {renderSubmitConfirmModal()}
    </div>
  );
};

export default ExamAttempt;

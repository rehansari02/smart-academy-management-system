import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { AlertCircle, Clock3, Loader, Lock, Save, Send, ShieldCheck } from 'lucide-react';
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

      const endAt = data.window?.endAt || data.schedule?.timeRow?.endAt;
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
      setGate((prev) => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Exam open nahi hua'
      }));
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
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
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-primary text-white rounded text-sm font-bold hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2"
          >
            {submitting ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
            Save & Submit
          </button>
        </div>
      </section>
    </div>
  );
};

export default ExamAttempt;

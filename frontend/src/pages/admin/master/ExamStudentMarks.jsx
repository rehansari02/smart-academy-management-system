import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { Eye, Loader, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchExams, fetchExamSchedules } from '../../../features/master/masterSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN');
};

const getCourseName = (item) => item?.course?.name || item?.course?.shortName || 'Course';
const getSubjectName = (item) => item?.subject?.name || item?.subject?.printedName || 'Subject';

const ExamStudentMarks = () => {
  const dispatch = useDispatch();
  const { exams, examSchedules } = useSelector((state) => state.master);
  const [selectedExamName, setSelectedExamName] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchExamSchedules());
  }, [dispatch]);

  const examOptions = useMemo(() => {
    const map = new Map();
    const setOption = (name, date) => {
      const key = name.toLowerCase();
      const time = date ? new Date(date).getTime() : 0;
      const existing = map.get(key);
      if (!existing || time > existing.time) map.set(key, { name, time });
    };
    (exams || []).forEach((exam) => {
      const name = exam?.name?.trim();
      if (name) setOption(name, exam?.createdAt || exam?.updatedAt);
    });
    (examSchedules || []).forEach((schedule) => {
      const name = schedule?.examName?.trim();
      if (name) setOption(name, schedule?.createdAt || schedule?.updatedAt);
    });
    return [...map.values()].sort((a, b) => b.time - a.time || a.name.localeCompare(b.name)).map((item) => item.name);
  }, [exams, examSchedules]);

  const courseGroups = useMemo(() => {
    const map = new Map();
    attempts.forEach((attempt) => {
      const courseId = attempt.course?._id || attempt.course || 'no-course';
      if (!map.has(courseId)) {
        map.set(courseId, { courseId, courseName: getCourseName(attempt), rows: [] });
      }
      map.get(courseId).rows.push(attempt);
    });
    return [...map.values()].sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [attempts]);

  const loadAttempts = async (examName = selectedExamName) => {
    if (!examName) {
      setAttempts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}exam-student-marks`, { params: { examName } });
      setAttempts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load student exam marks');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (attemptId) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}exam-student-marks/${attemptId}`);
      setDetail(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load answer sheet');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Exam Student Marks</h2>
          <p className="mt-1 text-sm text-gray-500">Select an exam name to review student-wise subject attempts and submitted answers.</p>
        </div>
        <button type="button" onClick={() => loadAttempts()} disabled={!selectedExamName || loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mb-6 rounded-lg border-t-4 border-primary bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Select Exam Name</label>
            <select value={selectedExamName} onChange={(e) => { setSelectedExamName(e.target.value); loadAttempts(e.target.value); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">-- Select Exam --</option>
              {examOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{courseGroups.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Courses</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{attempts.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Attempts</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{attempts.filter((item) => item.isSubmitted).length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Submitted</div></div>
          </div>
        </div>
      </div>

      {!selectedExamName ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500 shadow-sm"><Search className="mx-auto mb-3 text-gray-400" size={32} /><p className="text-sm font-semibold">Select an exam name.</p></div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm"><Loader className="mr-2 animate-spin" size={20} /> Loading student marks...</div>
      ) : courseGroups.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-700">No student attempts found for this exam name.</div>
      ) : (
        <div className="space-y-5">
          {courseGroups.map((group) => (
            <section key={group.courseId} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-b bg-blue-600 px-4 py-3 text-white">
                <h3 className="text-base font-black">{group.courseName}</h3>
                <p className="mt-1 text-xs font-semibold text-blue-100">{group.rows.length} subject attempts</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500">
                    <tr><th className="px-3 py-2 text-center">#</th><th className="px-3 py-2">Reg No</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2 text-center">Answered</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2 text-center">View</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.rows.map((attempt, index) => (
                      <tr key={attempt._id} className="hover:bg-blue-50/40">
                        <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{index + 1}</td>
                        <td className="px-3 py-2 font-mono text-gray-700">{attempt.student?.regNo || '-'}</td>
                        <td className="px-3 py-2 font-bold text-primary">{attempt.student?.name || 'Student'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800">{getSubjectName(attempt)}</td>
                        <td className="px-3 py-2 text-center font-bold text-gray-700">{attempt.answeredCount || 0}/{attempt.totalQuestions || 0}</td>
                        <td className="px-3 py-2 text-center"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${attempt.isSubmitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{attempt.isSubmitted ? 'Submitted' : 'Draft'}</span></td>
                        <td className="px-3 py-2 text-gray-600">{formatDateTime(attempt.submittedAt || attempt.lastSavedAt)}</td>
                        <td className="px-3 py-2 text-center"><button type="button" onClick={() => openDetail(attempt._id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Eye size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-blue-600 px-5 py-4 text-white">
              <div>
                <h3 className="text-lg font-black">Answer Sheet</h3>
                {detail && <p className="text-xs font-semibold text-blue-100">{detail.student?.name} | {detail.course?.name} | {detail.subject?.name || detail.subject?.printedName}</p>}
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-full bg-white/20 p-1 hover:bg-white/30"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="flex min-h-[220px] items-center justify-center text-gray-500"><Loader className="mr-2 animate-spin" size={20} /> Loading answer sheet...</div>
              ) : detail ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">Answered</div><div className="text-lg font-black">{detail.answeredCount || 0}/{detail.totalQuestions || 0}</div></div>
                    <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">MCQ Correct</div><div className="text-lg font-black text-green-700">{detail.score?.mcqCorrectCount || 0}</div></div>
                    <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">MCQ Wrong</div><div className="text-lg font-black text-red-700">{detail.score?.mcqWrongCount || 0}</div></div>
                    <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">QA Answered</div><div className="text-lg font-black">{detail.score?.qaAnsweredCount || 0}</div></div>
                    <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">Marks</div><div className="text-lg font-black text-blue-700">{detail.score?.totalMarksObtained || 0}/{detail.score?.totalMarksPossible || 0}</div></div>
                  </div>

                  <section>
                    <h4 className="mb-3 text-sm font-black uppercase text-gray-700">MCQ Answers</h4>
                    <div className="space-y-3">
                      {detail.mcqs?.length ? detail.mcqs.map((q) => (
                        <div key={`mcq-${q.questionIndex}`} className="rounded-lg border p-4">
                          <div className="flex justify-between gap-3"><p className="font-bold text-gray-900">{q.questionIndex}. {q.question}</p><span className={`h-fit rounded-full px-2 py-1 text-[10px] font-black ${q.isCorrect ? 'bg-green-100 text-green-700' : q.selectedOption ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{q.isCorrect ? 'Correct' : q.selectedOption ? 'Wrong' : 'Not Answered'}</span></div>
                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{(q.options || []).map((option, idx) => { const letter = String.fromCharCode(65 + idx); return <div key={letter} className={`rounded border px-3 py-2 text-sm ${q.selectedOption === letter ? 'border-blue-400 bg-blue-50 font-bold' : 'bg-gray-50'}`}>{letter}. {option}</div>; })}</div>
                          <p className="mt-3 text-xs font-semibold text-gray-600">Selected: {q.selectedOption || '-'} | Correct: {q.correctOption || '-'}</p>
                        </div>
                      )) : <div className="rounded-lg border border-dashed p-5 text-center text-gray-400">No MCQ questions found.</div>}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 text-sm font-black uppercase text-gray-700">Question Answers</h4>
                    <div className="space-y-3">
                      {detail.questionAnswers?.length ? detail.questionAnswers.map((q) => (
                        <div key={`qa-${q.questionIndex}`} className="rounded-lg border p-4">
                          <p className="font-bold text-gray-900">{q.questionIndex}. {q.question}</p>
                          <div className="mt-3 rounded-lg border bg-blue-50 p-3"><div className="text-[10px] font-black uppercase text-blue-700">Student Answer</div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{q.answerText || '-'}</p></div>
                          <div className="mt-3 rounded-lg border bg-green-50 p-3"><div className="text-[10px] font-black uppercase text-green-700">Expected Answer</div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{q.expectedAnswer || '-'}</p></div>
                        </div>
                      )) : <div className="rounded-lg border border-dashed p-5 text-center text-gray-400">No question answers found.</div>}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamStudentMarks;

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Eye, 
  Loader, 
  RefreshCw, 
  Search, 
  ArrowLeft, 
  BookOpen, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  GraduationCap 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchExams, fetchExamSchedules } from '../../../features/master/masterSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const getCourseName = (item) => item?.course?.name || item?.course?.shortName || 'Course';
const getSubjectName = (item) => item?.subject?.name || item?.subject?.printedName || 'Subject';

const ExamStudentMarks = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { exams, examSchedules } = useSelector((state) => state.master);
  
  // URL Params State
  const selectedExamName = searchParams.get('examName') || '';
  const selectedCourseId = searchParams.get('courseId') || '';
  const selectedStudentId = searchParams.get('studentId') || '';

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

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
      const courseId = String(attempt.course?._id || attempt.course || 'no-course');
      if (!map.has(courseId)) {
        map.set(courseId, {
          courseId,
          course: attempt.course,
          courseName: getCourseName(attempt),
          rows: [],
          studentsMap: new Map()
        });
      }
      const group = map.get(courseId);
      group.rows.push(attempt);

      const studentId = String(attempt.student?._id || attempt.student?.regNo || 'unknown');
      if (!group.studentsMap.has(studentId)) {
        group.studentsMap.set(studentId, {
          student: attempt.student,
          studentId,
          attempts: []
        });
      }
      group.studentsMap.get(studentId).attempts.push(attempt);
    });

    return [...map.values()].map((g) => ({
      ...g,
      students: [...g.studentsMap.values()],
      totalStudents: g.studentsMap.size,
      totalAttempts: g.rows.length,
      submittedAttempts: g.rows.filter((r) => r.isSubmitted).length
    })).sort((a, b) => a.courseName.localeCompare(b.courseName));
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

  useEffect(() => {
    if (selectedExamName) {
      loadAttempts(selectedExamName);
    } else {
      setAttempts([]);
    }
  }, [selectedExamName]);

  // Current Active Course & Student Groups
  const currentCourseGroup = useMemo(() => {
    if (!selectedCourseId) return null;
    return courseGroups.find((g) => g.courseId === selectedCourseId) || null;
  }, [courseGroups, selectedCourseId]);

  const currentStudentGroup = useMemo(() => {
    if (!currentCourseGroup || !selectedStudentId) return null;
    return currentCourseGroup.students.find((s) => s.studentId === selectedStudentId) || null;
  }, [currentCourseGroup, selectedStudentId]);

  // Filtered Students in Current Course
  const filteredStudents = useMemo(() => {
    if (!currentCourseGroup) return [];
    if (!studentSearchQuery.trim()) return currentCourseGroup.students;
    const q = studentSearchQuery.toLowerCase();
    return currentCourseGroup.students.filter((s) => {
      const name = s.student?.name || '';
      const regNo = s.student?.regNo || '';
      const mobile = s.student?.mobile || '';
      return name.toLowerCase().includes(q) || regNo.toLowerCase().includes(q) || mobile.toLowerCase().includes(q);
    });
  }, [currentCourseGroup, studentSearchQuery]);

  // Navigation Handlers
  const handleExamChange = (examName) => {
    const params = new URLSearchParams();
    if (examName) params.set('examName', examName);
    setSearchParams(params);
  };

  const handleSelectCourse = (courseId) => {
    const params = new URLSearchParams(searchParams);
    params.set('courseId', courseId);
    params.delete('studentId');
    setSearchParams(params);
    setStudentSearchQuery('');
  };

  const handleBackToCourses = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('courseId');
    params.delete('studentId');
    setSearchParams(params);
    setStudentSearchQuery('');
  };

  const handleSelectStudent = (studentId) => {
    const params = new URLSearchParams(searchParams);
    params.set('studentId', studentId);
    setSearchParams(params);
  };

  const handleBackToStudents = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('studentId');
    setSearchParams(params);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap className="text-primary" size={28} /> Exam Student Marks
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Course-wise student list, subject marks and submitted answer sheets.
          </p>
        </div>
        <button 
          type="button" 
          onClick={() => loadAttempts()} 
          disabled={!selectedExamName || loading} 
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} /> Refresh
        </button>
      </div>

      {/* Exam Selector Box */}
      <div className="rounded-2xl border-t-4 border-primary bg-white p-5 shadow-sm border">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
              Select Exam Name
            </label>
            <select 
              value={selectedExamName} 
              onChange={(e) => handleExamChange(e.target.value)} 
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            >
              <option value="">-- Select Exam --</option>
              {examOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          {selectedExamName && (
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl border bg-blue-50/50 px-4 py-2">
                <div className="text-lg font-black text-blue-700">{courseGroups.length}</div>
                <div className="text-[10px] font-bold uppercase text-gray-500">Courses</div>
              </div>
              <div className="rounded-xl border bg-indigo-50/50 px-4 py-2">
                <div className="text-lg font-black text-indigo-700">
                  {courseGroups.reduce((acc, g) => acc + g.totalStudents, 0)}
                </div>
                <div className="text-[10px] font-bold uppercase text-gray-500">Students</div>
              </div>
              <div className="rounded-xl border bg-emerald-50/50 px-4 py-2">
                <div className="text-lg font-black text-emerald-700">
                  {attempts.filter((item) => item.isSubmitted).length}
                </div>
                <div className="text-[10px] font-bold uppercase text-gray-500">Submitted</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Body with Level 1, 2, or 3 depending on selection */}
      {!selectedExamName ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-gray-500 shadow-sm">
          <Search className="mx-auto mb-3 text-gray-400" size={36} />
          <p className="text-base font-bold text-gray-700">Please select an Exam Name to view courses and student marks.</p>
          <p className="text-xs text-gray-400 mt-1">Select an exam from the dropdown above.</p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm border">
          <Loader className="mr-2 animate-spin text-primary" size={24} /> Loading exam student marks...
        </div>
      ) : courseGroups.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-700 font-medium">
          No student attempts or submitted papers found for this exam name.
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* LEVEL 3: STUDENT SUBJECTS & MARKS VIEW */}
          {/* ========================================================================= */}
          {currentStudentGroup ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Breadcrumb & Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <span className="text-primary hover:underline cursor-pointer" onClick={handleBackToCourses}>
                    {selectedExamName}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-primary hover:underline cursor-pointer" onClick={handleBackToStudents}>
                    {currentCourseGroup?.courseName}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                    {currentStudentGroup.student?.name || 'Student'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStudents}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
                >
                  <ArrowLeft size={14} /> Back to Student List
                </button>
              </div>

              {/* Student Profile Card */}
              <div className="rounded-2xl border bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Student Details
                    </span>
                    <h3 className="text-2xl font-black mt-2">
                      {currentStudentGroup.student?.name || 'Student'}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-blue-100 font-medium">
                      <span>Reg No: <strong className="text-white font-mono">{currentStudentGroup.student?.regNo || '-'}</strong></span>
                      <span>Mobile: <strong className="text-white">{currentStudentGroup.student?.mobile || '-'}</strong></span>
                      <span>Branch: <strong className="text-white">{currentStudentGroup.student?.branchName || '-'}</strong></span>
                      <span>Course: <strong className="text-white">{currentCourseGroup?.courseName}</strong></span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3.5 text-center min-w-[140px]">
                    <div className="text-2xl font-black">{currentStudentGroup.attempts.length}</div>
                    <div className="text-[10px] uppercase font-bold text-blue-200">Papers Scheduled</div>
                  </div>
                </div>
              </div>

              {/* Subject Papers Table */}
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="border-b bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Subject Papers & Answer Sheets
                  </h4>
                  <span className="text-xs font-semibold text-gray-500">
                    {currentStudentGroup.attempts.length} Subjects
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">#</th>
                        <th className="px-4 py-3">Subject / Paper Name</th>
                        <th className="px-4 py-3 text-center">Answered Questions</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Submission Date & Time</th>
                        <th className="px-4 py-3 text-center">View Paper</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {currentStudentGroup.attempts.map((attempt, idx) => (
                        <tr key={attempt._id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 text-sm">
                            {getSubjectName(attempt)}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-md">
                              {attempt.answeredCount || 0} / {attempt.totalQuestions || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${attempt.isSubmitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {attempt.isSubmitted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {attempt.isSubmitted ? 'Submitted' : 'Draft / In Progress'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {formatDateTime(attempt.submittedAt || attempt.lastSavedAt)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/master/exam-student-marks/${attempt._id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                              title="Open Answer Sheet / Paper"
                            >
                              <Eye size={14} /> View Paper
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : currentCourseGroup ? (
            /* ========================================================================= */
            /* LEVEL 2: STUDENT LIST FOR SELECTED COURSE */
            /* ========================================================================= */
            <div className="space-y-6 animate-fadeIn">
              {/* Breadcrumb & Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <span className="text-primary hover:underline cursor-pointer" onClick={handleBackToCourses}>
                    {selectedExamName}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                    {currentCourseGroup.courseName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToCourses}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
                >
                  <ArrowLeft size={14} /> Back to Courses
                </button>
              </div>

              {/* Course Banner */}
              <div className="rounded-2xl border bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Course Enrolled Students
                    </span>
                    <h3 className="text-2xl font-black mt-2">
                      {currentCourseGroup.courseName}
                    </h3>
                    <p className="text-xs text-blue-100 mt-1">
                      Exam: <strong>{selectedExamName}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3 text-center min-w-[110px]">
                      <div className="text-xl font-black">{currentCourseGroup.totalStudents}</div>
                      <div className="text-[10px] uppercase font-bold text-blue-200">Students</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-3 text-center min-w-[110px]">
                      <div className="text-xl font-black">{currentCourseGroup.totalAttempts}</div>
                      <div className="text-[10px] uppercase font-bold text-blue-200">Total Papers</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Students Search and Table */}
              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="border-b bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search student name, reg no, mobile..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    Showing {filteredStudents.length} of {currentCourseGroup.totalStudents} Students
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">#</th>
                        <th className="px-4 py-3">Reg No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Contact / Mobile</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3 text-center">Papers / Attempts</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s, idx) => {
                          const student = s.student;
                          const submittedCount = s.attempts.filter((a) => a.isSubmitted).length;
                          const totalAttempts = s.attempts.length;

                          return (
                            <tr key={s.studentId || idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono font-bold text-gray-700">{student?.regNo || '-'}</td>
                              <td className="px-4 py-3 font-bold text-primary text-sm">{student?.name || 'Student'}</td>
                              <td className="px-4 py-3 text-gray-600 font-medium">{student?.mobile || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{student?.branchName || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${submittedCount === totalAttempts ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {submittedCount}/{totalAttempts} Submitted
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectStudent(s.studentId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                                  title="View Student Subject Marks"
                                >
                                  <Eye size={14} /> View Marks
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-gray-400 italic">
                            No students match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LEVEL 1: COURSE GROUPS OVERVIEW */
            /* ========================================================================= */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                  <BookOpen className="text-primary" size={20} /> Courses in this Exam ({courseGroups.length})
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  Click 'View Students' to explore course-wise student marks
                </span>
              </div>

              <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase text-gray-600 tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5 text-center w-14">Serial No</th>
                      <th className="px-6 py-3.5">Course Name</th>
                      <th className="px-6 py-3.5 text-center">Total Students</th>
                      <th className="px-6 py-3.5 text-center">Subject Attempts</th>
                      <th className="px-6 py-3.5 text-center">Submitted Papers</th>
                      <th className="px-6 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {courseGroups.map((group, index) => (
                      <tr key={group.courseId} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-gray-400">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-sm">{group.courseName}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Exam: {selectedExamName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                            <Users size={13} /> {group.totalStudents} Students
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                            {group.totalAttempts} Papers
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={13} /> {group.submittedAttempts} Submitted
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectCourse(group.courseId)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
                            title="View Course Students"
                          >
                            <Eye size={15} /> View Students
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExamStudentMarks;

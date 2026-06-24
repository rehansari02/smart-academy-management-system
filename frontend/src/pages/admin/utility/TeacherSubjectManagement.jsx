import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { fetchCourses, fetchBatches } from '../../../features/master/masterSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import {
  UserCheck,
  UserPlus,
  UserMinus,
  RefreshCw,
  BookOpenCheck,
  Layers,
  GraduationCap,
  Search,
  Users,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Filter,
  Trash2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   TeacherSubjectManagement
   Super Admin assigns Faculty employees to Batch → Course → Subject combos.
   Style mirrors the User Rights page.
───────────────────────────────────────────────────────────────────────────── */
const TeacherSubjectManagement = () => {
  const dispatch = useDispatch();

  // User Rights Permissions
  const { view, add, delete: canDelete } = useUserRights('Teacher Subject Management');

  // ── Redux ──────────────────────────────────────────────────────────────────
  const { employees }                       = useSelector(s => s.employees);
  const { courses, batches: reduxBatches }  = useSelector(s => s.master);

  // ── All batches (fetched directly - no branch filter for super admin) ──────
  const [allBatches, setAllBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedBatchId,   setSelectedBatchId]   = useState('');
  const [selectedCourseId,  setSelectedCourseId]  = useState('');

  // ── Teacher's existing assignments (fetched per teacher) ──────────────────
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // ── Save state ─────────────────────────────────────────────────────────────
  const [savingSubjectId, setSavingSubjectId] = useState(null); // which subject is saving
  const [removingKey,     setRemovingKey]     = useState(null); // "empId-batchId-courseId-subjectId"

  // ── Search ─────────────────────────────────────────────────────────────────
  const [teacherSearch, setTeacherSearch] = useState('');

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchEmployees({ isActive: true }));
    dispatch(fetchCourses());
    setBatchesLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/master/batch`, { withCredentials: true })
      .then(res => setAllBatches(Array.isArray(res.data) ? res.data : res.data.batches || []))
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setBatchesLoading(false));
  }, [dispatch]);

  // ── Active Faculty/Teachers ────────────────────────────────────────────────
  const activeTeachers = useMemo(() =>
    employees.filter(e =>
      e.isActive && !e.isDeleted &&
      (e.type === 'Teacher' || e.type === 'Faculty' ||
       (e.role && (e.role.toLowerCase().includes('teacher') || e.role.toLowerCase().includes('faculty'))))
    ), [employees]
  );

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return activeTeachers;
    const q = teacherSearch.toLowerCase();
    return activeTeachers.filter(t => t.name.toLowerCase().includes(q));
  }, [activeTeachers, teacherSearch]);

  // ── Selected teacher object ────────────────────────────────────────────────
  const selectedTeacher = useMemo(
    () => employees.find(e => e._id === selectedTeacherId) || null,
    [employees, selectedTeacherId]
  );

  // ── Courses filtered by selected batch ────────────────────────────────────
  const filteredCourses = useMemo(() => {
    if (!selectedBatchId) return [];
    const batch = allBatches.find(b => b._id === selectedBatchId);
    if (!batch) return [];
    const activeCourseIds = new Set(
      Object.keys(batch.courseCounts || {}).filter(cId => (batch.courseCounts[cId] || 0) > 0)
    );
    return courses.filter(c => activeCourseIds.has(c._id.toString()));
  }, [selectedBatchId, allBatches, courses]);

  // ── Subjects of selected course ────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    if (!selectedCourseId) return [];
    const course = courses.find(c => c._id === selectedCourseId);
    if (!course) return [];
    return (course.subjects || [])
      .filter(s => s.subject)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [selectedCourseId, courses]);

  // ── Fetch teacher assignments whenever teacher changes ─────────────────────
  useEffect(() => {
    if (!selectedTeacherId) { setTeacherAssignments([]); return; }
    setAssignmentsLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/master/teacher-subject/employee/${selectedTeacherId}`, { withCredentials: true })
      .then(res => setTeacherAssignments(res.data?.assignments || []))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setAssignmentsLoading(false));
  }, [selectedTeacherId]);

  // ── Check if a subject is already assigned ────────────────────────────────
  const isAssigned = (subjectId) => {
    return teacherAssignments.some(
      a =>
        String(a.batchId?._id || a.batchId)   === String(selectedBatchId) &&
        String(a.courseId?._id || a.courseId)  === String(selectedCourseId) &&
        String(a.subjectId?._id || a.subjectId) === String(subjectId)
    );
  };

  // ── Assign teacher to subject ──────────────────────────────────────────────
  const handleAssign = async (subjectId, subjectName) => {
    if (!selectedTeacherId || !selectedBatchId || !selectedCourseId) {
      toast.warn('Please select Teacher, Batch and Course first.');
      return;
    }
    setSavingSubjectId(subjectId);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/assign`,
        { employeeId: selectedTeacherId, batchId: selectedBatchId, courseId: selectedCourseId, subjectId },
        { withCredentials: true }
      );
      toast.success(`${subjectName} assigned!`);
      // Refresh
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/employee/${selectedTeacherId}`,
        { withCredentials: true }
      );
      setTeacherAssignments(res.data?.assignments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setSavingSubjectId(null);
    }
  };

  // ── Remove teacher from subject ────────────────────────────────────────────
  const handleRemove = async (subjectId, subjectName) => {
    if (!window.confirm(`Remove "${subjectName}" assignment from ${selectedTeacher?.name}?`)) return;
    const key = `${selectedTeacherId}-${selectedBatchId}-${selectedCourseId}-${subjectId}`;
    setRemovingKey(key);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/remove`,
        { data: { employeeId: selectedTeacherId, batchId: selectedBatchId, courseId: selectedCourseId, subjectId }, withCredentials: true }
      );
      toast.success('Assignment removed.');
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/employee/${selectedTeacherId}`,
        { withCredentials: true }
      );
      setTeacherAssignments(res.data?.assignments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally {
      setRemovingKey(null);
    }
  };

  // ── Remove ALL assignments for teacher ─────────────────────────────────────
  const handleClearAll = async () => {
    if (!selectedTeacherId) return;
    if (!window.confirm(`Remove ALL assignments from ${selectedTeacher?.name}? This cannot be undone.`)) return;
    try {
      // Remove each assignment one by one
      for (const a of teacherAssignments) {
        await axios.delete(
          `${import.meta.env.VITE_API_URL}/master/teacher-subject/remove`,
          {
            data: {
              employeeId: selectedTeacherId,
              batchId:   a.batchId?._id   || a.batchId,
              courseId:  a.courseId?._id  || a.courseId,
              subjectId: a.subjectId?._id || a.subjectId
            },
            withCredentials: true
          }
        );
      }
      toast.success('All assignments cleared.');
      setTeacherAssignments([]);
    } catch (err) {
      toast.error('Failed to clear some assignments.');
    }
  };

  const selectedBatch  = allBatches.find(b => b._id === selectedBatchId)  || null;
  const selectedCourse = courses.find(c => c._id === selectedCourseId)    || null;

  if (!view) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to view Teacher Subject Management.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserCheck className="text-emerald-600" size={28} />
            Teacher Subject Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Assign Faculty to Batch → Course → Subject combinations
          </p>
        </div>
        {canDelete && selectedTeacherId && teacherAssignments.length > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 size={15} /> Clear All Assignments
          </button>
        )}
      </div>

      {/* ── Filter Section ────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-md border-t-4 border-emerald-500 space-y-4">

        {/* Row 1: Teacher + Batch + Course */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Teacher Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Teacher / Faculty
            </label>
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={e => { setSelectedTeacherId(e.target.value); }}
                className="w-full h-10 appearance-none border border-gray-200 rounded-lg pl-3 pr-8 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              >
                <option value="">-- Select Teacher --</option>
                {activeTeachers.length === 0 && (
                  <option disabled>No Faculty employees found</option>
                )}
                {activeTeachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Batch Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Batch
            </label>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={e => { setSelectedBatchId(e.target.value); setSelectedCourseId(''); }}
                className="w-full h-10 appearance-none border border-gray-200 rounded-lg pl-3 pr-8 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              >
                <option value="">-- Select Batch --</option>
                {batchesLoading && <option disabled>Loading...</option>}
                {allBatches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Course Dropdown */}
          <div>
            <label className={`block text-sm font-semibold mb-1 ${!selectedBatchId ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Course
            </label>
            <div className="relative">
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                disabled={!selectedBatchId}
                className="w-full h-10 appearance-none border border-gray-200 rounded-lg pl-3 pr-8 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Course --</option>
                {filteredCourses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {selectedBatchId && filteredCourses.length === 0 && (
              <p className="text-xs text-amber-600 font-semibold mt-1">No active courses in this batch.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content: Two-column like UserRights ──────────────────────── */}
      {selectedTeacherId && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">

          {/* Selected teacher info bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-700 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white font-black text-base">
                {selectedTeacher?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-white">{selectedTeacher?.name}</p>
                <p className="text-xs font-semibold text-emerald-200">{selectedTeacher?.type} · {selectedTeacher?.email || 'No email'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-emerald-100">
              {assignmentsLoading ? (
                <span className="flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Loading assignments...</span>
              ) : (
                <span className="rounded-full bg-white/20 px-3 py-1">
                  {teacherAssignments.length} Total Assignment{teacherAssignments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Context breadcrumb */}
          {(selectedBatch || selectedCourse) && (
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-500">
              {selectedBatch && (
                <span className="flex items-center gap-1.5">
                  <Layers size={12} className="text-indigo-400" />
                  Batch: <span className="text-slate-800">{selectedBatch.name}</span>
                </span>
              )}
              {selectedBatch && selectedCourse && <span className="text-slate-300">›</span>}
              {selectedCourse && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={12} className="text-emerald-500" />
                  Course: <span className="text-slate-800">{selectedCourse.name}</span>
                </span>
              )}
              {selectedCourse && (
                <span className="ml-auto flex items-center gap-1 text-emerald-700">
                  <BookOpenCheck size={12} />
                  {filteredSubjects.length} Subject{filteredSubjects.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* ── Subject Table ── */}
          {selectedCourseId ? (
            filteredSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BookOpenCheck size={48} className="text-slate-200 mb-3" />
                <p className="font-bold">No subjects found in this course.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold w-8 text-center">#</th>
                      <th className="py-3 px-4 font-semibold">Subject Name</th>
                      <th className="py-3 px-4 font-semibold text-center">Days</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((sub, idx) => {
                      const subjectId   = sub.subject._id;
                      const subjectName = sub.subject.name;
                      const assigned    = isAssigned(subjectId);
                      const isSaving    = savingSubjectId === subjectId;
                      const isRemoving  = removingKey === `${selectedTeacherId}-${selectedBatchId}-${selectedCourseId}-${subjectId}`;

                      return (
                        <tr
                          key={subjectId}
                          className={`border-b border-gray-100 text-sm transition-colors ${assigned ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                        >
                          {/* Order */}
                          <td className="py-3 px-4 text-center text-xs font-bold text-gray-400">
                            {sub.sortOrder || idx + 1}
                          </td>

                          {/* Subject name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <BookOpenCheck size={14} className={assigned ? 'text-emerald-500' : 'text-slate-300'} />
                              <span className={`font-semibold ${assigned ? 'text-slate-900' : 'text-gray-700'}`}>
                                {subjectName}
                              </span>
                            </div>
                            {sub.subject.topicName && (
                              <p className="text-xs text-slate-400 pl-6 mt-0.5">{sub.subject.topicName}</p>
                            )}
                          </td>

                          {/* Days */}
                          <td className="py-3 px-4 text-center text-xs font-bold text-slate-500">
                            {sub.subject.daysToComplete || 0}d
                          </td>

                          {/* Status badge */}
                          <td className="py-3 px-4 text-center">
                            {assigned ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                                <CheckCircle2 size={11} /> Assigned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                                <XCircle size={11} /> Not Assigned
                              </span>
                            )}
                          </td>

                          {/* Action button */}
                          <td className="py-3 px-4 text-center">
                            {assigned ? (
                              <button
                                onClick={() => handleRemove(subjectId, subjectName)}
                                disabled={isRemoving || !canDelete}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                              >
                                {isRemoving ? <RefreshCw size={11} className="animate-spin" /> : <UserMinus size={11} />}
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAssign(subjectId, subjectName)}
                                disabled={isSaving || !add}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                              >
                                {isSaving ? <RefreshCw size={11} className="animate-spin" /> : <UserPlus size={11} />}
                                Assign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* No course selected yet — show all assignments for this teacher */
            <div className="p-5">
              <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Filter size={13} /> All Assignments for {selectedTeacher?.name}
              </h4>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" /> Loading...
                </div>
              ) : teacherAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users size={48} className="text-slate-200 mb-3" />
                  <p className="font-bold text-sm">No subjects assigned yet</p>
                  <p className="text-xs font-semibold text-slate-300 mt-1">
                    Select a Batch and Course above to assign subjects
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4 text-left">#</th>
                        <th className="py-3 px-4 text-left">Batch</th>
                        <th className="py-3 px-4 text-left">Course</th>
                        <th className="py-3 px-4 text-left">Subject</th>
                        <th className="py-3 px-4 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {teacherAssignments.map((a, idx) => {
                        const bName = a.batchId?.name   || a.batchId;
                        const cName = a.courseId?.name  || a.courseId;
                        const sName = a.subjectId?.name || a.subjectId;
                        const bId   = a.batchId?._id    || a.batchId;
                        const cId   = a.courseId?._id   || a.courseId;
                        const sId   = a.subjectId?._id  || a.subjectId;
                        const key   = `${selectedTeacherId}-${bId}-${cId}-${sId}`;
                        return (
                          <tr key={key} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                <Layers size={11} /> {bName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                <GraduationCap size={11} /> {cName}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <BookOpenCheck size={13} className="text-indigo-400 shrink-0" />
                                {sName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Remove "${sName}" from ${selectedTeacher?.name}?`)) return;
                                  setRemovingKey(key);
                                  try {
                                    await axios.delete(
                                      `${import.meta.env.VITE_API_URL}/master/teacher-subject/remove`,
                                      { data: { employeeId: selectedTeacherId, batchId: bId, courseId: cId, subjectId: sId }, withCredentials: true }
                                    );
                                    toast.success('Removed.');
                                    setTeacherAssignments(prev => prev.filter((_, i) => i !== idx));
                                  } catch (err) {
                                    toast.error('Failed to remove.');
                                  } finally {
                                    setRemovingKey(null);
                                  }
                                }}
                                disabled={removingKey === key || !canDelete}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                                title="Remove"
                              >
                                {removingKey === key ? <RefreshCw size={12} className="animate-spin" /> : <UserMinus size={12} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer bar */}
          {selectedCourseId && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
              <span className="text-xs text-slate-400 font-semibold">
                * Assign or remove subjects for <b>{selectedTeacher?.name}</b> in <b>{selectedBatch?.name}</b> › <b>{selectedCourse?.name}</b>
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {filteredSubjects.filter(s => isAssigned(s.subject._id)).length} / {filteredSubjects.length} Assigned
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no teacher selected */}
      {!selectedTeacherId && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <UserCheck size={56} className="text-emerald-200 mb-4" />
          <h3 className="text-lg font-black text-slate-400">Select a Teacher to Begin</h3>
          <p className="text-sm font-semibold text-slate-300 mt-1.5 max-w-xs">
            Choose a Faculty member from the dropdown above, then pick a Batch and Course to assign subjects.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherSubjectManagement;

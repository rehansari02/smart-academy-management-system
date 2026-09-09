import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCourses,
  fetchFinalExamQuestionPapers,
  deleteFinalExamQuestionPaper,
  fetchFinalExamQuestionPaperAccess,
  saveFinalExamQuestionPaperAccess,
  resetMasterStatus
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Eye, Loader, Lock, Plus, RefreshCw, Search, Trash2, Eye as EyeIcon, EyeOff } from 'lucide-react';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const FinalExamQuestionPaper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courses, finalExamQuestionPapers, finalExamQuestionPaperAccess, isLoading, isSuccess, message } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { add, delete: canDelete } = useUserRights('Final Exam Question Paper');
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  const [filters, setFilters] = useState({ courseId: '' });
  const [passwordForm, setPasswordForm] = useState('');
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [accessEnabled, setAccessEnabled] = useState(false);

  const coursePaperRows = useMemo(() => {
    const rows = finalExamQuestionPapers.filter((paper) => {
      if (!filters.courseId) return true;
      return String(paper.course?._id || paper.course) === String(filters.courseId);
    });

    return rows.map((paper) => ({
      ...paper,
      courseId: paper.course?._id || paper.course || paper._id,
      courseName: paper.course?.name
        || courses.find((course) => String(course._id) === String(paper.course?._id || paper.course))?.name
        || '-'
    }));
  }, [courses, finalExamQuestionPapers, filters.courseId]);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchFinalExamQuestionPapers());
  }, [dispatch]);

  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchFinalExamQuestionPaperAccess());
    }
  }, [dispatch, isSuperAdmin]);

  useEffect(() => {
    if (isSuccess && message) {
      toast.success(message);
      dispatch(resetMasterStatus());
    }
  }, [dispatch, isSuccess, message]);

  useEffect(() => {
    if (isSuperAdmin) {
      setPasswordForm(finalExamQuestionPaperAccess?.password || '');
      setAccessEnabled(Boolean(finalExamQuestionPaperAccess?.isEnabled));
    }
  }, [finalExamQuestionPaperAccess?.isEnabled, finalExamQuestionPaperAccess?.password, isSuperAdmin]);

  const openAddForm = () => {
    if (!add) {
      showPermissionDenied("You don't have authority to add question papers.");
      return;
    }
    navigate('/master/final-exam-question-paper/add');
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete question papers.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this question paper?')) {
      dispatch(deleteFinalExamQuestionPaper(id));
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin) {
      showPermissionDenied("You don't have authority to set final exam password.");
      return;
    }
    if (accessEnabled && !passwordForm.trim()) {
      toast.error('Password enter karein');
      return;
    }

    const result = await dispatch(saveFinalExamQuestionPaperAccess({
      password: accessEnabled ? passwordForm.trim() : '',
      isEnabled: accessEnabled
    }));
    if (saveFinalExamQuestionPaperAccess.fulfilled.match(result)) {
      toast.success('Final exam password saved');
      setPasswordForm(result.payload?.password || passwordForm.trim());
      setAccessEnabled(Boolean(result.payload?.isEnabled));
      if (!result.payload?.isEnabled) {
        setShowSavedPassword(false);
      }
    } else {
      toast.error(result.payload || 'Password save nahi hua');
    }
  };

  const applyFilters = () => dispatch(fetchFinalExamQuestionPapers(filters));
  const resetFilters = () => {
    const nextFilters = { courseId: '' };
    setFilters(nextFilters);
    dispatch(fetchFinalExamQuestionPapers(nextFilters));
  };

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="view">
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Question Bank</h1>
            <p className="text-sm text-gray-500">Course select karke subjects ke question papers manage karein.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isSuperAdmin && (
              <form onSubmit={handleSavePassword} className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-800">
                  <input
                    type="checkbox"
                    checked={accessEnabled}
                    onChange={(e) => setAccessEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-primary focus:ring-primary"
                  />
                  Password Required
                </label>
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-blue-700" />
                  <input
                    type={showSavedPassword ? 'text' : 'password'}
                    value={passwordForm}
                    onChange={(e) => setPasswordForm(e.target.value)}
                    disabled={!accessEnabled}
                    className="w-44 rounded border border-blue-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100"
                    placeholder={accessEnabled ? 'Set password' : 'Disabled'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSavedPassword((prev) => !prev)}
                    className="rounded p-1 text-blue-700 hover:bg-blue-100"
                    title={showSavedPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSavedPassword ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
                <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">
                  Save
                </button>
              </form>
            )}
            {add && (
              <button onClick={openAddForm} className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow text-sm font-bold">
                <Plus size={18} /> Add Question Paper
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
          <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <Search size={14} /> Filter Question Papers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 font-semibold">Course</label>
              <select value={filters.courseId} onChange={(e) => setFilters({ ...filters, courseId: e.target.value })} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Courses</option>
                {courses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={resetFilters} className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm font-bold flex items-center gap-1">
                <RefreshCw size={14} /> Reset
              </button>
              <button onClick={applyFilters} className="bg-primary text-white flex-1 px-3 py-2 rounded hover:bg-blue-800 text-sm font-bold flex justify-center items-center gap-2">
                <Search size={14} /> Search
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto border">
          <table className="w-full border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3 border w-16 text-center">Sr No</th>
                <th className="p-3 border">Course</th>
                <th className="p-3 border text-center w-44">Configured Subjects</th>
                <th className="p-3 border text-center w-28">Status</th>
                <th className="p-3 border text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coursePaperRows.length ? coursePaperRows.map((paper, index) => (
                <tr key={paper._id} className="hover:bg-blue-50 text-sm border-b border-gray-100">
                  <td className="p-3 border text-center font-medium text-gray-600">{index + 1}</td>
                  <td className="p-3 border">
                    <button
                      type="button"
                      onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}`)}
                      className="font-bold text-gray-900 hover:text-indigo-700 hover:underline text-left flex items-center gap-1.5"
                      title="View Course Subjects"
                    >
                      {paper.courseName}
                    </button>
                  </td>
                  <td className="p-3 border text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs border border-blue-200">
                      {paper.subjects?.length || 0} Subjects
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${paper.isActive !== false ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                      {paper.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}`)}
                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                        title="View & Manage Subjects"
                      >
                        <Eye size={14} /> View Subjects
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(paper._id)}
                          className="inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-all shadow-sm"
                          title="Delete Course Question Paper"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400">
                    No question papers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default FinalExamQuestionPaper;

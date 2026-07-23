import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCourses,
  fetchFinalExamQuestionPapers,
  createFinalExamQuestionPaper,
  updateFinalExamQuestionPaper,
  deleteFinalExamQuestionPaper,
  fetchFinalExamQuestionPaperAccess,
  saveFinalExamQuestionPaperAccess,
  resetMasterStatus
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Edit, Eye, FileQuestion, Loader, Lock, Plus, RefreshCw, Save, Search, Trash2, X, Eye as EyeIcon, EyeOff } from 'lucide-react';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const emptyMcq = () => ({ question: '', options: ['', '', '', ''], correctAnswer: '', marks: 1 });
const emptyQuestionAnswer = () => ({ question: '', answer: '', marks: 1 });

const getSubjectId = (row) => row?.subject?._id || row?.subject;
const buildSubjectRows = (course, existingSubjects = []) => {
  const existingBySubject = new Map(
    (existingSubjects || []).map((item) => [String(getSubjectId(item)), item])
  );

  const courseSubjects = [...(course?.subjects || [])]
    .filter((item) => item.subject)
    .filter((item) => {
      const name = String(item.subject?.name || item.subject?.printedName || '').toLowerCase();
      return !name.includes('project') && !name.includes('discipline');
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return courseSubjects.map((item) => {
    const subject = item.subject;
    const saved = existingBySubject.get(String(subject._id));
    return {
      subject: subject._id,
      subjectName: subject.name,
      duration: saved?.duration || '',
      mcqs: saved?.mcqs?.length ? saved.mcqs.map((mcq) => ({
        question: mcq.question || '',
        options: [...(mcq.options || []), '', '', '', ''].slice(0, 4),
        correctAnswer: mcq.correctAnswer || '',
        marks: mcq.marks || 1
      })) : [emptyMcq()],
      questionAnswers: saved?.questionAnswers?.length ? saved.questionAnswers.map((qa) => ({
        question: qa.question || '',
        answer: qa.answer || '',
        marks: qa.marks || 1
      })) : [emptyQuestionAnswer()]
    };
  });
};

const FinalExamQuestionPaper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courses, finalExamQuestionPapers, finalExamQuestionPaperAccess, isLoading, isSuccess, message } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { add, edit, delete: canDelete } = useUserRights('Final Exam Question Paper');
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  const [filters, setFilters] = useState({ courseId: '' });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [passwordForm, setPasswordForm] = useState('');
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [accessEnabled, setAccessEnabled] = useState(false);
  const [form, setForm] = useState({
    title: '',
    course: '',
    subjects: [],
    remarks: '',
    isActive: true
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course._id) === String(form.course)),
    [courses, form.course]
  );

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
      closeForm();
    }
  }, [dispatch, isSuccess, message]);

  useEffect(() => {
    if (isSuperAdmin) {
      setPasswordForm(finalExamQuestionPaperAccess?.password || '');
      setAccessEnabled(Boolean(finalExamQuestionPaperAccess?.isEnabled));
    }
  }, [finalExamQuestionPaperAccess?.isEnabled, finalExamQuestionPaperAccess?.password, isSuperAdmin]);

  const resetForm = () => {
    setForm({
      title: '',
      course: '',
      subjects: [],
      remarks: '',
      isActive: true
    });
    setEditId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((item) => String(item._id) === String(courseId));
    setForm((prev) => ({
      ...prev,
      course: courseId,
      subjects: buildSubjectRows(course)
    }));
  };

  const openAddForm = () => {
    if (!add) {
      showPermissionDenied("You don't have authority to add question papers.");
      return;
    }
    navigate('/master/final-exam-question-paper/add');
  };

  const openEditForm = (paper) => {
    if (!edit) {
      showPermissionDenied("You don't have authority to edit question papers.");
      return;
    }
    const courseId = paper.course?._id || paper.course;
    const course = courses.find((item) => String(item._id) === String(courseId));
    setEditId(paper._id);
    setForm({
      title: paper.title || '',
      course: courseId || '',
      subjects: buildSubjectRows(course, paper.subjects),
      remarks: paper.remarks || '',
      isActive: paper.isActive !== false
    });
    setShowForm(true);
  };

  const updateSubjectField = (subjectIndex, type, questionIndex, field, value, optionIndex = null) => {
    setForm((prev) => {
      const subjects = [...prev.subjects];
      const questionRows = [...subjects[subjectIndex][type]];
      const row = { ...questionRows[questionIndex] };

      if (field === 'options') {
        const options = [...row.options];
        options[optionIndex] = value;
        row.options = options;
      } else {
        row[field] = value;
      }

      questionRows[questionIndex] = row;
      subjects[subjectIndex] = { ...subjects[subjectIndex], [type]: questionRows };
      return { ...prev, subjects };
    });
  };

  const updateSubjectMeta = (subjectIndex, field, value) => {
    setForm((prev) => {
      const subjects = [...prev.subjects];
      subjects[subjectIndex] = { ...subjects[subjectIndex], [field]: value };
      return { ...prev, subjects };
    });
  };

  const addQuestionRow = (subjectIndex, type) => {
    setForm((prev) => {
      const subjects = [...prev.subjects];
      subjects[subjectIndex] = {
        ...subjects[subjectIndex],
        [type]: [...subjects[subjectIndex][type], type === 'mcqs' ? emptyMcq() : emptyQuestionAnswer()]
      };
      return { ...prev, subjects };
    });
  };

  const removeQuestionRow = (subjectIndex, type, questionIndex) => {
    setForm((prev) => {
      const subjects = [...prev.subjects];
      const rows = subjects[subjectIndex][type].filter((_, index) => index !== questionIndex);
      subjects[subjectIndex] = {
        ...subjects[subjectIndex],
        [type]: rows.length ? rows : [type === 'mcqs' ? emptyMcq() : emptyQuestionAnswer()]
      };
      return { ...prev, subjects };
    });
  };

  const cleanSubjectsForSave = () => form.subjects.map((subjectRow) => ({
    subject: subjectRow.subject,
    duration: subjectRow.duration || '',
    mcqs: subjectRow.mcqs
      .filter((mcq) => mcq.question.trim())
      .map((mcq) => ({
        question: mcq.question.trim(),
        options: mcq.options.map((option) => option.trim()).filter(Boolean),
        correctAnswer: mcq.correctAnswer.trim(),
        marks: Number(mcq.marks) || 1
      })),
    questionAnswers: subjectRow.questionAnswers
      .filter((qa) => qa.question.trim())
      .map((qa) => ({
        question: qa.question.trim(),
        answer: qa.answer.trim(),
        marks: Number(qa.marks) || 1
      }))
  }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (editId ? !edit : !add) {
      showPermissionDenied(`You don't have authority to ${editId ? 'edit' : 'add'} question papers.`);
      return;
    }
    if (!form.title.trim() || !form.course) {
      toast.error('Title and course are required');
      return;
    }

    const payload = { ...form, examName: 'Final Exam', subjects: cleanSubjectsForSave() };
    if (editId) {
      dispatch(updateFinalExamQuestionPaper({ id: editId, data: payload }));
    } else {
      dispatch(createFinalExamQuestionPaper(payload));
    }
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
          {/* <p className="text-sm text-gray-500">Course wise subjects ke MCQ aur question-answer paper manage karein.</p> */}
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
        <table className="w-full border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-3 border w-16 text-center">Sr No</th>
              <th className="p-3 border">Course</th>
              <th className="p-3 border text-center">Subjects</th>
              <th className="p-3 border text-center">Status</th>
              <th className="p-3 border text-center w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coursePaperRows.length ? coursePaperRows.map((paper, index) => (
              <tr key={paper._id} className="hover:bg-blue-50 text-sm border-b border-gray-100">
                <td className="p-3 border text-center">{index + 1}</td>
                <td className="p-3 border">
                  <button
                    type="button"
                    onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}`)}
                    className="font-bold text-gray-900 hover:text-indigo-700 hover:underline text-left"
                    title="Show Subjects"
                  >
                    {paper.courseName}
                  </button>
                </td>
                <td className="p-3 border text-center">{paper.subjects?.length || 0}</td>
                <td className="p-3 border text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${paper.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    {paper.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="p-3 border">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}`)} className="text-indigo-600 hover:text-indigo-800" title="Show Subjects"><Eye size={17} /></button>
                    {edit && <button onClick={() => openEditForm(paper)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit size={17} /></button>}
                    {canDelete && <button onClick={() => handleDelete(paper._id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={17} /></button>}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">No question papers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-auto my-4 overflow-hidden">
            <div className="bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileQuestion size={20} /> {editId ? 'Update Question Paper' : 'Add Question Paper'}
              </h2>
              <button onClick={closeForm} className="text-white hover:text-red-200"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Paper Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. ADCA Final Exam Paper" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Course *</label>
                  <select value={form.course} onChange={(e) => handleCourseChange(e.target.value)} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Select Course</option>
                    {courses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedCourse && form.subjects.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
                  Selected course me subjects linked nahi hain. Pehle Course Master me subjects add karein.
                </div>
              )}

              {form.subjects.map((subjectRow, subjectIndex) => (
                <section key={subjectRow.subject} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <h3 className="font-bold text-gray-800">{subjectIndex + 1}. {subjectRow.subjectName}</h3>
                      <span className="text-xs text-gray-500">MCQ: {subjectRow.mcqs.length} | Q&A: {subjectRow.questionAnswers.length}</span>
                    </div>
                    <div className="mt-3 max-w-xs">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Time Duration</label>
                      <input
                        value={subjectRow.duration || ''}
                        onChange={(e) => updateSubjectMeta(subjectIndex, 'duration', e.target.value)}
                        className="w-full border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 2 Hours"
                      />
                    </div>
                  </div>

                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-blue-700 uppercase">MCQs</h4>
                        <button type="button" onClick={() => addQuestionRow(subjectIndex, 'mcqs')} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded font-bold hover:bg-blue-100">
                          <Plus size={13} className="inline" /> Add MCQ
                        </button>
                      </div>
                      <div className="space-y-3">
                        {subjectRow.mcqs.map((mcq, questionIndex) => (
                          <div key={questionIndex} className="border border-gray-200 rounded p-3 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_34px] gap-2">
                              <input value={mcq.question} onChange={(e) => updateSubjectField(subjectIndex, 'mcqs', questionIndex, 'question', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder={`MCQ Question ${questionIndex + 1}`} />
                              <input type="number" min="1" value={mcq.marks} onChange={(e) => updateSubjectField(subjectIndex, 'mcqs', questionIndex, 'marks', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder="Marks" />
                              <button type="button" onClick={() => removeQuestionRow(subjectIndex, 'mcqs', questionIndex)} className="text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                              {mcq.options.map((option, optionIndex) => (
                                <input key={optionIndex} value={option} onChange={(e) => updateSubjectField(subjectIndex, 'mcqs', questionIndex, 'options', e.target.value, optionIndex)} className="border p-2 rounded text-xs bg-white" placeholder={`Option ${optionIndex + 1}`} />
                              ))}
                            </div>
                            <input value={mcq.correctAnswer} onChange={(e) => updateSubjectField(subjectIndex, 'mcqs', questionIndex, 'correctAnswer', e.target.value)} className="border p-2 rounded text-xs bg-white mt-2 w-full md:w-1/2" placeholder="Correct Answer" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-green-700 uppercase">Question Answer</h4>
                        <button type="button" onClick={() => addQuestionRow(subjectIndex, 'questionAnswers')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded font-bold hover:bg-green-100">
                          <Plus size={13} className="inline" /> Add Q&A
                        </button>
                      </div>
                      <div className="space-y-3">
                        {subjectRow.questionAnswers.map((qa, questionIndex) => (
                          <div key={questionIndex} className="border border-gray-200 rounded p-3 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_34px] gap-2">
                              <input value={qa.question} onChange={(e) => updateSubjectField(subjectIndex, 'questionAnswers', questionIndex, 'question', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder={`Question ${questionIndex + 1}`} />
                              <input type="number" min="1" value={qa.marks} onChange={(e) => updateSubjectField(subjectIndex, 'questionAnswers', questionIndex, 'marks', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder="Marks" />
                              <button type="button" onClick={() => removeQuestionRow(subjectIndex, 'questionAnswers', questionIndex)} className="text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                            <textarea value={qa.answer} onChange={(e) => updateSubjectField(subjectIndex, 'questionAnswers', questionIndex, 'answer', e.target.value)} rows="2" className="border p-2 rounded text-sm bg-white mt-2 w-full" placeholder="Answer / solution" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ))}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows="2" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-5 h-5" />
                Is Active?
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={closeForm} className="px-5 py-2 border rounded hover:bg-gray-100 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={isLoading} className="bg-primary text-white px-7 py-2 rounded hover:bg-blue-800 text-sm font-bold flex items-center gap-2 disabled:opacity-70">
                  {isLoading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                  {editId ? 'Update Paper' : 'Save Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default FinalExamQuestionPaper;

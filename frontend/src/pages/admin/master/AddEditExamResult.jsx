import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchExamSchedules, 
  fetchBatches, 
  fetchExamResults, 
  fetchCourses,
  createExamResult, 
  updateExamResult, 
  resetMasterStatus, 
  fetchNextResultNumbers, 
  fetchExamScheduleDetails,
  fetchExamResultById
} from '../../../features/master/masterSlice';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Search, 
  X, 
  ChevronDown, 
  Award, 
  Calendar, 
  Hash, 
  BookOpen, 
  GraduationCap, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Check, 
  Sparkles,
  Layers,
  Percent
} from 'lucide-react';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const toDateInputValue = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
};

const csrFromSomNumber = (value) => {
  const somNumber = String(value || '').trim();
  if (!somNumber) return '';
  return `CSR-${somNumber.replace(/^(SOM-|CSR-)+/i, '').replace(/^(LEGACY-)+/i, '')}`;
};

const AddEditExamResult = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from route params (if in edit mode)
  const isEditMode = !!id;

  const { 
    courses,
    examSchedules, 
    examScheduleDetails, 
    examResults,
    nextResultNumbers, 
    isSuccess, 
    message, 
    isLoading 
  } = useSelector((state) => state.master);

  // Form cascading dropdown states
  const [selectedExamNameForm, setSelectedExamNameForm] = useState('');
  const [isFormExamDropdownOpen, setIsFormExamDropdownOpen] = useState(false);
  const [formExamSearch, setFormExamSearch] = useState('');
  const [selectedCourseIdForm, setSelectedCourseIdForm] = useState('');
  const [isFormCourseDropdownOpen, setIsFormCourseDropdownOpen] = useState(false);
  const [formCourseSearch, setFormCourseSearch] = useState('');
  const [isFormStudentDropdownOpen, setIsFormStudentDropdownOpen] = useState(false);
  const [formStudentSearch, setFormStudentSearch] = useState('');

  // Dropdown container refs for outside-click dismissal
  const examDropdownRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const studentDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target)) {
        setIsFormExamDropdownOpen(false);
      }
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setIsFormCourseDropdownOpen(false);
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
        setIsFormStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Setup
  const { register, handleSubmit, reset, setValue, watch, control } = useForm({
    defaultValues: {
      examId: '',
      studentId: '',
      somNumber: '',
      csrNumber: '',
      certificateNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      grade: '',
      isActive: true,
      subjectMarks: []
    }
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "subjectMarks"
  });

  const selectedExamId = watch('examId');
  const selectedStudentId = watch('studentId');
  const somNumberValue = watch('somNumber');
  
  const subjectMarksValues = useWatch({
    control,
    name: 'subjectMarks'
  });

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchExamSchedules());
    dispatch(fetchCourses());
    dispatch(fetchBatches());
    dispatch(fetchExamResults());
    if (!isEditMode) {
      dispatch(fetchNextResultNumbers());
    } else {
      // In edit mode, load the single exam result
      dispatch(fetchExamResultById(id))
        .unwrap()
        .then((result) => {
          setValue('studentId', result.student?._id || result.student);
          setValue('examId', result.exam?._id || result.exam);
          setValue('somNumber', result.somNumber || '');
          setValue('csrNumber', result.csrNumber || '');
          setValue('certificateNumber', result.certificateNumber || '');
          setValue('issueDate', toDateInputValue(result.issueDate || result.createdAt));
          setValue('grade', result.grade || '');
          setValue('isActive', result.isActive !== undefined ? result.isActive : true);

          // Get cascading dropdown states matching the result
          if (result.exam) {
            setSelectedExamNameForm(result.exam.examName || '');
            if (result.course) {
              setSelectedCourseIdForm(result.course._id || result.course);
            }
          }

          // Load subject marks
          if (result.subjectMarks) {
          const marks = result.subjectMarks.map(s => ({
              subjectId: s.subject?._id || s.subject,
              subjectName: s.subject?.name || 'Subject',
              theory: s.theory || 0,
              practical: s.practical || 0,
              total: s.total || 0,
              maxMarks: s.maxMarks || 100
            }));
            replace(marks);
          }
        })
        .catch((err) => {
          toast.error("Failed to load exam result details: " + err);
          navigate('/master/exam-result');
        });
    }
  }, [dispatch, id, isEditMode, setValue, navigate]);

  // Mirror CSR number and certificate number to the SOM serial.
  useEffect(() => {
    if (somNumberValue) {
      const convertedCsr = csrFromSomNumber(somNumberValue);
      setValue('csrNumber', convertedCsr);
      setValue('certificateNumber', convertedCsr);
    }
  }, [somNumberValue, setValue]);

  // Handle successful save/edit
  useEffect(() => {
    if (isSuccess && message) {
      toast.success(message);
      dispatch(resetMasterStatus());
      navigate('/master/exam-result');
    }
  }, [isSuccess, message, dispatch, navigate]);

  // Set next result numbers for new entries
  useEffect(() => {
    if (nextResultNumbers && !isEditMode) {
      setValue('somNumber', nextResultNumbers.somNumber);
      setValue('csrNumber', nextResultNumbers.csrNumber);
    }
  }, [nextResultNumbers, isEditMode, setValue]);

  // Handle Exam Selection Change - Load subjects and details
  useEffect(() => {
    if (selectedExamId) {
      dispatch(fetchExamScheduleDetails(selectedExamId));
      
      if (!isEditMode) {
        // Try to find in existing list first for immediate feedback
        const selectedExam = examSchedules.find(e => e._id === selectedExamId);
        if (selectedExam && selectedExam.timeTable && selectedExam.timeTable.length > 0) {
          const initialMarks = selectedExam.timeTable.map(item => ({
            subjectId: item.subject?._id || item.subject,
            subjectName: item.subject?.name || 'Subject',
            theory: 0,
            practical: 0,
            total: 0,
            maxMarks: item.total || 100
          }));
          replace(initialMarks);
        }
      }
    }
  }, [selectedExamId, examSchedules, isEditMode, dispatch, replace]);

  // Update subjectMarks when full exam details are loaded (handles 7+ subjects case)
  useEffect(() => {
    if (examScheduleDetails && !isEditMode && String(examScheduleDetails._id) === String(selectedExamId) && !selectedStudentId) {
      if (examScheduleDetails.timeTable && examScheduleDetails.timeTable.length > 0) {
        const initialMarks = examScheduleDetails.timeTable.map(item => ({
          subjectId: item.subject?._id || item.subject,
          subjectName: item.subject?.name || 'Subject',
          theory: 0,
          practical: 0,
          total: 0,
          maxMarks: item.total || 100
        }));
        replace(initialMarks);
      }
    }
  }, [examScheduleDetails, isEditMode, replace, selectedExamId, selectedStudentId]);

  useEffect(() => {
    if (isEditMode || !selectedExamId || !selectedStudentId || !selectedExamNameForm || !selectedCourseIdForm) return;

    let cancelled = false;
    const loadAttemptMarks = async () => {
      try {
        const { data } = await axios.get(`${API_URL}exam-result/attempt-marks`, {
          params: {
            examId: selectedExamId,
            examName: selectedExamNameForm,
            courseId: selectedCourseIdForm,
            studentId: selectedStudentId
          }
        });

        if (cancelled) return;

        const marks = (data.subjects || []).map((subject) => ({
          subjectId: subject.subjectId,
          subjectName: subject.subjectName || 'Subject',
          theory: Number(subject.theory) || 0,
          practical: Number(subject.practical) || 0,
          total: Number(subject.total) || 0,
          maxMarks: Number(subject.maxMarks) || 100,
          attempted: Boolean(subject.attempted)
        }));

        if (marks.length > 0) {
          replace(marks);
          if (marks.some((item) => item.attempted)) {
            toast.success('Student online exam marks loaded in theory column.');
          } else {
            toast.info('Subjects loaded. No submitted online marks found for this student.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || 'Failed to load online exam marks.');
        }
      }
    };

    loadAttemptMarks();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, selectedExamId, selectedStudentId, selectedExamNameForm, selectedCourseIdForm, replace]);

  const activeExamSchedules = useMemo(() => {
    return (examSchedules || []).filter(e => e && e.isActive !== false && !e.isDeleted && e.course && e.examName);
  }, [examSchedules]);

  const uniqueExamNames = useMemo(() => {
    const names = new Set();
    activeExamSchedules.forEach(e => {
      const name = (e.examName || '').trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [activeExamSchedules]);

  const coursesForSelectedExamName = useMemo(() => {
    if (!selectedExamNameForm) return [];
    const targetExam = selectedExamNameForm.trim().toLowerCase();
    const coursesMap = new Map();
    activeExamSchedules
      .filter(e => (e.examName || '').trim().toLowerCase() === targetExam)
      .forEach(e => {
        const courseId = e.course?._id || e.course;
        if (courseId) {
          const courseIdStr = String(courseId);
          if (!coursesMap.has(courseIdStr)) {
            let courseName = typeof e.course === 'object' && e.course?.name ? e.course.name : '';
            if (!courseName && Array.isArray(courses)) {
              const found = courses.find(c => String(c._id) === courseIdStr);
              if (found) courseName = found.name;
            }
            if (!courseName) {
              courseName = e.courseName || 'Course';
            }
            coursesMap.set(courseIdStr, {
              _id: courseIdStr,
              name: courseName
            });
          }
        }
      });
    return Array.from(coursesMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [selectedExamNameForm, activeExamSchedules, courses]);

  const existingResultStudentIds = useMemo(() => {
    if (isEditMode) return new Set();

    const targetExamId = String(selectedExamId || '');
    const targetCourseId = String(selectedCourseIdForm || '');
    const targetExamName = (selectedExamNameForm || '').trim().toLowerCase();

    return new Set((examResults || [])
      .filter(result => {
        const resultExamId = String(result.exam?._id || result.exam || '');
        const resultCourseId = String(result.course?._id || result.course || '');
        
        if (targetExamId && resultExamId === targetExamId) return true;
        if (targetCourseId && resultCourseId === targetCourseId) {
          const resultExamName = (result.exam?.examName || '').trim().toLowerCase();
          if (resultExamName && targetExamName && resultExamName === targetExamName) {
            return true;
          }
          if (!targetExamId) return true;
        }
        return false;
      })
      .map(result => String(result.student?._id || result.student || ''))
      .filter(Boolean));
  }, [examResults, selectedExamId, selectedCourseIdForm, selectedExamNameForm, isEditMode]);

  const availableAttendees = useMemo(() => {
    const attendees = examScheduleDetails?.attendees || [];
    if (isEditMode) return attendees;
    return attendees.filter(student => {
      const sId = String(student._id || '');
      if (student.hasResult) return false;
      if (existingResultStudentIds.has(sId)) return false;
      return true;
    });
  }, [examScheduleDetails, existingResultStudentIds, isEditMode]);

  const searchedAvailableAttendees = useMemo(() => {
    const search = formStudentSearch.toLowerCase().trim();
    return availableAttendees.filter(student => {
      const name = (student.studentName || '').toLowerCase();
      const regNo = (student.regNo || '').toLowerCase();
      return name.includes(search) || regNo.includes(search);
    });
  }, [availableAttendees, formStudentSearch]);

  // Calculate totals and percentage
  const totals = useMemo(() => {
    if (!subjectMarksValues) return { obtained: 0, total: 0, percentage: 0 };
    const obtained = subjectMarksValues.reduce((sum, s) => sum + (Number(s.theory) || 0) + (Number(s.practical) || 0), 0);
    const total = subjectMarksValues.reduce((sum, s) => sum + (Number(s.maxMarks) || 100), 0);
    const percentage = total > 0 ? (obtained / total) * 100 : 0;
    
    return { obtained, total, percentage };
  }, [subjectMarksValues]);

  // Auto-calculate grade based on percentage
  useEffect(() => {
    if (totals.percentage !== undefined) {
      let calculatedGrade = '';
      const pct = totals.percentage;
      if (pct >= 80) calculatedGrade = 'DISTINCTION';
      else if (pct >= 60) calculatedGrade = 'FIRST';
      else if (pct >= 50) calculatedGrade = 'SECOND';
      else if (pct >= 34) calculatedGrade = 'THIRD';
      else calculatedGrade = 'FAIL';
      
      setValue('grade', calculatedGrade);
    }
  }, [totals.percentage, setValue]);

  const currentSelectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return (examScheduleDetails?.attendees || []).find(s => String(s._id) === String(selectedStudentId)) || null;
  }, [selectedStudentId, examScheduleDetails]);

  const currentSelectedCourse = useMemo(() => {
    if (!selectedCourseIdForm) return null;
    return coursesForSelectedExamName.find(c => String(c._id) === String(selectedCourseIdForm)) || null;
  }, [selectedCourseIdForm, coursesForSelectedExamName]);

  const getGradeBadge = (grade) => {
    const g = String(grade || '').toUpperCase();
    if (g.includes('DISTINCTION')) {
      return { bg: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500', label: 'DISTINCTION' };
    }
    if (g.includes('FIRST')) {
      return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', label: 'FIRST CLASS' };
    }
    if (g.includes('SECOND')) {
      return { bg: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500', label: 'SECOND CLASS' };
    }
    if (g.includes('THIRD')) {
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500', label: 'THIRD CLASS' };
    }
    return { bg: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500', label: g || 'FAIL' };
  };

  const adjustMark = (index, field, delta) => {
    const currentVal = Number(watch(`subjectMarks.${index}.${field}`)) || 0;
    const maxM = Number(watch(`subjectMarks.${index}.maxMarks`)) || 100;
    const newVal = Math.max(0, Math.min(maxM, currentVal + delta));
    setValue(`subjectMarks.${index}.${field}`, newVal, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const onSubmit = (data) => {
    const processedMarks = data.subjectMarks.map(s => ({
      ...s,
      total: (Number(s.theory) || 0) + (Number(s.practical) || 0)
    }));

    const finalData = { ...data, subjectMarks: processedMarks };

    if (isEditMode) {
      dispatch(updateExamResult({ id, data: finalData }));
    } else {
      dispatch(createExamResult(finalData));
    }
  };

  const gradeBadge = getGradeBadge(totals.percentage !== undefined ? watch('grade') : '');

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 pt-4 sm:pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate('/master/exam-result')}
              className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all border border-slate-200 bg-white shadow-2xs active:scale-95 cursor-pointer shrink-0"
              title="Back to Exam Results"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  {isEditMode ? 'Edit Exam Result' : 'Create Exam Result'}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase border ${
                  isEditMode 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isEditMode ? <AlertCircle size={13} /> : <Award size={13} />}
                  {isEditMode ? 'Edit Mode' : 'Result Generation'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Record subject marks, verify online exam scores, and issue certificate numbers.
              </p>
            </div>
          </div>

          {/* Quick Score Pill (if marks are loaded) */}
          {totals.total > 0 && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 px-4 self-start sm:self-auto shrink-0 shadow-2xs">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</div>
                <div className="text-base font-black text-slate-800">{totals.obtained} <span className="text-xs text-slate-400 font-bold">/ {totals.total}</span></div>
              </div>
              <div className="h-7 w-[1px] bg-slate-200"></div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentage</div>
                <div className="text-base font-black text-emerald-600">{totals.percentage.toFixed(1)}%</div>
              </div>
              <div className="h-7 w-[1px] bg-slate-200"></div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black border ${gradeBadge.bg}`}>
                  {gradeBadge.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Card 1: 3-Step Selection Pipeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible">
            
            {/* Pipeline Header */}
            <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between flex-wrap gap-2 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Exam & Student Selection Pipeline</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className={selectedExamNameForm ? 'text-blue-600 font-black' : ''}>1. Exam</span>
                <span>&rarr;</span>
                <span className={selectedCourseIdForm ? 'text-indigo-600 font-black' : ''}>2. Course</span>
                <span>&rarr;</span>
                <span className={selectedStudentId ? 'text-emerald-600 font-black' : ''}>3. Student</span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Exam Name Dropdown */}
                <div className="relative" ref={examDropdownRef}>
                  <label className="block text-xs font-black text-blue-600 uppercase mb-2 tracking-wider flex items-center justify-between">
                    <span>1. Exam Name</span>
                    {selectedExamNameForm && <span className="text-blue-500 text-[10px] font-bold lowercase">selected</span>}
                  </label>
                  <input type="hidden" {...register('examId', { required: true })} />
                  
                  <div className="relative">
                    <button 
                      type="button"
                      disabled={isEditMode}
                      onClick={() => setIsFormExamDropdownOpen(!isFormExamDropdownOpen)}
                      className={`border p-3.5 rounded-xl w-full text-left flex justify-between items-center text-sm font-semibold shadow-2xs transition-all cursor-pointer ${
                        selectedExamNameForm 
                          ? 'bg-blue-50/20 border-blue-200 text-slate-800' 
                          : 'bg-white border-slate-200 hover:border-blue-300 text-slate-400'
                      } ${isFormExamDropdownOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''} disabled:bg-slate-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <BookOpen size={16} className={selectedExamNameForm ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span className={`truncate ${selectedExamNameForm ? 'text-slate-800 font-bold' : 'text-slate-400 font-normal'}`}>
                          {selectedExamNameForm || 'Choose Exam Name...'}
                        </span>
                      </div>
                      {!isEditMode && <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFormExamDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />}
                    </button>
                    
                    {isFormExamDropdownOpen && !isEditMode && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[300px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Search Exam Name..."
                              value={formExamSearch}
                              onChange={(e) => setFormExamSearch(e.target.value)}
                              className="border border-slate-200 pl-8 pr-7 py-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none font-medium text-slate-700 bg-white"
                              autoFocus
                            />
                            {formExamSearch && (
                              <button 
                                type="button" 
                                onClick={() => setFormExamSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[220px]">
                          {uniqueExamNames && uniqueExamNames.filter(name => name.toLowerCase().includes(formExamSearch.toLowerCase())).length > 0 ? (
                            uniqueExamNames.filter(name => name.toLowerCase().includes(formExamSearch.toLowerCase())).map(name => (
                              <div 
                                key={name} 
                                onClick={() => {
                                  setSelectedExamNameForm(name);
                                  setSelectedCourseIdForm('');
                                  setValue('examId', '');
                                  setValue('studentId', '');
                                  setIsFormExamDropdownOpen(false);
                                  setFormExamSearch('');
                                }}
                                className={`p-3 text-xs font-semibold hover:bg-blue-50/70 cursor-pointer transition-all flex items-center justify-between ${
                                  selectedExamNameForm === name ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:text-blue-600'
                                }`}
                              >
                                <span>{name}</span>
                                {selectedExamNameForm === name && <Check size={14} className="text-blue-600" />}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-xs text-slate-400 text-center font-medium italic">
                              No matching exams found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Course Selection Dropdown */}
                <div className="relative" ref={courseDropdownRef}>
                  <label className={`block text-xs font-black uppercase mb-2 tracking-wider flex items-center justify-between ${
                    selectedExamNameForm ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    <span>2. Select Course</span>
                    {selectedCourseIdForm && <span className="text-indigo-500 text-[10px] font-bold lowercase">selected</span>}
                  </label>
                  <div className="relative">
                    <button 
                      type="button"
                      disabled={!selectedExamNameForm || isEditMode}
                      onClick={() => setIsFormCourseDropdownOpen(!isFormCourseDropdownOpen)}
                      className={`border p-3.5 rounded-xl w-full text-left flex justify-between items-center text-sm font-semibold shadow-2xs transition-all cursor-pointer ${
                        selectedCourseIdForm 
                          ? 'bg-indigo-50/20 border-indigo-200 text-slate-800' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-400'
                      } ${isFormCourseDropdownOpen ? 'ring-2 ring-indigo-100 border-indigo-400' : ''} disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <GraduationCap size={16} className={selectedCourseIdForm ? 'text-indigo-600 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span className={`truncate ${selectedCourseIdForm ? 'text-slate-800 font-bold' : 'text-slate-400 font-normal'}`}>
                          {coursesForSelectedExamName.find(c => String(c._id) === String(selectedCourseIdForm))?.name || (selectedExamNameForm ? 'Choose Course...' : 'Select Exam First')}
                        </span>
                      </div>
                      {!isEditMode && <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFormCourseDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />}
                    </button>
                    
                    {isFormCourseDropdownOpen && !isEditMode && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[300px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Search Course..."
                              value={formCourseSearch}
                              onChange={(e) => setFormCourseSearch(e.target.value)}
                              className="border border-slate-200 pl-8 pr-7 py-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-medium text-slate-700 bg-white"
                              autoFocus
                            />
                            {formCourseSearch && (
                              <button 
                                type="button" 
                                onClick={() => setFormCourseSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-[220px]">
                          {coursesForSelectedExamName && coursesForSelectedExamName.filter(c => (c.name || '').toLowerCase().includes(formCourseSearch.toLowerCase())).length > 0 ? (
                            coursesForSelectedExamName.filter(c => (c.name || '').toLowerCase().includes(formCourseSearch.toLowerCase())).map(c => (
                              <div 
                                key={c._id} 
                                onClick={() => {
                                  const chosenCourseId = String(c._id);
                                  setSelectedCourseIdForm(chosenCourseId);
                                  setValue('studentId', '');
                                  setIsFormCourseDropdownOpen(false);
                                  setFormCourseSearch('');
                                  
                                  // Look up matching schedule to set examId
                                  const targetExam = selectedExamNameForm.trim().toLowerCase();
                                  const matchingSchedules = activeExamSchedules.filter(e => 
                                    (e.examName || '').trim().toLowerCase() === targetExam && 
                                    String(e.course?._id || e.course) === chosenCourseId
                                  );
                                  const bestMatch = matchingSchedules.find(e => !e.isReExam && ((e.attendees && e.attendees.length > 0) || (e.attempts && e.attempts.length > 0)))
                                    || matchingSchedules.find(e => (e.attendees && e.attendees.length > 0) || (e.attempts && e.attempts.length > 0))
                                    || matchingSchedules[0];

                                  if (bestMatch) {
                                    setValue('examId', String(bestMatch._id));
                                  }
                                }}
                                className={`p-3 text-xs font-semibold hover:bg-indigo-50/70 cursor-pointer transition-all flex items-center justify-between ${
                                  selectedCourseIdForm === String(c._id) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:text-indigo-600'
                                }`}
                              >
                                <span>{c.name}</span>
                                {selectedCourseIdForm === String(c._id) && <Check size={14} className="text-indigo-600" />}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-xs text-slate-400 text-center font-medium italic">
                              No matching courses found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Student Selection Dropdown */}
                <div className="relative" ref={studentDropdownRef}>
                  <label className={`block text-xs font-black uppercase mb-2 tracking-wider flex items-center justify-between ${
                    selectedExamId ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span>3. Select Student</span>
                    {availableAttendees.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        {availableAttendees.length} Pending
                      </span>
                    )}
                  </label>
                  <input type="hidden" {...register('studentId', { required: true })} />
                  
                  <div className="relative">
                    <button 
                      type="button"
                      disabled={!selectedExamId || isEditMode}
                      onClick={() => setIsFormStudentDropdownOpen(!isFormStudentDropdownOpen)}
                      className={`border p-3.5 rounded-xl w-full text-left flex justify-between items-center text-sm font-semibold shadow-2xs transition-all cursor-pointer ${
                        selectedStudentId 
                          ? 'bg-emerald-50/20 border-emerald-200 text-slate-800' 
                          : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-400'
                      } ${isFormStudentDropdownOpen ? 'ring-2 ring-emerald-100 border-emerald-400' : ''} disabled:bg-slate-50 disabled:border-slate-200 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <User size={16} className={selectedStudentId ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span className={`truncate ${selectedStudentId ? 'text-slate-800 font-bold' : 'text-slate-400 font-normal'}`}>
                          {(() => {
                            if (!selectedStudentId) return selectedExamId ? 'Choose Student...' : 'Select Course First';
                            const foundStudent = (examScheduleDetails?.attendees || []).find(s => String(s._id) === String(selectedStudentId));
                            if (foundStudent) {
                              return `${foundStudent.studentName} (${foundStudent.regNo || 'No Reg No'})`;
                            }
                            return 'Student Selected';
                          })()}
                        </span>
                      </div>
                      {!isEditMode && <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFormStudentDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />}
                    </button>
                    
                    {isFormStudentDropdownOpen && !isEditMode && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[320px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Search student name or reg no..."
                              value={formStudentSearch}
                              onChange={(e) => setFormStudentSearch(e.target.value)}
                              className="border border-slate-200 pl-8 pr-7 py-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none font-medium text-slate-700 bg-white"
                              autoFocus
                            />
                            {formStudentSearch && (
                              <button 
                                type="button" 
                                onClick={() => setFormStudentSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[240px]">
                          {searchedAvailableAttendees.length > 0 ? (
                            searchedAvailableAttendees.map(student => (
                              <div 
                                key={student._id} 
                                onClick={() => {
                                  setValue('studentId', String(student._id));
                                  if (student.scheduleId) {
                                    setValue('examId', String(student.scheduleId));
                                  }
                                  setIsFormStudentDropdownOpen(false);
                                  setFormStudentSearch('');
                                }}
                                className={`p-3 text-xs font-semibold hover:bg-emerald-50/60 cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                                  selectedStudentId === String(student._id) ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:text-emerald-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-black flex items-center justify-center shrink-0 text-xs uppercase">
                                    {student.studentName?.charAt(0) || 'S'}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-800 truncate">{student.studentName}</span>
                                      <span className="text-slate-400 font-medium text-[11px]">({student.regNo})</span>
                                    </div>
                                    {student.branchName && (
                                      <span className="text-slate-400 text-[10px] font-normal">{student.branchName}</span>
                                    )}
                                  </div>
                                </div>
                                {student.hasAttempted ? (
                                  <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                                    Exam Given {student.submittedPapersCount ? `(${student.submittedPapersCount}P)` : ''}
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
                                    Scheduled
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-xs text-slate-400 text-center font-medium italic space-y-1">
                              <div>{availableAttendees.length === 0 ? 'All eligible students for this exam already have results generated' : 'No matching students found'}</div>
                              {availableAttendees.length === 0 && (
                                <div className="text-[11px] text-slate-400 font-normal">Check the exam results list or select another course.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Student Quick Profile Card (when selected) */}
          {currentSelectedStudent && (
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 uppercase">
                  {currentSelectedStudent.studentName?.charAt(0) || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-800">{currentSelectedStudent.studentName}</h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-white font-bold text-slate-700 text-xs border border-slate-200 shadow-2xs">
                      {currentSelectedStudent.regNo}
                    </span>
                    {currentSelectedStudent.branchName && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100/60 text-blue-700 font-semibold text-xs border border-blue-200">
                        {currentSelectedStudent.branchName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2.5 flex-wrap">
                    <span>Course: <strong className="text-slate-700">{currentSelectedCourse?.name || 'Selected Course'}</strong></span>
                    {currentSelectedStudent.hasAttempted && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 border border-emerald-300 rounded px-2 py-0.5 text-[11px] font-bold">
                        <CheckCircle2 size={12} /> Online Exam Submitted ({currentSelectedStudent.submittedPapersCount || 1} papers)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {totals.total > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Obtained</div>
                    <div className="text-sm font-black text-blue-600">{totals.obtained} / {totals.total}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Grade</div>
                    <div className="text-sm font-black text-emerald-600">{watch('grade') || 'PENDING'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 2: Subject-wise Marks Table */}
          {fields.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              
              {/* Header */}
              <div className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award size={16} className="text-emerald-600" />
                    Subject Marks Breakdown & Grading
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Adjust theory or practical scores using + / - steppers or direct numeric entry.
                  </p>
                </div>

                {subjectMarksValues?.some((s) => s.attempted) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shrink-0">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Online Test Scores Synchronized
                  </span>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3.5 w-14 text-center">#</th>
                      <th className="px-6 py-3.5">Subject</th>
                      <th className="px-6 py-3.5 w-48 text-center">Theory Marks (+ / -)</th>
                      <th className="px-6 py-3.5 w-48 text-center">Practical Marks (+ / -)</th>
                      <th className="px-6 py-3.5 w-32 text-center">Total</th>
                      <th className="px-6 py-3.5 w-28 text-center">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {fields.map((field, index) => (
                      <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{subjectMarksValues[index]?.subjectName}</span>
                            {subjectMarksValues[index]?.attempted && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                <CheckCircle2 size={11} /> Online: {subjectMarksValues[index]?.theory} Marks
                              </span>
                            )}
                          </div>
                          <input type="hidden" {...register(`subjectMarks.${index}.subjectId`)} />
                          <input type="hidden" {...register(`subjectMarks.${index}.subjectName`)} />
                        </td>

                        {/* Theory Marks Stepper */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500">
                            <button
                              type="button"
                              onClick={() => adjustMark(index, 'theory', -1)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              title="Decrease Theory Mark (-1)"
                            >
                              <Minus size={14} />
                            </button>
                            <input 
                              type="number" 
                              {...register(`subjectMarks.${index}.theory`, { valueAsNumber: true })} 
                              className="w-full bg-transparent text-center font-black text-slate-800 text-sm sm:text-base outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button
                              type="button"
                              onClick={() => adjustMark(index, 'theory', 1)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              title="Increase Theory Mark (+1)"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>

                        {/* Practical Marks Stepper */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500">
                            <button
                              type="button"
                              onClick={() => adjustMark(index, 'practical', -1)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              title="Decrease Practical Mark (-1)"
                            >
                              <Minus size={14} />
                            </button>
                            <input 
                              type="number" 
                              {...register(`subjectMarks.${index}.practical`, { valueAsNumber: true })} 
                              className="w-full bg-transparent text-center font-black text-slate-800 text-sm sm:text-base outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button
                              type="button"
                              onClick={() => adjustMark(index, 'practical', 1)}
                              className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              title="Increase Practical Mark (+1)"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-black text-blue-600 text-base">
                          {(Number(subjectMarksValues[index]?.theory) || 0) + (Number(subjectMarksValues[index]?.practical) || 0)}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-400">
                          <input type="number" {...register(`subjectMarks.${index}.maxMarks`)} className="w-full bg-transparent text-center font-semibold text-slate-400 outline-none" readOnly />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* Table Footer with Summary */}
                  <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200/80">
                    <tr>
                      <td colSpan="2" className="px-6 py-4 text-right text-slate-600 text-xs font-black uppercase tracking-wider">
                        GRAND TOTAL SUMMARY:
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">Theory: </span>
                        <span className="text-sm font-black text-slate-700">
                          {subjectMarksValues?.reduce((sum, s) => sum + (Number(s.theory) || 0), 0)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">Practical: </span>
                        <span className="text-sm font-black text-slate-700">
                          {subjectMarksValues?.reduce((sum, s) => sum + (Number(s.practical) || 0), 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-lg font-black text-blue-700">
                        {totals.obtained} <span className="text-xs text-slate-400 font-bold">/ {totals.total}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-emerald-700 bg-emerald-100/70 border border-emerald-300 rounded-lg px-2.5 py-1">
                          {totals.percentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Card 3: Certificate & Record Identification */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  Certificate & Serial Record Details
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Identification serials for student certificate verification and record keeping.
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                Auto-Synchronized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" />
                  SOM Number
                </label>
                <input 
                  {...register('somNumber')} 
                  className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-xl w-full bg-white font-bold text-slate-800 text-sm outline-none transition-all shadow-2xs" 
                  placeholder="SOM-G00007" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-400" />
                  CSR Number
                </label>
                <input 
                  {...register('csrNumber')} 
                  className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-xl w-full bg-white font-bold text-slate-800 text-sm outline-none transition-all shadow-2xs" 
                  placeholder="CSR-G00007" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award size={13} className="text-slate-400" />
                  Certificate Number
                </label>
                <input 
                  {...register('certificateNumber')} 
                  className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-xl w-full bg-white font-bold text-slate-800 text-sm outline-none transition-all shadow-2xs" 
                  placeholder="CSR-G00007" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Date of Issue
                </label>
                <input 
                  type="date" 
                  {...register('issueDate', { required: true })} 
                  className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-xl w-full bg-white font-bold text-slate-800 text-sm outline-none transition-all shadow-2xs" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Percent size={13} className="text-slate-400" />
                  Calculated Grade
                </label>
                <div className="relative">
                  <input 
                    {...register('grade')} 
                    className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-xl w-full bg-white font-black text-slate-800 text-sm outline-none transition-all shadow-2xs uppercase" 
                    placeholder="DISTINCTION / FIRST" 
                  />
                  {watch('grade') && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-0.5 rounded border ${gradeBadge.bg}`}>
                      {gradeBadge.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <label htmlFor="isActive" className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-blue-300 w-full bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-all shadow-2xs">
                  <input 
                    type="checkbox" 
                    {...register('isActive')} 
                    id="isActive" 
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    defaultChecked 
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">Active Result Record</div>
                    <div className="text-[11px] text-slate-400 font-medium">Eligible for certificate generation & verification</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Please ensure all marks and certificate numbers are verified before saving.
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button 
                type="button" 
                onClick={() => navigate('/master/exam-result')}
                className="border border-slate-200 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer text-sm shadow-2xs active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isLoading} 
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} 
                {isLoading ? 'Saving...' : (isEditMode ? 'Update Exam Result' : 'Save & Generate Result')}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddEditExamResult;

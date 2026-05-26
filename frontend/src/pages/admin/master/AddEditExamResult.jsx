import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchExamSchedules, 
  fetchBatches, 
  fetchExamResults, 
  createExamResult, 
  updateExamResult, 
  resetMasterStatus, 
  fetchNextResultNumbers, 
  fetchExamScheduleDetails,
  fetchExamResultById
} from '../../../features/master/masterSlice';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';

const toDateInputValue = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
};

const AddEditExamResult = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from route params (if in edit mode)
  const isEditMode = !!id;

  const { 
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

  const { fields, setValue: setFieldArrayValue } = useFieldArray({
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
            setValue('subjectMarks', marks);
          }
        })
        .catch((err) => {
          toast.error("Failed to load exam result details: " + err);
          navigate('/master/exam-result');
        });
    }
  }, [dispatch, id, isEditMode, setValue, navigate]);

  // Mirror CSR number and Certificate number to SOM number with proper prefix conversion
  useEffect(() => {
    if (somNumberValue) {
      const convertedCsr = somNumberValue.startsWith('SOM-') 
        ? somNumberValue.replace('SOM-', 'CSR-') 
        : `CSR-${somNumberValue}`;
      setValue('csrNumber', convertedCsr);

      if (somNumberValue.startsWith('SOM-G')) {
        setValue('certificateNumber', somNumberValue.replace('SOM-G', ''));
      }
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
        const selectedExam = examSchedules.find(e => e._id === selectedExamId);
        if (selectedExam && selectedExam.timeTable) {
          const initialMarks = selectedExam.timeTable.map(item => ({
            subjectId: item.subject?._id || item.subject,
            subjectName: item.subject?.name || 'Subject',
            theory: 0,
            practical: 0,
            total: 0,
            maxMarks: item.total || 100
          }));
          setValue('subjectMarks', initialMarks);
        }
      }
    }
  }, [selectedExamId, examSchedules, setValue, isEditMode, dispatch]);

  const activeExamSchedules = useMemo(() => {
    return examSchedules.filter(e => e.isActive && !e.isDeleted && e.course && e.examName && e.attendees && e.attendees.length > 0);
  }, [examSchedules]);

  const uniqueExamNames = useMemo(() => {
    const names = new Set();
    activeExamSchedules.forEach(e => {
      if (e.examName) names.add(e.examName);
    });
    return Array.from(names);
  }, [activeExamSchedules]);

  const coursesForSelectedExamName = useMemo(() => {
    if (!selectedExamNameForm) return [];
    const coursesMap = new Map();
    activeExamSchedules
      .filter(e => e.examName === selectedExamNameForm)
      .forEach(e => {
        if (e.course && e.course._id) {
          coursesMap.set(e.course._id, e.course);
        }
      });
    return Array.from(coursesMap.values());
  }, [selectedExamNameForm, activeExamSchedules]);

  const existingResultStudentIds = useMemo(() => {
    if (!selectedExamId || isEditMode) return new Set();

    return new Set((examResults || [])
      .filter(result => {
        const resultExamId = result.exam?._id || result.exam;
        return resultExamId === selectedExamId;
      })
      .map(result => result.student?._id || result.student)
      .filter(Boolean));
  }, [examResults, selectedExamId, isEditMode]);

  const availableAttendees = useMemo(() => {
    const attendees = examScheduleDetails?.attendees || [];
    if (isEditMode) return attendees;
    return attendees.filter(student => !existingResultStudentIds.has(student._id));
  }, [examScheduleDetails, existingResultStudentIds, isEditMode]);

  const searchedAvailableAttendees = useMemo(() => {
    const search = formStudentSearch.toLowerCase();
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

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header section with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/master/exam-result')}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 bg-white shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isEditMode ? 'Edit Exam Result' : 'Add New Exam Result'}</h2>
          <p className="text-sm text-slate-500">Record marks, grades, and serial numbers for student certificates</p>
        </div>
      </div>

      {/* Main card panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* 3 Cascading Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Exam Name Dropdown */}
              <div className="relative">
                  <label className="block text-xs font-black text-blue-600 uppercase mb-2 tracking-wider">1. Select Exam Name</label>
                  <input type="hidden" {...register('examId', {required: true})} />
                  
                  <div className="relative">
                      <button 
                          type="button"
                          disabled={isEditMode}
                          onClick={() => setIsFormExamDropdownOpen(!isFormExamDropdownOpen)}
                          className="border border-slate-200 hover:border-blue-300 disabled:bg-slate-50 disabled:cursor-not-allowed p-3.5 rounded-xl w-full bg-white text-left flex justify-between items-center text-sm font-semibold text-slate-700 shadow-sm transition-all focus:ring-2 focus:ring-blue-100"
                      >
                          <span className={selectedExamNameForm ? 'text-slate-800' : 'text-slate-400'}>
                              {selectedExamNameForm || 'Choose Exam Name...'}
                          </span>
                          {!isEditMode && <span className="text-slate-400 text-xs">▼</span>}
                      </button>
                      
                      {isFormExamDropdownOpen && !isEditMode && (
                          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-[280px] overflow-hidden flex flex-col">
                              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                  <input 
                                      type="text" 
                                      placeholder="Search Exam Name..."
                                      value={formExamSearch}
                                      onChange={(e) => setFormExamSearch(e.target.value)}
                                      className="border border-slate-200 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none font-medium text-slate-700"
                                  />
                              </div>
                              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[200px]">
                                  {uniqueExamNames && uniqueExamNames.filter(name => name.toLowerCase().includes(formExamSearch.toLowerCase())).length > 0 ? (
                                      uniqueExamNames.filter(name => name.toLowerCase().includes(formExamSearch.toLowerCase())).map(name => (
                                          <div 
                                              key={name} 
                                              onClick={() => {
                                                  setSelectedExamNameForm(name);
                                                  setSelectedCourseIdForm('');
                                                  setValue('examId', ''); // Clear actual schedule ID
                                                  setValue('studentId', ''); // Clear student ID
                                                  setIsFormExamDropdownOpen(false);
                                                  setFormExamSearch('');
                                              }}
                                              className="p-3 text-xs font-semibold hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 cursor-pointer transition-all"
                                          >
                                              {name}
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
              <div className="relative">
                  <label className={`block text-xs font-black uppercase mb-2 tracking-wider ${selectedExamNameForm ? 'text-indigo-600' : 'text-slate-400'}`}>2. Select Course</label>
                  <div className="relative">
                      <button 
                          type="button"
                          disabled={!selectedExamNameForm || isEditMode}
                          onClick={() => setIsFormCourseDropdownOpen(!isFormCourseDropdownOpen)}
                          className="border border-slate-200 hover:border-indigo-300 disabled:hover:border-slate-200 p-3.5 rounded-xl w-full bg-white disabled:bg-slate-50 text-left flex justify-between items-center text-sm font-semibold text-slate-700 shadow-sm transition-all focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed"
                      >
                          <span className={selectedCourseIdForm ? 'text-slate-800' : 'text-slate-400'}>
                              {coursesForSelectedExamName.find(c => c._id === selectedCourseIdForm)?.name || 'Choose Course...'}
                          </span>
                          {!isEditMode && <span className="text-slate-400 text-xs">▼</span>}
                      </button>
                      
                      {isFormCourseDropdownOpen && !isEditMode && (
                          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-[280px] overflow-hidden flex flex-col">
                              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                  <input 
                                      type="text" 
                                      placeholder="Search Course..."
                                      value={formCourseSearch}
                                      onChange={(e) => setFormCourseSearch(e.target.value)}
                                      className="border border-slate-200 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none font-medium text-slate-700"
                                  />
                              </div>
                              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[200px]">
                                  {coursesForSelectedExamName && coursesForSelectedExamName.filter(c => c.name.toLowerCase().includes(formCourseSearch.toLowerCase())).length > 0 ? (
                                      coursesForSelectedExamName.filter(c => c.name.toLowerCase().includes(formCourseSearch.toLowerCase())).map(c => (
                                          <div 
                                              key={c._id} 
                                              onClick={() => {
                                                  setSelectedCourseIdForm(c._id);
                                                  setValue('studentId', ''); // Clear student ID
                                                  setIsFormCourseDropdownOpen(false);
                                                  setFormCourseSearch('');
                                                  
                                                  // Look up matching schedule to set examId
                                                  const match = activeExamSchedules.find(e => e.examName === selectedExamNameForm && e.course?._id === c._id);
                                                  if (match) {
                                                      setValue('examId', match._id);
                                                  }
                                              }}
                                              className="p-3 text-xs font-semibold hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 cursor-pointer transition-all"
                                          >
                                              {c.name}
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
              <div className="relative">
                  <label className={`block text-xs font-black uppercase mb-2 tracking-wider ${selectedExamId ? 'text-emerald-600' : 'text-slate-400'}`}>3. Select Student (Attendees Only)</label>
                  <input type="hidden" {...register('studentId', {required: true})} />
                  
                  <div className="relative">
                      <button 
                          type="button"
                          disabled={!selectedExamId || isEditMode}
                          onClick={() => setIsFormStudentDropdownOpen(!isFormStudentDropdownOpen)}
                          className="border border-slate-200 hover:border-emerald-300 disabled:hover:border-slate-200 p-3.5 rounded-xl w-full bg-white disabled:bg-slate-50 text-left flex justify-between items-center text-sm font-semibold text-slate-700 shadow-sm transition-all focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed"
                      >
                          <span className={selectedStudentId ? 'text-slate-800' : 'text-slate-400'}>
                              {availableAttendees?.find(s => s._id === selectedStudentId)?.studentName 
                                  ? `${availableAttendees?.find(s => s._id === selectedStudentId)?.studentName} (${availableAttendees?.find(s => s._id === selectedStudentId)?.regNo})`
                                  : 'Choose Student...'}
                          </span>
                          {!isEditMode && <span className="text-slate-400 text-xs">▼</span>}
                      </button>
                      
                      {isFormStudentDropdownOpen && !isEditMode && (
                          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-[280px] overflow-hidden flex flex-col">
                              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                  <input 
                                      type="text" 
                                      placeholder="Search Student..."
                                      value={formStudentSearch}
                                      onChange={(e) => setFormStudentSearch(e.target.value)}
                                      className="border border-slate-200 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none font-medium text-slate-700"
                                  />
                              </div>
                              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[200px]">
                                  {searchedAvailableAttendees.length > 0 ? (
                                      searchedAvailableAttendees.map(student => (
                                          <div 
                                              key={student._id} 
                                              onClick={() => {
                                                  setValue('studentId', student._id);
                                                  setIsFormStudentDropdownOpen(false);
                                                  setFormStudentSearch('');
                                              }}
                                              className="p-3 text-xs font-semibold hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-600 cursor-pointer transition-all"
                                          >
                                              {student.studentName} ({student.regNo})
                                          </div>
                                      ))
                                  ) : (
                                      <div className="p-4 text-xs text-slate-400 text-center font-medium italic">
                                          {availableAttendees.length === 0 ? 'All attendees already have exam results' : 'No matching students found'}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Subject-wise Marks Table */}
          {fields.length > 0 && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                          <tr>
                              <th className="px-4 py-4 w-16 text-center">Sr No</th>
                              <th className="px-6 py-4">Subject</th>
                              <th className="px-6 py-4 w-36 text-center">Theory Marks</th>
                              <th className="px-6 py-4 w-36 text-center">Practical Marks</th>
                              <th className="px-6 py-4 w-32 text-center">Total</th>
                              <th className="px-6 py-4 w-28 text-center">Max Marks</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                          {fields.map((field, index) => (
                              <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-4 text-center font-black text-slate-500">{index + 1}</td>
                                  <td className="px-6 py-4 font-semibold text-slate-700">
                                      {subjectMarksValues[index]?.subjectName}
                                      <input type="hidden" {...register(`subjectMarks.${index}.subjectId`)} />
                                      <input type="hidden" {...register(`subjectMarks.${index}.subjectName`)} />
                                  </td>
                                  <td className="px-4 py-3">
                                      <input 
                                          type="number" 
                                          {...register(`subjectMarks.${index}.theory`, { valueAsNumber: true })} 
                                          className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2.5 rounded-xl text-center font-bold text-slate-800 outline-none transition-all" 
                                      />
                                  </td>
                                  <td className="px-4 py-3">
                                      <input 
                                          type="number" 
                                          {...register(`subjectMarks.${index}.practical`, { valueAsNumber: true })} 
                                          className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-2.5 rounded-xl text-center font-bold text-slate-800 outline-none transition-all" 
                                      />
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
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-100">
                          <tr>
                              <td colSpan="2" className="px-6 py-5 text-right text-slate-500 text-xs font-black uppercase tracking-wider">GRAND TOTAL:</td>
                              <td colSpan="2"></td>
                              <td className="px-6 py-5 text-center text-xl font-black text-slate-800">{totals.obtained} / {totals.total}</td>
                              <td className="px-6 py-5 text-center text-sm font-black text-emerald-600 bg-emerald-50/50 rounded-lg">{totals.percentage.toFixed(2)}%</td>
                          </tr>
                      </tfoot>
                  </table>
              </div>
          )}

          {/* Additional details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SOM Number</label>
                  <input {...register('somNumber')} className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3.5 rounded-xl w-full bg-white font-bold text-slate-800 outline-none transition-all" placeholder="SOM-G00007" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CSR Number</label>
                  <input {...register('csrNumber')} className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3.5 rounded-xl w-full bg-white font-bold text-slate-800 outline-none transition-all" placeholder="CSR-G00007" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Certificate Number</label>
                  <input {...register('certificateNumber')} className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3.5 rounded-xl w-full bg-white font-bold text-slate-800 outline-none transition-all" placeholder="00007" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Issue</label>
                  <input type="date" {...register('issueDate', { required: true })} className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3.5 rounded-xl w-full bg-white font-bold text-slate-800 outline-none transition-all" />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grade</label>
                  <input {...register('grade')} className="border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3.5 rounded-xl w-full bg-white font-black text-primary outline-none transition-all" placeholder="FAIL" />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 mt-6 lg:mt-0">
                  <input type="checkbox" {...register('isActive')} id="isActive" className="h-5 w-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 select-none cursor-pointer">Is Active Result</label>
              </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button 
                  type="button" 
                  onClick={() => navigate('/master/exam-result')}
                  className="border border-slate-200 px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                  Cancel
              </button>
              <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                  {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                  {isLoading ? 'Saving...' : 'Save & Generate Result'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditExamResult;

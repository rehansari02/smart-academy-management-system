import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchExamSchedules, fetchBatches, fetchExamResults, createExamResult, updateExamResult, deleteExamResult, resetMasterStatus, fetchNextResultNumbers, fetchExamScheduleDetails } from '../../../features/master/masterSlice';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Search, RefreshCw, Edit, Printer, Award, Save, Trash2 } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';

const ExamResult = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examSchedules, examScheduleDetails, batches, examResults, nextResultNumbers, isSuccess, message, isLoading } = useSelector((state) => state.master);

  // Local State
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [filters, setFilters] = useState({ examId: '', batch: '', studentId: '' });
  
  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Form Setup
  const { register, handleSubmit, reset, setValue, watch, control } = useForm({
    defaultValues: {
        subjectMarks: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subjectMarks"
  });

  const selectedExamId = watch('examId');
  const subjectMarksValues = useWatch({
    control,
    name: 'subjectMarks'
  });

  useEffect(() => {
    dispatch(fetchExamSchedules());
    dispatch(fetchBatches());
    dispatch(fetchExamResults());
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess && message) {
        toast.success(message);
        dispatch(resetMasterStatus());
        if (showForm) setShowForm(false);
        setEditMode(null);
        reset();
    }
  }, [isSuccess, message, dispatch, showForm, reset]);

  // Update SOM/CSR when nextResultNumbers changes
  useEffect(() => {
    if (nextResultNumbers && !editMode && showForm) {
        setValue('somNumber', nextResultNumbers.somNumber);
        setValue('csrNumber', nextResultNumbers.csrNumber);
    }
  }, [nextResultNumbers, editMode, showForm, setValue]);

  // Handle Exam Selection Change - Load subjects and attendees
  useEffect(() => {
    if (selectedExamId) {
        // Fetch full details (including attendees) from backend
        dispatch(fetchExamScheduleDetails(selectedExamId));
        
        if (!editMode) {
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
  }, [selectedExamId, examSchedules, setValue, editMode, dispatch]);

  // Auto-calculate Total (Removed Auto-Grade as per user request)
  const totals = useMemo(() => {
    if (!subjectMarksValues) return { obtained: 0, total: 0, percentage: 0 };
    const obtained = subjectMarksValues.reduce((sum, s) => sum + (Number(s.theory) || 0) + (Number(s.practical) || 0), 0);
    const total = subjectMarksValues.reduce((sum, s) => sum + (Number(s.maxMarks) || 100), 0);
    const percentage = total > 0 ? (obtained / total) * 100 : 0;
    
    return { obtained, total, percentage };
  }, [subjectMarksValues]);

  const onSearch = () => dispatch(fetchExamResults(filters));
  const onReset = () => {
    setFilters({ examId: '', batch: '', studentId: '' });
    dispatch(fetchExamResults());
  };

  const onSubmit = (data) => {
    // Process subject marks to ensure totals are calculated
    const processedMarks = data.subjectMarks.map(s => ({
        ...s,
        total: (Number(s.theory) || 0) + (Number(s.practical) || 0)
    }));

    const finalData = { ...data, subjectMarks: processedMarks };

    if (editMode) {
        dispatch(updateExamResult({ id: editMode, data: finalData }));
    } else {
        dispatch(createExamResult(finalData));
    }
  };

  const handleEdit = (result) => {
    setEditMode(result._id);
    setShowForm(true);
    setValue('studentId', result.student._id);
    setValue('examId', result.exam._id);
    setValue('somNumber', result.somNumber);
    setValue('csrNumber', result.csrNumber);
    setValue('grade', result.grade);
    setValue('isActive', result.isActive);

    // Load existing subject marks
    if (result.subjectMarks) {
        const marks = result.subjectMarks.map(s => ({
            subjectId: s.subject?._id || s.subject,
            subjectName: s.subject?.name || 'Subject',
            theory: s.theory,
            practical: s.practical,
            total: s.total,
            maxMarks: 100 // Fallback or pull from exam if possible
        }));
        setValue('subjectMarks', marks);
    }
  };

  const printDocument = (type, result) => {
      window.open(`/print/exam-result/${result._id}?type=${type}`, '_blank');
  };

  const handleDelete = (result) => {
    if (window.confirm(`Are you sure you want to delete the result for ${result.student?.firstName} ${result.student?.lastName}?`)) {
      dispatch(deleteExamResult(result._id));
    }
  };

  // Client-side pagination
  const paginatedData = examResults.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(examResults.length / pageSize);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exam Results</h2>
        {!showForm && (
            <button onClick={() => { setShowForm(true); reset(); setEditMode(null); dispatch(fetchNextResultNumbers()); }} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> Add New Result
            </button>
        )}
      </div>

      {/* --- ADD / EDIT FORM --- */}
      {showForm && (
        <div className="bg-white p-6 rounded shadow mb-6 border-l-4 border-primary animate-fadeIn">
            <h3 className="text-lg font-bold mb-4">{editMode ? 'Edit Result' : 'Add New Exam Result'}</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Select Exam Schedule FIRST */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-black text-blue-900 uppercase mb-2">1. Select Exam Schedule</label>
                        <select {...register('examId', {required: true})} className="border-2 border-blue-200 p-3 rounded-lg w-full bg-white focus:border-primary outline-none transition-all shadow-sm font-bold">
                            <option value="">-- Choose Exam Schedule --</option>
                            {examSchedules.map(e => <option key={e._id} value={e._id}>{e.examName} ({e.course?.name})</option>)}
                        </select>
                    </div>

                    {/* Student Selection - Filtered by Exam Attendees */}
                    <div className={`p-4 rounded-lg border transition-all ${selectedExamId ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                        <label className="block text-sm font-black text-green-900 uppercase mb-2">2. Select Student (Attendees Only)</label>
                        <select 
                            {...register('studentId', {required: true})} 
                            className="border-2 border-green-200 p-3 rounded-lg w-full bg-white focus:border-green-500 outline-none transition-all shadow-sm font-bold"
                            disabled={!selectedExamId}
                        >
                            <option value="">{selectedExamId ? '-- Select Student --' : '-- Choose Exam First --'}</option>
                            {examScheduleDetails?.attendees?.map(student => (
                                <option key={student._id} value={student._id}>
                                    {student.studentName} ({student.regNo})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Subject-wise Marks Table */}
                {fields.length > 0 && (
                    <div className="border rounded overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-xs font-bold uppercase text-gray-600">
                                <tr>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3 w-32 text-center">Theory</th>
                                    <th className="p-3 w-32 text-center">Practical</th>
                                    <th className="p-3 w-32 text-center">Total</th>
                                    <th className="p-3 w-24 text-center">Max</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {fields.map((field, index) => (
                                    <tr key={field.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">
                                            {subjectMarksValues[index]?.subjectName}
                                            <input type="hidden" {...register(`subjectMarks.${index}.subjectId`)} />
                                            <input type="hidden" {...register(`subjectMarks.${index}.subjectName`)} />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" {...register(`subjectMarks.${index}.theory`, { valueAsNumber: true })} className="w-full border p-2 rounded text-center focus:border-primary" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" {...register(`subjectMarks.${index}.practical`, { valueAsNumber: true })} className="w-full border p-2 rounded text-center focus:border-primary" />
                                        </td>
                                        <td className="p-2 text-center font-bold text-blue-600">
                                            {(Number(subjectMarksValues[index]?.theory) || 0) + (Number(subjectMarksValues[index]?.practical) || 0)}
                                        </td>
                                        <td className="p-2 text-center text-gray-400">
                                            <input type="number" {...register(`subjectMarks.${index}.maxMarks`)} className="w-full bg-transparent text-center" readOnly />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-blue-50 font-bold">
                                <tr>
                                    <td className="p-3 text-right">GRAND TOTAL:</td>
                                    <td colSpan="2"></td>
                                    <td className="p-3 text-center text-lg text-primary">{totals.obtained} / {totals.total}</td>
                                    <td className="p-3 text-center text-xs text-gray-500">{totals.percentage.toFixed(2)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded border border-dashed border-gray-300">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">SOM Number</label>
                        <input {...register('somNumber')} className="border p-2 rounded w-full bg-white" placeholder="Auto-generates if empty" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">CSR Number</label>
                        <input {...register('csrNumber')} className="border p-2 rounded w-full bg-white" placeholder="Auto-generates if empty" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Grade</label>
                        <input {...register('grade')} className="border p-2 rounded w-full bg-white font-bold text-primary" placeholder="Enter Grade (e.g. FIRST)" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" {...register('isActive')} id="isActive" className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                        <label htmlFor="isActive" className="text-sm font-bold text-gray-700">Is Active Result</label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setShowForm(false)} className="border px-6 py-2 rounded font-medium hover:bg-gray-100 transition-colors">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-green-600 text-white px-10 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={20} />} 
                        {isLoading ? 'Saving...' : 'Save & Generate Result'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* --- FILTER SECTION --- */}
      {!showForm && (
        <div className="bg-white p-4 rounded shadow mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Exam Schedule</label>
                    <select className="border p-2 rounded w-full text-sm" value={filters.examId} onChange={(e) => setFilters({...filters, examId: e.target.value})}>
                        <option value="">-- All Exams --</option>
                        {examSchedules.map(e => <option key={e._id} value={e._id}>{e.examName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Batch Name</label>
                    <input list="batchList" className="border p-2 rounded w-full text-sm" placeholder="Select Batch"
                        value={filters.batch} onChange={(e) => setFilters({...filters, batch: e.target.value})} />
                    <datalist id="batchList">{batches.map(b => <option key={b._id} value={b.name} />)}</datalist>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Student Identity</label>
                    <StudentSearch 
                        placeholder="Search by Name or Reg No..."
                        onSelect={(id) => setFilters({...filters, studentId: id})}
                        defaultSelectedId={filters.studentId}
                        additionalFilters={{ isRegistered: 'true' }}
                        className="z-50" 
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={onReset} className="bg-gray-100 text-gray-600 px-3 py-2 rounded hover:bg-gray-200 transition-colors" title="Reset Filters"><RefreshCw size={18}/></button>
                    <button onClick={onSearch} className="bg-gray-900 text-white px-6 py-2 rounded font-bold hover:bg-black w-full transition-all flex items-center justify-center gap-2">
                        <Search size={18} /> Search
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Enrollment / Reg</th>
                        <th className="px-6 py-4">SOM / CSR</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Course / Exam</th>
                        <th className="px-6 py-4 text-center">Marks</th>
                        <th className="px-6 py-4 text-center">Grade</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedData.length > 0 ? paginatedData.map((res) => (
                        <tr key={res._id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-gray-900">{res.student?.enrollmentNo}</div>
                                <div className="text-[10px] font-mono text-gray-400">{res.student?.regNo}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-blue-600">{res.somNumber}</div>
                                <div className="text-[10px] text-gray-400">{res.csrNumber}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-gray-800 uppercase tracking-tight">
                                    {res.student?.firstName} {res.student?.lastName}
                                </div>
                                <div className="text-[10px] text-gray-500">{res.batch}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs font-bold text-gray-600">{res.course?.name}</div>
                                <div className="text-[10px] text-blue-500 italic">{res.exam?.examName}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="text-sm font-bold text-gray-900">{res.marksObtained} / {res.totalMarks}</div>
                                <div className="text-[10px] text-gray-400">{((res.marksObtained/res.totalMarks)*100).toFixed(1)}%</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${
                                    res.grade === 'DISTINCTION' ? 'bg-green-100 text-green-700' : 
                                    res.grade === 'FIRST' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {res.grade}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => printDocument('Marksheet', res)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Marksheet">
                                        <Printer size={18} />
                                    </button>
                                    <button onClick={() => printDocument('Certificate', res)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Certificate">
                                        <Award size={18} />
                                    </button>
                                    <button onClick={() => handleEdit(res)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(res)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="7" className="text-center py-16">
                            <div className="flex flex-col items-center text-gray-300">
                                <Search size={48} className="mb-2 opacity-20" />
                                <p className="italic">No exam results found matching your criteria.</p>
                            </div>
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex justify-between items-center bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Show</span>
                <select className="border rounded-lg px-2 py-1 text-sm font-bold text-gray-600" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
            </div>
            <div className="flex items-center gap-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Page {page} of {totalPages || 1}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
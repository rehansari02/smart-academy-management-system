import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses, fetchExamSchedules, createExamSchedule, updateExamSchedule, deleteExamSchedule, resetMasterStatus } from '../../../features/master/masterSlice';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Search, RefreshCw, Edit, Trash2, Eye, X, Save } from 'lucide-react';
import axios from 'axios'; // For direct detail fetch

const ExamSchedule = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { courses, examSchedules, isSuccess, message, isLoading } = useSelector((state) => state.master);
  
  // Local State
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [filters, setFilters] = useState({ courseId: '', examName: '' });
  const [detailView, setDetailView] = useState(null); // ID of schedule to show details
  const [detailData, setDetailData] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  // Attendee Selection
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);

  // Time Table State
  const [timeTableData, setTimeTableData] = useState([]);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Form Setup
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const selectedCourse = watch('course');

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchExamSchedules());
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess && message) {
        toast.success(message);
        dispatch(resetMasterStatus());
        if (showForm) setShowForm(false);
        setEditMode(null);
        setSelectedAttendees([]);
        setTimeTableData([]);
        reset();
    }
  }, [isSuccess, message, dispatch, showForm, reset]);

  // Handle Navigation State from ExamRequestList
  useEffect(() => {
    if (location.state?.fromRequest) {
        setShowForm(true);
        setValue('course', location.state.courseId);
        if (location.state.selectedStudentIds) {
            setSelectedAttendees(location.state.selectedStudentIds);
        }
    }
  }, [location.state, setValue]);

  // Fetch Pending Requests for selected course
  useEffect(() => {
    if (selectedCourse && showForm) {
        setIsRequestsLoading(true);
        axios.get(`${import.meta.env.VITE_API_URL}/master/exam-request?courseId=${selectedCourse}`, { withCredentials: true })
            .then(res => {
                // Flatten the response to get student data
                let requests = res.data.map(r => r.student).filter(s => s !== null);
                
                // If coming from bulk selection, show ONLY those selected students
                if (location.state?.fromRequest && location.state.selectedStudentIds) {
                    requests = requests.filter(s => location.state.selectedStudentIds.includes(s._id));
                }
                
                setPendingRequests(requests);
            })
            .catch(err => toast.error("Failed to fetch pending requests"))
            .finally(() => setIsRequestsLoading(false));
        
        // Populate Time Table based on course subjects
        const course = courses.find(c => c._id === selectedCourse);
        if (course && course.subjects) {
            // Only re-populate if it's a new entry (not editing or if course changed)
            // If editing, the timeTable is usually loaded from the record
            if (!editMode || timeTableData.length === 0) {
                const initialTable = course.subjects.map(s => ({
                    subject: s.subject?._id,
                    name: s.subject?.name,
                    date: '',
                    startTime: '',
                    endTime: '',
                    theory: 0,
                    practical: 0,
                    total: 0
                }));
                setTimeTableData(initialTable);
            }
        }
    } else {
        setPendingRequests([]);
        setTimeTableData([]);
    }
  }, [selectedCourse, showForm, courses, editMode]); // Removed timeTableData from deps to avoid loop

  // Fetch Details when detailView changes
  useEffect(() => {
    if (detailView) {   
        setIsDetailLoading(true);
        axios.get(`${import.meta.env.VITE_API_URL}/master/exam-schedule/${detailView}/details`, { withCredentials: true })
            .then(res => {
                // Now returns { attendees, timeTable }
                setDetailData(res.data);
            })
            .catch(err => toast.error("Failed to load details"))
            .finally(() => setIsDetailLoading(false));
    }
  }, [detailView]);

  const onSearch = () => dispatch(fetchExamSchedules(filters));
  const onReset = () => {
    setFilters({ courseId: '', examName: '' });
    dispatch(fetchExamSchedules());
  };

  const onSubmit = (data) => {
    const finalData = { 
        ...data, 
        attendees: selectedAttendees,
        timeTable: timeTableData.map(item => ({
            subject: item.subject,
            date: item.date,
            time: item.time,
            theory: item.theory,
            practical: item.practical
        }))
    };
    if (editMode) {
        dispatch(updateExamSchedule({ id: editMode, data: finalData }));
    } else {
        dispatch(createExamSchedule(finalData));
    }
  };

  const updateTimeTableField = (index, field, value) => {
    const newData = [...timeTableData];
    newData[index][field] = value;
    
    // Auto calculate total
    if (field === 'theory' || field === 'practical') {
        const t = parseFloat(newData[index].theory) || 0;
        const p = parseFloat(newData[index].practical) || 0;
        newData[index].total = t + p;
    }
    
    setTimeTableData(newData);
  };

  const toggleAttendee = (studentId) => {
    setSelectedAttendees(prev => 
        prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleEdit = (schedule) => {
    setEditMode(schedule._id);
    setShowForm(true);
    setValue('course', schedule.course?._id);
    setValue('examName', schedule.examName);
    setValue('remarks', schedule.remarks);
    setValue('isActive', schedule.isActive);
    setSelectedAttendees(schedule.attendees || []);
    
    // Map existing timeTable with names from course
    if (schedule.timeTable && schedule.timeTable.length > 0) {
        const course = courses.find(c => c._id === schedule.course?._id);
        const mapped = schedule.timeTable.map(tt => {
            const subjectObj = course?.subjects?.find(s => s.subject?._id === (tt.subject?._id || tt.subject));
            return {
                ...tt,
                subject: tt.subject?._id || tt.subject,
                name: tt.subject?.name || subjectObj?.subject?.name || 'Subject'
            };
        });
        setTimeTableData(mapped);
    }
  };

  const handleDelete = (id) => {
    if(window.confirm("Are you sure?")) dispatch(deleteExamSchedule(id));
  };

  // Pagination Logic (Client-side for now as Slice returns all)
  const paginatedData = examSchedules.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(examSchedules.length / pageSize);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exam Schedule</h2>
        {!showForm && !detailView && (
            <button onClick={() => { setShowForm(true); reset(); setEditMode(null); }} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> Add New Exam Schedule
            </button>
        )}
      </div>

      {/* --- FORM SECTION --- */}
      {showForm && (
        <div className="bg-white p-6 rounded shadow mb-6 border-l-4 border-primary animate-fadeIn">
            <h3 className="text-lg font-bold mb-4">{editMode ? 'Edit Exam Schedule' : 'New Exam Schedule'}</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Course</label>
                    <select {...register('course', {required: true})} className="border p-2 rounded w-full">
                        <option value="">-- Select Course --</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Exam Name</label>
                    <input {...register('examName', {required: true})} className="border p-2 rounded w-full" placeholder="e.g. Midterm 2024" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Remarks</label>
                    <textarea {...register('remarks')} className="border p-2 rounded w-full" rows="2"></textarea>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" {...register('isActive')} id="isActive" className="h-4 w-4" defaultChecked />
                    <label htmlFor="isActive" className="text-sm font-medium">Is Active</label>
                </div>

                {/* Attendee Selection List */}
                <div className="md:col-span-2 mt-4 border rounded p-4 bg-gray-50">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2 flex justify-between items-center">
                        Select Students for this Schedule
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {selectedAttendees.length} Selected
                        </span>
                    </h4>
                    
                    {isRequestsLoading ? (
                        <div className="text-center py-4 text-sm text-gray-500 italic">Fetching pending requests...</div>
                    ) : pendingRequests.length > 0 ? (
                        <div className="max-h-[300px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pendingRequests.map((student) => (
                                <div 
                                    key={student._id} 
                                    onClick={() => toggleAttendee(student._id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedAttendees.includes(student._id) 
                                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                        : 'bg-white border-gray-200 hover:border-blue-200'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedAttendees.includes(student._id)} 
                                        onChange={() => {}} // Controlled by div click
                                        className="h-4 w-4 rounded border-gray-300 text-primary"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-800">{student.firstName} {student.lastName}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">{student.regNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400">{new Date(student.admissionDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-gray-500 bg-white rounded border border-dashed border-gray-300">
                            {selectedCourse 
                                ? "No pending exam requests found for this course." 
                                : "Please select a course to see pending requests."}
                        </div>
                    )}
                </div>

                {/* --- Time Table Section --- */}
                <div className="md:col-span-2 mt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
                            <h3 className="font-bold text-sm uppercase tracking-wider">
                                Time Table Examination {selectedCourse && `- ${courses.find(c => c._id === selectedCourse)?.name}`}
                            </h3>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Manual Entry</span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-blue-100 text-blue-900 uppercase text-[10px] font-bold border-b border-blue-200">
                                    <tr>
                                        <th className="px-4 py-2 border-r border-blue-200">Subject</th>
                                        <th className="px-4 py-2 border-r border-blue-200 w-32">Date</th>
                                        <th className="px-4 py-2 border-r border-blue-200">Time</th>
                                        <th className="px-4 py-2 border-r border-blue-200 text-center w-24">Theory</th>
                                        <th className="px-4 py-2 border-r border-blue-200 text-center w-24">Practical</th>
                                        <th className="px-4 py-2 text-center w-24">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeTableData.length > 0 ? (
                                        timeTableData.map((item, index) => (
                                            <tr key={index} className="border-b border-blue-100 bg-white hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-700 border-r border-blue-100">
                                                    {item.name}
                                                </td>
                                                <td className="px-3 py-2 border-r border-blue-100">
                                                    <input 
                                                        type="date" 
                                                        value={item.date ? new Date(item.date).toISOString().split('T')[0] : ''} 
                                                        onChange={(e) => updateTimeTableField(index, 'date', e.target.value)}
                                                        className="w-full text-xs border rounded p-1 focus:ring-1 focus:ring-blue-400 outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r border-blue-100">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] text-gray-400 w-6">From:</span>
                                                            <input 
                                                                type="time" 
                                                                value={item.startTime || ''} 
                                                                onChange={(e) => updateTimeTableField(index, 'startTime', e.target.value)}
                                                                className="flex-1 text-[10px] border rounded p-0.5 focus:ring-1 focus:ring-blue-400 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] text-gray-400 w-6">To:</span>
                                                            <input 
                                                                type="time" 
                                                                value={item.endTime || ''} 
                                                                onChange={(e) => updateTimeTableField(index, 'endTime', e.target.value)}
                                                                className="flex-1 text-[10px] border rounded p-0.5 focus:ring-1 focus:ring-blue-400 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 border-r border-blue-100">
                                                    <input 
                                                        type="number" 
                                                        placeholder="0"
                                                        value={item.theory} 
                                                        onChange={(e) => updateTimeTableField(index, 'theory', e.target.value)}
                                                        className="w-full text-xs border rounded p-1 font-bold text-center"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r border-blue-100">
                                                    <input 
                                                        type="number" 
                                                        placeholder="0"
                                                        value={item.practical} 
                                                        onChange={(e) => updateTimeTableField(index, 'practical', e.target.value)}
                                                        className="w-full text-xs border rounded p-1 font-bold text-center"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold text-blue-700 bg-blue-50/50">
                                                    {item.total || 0}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-400 italic">
                                                Select a course to populate subjects...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 text-[10px] text-blue-600 italic">
                            * Note: REGD NO. should be required in the examination at the time of entry.
                        </div>
                    </div>
                </div>
                
                <div className="md:col-span-2 flex gap-2 justify-end mt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-green-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                        {isLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* --- FILTER SECTION --- */}
      {!showForm && !detailView && (
        <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-600 mb-1">Filter by Course</label>
                <select className="border p-2 rounded w-full text-sm" value={filters.courseId} onChange={(e) => setFilters({...filters, courseId: e.target.value})}>
                    <option value="">-- All Courses --</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
            </div>
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-600 mb-1">Filter by Exam Name</label>
                <input className="border p-2 rounded w-full text-sm" placeholder="Search..." value={filters.examName} onChange={(e) => setFilters({...filters, examName: e.target.value})} />
            </div>
            <div className="flex gap-2">
                <button onClick={onReset} className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-1 hover:bg-gray-300"><RefreshCw size={16}/> Reset</button>
                <button onClick={onSearch} className="bg-gray-800 text-white px-6 py-2 rounded flex items-center gap-1 hover:bg-black"><Search size={16}/> Search</button>
            </div>
        </div>
      )}

      {/* --- TABLE SECTION --- */}
      {!detailView && (
        <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Serial No</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Exam Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course Name</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Active Status</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.length > 0 ? paginatedData.map((schedule, index) => (
                        <tr key={schedule._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{schedule.examName}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{schedule.course?.name}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 text-xs rounded-full ${schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {schedule.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-3">
                                <button onClick={() => setDetailView(schedule._id)} className="text-blue-600 hover:text-blue-800" title="View Details"><Eye size={18} /></button>
                                <button onClick={() => handleEdit(schedule)} className="text-green-600 hover:text-green-800" title="Edit"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(schedule._id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={18} /></button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="text-center py-8 text-gray-500">No schedules found.</td></tr>
                    )}
                </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div className="p-4 flex justify-between items-center bg-gray-50 border-t">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows:</span>
                    <select className="border rounded p-1 text-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                        <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">Prev</button>
                    <span className="text-sm font-medium pt-1">Page {page} of {totalPages || 1}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
      )}

      {/* --- DETAILS MODAL / VIEW --- */}
      {detailView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold">Exam Schedule Details</h3>
                <button onClick={() => setDetailView(null)} className="bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors">
                    <X size={20}/>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                {isDetailLoading ? (
                    <div className="text-center py-20 italic text-gray-400">Loading schedule details...</div>
                ) : (
                    <div className="space-y-8">
                        {/* 1. Time Table Section */}
                        <section>
                            <h4 className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <RefreshCw size={16} className="text-blue-500"/>
                                Examination Time Table
                            </h4>
                            <div className="border rounded-lg overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Subject</th>
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Time</th>
                                            <th className="px-4 py-3 text-center">Theory</th>
                                            <th className="px-4 py-3 text-center">Practical</th>
                                            <th className="px-4 py-3 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {detailData.timeTable?.length > 0 ? detailData.timeTable.map((tt, i) => (
                                            <tr key={i} className="hover:bg-blue-50/30">
                                                <td className="px-4 py-3 font-bold text-gray-800">{tt.subject?.name || 'Subject'}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {tt.date ? new Date(tt.date).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {tt.startTime && tt.endTime ? `${tt.startTime} To ${tt.endTime}` : tt.startTime || tt.endTime || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium">{tt.theory || 0}</td>
                                                <td className="px-4 py-3 text-center font-medium">{tt.practical || 0}</td>
                                                <td className="px-4 py-3 text-center font-bold text-blue-700">{tt.total || 0}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" className="text-center py-4 text-gray-400 italic">No timetable found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 2. Attendees Section */}
                        <section>
                            <h4 className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-blue-500"/>
                                Student Attendees ({detailData.attendees?.length || 0})
                            </h4>
                            <div className="border rounded-lg overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Sr. No.</th>
                                            <th className="px-4 py-3 text-left">Reg No</th>
                                            <th className="px-4 py-3 text-left">Student Name</th>
                                            <th className="px-4 py-3 text-left">Admission Date</th>
                                            <th className="px-4 py-3 text-left">Mobile</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {detailData.attendees?.length > 0 ? detailData.attendees.map((d, i) => (
                                            <tr key={d._id} className="hover:bg-blue-50/30">
                                                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-3 font-mono font-medium text-gray-700">{d.regNo}</td>
                                                <td className="px-4 py-3 font-bold text-primary">{d.studentName}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {new Date(d.admissionDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{d.mobile}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="text-center py-4 text-gray-400 italic">No attendees found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </div>
            
            <div className="bg-gray-50 p-4 border-t flex justify-end shrink-0">
                <button onClick={() => setDetailView(null)} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-100 transition-all">
                    Close Details
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamSchedule;
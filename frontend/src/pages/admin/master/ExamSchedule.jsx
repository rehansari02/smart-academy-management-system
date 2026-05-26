import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses, fetchExamSchedules, createExamSchedule, updateExamSchedule, deleteExamSchedule, resetMasterStatus, fetchExams, createExam } from '../../../features/master/masterSlice';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Plus, Search, RefreshCw, Edit, Trash2, Eye, X, Save, AlertCircle } from 'lucide-react';
import axios from 'axios'; // For direct detail fetch

const parseTimeToParts = (timeStr) => {
    if (!timeStr) return { hour: '10', minute: '00', period: 'AM' };
    
    // Check if it's already in 12h format like "10:30 AM" or "10:30AM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        return {
            hour: match12[1].padStart(2, '0'),
            minute: match12[2],
            period: match12[3].toUpperCase()
        };
    }
    
    // Check if it's in 24h format like "14:30"
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        let hour = parseInt(match24[1], 10);
        const minute = match24[2];
        let period = 'AM';
        if (hour >= 12) {
            period = 'PM';
            if (hour > 12) hour -= 12;
        }
        if (hour === 0) hour = 12;
        return {
            hour: hour.toString().padStart(2, '0'),
            minute,
            period
        };
    }
    
    return { hour: '10', minute: '00', period: 'AM' };
};

const buildTimeStr = (hour, minute, period) => {
    return `${hour}:${minute} ${period}`;
};

const ExamSchedule = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { courses, examSchedules, exams, isSuccess, message, isLoading } = useSelector((state) => state.master);
  
  // Local State
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [filters, setFilters] = useState({ courseId: '', examName: '' });
  const [detailView, setDetailView] = useState(null); // ID of schedule to show details
  const [detailData, setDetailData] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Local State for Exam Search & Quick Add
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [coursesWithRequests, setCoursesWithRequests] = useState([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);

  // States for Exam Name search filter dropdown
  const [isFilterExamDropdownOpen, setIsFilterExamDropdownOpen] = useState(false);
  const [filterExamSearch, setFilterExamSearch] = useState('');

  // States for Course search dropdown in form
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  // States for Course search dropdown in filters
  const [isFilterCourseDropdownOpen, setIsFilterCourseDropdownOpen] = useState(false);
  const [filterCourseSearch, setFilterCourseSearch] = useState('');
  
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
  const selectedExamName = watch('examName');
  const selectedCourseObj = courses.find(c => c._id === selectedCourse);
  const selectedCourseName = selectedCourseObj ? selectedCourseObj.name : '';

  const buildTimeTableFromCourse = (course, existingTimeTable = []) => {
    const existingBySubject = new Map(
        (existingTimeTable || []).map(item => [
            String(item.subject?._id || item.subject),
            item
        ])
    );

    const courseSubjects = [...(course?.subjects || [])]
        .filter(item => item.subject)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (courseSubjects.length === 0) {
        return (existingTimeTable || []).map(item => ({
            ...item,
            subject: item.subject?._id || item.subject,
            name: item.subject?.name || item.name || 'Subject',
            total: Number(item.total) || (Number(item.theory) || 0) + (Number(item.practical) || 0)
        }));
    }

    return courseSubjects.map(item => {
        const subject = item.subject;
        const saved = existingBySubject.get(String(subject._id));
        const theory = saved?.theory ?? subject.theoryMarks ?? 0;
        const practical = saved?.practical ?? subject.practicalMarks ?? 0;

        return {
            subject: subject._id,
            name: subject.name,
            date: saved?.date || '',
            startTime: saved?.startTime || '10:00 AM',
            endTime: saved?.endTime || '01:00 PM',
            theory,
            practical,
            total: Number(saved?.total) || Number(subject.totalMarks) || ((Number(theory) || 0) + (Number(practical) || 0))
        };
    });
  };

  const handleCreateExamName = async () => {
    if (!newExamName.trim()) {
      toast.error('Exam name is required');
      return;
    }
    const resultAction = await dispatch(createExam({ name: newExamName }));
    if (createExam.fulfilled.match(resultAction)) {
      setValue('examName', resultAction.payload.name);
      setNewExamName('');
      setShowNewExamModal(false);
      setIsExamDropdownOpen(false);
      setExamSearch('');
    } else {
      toast.error(resultAction.payload || 'Failed to create Exam Name');
    }
  };

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchExamSchedules());
    dispatch(fetchExams());
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

  // Fetch unique courses that have pending exam requests
  useEffect(() => {
    setIsCoursesLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/master/exam-request`, { withCredentials: true })
      .then(res => {
        const uniqueCoursesMap = {};
        res.data.forEach(req => {
          if (req.student && req.student.course) {
            const course = req.student.course;
            uniqueCoursesMap[course._id] = course;
          }
        });
        
        // Keep current schedule's course in list if editing
        if (editMode) {
          const currentSchedule = examSchedules.find(s => s._id === editMode);
          if (currentSchedule && currentSchedule.course) {
            uniqueCoursesMap[currentSchedule.course._id] = currentSchedule.course;
          }
        }
        setCoursesWithRequests(Object.values(uniqueCoursesMap));
      })
      .catch(err => {
        toast.error("Failed to load courses with pending requests");
      })
      .finally(() => {
        setIsCoursesLoading(false);
      });
  }, [showForm, editMode, examSchedules]);

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
                setTimeTableData(buildTimeTableFromCourse(course));
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
    setFilterExamSearch('');
    setFilterCourseSearch('');
    dispatch(fetchExamSchedules());
  };

  const onSubmit = (data) => {
    const finalData = { 
        ...data, 
        attendees: selectedAttendees,
        timeTable: timeTableData.map(item => ({
            subject: item.subject,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            theory: item.theory,
            practical: item.practical,
            total: item.total || ((Number(item.theory) || 0) + (Number(item.practical) || 0))
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
    const course = courses.find(c => c._id === schedule.course?._id);
    if (course) {
        setTimeTableData(buildTimeTableFromCourse(course, schedule.timeTable));
    } else {
        setTimeTableData(buildTimeTableFromCourse(null, schedule.timeTable));
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
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                        Course {isCoursesLoading && <span className="text-gray-400 text-xs italic">(Loading...)</span>}
                    </label>
                    <input type="hidden" {...register('course', {required: true})} />
                    
                    <div className="relative">
                        <button 
                            type="button"
                            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                            className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                        >
                            <span className={selectedCourse ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {selectedCourseName || '-- Select Course --'}
                            </span>
                            <span className="text-gray-500">▼</span>
                        </button>
                        
                        {isCourseDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[300px] overflow-y-auto p-2">
                                <div className="p-1 mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="Search Course..."
                                        value={courseSearch}
                                        onChange={(e) => setCourseSearch(e.target.value)}
                                        className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                                    {coursesWithRequests && coursesWithRequests.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())).length > 0 ? (
                                        coursesWithRequests.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())).map(c => (
                                            <div 
                                                key={c._id} 
                                                onClick={() => {
                                                    setValue('course', c._id);
                                                    setIsCourseDropdownOpen(false);
                                                    setCourseSearch('');
                                                }}
                                                className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-700 cursor-pointer rounded transition-all"
                                            >
                                                {c.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-xs text-gray-400 text-center">
                                            No matching courses found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Exam Name</label>
                    <input type="hidden" {...register('examName', {required: true})} />
                    
                    <div className="relative">
                        <button 
                            type="button"
                            onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                            className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                        >
                            <span className={selectedExamName ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {selectedExamName || '-- Select Exam --'}
                            </span>
                            <span className="text-gray-500">▼</span>
                        </button>
                        
                        {isExamDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[300px] overflow-y-auto p-2">
                                <div className="flex gap-2 mb-2 p-1">
                                    <input 
                                        type="text" 
                                        placeholder="Search Exam..."
                                        value={examSearch}
                                        onChange={(e) => setExamSearch(e.target.value)}
                                        className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowNewExamModal(true)} 
                                        className="bg-primary text-white text-xs px-2.5 py-1.5 rounded hover:bg-blue-700 whitespace-nowrap flex items-center gap-1 font-bold"
                                    >
                                        <Plus size={14}/> Add New
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                                    {exams && exams.filter(exam => exam.name.toLowerCase().includes(examSearch.toLowerCase())).length > 0 ? (
                                        exams.filter(exam => exam.name.toLowerCase().includes(examSearch.toLowerCase())).map(exam => (
                                            <div 
                                                key={exam._id} 
                                                onClick={() => {
                                                    setValue('examName', exam.name);
                                                    setIsExamDropdownOpen(false);
                                                    setExamSearch('');
                                                }}
                                                className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-700 cursor-pointer rounded transition-all"
                                            >
                                                {exam.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-xs text-gray-400 text-center">
                                            No matching exam names. Click "Add New" to create one.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
                                        <th className="px-4 py-2 border-r border-blue-200 text-center w-16">Sr. No.</th>
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
                                                <td className="px-4 py-3 text-center font-bold text-gray-500 border-r border-blue-100">
                                                    {index + 1}
                                                </td>
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
                                                <td className="px-3 py-2 border-r border-blue-100 min-w-[210px]">
                                                    <div className="flex flex-col gap-1.5">
                                                        {/* Start Time */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-bold text-gray-400 w-8">From:</span>
                                                            {(() => {
                                                                const startParts = parseTimeToParts(item.startTime);
                                                                return (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <select 
                                                                            value={startParts.hour} 
                                                                            onChange={(e) => updateTimeTableField(index, 'startTime', buildTimeStr(e.target.value, startParts.minute, startParts.period))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-medium focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                                                                                <option key={h} value={h}>{h}</option>
                                                                            ))}
                                                                        </select>
                                                                        <span className="text-[10px] font-bold">:</span>
                                                                        <select 
                                                                            value={startParts.minute} 
                                                                            onChange={(e) => updateTimeTableField(index, 'startTime', buildTimeStr(startParts.hour, e.target.value, startParts.period))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-medium focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                                                                <option key={m} value={m}>{m}</option>
                                                                            ))}
                                                                        </select>
                                                                        <select 
                                                                            value={startParts.period} 
                                                                            onChange={(e) => updateTimeTableField(index, 'startTime', buildTimeStr(startParts.hour, startParts.minute, e.target.value))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-bold text-blue-600 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            <option value="AM">AM</option>
                                                                            <option value="PM">PM</option>
                                                                        </select>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        
                                                        {/* End Time */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-bold text-gray-400 w-8">To:</span>
                                                            {(() => {
                                                                const endParts = parseTimeToParts(item.endTime);
                                                                return (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <select 
                                                                            value={endParts.hour} 
                                                                            onChange={(e) => updateTimeTableField(index, 'endTime', buildTimeStr(e.target.value, endParts.minute, endParts.period))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-medium focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                                                                                <option key={h} value={h}>{h}</option>
                                                                            ))}
                                                                        </select>
                                                                        <span className="text-[10px] font-bold">:</span>
                                                                        <select 
                                                                            value={endParts.minute} 
                                                                            onChange={(e) => updateTimeTableField(index, 'endTime', buildTimeStr(endParts.hour, e.target.value, endParts.period))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-medium focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                                                                <option key={m} value={m}>{m}</option>
                                                                            ))}
                                                                        </select>
                                                                        <select 
                                                                            value={endParts.period} 
                                                                            onChange={(e) => updateTimeTableField(index, 'endTime', buildTimeStr(endParts.hour, endParts.minute, e.target.value))}
                                                                            className="border rounded p-0.5 text-[10px] bg-white font-bold text-blue-600 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                        >
                                                                            <option value="AM">AM</option>
                                                                            <option value="PM">PM</option>
                                                                        </select>
                                                                    </div>
                                                                );
                                                            })()}
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
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-400 italic">
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
            <div className="flex-1 min-w-[200px] relative">
                <label className="block text-xs font-bold text-gray-600 mb-1">Filter by Course</label>
                <div className="relative">
                    <button 
                        type="button"
                        onClick={() => setIsFilterCourseDropdownOpen(!isFilterCourseDropdownOpen)}
                        className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                    >
                        <span className={filters.courseId ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                            {coursesWithRequests.find(c => c._id === filters.courseId)?.name || '-- All Active Courses --'}
                        </span>
                        <span className="text-gray-500">▼</span>
                    </button>
                    
                    {isFilterCourseDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[300px] overflow-y-auto p-2">
                            <div className="flex gap-2 mb-2 p-1">
                                <input 
                                    type="text" 
                                    placeholder="Search Course..."
                                    value={filterCourseSearch}
                                    onChange={(e) => setFilterCourseSearch(e.target.value)}
                                    className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none"
                                />
                                {filters.courseId && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setFilters({...filters, courseId: ''});
                                            setIsFilterCourseDropdownOpen(false);
                                            setFilterCourseSearch('');
                                        }}
                                        className="bg-red-500 text-white text-xs px-2.5 py-1.5 rounded hover:bg-red-600 font-bold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                                <div 
                                    onClick={() => {
                                        setFilters({...filters, courseId: ''});
                                        setIsFilterCourseDropdownOpen(false);
                                        setFilterCourseSearch('');
                                    }}
                                    className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-500 cursor-pointer rounded transition-all italic"
                                >
                                    -- All Active Courses --
                                </div>
                                {coursesWithRequests && coursesWithRequests.filter(c => c.name.toLowerCase().includes(filterCourseSearch.toLowerCase())).length > 0 ? (
                                    coursesWithRequests.filter(c => c.name.toLowerCase().includes(filterCourseSearch.toLowerCase())).map(c => (
                                        <div 
                                            key={c._id} 
                                            onClick={() => {
                                                setFilters({...filters, courseId: c._id});
                                                setIsFilterCourseDropdownOpen(false);
                                                setFilterCourseSearch('');
                                            }}
                                            className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-700 cursor-pointer rounded transition-all"
                                        >
                                            {c.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-gray-400 text-center">
                                        No matching active courses found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 min-w-[200px] relative">
                <label className="block text-xs font-bold text-gray-600 mb-1">Filter by Exam Name</label>
                <div className="relative">
                    <button 
                        type="button"
                        onClick={() => setIsFilterExamDropdownOpen(!isFilterExamDropdownOpen)}
                        className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                    >
                        <span className={filters.examName ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                            {filters.examName || '-- All Exams --'}
                        </span>
                        <span className="text-gray-500">▼</span>
                    </button>
                    
                    {isFilterExamDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[300px] overflow-y-auto p-2">
                            <div className="flex gap-2 mb-2 p-1">
                                <input 
                                    type="text" 
                                    placeholder="Search Exam..."
                                    value={filterExamSearch}
                                    onChange={(e) => setFilterExamSearch(e.target.value)}
                                    className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none"
                                />
                                {filters.examName && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setFilters({...filters, examName: ''});
                                            setIsFilterExamDropdownOpen(false);
                                            setFilterExamSearch('');
                                        }}
                                        className="bg-red-500 text-white text-xs px-2.5 py-1.5 rounded hover:bg-red-600 font-bold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                                <div 
                                    onClick={() => {
                                        setFilters({...filters, examName: ''});
                                        setIsFilterExamDropdownOpen(false);
                                        setFilterExamSearch('');
                                    }}
                                    className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-500 cursor-pointer rounded transition-all italic"
                                >
                                    -- All Exams --
                                </div>
                                {exams && exams.filter(exam => exam.name.toLowerCase().includes(filterExamSearch.toLowerCase())).length > 0 ? (
                                    exams.filter(exam => exam.name.toLowerCase().includes(filterExamSearch.toLowerCase())).map(exam => (
                                        <div 
                                            key={exam._id} 
                                            onClick={() => {
                                                setFilters({...filters, examName: exam.name});
                                                setIsFilterExamDropdownOpen(false);
                                                setFilterExamSearch('');
                                            }}
                                            className="p-2 text-xs font-semibold hover:bg-blue-50 text-gray-700 cursor-pointer rounded transition-all"
                                        >
                                            {exam.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-gray-400 text-center">
                                        No matching exam names found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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
                                            <th className="px-4 py-3 text-left">Sr. No.</th>
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
                                                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
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
                                            <tr><td colSpan="7" className="text-center py-4 text-gray-400 italic">No timetable found.</td></tr>
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

      {/* --- QUICK ADD EXAM NAME MODAL --- */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 border border-gray-100">
            <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
              <Plus size={18} className="text-primary" /> Create New Exam Name
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Exam Name</label>
                <input 
                  type="text" 
                  value={newExamName} 
                  onChange={(e) => setNewExamName(e.target.value)} 
                  placeholder="e.g. Final Examination 2026" 
                  className="border p-2 rounded w-full text-sm focus:ring-1 focus:ring-primary outline-none font-semibold"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowNewExamModal(false); setNewExamName(''); }} 
                  className="border px-4 py-2 rounded text-sm hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleCreateExamName} 
                  className="bg-green-600 text-white px-5 py-2 rounded text-sm font-bold hover:bg-green-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamSchedule;

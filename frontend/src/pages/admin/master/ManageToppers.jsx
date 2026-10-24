import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trophy, Plus, Search, Edit, Trash2, X, Image as ImageIcon, ChevronDown } from 'lucide-react';
import topperService from '../../../services/topperService';
import { fetchCourses, fetchExamSchedules, fetchExamResults } from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const ManageToppers = () => {
    const dispatch = useDispatch();
    const { courses, examSchedules, examResults } = useSelector((state) => state.master);
    
    // --- State ---
    const [toppersList, setToppersList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const { add, edit, delete: canDelete } = useUserRights('Topper Result');
    const [formData, setFormData] = useState({
        name: '',
        course: '',
        percentage: '',
        isActive: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Cascading Dropdown State for Form
    const [selectedExamName, setSelectedExamName] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

    // --- Effects ---
    useEffect(() => {
        fetchToppers();
        if (courses.length === 0) {
            dispatch(fetchCourses());
        }
        dispatch(fetchExamSchedules());
        dispatch(fetchExamResults());
    }, [dispatch, courses.length]);

    // --- Methods ---
    const fetchToppers = async () => {
        setLoading(true);
        try {
            const data = await topperService.getAllToppers();
            setToppersList(data);
        } catch (error) {
            console.error("Error fetching toppers:", error);
            toast.error("Failed to load topper results.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddNew = () => {
        setEditMode(false);
        setFormData({
            name: '',
            course: '',
            percentage: '',
            isActive: true
        });
        setSelectedExamName('');
        setSelectedCourseId('');
        setSelectedStudentId('');
        setStudentSearch('');
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const handleEdit = (topper) => {
        setEditMode(true);
        setCurrentId(topper._id);
        setFormData({
            name: topper.name,
            course: topper.course,
            percentage: topper.percentage,
            isActive: topper.isActive
        });
        setSelectedExamName('');
        setSelectedCourseId('');
        setSelectedStudentId('');
        setImagePreview(topper.image);
        setImageFile(null);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete topper results.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this topper result?')) {
            try {
                await topperService.deleteTopper(id);
                toast.success("Topper result deleted successfully");
                fetchToppers();
            } catch (error) {
                console.error("Error deleting topper:", error);
                toast.error("Failed to delete topper result");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('course', formData.course);
        data.append('percentage', formData.percentage);
        data.append('isActive', formData.isActive);
        if (imageFile) {
            data.append('image', imageFile);
        } else if (imagePreview) {
            data.append('image', imagePreview);
        }

        try {
            if (editMode) {
                if (!edit) {
                    showPermissionDenied("You don't have authority to edit topper results.");
                    return;
                }
                await topperService.updateTopper(currentId, data);
                toast.success("Topper result updated successfully");
            } else {
                if (!add) {
                    showPermissionDenied("You don't have authority to add topper results.");
                    return;
                }
                await topperService.createTopper(data);
                toast.success("Topper result created successfully");
            }
            setShowModal(false);
            fetchToppers();
        } catch (error) {
            console.error("Error saving topper:", error);
            toast.error(error.response?.data?.message || "Failed to save topper result");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter active exam schedules
    const activeExamSchedules = React.useMemo(() => {
        return (examSchedules || []).filter(e => e.isActive !== false && !e.isDeleted && e.course && e.examName);
    }, [examSchedules]);

    // Unique exam names
    const uniqueExamNames = React.useMemo(() => {
        const names = new Set();
        activeExamSchedules.forEach(e => {
            if (e.examName) names.add(e.examName);
        });
        return Array.from(names);
    }, [activeExamSchedules]);

    // Courses for selected exam name or all courses
    const coursesForSelectedExamName = React.useMemo(() => {
        if (selectedExamName) {
            const coursesMap = new Map();
            activeExamSchedules
                .filter(e => e.examName === selectedExamName)
                .forEach(e => {
                    const c = e.course;
                    const cId = c?._id || c;
                    if (cId) {
                        coursesMap.set(String(cId), typeof c === 'object' ? c : { _id: cId, name: 'Course' });
                    }
                });
            return Array.from(coursesMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return (courses || []).filter(c => !c.isDeleted);
    }, [selectedExamName, activeExamSchedules, courses]);

    // Students for selected course & exam
    const studentsForSelection = React.useMemo(() => {
        if (!selectedCourseId) return [];
        const courseIdStr = String(selectedCourseId);

        const matchingSchedules = activeExamSchedules.filter(e => {
            const courseMatches = String(e.course?._id || e.course) === courseIdStr;
            const examMatches = selectedExamName ? e.examName === selectedExamName : true;
            return courseMatches && examMatches;
        });

        const matchingScheduleIdSet = new Set(matchingSchedules.map(e => String(e._id)));
        const studentMap = new Map();

        // 1. From ExamResults (official marked results)
        (examResults || []).forEach(r => {
            if (r.isDeleted) return;
            const rExamId = String(r.exam?._id || r.exam || '');
            const rCourseId = String(r.course?._id || r.course || '');
            const rExamName = r.exam?.examName || '';

            const isScheduleMatch = matchingScheduleIdSet.has(rExamId);
            const isNameAndCourseMatch = selectedExamName 
                ? (rExamName === selectedExamName && rCourseId === courseIdStr)
                : (rCourseId === courseIdStr);

            if (isScheduleMatch || isNameAndCourseMatch) {
                const s = r.student;
                const sId = String(s?._id || s || r._id);
                const fullName = `${s?.firstName || ''} ${s?.middleName || ''} ${s?.lastName || ''}`.replace(/\s+/g, ' ').trim();
                const total = Number(r.totalMarks || 0);
                const obtained = Number(r.marksObtained || 0);
                const pct = total > 0 ? ((obtained / total) * 100).toFixed(2) : '0';

                studentMap.set(sId, {
                    key: `result_${r._id}`,
                    studentId: sId,
                    resultId: r._id,
                    name: fullName || 'Unnamed Student',
                    courseName: r.course?.name || '',
                    percentage: pct,
                    regNo: s?.regNo || '',
                    enrollmentNo: s?.enrollmentNo || '',
                    studentPhoto: s?.studentPhoto || '',
                    source: `Exam Result (${pct}%)`,
                    hasResult: true
                });
            }
        });

        // 2. From Schedule Attendees (if student was scheduled in this course/exam)
        matchingSchedules.forEach(schedule => {
            (schedule.attendees || []).forEach(att => {
                if (!att) return;
                const sId = String(att._id || att);
                if (!studentMap.has(sId)) {
                    const fullName = typeof att === 'object' 
                        ? `${att.firstName || ''} ${att.middleName || ''} ${att.lastName || ''}`.replace(/\s+/g, ' ').trim()
                        : 'Scheduled Student';
                    const courseName = schedule.course?.name || '';
                    studentMap.set(sId, {
                        key: `attendee_${schedule._id}_${sId}`,
                        studentId: sId,
                        resultId: null,
                        name: fullName || 'Scheduled Student',
                        courseName,
                        percentage: '',
                        regNo: att.regNo || '',
                        enrollmentNo: att.enrollmentNo || '',
                        studentPhoto: att.studentPhoto || '',
                        source: 'Scheduled Attendee',
                        hasResult: false
                    });
                }
            });
        });

        return Array.from(studentMap.values()).sort((a, b) => {
            const pA = parseFloat(a.percentage) || 0;
            const pB = parseFloat(b.percentage) || 0;
            if (pB !== pA) return pB - pA;
            return a.name.localeCompare(b.name);
        });
    }, [selectedCourseId, selectedExamName, activeExamSchedules, examResults]);

    const filteredStudents = React.useMemo(() => {
        if (!studentSearch.trim()) return studentsForSelection;
        const q = studentSearch.trim().toLowerCase();
        return studentsForSelection.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.regNo && s.regNo.toLowerCase().includes(q)) ||
            (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q))
        );
    }, [studentsForSelection, studentSearch]);

    const handleStudentSelect = (selectedKey) => {
        const selected = studentsForSelection.find(s => s.key === selectedKey || s.studentId === selectedKey || s.resultId === selectedKey);
        if (selected) {
            setSelectedStudentId(selected.key);
            
            setFormData(prev => ({
                ...prev,
                name: selected.name,
                course: selected.courseName || prev.course,
                percentage: selected.percentage || prev.percentage
            }));

            if (selected.studentPhoto) {
                const photoUrl = selected.studentPhoto.startsWith('http') 
                    ? selected.studentPhoto 
                    : `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${selected.studentPhoto.replace(/^\/+/, '')}`;
                setImagePreview(photoUrl);
                setImageFile(null);
            } else {
                setImagePreview(null);
                setImageFile(null);
            }
        } else {
            setSelectedStudentId('');
        }
    };

    const filteredToppers = toppersList.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="bg-white rounded-lg shadow-lg p-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manage Topper Results</h2>
                            <p className="text-sm text-gray-500">Add and manage student success stories</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={20} /> Add New Result
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or course..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm text-gray-600 uppercase tracking-wider">
                                <th className="p-3 border-b w-12 text-center">Sr No</th>
                                <th className="p-3 border-b">Image</th>
                                <th className="p-3 border-b">Student Name</th>
                                <th className="p-3 border-b">Course</th>
                                <th className="p-3 border-b">Percentage</th>
                                <th className="p-3 border-b">Status</th>
                                <th className="p-3 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-500">Loading results...</td></tr>
                            ) : filteredToppers.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-500">No results found.</td></tr>
                            ) : (
                                filteredToppers.map((topper, index) => (
                                    <tr key={topper._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                        <td className="p-3 text-center font-medium text-gray-500">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border">
                                                <img src={topper.image || 'https://via.placeholder.com/150'} alt={topper.name} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-800">{topper.name}</td>
                                        <td className="p-3 text-gray-600">{topper.course}</td>
                                        <td className="p-3">
                                            <span className="font-bold text-indigo-600">{topper.percentage}%</span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${topper.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {topper.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(topper)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(topper._id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {editMode ? 'Edit Topper Result' : 'Add New Topper Result'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="flex flex-col items-center mb-4">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-50 mb-2 relative group">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <ImageIcon size={40} />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                            <span className="text-white text-xs font-bold">Change Photo</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">Recommended: Square image, Max 5MB</p>
                                </div>

                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                            Auto-fill from Exam Result (Optional)
                                        </h4>
                                        {(selectedExamName || selectedCourseId || selectedStudentId) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedExamName('');
                                                    setSelectedCourseId('');
                                                    setSelectedStudentId('');
                                                    setStudentSearch('');
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* 1. Exam Dropdown */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Select Exam</label>
                                            <select
                                                value={selectedExamName}
                                                onChange={(e) => {
                                                    setSelectedExamName(e.target.value);
                                                    setSelectedCourseId('');
                                                    setSelectedStudentId('');
                                                    setStudentSearch('');
                                                }}
                                                className="w-full border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="">-- All / Filter by Exam --</option>
                                                {uniqueExamNames.map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Course Dropdown */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. Select Course</label>
                                            <select
                                                value={selectedCourseId}
                                                onChange={(e) => {
                                                    setSelectedCourseId(e.target.value);
                                                    setSelectedStudentId('');
                                                    setStudentSearch('');
                                                }}
                                                className="w-full border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="">-- Select Course --</option>
                                                {coursesForSelectedExamName.map(course => (
                                                    <option key={course._id} value={course._id}>{course.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 3. Student Dropdown */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. Select Student</label>
                                            <select
                                                value={selectedStudentId}
                                                onChange={(e) => handleStudentSelect(e.target.value)}
                                                disabled={!selectedCourseId}
                                                className="w-full border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-100 bg-white"
                                            >
                                                <option value="">
                                                    {!selectedCourseId 
                                                        ? '-- Select Course First --' 
                                                        : filteredStudents.length === 0 
                                                            ? '-- No Students Found --' 
                                                            : `-- Select Student (${filteredStudents.length} found) --`}
                                                </option>
                                                {filteredStudents.map(s => (
                                                    <option key={s.key} value={s.key}>
                                                        {s.name} {s.percentage ? `(${s.percentage}%)` : '(Pending)'} {s.regNo ? `- [${s.regNo}]` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Quick student search filter if multiple students exist */}
                                    {selectedCourseId && studentsForSelection.length > 5 && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                                <input
                                                    type="text"
                                                    placeholder="Quick filter students by name or Reg No..."
                                                    value={studentSearch}
                                                    onChange={(e) => setStudentSearch(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                                />
                                            </div>
                                            {studentSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setStudentSearch('')}
                                                    className="text-xs text-gray-500 hover:text-gray-700 font-bold px-2"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {selectedStudentId && (
                                        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
                                            ✓ Auto-filled: {studentsForSelection.find(s => s.key === selectedStudentId)?.name} ({studentsForSelection.find(s => s.key === selectedStudentId)?.source})
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                                    <input 
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Done</label>
                                    <div className="relative">
                                        <select 
                                            name="course"
                                            value={formData.course}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                                        >
                                            <option value="">Select a Course...</option>
                                            {formData.course && !(courses || []).some(c => c.name === formData.course) && (
                                                <option value={formData.course}>{formData.course}</option>
                                            )}
                                            {courses && courses.map(course => (
                                                <option key={course._id} value={course.name}>{course.name}</option>
                                            ))}
                                            {/* Fallback for manual entry or if list is empty */}
                                            {!courses.length && <option disabled>Loading courses...</option>}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Percentage / Grade</label>
                                        <input 
                                            type="number"
                                            name="percentage"
                                            value={formData.percentage}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="95.5"
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                name="isActive"
                                                checked={formData.isActive}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Show on Website</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {submitting ? 'Saving...' : (editMode ? 'Update' : 'Save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageToppers;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInquiries, updateInquiry } from '../../features/transaction/transactionSlice';
import { fetchExamRequests, fetchCourses, createExamRequest } from '../../features/master/masterSlice';
import { fetchExamPendingStudents } from '../../features/student/studentSlice';
import EmployeeDashboard from './EmployeeDashboard';
import { useUserRights } from '../../hooks/useUserRights';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ExternalLink, Clock, AlertCircle, CheckCircle, UserPlus, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminHome = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Redux Data
    const { inquiries } = useSelector((state) => state.transaction);
    const { pendingExams, courses } = useSelector((state) => state.master);
    const { examPendingStudents, examPendingPagination, isLoading: isExamLoading } = useSelector((state) => state.students);
    const { user } = useSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState('inquiry');
    const [confirmModal, setConfirmModal] = useState({ show: false, student: null, bulk: false });
    const [reasonModal, setReasonModal] = useState({ show: false, reason: '', studentName: '' });
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Exam Filters
    const [examFilters, setExamFilters] = useState({
        courseId: '',
        minPendingDays: ''
    });

    // Initial Fetch - Fetch ALL inquiries and filter them client-side
    useEffect(() => {
        // Fetch all inquiries without source filter to have complete data
        dispatch(fetchInquiries({}));
        // dispatch(fetchExamRequests()); // OLD
        dispatch(fetchExamPendingStudents({ page: 1, pageSize: 10 }));
        dispatch(fetchCourses());
    }, [dispatch]);

    // Filter inquiries based on active tab
    const quickContactInquiries = inquiries?.filter(inq => inq.source === 'QuickContact') || [];
    const onlineAdmissionInquiries = inquiries?.filter(inq => inq.source === 'OnlineAdmission') || [];

    const handleExamFilter = () => {
        dispatch(fetchExamPendingStudents({ ...examFilters, page: 1 }));
    };

    const handleResetExamFilter = () => {
        setExamFilters({ courseId: '', minPendingDays: '' });
        dispatch(fetchExamPendingStudents({ page: 1, pageSize: 10 }));
    };

    const handlePageChange = (newPage) => {
        dispatch(fetchExamPendingStudents({ ...examFilters, page: newPage }));
    };

    const handleTakeExam = (student) => {
        setConfirmModal({ show: true, student, bulk: false });
    };

    const handleBulkTakeExam = () => {
        if (selectedStudents.length === 0) return;
        setConfirmModal({ show: true, bulk: true });
    };

    const confirmTakeExam = () => {
        if (confirmModal.bulk) {
            dispatch(createExamRequest({ studentIds: selectedStudents })).then((res) => {
                if (!res.error) {
                    toast.success(`${selectedStudents.length} Exam requests created successfully!`);
                    dispatch(fetchExamPendingStudents({ ...examFilters, page: examPendingPagination.page }));
                    setConfirmModal({ show: false, student: null, bulk: false });
                    setSelectedStudents([]);
                    navigate('/master/exam-request-list');
                }
            });
        } else {
            if (!confirmModal.student) return;
            dispatch(createExamRequest({ studentId: confirmModal.student._id })).then((res) => {
                if (!res.error) {
                    toast.success("Exam request created successfully!");
                    dispatch(fetchExamPendingStudents({ ...examFilters, page: examPendingPagination.page }));
                    setConfirmModal({ show: false, student: null, bulk: false });
                }
            });
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedStudents(examPendingStudents.map(s => s._id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (id) => {
        setSelectedStudents(prev => 
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const handleAddToOnline = (inquiry) => {
        if (confirm(`Transfer inquiry for ${inquiry.firstName} to Online Inquiry list?`)) {
            dispatch(updateInquiry({
                id: inquiry._id,
                data: { source: 'Online' }
            })).then((res) => {
                if (!res.error) {
                    toast.success("Inquiry transferred to Online Inquiry list");
                    dispatch(fetchInquiries({})); // Refresh all inquiries
                }
            });
        }
    };


    // Check User Rights
    const { view: hasDashboardAccess } = useUserRights('Admin Home');
    const { view: canViewInquiryList } = useUserRights('Admin Home - Inquiry List');
    const { view: canViewOnlineAdmissions } = useUserRights('Admin Home - Online Admissions');
    const { view: canViewExamList } = useUserRights('Admin Home - Exam Pending List');

    // Conditionally Render Fallback
    // If user is logged in, NOT a Super Admin, and does NOT have 'Admin Home' view rights
    if (user && user.type !== 'Super Admin' && user.role !== 'Super Admin' && !hasDashboardAccess) {
        return <EmployeeDashboard />;
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-fadeIn">

            {/* --- Dashboard Header --- */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Admin Dashboard</h1>
                <p className="text-gray-500 mt-2">Daily Overview & Tasks</p>
            </div>

            {/* --- Tab Navigation --- */}
            <div className="flex justify-center mb-8">
                <div className="bg-white p-1 rounded-full shadow-md inline-flex border">
                    {(canViewInquiryList || (user && user.role === 'Super Admin')) && (
                        <button
                            onClick={() => setActiveTab('inquiry')}
                            className={`px-8 py-2 rounded-full font-medium transition-all ${activeTab === 'inquiry'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Inquiry List
                        </button>
                    )}

                    {(canViewOnlineAdmissions || (user && user.role === 'Super Admin')) && (
                        <button
                            onClick={() => setActiveTab('online-admission')}
                            className={`px-8 py-2 rounded-full font-medium transition-all ${activeTab === 'online-admission'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Online Admissions
                        </button>
                    )}

                    {(canViewExamList || (user && user.role === 'Super Admin')) && (
                        <button
                            onClick={() => setActiveTab('exam')}
                            className={`px-8 py-2 rounded-full font-medium transition-all ${activeTab === 'exam'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Student Exam Pending List
                        </button>
                    )}
                </div>
            </div>

            {/* --- CONTENT: INQUIRY LIST --- */}
            {activeTab === 'inquiry' && (canViewInquiryList || (user && user.role === 'Super Admin')) && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <AlertCircle size={20} className="text-blue-500" /> Recent Quick Contact Inquiries
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                Total: {quickContactInquiries.length}
                            </span>
                            <button onClick={() => dispatch(fetchInquiries({}))} className="p-1 hover:bg-gray-200 rounded-full transition-colors" title="Refresh">
                                <RefreshCw size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Serial No</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact Person</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mobile</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">State</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Branch</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact Detail</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Online Inquiry</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {quickContactInquiries.length > 0 ? quickContactInquiries.map((inq, index) => (
                                    <tr key={inq._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-blue-900">
                                            {inq.firstName} {inq.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.contactStudent}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.email || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.state || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.city || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{inq.branchId?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {inq.interestedCourse?.name || 'General'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                                            {inq.remarks || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleAddToOnline(inq)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 mx-auto shadow-sm transition-all"
                                                title="Add to Online Inquiry"
                                            >
                                                <CheckCircle size={12} /> Add Now
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="10" className="py-10 text-gray-500 w-full min-w-full">
                                            <div className="flex flex-col items-center justify-center w-full text-center">
                                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                                No Quick Contact inquiries found.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CONTENT: ONLINE ADMISSION LIST --- */}
            {activeTab === 'online-admission' && (canViewOnlineAdmissions || (user && user.role === 'Super Admin')) && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <UserPlus size={20} className="text-green-600" /> Online Admission
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                Total: {onlineAdmissionInquiries.length}
                            </span>
                            <button onClick={() => dispatch(fetchInquiries({}))} className="p-1 hover:bg-gray-200 rounded-full transition-colors" title="Refresh">
                                <RefreshCw size={16} className="text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Applied Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mobile</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Branch</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {onlineAdmissionInquiries.length > 0 ? onlineAdmissionInquiries.map((inq) => (
                                    <tr key={inq._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-blue-900">
                                            {inq.firstName} {inq.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.contactStudent}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inq.city || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                                            {inq.interestedCourse?.name || 'General'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {inq.branchId?.name || 'All'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => navigate('/master/student/new', { state: { inquiryData: inq } })}
                                                    className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1"
                                                    title="Complete Admission"
                                                >
                                                    <CheckCircle size={14} /> Admission
                                                </button>
                                                <button
                                                    onClick={() => handleAddToOnline(inq, 'OnlineAdmission')}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1"
                                                    title="Add to Online Inquiry"
                                                >
                                                    <CheckCircle size={14} /> Add to Online
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="py-10 text-gray-500 w-full min-w-full">
                                            <div className="flex flex-col items-center justify-center w-full text-center">
                                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                                No Online Admission inquiries found.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CONTENT: EXAM PENDING LIST (New Logic: Course Duration Ending) --- */}
            {activeTab === 'exam' && (canViewExamList || (user && user.role === 'Super Admin')) && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
                    <div className="bg-gray-50 px-6 py-4 border-b">
                        <div className="flex flex-wrap gap-4 items-end justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
                                    <Clock size={20} className="text-orange-500" /> Student Exam Pending List
                                </h3>
                                <p className="text-xs text-gray-500 italic">Students whose course duration is completing within 30 days or has ended.</p>
                            </div>

                            <div className="flex gap-2 items-center">
                                <select
                                    className="border rounded px-3 py-2 text-sm focus:ring-primary outline-none bg-white"
                                    value={examFilters.courseId}
                                    onChange={(e) => setExamFilters({ ...examFilters, courseId: e.target.value })}
                                >
                                    <option value="">-- All Courses --</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>

                                <button onClick={handleResetExamFilter} className="bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 transition-colors" title="Reset Filters">
                                    <RefreshCw size={18} />
                                </button>
                                <button onClick={handleExamFilter} className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-1 shadow-sm font-bold">
                                    <Search size={16} /> Filter
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                            onChange={handleSelectAll}
                                            checked={selectedStudents.length === examPendingStudents.length && examPendingStudents.length > 0}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sr No.</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Admission Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reg Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Pending Days</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Last Cancel Reason</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isExamLoading ? (
                                    <tr><td colSpan="9" className="text-center py-10"><RefreshCw className="animate-spin inline-block mr-2" /> Loading students...</td></tr>
                                ) : examPendingStudents.length > 0 ? examPendingStudents.map((student, index) => {
                                    const daysDiff = Math.ceil((new Date(student.courseEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    const isVeryClose = daysDiff <= 7;

                                    return (
                                        <tr key={student._id} className={`hover:bg-gray-50 transition-colors ${selectedStudents.includes(student._id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                    checked={selectedStudents.includes(student._id)}
                                                    onChange={() => handleSelectStudent(student._id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{(examPendingPagination.page - 1) * 10 + index + 1}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono font-bold text-gray-800">{student.regNo || '-'}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-blue-900">{student.firstName} {student.lastName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{student.course?.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{student.mobileStudent}</td>
                                            <td className="px-6 py-4 text-center text-sm font-medium">
                                                {new Date(student.courseEndDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isVeryClose ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {daysDiff} Days Remaining
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {student.cancellationReason ? (
                                                    <button 
                                                        onClick={() => setReasonModal({ show: true, reason: student.cancellationReason, studentName: `${student.firstName} ${student.lastName}` })}
                                                        className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-[10px] font-bold border border-red-200 transition-all flex items-center gap-1 mx-auto"
                                                    >
                                                        <AlertCircle size={10} /> View Reason
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="9" className="text-center py-10 text-gray-500">No students matching exam pending criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Bulk Actions Bar --- */}
                    {selectedStudents.length > 0 && (
                        <div className="bg-orange-50 px-6 py-3 border-t border-orange-200 flex items-center justify-between animate-fadeIn">
                            <div className="flex items-center gap-2 text-orange-800">
                                <AlertCircle size={18} />
                                <span className="text-sm font-bold">{selectedStudents.length} Students Selected</span>
                            </div>
                            <button 
                                onClick={handleBulkTakeExam}
                                className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2 transform active:scale-95"
                            >
                                <CheckCircle size={16} /> Take Exam for All Selected
                            </button>
                        </div>
                    )}

                    {/* --- Pagination --- */}
                    {examPendingPagination.pages > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
                            <p className="text-xs text-gray-500">Showing page {examPendingPagination.page} of {examPendingPagination.pages} ({examPendingPagination.count} total students)</p>
                            <div className="flex gap-2">
                                <button
                                    disabled={examPendingPagination.page === 1}
                                    onClick={() => handlePageChange(examPendingPagination.page - 1)}
                                    className="px-3 py-1 border rounded bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 text-xs font-bold"
                                >
                                    Previous
                                </button>
                                {[...Array(examPendingPagination.pages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`px-3 py-1 border rounded text-xs font-bold ${examPendingPagination.page === i + 1 ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    disabled={examPendingPagination.page === examPendingPagination.pages}
                                    onClick={() => handlePageChange(examPendingPagination.page + 1)}
                                    className="px-3 py-1 border rounded bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 text-xs font-bold"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* --- CUSTOM CONFIRMATION DIALOG --- */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all scale-100 border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-orange-100 p-4 rounded-full mb-4">
                                <Clock size={32} className="text-orange-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800 mb-2">
                                {confirmModal.bulk ? `Create Exam Requests for ${selectedStudents.length} Students?` : 'Create Exam Request?'}
                            </h3>
                            <p className="text-gray-500 text-sm mb-8">
                                {confirmModal.bulk 
                                    ? `Are you sure you want to create exam requests for the ${selectedStudents.length} selected students? This will move them to the Exam Request List.`
                                    : <>Are you sure you want to create an exam request for <span className="font-bold text-gray-800">{confirmModal.student?.firstName} {confirmModal.student?.lastName}</span>? This will move them to the Exam Request List.</>
                                }
                            </p>
                            
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={() => setConfirmModal({ show: false, student: null })}
                                    className="flex-1 px-6 py-3 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    No, Cancel
                                </button>
                                <button 
                                    onClick={confirmTakeExam}
                                    className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-primary hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                                >
                                    Yes, Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* --- CANCELLATION REASON MODAL --- */}
            {reasonModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all scale-100 border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-4 rounded-full mb-4">
                                <XCircle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800 mb-1">Cancellation Reason</h3>
                            <p className="text-xs text-gray-500 mb-4 font-semibold uppercase tracking-wider">{reasonModal.studentName}</p>
                            
                            <div className="bg-gray-50 rounded-lg p-4 w-full mb-6 border border-gray-200 min-h-[100px] flex items-center justify-center">
                                <p className="text-gray-700 text-sm italic">"{reasonModal.reason}"</p>
                            </div>
                            
                            <button 
                                onClick={() => setReasonModal({ show: false, reason: '', studentName: '' })}
                                className="w-full px-6 py-3 rounded-lg font-bold text-white bg-gray-800 hover:bg-gray-900 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHome;
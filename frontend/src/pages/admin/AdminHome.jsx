import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInquiries, updateInquiry } from '../../features/transaction/transactionSlice';
import { createExamRequest } from '../../features/master/masterSlice';
import { fetchExamPendingStudents } from '../../features/student/studentSlice';
import { getBranches } from '../../features/master/branchSlice';
import EmployeeDashboard from './EmployeeDashboard';
import { useUserRights } from '../../hooks/useUserRights';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, RefreshCw, ExternalLink, Clock, AlertCircle, CheckCircle, UserPlus, XCircle, BarChart3, Wallet, Users, CalendarDays, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const AdminHome = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Redux Data
    const { inquiries } = useSelector((state) => state.transaction);
    const { pendingExams } = useSelector((state) => state.master);
    const { examPendingStudents, examPendingAvailableCourses, examPendingPagination, isLoading: isExamLoading } = useSelector((state) => state.students);
    const { user } = useSelector((state) => state.auth);
    const { branches } = useSelector((state) => state.branch);

    const [activeTab, setActiveTab] = useState('inquiry');
    const [confirmModal, setConfirmModal] = useState({ show: false, student: null, bulk: false });
    const [reasonModal, setReasonModal] = useState({ show: false, reason: '', studentName: '' });
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardFilters, setDashboardFilters] = useState({
        period: 'today',
        branchId: '',
        fromDate: '',
        toDate: ''
    });

    // Exam Filters
    const [examFilters, setExamFilters] = useState({
        courseId: '',
        branchId: '',
        minPendingDays: 30
    });

    // Initial Fetch - Fetch ALL inquiries and filter them client-side
    useEffect(() => {
        // Fetch all inquiries without source filter to have complete data
        dispatch(fetchInquiries({}));
        // dispatch(fetchExamRequests()); // OLD
        dispatch(fetchExamPendingStudents({ page: 1, pageSize: 10 }));
        dispatch(getBranches());
    }, [dispatch]);

    // Filter inquiries based on active tab
    const quickContactInquiries = inquiries?.filter(inq => inq.source === 'QuickContact') || [];
    const onlineAdmissionInquiries = inquiries?.filter(inq => inq.source === 'OnlineAdmission') || [];

    const handleExamFilter = () => {
        const params = { page: 1, pageSize: 10 };
        if (examFilters.courseId) params.courseId = examFilters.courseId;
        if (examFilters.branchId) params.branchId = examFilters.branchId;
        if (examFilters.minPendingDays) params.minPendingDays = examFilters.minPendingDays;
        dispatch(fetchExamPendingStudents(params));
    };

    const handleResetExamFilter = () => {
        setExamFilters({ courseId: '', branchId: '', minPendingDays: 30 });
        dispatch(fetchExamPendingStudents({ page: 1, pageSize: 10 }));
    };

    const handlePageChange = (newPage) => {
        dispatch(fetchExamPendingStudents({ ...examFilters, page: newPage }));
    };

    const fetchDashboardData = async (override = {}) => {
        const filters = { ...dashboardFilters, ...override };
        setDashboardLoading(true);
        try {
            const params = {
                period: filters.period,
                ...(filters.branchId && { branchId: filters.branchId }),
                ...(filters.period === 'custom' && filters.fromDate && { fromDate: filters.fromDate }),
                ...(filters.period === 'custom' && filters.toDate && { toDate: filters.toDate })
            };
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/admin-dashboard/overview`, {
                params,
                withCredentials: true
            });
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard overview', error);
            toast.error('Failed to load dashboard overview');
        } finally {
            setDashboardLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchDashboardData();
        }
    }, [activeTab]);

    const handleDashboardFilterChange = (key, value) => {
        setDashboardFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyDashboardFilters = () => {
        fetchDashboardData();
    };

    const resetDashboardFilters = () => {
        const resetFilters = { period: 'today', branchId: '', fromDate: '', toDate: '' };
        setDashboardFilters(resetFilters);
        fetchDashboardData(resetFilters);
    };

    const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';

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

    const handleAddToOnline = async (inquiry) => {
        const studentName = `${inquiry.firstName || ''} ${inquiry.lastName || ''}`.trim() || 'this inquiry';
        const result = await Swal.fire({
            title: 'Add to Online Inquiry?',
            text: `Are you sure you want to transfer ${studentName} to the Online Inquiry list?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Add to Online',
            cancelButtonText: 'Cancel',
            customClass: {
                container: 'z-[9999]'
            }
        });

        if (result.isConfirmed) {
            const res = await dispatch(updateInquiry({
                id: inquiry._id,
                data: { source: 'Online' }
            }));

            if (!res.error) {
                toast.success("Inquiry transferred to Online Inquiry list");
                dispatch(fetchInquiries({}));
            }
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
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-2">Daily Overview & Tasks</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-sm transition ${
                        'bg-white text-primary border border-blue-100 hover:bg-blue-50'
                    }`}
                >
                    <BarChart3 size={18} /> Dashboard
                </button>
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

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date Filter</label>
                                <select
                                    value={dashboardFilters.period}
                                    onChange={(e) => handleDashboardFilterChange('period', e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-w-[150px]"
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {user?.role === 'Super Admin' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                                    <select
                                        value={dashboardFilters.branchId}
                                        onChange={(e) => handleDashboardFilterChange('branchId', e.target.value)}
                                        className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-w-[180px]"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(branch => (
                                            <option key={branch._id} value={branch._id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {dashboardFilters.period === 'custom' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
                                        <input
                                            type="date"
                                            value={dashboardFilters.fromDate}
                                            onChange={(e) => handleDashboardFilterChange('fromDate', e.target.value)}
                                            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                                        <input
                                            type="date"
                                            value={dashboardFilters.toDate}
                                            onChange={(e) => handleDashboardFilterChange('toDate', e.target.value)}
                                            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={resetDashboardFilters}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
                            >
                                <RefreshCw size={15} /> Reset
                            </button>
                            <button
                                onClick={applyDashboardFilters}
                                className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Search size={15} /> Search
                            </button>
                        </div>
                    </div>

                    {dashboardLoading ? (
                        <div className="bg-white rounded-xl border p-10 text-center text-gray-500 font-semibold">
                            <RefreshCw className="animate-spin inline-block mr-2" size={18} /> Loading dashboard...
                        </div>
                    ) : dashboardData ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Inquiries', value: dashboardData.cards.inquiries, icon: <Users size={22} />, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
                                    { label: 'Admissions', value: dashboardData.cards.admissions, icon: <UserPlus size={22} />, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                    { label: 'Registrations', value: dashboardData.cards.registrations, icon: <CheckCircle size={22} />, tone: 'bg-purple-50 text-purple-700 border-purple-100' },
                                    { label: 'Visitors', value: dashboardData.cards.visitors, icon: <CalendarDays size={22} />, tone: 'bg-orange-50 text-orange-700 border-orange-100' },
                                    { label: 'Receipts', value: dashboardData.cards.receipts, icon: <Wallet size={22} />, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
                                    { label: 'Total Collection', value: formatAmount(dashboardData.cards.collection), icon: <Wallet size={22} />, tone: 'bg-green-50 text-green-700 border-green-100' },
                                    { label: 'Admission Fees', value: formatAmount(dashboardData.cards.admissionFees), icon: <Building2 size={22} />, tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                    { label: 'Registration Fees', value: formatAmount(dashboardData.cards.registrationFees), icon: <Building2 size={22} />, tone: 'bg-pink-50 text-pink-700 border-pink-100' }
                                ].map(card => (
                                    <div key={card.label} className={`rounded-xl border p-4 ${card.tone}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide opacity-80">{card.label}</p>
                                                <p className="mt-2 text-2xl font-black">{card.value}</p>
                                            </div>
                                            <div className="rounded-lg bg-white/70 p-2">{card.icon}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">Recent Inquiries</h3>
                                        <span className="text-xs font-bold text-gray-500">Total {dashboardData.cards.inquiries}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-xs text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-left">Name</th>
                                                    <th className="p-3 text-left">Source</th>
                                                    <th className="p-3 text-left">Branch</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {dashboardData.lists.inquiries.length ? dashboardData.lists.inquiries.map(item => (
                                                    <tr key={item._id}>
                                                        <td className="p-3">{formatDate(item.createdAt)}</td>
                                                        <td className="p-3 font-semibold">{item.firstName} {item.lastName}</td>
                                                        <td className="p-3">{item.source || '-'}</td>
                                                        <td className="p-3">{item.branchId?.name || '-'}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="4" className="p-6 text-center text-gray-400">No inquiries found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">Recent Admissions</h3>
                                        <span className="text-xs font-bold text-gray-500">Total {dashboardData.cards.admissions}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-xs text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-left">Student</th>
                                                    <th className="p-3 text-left">Course</th>
                                                    <th className="p-3 text-left">Branch</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {dashboardData.lists.admissions.length ? dashboardData.lists.admissions.map(item => (
                                                    <tr key={item._id}>
                                                        <td className="p-3">{formatDate(item.admissionDate)}</td>
                                                        <td className="p-3 font-semibold">{item.firstName} {item.lastName}</td>
                                                        <td className="p-3">{item.course?.name || '-'}</td>
                                                        <td className="p-3">{item.branchId?.name || '-'}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="4" className="p-6 text-center text-gray-400">No admissions found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">Fee Receipt List</h3>
                                        <span className="text-xs font-bold text-gray-500">{formatAmount(dashboardData.cards.collection)}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-xs text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-left">Receipt</th>
                                                    <th className="p-3 text-left">Student</th>
                                                    <th className="p-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {dashboardData.lists.receipts.length ? dashboardData.lists.receipts.map(item => (
                                                    <tr key={item._id}>
                                                        <td className="p-3">{formatDate(item.date)}</td>
                                                        <td className="p-3 font-mono">{item.receiptNo}</td>
                                                        <td className="p-3 font-semibold">{item.student ? `${item.student.firstName || ''} ${item.student.lastName || ''}` : '-'}</td>
                                                        <td className="p-3 text-right font-bold">{formatAmount(item.amountPaid)}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="4" className="p-6 text-center text-gray-400">No receipts found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">Visitor List</h3>
                                        <span className="text-xs font-bold text-gray-500">Total {dashboardData.cards.visitors}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-xs text-gray-500 uppercase">
                                                <tr>
                                                    <th className="p-3 text-left">Date</th>
                                                    <th className="p-3 text-left">Student</th>
                                                    <th className="p-3 text-left">Contact</th>
                                                    <th className="p-3 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {dashboardData.lists.visitors.length ? dashboardData.lists.visitors.map(item => (
                                                    <tr key={item._id}>
                                                        <td className="p-3">{formatDate(item.visitingDate)}</td>
                                                        <td className="p-3 font-semibold">{item.studentName}</td>
                                                        <td className="p-3">{item.mobileNumber || item.contactParent || '-'}</td>
                                                        <td className="p-3">{item.status || 'Open'}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="4" className="p-6 text-center text-gray-400">No visitors found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl border p-10 text-center text-gray-500">
                            Click Search to load dashboard data.
                        </div>
                    )}
                </div>
            )}

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
                    <div className="bg-gray-50 px-6 py-4 border-b space-y-2">
                        {/* Title Row */}
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-orange-500 shrink-0" />
                            <h3 className="text-lg font-bold text-gray-800">Student Exam Pending List</h3>
                        </div>

                        {/* Description + Filters Row */}
                        <div className="flex flex-wrap items-end gap-3">
                            <p className="text-xs text-gray-500 italic">
                                Students whose course duration is completing within <span className="font-semibold w-[24px] inline-block text-center">{examFilters.minPendingDays}</span> days or has ended.
                            </p>

                            <div className="flex flex-wrap gap-2 items-center flex-shrink-0 md:ml-auto">
                                {/* Branch Filter */}
                                <select
                                    className="border rounded px-3 py-2 text-sm focus:ring-primary outline-none bg-white min-w-[150px]"
                                    value={examFilters.branchId}
                                    onChange={(e) => setExamFilters({ ...examFilters, branchId: e.target.value })}
                                >
                                    <option value="">-- All Branches --</option>
                                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>

                                {/* Course Filter - Only shows courses with pending students */}
                                <select
                                    className="border rounded px-3 py-2 text-sm focus:ring-primary outline-none bg-white min-w-[150px]"
                                    value={examFilters.courseId}
                                    onChange={(e) => setExamFilters({ ...examFilters, courseId: e.target.value })}
                                >
                                    <option value="">-- All Courses --</option>
                                    {examPendingAvailableCourses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>

                                {/* Days Filter */}
                                <select
                                    className="border rounded px-3 py-2 text-sm focus:ring-primary outline-none bg-white min-w-[120px]"
                                    value={examFilters.minPendingDays}
                                    onChange={(e) => setExamFilters({ ...examFilters, minPendingDays: Number(e.target.value) })}
                                >
                                    <option value={10}>10 Days</option>
                                    <option value={15}>15 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={45}>45 Days</option>
                                    <option value={60}>60 Days</option>
                                    <option value={90}>90 Days</option>
                                    <option value={100}>100 Days</option>
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

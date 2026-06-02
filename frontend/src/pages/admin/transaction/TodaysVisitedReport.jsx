import React, { useState, useEffect } from 'react';
import { FileText, Search, Edit, Trash2, ArrowRightCircle, Printer, Eye, GraduationCap, CalendarClock, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import visitorService from '../../../services/visitorService';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import axios from 'axios';
import VisitorViewModal from '../../../components/transaction/VisitorViewModal';
import VisitorFollowUpModal from '../../../components/transaction/VisitorFollowUpModal';
import InquiryForm from '../../../components/transaction/InquiryForm';
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import { useForm } from 'react-hook-form';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import SearchableDropdown from '../../../components/common/SearchableDropdown';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

// --- SUB-COMPONENT: Follow Up Form ---
const FollowUpForm = ({ inquiry, onClose, onSave }) => {
    const navigate = useNavigate();

    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    const [selectedStatus, setSelectedStatus] = useState(inquiry.status || 'Open');

    const { register, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            status: inquiry.status || 'Open',
            newRemarks: '',
            fDate: inquiry.followUpDate ? new Date(inquiry.followUpDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            fTime: inquiry.followUpDate ? new Date(inquiry.followUpDate).toTimeString().slice(0, 5) : getCurrentTime(),
        }
    });

    const statusValue = watch('status');
    useEffect(() => {
        setSelectedStatus(statusValue);
    }, [statusValue]);

    const onSubmit = async (data) => {
        let fDate = null;
        if (data.fDate) {
            const time = data.fTime || '00:00';
            fDate = new Date(`${data.fDate}T${time}`);
        }

        const finalDetails = data.newRemarks ? (inquiry.followUpDetails ? `${inquiry.followUpDetails}\n[${formatDate(fDate)}]: ${data.newRemarks}` : `[${formatDate(fDate)}]: ${data.newRemarks}`) : inquiry.followUpDetails;

        const updateData = {
            status: data.status,
            followUpDetails: finalDetails,
            followUpDate: fDate,
            newRemarks: data.newRemarks,
        };

        await onSave({ id: inquiry._id, data: updateData });

        if (data.status === 'Complete') {
            setTimeout(() => {
                navigate('/master/student/new', {
                    state: { inquiryData: inquiry }
                });
            }, 500);
        } else {
            onClose();
        }
    };

    const { loading } = useSelector((state) => state.transaction || { loading: false });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-800">Follow Up</h3><button onClick={onClose}><X /></button></div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">Inquiry Status</label>
                        <select {...register('status')} className="border p-2 rounded w-full text-sm">
                            <option value="Open">Open</option>
                            <option value="InProgress">InProgress</option>
                            <option value="Recall">Recall</option>
                            <option value="Close">Close</option>
                            <option value="Complete">Complete</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Follow-Up Date</label><input type="date" {...register('fDate')} required className="border p-2 rounded w-full text-sm" /></div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Time (12h)</label>
                            <TimePicker12Hour value={watch('fTime')} onChange={(val) => setValue('fTime', val)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">Previous Remarks</label>
                        <div className="border p-2 rounded w-full text-sm h-24 overflow-y-auto bg-gray-50 text-gray-700 font-mono whitespace-pre-wrap">
                            {inquiry.followUpDetails || 'No previous remarks'}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1 mt-2">New Discussion / Remarks</label>
                        <textarea {...register('newRemarks')} className="border p-2 rounded w-full text-sm" rows="2" placeholder="Enter new remarks..."></textarea>
                    </div>

                    <button disabled={loading} type="submit" className="bg-blue-600 text-white w-full py-2 rounded mt-2 hover:bg-blue-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : 'Update Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const TodaysVisitedReport = () => {
    const navigate = useNavigate();
    const { add, edit, delete: canDelete } = useUserRights('Activity Visitor Report');
    
    const handlePrintList = () => {
        window.print();
    };
    
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const { user } = useSelector((state) => state.auth);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingVisitor, setViewingVisitor] = useState(null);
    const [followUpVisitor, setFollowUpVisitor] = useState(null);
    
    // Inquiry Modals State for Follow-ups
    const [editInquiryData, setEditInquiryData] = useState(null);
    const [viewInquiry, setViewInquiry] = useState(null);
    const [showFollowUpModal, setShowFollowUpModal] = useState(null);
    
    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        studentName: '',
        referenceBy: '',
        limit: 50,
        branchId: '',
        listType: 'all',
        reportType: 'followup' // Default to follow-up as requested
    });

    const [followups, setFollowups] = useState([]);
    const getRecordName = (item) => {
        const record = item?.recordType === 'visitor' ? item.visitorId : item;
        if (!record) return '';
        if (record.studentName) return record.studentName;
        return `${record.firstName || ''} ${record.middleName || ''} ${record.lastName || ''}`.trim().replace(/\s+/g, ' ');
    };
    const getRecordReference = (item) => {
        const record = item?.recordType === 'visitor' ? item.visitorId : item;
        return record?.reference || record?.referenceBy || '';
    };
    const filterOptionRows = filters.reportType === 'visited' ? visitors : followups;
    const activeStudentNames = [...new Set(filterOptionRows.map(getRecordName).filter(Boolean))].sort();
    const activeReferences = [...new Set(filterOptionRows.map(getRecordReference).filter(Boolean))].sort();

    useEffect(() => {
        if (user && user.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user]);

    useEffect(() => {
        fetchVisitors();
    }, [filters.reportType, filters.fromDate, filters.toDate, filters.branchId, filters.listType]);

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    // Fetch data based on report type
    const fetchVisitors = async (overrideFilters = filters) => {
        const activeFilters = overrideFilters;
        setLoading(true);
        try {
            if (activeFilters.reportType === 'visited') {
                const data = await visitorService.getAllVisitors(activeFilters);
                setVisitors(data);
                setFollowups([]);
            } else {
                const listType = activeFilters.listType || 'all';
                const sourceByListType = {
                    online: 'Online',
                    offline: 'Walk-in',
                    dsr: 'DSR'
                };
                const shouldFetchVisitorFollowups = listType === 'all' || listType === 'visitor';
                const shouldFetchInquiryFollowups = listType === 'all' || ['online', 'offline', 'dsr'].includes(listType);
                const inquiryParams = {
                    startDate: activeFilters.fromDate,
                    endDate: activeFilters.toDate,
                    branchId: activeFilters.branchId,
                    studentName: activeFilters.studentName,
                    referenceBy: activeFilters.referenceBy,
                    dateFilterType: 'followUpDate',
                    ...(sourceByListType[listType] ? { source: sourceByListType[listType] } : {})
                };

                const [visitorFollowups, inquiryRes] = await Promise.all([
                    shouldFetchVisitorFollowups ? visitorService.getVisitorFollowUps(activeFilters) : Promise.resolve([]),
                    shouldFetchInquiryFollowups
                        ? axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry`, {
                            params: inquiryParams,
                            withCredentials: true
                        })
                        : Promise.resolve({ data: [] })
                ]);

                const visitorRows = visitorFollowups.map(item => ({
                    ...item,
                    recordType: 'visitor',
                    sortDate: item.scheduledDate
                }));
                const inquiryRows = (Array.isArray(inquiryRes.data) ? inquiryRes.data : [])
                    .filter(item => item.followUpDate)
                    .map(item => ({
                        ...item,
                        recordType: 'inquiry',
                        sortDate: item.followUpDate
                    }));

                setFollowups([...visitorRows, ...inquiryRows].sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate)));
                setVisitors([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        fetchVisitors();
    };

    const handleReset = () => {
        const resetState = {
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            studentName: '',
            referenceBy: '',
            limit: 50,
            branchId: '',
            listType: 'all',
            reportType: 'followup'
        };
        setFilters(resetState);
        setVisitors([]);
        setFollowups([]);
        fetchVisitors(resetState);
        toast.info('Filters reset');
    };

    const handleView = (visitor) => {
        setViewingVisitor(visitor);
        setShowViewModal(true);
    };

    const handleOpenVisitorFollowUp = (visitor) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update visitor follow-ups.");
            return;
        }
        setFollowUpVisitor(visitor);
    };

    const handleTakeAdmission = (visitor) => {
        if (!add) {
            showPermissionDenied("You don't have authority to take admission from visitors.");
            return;
        }
        navigate('/master/student-admission', { state: { visitorData: visitor } });
    };

    const handleEdit = (visitor) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit visitors.");
            return;
        }
        // Navigate to Visitors page with pre-filled data
        navigate('/transaction/visitors', { state: { visitorData: visitor } });
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete visitors.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this visitor?')) {
            try {
                await visitorService.deleteVisitor(id);
                toast.success('Visitor deleted successfully');
                fetchVisitors(); // Refresh the list
            } catch (error) {
                console.error("Error deleting visitor:", error);
                toast.error("Failed to delete visitor");
            }
        }
    };

    const handleSaveVisitorFollowUp = async (id, data) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update visitor follow-ups.");
            return;
        }
        try {
            await visitorService.createVisitorFollowUp(data);
            toast.success("Visitor follow-up saved");
            setFollowUpVisitor(null);
            fetchVisitors();
        } catch (error) {
            console.error("Error saving visitor follow-up:", error);
            toast.error("Failed to save visitor follow-up");
        }
    };

    const handleDeleteVisitorFollowUp = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete visitor follow-ups.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this visitor follow-up?')) {
            try {
                await visitorService.deleteVisitorFollowUp(id);
                toast.success('Visitor follow-up deleted successfully');
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting visitor follow-up:", error);
                toast.error("Failed to delete visitor follow-up");
            }
        }
    };

    const handleDeleteInquiry = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete inquiries.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this inquiry?')) {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, { withCredentials: true });
                toast.success('Inquiry deleted successfully');
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting inquiry:", error);
                toast.error("Failed to delete inquiry");
            }
        }
    };

    const handleSaveInquiry = async ({ id, data }) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit inquiries.");
            return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, data, { withCredentials: true });
            toast.success("Inquiry Updated Successfully");
            setEditInquiryData(null);
            fetchVisitors();
        } catch (error) {
            toast.error("Failed to update inquiry");
        }
    };

    const handleSaveFollowUp = async ({ id, data }) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update inquiry follow-ups.");
            return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, data, { withCredentials: true });
            toast.success("Follow-up Updated");
            setShowFollowUpModal(null);
            fetchVisitors();
        } catch (error) {
            toast.error("Failed to update follow-up");
        }
    };

    return (
        <div className="w-full p-2 animate-fadeIn">
            <style>{`
                .print-only-header {
                    display: none !important;
                }
                @media print {
                    body {
                        visibility: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .printable-table-container,
                    .printable-table-container * {
                        visibility: visible !important;
                    }
                    .printable-table-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    .print-only-header {
                        display: block !important;
                    }
                    /* Hide the Actions column (last th and td) */
                    .printable-table-container th:last-child,
                    .printable-table-container td:last-child {
                        display: none !important;
                    }
                    /* Clean up page breaks */
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
            <div className="bg-white rounded-lg shadow-lg p-2">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Activity Visitor Report</h2>
                            <p className="text-xs text-gray-500">Track visitors and follow-ups for {formatDate(filters.fromDate)}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 items-center w-full md:w-auto">
                        <button 
                            onClick={handlePrintList}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shadow-sm font-bold transition-all transform hover:scale-105"
                        >
                            <Printer size={16} /> Print List
                        </button>
                        <div className="flex bg-gray-100 p-1 rounded-xl flex-grow md:flex-none">
                            <button 
                                onClick={() => setFilters({...filters, reportType: 'followup'})}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'followup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Follow-ups
                            </button>
                            <button 
                                onClick={() => setFilters({...filters, reportType: 'visited'})}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'visited' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Visitors
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                        <Search size={16} /> Search Visitor Activity
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-2 lg:grid-cols-5'} gap-4`}>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                                <input
                                    type="date"
                                    name="fromDate"
                                    value={filters.fromDate}
                                    onChange={handleFilterChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                                <input
                                    type="date"
                                    name="toDate"
                                    value={filters.toDate}
                                    onChange={handleFilterChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            {user?.role === 'Super Admin' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                    <select
                                        name="branchId"
                                        value={filters.branchId}
                                        onChange={handleFilterChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {filters.reportType === 'followup' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Inquiry List</label>
                                    <select
                                        name="listType"
                                        value={filters.listType}
                                        onChange={handleFilterChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="all">All Lists</option>
                                        <option value="visitor">Visitors</option>
                                        <option value="online">Online Inquiry</option>
                                        <option value="offline">Offline Inquiry</option>
                                        <option value="dsr">DSR Inquiry</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <SearchableDropdown
                                    options={activeStudentNames}
                                    value={filters.studentName}
                                    onSelect={(val) => setFilters({ ...filters, studentName: val })}
                                    label="Search Student"
                                    placeholder="Search or type student name/mobile..."
                                    clearLabel="All Students"
                                />
                            </div>
                            <div>
                                <SearchableDropdown
                                    options={activeReferences}
                                    value={filters.referenceBy}
                                    onSelect={(val) => setFilters({ ...filters, referenceBy: val })}
                                    label="Reference By"
                                    placeholder="Search or type Reference..."
                                    clearLabel="All References"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                onClick={handleReset}
                                className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Reset
                            </button>
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <Search size={16} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto printable-table-container">
                    <div className="print-only-header mb-6 text-center">
                        <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">
                            {filters.reportType === 'visited' ? 'Visitor Report' : 'Follow-up Report'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Report Period: {formatDate(filters.fromDate)} to {formatDate(filters.toDate)} | Generated on {new Date().toLocaleDateString('en-GB')} | Total Records: {filters.reportType === 'visited' ? visitors?.length || 0 : followups?.length || 0}
                        </p>
                    </div>
                    <div className="mb-4 flex justify-between items-center print:hidden">
                        <div className="text-sm font-bold text-gray-700">
                            Showing {filters.reportType === 'visited' ? visitors.length : followups.length} {filters.reportType} records
                        </div>
                        <select 
                            name="limit" 
                            value={filters.limit}
                            onChange={(e) => {
                                handleFilterChange(e); 
                                setTimeout(fetchVisitors, 100); 
                            }}
                            className="border rounded-lg p-2 text-xs text-gray-600 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="50">50 Records</option>
                            <option value="100">100 Records</option>
                            <option value="200">200 Records</option>
                        </select>
                    </div>
                    <table className="w-full border-collapse min-w-[1100px]">
                        {filters.reportType === 'visited' ? (
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                                    <th className="p-2 border font-semibold">Visiting Date</th>
                                    {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                    <th className="p-2 border font-semibold">Student Name</th>
                                    <th className="p-2 border font-semibold text-center w-36">Contact</th>
                                    <th className="p-2 border font-semibold">Reference</th>
                                    <th className="p-2 border font-semibold text-center">Status</th>
                                    <th className="p-2 border font-semibold">In Time</th>
                                    <th className="p-2 border font-semibold">Out Time</th>
                                    <th className="p-2 border font-semibold w-36">Remarks/Details</th>
                                    <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
                                </tr>
                            </thead>
                        ) : (
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                                    <th className="p-2 border font-semibold">Visit Date</th>
                                    {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                    <th className="p-2 border font-semibold">Student Name</th>
                                    <th className="p-2 border font-semibold text-center w-36">Contact</th>
                                    <th className="p-2 border font-semibold">Reference</th>
                                    <th className="p-2 border font-semibold text-center">Status</th>
                                    <th className="p-2 border font-bold text-blue-800 text-left uppercase tracking-wider">Followup Date</th>
                                    <th className="p-2 border font-bold text-blue-800 text-left uppercase tracking-wider">Followup Time</th>
                                    <th className="p-2 border font-bold text-blue-800 text-left uppercase tracking-wider">Followup Details</th>
                                    <th className="p-2 border font-bold text-blue-800 text-left uppercase tracking-wider">Followup By</th>
                                    <th className="p-2 border font-bold text-blue-800 text-center uppercase tracking-wider sticky right-0 bg-blue-50/90 print:hidden">Actions</th>
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={filters.reportType === 'visited' ? (user?.role === 'Super Admin' ? 11 : 10) : (user?.role === 'Super Admin' ? 10 : 9)} className="text-center p-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-gray-400 font-medium">Fetching records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filters.reportType === 'visited' ? (
                                visitors.length === 0 ? (
                                    <tr>
                                        <td colSpan={user?.role === 'Super Admin' ? 11 : 10} className="text-center py-8 text-gray-400 italic">
                                            No visitor records found for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    visitors.map((visitor, index) => (
                                        <tr key={visitor._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                            <td className="p-2 border text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-2 border font-semibold text-gray-700">{formatDate(visitor.visitingDate)}</td>
                                            {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                            <td className="p-2 border font-bold text-gray-800">{visitor.studentName}</td>
                                            <td className="p-0 border align-top w-36">
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">G</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {visitor.contactParent || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {visitor.contactHome || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start text-blue-600">
                                                        {visitor.mobileNumber || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 border text-gray-600">{visitor.reference || '-'}</td>
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                    visitor.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    visitor.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    visitor.status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                    visitor.status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {visitor.status || 'Open'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">
                                                    {visitor.inTime || '-'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200">
                                                    {visitor.outTime || '-'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-gray-600 truncate max-w-xs" title={visitor.remarks}>
                                                {visitor.remarks ? (visitor.remarks.length > 14 ? `${visitor.remarks.substring(0, 14)}...` : visitor.remarks) : '-'}
                                            </td>
                                            <td className="p-2 border text-center sticky right-0 bg-white print:hidden">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => handleOpenVisitorFollowUp(visitor)} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100 transition" title="Visitor Follow-up">
                                                        <CalendarClock size={14} />
                                                    </button>
                                                    <button onClick={() => handleTakeAdmission(visitor)} className="bg-green-50 text-green-600 border border-green-200 p-1.5 rounded hover:bg-green-100 transition" title="Take Admission">
                                                        <GraduationCap size={14} />
                                                    </button>
                                                    <button onClick={() => handleView(visitor)} className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-1.5 rounded hover:bg-indigo-100 transition" title="View Details">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition" title="Edit">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                followups.length === 0 ? (
                                    <tr>
                                        <td colSpan={user?.role === 'Super Admin' ? 11 : 10} className="text-center py-8 text-gray-400 italic">
                                            No visitor or inquiry follow-ups scheduled for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    followups.map((hist, index) => {
                                        const isVisitorFollowUp = hist.recordType === 'visitor';
                                        const visitor = isVisitorFollowUp ? (hist.visitorId || {}) : {};
                                        const inquiry = isVisitorFollowUp ? {} : hist;
                                        const personName = isVisitorFollowUp
                                            ? (visitor.studentName || '-')
                                            : `${inquiry.firstName || ''} ${inquiry.lastName || ''}`.trim() || '-';
                                        const originalDate = isVisitorFollowUp ? visitor.visitingDate : inquiry.inquiryDate;
                                        const followUpDate = isVisitorFollowUp ? hist.scheduledDate : inquiry.followUpDate;
                                        const details = isVisitorFollowUp ? hist.remark : inquiry.followUpDetails;
                                        const followUpBy = isVisitorFollowUp ? hist.followUpBy : inquiry.followUpBy;
                                        const status = isVisitorFollowUp ? (hist.status || visitor.status) : inquiry.status;
                                        const branchName = isVisitorFollowUp ? hist.branchId?.name : inquiry.branchId?.name;
                                        const reference = isVisitorFollowUp ? visitor.reference : inquiry.referenceBy;
                                        return (
                                        <tr key={hist._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                            <td className="p-2 border text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-2 border font-semibold text-gray-700">{originalDate ? formatDate(originalDate) : '-'}</td>
                                            {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{branchName || '-'}</td>}
                                            <td className="p-2 border font-bold text-gray-800">{personName}</td>
                                            <td className="p-0 border align-top w-36">
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">G</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {(isVisitorFollowUp ? visitor.contactParent : inquiry.contactParent) || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {(isVisitorFollowUp ? visitor.contactHome : inquiry.contactHome) || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start text-blue-600">
                                                        {(isVisitorFollowUp ? visitor.mobileNumber : inquiry.contactStudent) || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 border text-gray-600">{reference || '-'}</td>
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                    status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                    status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {status || 'Open'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-gray-700">{followUpDate ? formatDate(followUpDate) : '-'}</td>
                                            <td className="p-2 border text-gray-700">
                                                {followUpDate ? new Date(followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-2 border text-gray-600 truncate max-w-xs" title={details}>
                                                {details ? (details.length > 14 ? `${details.substring(0, 14)}...` : details) : '-'}
                                            </td>
                                            <td className="p-2 border text-gray-700">{followUpBy?.name || followUpBy?.username || '-'}</td>
                                            <td className="p-2 border text-center sticky right-0 bg-white print:hidden">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => {
                                                        if (!edit) {
                                                            showPermissionDenied("You don't have authority to update follow-ups.");
                                                            return;
                                                        }
                                                        return isVisitorFollowUp
                                                            ? setFollowUpVisitor({ ...visitor, latestVisitorFollowUp: hist, followUpDetails: hist.remark })
                                                            : setShowFollowUpModal(inquiry);
                                                    }} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100 transition" title="Follow Up">
                                                        <CalendarClock size={14} />
                                                    </button>
                                                    <button onClick={() => isVisitorFollowUp ? handleView(visitor) : setViewInquiry(inquiry)} className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-1.5 rounded hover:bg-indigo-100 transition" title="View Details">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => {
                                                        if (!edit) {
                                                            showPermissionDenied("You don't have authority to edit this record.");
                                                            return;
                                                        }
                                                        return isVisitorFollowUp ? handleEdit(visitor) : setEditInquiryData(inquiry);
                                                    }} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition" title="Edit">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button onClick={() => isVisitorFollowUp ? handleDeleteVisitorFollowUp(hist._id) : handleDeleteInquiry(inquiry._id)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition" title={isVisitorFollowUp ? 'Delete Follow-up' : 'Delete Inquiry'}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Visitor View Modal */}
                {showViewModal && (
                    <VisitorViewModal 
                        visitor={viewingVisitor}
                        onClose={() => {
                            setShowViewModal(false);
                            setViewingVisitor(null);
                        }}
                    />
                )}

                {followUpVisitor && (
                    <VisitorFollowUpModal
                        visitor={followUpVisitor}
                        onClose={() => setFollowUpVisitor(null)}
                        onSave={handleSaveVisitorFollowUp}
                    />
                )}
                
                {/* Inquiry Modals */}
                {viewInquiry && <InquiryViewModal inquiry={viewInquiry} onClose={() => setViewInquiry(null)} />}
                
                {editInquiryData && (
                    <InquiryForm
                        mode="Edit"
                        initialData={editInquiryData}
                        onClose={() => setEditInquiryData(null)}
                        onSave={handleSaveInquiry}
                    />
                )}
                
                {showFollowUpModal && (
                    <FollowUpForm
                        inquiry={showFollowUpModal}
                        onClose={() => setShowFollowUpModal(null)}
                        onSave={handleSaveFollowUp}
                    />
                )}
            </div>
        </div>
    );
};

export default TodaysVisitedReport;

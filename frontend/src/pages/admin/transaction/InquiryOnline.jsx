import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInquiries, updateInquiry, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { getBranches } from '../../../features/master/branchSlice';
import InquiryForm from '../../../components/transaction/InquiryForm';
import StudentSearch from '../../../components/StudentSearch';
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import InquiryImportButton from '../../../components/transaction/InquiryImportButton';
import InquiryPaginationFooter from '../../../components/transaction/InquiryPaginationFooter';
import SmartTable from '../../../components/ui/SmartTable';
import { Search, RefreshCw, CalendarClock, Globe, X, Edit, Trash2, Eye, Calendar, Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import SearchableDropdown from '../../../components/common/SearchableDropdown';

// --- SUB-COMPONENT: Follow Up Form ---
import { formatDate } from '../../../utils/dateUtils';
import Swal from 'sweetalert2';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const getTodayDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

// ... (imports remain)

// --- SUB-COMPONENT: Follow Up Form ---
const FollowUpForm = ({ inquiry, onClose, onSave }) => {
    const navigate = useNavigate();

    // Get current time in HH:MM format for default
    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5); // Returns HH:MM
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

    // Watch status field for conditional rendering
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
            nextVisitingDate: fDate,
            newRemarks: data.newRemarks,
        };

        // Save the inquiry update first
        await onSave({ id: inquiry._id, data: updateData });

        // If status is newly changed to Complete, ask for admission redirect
        if (data.status === 'Complete' && inquiry.status !== 'Complete') {
            Swal.fire({
                title: 'Inquiry Completed!',
                text: "Do you want to go to the Student Admission page now?",
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#aaa',
                confirmButtonText: 'Yes, Admission',
                cancelButtonText: 'No, stay here',
                customClass: {
                    container: 'z-[9999]'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/master/student/new', { state: { inquiryData: inquiry } });
                } else {
                    onClose();
                }
            });
        } else {
            onClose();
        }
    };

    const showNextVisit = selectedStatus !== 'Close' && selectedStatus !== 'Complete';

    const { isLoading } = useSelector((state) => state.transaction);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-800">Online Follow Up</h3><button onClick={onClose}><X /></button></div>
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
                        <div><label className="text-xs font-bold block mb-1">Follow-Up Date (dd-mm-yyyy)</label><input type="date" {...register('fDate')} required className="border p-2 rounded w-full text-sm" /></div>
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

                    <button disabled={isLoading} className="bg-blue-600 text-white w-full py-2 rounded mt-2 hover:bg-blue-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? 'Saving...' : 'Update Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const InquiryOnline = () => {
    const dispatch = useDispatch();
    const { inquiries, inquiryPagination, isSuccess, message } = useSelector((state) => state.transaction);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);
    const { branches } = useSelector((state) => state.branch);
    const { add, edit, delete: canDelete } = useUserRights('Inquiry - Online');
    const getLastFollowUpByName = (inquiry) => {
        const by = inquiry.followUpBy;
        if (by?.name || by?.username) return by.name || by.username;
        const last = inquiry.followUpHistory?.[inquiry.followUpHistory.length - 1];
        const lastBy = last?.followUpBy;
        if (lastBy?.name || lastBy?.username) return lastBy.name || lastBy.username;
        return '-';
    };

    const getLastFollowUpMessage = (inquiry) => {
        const last = inquiry.followUpHistory?.[inquiry.followUpHistory.length - 1];
        return last?.remarks || '-';
    };

    const getLastFollowUpInfo = (inquiry) => {
        const history = inquiry.followUpHistory;
        if (!history || history.length === 0) return '-';
        const last = history[history.length - 1];
        if (!last) return '-';
        const dateStr = last.date
            ? `${formatDate(last.date)} ${new Date(last.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : '';
        const by = last.followUpBy?.name || last.followUpBy?.username || '-';
        if (!dateStr) return by;
        return (
            <div className="text-xs">
                <div className="font-semibold text-gray-800">{dateStr}</div>
                <div className="text-gray-500">by {by}</div>
            </div>
        );
    };

    const getFilledBy = (inquiry) => inquiry.createdBy?.name || inquiry.createdBy?.username || inquiry.followUpBy?.name || inquiry.followUpBy?.username || inquiry.allocatedTo?.name || inquiry.allocatedTo?.username || '-';
    const getHandleBy = (inquiry) => inquiry.allocatedTo?.name || inquiry.allocatedTo?.username || inquiry.referenceBy || 'Direct';
    const getUserId = (value) => value?._id || value || '';
    const isInquiryAssigned = (inquiry) => Boolean(
        inquiry.adminAssignedAt ||
        (getUserId(inquiry.allocatedTo) && getUserId(inquiry.createdBy) && String(getUserId(inquiry.allocatedTo)) !== String(getUserId(inquiry.createdBy)))
    );

    const activeReferences = [...new Set(
        inquiries.map(i => i.referenceBy).filter(Boolean)
    )].sort();

    const [showFollowUpModal, setShowFollowUpModal] = useState(null);
    const [editModalData, setEditModalData] = useState(null);
    const [viewInquiry, setViewInquiry] = useState(null);
    const [pendingModalSave, setPendingModalSave] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedInquiryIds, setSelectedInquiryIds] = useState(new Set());
    const [bulkAssignee, setBulkAssignee] = useState('');
    const [transferMode, setTransferMode] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        startDate: getTodayDate(),
        endDate: getTodayDate(),
        status: '',
        studentName: '',
        referenceBy: '',
        branchId: '',
        employeeId: '',
        dateFilterType: 'inquiryDate',
        source: 'Online', // Locked to Online
        page: 1,
        pageSize: 10
    });

    const handlePrintList = () => {
        window.print();
    };

    const fetchPage = (page) => {
        const nextFilters = { ...filters, page };
        setFilters(nextFilters);
        dispatch(fetchInquiries(nextFilters));
    };

    const fetchStats = async (nextFilters = filters) => {
        if (user?.role !== 'Super Admin') return;
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry/followup-stats`, {
                params: {
                    source: 'Online',
                    startDate: nextFilters.startDate,
                    endDate: nextFilters.endDate,
                    branchId: nextFilters.branchId,
                    employeeId: nextFilters.employeeId,
                },
                withCredentials: true,
            });
            setStats(data);
        } catch (error) {
            setStats(null);
        }
    };

    useEffect(() => {
        dispatch(fetchInquiries(filters));
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchCourses()); // Required for InquiryForm dropdowns
        dispatch(fetchEmployees());
        if (user?.role === 'Super Admin') {
            dispatch(getBranches());
            fetchStats(filters);
        }
    }, [dispatch, user?.role, filters.employeeId, filters.startDate, filters.endDate, filters.branchId]);
    useEffect(() => {
        if (isSuccess && message && pendingModalSave) {
            toast.success(message); // "Inquiry Updated" or "Follow-up Updated"
            dispatch(resetTransaction());
            setShowFollowUpModal(null);
            setEditModalData(null);
            setPendingModalSave(false);
            dispatch(fetchInquiries(filters));
        }
    }, [isSuccess, message, dispatch, pendingModalSave, filters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value, page: 1 });
        setSelectedInquiryIds(new Set());
        if (e.target.name === 'employeeId' && !e.target.value) setTransferMode(false);
    };

    const handleResetFilters = () => {
        const today = getTodayDate();
        const resetState = {
            startDate: today, endDate: today, status: '', studentName: '', referenceBy: '',
            branchId: '', employeeId: '', dateFilterType: 'inquiryDate', source: 'Online', page: 1, pageSize: 10
        };
        setFilters(resetState);
        dispatch(fetchInquiries(resetState));
        fetchStats(resetState);
        setSelectedInquiryIds(new Set());
        setTransferMode(false);
    };

    const canSelectInquiry = (inquiry) => transferMode
        ? Boolean(filters.employeeId && isInquiryAssigned(inquiry))
        : !isInquiryAssigned(inquiry);

    const toggleInquirySelection = (id) => {
        const inquiry = (inquiries || []).find((item) => item._id === id);
        if (!inquiry || !canSelectInquiry(inquiry)) return;
        setSelectedInquiryIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllInquiries = () => {
        // Only select items that are visible on the current page (respecting pageSize)
        const visibleInquiries = (inquiries || []).slice(0, filters.pageSize);
        const ids = visibleInquiries.filter(canSelectInquiry).map((item) => item._id).filter(Boolean);
        
        setSelectedInquiryIds((current) => {
            const isCurrentPageSelected = ids.length > 0 && ids.every((id) => current.has(id));
            const next = new Set(current);
            if (isCurrentPageSelected) {
                // Deselect only current page items, keep others
                ids.forEach((id) => next.delete(id));
            } else {
                // Add current page items to existing selections
                ids.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const handleBulkAssign = async () => {
        if (!bulkAssignee || selectedInquiryIds.size === 0) return;
        try {
            const { data } = await axios.put(
                `${import.meta.env.VITE_API_URL}/transaction/inquiry/assign`,
                {
                    inquiryIds: [...selectedInquiryIds],
                    allocatedTo: bulkAssignee,
                    transfer: transferMode,
                    currentEmployeeId: filters.employeeId,
                },
                { withCredentials: true }
            );
            toast.success(data?.message || `${selectedInquiryIds.size} inquiry assigned successfully`);
            setSelectedInquiryIds(new Set());
            setBulkAssignee('');
            dispatch(fetchInquiries(filters));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Inquiry assignment failed');
        }
    };
    const currentPageIds = (inquiries || []).slice(0, filters.pageSize).filter(canSelectInquiry).map((item) => item._id).filter(Boolean);
    const currentPageSelectedCount = currentPageIds.filter((id) => selectedInquiryIds.has(id)).length;
    const isCurrentPageSelected = currentPageIds.length > 0 && currentPageSelectedCount === currentPageIds.length;

    const handleSaveFollowUp = ({ id, data }) => {
        setPendingModalSave(true);
        dispatch(updateInquiry({ id, data }));
    };

    const handleSaveInquiry = (data) => {
        // Check for FormData/File upload support if InquiryForm uses it now
        if (data instanceof FormData) {
            const id = data.get('_id');
            if (id) {
                setPendingModalSave(true);
                dispatch(updateInquiry({ id, data }));
            }
        } else {
            if (data._id) {
                setPendingModalSave(true);
                dispatch(updateInquiry({ id: data._id, data }));
            }
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this inquiry deletion!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            customClass: {
                container: 'z-[9999]'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(updateInquiry({ id, data: { isDeleted: true } })).then(() => dispatch(fetchInquiries(filters)));
            }
        }).catch(err => console.error("Swal Error:", err));
    };

    // --- Table Columns ---
    const columns = [
        { header: 'Sr', render: (_, idx) => idx + 1 },
        ...(user?.role === 'Super Admin' ? [{ header: 'Branch', render: r => r.branchId?.name || '-' }] : []),
        { header: 'Date', render: (row) => formatDate(row.inquiryDate) },
        { header: 'Student Name', render: r => <span className="font-bold text-gray-700">{r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName || ''}</span> },
        { 
            header: 'Contact (H/S/P)', 
            render: r => (
                <div className="text-[10px] space-y-0.5">
                    <div><span className="font-bold text-gray-400">H:</span> {r.contactHome || '-'}</div>
                    <div><span className="font-bold text-gray-400">S:</span> {r.contactStudent || '-'}</div>
                    <div><span className="font-bold text-gray-400">P:</span> {r.contactParent || '-'}</div>
                </div>
            ) 
        },
        { header: 'Status', render: r => <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${r.status === 'Open' ? 'bg-green-100 text-green-700' : r.status === 'Recall' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span> },
        {
            header: 'Next Follow Up', render: r => (
                <div className="text-xs">
                    <div className="font-bold text-blue-600">{r.nextVisitingDate ? formatDate(r.nextVisitingDate) : '-'}</div>
                    <div className="text-gray-500 font-medium">
                        {r.nextVisitingDate && new Date(r.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0530 (India Standard Time)' && new Date(r.nextVisitingDate).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)' ? new Date(r.nextVisitingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                </div>
            )
        },
        {
            header: 'Action', render: r => (
                <div className="flex gap-2">
                    <button onClick={() => {
                        if (!edit) return showPermissionDenied("You don't have authority to update online inquiries.");
                        setShowFollowUpModal(r);
                    }} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100" title="Follow Up">
                        <CalendarClock size={14} />
                    </button>
                    <button onClick={() => {
                        if (!edit) return showPermissionDenied("You don't have authority to edit online inquiries.");
                        setEditModalData(r);
                    }} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100" title="Edit">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => {
                        if (!canDelete) return showPermissionDenied("You don't have authority to delete online inquiries.");
                        handleDelete(r._id);
                    }} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="container mx-auto p-4 max-w-full animate-fadeIn">
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

            {/* Page Header */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><Globe className="text-blue-600" size={24} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Online Inquiries</h2>
                        <p className="text-xs text-gray-500">Manage inquiries received from Website or Social Media</p>
                    </div>
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ml-2">
                        Total: {inquiryPagination?.count || 0}
                    </span>
                </div>
                <div className="flex gap-2">
                    {stats?.summary && filters.employeeId && (
                        <div className="flex items-center gap-4 mr-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                                <p className="text-sm font-black text-gray-800">{stats.summary.total}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-orange-400 uppercase">Pending</p>
                                <p className="text-sm font-black text-orange-600">{stats.summary.pending}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-green-400 uppercase">Admitted</p>
                                <p className="text-sm font-black text-green-600">{stats.summary.admitted}</p>
                            </div>
                            <div className="text-center px-3">
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Follow-ups Today</p>
                                <p className="text-sm font-black text-blue-600">{stats.summary.followUpsToday || 0}</p>
                            </div>
                        </div>
                    )}
                    <InquiryImportButton
                        source="Online"
                        onImported={() => dispatch(fetchInquiries(filters))}
                        canImport={add}
                        permissionMessage="You don't have authority to add online inquiries."
                    />
                    <button onClick={handlePrintList} className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700 font-bold transition-all transform hover:scale-105">
                        <Printer size={18} /> Print List
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16} /> Search Online Inquiries
                </h2>

                <div className="flex flex-col gap-4">
                    {/* Row 1: Dates & Date Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Inquiry Type</label>
                            <select name="dateFilterType" onChange={handleFilterChange} value={filters.dateFilterType} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="inquiryDate">Inquiry Date</option>
                                <option value="followUpDate">Follow-up Date</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                            <input type="date" name="startDate" onChange={handleFilterChange} value={filters.startDate} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                            <input type="date" name="endDate" onChange={handleFilterChange} value={filters.endDate} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* Row 2: Status & Student Search */}
                    <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Status</label>
                            <select name="status" onChange={handleFilterChange} value={filters.status} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">All Status</option>
                                <option value="Open">Open</option>
                                <option value="InProgress">InProgress</option>
                                <option value="Recall">Recall</option>
                                <option value="Close">Close</option>
                                <option value="Complete">Complete</option>
                            </select>
                        </div>
                        <div className="relative z-20">
                            <StudentSearch
                                label="Search Student"
                                mode="inquiry"
                                additionalFilters={{ source: 'Online' }}
                                onSelect={(id, student) => {
                                    if (student) {
                                        setFilters({ ...filters, studentName: student.firstName, page: 1 });
                                    } else {
                                        setFilters({ ...filters, studentName: '', page: 1 });
                                    }
                                }}
                                placeholder="Search by Name for Online Inquiries..."
                                className="w-full text-sm"
                            />
                        </div>
                        {user?.role === 'Super Admin' && (
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                <select name="branchId" onChange={handleFilterChange} value={filters.branchId} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">All Branches</option>
                                    {branches?.map((branch) => (
                                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {user?.role === 'Super Admin' && (
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Employee</label>
                                <select name="employeeId" onChange={handleFilterChange} value={filters.employeeId} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">All Employees</option>
                                    {employees?.map((employee) => (
                                        <option key={employee._id} value={employee._id}>{employee.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <SearchableDropdown
                                options={activeReferences}
                                value={filters.referenceBy}
                                onSelect={(val) => setFilters({ ...filters, referenceBy: val, page: 1 })}
                                label="Reference By"
                                placeholder="Search or type Reference..."
                            />
                        </div>
                    </div>

                    {/* Row 3: Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={handleResetFilters}
                            className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={16} /> Reset
                        </button>
                        <button
                            onClick={() => {
                                const nextFilters = { ...filters, page: 1 };
                                setFilters(nextFilters);
                                setSelectedInquiryIds(new Set());
                                dispatch(fetchInquiries(nextFilters));
                                fetchStats(nextFilters);
                            }}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                        >
                            <Search size={16} /> Search
                        </button>
                    </div>
                </div>
            </div>

            {user?.role === 'Super Admin' && stats && (
                <div className="bg-white border border-gray-200 rounded-lg shadow mb-6 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="border rounded p-3">
                            <div className="text-xs text-gray-500 font-bold uppercase">Range Inquiries</div>
                            <div className="text-2xl font-black text-blue-700">{stats.totalInquiries || 0}</div>
                        </div>
                        <div className="border rounded p-3">
                            <div className="text-xs text-gray-500 font-bold uppercase">Followups Done</div>
                            <div className="text-2xl font-black text-purple-700">{stats.totalFollowUps || 0}</div>
                        </div>
                        <div className="border rounded p-3">
                            <div className="text-xs text-gray-500 font-bold uppercase">Top Followup</div>
                            <div className="text-sm font-bold text-gray-800">{stats.employees?.[0]?.employeeName || '-'}</div>
                            <div className="text-xs text-gray-500">{stats.employees?.[0]?.latestFollowUpAt ? new Date(stats.employees[0].latestFollowUpAt).toLocaleString() : '-'}</div>
                        </div>
                    </div>
                    {stats.employees?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {stats.employees.map((item) => (
                                <span key={item.employeeId || item.employeeName} className="text-xs border rounded-full px-3 py-1 bg-gray-50">
                                    <b>{item.employeeName}</b>: {item.followUpCount} followups
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- TABLE --- */}
            {user?.role === 'Super Admin' && (
                <div className="bg-white border border-gray-200 rounded-lg shadow mb-3 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm font-bold text-gray-700">{currentPageSelectedCount} on this page | {selectedInquiryIds.size} total selected</div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="border rounded px-3 py-2 text-sm min-w-[220px]">
                            <option value="">Select employee</option>
                            {employees?.map((employee) => (
                                <option key={employee._id} value={employee._id}>{employee.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                if (!filters.employeeId) {
                                    toast.error('Please select employee filter before transfer');
                                    return;
                                }
                                setSelectedInquiryIds(new Set());
                                setTransferMode((value) => !value);
                            }}
                            className={`px-4 py-2 rounded text-sm font-bold border ${transferMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300'}`}
                        >
                            {transferMode ? 'Transfer On' : 'Transfer'}
                        </button>
                        <button
                            onClick={handleBulkAssign}
                            disabled={!bulkAssignee || selectedInquiryIds.size === 0 || (transferMode && !filters.employeeId)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {transferMode ? 'Transfer Selected' : 'Assign Selected'}
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-lg shadow overflow-x-auto border printable-table-container">
                <div className="print-only-header mb-6 text-center">
                    <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Online Inquiry List</h1>
                    <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-GB')} | Total Inquiries: {inquiryPagination?.count || 0}</p>
                </div>
                <table className="w-full border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            {user?.role === 'Super Admin' && (
                                <th className="p-2 border font-semibold w-10 text-center">
                                    <input type="checkbox" checked={isCurrentPageSelected} onChange={toggleAllInquiries} />
                                </th>
                            )}
                            <th className="p-2 border font-semibold w-12">Sr. No.</th>
                            <th className="p-2 border font-semibold">Inquiry Date</th>
                            {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                            {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Filled By</th>}
                            {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Handle By</th>}
                            <th className="p-2 border font-semibold">Student Name</th>
                            <th className="p-2 border font-semibold text-center w-36">Contact (H/S/P)</th>
                            <th className="p-2 border font-semibold text-center">Status</th>
                            <th className="p-2 border font-semibold">Followup</th>
                            <th className="p-2 border font-semibold w-36">Followup Details</th>
                            <th className="p-2 border font-semibold">Followup By</th>
                            <th className="p-2 border font-semibold">Last Followup</th>
                            <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries && inquiries.length > 0 ? (inquiries.slice(0, filters.pageSize)).map((inquiry, index) => {
                            const assignedByAdmin = isInquiryAssigned(inquiry);
                            const selectable = canSelectInquiry(inquiry);
                            return (
                            <tr key={inquiry._id} className={`text-xs border-b transition-colors ${assignedByAdmin ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'hover:bg-blue-50 border-gray-100'}`}>
                                {user?.role === 'Super Admin' && (
                                    <td className="p-2 border text-center">
                                        <input type="checkbox" disabled={!selectable} checked={selectedInquiryIds.has(inquiry._id)} onChange={() => toggleInquirySelection(inquiry._id)} />
                                    </td>
                                )}
                                <td className="p-2 border text-center">{((inquiryPagination?.page || 1) - 1) * (inquiryPagination?.pageSize || 10) + index + 1}</td>
                                <td className="p-2 border text-gray-700">{formatDate(inquiry.inquiryDate)}</td>
                                {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{inquiry.branchId?.name || '-'}</td>}
                                {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{getFilledBy(inquiry)}</td>}
                                {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">
                                    <div>{getHandleBy(inquiry)}</div>
                                    {assignedByAdmin && <span className="inline-block mt-1 rounded border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Assigned</span>}
                                </td>}
                                <td className="p-2 border font-bold text-gray-800">{inquiry.firstName} {inquiry.lastName}</td>
                                <td className="p-0 border align-top">
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactHome || '-'}
                                        </div>
                                    </div>
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactStudent || '-'}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">P</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactParent || '-'}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 border text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${inquiry.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                            inquiry.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                        {inquiry.status}
                                    </span>
                                </td>
                                <td className="p-2 border text-gray-700">
                                    {inquiry.followUpDate ? `${formatDate(inquiry.followUpDate)} ${new Date(inquiry.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                                </td>
                                <td className="p-2 border text-gray-600 truncate max-w-xs" title={getLastFollowUpMessage(inquiry)}>{getLastFollowUpMessage(inquiry).length > 30 ? `${getLastFollowUpMessage(inquiry).substring(0, 30)}...` : getLastFollowUpMessage(inquiry)}</td>
                                <td className="p-2 border text-gray-700">{getLastFollowUpByName(inquiry)}</td>
                                <td className="p-2 border text-gray-700">{getLastFollowUpInfo(inquiry)}</td>
                                <td className="p-2 border text-center sticky right-0 bg-white">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => setShowFollowUpModal(inquiry)} className="bg-purple-50 text-purple-600 border border-purple-200 p-1 rounded hover:bg-purple-100 transition" title="Follow Up">
                                            <CalendarClock size={14} />
                                        </button>
                                        <button onClick={() => setViewInquiry(inquiry)} className="bg-teal-50 text-teal-600 border border-teal-200 p-1 rounded hover:bg-teal-100 transition" title="View Print">
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={() => setEditModalData(inquiry)} className="bg-blue-50 text-blue-600 border border-blue-200 p-1 rounded hover:bg-blue-100 transition" title="Edit">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(inquiry._id)} className="bg-red-50 text-red-600 border border-red-200 p-1 rounded hover:bg-red-100 transition" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            );
                        }) : (
                            <tr><td colSpan={user?.role === 'Super Admin' ? 14 : 10} className="text-center py-8 text-gray-400">No inquiries found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <InquiryPaginationFooter
                pagination={inquiryPagination}
                count={inquiries?.length || 0}
                onPageChange={fetchPage}
            />

            {/* Follow Up Modal */}
            {showFollowUpModal && (
                <FollowUpForm
                    inquiry={showFollowUpModal}
                    onClose={() => setShowFollowUpModal(null)}
                    onSave={handleSaveFollowUp}
                />
            )}

            {/* Edit Inquiry Mdoal */}
            {editModalData && (
                <InquiryForm
                    mode="Online"
                    initialData={editModalData}
                    onClose={() => setEditModalData(null)}
                    onSave={handleSaveInquiry}
                />
            )}

            {/* View Modal */}
            {viewInquiry && <InquiryViewModal inquiry={viewInquiry} onClose={() => setViewInquiry(null)} />}
        </div>
    );
};

export default InquiryOnline;

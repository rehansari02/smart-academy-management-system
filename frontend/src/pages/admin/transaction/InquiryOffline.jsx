import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { fetchInquiries, createInquiry, updateInquiry, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchCourses, fetchReferences } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { getBranches } from '../../../features/master/branchSlice';
import SmartTable from '../../../components/ui/SmartTable';
import InquiryForm from '../../../components/transaction/InquiryForm'; // Imported reusable form
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import InquiryImportButton from '../../../components/transaction/InquiryImportButton';
import InquiryPaginationFooter from '../../../components/transaction/InquiryPaginationFooter';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import StudentSearch from '../../../components/StudentSearch';
import SearchableDropdown from '../../../components/common/SearchableDropdown';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import {
    Plus, Search, RefreshCw, X, CalendarClock, User, Edit, Trash2, Eye, Calendar, Printer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDate } from '../../../utils/dateUtils';
import Swal from 'sweetalert2';
import { getEmployeeFilterOptions, getEmployeeNameById, getScopedEmployeeId } from '../../../utils/employeeFilterUtils';

const getTodayDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

// Follow Up Modal (Specific to Action Button)
const FollowUpModal = ({ inquiry, onClose, onSave }) => {
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
        // Construct full Date objects
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
            recordFollowUpActivity: true,
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
                <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-800">Follow Up Update</h3><button onClick={onClose}><X /></button></div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                    {/* Inquiry Status */}
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

const InquiryOffline = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const { inquiries, inquiryPagination, isSuccess, message } = useSelector((state) => state.transaction);
    const { employees } = useSelector((state) => state.employees);
    const { employees: masterEmployees, references } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);
    const { branches } = useSelector((state) => state.branch);
    const { add, edit, delete: canDelete } = useUserRights('Inquiry - Offline');
    const getLastFollowUpByName = (inquiry) => {
        const last = inquiry.followUpHistory?.[inquiry.followUpHistory.length - 1];
        const lastBy = last?.followUpBy;
        if (lastBy?.name || lastBy?.username) return lastBy.name || lastBy.username;
        const by = inquiry.followUpBy;
        if (by?.name || by?.username) return by.name || by.username;
        return '-';
    };

    const getLastFollowUpMessage = (inquiry) => {
        const last = inquiry.followUpHistory?.[inquiry.followUpHistory.length - 1];
        return last?.remarks || last?.remark || inquiry.followUpDetails || '-';
    };

    const getLastFollowUpInfo = (inquiry) => {
        const history = inquiry.followUpHistory;
        if (!history || history.length === 0) return '-';
        const last = history[history.length - 1];
        if (!last) return '-';
        const callingDate = last.callingDate || last.createdAt || inquiry.updatedAt || last.date;
        const dateStr = callingDate
            ? `${formatDate(callingDate)} ${new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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

    // Only show reference names that actually exist in loaded inquiries
    const activeReferences = [...new Set(
        inquiries.map(i => i.referenceBy).filter(Boolean)
    )].sort();

    // Filter defaults to Walk-in for Offline page
    const [filters, setFilters] = useState({ startDate: getTodayDate(), endDate: getTodayDate(), status: '', studentName: '', referenceBy: '', followUpDetails: '', branchId: '', employeeId: '', followUpById: '', source: 'Walk-in', dateFilterType: 'inquiryDate', page: 1, pageSize: 10 });
    const employeeOptions = getEmployeeFilterOptions(employees, user);
    const activeEmployeeId = getScopedEmployeeId(user, filters.employeeId);
    const [modal, setModal] = useState({ type: null, data: null }); // type: 'form', 'followup', 'view'
    const [stats, setStats] = useState(null);
    const [showPendingBreakup, setShowPendingBreakup] = useState(false);
    const [selectedInquiryIds, setSelectedInquiryIds] = useState(new Set());
    const [bulkAssignee, setBulkAssignee] = useState('');
    const [transferMode, setTransferMode] = useState(false);
    const statsHeaderOpen = Number(stats?.openCount ?? stats?.summary?.open ?? 0);
    const statsHeaderCompleted = Number(stats?.summary?.completed || 0);
    const statsHeaderTotal = statsHeaderOpen + statsHeaderCompleted;
    const statsRangeTotal = Number(stats?.rangeTotalInquiries ?? stats?.totalInquiries ?? statsHeaderTotal ?? 0);
    const statsRemainingCount = Number(stats?.openCount ?? stats?.summary?.open ?? 0);

    const handlePrintList = () => {
        window.print();
    };

    const fetchPage = (page) => {
        const nextFilters = { ...filters, page };
        setFilters(nextFilters);
        dispatch(fetchInquiries(nextFilters));
    };

    const fetchStats = async (nextFilters = filters) => {
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry/followup-stats`, {
                params: {
                    source: 'Walk-in',
                    startDate: nextFilters.startDate,
                    endDate: nextFilters.endDate,
                    branchId: nextFilters.branchId,
                    employeeId: nextFilters.employeeId,
                    followUpById: nextFilters.followUpById,
                    dateFilterType: nextFilters.dateFilterType,
                    status: nextFilters.status,
                    studentName: nextFilters.studentName,
                    referenceBy: nextFilters.referenceBy,
                    followUpDetails: nextFilters.followUpDetails,
                },
                withCredentials: true,
            });
            setStats(data);
        } catch (error) {
            setStats(null);
        }
    };

    const handlePrintFollowupsList = () => {
        const rows = stats?.followupDetails || [];
        const employeeName = activeEmployeeId ? getEmployeeNameById(employeeOptions, activeEmployeeId) : 'All Employees';
        const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const printDocument = printFrame.contentWindow?.document;
        if (!printDocument) {
            printFrame.remove();
            toast.error('Unable to open print dialog');
            return;
        }

        printDocument.write(`
            <html>
            <head>
                <title>Followups List - ${escapeHtml(employeeName)}</title>
                <style>
                    @page { size: A4 landscape; margin: 8mm; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { font-family: Arial, sans-serif; padding: 0; color: #111827; }
                    h1 { font-size: 18px; margin: 0 0 4px; color: #1d4ed8; }
                    p { margin: 2px 0; font-size: 11px; color: #4b5563; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9px; table-layout: fixed; }
                    th { background: #2563eb !important; color: #ffffff !important; padding: 5px 4px; text-align: left; white-space: nowrap; }
                    td { border: 1px solid #e5e7eb; padding: 4px; vertical-align: top; overflow-wrap: anywhere; word-break: normal; }
                    th:nth-child(1), td:nth-child(1) { width: 4%; text-align: center; }
                    th:nth-child(2), td:nth-child(2) { width: 8%; }
                    th:nth-child(3), td:nth-child(3) { width: 9%; }
                    th:nth-child(4), td:nth-child(4) { width: 9%; }
                    th:nth-child(5), td:nth-child(5) { width: 9%; }
                    th:nth-child(6), td:nth-child(6) { width: 13%; }
                    th:nth-child(7), td:nth-child(7) { width: 10%; }
                    th:nth-child(8), td:nth-child(8) { width: 6%; }
                    th:nth-child(9), td:nth-child(9) { width: 9%; }
                    th:nth-child(10), td:nth-child(10) { width: 11%; }
                    th:nth-child(11), td:nth-child(11) { width: 7%; }
                    th:nth-child(12), td:nth-child(12) { width: 9%; }
                    tr:nth-child(even) { background: #f9fafb; }
                </style>
            </head>
            <body>
                <h1>Offline Followups List</h1>
                <p>Employee: ${escapeHtml(employeeName)}</p>
                <p>Date Range: ${escapeHtml(formatDate(filters.startDate))} to ${escapeHtml(formatDate(filters.endDate))}</p>
                <p>Total Followups: ${rows.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Inquiry Date</th>
                            <th>Branch</th>
                            <th>Filled By</th>
                            <th>Reference By</th>
                            <th>Student Name</th>
                            <th>Contact (H/S/P)</th>
                            <th>Status</th>
                            <th>Followup</th>
                            <th>Followup Details</th>
                            <th>Followup By</th>
                            <th>Calling Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${escapeHtml(item.inquiryDate ? formatDate(item.inquiryDate) : '-')}</td>
                                <td>${escapeHtml(item.branchName || '-')}</td>
                                <td>${escapeHtml(item.filledBy || '-')}</td>
                                <td>${escapeHtml(item.referenceBy || '-')}</td>
                                <td>${escapeHtml(item.studentName || '-')}</td>
                                <td>
                                    H: ${escapeHtml(item.contactHome || '-')}<br>
                                    S: ${escapeHtml(item.contactStudent || '-')}<br>
                                    P: ${escapeHtml(item.contactParent || '-')}
                                </td>
                                <td>${escapeHtml(item.status || '-')}</td>
                                <td>${escapeHtml(item.followUpDate ? `${formatDate(item.followUpDate)} ${new Date(item.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-')}</td>
                                <td>${escapeHtml(item.followUpDetails || '-')}</td>
                                <td>${escapeHtml(item.followUpBy || '-')}</td>
                                <td>${escapeHtml(item.callingDate ? `${formatDate(item.callingDate)} ${new Date(item.callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-')}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="12" style="text-align:center;padding:20px;color:#6b7280;">No followups found in this date range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printDocument.close();
        setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            setTimeout(() => printFrame.remove(), 1000);
        }, 250);
    };

    useEffect(() => { 
        dispatch(fetchInquiries(filters)); 
        dispatch(fetchCourses()); 
        dispatch(fetchEmployees()); 
        dispatch(fetchReferences()); 
        if (user?.role === 'Super Admin') { 
            dispatch(getBranches()); 
        } 
        fetchStats(filters);
    }, [dispatch, user?.role, filters.employeeId, filters.startDate, filters.endDate, filters.branchId]);

    // Check for conversion data from Visitors page
    useEffect(() => {
        if (location.state?.visitorData) {
            setModal({ type: 'form', data: { ...location.state.visitorData, isConversion: true } });
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (isSuccess && message) {
            toast.success(message);
            dispatch(resetTransaction());
            setModal({ type: null });
            dispatch(fetchInquiries(filters));
        }
    }, [isSuccess, message, dispatch, filters]);

    const handleSave = (data) => {
        // Data is now FormData if coming from InquiryForm, or object from FollowUpModal
        // If FormData, we pass it directly. Backend handles multipart.
        if (data instanceof FormData) {
            // Check for ID in FormData to decide create or update
            const id = data.get('_id');
            if (id) dispatch(updateInquiry({ id, data }));
            else dispatch(createInquiry(data));
        } else {
            // Normal JSON update (FollowUpModal)
            if (data._id) dispatch(updateInquiry({ id: data._id, data })); // Wrong structure in handleSave? 
            // Wait, FollowUpModal passes {id, data} wrapper to onSave, InquiryForm passes Payload or FormData.
            // Let's normalize inside the components or here.
            // InquiryForm calls onSave(formData). FollowUp call logic is below.
        }
    };

    // Wrapper for InquiryForm save
    const handleFormSave = (payload) => {
        if (payload instanceof FormData) {
            const id = payload.get('_id');
            if (id && id !== 'undefined') dispatch(updateInquiry({ id, data: payload }));
            else dispatch(createInquiry(payload));
        } else {
            // Fallback/Legacy
            if (payload._id) dispatch(updateInquiry({ id: payload._id, data: payload }));
            else dispatch(createInquiry(payload));
        }
    };


    const handleDelete = (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete offline inquiries.");
            return;
        }
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
    const canSelectInquiry = (inquiry) => transferMode
        ? Boolean(filters.employeeId && isInquiryAssigned(inquiry))
        : !isInquiryAssigned(inquiry);
    const currentPageIds = (inquiries || []).filter(canSelectInquiry).map((item) => item._id).filter(Boolean);
    const currentPageSelectedCount = currentPageIds.filter((id) => selectedInquiryIds.has(id)).length;
    const isCurrentPageSelected = currentPageIds.length > 0 && currentPageSelectedCount === currentPageIds.length;

    const columns = [
        { header: 'Sr', render: (_, i) => i + 1 },
        ...(user?.role === 'Super Admin' ? [{ header: 'Branch', render: r => r.branchId?.name || '-' }] : []),
        { header: 'Date', render: r => formatDate(r.inquiryDate) },
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
                    <div className="font-bold text-blue-600">{(r.nextVisitingDate || r.followUpDate) ? formatDate(r.nextVisitingDate || r.followUpDate) : '-'}</div>
                    <div className="text-gray-500 font-medium">
                        {(r.nextVisitingDate || r.followUpDate) && new Date(r.nextVisitingDate || r.followUpDate).toTimeString() !== '00:00:00 GMT+0530 (India Standard Time)' && new Date(r.nextVisitingDate || r.followUpDate).toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)' ? new Date(r.nextVisitingDate || r.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                </div>
            )
        },
        {
            header: 'Action', render: r => (
                <div className="flex gap-2">
                    <button onClick={() => {
                        if (!edit) {
                            showPermissionDenied("You don't have authority to update offline inquiries.");
                            return;
                        }
                        setModal({ type: 'followup', data: r });
                    }} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100" title="Follow Up">
                        <CalendarClock size={14} />
                    </button>
                    <button onClick={() => {
                        if (!edit) {
                            showPermissionDenied("You don't have authority to edit offline inquiries.");
                            return;
                        }
                        setModal({ type: 'form', data: r });
                    }} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100" title="Edit">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(r._id)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100" title="Delete">
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
            <div className="flex justify-between mb-4 items-center">
                <div className="flex items-center gap-3">
                    <User className="text-blue-600" size={24} />
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Offline Inquiries</h2>
                        <p className="text-xs text-gray-500">Walk-in inquiry management</p>
                    </div>
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ml-2">
                        Total: {inquiryPagination?.count || 0}
                    </span>
                </div>
                <div className="flex gap-2">
                    {stats?.summary && activeEmployeeId && (
                        <div className="flex items-center gap-4 mr-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                                <p className="text-sm font-black text-gray-800">{statsHeaderTotal}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-orange-400 uppercase">Open</p>
                                <p className="text-sm font-black text-orange-600">{statsHeaderOpen}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-100">
                                <p className="text-[10px] font-bold text-green-400 uppercase">Completed</p>
                                <p className="text-sm font-black text-green-600">{statsHeaderCompleted}</p>
                            </div>
                            <div className="text-center px-3">
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Follow-ups Today</p>
                                <p className="text-sm font-black text-blue-600">{stats.totalFollowUps || stats.summary.followUpsToday || 0}</p>
                            </div>
                        </div>
                    )}
                    <InquiryImportButton
                        source="Walk-in"
                        onImported={() => dispatch(fetchInquiries(filters))}
                        canImport={add}
                        permissionMessage="You don't have authority to add offline inquiries."
                    />
                    <button onClick={handlePrintList} className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700 font-bold transition-all transform hover:scale-105">
                        <Printer size={18} /> Print List
                    </button>
                    <button onClick={() => {
                        if (!add) {
                            showPermissionDenied("You don't have authority to add offline inquiries.");
                            return;
                        }
                        setModal({ type: 'form' });
                    }} className="bg-blue-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-blue-700 font-bold transition-all transform hover:scale-105">
                        <Plus size={18} /> Add Offline Inquiry
                    </button>
                </div>
            </div>

            {showPendingBreakup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div>
                                <h3 className="font-bold text-gray-800">Pending Inquiry Dates</h3>
                                <p className="text-xs text-gray-500">Total pending: {stats?.pendingFromBefore || 0}</p>
                            </div>
                            <button onClick={() => setShowPendingBreakup(false)} className="p-1 rounded hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[65vh]">
                            {stats?.pendingByDate?.length ? (
                                <table className="w-full text-sm border">
                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-2 border text-left">Inquiry Date</th>
                                            <th className="p-2 border text-right">Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.pendingByDate.map((item) => (
                                            <tr key={item.date} className="hover:bg-blue-50">
                                                <td className="p-2 border font-medium">{formatDate(item.date)}</td>
                                                <td className="p-2 border text-right font-bold text-orange-600">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center text-gray-400 py-8">No previous pending inquiries.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {stats && (
                <div className="bg-white border border-gray-200 rounded-lg shadow mb-6 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="border rounded p-3">
                            <div className="text-xs text-gray-500 font-bold uppercase">Range Inquiries</div>
                            <div className="text-2xl font-black text-blue-700">
                                {statsRemainingCount}<span className="text-lg font-bold text-gray-400">/{statsRangeTotal}</span>
                            </div>
                            {stats.pendingFromBefore > 0 && (
                                <div className="mt-1 text-[10px]">
                                    <span className="text-orange-500 font-bold">Prev Pending: {stats.pendingFromBefore}</span>
                                    <span className="text-gray-400 mx-1">|</span>
                                    <span className="text-green-600">New: {statsRangeTotal}</span>
                                </div>
                            )}
                            {activeEmployeeId && (
                                <button
                                    type="button"
                                    onClick={() => setShowPendingBreakup(true)}
                                    className="mt-2 rounded bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-200"
                                >
                                    View Pending
                                </button>
                            )}
                        </div>
                        <div className="border rounded p-3">
                            <div className="text-xs text-gray-500 font-bold uppercase">Followups Done</div>
                            <div className="text-2xl font-black text-purple-700">{stats.totalFollowUps || 0}</div>
                            <div className="mt-1 text-[10px] text-gray-400">
                                {statsRemainingCount} remaining
                            </div>
                            <button
                                type="button"
                                onClick={handlePrintFollowupsList}
                                className="mt-2 inline-flex items-center gap-1 rounded bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200"
                            >
                                <Printer size={12} /> Print Followups List
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Filter Section --- */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16} /> Search Offline Inquiries
                </h2>

                <div className="flex flex-col gap-4">
                    {/* Row 1: Dates & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Date Type</label>
                            <select value={filters.dateFilterType} onChange={e => setFilters({ ...filters, dateFilterType: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="inquiryDate">Inquiry Date</option>
                                <option value="followUpDate">Follow-up Date</option>
                                <option value="callingDate">Calling Date</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Status</label>
                            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">All Status</option>
                                <option value="Open">Open</option>
                                <option value="InProgress">InProgress</option>
                                <option value="Recall">Recall</option>
                                <option value="Close">Close</option>
                                <option value="Complete">Complete</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Student Search & Branch (if Super Admin) */}
                    <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
                        <div className="relative z-20">
                            <StudentSearch
                                label="Search Student / Contact (H/S/P)"
                                mode="inquiry"
                                selectedValue={filters.studentName}
                                additionalFilters={{ source: 'Walk-in', skipDefaultDate: 'true', includeClosed: 'true' }}
                                onQueryChange={(query) => setFilters({ ...filters, studentName: query, page: 1 })}
                                onSelect={(id, student) => {
                                    if (student) {
                                        const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
                                        setFilters({ ...filters, studentName: fullName, page: 1 });
                                    } else {
                                        setFilters({ ...filters, studentName: '', page: 1 });
                                    }
                                }}
                                placeholder="Search name or H/S/P mobile..."
                                className="w-full text-sm"
                            />
                        </div>
                        <div>
                            <SearchableDropdown 
                                options={activeReferences}
                                value={filters.referenceBy}
                                onSelect={(val) => setFilters({ ...filters, referenceBy: val, page: 1 })}
                                label="Reference By"
                                placeholder="Search Reference..."
                            />
                        </div>
                        {user?.role === 'Super Admin' && (
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                <select value={filters.branchId} onChange={e => setFilters({ ...filters, branchId: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
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
                                <select value={filters.employeeId} onChange={e => {
                                    setFilters({ ...filters, employeeId: e.target.value, page: 1 });
                                    setSelectedInquiryIds(new Set());
                                    if (!e.target.value) setTransferMode(false);
                                }} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">All Employees</option>
                                    {employeeOptions?.map((employee) => (
                                        <option key={employee._id} value={employee._id}>{employee.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Followup By</label>
                            <select value={filters.followUpById} onChange={e => setFilters({ ...filters, followUpById: e.target.value, page: 1 })} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">All Followup By</option>
                                {employeeOptions?.map((employee) => (
                                    <option key={employee._id} value={employee._id}>{employee.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">Followup Details</label>
                            <input
                                type="text"
                                value={filters.followUpDetails}
                                onChange={e => setFilters({ ...filters, followUpDetails: e.target.value, page: 1 })}
                                placeholder="Search remarks..."
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Row 3: Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => {
                                const today = getTodayDate();
                                const resetState = { startDate: today, endDate: today, status: '', studentName: '', referenceBy: '', followUpDetails: '', branchId: '', employeeId: '', followUpById: '', source: 'Walk-in', dateFilterType: 'inquiryDate', page: 1, pageSize: 10 };
                                setFilters(resetState);
                                setSelectedInquiryIds(new Set());
                                setTransferMode(false);
                                dispatch(fetchInquiries(resetState));
                                fetchStats(resetState);
                            }}
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
                    <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Offline Inquiry List</h1>
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
                            {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Reference By</th>}
                            <th className="p-2 border font-semibold">Student Name</th>
                            <th className="p-2 border font-semibold text-center w-36">Contact (H/S/P)</th>
                            <th className="p-2 border font-semibold text-center">Status</th>
                            <th className="p-2 border font-semibold">Followup</th>
                            <th className="p-2 border font-semibold w-36">Followup Details</th>
                            <th className="p-2 border font-semibold">Followup By</th>
                            <th className="p-2 border font-semibold">Calling Date</th>
                            <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32 print:hidden">Actions</th>
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
                                <td className="p-2 border font-bold text-gray-800">{[inquiry.firstName, inquiry.middleName, inquiry.lastName].filter(Boolean).join(' ')}</td>
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
                                <td className="p-2 border text-center sticky right-0 bg-white print:hidden">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => setModal({ type: 'followup', data: inquiry })} className="bg-purple-50 text-purple-600 border border-purple-200 p-1 rounded hover:bg-purple-100 transition" title="Follow Up">
                                            <CalendarClock size={14} />
                                        </button>
                                        <button onClick={() => setModal({ type: 'view', data: inquiry })} className="bg-teal-50 text-teal-600 border border-teal-200 p-1 rounded hover:bg-teal-100 transition" title="View Print">
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={() => setModal({ type: 'form', data: inquiry })} className="bg-blue-50 text-blue-600 border border-blue-200 p-1 rounded hover:bg-blue-100 transition" title="Edit">
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
                            <tr><td colSpan={user?.role === 'Super Admin' ? 14 : 10} className="text-center py-8 text-gray-400">No inquiries found</td></tr>)}
                    </tbody>
                </table>
            </div>

            <InquiryPaginationFooter
                pagination={inquiryPagination}
                count={inquiries?.length || 0}
                onPageChange={fetchPage}
            />

            {/* Reusable Form Modal */}
            {modal.type === 'form' && (
                <InquiryForm
                    mode="Offline"
                    initialData={modal.data}
                    onClose={() => setModal({ type: null })}
                    onSave={handleFormSave}
                />
            )}

            {/* Follow Up Modal */}
            {modal.type === 'followup' && <FollowUpModal inquiry={modal.data} onClose={() => setModal({ type: null })} onSave={({ id, data }) => dispatch(updateInquiry({ id, data }))} />}

            {/* View Modal */}
            {modal.type === 'view' && <InquiryViewModal inquiry={modal.data} onClose={() => setModal({ type: null })} />}
        </div>
    );
};

export default InquiryOffline;

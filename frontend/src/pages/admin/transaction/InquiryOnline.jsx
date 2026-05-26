import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInquiries, updateInquiry, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { getBranches } from '../../../features/master/branchSlice';
import InquiryForm from '../../../components/transaction/InquiryForm';
import StudentSearch from '../../../components/StudentSearch';
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import SmartTable from '../../../components/ui/SmartTable';
import { Search, RefreshCw, CalendarClock, Globe, X, Edit, Trash2, Eye, Calendar, Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import SearchableDropdown from '../../../components/common/SearchableDropdown';

// --- SUB-COMPONENT: Follow Up Form ---
import { formatDate } from '../../../utils/dateUtils';
import Swal from 'sweetalert2';

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

        // If status is Complete, navigate to Student Admission with inquiry data
        if (data.status === 'Complete') {
            setTimeout(() => {
                navigate('/master/student/new', {
                    state: {
                        inquiryData: inquiry
                    }
                });
            }, 500); // Small delay to ensure the save completes
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
    const { inquiries, isSuccess, message } = useSelector((state) => state.transaction);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);
    const { branches } = useSelector((state) => state.branch);

    const activeReferences = [...new Set(
        inquiries.map(i => i.referenceBy).filter(Boolean)
    )].sort();

    const [showFollowUpModal, setShowFollowUpModal] = useState(null);
    const [editModalData, setEditModalData] = useState(null);
    const [viewInquiry, setViewInquiry] = useState(null);
    const [pendingModalSave, setPendingModalSave] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        status: '',
        studentName: '',
        referenceBy: '',
        branchId: '',
        dateFilterType: 'followUpDate',
        source: 'Online' // Locked to Online
    });

    const handlePrintList = () => {
        window.print();
    };

    useEffect(() => {
        dispatch(fetchInquiries(filters));
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchCourses()); // Required for InquiryForm dropdowns
        dispatch(fetchEmployees());
        if (user?.role === 'Super Admin') dispatch(getBranches());
    }, [dispatch]);
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
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleResetFilters = () => {
        const resetState = {
            startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], status: '', studentName: '', referenceBy: '',
            branchId: '', dateFilterType: 'followUpDate', source: 'Online'
        };
        setFilters(resetState);
        dispatch(fetchInquiries(resetState));
    };

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
            header: 'Contact', 
            render: r => (
                <div className="text-[10px] space-y-0.5">
                    <div><span className="font-bold text-gray-400">G:</span> {r.contactParent || '-'}</div>
                    <div><span className="font-bold text-gray-400">H:</span> {r.contactHome || '-'}</div>
                    <div><span className="font-bold text-gray-400">S:</span> {r.contactStudent || '-'}</div>
                </div>
            ) 
        },
        { header: 'Gender', accessor: 'gender' },
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
                    <button onClick={() => setShowFollowUpModal(r)} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100" title="Follow Up">
                        <CalendarClock size={14} />
                    </button>
                    <button onClick={() => setEditModalData(r)} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100" title="Edit">
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

            {/* Page Header */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><Globe className="text-blue-600" size={24} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Online Inquiries</h2>
                        <p className="text-xs text-gray-500">Manage inquiries received from Website or Social Media</p>
                    </div>
                </div>
                <button onClick={handlePrintList} className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700 font-bold transition-all transform hover:scale-105">
                    <Printer size={18} /> Print List
                </button>
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
                    <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
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
                                        setFilters({ ...filters, studentName: student.firstName });
                                    } else {
                                        setFilters({ ...filters, studentName: '' });
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
                        <div>
                            <SearchableDropdown
                                options={activeReferences}
                                value={filters.referenceBy}
                                onSelect={(val) => setFilters({ ...filters, referenceBy: val })}
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
                            onClick={() => dispatch(fetchInquiries(filters))}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                        >
                            <Search size={16} /> Search
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TABLE --- */}
            <div className="bg-white rounded-lg shadow overflow-x-auto border printable-table-container">
                <div className="print-only-header mb-6 text-center">
                    <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Online Inquiry List</h1>
                    <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-GB')} | Total Inquiries: {inquiries?.length || 0}</p>
                </div>
                <table className="w-full border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-2 border font-semibold w-12">Sr. No.</th>
                            <th className="p-2 border font-semibold">Inquiry Date</th>
                            {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                            <th className="p-2 border font-semibold">Student Name</th>
                            <th className="p-2 border font-semibold text-center w-36">Contact</th>
                            <th className="p-2 border font-semibold">Gender</th>
                            <th className="p-2 border font-semibold text-center">Status</th>
                            <th className="p-2 border font-semibold">Followup Date</th>
                            <th className="p-2 border font-semibold">Followup Time</th>
                            <th className="p-2 border font-semibold w-36">Followup Details</th>
                            <th className="p-2 border font-semibold">Followup By</th>
                            <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries && inquiries.length > 0 ? inquiries.map((inquiry, index) => (
                            <tr key={inquiry._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                <td className="p-2 border text-center">{index + 1}</td>
                                <td className="p-2 border text-gray-700">{formatDate(inquiry.inquiryDate)}</td>
                                {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{inquiry.branchId?.name || '-'}</td>}
                                <td className="p-2 border font-bold text-gray-800">{inquiry.firstName} {inquiry.lastName}</td>
                                <td className="p-0 border align-top">
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">G</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactParent || '-'}
                                        </div>
                                    </div>
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactHome || '-'}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                            {inquiry.contactStudent || '-'}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 border text-gray-600">{inquiry.gender || '-'}</td>
                                <td className="p-2 border text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${inquiry.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                            inquiry.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                        {inquiry.status}
                                    </span>
                                </td>
                                <td className="p-2 border text-gray-700">{inquiry.followUpDate ? formatDate(inquiry.followUpDate) : '-'}</td>
                                <td className="p-2 border text-gray-700">
                                    {inquiry.followUpDate ? new Date(inquiry.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="p-2 border text-gray-600 truncate max-w-xs" title={inquiry.followUpDetails}>{inquiry.followUpDetails ? (inquiry.followUpDetails.length > 14 ? `${inquiry.followUpDetails.substring(0, 14)}...` : inquiry.followUpDetails) : '-'}</td>
                                <td className="p-2 border text-gray-700">{inquiry.followUpBy?.name || inquiry.followUpBy?.username || '-'}</td>
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
                        )) : (
                            <tr><td colSpan={user?.role === 'Super Admin' ? 12 : 11} className="text-center py-8 text-gray-400">No inquiries found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeeReceipts, deleteFeeReceipt } from '../../../features/transaction/transactionSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { Link } from 'react-router-dom';
import { Search, Printer, Edit2, Trash2, RefreshCw, FileText, X, CheckSquare, Square, Save, User, UserCheck } from 'lucide-react';
import moment from 'moment';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';
import EditReceiptModal from '../../../components/transaction/EditReceiptModal';
import { useReactToPrint } from 'react-to-print';
import ReceiptPrintTemplate from '../../../components/ReceiptPrintTemplate';
import StudentSearch from '../../../components/StudentSearch';
// Assuming you might want to reuse the Edit Modal from FeeCollection or create a new one. 
// For now, I will implement the table first. If Edit needs a modal, I might need to copy that logic or refactor it into a shared component.
// Given the user request, I will implement the Edit/Delete actions.

const AllReceipts = () => {
    const dispatch = useDispatch();
    const { receipts, receiptPagination, receiptSummary, isLoading } = useSelector(state => state.transaction);
    const { employees } = useSelector(state => state.employees);
    const { branches } = useSelector(state => state.master);
    const { user } = useSelector(state => state.auth);
    
    // Filters State
    const [filters, setFilters] = useState({
        startDate: moment().format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD'),
        receiptNo: '',
        paymentMode: '',
        studentId: '',
        search: '',
        studentName: '',
        reference: '',
        branchId: user?.role === 'Super Admin' ? '' : (user?.branchId || ''),
        page: 1,
        limit: 10
    });

    const [printingReceipt, setPrintingReceipt] = useState(null);
    const receiptRef = useRef();

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [receiptToDelete, setReceiptToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const pageTotalAmount = useMemo(() => (receipts || []).reduce((sum, receipt) => sum + Number(receipt?.amountPaid || 0), 0), [receipts]);
    const filteredTotalAmount = Number(receiptSummary?.totalAmount || pageTotalAmount || 0);
    const totalColumns = user && user.role === 'Super Admin' ? 9 : 8;

    const buildReceiptParams = (sourceFilters) => {
        const params = { ...sourceFilters };
        if (params.branchId && typeof params.branchId === 'object') {
            params.branchId = params.branchId._id;
        }

        Object.keys(params).forEach((key) => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
                delete params[key];
            }
        });

        return params;
    };

    useEffect(() => {
        // Initial fetch
        const today = moment().format('YYYY-MM-DD');
        const initialFilters = {
            startDate: today,
            endDate: today,
            branchId: user?.role === 'Super Admin' ? '' : (user?.branchId || ''),
            page: 1,
            limit: 10
        };
        dispatch(fetchFeeReceipts(buildReceiptParams(initialFilters)));
        dispatch(fetchEmployees({ pageSize: 1000 }));
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
    }, [dispatch, user]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handleStudentSelect = (id, student) => {
        setFilters(prev => ({ 
            ...prev, 
            studentId: id || '', 
            studentName: student ? `${student.firstName} ${student.lastName}` : '',
            page: 1
        }));
    };

    const applyFilters = (override = {}) => {
        const safeOverride = override && !override.nativeEvent ? override : {};
        const nextFilters = { ...filters, ...safeOverride };
        setFilters(nextFilters);
        dispatch(fetchFeeReceipts(buildReceiptParams(nextFilters)));
    };

    const handleSearch = () => {
        applyFilters({ page: 1 });
    };

    const resetFilters = () => {
        const today = moment().format('YYYY-MM-DD');
        const resetObj = {
            startDate: today,
            endDate: today,
            receiptNo: '',
            paymentMode: '',
            studentId: '',
            search: '',
            studentName: '',
            reference: '',
            branchId: user?.role === 'Super Admin' ? '' : (user?.branchId || ''),
            page: 1,
            limit: 10
        };
        setFilters(resetObj);
        dispatch(fetchFeeReceipts(buildReceiptParams(resetObj))); 
    };

    const fetchPage = (page) => {
        applyFilters({ page });
    };

    const handleDelete = (receipt) => {
        setReceiptToDelete(receipt);
    };

    const closeDeleteDialog = () => {
        if (!isDeleting) {
            setReceiptToDelete(null);
        }
    };

    const confirmDelete = async () => {
        if (!receiptToDelete?._id || isDeleting) return;
        setIsDeleting(true);
        try {
            await dispatch(deleteFeeReceipt(receiptToDelete._id)).unwrap();
            setReceiptToDelete(null);
            dispatch(fetchFeeReceipts(buildReceiptParams(filters)));
        } finally {
            setIsDeleting(false);
        }
    };

    // Edit Handlers
    const handleEdit = (receipt) => {
        setEditingReceipt(receipt);
        setShowEditModal(true);
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingReceipt(null);
    };

     // Print Handler
    const handlePrintReceipt = useReactToPrint({
        contentRef: receiptRef,
        onAfterPrint: () => setPrintingReceipt(null)
    });

    const triggerPrintReceipt = (receipt) => {
        setPrintingReceipt(receipt);
        setTimeout(() => {
            const printBtn = document.getElementById('hidden-print-trigger');
            if (printBtn) {
                printBtn.click();
            } else {
                handlePrintReceipt();
            }
        }, 300);
    };

    return (
        <div className="container mx-auto p-4">
             {/* Hidden button to trigger print-to-react properly on mobile */}
             <button id="hidden-print-trigger" onClick={handlePrintReceipt} className="hidden" />
             
             {/* Hidden Print Specific Component - Use off-screen instead of display:none for mobile print support */}
             <div style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: '210mm',
                height: '297mm',
                overflow: 'hidden',
                backgroundColor: 'white',
                zIndex: -1,
                opacity: 0,
                pointerEvents: 'none'
            }}>
                {printingReceipt && (
                    <ReceiptPrintTemplate 
                        ref={receiptRef} 
                        receipt={printingReceipt} 
                    />
                )}
            </div>

            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600"/> All Fees Receipts
                </h1>
                <Link to="/transaction/fees-receipt" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                    Back to Collection
                </Link>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Receipts</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{receiptPagination?.count || 0}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Filtered Total Amount</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">₹ {filteredTotalAmount.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">All pages in selected filter</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Current Page Total</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">₹ {pageTotalAmount.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">{receipts?.length || 0} receipts on this page</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                        {filters.search || filters.receiptNo || filters.studentName || filters.reference || filters.paymentMode || filters.startDate || filters.endDate
                            ? 'Filtered'
                            : 'All records'}
                    </p>
                </div>
            </div>

            {/* --- Filter Section --- */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16}/> Search Receipt
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="text-xs text-gray-500">From Date</label>
                        <input 
                            type="date" 
                            name="startDate" 
                            value={filters.startDate} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">To Date</label>
                        <input 
                            type="date" 
                            name="endDate" 
                            value={filters.endDate} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Search</label>
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full border p-1 rounded text-sm h-8"
                            placeholder="Receipt, student, mobile..."
                        />
                    </div>
                     <div>
                        <label className="text-xs text-gray-500">Receipt No</label>
                        <input 
                            type="text" 
                            name="receiptNo" 
                            value={filters.receiptNo} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm h-8" 
                            placeholder="Receipt No..."
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Payment Mode</label>
                         <select 
                            name="paymentMode" 
                            value={filters.paymentMode} 
                            onChange={handleFilterChange}
                            className="w-full border p-1 rounded text-sm h-8"
                        >
                            <option value="">All Types</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Online/UPI">Online/UPI</option>
                        </select>
                    </div>
                    <div>
                        <StudentSearch 
                            label="Student Name"
                            placeholder="Search Student..."
                            onSelect={handleStudentSelect}
                            displayField="name"
                            className="text-sm"
                            additionalFilters={{ branchId: filters.branchId }}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Reference (Staff)</label>
                        <select 
                            name="reference" 
                            value={filters.reference || ''} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm h-8"
                        >
                            <option value="">All Reference</option>
                            <option value="Direct Walk-in">Direct Walk-in</option>
                            {employees && employees.map(emp => (
                                <option key={emp._id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="text-xs text-gray-500">Branch</label>
                            <select 
                                name="branchId" 
                                value={typeof filters.branchId === 'object' ? filters.branchId?._id : filters.branchId} 
                                onChange={handleFilterChange}
                                className="w-full border p-1 rounded text-sm h-8"
                            >
                                <option value="">All Branches</option>
                                {branches && branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-end gap-2 md:col-span-2">
                        <button onClick={resetFilters} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center" title="Reset">
                            <RefreshCw size={18}/>
                        </button>
                        <button onClick={handleSearch} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 w-full flex justify-center">
                            Search
                        </button>
                    </div>
                </div>
            </div>

             {/* --- Table Section --- */}
             <div className="bg-white rounded-lg shadow overflow-x-auto border">
                {isLoading ? (
                    <div className="p-4">
                        <TableSkeleton rows={10} cols={7} />
                    </div>
                ) : (
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                <th className="p-2 border font-semibold w-12 text-center">Sr No</th>
                                <th className="p-2 border font-semibold">Receipt Date</th>
                                <th className="p-2 border font-semibold">Receipt Number</th>
                                <th className="p-2 border font-semibold">Student Name</th>
                                <th className="p-2 border font-semibold">Course Name</th>
                                {user && user.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                <th className="p-2 border font-semibold text-right">Amount (₹)</th>
                                <th className="p-2 border font-semibold text-center">Receipt Type</th>
                                <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-xs">
                             {receipts && receipts.length > 0 ? (
                                receipts.map((receipt, index) => (
                                    <tr key={receipt._id} className="group hover:bg-blue-50 border-b border-gray-100 transition-colors">
                                        <td className="p-2 border text-center">{((receiptPagination?.page || 1) - 1) * (receiptPagination?.pageSize || 10) + index + 1}</td>
                                        <td className="p-2 border whitespace-nowrap">{moment(receipt.date).format('DD/MM/YYYY')}</td>
                                        <td className="p-2 border font-mono text-blue-600">{receipt.receiptNo}</td>
                                        <td className="p-2 border font-medium text-gray-900">
                                            {[receipt.student?.firstName, receipt.student?.middleName, receipt.student?.lastName].filter(Boolean).join(' ')}
                                        </td>
                                        <td className="p-2 border font-medium">
                                            {receipt.course?.name}
                                        </td>
                                        {user && user.role === 'Super Admin' && (
                                            <td className="p-2 border">
                                                {receipt.branch?.name || receipt.student?.branchName || '-'}
                                            </td>
                                        )}
                                        <td className="p-2 border text-right font-medium">
                                            {receipt.amountPaid?.toLocaleString('en-IN')}
                                        </td>
                                         <td className="p-2 border text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                receipt.paymentMode === 'Cash' ? 'bg-green-100 text-green-800 border-green-200' : 
                                                receipt.paymentMode === 'Online/UPI' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                                'bg-orange-100 text-orange-800 border-orange-200'
                                            }`}>
                                                {receipt.paymentMode}
                                            </span>
                                        </td>
                                        <td className="p-2 border text-center sticky right-0 bg-white group-hover:bg-blue-50">
                                            <div className="flex justify-center gap-1">
                                                 <button 
                                                    onClick={() => triggerPrintReceipt(receipt)}
                                                    className="bg-purple-50 text-purple-600 p-1 rounded border border-purple-200 hover:bg-purple-100 transition" 
                                                    title="Print"
                                                >
                                                    <Printer size={14}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(receipt)}
                                                    className="bg-orange-50 text-orange-600 p-1 rounded border border-orange-200 hover:bg-orange-100 transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(receipt)}
                                                    className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition" 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                             ) : (
                                 <tr>
                                     <td colSpan={totalColumns} className="text-center py-8 text-gray-500">No receipts found</td>
                                 </tr>
                             )}
                             {receipts && receipts.length > 0 && (
                                <tr className="bg-gray-100 font-bold text-gray-900">
                                    <td
                                        className="p-2 border text-right uppercase"
                                        colSpan={user && user.role === 'Super Admin' ? 6 : 5}
                                    >
                                        Current Page Total
                                    </td>
                                    <td className="p-2 border text-right">
                                        ₹ {pageTotalAmount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-2 border text-center" colSpan={2}>
                                        {receipts.length} Receipts
                                    </td>
                                </tr>
                             )}
                             {receipts && receipts.length > 0 && (
                                <tr className="bg-emerald-50 font-black text-emerald-900">
                                    <td
                                        className="p-2 border text-right uppercase"
                                        colSpan={user && user.role === 'Super Admin' ? 6 : 5}
                                    >
                                        Filtered Total (All Pages)
                                    </td>
                                    <td className="p-2 border text-right">
                                        ₹ {filteredTotalAmount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-2 border text-center" colSpan={2}>
                                        {receiptSummary?.totalReceipts || receiptPagination?.count || 0} Receipts
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                )}
             </div>

            {receiptPagination && receiptPagination.pages > 1 && (
                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
                    <div className="text-gray-600">
                        Page {receiptPagination.page} of {receiptPagination.pages} | Total {receiptPagination.count} receipts
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchPage((receiptPagination.page || 1) - 1)}
                            disabled={(receiptPagination.page || 1) <= 1}
                            className="px-3 py-1.5 rounded border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchPage((receiptPagination.page || 1) + 1)}
                            disabled={(receiptPagination.page || 1) >= (receiptPagination.pages || 1)}
                            className="px-3 py-1.5 rounded border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {receiptToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Delete Receipt?</h2>
                                <p className="text-xs text-gray-500">This action cannot be undone.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDeleteDialog}
                                disabled={isDeleting}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 px-5 py-4 text-sm">
                            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                                <p className="font-semibold text-red-800">Receipt #{receiptToDelete.receiptNo}</p>
                                <p className="mt-1 text-red-700">
                                    {receiptToDelete.student?.firstName} {receiptToDelete.student?.lastName}
                                </p>
                                <p className="mt-1 text-red-700">
                                    Rs. {Number(receiptToDelete.amountPaid || 0).toLocaleString('en-IN')} | {moment(receiptToDelete.date).format('DD/MM/YYYY')}
                                </p>
                            </div>
                            <p className="text-gray-600">
                                Are you sure you want to permanently delete this fee receipt?
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                            <button
                                type="button"
                                onClick={closeDeleteDialog}
                                disabled={isDeleting}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isDeleting ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                {isDeleting ? 'Deleting...' : 'Delete Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === EDIT MODAL === */}
            <EditReceiptModal 
                isOpen={showEditModal}
                onClose={handleCancelEdit}
                receipt={editingReceipt}
                onUpdateSuccess={() => dispatch(fetchFeeReceipts(filters))}
            />
        </div>
    );
};

export default AllReceipts;

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeeReceipts, deleteFeeReceipt, updateFeeReceipt } from '../../../features/transaction/transactionSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Printer, Edit2, Trash2, RefreshCw, FileText, X, CheckSquare, Square, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';
import EditReceiptModal from '../../../components/transaction/EditReceiptModal';
import { useReactToPrint } from 'react-to-print';
import ReceiptPrintTemplate from '../../../components/ReceiptPrintTemplate';
// Assuming you might want to reuse the Edit Modal from FeeCollection or create a new one. 
// For now, I will implement the table first. If Edit needs a modal, I might need to copy that logic or refactor it into a shared component.
// Given the user request, I will implement the Edit/Delete actions.

const AllReceipts = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { receipts, isLoading, isSuccess, message } = useSelector(state => state.transaction);
    const { user } = useSelector(state => state.auth);
    
    // Filters State
    const [filters, setFilters] = useState({
        startDate: '', 
        endDate: new Date().toISOString().split('T')[0],
        receiptNo: '',
        paymentMode: '',
        studentId: '',
        search: '',
        studentName: '',
        reference: ''
    });

    const [printingReceipt, setPrintingReceipt] = useState(null);
    const receiptRef = useRef();

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);

    useEffect(() => {
        // Initial fetch
        dispatch(fetchFeeReceipts(filters));
    }, [dispatch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        dispatch(fetchFeeReceipts(filters));
    };

    const resetFilters = () => {
        setFilters({
            startDate: '',
            endDate: new Date().toISOString().split('T')[0],
            receiptNo: '',
            paymentMode: '',
            studentId: '',
            search: '',
            studentName: '',
            reference: ''
        });
        dispatch(fetchFeeReceipts({})); 
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this receipt?')) {
            dispatch(deleteFeeReceipt(id));
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
            handlePrintReceipt();
        }, 100);
    };

    return (
        <div className="container mx-auto p-4">
             {/* Hidden Print Specific Component */}
             <div style={{ display: 'none' }}>
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
                        <label className="text-xs text-gray-500">Receipt No</label>
                        <input 
                            type="text" 
                            name="receiptNo" 
                            value={filters.receiptNo} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm" 
                            placeholder="Receipt No..."
                        />
                    </div>
                     <div>
                        <label className="text-xs text-gray-500">Payment Mode</label>
                         <select 
                            name="paymentMode" 
                            value={filters.paymentMode} 
                            onChange={handleFilterChange}
                            className="w-full border p-1 rounded text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Online/UPI">Online/UPI</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Student Name</label>
                        <input 
                            type="text" 
                            name="studentName" 
                            value={filters.studentName || ''} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm" 
                            placeholder="Student Name..."
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Reference</label>
                        <input 
                            type="text" 
                            name="reference" 
                            value={filters.reference || ''} 
                            onChange={handleFilterChange} 
                            className="w-full border p-1 rounded text-sm" 
                            placeholder="Reference..."
                        />
                    </div>

                    <div className="flex items-end gap-2 md:col-span-2">
                        <button onClick={resetFilters} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center" title="Reset">
                            <RefreshCw size={18}/>
                        </button>
                        <button onClick={applyFilters} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 w-full flex justify-center">
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
                                receipts.map((receipt) => (
                                    <tr key={receipt._id} className="group hover:bg-blue-50 border-b border-gray-100 transition-colors">
                                        <td className="p-2 border whitespace-nowrap">{moment(receipt.date).format('DD/MM/YYYY')}</td>
                                        <td className="p-2 border font-mono text-blue-600">{receipt.receiptNo}</td>
                                        <td className="p-2 border font-medium text-gray-900">
                                            {receipt.student?.firstName} {receipt.student?.lastName}
                                        </td>
                                        <td className="p-2 border">
                                            {receipt.course?.name} 
                                            {receipt.course?.shortName && <span className="text-gray-500 ml-1">[{receipt.course.shortName}]</span>}
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
                                                    onClick={() => handleDelete(receipt._id)}
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
                                     <td colSpan="7" className="text-center py-8 text-gray-500">No receipts found</td>
                                 </tr>
                             )}
                        </tbody>
                    </table>
                )}
             </div>

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

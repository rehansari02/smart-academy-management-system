import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { collectFees, fetchFeeReceipts, updateFeeReceipt, deleteFeeReceipt, resetTransaction } from '../../../features/transaction/transactionSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RotateCcw, FileText, Printer, Edit2, Eye, Save, DollarSign, Calendar, Receipt } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import StudentSearch from '../../../components/StudentSearch';
import ReceiptPrintTemplate from '../../../components/ReceiptPrintTemplate';
import moment from 'moment';
import EditReceiptModal from '../../../components/transaction/EditReceiptModal';
import { useLocation } from 'react-router-dom';

const FeeCollection = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { receipts, isSuccess, message, isLoading } = useSelector(state => state.transaction);
    const { user } = useSelector((state) => state.auth);
    
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [printingReceipt, setPrintingReceipt] = useState(null);
    
    // Student-related states
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    
    const receiptRef = useRef();

    const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm({
        defaultValues: {
            receiptNo: 'Loading...',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Cash',
            chequeDate: new Date().toISOString().split('T')[0], // Default today for UI
            transactionDate: new Date().toISOString().split('T')[0] // Default today for UI
        }
    });

    // Fetch next receipt number on mount
    useEffect(() => {
        fetchNextReceiptNo();
        
        // Check if we navigated here with a receipt to edit
        if (location.state?.editReceipt) {
            handleEdit(location.state.editReceipt);
            // Clear state so it doesn't reopen on refresh? 
            // Actually, manipulating history state is tricky without a library, but this is fine for now. 
            // We can just rely on the user closing it.
             window.history.replaceState({}, document.title); // Clean up state
        }
    }, [location.state]);

    useEffect(() => {
        if (isSuccess && message) {
            toast.success(message);
            dispatch(resetTransaction());
            
            // Refresh student data if a student is selected
            if (selectedStudent) {
                fetchStudentPaymentData(selectedStudent._id);
            } else {
                // If no student selected (after creating new receipt), reset form
                resetForm();
                fetchNextReceiptNo();
            }
        }
    }, [isSuccess, message, dispatch, selectedStudent]);

    const fetchNextReceiptNo = async (branchId = null) => {
        try {
            const params = {};
            if (branchId) params.branchId = branchId;
            // If super admin and no branch selected yet, it might fetch global next or default
            
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/fees/next-no`, {
                params,
                withCredentials: true
            });
            setValue('receiptNo', data);
        } catch (error) {
            console.error("Failed to fetch next receipt no", error);
            setValue('receiptNo', 'Error');
        }
    };

    const fetchStudentPaymentData = async (studentId) => {
        try {
            // Fetch payment summary
            const { data: summary } = await axios.get(
                `${import.meta.env.VITE_API_URL}/transaction/student/${studentId}/payment-summary`,
                { withCredentials: true }
            );
            setPaymentSummary(summary);

            // Fetch payment history
            const { data: history } = await axios.get(
                `${import.meta.env.VITE_API_URL}/transaction/student/${studentId}/payment-history`,
                { withCredentials: true }
            );
            setPaymentHistory(history);

            // Auto-fill amount with outstanding amount
            setValue('amountPaid', summary.outstandingAmount || 0);
        } catch (error) {
            console.error("Failed to fetch student payment data", error);
            toast.error("Failed to load student payment information");
        }
    };

    const handleStudentSelect = (id, student) => {
        setSelectedStudent(student);
        if (student) {
            setValue('studentId', id);
            setValue('courseName', student.course?.name || 'N/A');
            fetchStudentPaymentData(id);
            // Fetch next receipt number for this student's branch
            fetchNextReceiptNo(student.branchId);
        } else {
            setSelectedStudent(null);
            setPaymentSummary(null);
            setPaymentHistory([]);
            setValue('studentId', '');
            setValue('courseName', '');
            setValue('amountPaid', '');
        }
    };

    const resetForm = () => {
        reset({
            receiptNo: 'Loading...',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Cash',
            chequeDate: new Date().toISOString().split('T')[0],
            transactionDate: new Date().toISOString().split('T')[0]
        });
        setSelectedStudent(null);
        setPaymentSummary(null);
        setPaymentHistory([]);
        setEditingReceipt(null);
        fetchNextReceiptNo();
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setIsSubmitting(false);
        }
    }, [isLoading]);

    const onSubmit = (data) => {
        if (isSubmitting) return;
        
        if (!selectedStudent) {
            toast.error("Please select a student");
            return;
        }
        
        setIsSubmitting(true);

        const payload = {
            ...data,
            studentId: data.studentId,
            courseId: selectedStudent.course?._id,
        };

        if (editingReceipt) {
            dispatch(updateFeeReceipt({ id: editingReceipt._id, data: payload }));
        } else {
            dispatch(collectFees(payload));
        }
    };

    const [showEditModal, setShowEditModal] = useState(false);

    const handleEdit = (receipt) => {
        setEditingReceipt(receipt);
        setShowEditModal(true);
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingReceipt(null);
    };

    const onReceiptUpdateSuccess = () => {
        if (selectedStudent) {
            fetchStudentPaymentData(selectedStudent._id);
        }
    };
    
    // handleUpdateReceipt and redundant editFormData removed here as they are handled in EditReceiptModal

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this receipt?')) {
            dispatch(deleteFeeReceipt(id));
        }
    };

    // --- Filter & Report Handlers Removed (Moved to AllReceipts) ---

    // --- Printing ---
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
        <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-blue-600"/> Fees Receipt Management
            </h1>

            <div className={`grid grid-cols-1 ${selectedStudent ? 'lg:grid-cols-2 gap-6' : 'gap-6'}`}>
                
                {/* === NEW RECEIPT FORM (Takes 3/5 cols) === */}
                <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${selectedStudent ? '' : ''}`}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Receipt className="text-indigo-600"/> {editingReceipt ? 'Edit Receipt' : 'New Receipt'}
                    </h2>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        {/* Receipt Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Receipt Number</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    {...register('receiptNo')} 
                                    readOnly 
                                    className="w-full border bg-gray-100 text-gray-500 rounded-lg p-3 cursor-not-allowed text-base"
                                />
                                {user?.role === 'Super Admin' && selectedStudent?.branchName && (
                                    <input 
                                        type="text" 
                                        disabled 
                                        value={selectedStudent.branchName} 
                                        className="w-1/2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm font-semibold text-center"
                                        title="Branch Name"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Receipt Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Receipt Date</label>
                            <input 
                                type="date" 
                                {...register('date', { required: true })} 
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                            />
                        </div>

                        {/* Student Name */}
                        <div>
                            <Controller
                                name="studentId"
                                control={control}
                                rules={{ required: "Student is required" }}
                                render={({ field, fieldState: { error } }) => (
                                    <StudentSearch 
                                        label="Student Name"
                                        required
                                        error={error?.message}
                                        onSelect={handleStudentSelect}
                                        placeholder="Search student..."
                                        additionalFilters={{ isRegistered: 'true' }}
                                    />
                                )}
                            />
                        </div>

                        {/* Course */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Course</label>
                            <input 
                                type="text" 
                                {...register('courseName')} 
                                readOnly 
                                placeholder="Auto-filled"
                                className="w-full border bg-gray-100 rounded-lg p-3 outline-none text-gray-600 text-base"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
                            <input 
                                type="text"
                                inputMode="numeric"
                                {...register('amountPaid', { 
                                    required: true,
                                    validate: (value) => {
                                        if (paymentSummary && Number(value) > paymentSummary.dueAmount) {
                                            return `Exceeds Total Course Due (Max: ₹${paymentSummary.dueAmount})`;
                                        }
                                        return true;
                                    }
                                })} 
                                className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-base ${errors.amountPaid ? 'border-red-500' : ''}`}
                                placeholder="Enter amount"
                                onInput={(e) => e.target.value = e.target.value.replace(/[^0-9.]/g, '')}
                            />
                            {errors.amountPaid && <p className="text-red-500 text-xs mt-1">{errors.amountPaid.message}</p>}
                             {paymentSummary && (
                                <p className="text-xs text-red-500 mt-1 font-semibold">
                                    Outstanding: ₹{paymentSummary.outstandingAmount} | Total Due: ₹{paymentSummary.dueAmount}
                                </p>
                            )}                        </div>
                        {/* Payment Mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Payment Mode</label>
                            <select 
                                {...register('paymentMode', { required: true })} 
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Online/UPI">Online/UPI</option>
                            </select>
                        </div>

                        {/* Dynamic Fields for Cash/Cheque/UPI in Main Form */}
                        {watch('paymentMode') === 'Cheque' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name *</label>
                                    <input {...register('bankName', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Bank Name"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Cheque Number *</label>
                                    <input {...register('chequeNumber', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Cheque No"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Cheque Date *</label>
                                    <input type="date" {...register('chequeDate', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"/>
                                </div>
                            </>
                        )}

                        {watch('paymentMode') === 'Online/UPI' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name *</label>
                                    <input {...register('bankName', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Bank Name"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Number *</label>
                                    <input {...register('transactionId', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Trans ID"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Date *</label>
                                    <input type="date" {...register('transactionDate', { required: true })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"/>
                                </div>
                            </>
                        )}

                        {/* Remark */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Remark</label>
                            <textarea 
                                {...register('remarks')} 
                                rows="2"
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base"
                                placeholder="Optional notes"
                            ></textarea>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={isLoading || isSubmitting} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                {isLoading || isSubmitting ? <RotateCcw className="animate-spin" size={16}/> : <Save size={16}/>} 
                                {isLoading || isSubmitting ? 'Saving...' : (editingReceipt ? 'Update' : 'Save')}
                            </button>
                            <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 text-sm font-medium">
                                <RotateCcw size={16}/> Reset
                            </button>
                            <button type="button" onClick={() => navigate('/transaction/all-receipts')} className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium shadow-sm">
                                <Eye size={16}/> View All Receipts
                            </button>
                        </div>
                    </form>
                </div>

                {/* === SIDEBAR DETAILS (Takes 2/5 cols) === */}
                {selectedStudent && paymentSummary && (
                    <div className="flex flex-col gap-6 animate-slideInRight">
                        
                        {/* Section 1: Receive Detail Summary (Vertical Card) */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex items-center gap-2">
                                <DollarSign className="text-purple-600"/> 
                                <h3 className="text-lg font-semibold text-gray-700">Fee Details</h3>
                            </div>
                            
                            <div className="p-4 flex flex-col items-center">
                                {/* Student Identity Card */}
                                <div className="mb-4 relative">
                                    <img 
                                        src={selectedStudent.studentPhoto ? (selectedStudent.studentPhoto.startsWith('http') ? selectedStudent.studentPhoto : `${import.meta.env.VITE_API_URL}/${selectedStudent.studentPhoto}`) : "https://via.placeholder.com/150"} 
                                        alt="Student" 
                                        className="w-32 h-32 rounded-lg object-cover bg-gray-100 border-4 border-white shadow-md"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                        {selectedStudent.enrollmentNo || 'NEW'}
                                    </div>
                                </div>

                                <div className="text-center mb-6 w-full text-balance">
                                    <h3 className="text-xl font-bold text-gray-800 leading-tight">
                                        {selectedStudent.firstName} {selectedStudent.middleName ? `${selectedStudent.middleName} ` : ''}{selectedStudent.lastName}
                                    </h3>
                                    <p className="text-sm text-purple-600 font-medium mt-1">
                                        {selectedStudent.course?.name || 'N/A'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                                        <p className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Received</p>
                                        <p className="text-lg font-bold text-green-700">₹{paymentSummary.totalReceived?.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
                                        <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider">Due</p>
                                        <p className="text-lg font-bold text-orange-700">₹{paymentSummary.dueAmount?.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center col-span-2">
                                        <p className="text-[10px] text-red-600 uppercase font-bold tracking-wider">Total Outstanding</p>
                                        <p className="text-2xl font-bold text-red-700">₹{paymentSummary.outstandingAmount?.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-center w-full mt-3 text-xs text-gray-500 border border-gray-100">
                                    Plan: {paymentSummary.feesMethod} <br/>
                                    {paymentSummary.emiStructure}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Payment History (Table View) */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-[500px]">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar className="text-purple-600" size={18}/> Payment History
                                </h3>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{paymentHistory.length}</span>
                            </div>
                            
                            <div className="overflow-x-auto overflow-y-auto flex-1 p-0 custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="p-3 border-b">Date</th>
                                            <th className="p-3 border-b">Receipt Number</th>
                                            <th className="p-3 border-b">Installment No</th>
                                            <th className="p-3 border-b text-right">Amount (₹)</th>
                                            <th className="p-3 border-b">Payment Mode</th>
                                            <th className="p-3 border-b text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                        {paymentHistory.length > 0 ? (
                                            paymentHistory.map((receipt) => (
                                                <tr key={receipt._id} className="hover:bg-blue-50/50 transition duration-150">
                                                    <td className="p-3 whitespace-nowrap text-gray-700">{moment(receipt.date).format('DD/MM/YY')}</td>
                                                    <td className="p-3 font-mono text-gray-500 text-xs">{receipt.receiptNo}</td>
                                                    <td className="p-3">
                                                       {(() => {
                                                            const remark = (receipt.remarks || '').toLowerCase();
                                                            
                                                            if (remark.includes('admission')) {
                                                                return (
                                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wide border border-purple-200">
                                                                        Admission
                                                                    </span>
                                                                );
                                                            } else if (remark.includes('registration')) {
                                                                return (
                                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wide border border-indigo-200">
                                                                        Registration
                                                                    </span>
                                                                );
                                                            } else {
                                                                // This is a monthly installment payment
                                                                const installmentNum = (receipt.installmentNumber - 2) > 0 ? receipt.installmentNumber - 2 : 1;
                                                                return (
                                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wide border border-blue-200">
                                                                        {installmentNum}
                                                                    </span>
                                                                );
                                                            }
                                                        })()}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-gray-800">{receipt.amountPaid?.toLocaleString('en-IN')}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                            receipt.paymentMode === 'Cash' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                            receipt.paymentMode === 'Online/UPI' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                            'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                            {receipt.paymentMode}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex justify-center gap-1">
                                                            <button 
                                                                onClick={() => triggerPrintReceipt(receipt)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition" 
                                                                title="Print"
                                                            >
                                                                <Printer size={14}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEdit(receipt)}
                                                                className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded transition"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-400">
                                                    <div className="flex flex-col items-center">
                                                        <FileText size={32} className="mb-2 opacity-20"/>
                                                        <span className="text-xs">No payment history found.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* === HIDDEN PRINT TEMPLATES === */}
            <div className="hidden">
                <ReceiptPrintTemplate ref={receiptRef} receipt={printingReceipt} />
            </div>

            {/* === EDIT RECEIPT MODAL === */}
            <EditReceiptModal 
                isOpen={showEditModal}
                onClose={handleCancelEdit}
                receipt={editingReceipt}
                onUpdateSuccess={onReceiptUpdateSuccess}
            />
        </div>
    );
};

export default FeeCollection;
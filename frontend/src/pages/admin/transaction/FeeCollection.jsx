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
import { getMediaUrl } from '../../../utils/mediaUrl';

const POPULAR_INDIAN_BANKS = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "Kotak Mahindra Bank",
    "IndusInd Bank",
    "IDFC First Bank",
    "Yes Bank",
    "Other",
];

const ONLINE_PAYMENT_TYPES = ["UPI", "Net Banking", "Bank Transfer", "Other"];
const UPI_PROVIDERS = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "Other"];

const getReceiptDisplayType = (receipt) => {
    const remark = (receipt.remarks || '').toLowerCase();

    if (receipt.receiptPurpose === 'admission') {
        return {
            label: 'Admission',
            className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
    }

    if (receipt.receiptPurpose === 'registration') {
        return {
            label: 'Registration',
            className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        };
    }

    if (receipt.receiptPurpose === 'installment') {
        return {
            label: receipt.displayInstallmentNumber || receipt.installmentNumber || 1,
            className: 'bg-blue-100 text-blue-700 border-blue-200'
        };
    }

    if (remark.includes('admission')) {
        return {
            label: 'Admission',
            className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
    }

    if (remark.includes('registration')) {
        return {
            label: 'Registration',
            className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        };
    }

    return {
        label: receipt.displayInstallmentNumber || receipt.installmentNumber || 1,
        className: 'bg-blue-100 text-blue-700 border-blue-200'
    };
};

const FeeCollection = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { receipts, isSuccess, message, isLoading } = useSelector(state => state.transaction);
    const { user } = useSelector((state) => state.auth);
    
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [printingReceipt, setPrintingReceipt] = useState(null);
    
    // Testing Date State
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
    
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
            receiptBankOption: '',
            onlinePaymentType: 'UPI',
            onlineProviderOption: '',
            chequeDate: new Date().toISOString().split('T')[0], // Default today for UI
            transactionDate: new Date().toISOString().split('T')[0] // Default today for UI
        }
    });
    const paymentMode = watch('paymentMode');
    const receiptBankOption = watch('receiptBankOption');
    const onlinePaymentType = watch('onlinePaymentType');
    const onlineProviderOption = watch('onlineProviderOption');
    const maxPayableAmount = Number(paymentSummary?.dueAmount ?? paymentSummary?.outstandingAmount ?? 0);

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
                { 
                    params: { testDate },
                    withCredentials: true 
                }
            );
            setPaymentSummary(summary);

            // Fetch payment history
            const { data: history } = await axios.get(
                `${import.meta.env.VITE_API_URL}/transaction/student/${studentId}/payment-history`,
                { withCredentials: true }
            );
            setPaymentHistory(history);

            // Auto-fill only the current outstanding amount returned by the backend.
            setValue('amountPaid', Number(summary.outstandingAmount ?? 0));
        } catch (error) {
            console.error("Failed to fetch student payment data", error);
            toast.error("Failed to load student payment information");
        }
    };

    // Re-fetch when testDate changes
    useEffect(() => {
        if (selectedStudent) {
            fetchStudentPaymentData(selectedStudent._id);
        }
    }, [testDate]);

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
            receiptBankOption: '',
            onlinePaymentType: 'UPI',
            onlineProviderOption: '',
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

    const onSubmit = async (data) => {
        if (isSubmitting) return;
        
        if (!selectedStudent) {
            toast.error("Please select a student");
            return;
        }
        
        setIsSubmitting(true);

        if (data.paymentMode === 'Cheque') {
            if (!data.bankName?.trim() || !data.chequeNumber?.trim() || !data.chequeDate) {
                toast.error('Please enter cheque bank, cheque number, and cheque date');
                setIsSubmitting(false);
                return;
            }
        }

        if (data.paymentMode === 'Online/UPI') {
            if (!data.transactionId?.trim() || !data.transactionDate) {
                toast.error('Please enter transaction number and transaction date');
                setIsSubmitting(false);
                return;
            }
            if (data.onlinePaymentType === 'UPI') {
                if (!data.paymentProviderName?.trim()) {
                    toast.error('Please select UPI app/provider');
                    setIsSubmitting(false);
                    return;
                }
                if (!data.upiId?.trim()) {
                    toast.error('Please enter UPI ID / number');
                    setIsSubmitting(false);
                    return;
                }
            } else if (data.onlinePaymentType === 'Other') {
                if (!data.paymentProviderName?.trim()) {
                    toast.error('Please enter online payment name/provider');
                    setIsSubmitting(false);
                    return;
                }
            } else if (!data.bankName?.trim()) {
                toast.error('Please select or enter bank name');
                setIsSubmitting(false);
                return;
            }
        }

        const payload = {
            ...data,
            studentId: data.studentId,
            courseId: selectedStudent.course?._id,
            paymentDetails: data.onlinePaymentType === 'UPI' ? data.upiId : data.paymentDetails,
        };

        try {
            if (editingReceipt) {
                await dispatch(updateFeeReceipt({ id: editingReceipt._id, data: payload })).unwrap();
            } else {
                await dispatch(collectFees(payload)).unwrap();
            }
        } catch (error) {
            toast.error(error?.message || 'Failed to save receipt');
        } finally {
            setIsSubmitting(false);
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

    // === Printing ===
    const handlePrintReceipt = useReactToPrint({
        contentRef: receiptRef,
        onBeforePrint: async () => {
            // Ensure the receipt is set before printing
            return new Promise((resolve) => {
                setTimeout(resolve, 500);
            });
        },
        onAfterPrint: () => {
            setPrintingReceipt(null);
        },
        documentTitle: `Receipt-${printingReceipt?.receiptNo || 'print'}`,
        pageStyle: ` 
          @page { 
            margin: 0; 
            size: A4 portrait; 
          } 
          @media print { 
            html, body { 
              margin: 0 !important; 
              padding: 0 !important; 
              background: #fff !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            } 
            .print-only-container { 
              width: 210mm !important; 
              height: 297mm !important; 
              page-break-after: avoid !important; 
              page-break-inside: avoid !important; 
            } 
          } 
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          } 
        `
    });

    const triggerPrintReceipt = (receipt) => {
        setPrintingReceipt(receipt);
        // Add a small delay to ensure the template has rendered with the new receipt data
        setTimeout(() => {
            const printBtn = document.getElementById('hidden-print-trigger-collection');
            if (printBtn) {
                printBtn.click();
            } else {
                handlePrintReceipt();
            }
        }, 500);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">

            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-blue-600"/> Fees Receipt Management
            </h1>

            <div className={`grid grid-cols-1 ${selectedStudent ? 'lg:grid-cols-2 gap-6' : 'gap-6'}`}>
                
                {/* === NEW RECEIPT FORM (Takes 3/5 cols) === */}
                <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${selectedStudent ? '' : ''}`}>
                    {/* Testing Date Picker - Only for testing outstanding logic */}
                    {/* <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-yellow-600" size={16}/>
                            <span className="text-xs font-bold text-yellow-700">TESTING DATE (Simulate Future Month):</span>
                        </div>
                        <input 
                            type="date" 
                            value={testDate}
                            onChange={(e) => setTestDate(e.target.value)}
                            className="text-xs border border-yellow-300 rounded p-1 bg-white outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                    </div> */}

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
                                        onlyWithOutstanding
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
                                        const amount = Number(value);
                                        if (Number.isNaN(amount) || amount <= 0) {
                                            return 'Enter a valid amount';
                                        }
                                        if (paymentSummary && amount > maxPayableAmount) {
                                            return `Exceeds Total Due (Max: Rs. ${maxPayableAmount?.toLocaleString('en-IN')})`;
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
                                <div className="text-xs text-gray-600 mt-1 space-y-1 bg-blue-50 rounded p-2 border border-blue-100">
                                    <div className="flex justify-between">
                                        <span className="text-purple-700 font-semibold">Admission Fee:</span>
                                        <span>₹{paymentSummary.admissionFee?.toLocaleString('en-IN')} / Paid: ₹{paymentSummary.admissionPaid?.toLocaleString('en-IN')} / <span className="text-red-500 font-semibold">Out: ₹{paymentSummary.admissionOutstanding?.toLocaleString('en-IN')}</span></span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-indigo-700 font-semibold">Registration Fee:</span>
                                        <span>₹{paymentSummary.registrationFee?.toLocaleString('en-IN')} / Paid: ₹{paymentSummary.registrationPaid?.toLocaleString('en-IN')} / <span className="text-red-500 font-semibold">Out: ₹{paymentSummary.registrationOutstanding?.toLocaleString('en-IN')}</span></span>
                                    </div>
                                    {paymentSummary.feesMethod === 'Monthly' && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 font-semibold">Installment:</span>
                                            <span>Current: ₹{paymentSummary.currentInstallmentDue?.toLocaleString('en-IN')} / Prev Out: ₹{paymentSummary.previousOutstanding?.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {paymentSummary.installmentPrepaid > 0 && (
                                        <div className="flex justify-between text-green-700">
                                            <span className="font-semibold">Advance / Credit:</span>
                                            <span className="font-bold">-₹{paymentSummary.installmentPrepaid?.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-blue-200 pt-1 font-semibold text-orange-700">
                                        <span>Current Due:</span>
                                        <span>₹{paymentSummary.outstandingAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-red-600">
                                        <span>Total Due  Outstanding:</span>
                                        <span>Rs. {paymentSummary.dueAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
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
                        {paymentMode === 'Cheque' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name *</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {POPULAR_INDIAN_BANKS.map((bank) => (
                                            <label key={bank} className="flex items-center gap-2 border rounded-lg p-2 text-sm cursor-pointer hover:bg-blue-50">
                                                <input
                                                    type="radio"
                                                    value={bank}
                                                    {...register('receiptBankOption')}
                                                    onChange={(e) => {
                                                        setValue('receiptBankOption', e.target.value);
                                                        setValue('bankName', e.target.value === 'Other' ? '' : e.target.value);
                                                    }}
                                                />
                                                {bank}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {receiptBankOption === 'Other' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Other Bank Name *</label>
                                        <input {...register('bankName')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Enter bank name"/>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Cheque Number *</label>
                                    <input {...register('chequeNumber')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Cheque No"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Cheque Date *</label>
                                    <input type="date" {...register('chequeDate')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"/>
                                </div>
                            </>
                        )}

                        {paymentMode === 'Online/UPI' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Payment Type *</label>
                                    <select
                                        {...register('onlinePaymentType')}
                                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                                        onChange={(e) => {
                                            setValue('onlinePaymentType', e.target.value);
                                            setValue('onlineProviderOption', '');
                                            setValue('receiptBankOption', '');
                                            setValue('paymentProviderName', '');
                                            setValue('bankName', '');
                                            setValue('upiId', '');
                                        }}
                                    >
                                        {ONLINE_PAYMENT_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                {onlinePaymentType === 'UPI' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">UPI App / Provider *</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {UPI_PROVIDERS.map((provider) => (
                                                    <label key={provider} className="flex items-center gap-2 border rounded-lg p-2 text-sm cursor-pointer hover:bg-blue-50">
                                                        <input
                                                            type="radio"
                                                            value={provider}
                                                            {...register('onlineProviderOption')}
                                                            onChange={(e) => {
                                                                setValue('onlineProviderOption', e.target.value);
                                                                setValue('paymentProviderName', e.target.value === 'Other' ? '' : e.target.value);
                                                                setValue('bankName', e.target.value === 'Other' ? '' : e.target.value);
                                                            }}
                                                        />
                                                        {provider}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        {onlineProviderOption === 'Other' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">UPI App Name *</label>
                                                <input
                                                    {...register('paymentProviderName')}
                                                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                                                    placeholder="Enter UPI app name"
                                                    onChange={(e) => {
                                                        setValue('paymentProviderName', e.target.value);
                                                        setValue('bankName', e.target.value);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {onlineProviderOption && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">UPI ID / Number *</label>
                                                <input {...register('upiId')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="example@upi or mobile number"/>
                                            </div>
                                        )}
                                    </>
                                ) : onlinePaymentType === 'Other' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Payment Name *</label>
                                        <input
                                            {...register('paymentProviderName')}
                                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                                            placeholder="Enter payment name"
                                            onChange={(e) => {
                                                setValue('paymentProviderName', e.target.value);
                                                setValue('bankName', e.target.value);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name *</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {POPULAR_INDIAN_BANKS.map((bank) => (
                                                    <label key={bank} className="flex items-center gap-2 border rounded-lg p-2 text-sm cursor-pointer hover:bg-blue-50">
                                                        <input
                                                            type="radio"
                                                            value={bank}
                                                            {...register('receiptBankOption')}
                                                            onChange={(e) => {
                                                                setValue('receiptBankOption', e.target.value);
                                                                setValue('bankName', e.target.value === 'Other' ? '' : e.target.value);
                                                            }}
                                                        />
                                                        {bank}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        {receiptBankOption === 'Other' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">Other Bank Name *</label>
                                                <input {...register('bankName')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Enter bank name"/>
                                            </div>
                                        )}
                                    </>
                                )}

                                {onlinePaymentType !== 'UPI' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Payment Details</label>
                                        <input {...register('paymentDetails')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Account last 4 digits, note, or extra details"/>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Number *</label>
                                    <input {...register('transactionId')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="UTR / Ref No / Transaction ID"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Date *</label>
                                    <input type="date" {...register('transactionDate')} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base"/>
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
                        
                        {/* Section 1: Fee Detail Summary (Comprehensive Card) */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex items-center gap-2">
                                <DollarSign className="text-purple-600"/> 
                                <h3 className="text-lg font-semibold text-gray-700">Fee Details</h3>
                            </div>
                            
                            <div className="p-4 flex flex-col items-center">
                                {/* Student Identity Card */}
                                <div className="mb-4 relative">
                                    <img 
                                        src={getMediaUrl(selectedStudent.studentPhoto) || "https://via.placeholder.com/150"} 
                                        alt="Student" 
                                        className="w-32 h-32 rounded-lg object-cover object-center bg-gray-100 border-4 border-white shadow-md"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                        {selectedStudent.enrollmentNo || 'NEW'}
                                    </div>
                                </div>

                                <div className="text-center mb-4 w-full text-balance">
                                    <h3 className="text-xl font-bold text-gray-800 leading-tight">
                                        {selectedStudent.firstName} {selectedStudent.middleName ? `${selectedStudent.middleName} ` : ''}{selectedStudent.lastName}
                                    </h3>
                                    <p className="text-sm text-purple-600 font-medium mt-1">
                                        {selectedStudent.course?.name || 'N/A'}
                                    </p>
                                     <div className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-100 py-1 rounded">
                                        Total Fees: ₹{paymentSummary.totalFees?.toLocaleString('en-IN')}
                                    </div>
                                </div>

                                {/* === FEE BREAKDOWN TABLE === */}
                                <div className="w-full space-y-2 text-xs">
                                    {/* Admission Fee Row */}
                                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-purple-700">Admission Fee</span>
                                            <span className="font-bold text-gray-800">₹{paymentSummary.admissionFee?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 mt-1">
                                            <span>Paid: <span className="font-semibold text-green-600">₹{paymentSummary.admissionPaid?.toLocaleString('en-IN')}</span></span>
                                            <span>Outstanding: <span className="font-semibold text-red-600">₹{paymentSummary.admissionOutstanding?.toLocaleString('en-IN')}</span></span>
                                        </div>
                                    </div>

                                    {/* Registration Fee Row */}
                                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-indigo-700">Registration Fee</span>
                                            <span className="font-bold text-gray-800">₹{paymentSummary.registrationFee?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 mt-1">
                                            <span>Paid: <span className="font-semibold text-green-600">₹{paymentSummary.registrationPaid?.toLocaleString('en-IN')}</span></span>
                                            <span>Outstanding: <span className="font-semibold text-red-600">₹{paymentSummary.registrationOutstanding?.toLocaleString('en-IN')}</span></span>
                                        </div>
                                    </div>

                                    {/* Course Fee Breakdown */}
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-blue-700">Course Fee</span>
                                            <span className="font-bold text-gray-800">₹{paymentSummary.courseFee?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Reg Fee: ₹{paymentSummary.registrationFee?.toLocaleString('en-IN')}</span>
                                            <span>Remaining: <span className="font-semibold">₹{paymentSummary.remainingCourseFee?.toLocaleString('en-IN')}</span></span>
                                        </div>
                                        {paymentSummary.feesMethod === 'Monthly' && (
                                            <>
                                                <div className="border-t border-blue-200 mt-2 pt-2 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 font-semibold">Current Installment Due:</span>
                                                        <span className="font-bold text-blue-800">₹{paymentSummary.currentInstallmentDue?.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-orange-700 font-semibold">Previous Outstanding:</span>
                                                        <span className="font-bold text-orange-700">₹{paymentSummary.previousOutstanding?.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    {paymentSummary.installmentPrepaid > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-green-700 font-semibold">Advance / Credit:</span>
                                                            <span className="font-bold text-green-700">-₹{paymentSummary.installmentPrepaid?.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Summary Box */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Total Received:</span>
                                            <span className="font-bold text-green-700">₹{paymentSummary.totalReceived?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span>Total Due (All):</span>
                                            <span className="font-bold text-orange-700">₹{paymentSummary.dueAmount?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between mt-1 border-t border-gray-300 pt-1 text-sm">
                                            <span className="font-bold text-red-700">Current Outstanding:</span>
                                            <span className="font-bold text-red-700 text-lg">₹{paymentSummary.outstandingAmount?.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-2 rounded text-center w-full mt-3 text-xs text-gray-500 border border-gray-100">
                                    Plan: {paymentSummary.feesMethod} 
                                    {paymentSummary.emiStructure && <><br/>{paymentSummary.emiStructure}</>}
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
                                                            const displayType = getReceiptDisplayType(receipt);
                                                            return (
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${displayType.className}`}>
                                                                    {displayType.label}
                                                                </span>
                                                            );
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

            {/* Hidden button to trigger print-to-react properly on mobile */}
            <button id="hidden-print-trigger-collection" onClick={handlePrintReceipt} className="hidden" />

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



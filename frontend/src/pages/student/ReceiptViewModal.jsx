import React, { useRef } from 'react';
import { X} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logoImage from '../../assets/logo2.png';

const ReceiptViewModal = ({ isOpen, onClose, receipt }) => {
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: receipt ? `Receipt-${receipt.receiptNo}` : 'Receipt',
    });

    if (!isOpen || !receipt) return null;

    // Helper to calculate totals if needed, or just use amountPaid
    const totalAmount = receipt.amountPaid;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
                >
                    {/* Header Controls */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                        <h2 className="text-lg font-bold text-gray-800">Receipt Details</h2>
                        <div className="flex items-center gap-2">
                             {/* <button 
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <Printer size={16} />
                                <span>Print</span>
                            </button> */}
                            <button 
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50">
                        {/* Printable Area */}
                        <div ref={printRef} className="bg-white p-8 shadow-sm border border-gray-200 mx-auto max-w-2xl text-sm font-sans">
                            
                            {/* 1. Header Section */}
                            <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-6">
                                {/* Logo */}
                                <div className="w-48">
                                    <img src={logoImage} alt="Institute Logo" className="w-full h-auto object-contain" />
                                </div>
                                
                                {/* Branch Details */}
                                <div className="text-right text-gray-600 text-xs leading-relaxed">
                                    <h3 className="text-lg font-bold text-blue-800 mb-1">
                                        {receipt.student?.branchId?.name || (receipt.student?.branchName ? (receipt.student.branchName.endsWith(' Branch') ? receipt.student.branchName : `${receipt.student.branchName} Branch`) : 'Main')}                                    </h3>
                                    <p>{receipt.student?.branchId?.address || 'Address Line 1'}</p>
                                    <p>{receipt.student?.branchId?.city}, {receipt.student?.branchId?.state} - {receipt.student?.branchId?.pincode}</p>
                                    <p className="mt-1">
                                        <span className="font-semibold">Phone:</span> {receipt.student?.branchId?.phone} | 
                                        <span className="font-semibold ml-1">Mobile:</span> {receipt.student?.branchId?.mobile}
                                    </p>
                                    <p>
                                         <span className="font-semibold">Email:</span> {receipt.student?.branchId?.email}
                                    </p>
                                </div>
                            </div>

                            {/* 2. Details Section */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Received From</p>
                                    <p className="font-bold text-gray-800 text-base border-b border-gray-100 pb-1">
                                        {receipt.student?.firstName} {receipt.student?.lastName}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Receipt No</p>
                                    <p className="font-bold text-gray-800 text-base border-b border-gray-100 pb-1">
                                        {receipt.receiptNo}
                                    </p>
                                </div>
                                
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Payment Mode</p>
                                    <p className="font-medium text-gray-800 capitalize">
                                        {receipt.paymentMode}
                                        {/* Show extra details if available */}
                                        {(receipt.bankName || receipt.transactionId) && (
                                            <span className="text-xs text-gray-500 block font-normal">
                                                {receipt.bankName ? `${receipt.bankName} ` : ''} 
                                                {receipt.transactionId ? `(Txn: ${receipt.transactionId})` : ''}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Receipt Date</p>
                                    <p className="font-medium text-gray-800">
                                        {moment(receipt.date).format('DD MMMM, YYYY')}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Payment Details Table */}
                            <div className="mb-6">
                                <table className="w-full border-collapse border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase text-left">
                                            <th className="p-3 border-r border-gray-200 font-semibold w-2/3">Particulars</th>
                                            <th className="p-3 font-semibold text-right">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {/* Assuming single item for now as per current data structure, but designed as table */}
                                        <tr>
                                            <td className="p-3 border-r border-gray-200 text-gray-800">
                                                {receipt.remarks && receipt.remarks.toLowerCase().includes('fees') 
                                                    ? receipt.remarks 
                                                    : `Course Fees (${receipt.course?.name || 'Course'})`
                                                }
                                                {receipt.installmentNumber > 0 && (
                                                     <span className="ml-1 text-gray-500 text-xs">- Installment {receipt.installmentNumber}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-medium text-gray-800">
                                                {receipt.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        {/* Empty rows filler if needed for visuals, skipping for now */}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                            <td className="p-3 border-r border-gray-200 text-right font-bold text-gray-700 uppercase text-xs">Total Received</td>
                                            <td className="p-3 text-right font-bold text-blue-700 text-base">
                                                ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* 4. Remarks */}
                            {receipt.remarks && (
                                <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
                                    <p className="text-gray-700 italic text-sm bg-gray-50 p-3 rounded border border-gray-100">
                                        "{receipt.remarks}"
                                    </p>
                                </div>
                            )}

                            {/* Footer Signature Area (Optional visual) */}
                            <div className="mt-12 flex justify-end">
                                <div className="text-center">
                                    <div className="h-12 w-32 mb-2"></div>
                                    <p className="text-xs text-gray-400 border-t border-gray-300 pt-1 w-32 mx-auto">Authorized Signatory</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ReceiptViewModal;

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateFeeReceipt } from '../../features/transaction/transactionSlice';
import { Edit2, X, Save } from 'lucide-react';
import { toast } from 'react-toastify';

const EditReceiptModal = ({ isOpen, onClose, receipt, onUpdateSuccess }) => {
    const dispatch = useDispatch();
    const { isSuccess, message } = useSelector(state => state.transaction);

    const [editFormData, setEditFormData] = useState({
        receiptNo: '',
        date: '',
        amountPaid: '',
        paymentMode: 'Cash',
        remarks: '',
        bankName: '',
        chequeNumber: '',
        chequeDate: '',
        transactionId: '',
        transactionDate: ''
    });

    useEffect(() => {
        if (receipt) {
            setEditFormData({
                receiptNo: receipt.receiptNo || '',
                date: receipt.date ? receipt.date.split('T')[0] : '',
                amountPaid: receipt.amountPaid || '',
                paymentMode: receipt.paymentMode || 'Cash',
                remarks: receipt.remarks || '',
                bankName: receipt.bankName || '',
                chequeNumber: receipt.chequeNumber || '',
                chequeDate: receipt.chequeDate ? receipt.chequeDate.split('T')[0] : '',
                transactionId: receipt.transactionId || '',
                transactionDate: receipt.transactionDate ? receipt.transactionDate.split('T')[0] : ''
            });
        }
    }, [receipt]);

    const handleUpdateReceipt = async () => {
        if (!receipt) return;
        
        // Validation check (basic)
        if (!editFormData.amountPaid || !editFormData.date || !editFormData.paymentMode) {
            toast.error("Please fill all required fields");
            return;
        }

        const payload = {
            amountPaid: editFormData.amountPaid,
            paymentMode: editFormData.paymentMode,
            remarks: editFormData.remarks,
            date: editFormData.date,
            bankName: editFormData.bankName,
            chequeNumber: editFormData.chequeNumber,
            chequeDate: editFormData.chequeDate,
            transactionId: editFormData.transactionId,
            transactionDate: editFormData.transactionDate
        };

        try {
            const resultAction = await dispatch(updateFeeReceipt({ id: receipt._id, data: payload }));
            if (updateFeeReceipt.fulfilled.match(resultAction)) {
                toast.success("Receipt Updated Successfully");
                if (onUpdateSuccess) onUpdateSuccess();
                onClose();
            } else {
                if (resultAction.payload) {
                    toast.error(resultAction.payload);
                } else {
                     toast.error("Failed to update receipt");
                }
            }
        } catch (err) {
             console.error("Failed to update receipt: ", err);
             toast.error("An error occurred");
        }
    };

    if (!isOpen || !receipt) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-xl flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Edit2 size={20} />
                        Edit Receipt <span className="text-blue-200 text-sm font-normal">({editFormData.receiptNo})</span>
                    </h2>
                    <button 
                        onClick={onClose}
                        className="hover:bg-white/20 p-1.5 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Receipt Date</label>
                            <input 
                                type="date" 
                                value={editFormData.date}
                                onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
                            <input 
                                type="number" 
                                value={editFormData.amountPaid}
                                onChange={(e) => setEditFormData({...editFormData, amountPaid: e.target.value})}
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                            />
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Mode</label>
                            <select 
                                value={editFormData.paymentMode}
                                onChange={(e) => setEditFormData({...editFormData, paymentMode: e.target.value})}
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Online/UPI">Online/UPI</option>
                            </select>
                        </div>

                        {/* Dynamic Fields */}
                        {editFormData.paymentMode === 'Cheque' && (
                            <>
                                <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
                                        <input 
                                        value={editFormData.bankName}
                                        onChange={(e) => setEditFormData({...editFormData, bankName: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="Bank Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cheque No</label>
                                    <input 
                                        value={editFormData.chequeNumber}
                                        onChange={(e) => setEditFormData({...editFormData, chequeNumber: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="Cheque No"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cheque Date</label>
                                    <input 
                                        type="date"
                                        value={editFormData.chequeDate}
                                        onChange={(e) => setEditFormData({...editFormData, chequeDate: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {editFormData.paymentMode === 'Online/UPI' && (
                            <>
                                <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
                                        <input 
                                        value={editFormData.bankName}
                                        onChange={(e) => setEditFormData({...editFormData, bankName: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="Bank Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Txn ID</label>
                                    <input 
                                        value={editFormData.transactionId}
                                        onChange={(e) => setEditFormData({...editFormData, transactionId: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="Transaction ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Txn Date</label>
                                    <input 
                                        type="date"
                                        value={editFormData.transactionDate}
                                        onChange={(e) => setEditFormData({...editFormData, transactionDate: e.target.value})}
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {/* Remarks - Full Width */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remarks</label>
                            <textarea 
                                value={editFormData.remarks}
                                onChange={(e) => setEditFormData({...editFormData, remarks: e.target.value})}
                                rows="3"
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                                placeholder="Add optional notes here..."
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 p-4 rounded-b-xl flex gap-3 justify-end shrink-0 border-t border-gray-100">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpdateReceipt}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Update Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditReceiptModal;

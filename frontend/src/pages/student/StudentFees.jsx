import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentFees } from '../../features/student/studentPortalSlice';
import { Eye, FileText, Search } from 'lucide-react';
import moment from 'moment';
import Loading from '../../components/Loading';
import ReceiptViewModal from './ReceiptViewModal';

const StudentFees = () => {
    const dispatch = useDispatch();
    const { fees, isLoading } = useSelector((state) => state.studentPortal);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchStudentFees());
    }, [dispatch]);

    const handleViewClick = (receipt) => {
        setSelectedReceipt(receipt);
        setIsModalOpen(true);
    };

    // Calculate Total Amount
    const totalAmount = fees?.reduce((acc, receipt) => acc + receipt.amountPaid, 0) || 0;

    // Filter fees based on search
    const filteredFees = fees?.filter(receipt => 
        receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        moment(receipt.date).format('DD/MM/YYYY').includes(searchTerm)
    );

    if (isLoading) return <Loading />;

    return (
        <div className="container mx-auto p-4 space-y-6">
            
            {/* Header / Search Section similar to Master lists */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center">
                <h1 className="text-lg font-bold text-gray-700 uppercase flex items-center gap-2">
                    <FileText size={20} className="text-blue-600"/> My Fee Receipts
                </h1>
                <div className="relative w-64">
                    <input 
                        type="text" 
                        placeholder="Search Receipt No or Date..." 
                        className="w-full border rounded pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>
            </div>

            {/* Table Section matching StudentList.jsx styles */}
            <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-3 border-r border-blue-500 font-semibold w-16 text-center">Sr. No.</th>
                            <th className="p-3 border-r border-blue-500 font-semibold">Student Name</th>
                            <th className="p-3 border-r border-blue-500 font-semibold text-right">Amount</th>
                            <th className="p-3 border-r border-blue-500 font-semibold">Receipt Date</th>
                            <th className="p-3 border-r border-blue-500 font-semibold text-center w-24">Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFees && filteredFees.length > 0 ? (
                            filteredFees.map((receipt, index) => (
                                <tr key={receipt._id} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                    <td className="p-3 border-r border-gray-100 text-center font-medium text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 font-medium text-gray-900 uppercase">
                                        {receipt.student?.firstName} {receipt.student?.lastName}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 text-right font-bold text-gray-700">
                                        {/* Display only the amount for this row */}
                                        {receipt.amountPaid.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 text-gray-600 font-mono">
                                        {moment(receipt.date).format('DD/MM/YYYY')}
                                    </td>
                                    <td className="p-3 border-r border-gray-100 text-center">
                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => handleViewClick(receipt)}
                                                className="bg-blue-50 text-blue-600 p-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
                                                title="View Receipt"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                    <p>No fee records found.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* Total Row */}
                    {filteredFees && filteredFees.length > 0 && (
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                            <tr>
                                <td colSpan="2" className="p-3 border-r border-gray-200 text-right font-bold text-gray-600 uppercase text-xs">Total Amount</td>
                                <td className="p-3 border-r border-gray-200 text-right font-black text-blue-800 text-sm">
                                    {totalAmount.toLocaleString('en-IN')}
                                </td>
                                <td colSpan="2" className="p-3"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <ReceiptViewModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                receipt={selectedReceipt} 
            />
        </div>
    );
};

export default StudentFees;

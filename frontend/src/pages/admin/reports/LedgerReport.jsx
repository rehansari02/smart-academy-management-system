import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLedger, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { Search, Printer, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import StudentSearch from '../../../components/StudentSearch';
import logo from '../../../assets/logo2.png'; // Improved Logo Import

const LedgerReport = () => {
    const dispatch = useDispatch();
    const { ledgerData, isLoading } = useSelector((state) => state.transaction);
    const { branches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);
    
    // Filters
    const [searchType, setSearchType] = useState('student'); // 'student' or 'regNo'
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [regNoInput, setRegNoInput] = useState('');

    const componentRef = useRef(null);

    // useReactToPrint hook usage
    const handlePrint = useReactToPrint({
        content: () => componentRef.current || document.getElementById('printable-ledger'),
        documentTitle: `Statement of Account - ${ledgerData?.student?.firstName || 'Student'}`,
        onAfterPrint: () => toast.success("Printed Successfully"),
    });

    // Cleanup on unmount
    useEffect(() => {
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        return () => { dispatch(resetTransaction()); };
    }, [dispatch, user]);

    // Handle Search
    const handleShowReport = () => {
        if (searchType === 'student' && !selectedStudentId) {
            toast.error('Please select a student');
            return;
        }
        if (searchType === 'regNo' && !regNoInput) {
            toast.error('Please enter registration number');
            return;
        }

        const query = searchType === 'student' ? { studentId: selectedStudentId } : { regNo: regNoInput };
        dispatch(fetchLedger(query));
    };

    const resetFilter = () => {
        setSelectedStudentId('');
        setRegNoInput('');
        dispatch(resetTransaction());
    };

    // Helper to get branch details
    const getBranchDetails = () => {
        if (!ledgerData?.student) return null;

        // 1. Try to find from fetched branches list if available (best source for full details)
        if (branches && branches.length > 0) {
            // Check if branchId is populated object or string ID
            const branchId = typeof ledgerData.student.branchId === 'object' 
                ? ledgerData.student.branchId?._id 
                : ledgerData.student.branchId;

            const foundBranch = branches.find(b => b._id === branchId);
            if (foundBranch) return foundBranch;
        }

        // 2. If branchId is already populated in student data with details (fallback)
        if (ledgerData.student.branchId && typeof ledgerData.student.branchId === 'object' && ledgerData.student.branchId.address) {
            return ledgerData.student.branchId;
        }

        // 3. Last Resort Fallback (Main / Bhestan)
        return {
            name: "Bhestan Branch",
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    const branchInfo = getBranchDetails() || {
        name: "Bhestan Branch",
        address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
        phone: "96017-49300", 
        mobile: "98988-30409",
        email: "smartinstitutes@gmail.com" 
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary"/> Statement of Account (Ledger)
            </h1>

            {/* --- Filter Section (Hidden in Print) --- */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    
                    {/* Search Type Selector */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-600 mb-2">Search By</label>
                        <select 
                            className="w-full border rounded-md p-2.5 focus:ring-2 focus:ring-primary outline-none bg-gray-50"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="student">Student Name</option>
                            <option value="regNo">Registration No</option>
                        </select>
                    </div>

                    {/* Input Field Based on Type */}
                    <div className="md:col-span-6">
                        {searchType === 'student' ? (
                            <StudentSearch
                                label="Select Student"
                                placeholder="Search by name or reg no..."
                                onSelect={(id) => setSelectedStudentId(id)}
                                required
                            />
                        ) : (
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Registration Number</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-md p-2.5 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Enter Reg No (e.g. 1-BHE)"
                                    value={regNoInput}
                                    onChange={(e) => setRegNoInput(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-4 flex gap-2">
                        <button 
                            onClick={handleShowReport} 
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 font-bold shadow transition flex items-center gap-2 w-full justify-center md:w-auto"
                        >
                           {isLoading ? 'Loading...' : <><Search size={18}/> Show Report</>}
                        </button>
                        <button 
                            onClick={resetFilter} 
                            className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-md hover:bg-gray-200 border border-gray-300 font-medium transition flex items-center gap-1"
                        >
                            <RefreshCw size={16}/> Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Report Display Section --- */}
            {ledgerData && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none print:w-full">
                    {/* Toolbar (Hidden in Print) */}
                    <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-end print:hidden">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium">
                            <Printer size={18}/> Print Statement
                        </button>
                    </div>

                    {/* Printable Area - Updated Design */}
                    <div ref={componentRef} id="printable-ledger" className="p-8 print:p-0 bg-white min-h-[10in] print:w-full text-slate-800">
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-primary pb-4">
                            <div className="flex items-center gap-4">
                                <img src={logo} alt="Institute Logo" className="h-20 object-contain" />
                            </div>
                            <div className="text-right text-xs space-y-1">
                                <h2 className="text-xl font-bold text-blue-600 mb-1">{branchInfo.name || 'Bhestan Branch'}</h2>
                                <div className="text-gray-600 max-w-xs ml-auto">
                                    {branchInfo.address}
                                </div>
                                <p className="font-semibold text-blue-800">
                                     Ph. No. : {branchInfo.phone}, Mob. No. : {branchInfo.mobile}
                                </p>
                                <p className="text-blue-500 underline">{branchInfo.email}</p>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-blue-500 uppercase tracking-wide inline-block border-b border-blue-200 pb-1">Statement of Account</h2>
                        </div>

                        {/* Student Details Grid */}
                        <div className="bg-gray-50/50 p-0 mb-6 text-xs">
                           <div className="grid grid-cols-2 gap-x-8">
                                {/* Left Column */}
                                <div className="space-y-0">
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Reg.No. :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.regNo}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Student Name :</span> <span className="col-span-2 font-bold text-gray-800 uppercase">{ledgerData.student.firstName} {ledgerData.student.middleName ? ledgerData.student.middleName + ' ' : ''}{ledgerData.student.lastName}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Date-of-Birth :</span> <span className="col-span-2 text-gray-800">{moment(ledgerData.student.dob).format('DD-MM-YYYY')}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Reference :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.reference}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Address :</span> <span className="col-span-2 text-gray-800 uppercase">{ledgerData.student.address}, {ledgerData.student.city}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Tel.No. :</span> <span className="col-span-2 text-gray-800">(H) {ledgerData.student.contactHome || '-'}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Mob. :(Stud)</span> <span className="col-span-2 text-gray-800">{ledgerData.student.mobileStudent}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Mob. :(Parent)</span> <span className="col-span-2 text-gray-800">{ledgerData.student.mobileParent}</span></div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-0">
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Course Name :</span> <span className="col-span-2 font-bold text-gray-800 uppercase">{ledgerData.course.name}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Course Duration :</span> <span className="col-span-2 text-gray-800">{ledgerData.course.duration} {ledgerData.course.durationType}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Course Fees :</span> <span className="col-span-2 text-gray-800 font-semibold">{ledgerData.summary.totalCourseFees}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Batch Time :</span> <span className="col-span-2 text-gray-800">{ledgerData.batch ? `${ledgerData.batch.startTime} To ${ledgerData.batch.endTime}` : 'N/A'}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Batch Name :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.batch}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Selected Fees Method :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.paymentPlan}</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Admission Fees :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.admissionFeeAmount || ledgerData.course.admissionFees}.00</span></div>
                                    <div className="grid grid-cols-3 py-1.5 border-b border-gray-100"><span className="font-bold text-gray-700">Monthly Fees :</span> <span className="col-span-2 text-gray-800">{ledgerData.student.paymentPlan === 'Monthly' ? `${ledgerData.course.monthlyFees}.00` : 'N/A'}</span></div>
                                </div>
                           </div>
                        </div>

                        {/* Fees Details Title */}
                        <div className="text-center mb-4">
                             <h3 className="text-lg font-bold text-blue-500 uppercase">Fees Details</h3>
                        </div>

                        {/* Fees Table */}
                        <div className="mb-6">
                            <table className="w-full border-collapse border border-white text-xs">
                                <thead>
                                    <tr className="bg-[#3b82f6] text-white">
                                        <th className="px-4 py-3 font-medium border-r border-blue-400 w-12 text-center">Sr</th>
                                        <th className="px-4 py-3 font-medium border-r border-blue-400 text-center">Receipt Date</th>
                                        <th className="px-4 py-3 font-medium border-r border-blue-400 text-center">Receipt No</th>
                                        <th className="px-4 py-3 font-medium border-r border-blue-400 text-center">Receipt Type</th>
                                        <th className="px-4 py-3 font-medium border-r border-blue-400 text-center">Particular</th>
                                        <th className="px-4 py-3 font-medium text-center">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerData.receipts.length > 0 ? ledgerData.receipts.map((receipt, index) => (
                                        <tr key={receipt._id} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50'} border-b border-white`}>
                                            <td className="px-4 py-2 text-center border-r border-white">{index + 1}</td>
                                            <td className="px-4 py-2 text-center border-r border-white">{moment(receipt.date).format('DD-MM-YYYY')}</td>
                                            <td className="px-4 py-2 text-center border-r border-white font-semibold">{receipt.receiptNo}</td>
                                            <td className="px-4 py-2 text-center border-r border-white">{receipt.paymentMode || 'Cash'}</td>
                                            <td className="px-4 py-2 text-center border-r border-white capitalize">{receipt.remarks || 'Fees Payment'}</td>
                                            <td className="px-4 py-2 text-center font-medium">{receipt.amountPaid}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="py-4 text-center text-gray-400 bg-gray-50 italic">No payment history found.</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white border-t border-gray-300">
                                        <td colSpan="5" className="px-4 py-2 text-right font-bold text-gray-600">Total Received Amount ::</td>
                                        <td className="px-4 py-2 text-center font-bold text-gray-800 border-b border-gray-300">{ledgerData.summary.totalPaid.toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-white">
                                        <td colSpan="5" className="px-4 py-2 text-right font-bold text-gray-600">Total Course Fees :</td>
                                        <td className="px-4 py-2 text-center font-bold text-gray-800 border-b border-gray-300">{ledgerData.summary.totalCourseFees.toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-white">
                                        <td colSpan="5" className="px-4 py-2 text-right font-bold text-blue-500">Due Amount :</td>
                                        <td className="px-4 py-2 text-center font-bold text-blue-500">{ledgerData.summary.dueAmount.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default LedgerReport;
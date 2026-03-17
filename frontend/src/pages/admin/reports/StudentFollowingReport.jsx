import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInquiries, resetTransaction } from '../../../features/transaction/transactionSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { Search, Printer, FileText, RefreshCw, PhoneCall } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';

const StudentFollowingReport = () => {
    const dispatch = useDispatch();
    const { inquiries, isLoading } = useSelector((state) => state.transaction);
    const { branches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    // Filter State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        branchId: '',
        source: 'DSR' //Default to DSR as per request
    });

    const [appliedFilters, setAppliedFilters] = useState(filters);
    const componentRef = useRef(null);

    // Fetch Initial Data
    useEffect(() => {
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
    }, [dispatch, user]);

    // Fetch Report Data
    useEffect(() => {
        dispatch(fetchInquiries(appliedFilters));
        return () => {
            dispatch(resetTransaction());
        }
    }, [dispatch, appliedFilters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = () => {
        setAppliedFilters({ ...filters });
    };

    const handleReset = () => {
        const initial = {
            startDate: '',
            endDate: new Date().toISOString().split('T')[0],
            branchId: '',
            source: 'DSR'
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Following_Report_${moment().format('YYYY-MM-DD')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Following_Report_${moment().format('YYYY-MM-DD')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    // Helper to get branch details for header
    const getBranchDetails = () => {
        if (appliedFilters.branchId && branches) {
            const branch = branches.find(b => b._id === appliedFilters.branchId);
            if (branch) return branch;
        }

        if (user?.role === 'Super Admin') {
            return {
                name: "Main Branch",
                address: "Smart Institute",
                phone: "96017-49300",
                mobile: "98988-30409",
                email: "smartinstitutes@gmail.com"
            };
        }

        // Use logged-in user's branch details if available
        if (user && user.branchDetails && user.branchDetails.address) {
            return user.branchDetails;
        }

        // Default / Fallback: User's branch if stored in user object, or hardcoded Main
        // Assuming current user context has branchId or we fallback to main branch details

        // If logged in user is not super admin, they might belong to a specific branch.
        // For now, using the hardcoded default from StudentWiseOutstanding as fallback
        return {
            name: "Bhestan Branch",
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
            phone: "96017-49300",
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com"
        };
    };

    const branchInfo = getBranchDetails();

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary" /> Student Following Report (DSR)
            </h1>

            {/* --- Filter Section (Hidden in Print) --- */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">From Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">To Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="text-sm font-semibold text-gray-600 mb-1 block">Branch</label>
                            <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                                <option value="">All Branches</option>
                                {branches && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        {/* Placeholder for alignment if needed or extra filter */}
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={handleReset} className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300 font-medium transition flex items-center gap-1">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition flex items-center gap-2">
                        {isLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                    </button>
                </div>
            </div>

            {/* --- Report Toolbar --- */}
            {/* <div className="bg-white rounded-t-lg shadow border border-b-0 border-gray-200 p-3 flex justify-end print:hidden">
                 <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium">
                    <Printer size={18}/> Print Report
                </button>
            </div> */}

            {/* --- Printable Area --- */}
            <div ref={componentRef} className="bg-white rounded-b-lg shadow border border-gray-200 p-8 min-h-[10in] print:shadow-none print:border-none print:p-0 print:w-full">

                {/* Header (Dynamic) */}
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

                {/* Report Title */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-blue-500 uppercase tracking-wide inline-block border-b border-blue-200 pb-1">
                        Student Following Report (DSR)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Report Date: {moment().format('DD-MM-YYYY')}
                    </p>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-2 border font-semibold w-12 text-center align-middle">Sr</th>
                            <th className="p-2 border font-semibold align-middle w-24 text-center">Date</th>
                            <th className="p-2 border font-semibold align-middle text-center w-1/5">Student Name</th>
                            <th className="p-2 border font-semibold align-middle text-center w-1/4">Contact</th>
                            <th className="p-2 border font-semibold align-middle text-center w-1/4">Address</th>
                            <th className="p-2 border font-semibold align-middle text-center w-24">Join Status</th>
                            <th className="p-2 border font-semibold align-middle text-center w-20">Followup Times</th>
                            <th className="p-2 border font-semibold align-middle text-center w-24">Last Followup Date</th>
                            <th className="p-2 border font-semibold align-middle text-center">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries && inquiries.length > 0 ? inquiries.map((item, index) => (
                            <tr key={item._id} className="text-center hover:bg-gray-50 align-middle border-b border-gray-100">
                                <td className="p-2 border text-gray-700">{index + 1}</td>
                                <td className="p-2 border whitespace-nowrap text-gray-700">
                                    {moment(item.inquiryDate).format('DD-MM-YYYY')}
                                </td>
                                <td className="p-2 border font-medium text-gray-900 capitalize">
                                    {item.firstName} {item.lastName}
                                </td>

                                {/* Contact Column with G/H/S Split */}
                                <td className="p-0 border align-top">
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-8 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">G</div>
                                        <div className="p-1 flex-1 text-blue-600 font-medium text-left px-2 flex items-center justify-start">
                                            {item.contactParent || '-'}
                                        </div>
                                    </div>
                                    <div className="flex border-b border-gray-200 last:border-b-0">
                                        <div className="w-8 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                        <div className="p-1 flex-1 text-blue-600 font-medium text-left px-2 flex items-center justify-start">
                                            {item.contactHome || '-'}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-8 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                        <div className="p-1 flex-1 text-blue-600 font-medium text-left px-2 flex items-center justify-start">
                                            {item.contactStudent || '-'}
                                        </div>
                                    </div>
                                </td>

                                <td className="p-2 border text-left text-gray-700">
                                    {item.address || `${item.city || ''} ${item.state || ''}`}
                                </td>

                                <td className="p-2 border">
                                    <span className="text-gray-700 font-medium">{item.status || 'Open'}</span>
                                </td>

                                <td className="p-2 border text-gray-700">
                                    {/* Mocking Follow Up Count if not available from backend */}
                                    {item.followUpCount || 0}
                                </td>

                                <td className="p-2 border whitespace-nowrap text-gray-700">
                                    {item.followUpDate ? moment(item.followUpDate).format('DD-MM-YYYY') : ''}
                                </td>

                                <td className="p-2 border text-left text-gray-600">
                                    {item.remarks || ''}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="9" className="p-4 text-center text-gray-500 italic border">
                                    No records found matching criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentFollowingReport;

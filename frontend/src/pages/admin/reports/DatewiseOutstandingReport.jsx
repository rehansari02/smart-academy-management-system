import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, resetStatus } from '../../../features/student/studentSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { Search, Printer, FileText, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';

const DatewiseOutstandingReport = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { branches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    // Filter State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        branchId: '',
        isRegistered: 'true' // Only show registered students typically
    });

    const [appliedFilters, setAppliedFilters] = useState(filters);
    const componentRef = useRef(null);

    // Fetch Initial Data (Branches)
    useEffect(() => {
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
    }, [dispatch, user]);

    // Fetch Report Data
    useEffect(() => {
        // Only fetch if date range is set (optional, but good practice for reports)
        // For now, fetch on load or filter change similar to other reports
        dispatch(fetchStudents({ ...appliedFilters, pageSize: 1000 })); // Fetch larger page size for report

        return () => {
            dispatch(resetStatus());
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
            isRegistered: 'true'
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Datewise_Outstanding_Report_${moment().format('YYYY-MM-DD')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Datewise_Outstanding_Report_${moment().format('YYYY-MM-DD')}`,
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

        // Fallback to Main / Default
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
                <FileText className="text-primary" /> Datewise OutStanding For Students
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

            {/* --- Toolbar --- */}
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
                        Datewise OutStanding For Students
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Date: {moment().format('DD-MMMM-YYYY')}
                    </p>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th rowSpan="2" className="p-2 border font-semibold w-12 text-center align-middle">Sr</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle w-24 text-center">Reg. No.</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle text-center">Application Date</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle text-center">Student Name</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle text-center">Course Name</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle text-center">Join Status</th>
                            <th colSpan="3" className="p-2 border font-semibold align-middle text-center">Registration Status</th>
                            <th rowSpan="2" className="p-2 border font-semibold align-middle text-center">Remarks</th>
                        </tr>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-2 border font-semibold text-center">Adm. Fees</th>
                            <th className="p-2 border font-semibold text-center">Rec. Fees</th>
                            <th className="p-2 border font-semibold text-center">Reg. Fees</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students && students.length > 0 ? students.map((std, index) => (
                            <tr key={std._id} className="text-center hover:bg-gray-50 align-middle border-b border-gray-100">
                                <td className="p-2 border text-gray-700">{index + 1}</td>
                                <td className="p-2 border whitespace-nowrap text-gray-700">
                                    {std.regNo || '-'}
                                </td>
                                <td className="p-2 border whitespace-nowrap text-gray-700">
                                    {std.admissionDate ? moment(std.admissionDate).format('DD-MM-YYYY') : '-'}
                                </td>
                                <td className="p-2 border font-medium text-gray-900 capitalize">
                                    {std.firstName} {std.middleName ? std.middleName + ' ' : ''}{std.lastName}
                                </td>
                                <td className="p-2 border text-gray-700">
                                    {std.course?.shortName || std.course?.name || '-'}
                                </td>

                                <td className="p-2 border">
                                    {/* Mocking Join Status as Complete if Registered */}
                                    <span className="text-gray-700">{std.isRegistered ? 'Complete' : 'Pending'}</span>
                                </td>

                                {/* Fees Columns */}
                                <td className="p-2 border text-gray-700">
                                    {std.admissionFeeAmount || std.course?.admissionFees || 0}
                                </td>
                                <td className="p-2 border text-gray-700">
                                    {/* Received = Total - Pending */}
                                    {(std.totalFees || 0) - (std.pendingFees || 0)}
                                </td>
                                <td className="p-2 border text-gray-700">
                                    {std.totalFees || 0}
                                </td>

                                <td className="p-2 border text-left text-gray-600">
                                    {std.remarks || ''}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="10" className="p-4 text-center text-gray-500 italic border">
                                    No students found matching criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DatewiseOutstandingReport;

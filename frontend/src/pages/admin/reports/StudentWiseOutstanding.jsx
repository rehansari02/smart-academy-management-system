import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchCourses, fetchBatches, fetchBranches } from '../../../features/master/masterSlice';
import axios from 'axios';
import { Search, Printer, FileText, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';

const API_URL = import.meta.env.VITE_API_URL;

const StudentWiseOutstanding = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    const { courses, branches } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    // Filter State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        courseFilter: '',
        batch: '',
        branchId: '',
        pageNumber: 1,
        pageSize: 100 // Default to showing more for report
    });

    const [appliedFilters, setAppliedFilters] = useState(filters);
    const componentRef = useRef(null);
    // Payment summary per student (outstandingAmount, dueAmount) from backend - same logic as FeeCollection
    const [paymentSummaryMap, setPaymentSummaryMap] = useState({});
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        dispatch(fetchCourses());
        dispatch(fetchBatches());
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
    }, [dispatch, user]);

    // Fetch Report Data
    useEffect(() => {
        dispatch(fetchStudents(appliedFilters));
    }, [dispatch, appliedFilters]);

    // Fetch payment summary (outstanding + due) for each student - same backend logic as FeeCollection
    useEffect(() => {
        if (!students || students.length === 0) {
            setPaymentSummaryMap({});
            return;
        }
        let cancelled = false;
        setSummaryLoading(true);
        Promise.all(
            students.map((s) =>
                axios
                    .get(`${API_URL}/transaction/student/${s._id}/payment-summary`, { withCredentials: true })
                    .then((res) => ({ id: s._id, ...res.data }))
                    .catch(() => ({ id: s._id, outstandingAmount: 0, dueAmount: 0 }))
            )
        ).then((results) => {
            if (cancelled) return;
            const map = {};
            results.forEach((r) => {
                map[r.id] = { outstandingAmount: r.outstandingAmount ?? 0, dueAmount: r.dueAmount ?? 0 };
            });
            setPaymentSummaryMap(map);
            setSummaryLoading(false);
        });
        return () => { cancelled = true; };
    }, [students]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = () => {
        setAppliedFilters({ ...filters, pageNumber: 1 });
    };

    const handleReset = () => {
        const initial = {
            startDate: '',
            endDate: new Date().toISOString().split('T')[0],
            courseFilter: '',
            batch: '',
            branchId: '',
            pageNumber: 1,
            pageSize: 100
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Outstanding_Report_${moment().format('YYYY-MM-DD')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Outstanding_Report_${moment().format('YYYY-MM-DD')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    // Helper to get branch details for header
    const getBranchDetails = () => {
        if (filters.branchId && branches) {
            const branch = branches.find(b => b._id === filters.branchId);
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

        // Default / Fallback (e.g. Logged in user's branch or Main)
        return {
            name: "Bhestan Branch",
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
            phone: "96017-49300",
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com"
        };
    };

    const branchInfo = getBranchDetails();

    // Format amount same as FeeCollection (toLocaleString for display)
    const formatAmount = (value) => {
        if (value == null || value === '') return '-';
        const num = Number(value);
        if (isNaN(num)) return '-';
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const sortedStudents = students && students.length > 0
        ? [...students].sort((a, b) => {
            const dateA = a.admissionDate ? new Date(a.admissionDate).getTime() : 0;
            const dateB = b.admissionDate ? new Date(b.admissionDate).getTime() : 0;
            return dateA - dateB;
        })
        : [];

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary" /> Student Wise Outstanding
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
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Course</label>
                        <select name="courseFilter" value={filters.courseFilter} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">All Courses</option>
                            {courses && courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
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
                        Student Wise Outstanding Report
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Report Date: {moment().format('DD-MM-YYYY')}
                    </p>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                        <tr className="bg-blue-600 text-white">
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 w-10 align-middle">Sr.</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 align-middle">Adm. Date</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 align-middle">Reg. No</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 text-left align-middle">Student Name</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 align-middle">Course</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 align-middle">Mobile No.</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 text-right align-middle">Outstanding</th>
                            <th colSpan="2" className="border border-blue-500 px-2 py-2 text-center">Follow Up</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 align-middle">Rect. Date</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 text-right align-middle">Rect. Amt</th>
                            <th rowSpan="2" className="border border-blue-500 px-2 py-2 text-right align-middle">Due Amt</th>
                        </tr>
                        <tr className="bg-blue-600 text-white">
                            <th className="border border-blue-500 px-2 py-1 text-center text-[10px] w-16">Date</th>
                            <th className="border border-blue-500 px-2 py-1 text-center text-[10px] w-16">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStudents.length > 0 ? sortedStudents.map((s, index) => {
                            const summary = paymentSummaryMap[s._id];
                            const outstandingAmount = summary?.outstandingAmount ?? 0;
                            const dueAmount = summary?.dueAmount ?? 0;
                            return (
                                <tr key={s._id} className="text-center hover:bg-gray-50">
                                    <td className="border border-gray-300 px-2 py-1.5">{index + 1}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{moment(s.admissionDate).format('DD-MM-YYYY')}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 font-semibold text-blue-800">{s.regNo || '-'}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-left font-medium uppercase">
                                        {s.firstName} {s.middleName} {s.lastName}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1.5">{s.course?.shortName || s.course?.name || '-'}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-center">{s.mobileParent || '-'}</td>

                                    {/* Outstanding Amount (same logic as FeeCollection - reg + upcoming EMI or reg only) */}
                                    <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-red-600">
                                        {summaryLoading ? '...' : (outstandingAmount > 0 ? formatAmount(outstandingAmount) : '-')}
                                    </td>

                                    {/* Follow Up Columns */}
                                    <td className="border border-gray-300 px-2 py-1.5 text-gray-400"></td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-gray-400"></td>

                                    <td className="border border-gray-300 px-2 py-1.5 text-gray-500">
                                        -
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-green-600">
                                        -
                                    </td>
                                    {/* Due Amount (total balance - same as FeeCollection) */}
                                    <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-blue-600">
                                        {summaryLoading ? '...' : (dueAmount > 0 ? formatAmount(dueAmount) : '-')}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan="12" className="border border-gray-300 px-4 py-8 text-center text-gray-500 italic">
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

export default StudentWiseOutstanding;

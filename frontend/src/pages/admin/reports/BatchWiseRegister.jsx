import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import { fetchStudents, resetStatus } from '../../../features/student/studentSlice';
import { fetchBatches, fetchBranches, fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { Printer, FileText, Search, Loader2, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const BatchWiseRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { students, isLoading: studentsLoading } = useSelector((state) => state.students);
    const { batches, branches, courses, isLoading: batchesLoading } = useSelector((state) => state.master);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: moment().format('YYYY-MM-DD'),
        courseFilter: '',
        branchId: user?.branchId || '',
        studentName: '',
        batch: 'All',
        reference: '',
        isRegistered: 'true'
    });

    const [showReport, setShowReport] = useState(true);

    const [selectedBatch, setSelectedBatch] = useState('All');
    const [groupedData, setGroupedData] = useState([]);
    const [summaryData, setSummaryData] = useState([]);

    useEffect(() => {
        dispatch(fetchBatches());
        dispatch(fetchCourses());
        dispatch(fetchEmployees({ pageSize: 1000 }));
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        // Initial search to show all data
        dispatch(fetchStudents({ 
            ...filters,
            isActive: true,
            pageSize: 3000
        }));
    }, [dispatch, user]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleStudentSelect = (id, student) => {
        setFilters(prev => ({ ...prev, studentName: student ? `${student.firstName} ${student.lastName}` : '' }));
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: moment().format('YYYY-MM-DD'),
            courseFilter: '',
            branchId: user?.branchId || '',
            studentName: '',
            batch: 'All',
            reference: '',
            isRegistered: 'true'
        });
        setShowReport(false);
    };

    const handleSearch = () => {
        dispatch(fetchStudents({ 
            ...filters,
            batch: filters.batch === 'All' ? undefined : filters.batch,
            pageSize: 3000
        }));
        setShowReport(true);
    };

    useEffect(() => {
        if (students && students.length > 0) {
            // Group by batch
            const groups = {};
            students.forEach(student => {
                const bName = student.batch || 'Unassigned';
                if (!groups[bName]) groups[bName] = [];
                groups[bName].push(student);
            });

            // Sort groups
            const sortedGroups = {};
            Object.keys(groups).sort((a, b) => {
                if (a.toLowerCase().includes('general')) return 1;
                if (b.toLowerCase().includes('general')) return -1;
                return a.localeCompare(b);
            }).forEach(key => {
                sortedGroups[key] = groups[key];
            });

            setGroupedData(sortedGroups);

            // Calculate summary
            const summary = Object.keys(groups).map(batchName => ({
                name: batchName,
                count: groups[batchName].length
            })).sort((a, b) => a.name.localeCompare(b.name));
            setSummaryData(summary);
        } else {
            setGroupedData({});
            setSummaryData([]);
        }
    }, [students]);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: 'Batch_Wise_Register_Report',
    });

    const getBatchTime = (batchName) => {
        const batchObj = batches?.find(b => b.name === batchName);
        if (batchObj) {
            return `${batchObj.startTime} to ${batchObj.endTime}`;
        }
        return batchName;
    };

    const getBranchInfo = () => {
        let branchId = user?.branchId;

        if (user?.role === 'Super Admin') {
            return {
                name: "Main Branch",
                address: "Smart Institute",
                phone: "96017-49300",
                mobile: "98988-30409",
                email: "smartinstitutes@gmail.com"
            };
        }

        if (user && user.branchDetails && user.branchDetails.address) {
            return user.branchDetails;
        }

        if (branchId) {
             if (branches && branches.length > 0) {
                 const found = branches.find(b => b._id === branchId || b._id === branchId?._id);
                 if (found) return found;
             }
        }

         return {
            name: user?.branchName || "Main Branch", 
            address: "Smart Institute",
            phone: "96017-49300", 
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com" 
        };
    };

    const headerBranch = getBranchInfo();

    if (studentsLoading || batchesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Generating Report Data...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            {/* Filter Section */}
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
                    <div>
                        <StudentSearch 
                            label="Student Name"
                            placeholder="Search by name..."
                            onSelect={handleStudentSelect}
                            displayField="name"
                            additionalFilters={{ isRegistered: 'true', branchId: filters.branchId }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Batch</label>
                        <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="All">All Batches</option>
                            {batches && batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Reference By (Employee)</label>
                        <select name="reference" value={filters.reference} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                            <option value="">All Employees</option>
                            {employees && employees.map(emp => (
                                <option key={emp._id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={handleReset} className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300 font-medium transition flex items-center gap-1">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition flex items-center gap-2">
                        {studentsLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                    </button>
                </div>
            </div>

            {/* {showReport && ( */}
                <div ref={componentRef} className="print-container bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-100">
                {/* Report Header */}
                <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-8">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Institute Logo" className="h-20 w-auto object-contain" />
                    </div>
                    <div className="text-right text-xs space-y-1">
                        <h2 className="text-xl font-bold text-blue-600 mb-1">{headerBranch.name}</h2>
                        <div className="text-gray-600 max-w-xs ml-auto font-medium">
                            {headerBranch.address}
                        </div>
                        <p className="font-bold text-blue-800">
                             Ph. No. : {headerBranch.phone}, Mob. No. : {headerBranch.mobile}
                        </p>
                        <p className="text-blue-500 underline font-medium">{headerBranch.email}</p>
                        <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">Report Date</span>
                            <span className="text-xs font-black text-gray-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-gray-800 border-b-4 border-gray-800 inline-block px-8 pb-1">BATCH WISE REGISTER</h3>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-10">
                    {Object.keys(groupedData).map((batchName, bIdx) => (
                        <div key={batchName} className="border-2 border-gray-800 rounded-sm overflow-hidden break-inside-avoid mb-6">
                            <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center font-black italic">
                                <span>{bIdx + 1}st: {getBatchTime(batchName)}</span>
                                <span className="bg-white text-gray-800 px-3 py-0.5 rounded text-xs">TOTAL: {groupedData[batchName].length}</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-800 text-gray-800 font-black uppercase">
                                            <th className="p-2 border-r border-gray-300 w-10">Sr</th>
                                            <th className="p-2 border-r border-gray-300 w-24">Reg</th>
                                            <th className="p-2 border-r border-gray-300 text-left">Student Name</th>
                                            <th className="p-2 border-r border-gray-300 w-32">Mobile Numbers</th>
                                            <th className="p-2 text-left">Courses</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedData[batchName].map((student, sIdx) => (
                                            <tr key={student._id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                <td className="p-2 border-r border-gray-300 text-center font-bold">{sIdx + 1}</td>
                                                <td className="p-2 border-r border-gray-300 text-center font-mono font-bold text-blue-800">{student.regNo || '-'}</td>
                                                <td className="p-2 border-r border-gray-300 font-bold text-gray-900 uppercase">
                                                    {student.firstName} {student.middleName} {student.lastName}
                                                </td>
                                                <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[10px]">G</span> <span className="font-semibold">{student.mobileParent || '-'}</span></div>
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-[10px]">H</span> <span className="font-semibold">{student.contactHome || '-'}</span></div>
                                                        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[10px]">S</span> <span className="font-semibold">{student.mobileStudent || '-'}</span></div>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {student.course?.name && (
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-black border border-gray-300">
                                                                {student.course.name}
                                                            </span>
                                                        )}
                                                        {student.batchStartDate && (
                                                            <div className="text-[10px] text-gray-500 font-bold mt-1 w-full">
                                                                D.O.J: {new Date(student.batchStartDate).toLocaleDateString('en-GB')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary Table */}
                <div className="mt-12 break-inside-avoid">
                    <h4 className="text-xl font-black text-gray-800 mb-4 border-l-4 border-primary pl-3">BATCH SUMMARY</h4>
                    <div className="max-w-md">
                        <table className="w-full border-2 border-gray-800 text-sm">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="p-3 text-left font-black uppercase">Batch Name</th>
                                    <th className="p-3 text-center font-black uppercase w-32">Students</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold">
                                {summaryData.map((sum, idx) => (
                                    <tr key={idx} className="border-b border-gray-800 last:border-0 even:bg-gray-50">
                                        <td className="p-3 text-gray-800">{sum.name}</td>
                                        <td className="p-3 text-center text-primary text-lg">{sum.count}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-800 text-white font-black">
                                    <td className="p-3 text-right uppercase tracking-wider">Grand Total</td>
                                    <td className="p-3 text-center text-xl underline decoration-double decoration-primary underline-offset-4">
                                        {summaryData.reduce((acc, curr) => acc + curr.count, 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="mt-20 flex justify-between items-end border-t border-dashed border-gray-300 pt-10 no-print-flex">
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Authorized Signatory</p>
                    </div>
                    <div className="text-center text-[10px] text-gray-400 font-medium">
                        Report generated by {user?.name} on {new Date().toLocaleString()}
                    </div>
                    <div className="text-center">
                        <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-widest">Office Seal</p>
                    </div>
                </div>
            </div>


            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    body { background: white !important; }
                    @page { margin: 1cm; }
                }
                .break-inside-avoid { break-inside: avoid; }
            `}} />
        </div>
    );
};

export default BatchWiseRegister;

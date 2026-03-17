import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBatches, fetchBranches } from '../../../features/master/masterSlice';
import { fetchStudentAttendanceHistory } from '../../../features/transaction/attendanceSlice';
import { fetchStudents } from '../../../features/student/studentSlice';
import { FileText, Printer, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';

const StudentAttendanceReport = () => {
    const dispatch = useDispatch();
    const { batches, branches } = useSelector((state) => state.master);
    const { attendanceList, isLoading: attendanceLoading } = useSelector((state) => state.attendance);
    const { students } = useSelector((state) => state.students);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = useState({
        month: moment().format('YYYY-MM'),
        batch: '',
        studentName: ''
    });

    const [reportData, setReportData] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);
    const componentRef = useRef(null);

    const [showReport, setShowReport] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        dispatch(fetchBatches());
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
    }, [dispatch, user]);

    // Generate Month Days Helper
    const getDaysInMonth = (yearMonth) => {
        const date = moment(yearMonth, 'YYYY-MM');
        const days = date.daysInMonth();
        const daysArray = [];
        for (let i = 1; i <= days; i++) {
            const current = date.clone().date(i);
            daysArray.push({
                date: i,
                fullDate: current.format('YYYY-MM-DD'),
                dayShort: current.format('ddd'), // Sun, Mon
                isSunday: current.day() === 0
            });
        }
        return daysArray;
    };

    const handleSearch = () => {
        if (!filters.month) {
            toast.error('Please select a month');
            return;
        }

        const startDate = moment(filters.month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
        const endDate = moment(filters.month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

        // Fetch Attendance History
        dispatch(fetchStudentAttendanceHistory({
            fromDate: startDate,
            toDate: endDate,
            batch: filters.batch || undefined
        }));

        // Fetch Students
        const studentParams = {
            isActive: true,
            pageSize: 2000
        };

        if (filters.batch) studentParams.batch = filters.batch;
        if (filters.studentName) studentParams.studentName = filters.studentName;

        dispatch(fetchStudents(studentParams));

        setDaysInMonth(getDaysInMonth(filters.month));
        setShowReport(true);
    };

    // Calculate Report Data
    useEffect(() => {
        if (students && attendanceList && daysInMonth.length > 0) {
            const attendanceMap = {};

            attendanceList.forEach(record => {
                const dateKey = moment(record.date).format('YYYY-MM-DD');
                if (!attendanceMap[dateKey]) attendanceMap[dateKey] = {};

                if (record.records) {
                    record.records.forEach(studentRec => {
                        const sid = studentRec.studentId._id || studentRec.studentId;
                        attendanceMap[dateKey][sid] = studentRec.isPresent ? 'P' : 'A';
                    });
                }
            });

            const processedData = students.map(student => {
                let presentCount = 0;
                let absentCount = 0;
                let sundayCount = 0;
                let daysData = {};

                daysInMonth.forEach(day => {
                    if (day.isSunday) {
                        daysData[day.date] = 'S';
                        sundayCount++;
                    } else {
                        const status = attendanceMap[day.fullDate]?.[student._id];
                        if (status) {
                            daysData[day.date] = status;
                            if (status === 'P') presentCount++;
                            else if (status === 'A') absentCount++;
                        } else {
                            daysData[day.date] = '-';
                        }
                    }
                });

                const totalWD = daysInMonth.length - sundayCount;
                const percentage = totalWD > 0 ? ((presentCount / totalWD) * 100).toFixed(2) : 0;

                return {
                    ...student,
                    daysData,
                    stats: {
                        present: presentCount,
                        absent: absentCount,
                        wd: totalWD,
                        sundays: sundayCount,
                        festival: 0,
                        rank: percentage
                    }
                };
            });

            processedData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

            setReportData(processedData);
        }
    }, [students, attendanceList, daysInMonth]);

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Student_Attendance_Report_${moment().format('DD-MM-YYYY')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Student_Attendance_Report_${moment().format('DD-MM-YYYY')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    const getBranchDetails = () => {
        let branchData = null;

        // 1. Try to find branch from selected Batch
        if (filters.batch) {
            const selectedBatch = batches.find(b => b.name === filters.batch);
            if (selectedBatch?.branchId) {
                // Check if branchId is populated or is just ID
                branchData = typeof selectedBatch.branchId === 'object' ? selectedBatch.branchId : branches.find(b => b._id === selectedBatch.branchId);
            }
        }

        // 2. If no batch selected (or batch has no branch), try to infer from the students being displayed
        if (!branchData && reportData.length > 0) {
            const firstStudent = reportData[0];
            if (firstStudent.branchId) {
                branchData = typeof firstStudent.branchId === 'object' ? firstStudent.branchId : branches.find(b => b._id === firstStudent.branchId);
            } else if (firstStudent.branchName) {
                // If only name available, try to find in branches list, otherwise use just the name
                branchData = branches.find(b => b.name === firstStudent.branchName) || { name: firstStudent.branchName };
            }
        }

        // 3. Fallback to Main if still not found
        if (branchData) {
            return {
                name: branchData.name,
                address: branchData.address || `${branchData.city || ''}, ${branchData.state?.name || ''}`,
                phone: branchData.phone || branchData.mobile || "96017-49300",
                mobile: branchData.mobile || "",
                email: branchData.email || "smartinstitutes@gmail.com"
            };
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

        if (user && user.branchDetails && user.branchDetails.address) {
            return user.branchDetails;
        }

        return {
            name: "Bhestan Branch",
            address: "309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)",
            phone: "96017-49300",
            mobile: "98988-30409",
            email: "smartinstitutes@gmail.com"
        };
    };
    const branchInfo = getBranchDetails();
    const monthLabel = moment(filters.month, 'YYYY-MM').format('MMM - YYYY');

    return (
        <div className="container mx-auto p-4 max-w-[1400px]">
            {/* Print Styles for Portrait */}
            <style type="text/css" media="print">
                {`
                    @page { size: portrait; margin: 5mm; }
                    body { -webkit-print-color-adjust: exact; }
                `}
            </style>

            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 print:hidden">
                <FileText className="text-primary" /> Student Attendance Report
            </h1>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Month *</label>
                        <input
                            type="month"
                            className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none"
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Batch (Optional)</label>
                        <select
                            className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none"
                            value={filters.batch}
                            onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                        >
                            <option value="">All Batches</option>
                            {batches.map(b => (
                                <option key={b._id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Student Name</label>
                        <input
                            type="text"
                            placeholder="Detailed Search..."
                            className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none"
                            value={filters.studentName}
                            onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-white mb-1">Action</label>
                        <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition flex items-center gap-2 w-full justify-center">
                            {attendanceLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            {/* {showReport && (
             <div className="bg-white rounded-t-lg shadow border border-b-0 border-gray-200 p-3 flex justify-end print:hidden">
                  <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-medium">
                     <Printer size={18}/> Print Report
                 </button>
             </div>
             )} */}

            {/* Printable Area - Optimized for Portrait A4 (Small print font, Normal screen font) */}
            {showReport && (
                <div className="overflow-auto bg-gray-50 p-4 print:p-0">
                    <div
                        ref={componentRef}
                        className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 print:w-full"
                        style={{ minHeight: '297mm' }}
                    >
                        {/* Header (Standardized) */}
                        <div className="flex justify-between items-start mb-2 border-b-2 border-primary pb-2">
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

                        {/* Report Title, Month & Legend */}
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-red-600 uppercase tracking-wide">Daily Attendance Report of Student</h3>
                            <div className="flex justify-center items-center gap-6 mt-2">
                                <span className="text-sm font-bold text-gray-800 border p-1 rounded bg-gray-50">Month: {monthLabel}</span>
                                <div className="flex gap-3 text-[10px] font-bold text-gray-600 border p-1 rounded bg-gray-50">
                                    <span className="text-green-700">P - PRESENT</span>
                                    <span className="text-red-600">A - ABSENT</span>
                                    <span className="text-red-800">S - SUNDAYS</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="w-full">
                            <table className="w-full border-collapse border border-gray-800 text-xs md:text-sm print:text-[9px]">
                                <thead>
                                    <tr className="text-center text-black">
                                        <th className="border border-gray-800 bg-yellow-300 p-1 print:p-0 w-auto print:w-6" rowSpan="2">S.N</th>
                                        <th className="border border-gray-800 bg-yellow-300 p-1 print:p-0 w-auto print:w-12" rowSpan="2">Reg.No</th>
                                        <th className="border border-gray-800 bg-yellow-300 p-1 print:p-0 text-left px-2 print:px-1 w-auto print:w-32" rowSpan="2">Student Name</th>

                                        {/* Days Header */}
                                        <th colSpan={daysInMonth.length} className="border border-gray-800 bg-yellow-300 p-1 print:p-0 h-4">

                                        </th>

                                        {/* Summary headers - abbreviated */}
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-5" rowSpan="2" title="Total Present">P</th>
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-5" rowSpan="2" title="Total Absent">A</th>
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-5" rowSpan="2" title="Working Days">WD</th>
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-5" rowSpan="2" title="Sundays">SUN</th>
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-5" rowSpan="2" title="Festival">FEST</th>
                                        <th className="border border-gray-800 bg-cyan-300 p-1 print:p-0 w-auto print:w-8" rowSpan="2" title="Rank %">%</th>
                                    </tr>
                                    <tr className="text-center text-black">
                                        {daysInMonth.map(day => (
                                            <th key={day.date} className="border border-gray-800 bg-yellow-300 p-0 md:p-1 print:p-0 w-auto print:w-4 h-6 md:h-8 print:h-4 text-[10px] md:text-xs print:text-[8px]">
                                                {day.date}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((std, idx) => (
                                        <tr key={std._id} className="text-center h-8 print:h-6 hover:bg-gray-50">
                                            <td className="border border-gray-300 text-gray-700 p-1 print:p-0">{idx + 1}</td>
                                            <td className="border border-gray-300 font-bold text-xs md:text-sm print:text-[8px] break-words leading-tight p-1 print:p-0">
                                                {std.regNo || '-'}
                                            </td>
                                            <td className="border border-gray-300 text-left px-2 print:px-1 font-bold text-xs md:text-sm print:text-[8px] whitespace-normal leading-tight w-auto print:max-w-[80px] overflow-hidden">
                                                {std.firstName} {std.middleName ? std.middleName + ' ' : ''}{std.lastName}
                                            </td>
                                            {daysInMonth.map(day => {
                                                const status = std.daysData[day.date];
                                                let cellClass = "border border-gray-200 p-0 text-[10px] md:text-sm print:text-[8px] ";
                                                if (status === 'S') cellClass += "bg-red-700 text-white font-bold";
                                                else if (status === 'P') cellClass += "text-green-600 font-bold";
                                                else if (status === 'A') cellClass += "text-red-600 font-bold";
                                                else cellClass += "text-gray-300";

                                                return (
                                                    <td key={day.date} className={cellClass}>
                                                        {status === '-' ? '-' : status}
                                                    </td>
                                                );
                                            })}
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.present}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.absent}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.wd}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.sundays}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.festival}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{std.stats.rank}</td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr>
                                            <td colSpan={daysInMonth.length + 9} className="p-4 text-center text-gray-500 border border-gray-300">
                                                No students found.
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
    );
};

export default StudentAttendanceReport;

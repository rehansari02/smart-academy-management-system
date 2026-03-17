import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches } from '../../../features/master/masterSlice';
import { fetchEmployeeAttendanceHistory } from '../../../features/transaction/attendanceSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { FileText, Printer, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import logo from '../../../assets/logo2.png';
import { toast } from 'react-toastify';
import EmployeeSearch from '../../../components/EmployeeSearch';

const EmployeeAttendanceReport = () => {
    const dispatch = useDispatch();
    const { branches } = useSelector((state) => state.master);
    const { attendanceList, isLoading: attendanceLoading } = useSelector((state) => state.attendance);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = useState({
        month: moment().format('YYYY-MM'),
        employeeId: ''
    });

    const [reportData, setReportData] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const componentRef = useRef(null);

    // Initial Data Fetch
    useEffect(() => {
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
        dispatch(fetchEmployeeAttendanceHistory({
            fromDate: startDate,
            toDate: endDate,
            // If specific employee selected, we could filter on backend if supported, 
            // but attendanceSlice usually fetches based on range. 
            // If backend supports employeeId param:
            employeeId: filters.employeeId || undefined
        }));

        // Fetch Employees
        const employeeParams = {
            isActive: true,
            // If searching specific employee, we might want to fetch just that one or filter the list differently
            // For now, let's fetch all or filter by search if needed.
            // If employeeId is set, let's try to fetch just that one, BUT fetchEmployees takes 'searchValue'/'searchBy'.
            // However, if we just fetch all (or large page size) and then filter in memory, that works too for typical employee counts.
            pageSize: 2000
        };

        // Note: fetchEmployees expects 'searchValue' if we want to search. 
        // But here we have ID. If we selected from dropdown, we know which one.
        // It's safer to fetch all active employees to map the attendance history to them properly, 
        // unless the list is huge. If specific employee is selected, we filter the displayed list later.

        dispatch(fetchEmployees(employeeParams));

        setDaysInMonth(getDaysInMonth(filters.month));
        setShowReport(true);
    };

    // Calculate Report Data
    useEffect(() => {
        if (employees && attendanceList && daysInMonth.length > 0) {
            const attendanceMap = {};

            attendanceList.forEach(record => {
                const dateKey = moment(record.date).format('YYYY-MM-DD');
                if (!attendanceMap[dateKey]) attendanceMap[dateKey] = {};

                // Employee records structure: { employeeId: { ... }, isPresent: bool }
                // Need to verify backend response structure for employee/history.
                // Assuming it matches student structure: record.records = [{ employeeId: "...", isPresent: ... }]
                if (record.records) {
                    record.records.forEach(empRec => {
                        // Safe check for employeeId
                        const eid = empRec.employeeId?._id || empRec.employeeId;
                        if (eid) {
                            attendanceMap[dateKey][eid] = empRec.isPresent ? 'P' : 'A';
                        }
                    });
                }
            });

            // Filter employees if specific one selected
            const targetEmployees = filters.employeeId
                ? employees.filter(e => e._id === filters.employeeId)
                : employees;

            const processedData = targetEmployees.map(emp => {
                let presentCount = 0;
                let absentCount = 0;
                let sundayCount = 0;
                let daysData = {};

                daysInMonth.forEach(day => {
                    if (day.isSunday) {
                        daysData[day.date] = 'S';
                        sundayCount++;
                    } else {
                        const status = attendanceMap[day.fullDate]?.[emp._id];
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
                    ...emp,
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

            processedData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            setReportData(processedData);
        }
    }, [employees, attendanceList, daysInMonth, filters.employeeId]);

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Employee_Attendance_Report_${moment().format('DD-MM-YYYY')}`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Employee_Attendance_Report_${moment().format('DD-MM-YYYY')}`,
        onAfterPrint: () => toast.success("Report Sent to Printer"),
    });

    const getBranchDetails = () => {
        let branchData = null;

        // Try to infer from the employees being displayed
        if (reportData.length > 0) {
            const firstEmp = reportData[0];

            // Prefer finding by ID to get full details from Redux state
            if (firstEmp.branchId) {
                const branchId = typeof firstEmp.branchId === 'object' ? firstEmp.branchId._id : firstEmp.branchId;
                branchData = branches.find(b => b._id === branchId);

                // If not found in redux but present in employee as object, verify if it has address
                if (!branchData && typeof firstEmp.branchId === 'object' && firstEmp.branchId.address) {
                    branchData = firstEmp.branchId;
                }
            }

            // Fallback to name match if ID lookup failed
            if (!branchData && firstEmp.branchName) {
                const foundBranch = branches.find(b => b.name === firstEmp.branchName);
                if (foundBranch) {
                    branchData = foundBranch;
                } else {
                    branchData = { name: firstEmp.branchName };
                }
            }
        }

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
                <FileText className="text-primary" /> Employee Attendance Report
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

                    <div className="md:col-span-2">
                        {/* Employee Search Dropdown */}
                        <EmployeeSearch
                            label="Employee Name"
                            placeholder="Search employee by name..."
                            onSelect={(id) => setFilters({ ...filters, employeeId: id })}
                            className="w-full"
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

            {/* Printable Area */}
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
                            <h3 className="text-xl font-bold text-red-600 uppercase tracking-wide">Daily Attendance Report of Employee</h3>
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
                                        <th className="border border-gray-800 bg-yellow-300 p-1 print:p-0 w-auto print:w-12" rowSpan="2">Mobile</th>
                                        <th className="border border-gray-800 bg-yellow-300 p-1 print:p-0 text-left px-2 print:px-1 w-auto print:w-32" rowSpan="2">Employee Name</th>

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
                                    {reportData.map((emp, idx) => (
                                        <tr key={emp._id} className="text-center h-8 print:h-6 hover:bg-gray-50">
                                            <td className="border border-gray-300 text-gray-700 p-1 print:p-0">{idx + 1}</td>
                                            <td className="border border-gray-300 font-bold text-xs md:text-sm print:text-[8px] break-words leading-tight p-1 print:p-0">
                                                {emp.mobile || '-'}
                                            </td>
                                            <td className="border border-gray-300 text-left px-2 print:px-1 font-bold text-xs md:text-sm print:text-[8px] whitespace-normal leading-tight w-auto print:max-w-[80px] overflow-hidden">
                                                {emp.name}
                                            </td>
                                            {daysInMonth.map(day => {
                                                const status = emp.daysData[day.date];
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
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.present}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.absent}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.wd}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.sundays}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.festival}</td>
                                            <td className="border border-gray-300 font-bold text-black p-1 print:p-0">{emp.stats.rank}</td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr>
                                            <td colSpan={daysInMonth.length + 9} className="p-4 text-center text-gray-500 border border-gray-300">
                                                No employees found.
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

export default EmployeeAttendanceReport;

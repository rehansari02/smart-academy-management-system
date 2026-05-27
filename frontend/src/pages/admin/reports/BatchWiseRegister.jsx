import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBatches, fetchBranches, fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { Printer, Search, Loader2, RefreshCw, Users, CalendarDays, Clock3, Building2 } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import logo from '../../../assets/logo2.png';

const BatchWiseRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { students, isLoading: studentsLoading } = useSelector((state) => state.students);
    const { batches, branches, courses, isLoading: batchesLoading } = useSelector((state) => state.master);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);
    const userBranchId = typeof user?.branchId === 'object' ? user?.branchId?._id : user?.branchId;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: moment().format('YYYY-MM-DD'),
        courseFilter: '',
        branchId: userBranchId || '',
        studentName: '',
        batch: 'All',
        reference: '',
        isRegistered: 'all'
    });

    const [showReport, setShowReport] = useState(true);

    const groupedData = useMemo(() => {
        if (!students?.length) return {};

        const groups = {};
        students.forEach(student => {
            const bName = student.batch || 'Unassigned';
            if (!groups[bName]) groups[bName] = [];
            groups[bName].push(student);
        });

        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => {
            if (a.toLowerCase().includes('general')) return 1;
            if (b.toLowerCase().includes('general')) return -1;
            return a.localeCompare(b);
        }).forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [students]);

    const getReportParams = useCallback((sourceFilters) => {
        const params = {
            isActive: true,
            pageSize: 3000,
            sortBy: 'batch'
        };

        if (sourceFilters.isRegistered && sourceFilters.isRegistered !== 'all') {
            params.isRegistered = sourceFilters.isRegistered;
        }
        if (sourceFilters.startDate && sourceFilters.endDate) {
            params.startDate = sourceFilters.startDate;
            params.endDate = sourceFilters.endDate;
        }
        if (sourceFilters.courseFilter) params.courseFilter = sourceFilters.courseFilter;
        if (sourceFilters.studentName) params.studentName = sourceFilters.studentName;
        if (sourceFilters.reference) params.reference = sourceFilters.reference;
        if (sourceFilters.batch && sourceFilters.batch !== 'All') params.batch = sourceFilters.batch;

        const normalizedBranchId = typeof sourceFilters.branchId === 'object'
            ? sourceFilters.branchId?._id
            : sourceFilters.branchId;
        if (normalizedBranchId) params.branchId = normalizedBranchId;

        return params;
    }, []);

    useEffect(() => {
        dispatch(fetchBatches());
        dispatch(fetchCourses());
        dispatch(fetchEmployees({ pageSize: 1000 }));
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        // Initial search to show all data
        dispatch(fetchStudents(getReportParams({
            startDate: '',
            endDate: moment().format('YYYY-MM-DD'),
            courseFilter: '',
            branchId: user?.role === 'Super Admin' ? '' : userBranchId || '',
            studentName: '',
            batch: 'All',
            reference: '',
            isRegistered: 'all'
        })));
    }, [dispatch, getReportParams, user?.role, userBranchId]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleStudentSelect = (id, student) => {
        setFilters(prev => ({ ...prev, studentName: student ? `${student.firstName} ${student.lastName}` : '' }));
    };

    const handleReset = () => {
        const resetFilters = {
            startDate: '',
            endDate: moment().format('YYYY-MM-DD'),
            courseFilter: '',
            branchId: userBranchId || '',
            studentName: '',
            batch: 'All',
            reference: '',
            isRegistered: 'all'
        };
        dispatch(fetchStudents(getReportParams(resetFilters)));
        setShowReport(true);
    };

    const handleSearch = () => {
        dispatch(fetchStudents(getReportParams(filters)));
        setShowReport(true);
    };

    const printReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Batch_Wise_Register_Report',
    });

    const handlePrint = () => {
        if (!componentRef.current) return;
        printReport();
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

    const normalizeTimeText = (value = '') => value
        .toString()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, ':')
        .trim();

    const parseStartHour = (startTimeStr) => {
        if (!startTimeStr) return null;
        const cleaned = normalizeTimeText(startTimeStr);
        const timeMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!timeMatch) return null;

        let hour = parseInt(timeMatch[1], 10);
        const meridian = timeMatch[3]?.toLowerCase();
        if (Number.isNaN(hour)) return null;

        if (meridian === 'pm' && hour < 12) hour += 12;
        if (meridian === 'am' && hour === 12) hour = 0;

        return hour;
    };

    const getStudentBatchObject = (student) => {
        if (!student?.batch || !batches?.length) return null;
        const studentBatch = normalizeTimeText(student.batch);

        return batches.find((batchItem) => {
            const batchName = normalizeTimeText(batchItem.name);
            const batchTime = normalizeTimeText(`${batchItem.startTime} to ${batchItem.endTime}`);
            const batchDashTime = normalizeTimeText(`${batchItem.startTime} - ${batchItem.endTime}`);

            return batchName === studentBatch
                || batchTime === studentBatch
                || batchDashTime === studentBatch
                || studentBatch.includes(batchName)
                || studentBatch.includes(normalizeTimeText(batchItem.startTime));
        });
    };

    const standardSlots = [
        { label: '1st', time: '8:00 to 09:00 am', startHour: 8 },
        { label: '2nd', time: '9:00 to 10:00 am', startHour: 9 },
        { label: '3rd', time: '10:00 to 11:00 am', startHour: 10 },
        { label: '4th', time: '11:00 to 12:00 pm', startHour: 11 },
        { label: '5th', time: '12:00 to 01:00 pm', startHour: 12 },
        { label: '6th', time: '01:00 to 02:00 pm', startHour: 13 },
        { label: '7th', time: '02:00 to 03:00 pm', startHour: 14 },
        { label: '8th', time: '03:00 to 04:00 pm', startHour: 15 },
        { label: '9th', time: '04:00 to 05:00 pm', startHour: 16 },
        { label: '10th', time: '05:00 to 06:00 pm', startHour: 17 },
        { label: '11th', time: '06:00 to 07:00 pm', startHour: 18 },
        { label: '12th', time: '07:00 to 08:00 pm', startHour: 19 },
        { label: '13th', time: '08:00 to 09:00 pm', startHour: 20 },
        { label: '14th', time: '09:00 to 10:00 pm', startHour: 21 },
    ];

    const getStudentStartHour = (student) => {
        if (!student?.batch) return null;
        const batchObj = getStudentBatchObject(student);
        return batchObj ? parseStartHour(batchObj.startTime) : parseStartHour(student.batch);
    };

    const getSlotStudents = (slotIndex) => {
        const slot = standardSlots[slotIndex];
        if (!students || !slot) return [];
        
        return students.filter(student => {
            if (!student.batch) return false;

            const startHour = getStudentStartHour(student);
            const isKnownSlot = standardSlots.some(standardSlot => standardSlot.startHour === startHour);
            if (slotIndex === standardSlots.length - 1 && !isKnownSlot) return true;
            
            return startHour === slot.startHour;
        });
    };

    const getHeaderDateString = () => {
        const dateVal = filters.startDate || filters.endDate || new Date();
        return moment(dateVal).format('MMMM - YYYY');
    };

    const totalCount = standardSlots.reduce((acc, _, idx) => acc + getSlotStudents(idx).length, 0);
    const visibleBatchCount = Object.keys(groupedData || {}).length;
    const selectedCourseName = courses?.find(c => c._id === filters.courseFilter)?.name || 'All Courses';
    const selectedBranchName = branches?.find(b => b._id === filters.branchId)?.name || headerBranch.name || 'Current Branch';
    const activeDateLabel = filters.startDate && filters.endDate
        ? `${moment(filters.startDate).format('DD-MMM-YYYY')} to ${moment(filters.endDate).format('DD-MMM-YYYY')}`
        : 'All admission dates';

    const renderBatchTable = (slotIndex) => {
        const slot = standardSlots[slotIndex];
        const slotStudents = getSlotStudents(slotIndex).sort((a, b) => {
            const regA = a.regNo || '';
            const regB = b.regNo || '';
            return regA.localeCompare(regB, undefined, { numeric: true }) || `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`);
        });
        
        const rows = [];
        const rowCount = Math.max(6, slotStudents.length);
        for (let i = 0; i < rowCount; i++) {
            rows.push(slotStudents[i] || null);
        }

        // Determine center header text based on students or slot
        let centerHeaderText = slot.time;
        const hasGeneralBatch = slotStudents.some(s => s.batch?.toLowerCase().includes('general'));
        const hasUnmatchedBatch = slotIndex === standardSlots.length - 1 && slotStudents.some(student => {
            const startHour = getStudentStartHour(student);
            return !standardSlots.some(standardSlot => standardSlot.startHour === startHour);
        });
        if (hasGeneralBatch || hasUnmatchedBatch || (slotIndex >= 12 && slotStudents.length === 0)) {
            centerHeaderText = "GENERAL BATCH";
        }
        
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', fontSize: '7.5px', fontFamily: 'Arial, sans-serif', color: '#000', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ backgroundColor: '#d2543e', color: '#fff', height: '6mm', borderBottom: '1.2px solid #000' }}>
                        <th style={{ width: '8%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>{slot.label}</th>
                        <th style={{ width: '12%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>Reg</th>
                        <th style={{ width: '40%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{centerHeaderText}</th>
                        <th style={{ width: '23%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>MOBILE</th>
                        <th style={{ width: '17%', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>COURSES</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((student, idx) => {
                        const parentMobile = student?.mobileParent || student?.contactParent || '-';
                        const homeMobile = student?.contactHome || '-';
                        const studentMobile = student?.mobileStudent || student?.contactStudent || '-';
                        
                        return (
                            <tr key={idx} style={{ height: '8.8mm', borderBottom: idx < rows.length - 1 ? '1px solid #000' : 'none' }}>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: 0 }}>{idx + 1}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: 0 }}>
                                    {student?.regNo || ''}
                                </td>
                                <td style={{ borderRight: '1px solid #000', paddingLeft: '4px', fontWeight: 'bold', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                    {student ? `${student.firstName} ${student.lastName}`.substring(0, 18) : ''}
                                </td>
                                <td style={{ borderRight: '1px solid #000', padding: 0 }}>
                                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, padding: 0 }}>
                                        <tbody>
                                            <tr style={{ height: '2.9mm' }}>
                                                <td style={{ width: '20%', borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', fontSize: '6px', padding: 0 }}>G</td>
                                                <td style={{ borderBottom: '1px solid #000', paddingLeft: '2px', fontSize: '6.5px', fontWeight: '600', padding: 0, textAlign: 'left' }}>{parentMobile}</td>
                                            </tr>
                                            <tr style={{ height: '2.9mm' }}>
                                                <td style={{ width: '20%', borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 'bold', fontSize: '6px', padding: 0 }}>H</td>
                                                <td style={{ borderBottom: '1px solid #000', paddingLeft: '2px', fontSize: '6.5px', fontWeight: '600', padding: 0, textAlign: 'left' }}>{homeMobile}</td>
                                            </tr>
                                            <tr style={{ height: '2.9mm' }}>
                                                <td style={{ width: '20%', borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold', fontSize: '6px', padding: 0 }}>S</td>
                                                <td style={{ paddingLeft: '2px', fontSize: '6.5px', fontWeight: '600', padding: 0, textAlign: 'left' }}>{studentMobile}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                                <td style={{ paddingLeft: '4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '7px', textAlign: 'left' }}>
                                    {student?.course?.shortName || student?.course?.name || ''}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    if (studentsLoading || batchesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Generating Report Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-7xl">
            <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">General Report</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">Batch Wise Register</h1>
                        <p className="mt-1 text-sm text-slate-500">Filter registered students by branch, course, date, batch, or reference.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users size={14} /> Students</div>
                            <p className="mt-1 text-xl font-bold text-slate-900">{totalCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={14} /> Batches</div>
                            <p className="mt-1 text-xl font-bold text-slate-900">{visibleBatchCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays size={14} /> Date</div>
                            <p className="mt-1 truncate text-sm font-bold text-slate-900">{activeDateLabel}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Building2 size={14} /> Branch</div>
                            <p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedBranchName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">From Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">To Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Course</label>
                        <select name="courseFilter" value={filters.courseFilter} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="">All Courses</option>
                            {courses && courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Branch</label>
                            <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
                            additionalFilters={{
                                ...(filters.isRegistered !== 'all' ? { isRegistered: filters.isRegistered } : {}),
                                branchId: filters.branchId
                            }}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Batch</label>
                        <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="All">All Batches</option>
                            {batches && batches.map(b => <option key={b._id} value={b.name}>{b.name} ({b.startTime} - {b.endTime})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Reference By</label>
                        <select name="reference" value={filters.reference} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="">All Employees</option>
                            {employees && employees.map(emp => (
                                <option key={emp._id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-semibold text-slate-800">{selectedCourseName}</span> students in printable batch format.
                    </p>
                    <div className="flex flex-wrap gap-2">
                    <button onClick={handleReset} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button onClick={handleSearch} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
                        {studentsLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                    </button>
                    <button onClick={handlePrint} disabled={!totalCount} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        <Printer size={18} /> Print Report
                    </button>
                    </div>
                </div>
            </div>

            {showReport && totalCount === 0 && !studentsLoading && (
                <div className="mb-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center print:hidden">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Users size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">No students found for this register</h2>
                    <p className="mt-1 text-sm text-slate-500">Try All Batches, clear the student name, or remove the admission date range.</p>
                </div>
            )}

            {showReport && totalCount > 0 && (
                <div className="preview-scroll-wrapper border border-slate-200 rounded-xl p-4 bg-slate-50 overflow-auto flex justify-center mb-8 print:border-0 print:p-0 print:bg-white print:overflow-visible">
                    <div 
                        ref={componentRef} 
                        className="print-container bg-white"
                        style={{ 
                            width: '210mm', 
                            height: '297mm', 
                            padding: '4mm 6mm', 
                            boxSizing: 'border-box', 
                            position: 'relative', 
                            backgroundColor: '#fff',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                    >
                        {/* Top Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2mm' }}>
                            {/* Logo */}
                            <div style={{ width: '22%' }}>
                                <img src={logo} alt="Smart Institute Logo" style={{ height: '14mm', width: 'auto', objectFit: 'contain' }} />
                            </div>

                            {/* Month and Year */}
                            <div style={{ width: '40%', textAlign: 'center' }}>
                                <div style={{ fontSize: '6mm', fontWeight: '900', color: '#1e3a8a', fontFamily: 'Arial, sans-serif' }}>
                                    {getHeaderDateString()}
                                </div>
                            </div>

                            {/* Branch Address & Contacts */}
                            <div style={{ width: '38%', textAlign: 'right', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '7px', lineHeight: '1.2' }}>
                                <div style={{ fontWeight: '900', fontSize: '9px', color: '#1e3a8a' }}>{headerBranch.name || 'Godadra Branch'}</div>
                                <div>{headerBranch.address || 'H.O.: 1st & 2nd Floor, 30, kober Nagar,'}</div>
                                <div>Opp. Haba baijnath Mandir, Aas-pass Circle, Godadra,</div>
                                <div>Surat, Gujarat (INDIA)</div>
                                <div style={{ fontWeight: 'bold' }}>
                                    Ph. No.: {headerBranch.phone || '96017 49300'} Mob.: {headerBranch.mobile || '+91 98988 30409'}
                                </div>
                            </div>
                        </div>

                        {/* Green & Orange Banner */}
                        <div style={{ display: 'flex', width: '100%', marginBottom: '3mm', height: '8mm', boxSizing: 'border-box' }}>
                            <div style={{ 
                                width: '85%', 
                                backgroundColor: '#2b8258', 
                                color: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '4.5mm', 
                                fontWeight: '900', 
                                fontFamily: 'Arial, sans-serif',
                                letterSpacing: '1px',
                                border: '1.5px solid #000',
                                borderRight: 'none'
                            }}>
                                BATCH WISE REGISTER {moment(filters.startDate || filters.endDate || new Date()).format('YYYY')}
                            </div>
                            <div style={{ 
                                width: '15%', 
                                backgroundColor: '#ec9b1c', 
                                color: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '5mm', 
                                fontWeight: '900', 
                                fontFamily: 'Arial, sans-serif',
                                border: '1.5px solid #000'
                            }}>
                                {totalCount}
                            </div>
                        </div>

                        {/* Double-Column Grid of Batch Tables */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', width: '100%', boxSizing: 'border-box' }}>
                            
                            {/* Left Column (Slots 0, 2, 4, 6, 8, 10, 12) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                                {renderBatchTable(0)}
                                {renderBatchTable(2)}
                                {renderBatchTable(4)}
                                {renderBatchTable(6)}
                                {renderBatchTable(8)}
                                {renderBatchTable(10)}
                                {renderBatchTable(12)}
                            </div>

                            {/* Right Column (Slots 1, 3, 5, 7, 9, 11, 13) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                                {renderBatchTable(1)}
                                {renderBatchTable(3)}
                                {renderBatchTable(5)}
                                {renderBatchTable(7)}
                                {renderBatchTable(9)}
                                {renderBatchTable(11)}
                                {renderBatchTable(13)}
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginTop: '5mm', boxSizing: 'border-box' }}>
                            {/* Summary Table */}
                            <div style={{ width: '45%', border: '1.5px solid #000', borderCollapse: 'collapse' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>
                                    {/* Left Column of Summary */}
                                    <div style={{ borderRight: '1px solid #000' }}>
                                        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                                            <div key={idx} style={{ display: 'flex', height: '6.5mm', borderBottom: idx < 6 ? '1px solid #000' : 'none' }}>
                                                <div style={{ width: '65%', backgroundColor: '#ec9b1c', color: '#000', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '4px', borderRight: '1px solid #000' }}>
                                                    {moment().hour(standardSlots[idx].startHour).minute(0).format('h.mm A')}
                                                </div>
                                                <div style={{ width: '35%', backgroundColor: '#e5e7eb', color: '#000', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getSlotStudents(idx).length}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Right Column of Summary */}
                                    <div>
                                        {[7, 8, 9, 10, 11, 12, 13].map((idx) => (
                                            <div key={idx} style={{ display: 'flex', height: '6.5mm', borderBottom: (idx - 7) < 6 ? '1px solid #000' : 'none' }}>
                                                <div style={{ width: '65%', backgroundColor: '#ec9b1c', color: '#000', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '4px', borderRight: '1px solid #000' }}>
                                                    {moment().hour(standardSlots[idx].startHour).minute(0).format('h.mm A')}
                                                </div>
                                                <div style={{ width: '35%', backgroundColor: '#e5e7eb', color: '#000', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getSlotStudents(idx).length}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Signature Area */}
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '45mm' }}>
                                <div style={{ width: '40mm', height: '20mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Placeholder for Signature/Stamp */}
                                    <div style={{ fontFamily: 'Dancing Script, cursive', fontSize: '18px', opacity: 0.6, transform: 'rotate(-10deg)' }}>
                                        {/* Signature could go here */}
                                    </div>
                                </div>
                                <div style={{ width: '100%', borderTop: '1px solid #000', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', paddingTop: '2mm' }}>
                                    Authorized Signature
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print, .print\\:hidden { display: none !important; }
                    .preview-scroll-wrapper {
                        padding: 0 !important;
                        border: 0 !important;
                        background: none !important;
                        overflow: visible !important;
                    }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 4mm 6mm !important;
                        margin: 0 !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        height: auto !important;
                        page-break-after: always;
                    }
                    body { background: white !important; }
                    @page { 
                        size: A4 portrait;
                        margin: 0; 
                    }
                }
            `}} />
            </div>
        </div>
    );
};

export default BatchWiseRegister;

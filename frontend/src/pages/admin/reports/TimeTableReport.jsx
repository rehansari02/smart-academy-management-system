import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { fetchBranches, fetchExamSchedules } from '../../../features/master/masterSlice';
import { BookOpen, Building2, CalendarDays, ChevronDown, Clock3, Filter, Loader2, Printer, RefreshCw, Search } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const formatDate = (value, fallback = '-') => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('en-GB');
};

const getId = (value) => (typeof value === 'object' ? value?._id : value);
const getCourseName = (schedule) => schedule?.course?.name || schedule?.courseName || 'N/A';
const getSubjectName = (item) => item?.subject?.name || item?.subjectName || 'N/A';
const getBranchId = (student) => getId(student?.branchId);
const getBranchName = (student) => student?.branchId?.name || student?.branchName || 'Main Branch';

const TimeTableReport = () => {
    const dispatch = useDispatch();
    const componentRef = useRef(null);

    const { examSchedules, branches, isLoading } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = useState({ courseId: 'All', branchId: 'All', status: 'active', search: '' });

    useEffect(() => {
        dispatch(fetchExamSchedules());
        dispatch(fetchBranches());
    }, [dispatch]);

    const baseSchedules = useMemo(() => {
        const list = Array.isArray(examSchedules) ? examSchedules : [];
        const search = filters.search.trim().toLowerCase();

        return list
            .filter((schedule) => filters.branchId === 'All' || (schedule.attendees || []).some((student) => getBranchId(student) === filters.branchId))
            .filter((schedule) => {
                if (filters.status === 'all') return true;
                if (filters.status === 'inactive') return schedule.isActive === false || schedule.isDeleted === true;
                return schedule.isActive !== false && schedule.isDeleted !== true;
            })
            .filter((schedule) => {
                if (!search) return true;
                const text = [
                    schedule.examName,
                    getCourseName(schedule),
                    schedule.remarks,
                    ...(schedule.timeTable || []).map(getSubjectName),
                ].filter(Boolean).join(' ').toLowerCase();
                return text.includes(search);
            });
    }, [examSchedules, filters.branchId, filters.status, filters.search]);

    const availableCourses = useMemo(() => {
        const map = new Map();
        baseSchedules.forEach((schedule) => {
            const courseId = getId(schedule.course);
            if (courseId) map.set(courseId, { _id: courseId, name: getCourseName(schedule) });
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [baseSchedules]);

    const availableBranches = useMemo(() => {
        const map = new Map();
        (examSchedules || []).forEach((schedule) => {
            (schedule.attendees || []).forEach((student) => {
                const branchId = getBranchId(student);
                if (branchId) map.set(branchId, { _id: branchId, name: getBranchName(student) });
            });
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [examSchedules]);

    const filteredSchedules = useMemo(() => {
        return baseSchedules
            .filter((schedule) => filters.courseId === 'All' || getId(schedule.course) === filters.courseId)
            .sort((a, b) => {
                const aDate = a.timeTable?.[0]?.date ? new Date(a.timeTable[0].date).getTime() : 0;
                const bDate = b.timeTable?.[0]?.date ? new Date(b.timeTable[0].date).getTime() : 0;
                return bDate - aDate;
            });
    }, [baseSchedules, filters.courseId]);

    const headerBranch = useMemo(() => {
        const branchId = getId(user?.branchId);

        if (user?.role === 'Super Admin') {
            return { name: 'Main Branch', address: 'Smart Institute', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
        }
        if (user?.branchDetails?.address) return user.branchDetails;

        const found = branches?.find((branch) => branch._id === branchId);
        return found || { name: user?.branchName || 'Main Branch', address: 'Smart Institute', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
    }, [branches, user]);

    const printReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Exam_Time_Table_Report',
        pageStyle: '@page { size: A4 portrait; margin: 10mm; }',
    });

    const handlePrint = () => {
        if (componentRef.current) printReport();
    };

    const summary = useMemo(() => {
        const subjectCount = filteredSchedules.reduce((sum, schedule) => sum + (schedule.timeTable?.length || 0), 0);
        const studentCount = filteredSchedules.reduce((sum, schedule) => sum + (schedule.attendees?.length || 0), 0);
        const courseCount = new Set(filteredSchedules.map((schedule) => getId(schedule.course)).filter(Boolean)).size;
        return { subjectCount, studentCount, courseCount };
    }, [filteredSchedules]);

    const selectedCourseName = filters.courseId === 'All'
        ? 'All Courses'
        : availableCourses.find((course) => course._id === filters.courseId)?.name || 'Selected Course';

    if (isLoading && !examSchedules?.length) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="font-medium text-slate-500">Loading time table data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><CalendarDays size={24} /></div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Exam Report</p>
                                <h1 className="text-2xl font-bold text-slate-900">Examination Time Table</h1>
                                <p className="text-sm text-slate-500">Course-wise exam schedule with subjects, marks, dates, and timing.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays size={14} /> Exams</div>
                                <p className="mt-1 text-xl font-bold text-slate-900">{filteredSchedules.length}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><BookOpen size={14} /> Subjects</div>
                                <p className="mt-1 text-xl font-bold text-slate-900">{summary.subjectCount}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={14} /> Students</div>
                                <p className="mt-1 text-xl font-bold text-slate-900">{summary.studentCount}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500">Courses</div>
                                <p className="mt-1 text-xl font-bold text-slate-900">{summary.courseCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-[1fr_18rem_16rem_11rem_auto_auto]">
                        <div className="relative">
                            <input
                                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                placeholder="Search exam, course, subject..."
                            />
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.branchId} onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value, courseId: 'All' }))}>
                                <option value="All">All Branches</option>
                                {availableBranches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                            </select>
                            <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.courseId} onChange={(e) => setFilters((prev) => ({ ...prev, courseId: e.target.value }))}>
                                <option value="All">All Courses</option>
                                {availableCourses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, courseId: 'All' }))}>
                                <option value="active">Active Exams</option>
                                <option value="inactive">Inactive Exams</option>
                                <option value="all">All Status</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <button onClick={() => setFilters({ courseId: 'All', branchId: 'All', status: 'active', search: '' })} className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            <RefreshCw size={16} /> Reset
                        </button>
                        <button onClick={handlePrint} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
                            <Printer size={18} /> Print Report
                        </button>
                    </div>
                </div>

                <div ref={componentRef} className="print-container rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="mb-7 flex items-start justify-between border-b-2 border-slate-900 pb-4">
                        <img src={logo} alt="Institute Logo" className="h-20 w-auto object-contain" />
                        <div className="max-w-md text-right text-xs leading-relaxed text-slate-700">
                            <h2 className="mb-1 text-xl font-black text-blue-700">{headerBranch.name}</h2>
                            <p className="font-medium">{headerBranch.address}</p>
                            <p className="font-bold text-slate-900">Ph: {headerBranch.phone} | Mob: {headerBranch.mobile}</p>
                            <p className="font-semibold text-blue-600">{headerBranch.email}</p>
                        </div>
                    </div>

                    <div className="mb-7 text-center">
                        <h3 className="inline-block border-b-4 border-slate-900 px-6 pb-1 text-2xl font-black uppercase text-slate-900">Examination Time Table</h3>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedCourseName} | Printed: {formatDate(new Date())}</p>
                    </div>

                    {filteredSchedules.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center font-semibold text-slate-500">No exam schedules found for the selected filters.</div>
                    ) : (
                        <div className="space-y-8">
                            {filteredSchedules.map((schedule) => (
                                <section key={schedule._id} className="break-inside-avoid overflow-hidden rounded border-2 border-slate-900">
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
                                        <div>
                                            <h4 className="text-base font-black uppercase">{schedule.examName || 'Unnamed Exam'}</h4>
                                            <p className="text-xs font-semibold text-slate-200">{getCourseName(schedule)} | Students: {schedule.attendees?.length || 0}</p>
                                        </div>
                                        <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-900">REF {schedule._id?.slice(-6)?.toUpperCase()}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead className="bg-slate-100 text-slate-900">
                                                <tr className="uppercase">
                                                    <th className="w-12 border border-slate-300 p-2 text-center">Sr</th>
                                                    <th className="border border-slate-300 p-2 text-left">Subject</th>
                                                    <th className="w-28 border border-slate-300 p-2 text-center">Date</th>
                                                    <th className="w-36 border border-slate-300 p-2 text-center">Time</th>
                                                    <th className="w-20 border border-slate-300 p-2 text-center">Theory</th>
                                                    <th className="w-20 border border-slate-300 p-2 text-center">Practical</th>
                                                    <th className="w-20 border border-slate-300 p-2 text-center">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(schedule.timeTable || []).map((item, index) => (
                                                    <tr key={`${schedule._id}-${index}`}>
                                                        <td className="border border-slate-300 p-2 text-center font-bold">{index + 1}</td>
                                                        <td className="border border-slate-300 p-2 font-bold uppercase text-slate-900">{getSubjectName(item)}</td>
                                                        <td className="border border-slate-300 p-2 text-center font-semibold">{formatDate(item.date)}</td>
                                                        <td className="border border-slate-300 p-2 text-center font-semibold">{item.startTime || '-'} to {item.endTime || '-'}</td>
                                                        <td className="border border-slate-300 p-2 text-center">{item.theory ?? 0}</td>
                                                        <td className="border border-slate-300 p-2 text-center">{item.practical ?? 0}</td>
                                                        <td className="border border-slate-300 p-2 text-center font-black">{item.total ?? 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {schedule.remarks && <div className="border-t border-slate-300 bg-slate-50 px-4 py-2 text-xs"><span className="font-bold">Remarks:</span> {schedule.remarks}</div>}
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="mt-16 flex items-end justify-between border-t border-dashed border-slate-300 pt-10">
                        <div className="text-center"><div className="mb-2 w-44 border-b-2 border-slate-900" /><p className="text-xs font-black uppercase tracking-widest">Controller of Exams</p></div>
                        <p className="text-center text-[10px] font-medium text-slate-400">Generated by {user?.name || 'System'} on {new Date().toLocaleString()}</p>
                        <div className="text-center"><div className="mb-2 w-44 border-b-2 border-slate-900" /><p className="text-xs font-black uppercase tracking-widest">Office Seal</p></div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                @media print {
                    body { background: #fff !important; }
                    .print-container {
                        border: 0 !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
            ` }} />
        </div>
    );
};

export default TimeTableReport;

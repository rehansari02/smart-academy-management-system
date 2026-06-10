import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import { fetchBranches, fetchExamResults } from '../../../features/master/masterSlice';
import { Award, BookOpen, Building2, ChevronDown, Filter, Loader2, Printer, RefreshCw, Search, Users } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const getId = (value) => (typeof value === 'object' ? value?._id : value);
const studentName = (student) => [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(' ') || '-';
const studentFullName = (student) => studentName(student);
const getBranchId = (result) => getId(result?.student?.branchId);
const getBranchName = (result) => result?.student?.branchId?.name || result?.student?.branchName || 'Main Branch';

const CertificateIssueRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef(null);

    const { examResults, branches, isLoading } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);

    const [filters, setFilters] = useState({ courseId: 'All', branchId: 'All', examName: 'All', search: '' });

    useEffect(() => {
        dispatch(fetchExamResults());
        dispatch(fetchBranches());
    }, [dispatch]);

    const examNames = useMemo(() => {
        const names = new Set((examResults || []).map((result) => result.exam?.examName).filter(Boolean));
        return Array.from(names);
    }, [examResults]);

    const baseResults = useMemo(() => {
        const results = Array.isArray(examResults) ? examResults : [];
        const search = filters.search.trim().toLowerCase();

        return results
            .filter((result) => result.csrNumber || result.certificateNumber || result.somNumber)
            .filter((result) => filters.branchId === 'All' || getBranchId(result) === filters.branchId)
            .filter((result) => filters.examName === 'All' || result.exam?.examName === filters.examName)
            .filter((result) => {
                if (!search) return true;
                const text = [
                    studentFullName(result.student),
                    result.student?.regNo,
                    result.student?.enrollmentNo,
                    result.course?.name,
                    result.course?.shortName,
                    result.exam?.examName,
                    result.somNumber,
                    result.csrNumber,
                    result.certificateNumber,
                ].filter(Boolean).join(' ').toLowerCase();
                return text.includes(search);
            });
    }, [examResults, filters.branchId, filters.examName, filters.search]);

    const availableCourses = useMemo(() => {
        const map = new Map();
        const examName = filters.examName;
        const source = (examResults || [])
            .filter((result) => result.csrNumber || result.certificateNumber || result.somNumber)
            .filter((result) => filters.branchId === 'All' || getBranchId(result) === filters.branchId)
            .filter((result) => examName === 'All' || result.exam?.examName === examName);

        source.forEach((result) => {
            const courseId = getId(result.course);
            if (courseId) map.set(courseId, { _id: courseId, name: result.course?.name || 'N/A' });
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [examResults, filters.branchId, filters.examName]);

    const availableBranches = useMemo(() => {
        const map = new Map();
        (examResults || []).forEach((result) => {
            const branchId = getBranchId(result);
            if (branchId) map.set(branchId, { _id: branchId, name: getBranchName(result) });
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [examResults]);

    const groupedResults = useMemo(() => {
        const filtered = baseResults.filter((result) => filters.courseId === 'All' || getId(result.course) === filters.courseId);

        const groups = {};
        filtered.forEach(result => {
            const courseId = getId(result.course);
            const courseName = result.course?.name || 'Unknown Course';
            if (!groups[courseId]) {
                groups[courseId] = {
                    id: courseId,
                    name: courseName,
                    shortName: result.course?.shortName || '',
                    results: []
                };
            }
            groups[courseId].results.push(result);
        });

        // Sort students within each group by regNo
        Object.values(groups).forEach(group => {
            group.results.sort((a, b) => {
                return (a.student?.regNo || '').localeCompare(b.student?.regNo || '', undefined, { numeric: true });
            });
        });

        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [baseResults, filters.courseId]);

    useEffect(() => {
        if (filters.courseId === 'All') return;
        const isValid = availableCourses.some((course) => course._id === filters.courseId);
        if (!isValid) {
            setFilters((prev) => ({ ...prev, courseId: 'All' }));
        }
    }, [availableCourses, filters.courseId]);

    const headerBranch = useMemo(() => {
        const branchId = getId(user?.branchId);
        if (user?.role === 'Super Admin') {
            return { name: 'Head Office', address: '', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
        }
        if (user?.branchDetails?.address) return user.branchDetails;
        const found = branches?.find((branch) => branch._id === branchId);
        return found || { name: user?.branchName || 'Head Office', address: '', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
    }, [branches, user]);

    const headerDisplayName = useMemo(() => {
        if (filters.branchId !== 'All') {
            return availableBranches.find((branch) => branch._id === filters.branchId)?.name || headerBranch.name;
        }
        return 'Head Office';
    }, [availableBranches, filters.branchId, headerBranch.name]);

    const printReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Certificate_Issue_Register',
    });

    const handlePrint = () => {
        if (componentRef.current) printReport();
    };

    const selectedCourseName = filters.courseId === 'All'
        ? 'All Courses'
        : availableCourses.find((course) => course._id === filters.courseId)?.name || 'Selected Course';

    const summary = useMemo(() => {
        const allResults = groupedResults.flatMap((g) => g.results);
        const uniqueStudents = new Set(allResults.map((result) => getId(result.student)).filter(Boolean)).size;
        const uniqueCourses = groupedResults.length;
        return { uniqueStudents, uniqueCourses, total: allResults.length };
    }, [groupedResults]);

    if (isLoading && !examResults?.length) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="font-medium text-slate-500">Loading certificate register...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Award size={24} /></div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Exam Report</p>
                                <h1 className="text-2xl font-bold text-slate-900">Certificate Issue Register</h1>
                                <p className="text-sm text-slate-500">Register format for student/parent signatures upon certificate collection.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Award size={14} /> Issued</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.total}</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users size={14} /> Students</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.uniqueStudents}</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><BookOpen size={14} /> Courses</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.uniqueCourses}</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs font-semibold text-slate-500">Selected</div><p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedCourseName}</p></div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-[1fr_16rem_18rem_16rem_auto_auto]">
                        <div className="relative">
                            <input
                                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                placeholder="Search student, reg no, SOM, CSR..."
                            />
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.examName} onChange={(e) => setFilters((prev) => ({ ...prev, examName: e.target.value, courseId: 'All' }))}>
                                <option value="All">All Exams</option>
                                {examNames.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
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
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.branchId} onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value, courseId: 'All' }))}>
                                <option value="All">All Branches</option>
                                {availableBranches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                            </select>
                            <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <button onClick={() => setFilters({ courseId: 'All', branchId: 'All', examName: 'All', search: '' })} className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Reset</button>
                        <button onClick={handlePrint} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"><Printer size={18} /> Print Register</button>
                    </div>
                </div>

                                <div ref={componentRef} className="print-container bg-white p-5 shadow-sm sm:p-7 border border-slate-200 rounded-lg" style={{ width: '100%', maxWidth: '297mm' }}>
                    {/* Page Header */}
                    <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="flex items-center gap-3 justify-self-start">
                            <img src={logo} alt="Institute Logo" className="h-12 w-auto object-contain" />
                        </div>
                        <div className="justify-self-center px-2 text-center">
                            <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                                <span className="text-gray-800">सपने जो</span>{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 font-extrabold mx-1 font-sans">SMART</span>{' '}
                                <span className="text-gray-800">बना दे</span>
                            </h3>
                        </div>
                        <div className="justify-self-end text-right text-[11px] font-black text-slate-800">
                            ({headerDisplayName})
                        </div>
                    </div>

                    <div className="mb-6 text-center">
                        <h3 className="text-xl font-black text-slate-900 mb-1">Final Examination {filters.examName === 'All' ? moment().format('MMM - YYYY') : filters.examName}</h3>

                    </div>

                    {groupedResults.length === 0 ? (
                        <div className="border border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500 rounded-lg">No certificate records found for the selected filters.</div>
                    ) : (
                        groupedResults.map((group, gIdx) => (
                            <div key={group.id || gIdx} className="mb-6">
                                {/* Course Header */}
                                <div className="flex justify-between items-center border border-slate-900 bg-slate-100 p-1.5 mb-0">
                                    <h4 className="text-sm font-black text-blue-800 uppercase">
                                        {group.name} {group.shortName ? `(${group.shortName})` : ''}
                                    </h4>
                                    <div className="text-[10px] font-bold text-slate-700">
                                        Total Students: {group.results.length}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-slate-900 text-[9px] font-bold text-slate-900">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="w-8 border border-slate-900 p-1 text-center">Sr.</th>
                                                <th className="w-24 border border-slate-900 p-1 text-center">REG.NO.</th>
                                                <th className="border border-slate-900 p-1 text-left min-w-[150px]">STUDENTS NAME</th>
                                                <th className="w-20 border border-slate-900 p-1 text-center">COURSE</th>
                                                <th className="w-28 border border-slate-900 p-1 text-center">SR.NO. OF ST.O.M</th>
                                                <th className="w-28 border border-slate-900 p-1 text-center">SR.NO. OF CERT.</th>
                                                <th className="w-44 border border-slate-900 p-1 text-center">STUDENT / GARDIUN SIGN.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.results.map((result, index) => (
                                                <tr key={result._id} style={{ height: '9mm' }}>
                                                    <td className="border border-slate-900 p-1 text-center">{index + 1}</td>
                                                    <td className="border border-slate-900 p-1 text-center font-mono">{result.student?.regNo || '-'}</td>
                                                    <td className="border border-slate-900 p-1 text-left uppercase whitespace-nowrap">{studentFullName(result.student)}</td>
                                                    <td className="border border-slate-900 p-1 text-center uppercase">{result.course?.shortName || result.course?.name || '-'}</td>
                                                    <td className="border border-slate-900 p-1 text-center uppercase">{result.somNumber || '-'}</td>
                                                    <td className="border border-slate-900 p-1 text-center uppercase">{result.csrNumber || result.certificateNumber || '-'}</td>
                                                    <td className="border border-slate-900 p-1">
                                                        {/* Space for signature */}
                                                    </td>
                                                </tr>
                                            ))}

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Footer Section */}
                    <div className="mt-10 flex items-end justify-between px-4">
                        <p className="text-[11px] font-black italic text-slate-800">"We Wish Him For Success In His Life"</p>
                        
                        <div className="text-center">
                            <div className="mb-2 w-48 border-b-2 border-slate-900" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">Authorised Signatory</p>
                        </div>
                    </div>
                </div>
            </div>

                        <style dangerouslySetInnerHTML={{ __html: `
                .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                @media print {
                    body { background: #fff !important; margin: 0; }
                    .print-container {
                        border: 0 !important;
                        box-shadow: none !important;
                        padding: 5mm !important;
                        width: 100% !important;
                        max-width: 297mm !important;
                        box-sizing: border-box !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 5mm;
                    }
                }
            ` }} />
        </div>
    );
};

export default CertificateIssueRegister;

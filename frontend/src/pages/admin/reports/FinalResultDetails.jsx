import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';
import { fetchBranches, fetchExamResults } from '../../../features/master/masterSlice';
import { Award, BookOpen, Building2, ChevronDown, ClipboardList, Filter, Loader2, Percent, Printer, RefreshCw, Search } from 'lucide-react';
import logo from '../../../assets/logo2.png';

const getId = (value) => (typeof value === 'object' ? value?._id : value);
const studentName = (student) => [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(' ') || '-';
const getBranchId = (result) => getId(result?.student?.branchId);
const getBranchName = (result) => result?.student?.branchId?.name || result?.student?.branchName || 'Main Branch';
const percentageOf = (result) => {
    const total = Number(result.totalMarks || 0);
    const obtained = Number(result.marksObtained || 0);
    return total > 0 ? ((obtained / total) * 100).toFixed(2) : '0.00';
};

const subjectLabel = (subjectMark) => subjectMark?.subject?.name || subjectMark?.subjectName || 'Subject';
const normalizeCourseTitle = (name, shortName) => {
    const fullName = String(name || '').trim();
    const short = String(shortName || '').trim();
    if (!fullName) return '-';
    if (!short) return fullName;
    const escapedShort = short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return fullName.replace(new RegExp(`\\s*\\(\\s*${escapedShort}\\.?\\s*\\)\\s*$`, 'i'), '').trim() || fullName;
};
const normalizeSubjectKey = (value) =>
    String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');

const FinalResultDetails = () => {
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
        const list = Array.isArray(examResults) ? examResults : [];
        const search = filters.search.trim().toLowerCase();

        return list
            .filter((result) => filters.branchId === 'All' || getBranchId(result) === filters.branchId)
            .filter((result) => filters.examName === 'All' || result.exam?.examName === filters.examName)
            .filter((result) => {
                if (!search) return true;
                const text = [
                    studentName(result.student),
                    result.student?.regNo,
                    result.student?.enrollmentNo,
                    result.course?.name,
                    result.course?.shortName,
                    result.exam?.examName,
                    result.grade,
                    result.somNumber,
                    result.csrNumber,
                    ...(result.subjectMarks || []).map(subjectLabel),
                ].filter(Boolean).join(' ').toLowerCase();
                return text.includes(search);
            });
    }, [examResults, filters.branchId, filters.examName, filters.search]);

    const availableCourses = useMemo(() => {
        const map = new Map();
        const examName = filters.examName;
        const source = (examResults || [])
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
                    results: [],
                    subjects: [],
                    totalMaxMarks: result.totalMarks || 0
                };
            }
            groups[courseId].results.push(result);
            
            // Collect unique subjects for this course
            (result.subjectMarks || []).forEach(sm => {
                const sName = sm.subject?.name || sm.subjectName || 'Subject';
                if (!groups[courseId].subjects.find(s => s.name === sName)) {
                    groups[courseId].subjects.push({ name: sName, id: sm.subject?._id || sm.subject });
                }
            });
        });

        // Sort students within each group
        Object.values(groups).forEach(group => {
            group.results.sort((a, b) => {
                return studentName(a.student).localeCompare(studentName(b.student)) || 
                       (a.student?.regNo || '').localeCompare(b.student?.regNo || '', undefined, { numeric: true });
            });

            // Categorize subjects
            const regular = [];
            let project = null;
            let seminar = null;
            let discipline = null;

            group.subjects.forEach(s => {
                const n = s.name.toUpperCase();
                if (n.includes('PROJECT')) project = s;
                else if (n.includes('SEMINAR')) seminar = s;
                else if (n.includes('DISCIPLINE') || n.includes('DESCIPLINE')) discipline = s;
                else regular.push(s);
            });

            group.categorizedSubjects = { regular, project, seminar, discipline };
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
            return { name: 'Main Branch', address: 'Smart Institute', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
        }
        if (user?.branchDetails?.address) return user.branchDetails;
        const found = branches?.find((branch) => branch._id === branchId);
        return found || { name: user?.branchName || 'Main Branch', address: 'Smart Institute', phone: '96017-49300', mobile: '98988-30409', email: 'smartinstitutes@gmail.com' };
    }, [branches, user]);

    const printReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Final_Result_Details',
    });

    const handlePrint = () => {
        if (componentRef.current) printReport();
    };

    const selectedCourseName = filters.courseId === 'All'
        ? 'All Courses'
        : availableCourses.find((course) => course._id === filters.courseId)?.name || 'Selected Course';

    const summary = useMemo(() => {
        const results = groupedResults.flatMap((group) => group.results);
        const totalObtained = results.reduce((sum, result) => sum + Number(result.marksObtained || 0), 0);
        const totalMarks = results.reduce((sum, result) => sum + Number(result.totalMarks || 0), 0);
        const average = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : '0.00';
        return {
            results: results.length,
            courses: groupedResults.length,
            certified: results.filter((result) => result.csrNumber || result.certificateNumber).length,
            average,
        };
    }, [groupedResults]);

    const renderCourseTable = (group) => {
        const { regular, project, seminar, discipline } = group.categorizedSubjects;
        
        return (
            <div key={group.id} className="mb-10 break-inside-avoid">
                {/* Course Header */}
                <div className="flex justify-between items-center bg-slate-100 p-2 border-x border-t border-slate-400">
                    <h4 className="text-lg font-black text-blue-800 uppercase">{normalizeCourseTitle(group.name, group.shortName)}</h4>
                    <div className="text-sm font-bold text-slate-700">Total Students: <span className="text-blue-700">{group.results.length.toString().padStart(2, '0')}</span></div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400 text-[8px] font-bold text-slate-900">
                        <thead>
                            <tr className="bg-slate-200">
                                <th rowSpan="2" className="border border-slate-400 p-1 w-6">SR. NO.</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-16">REG. NO.</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 text-left min-w-[120px]">STUDENTS NAME</th>
                                {regular.map((s, idx) => (
                                    <th key={idx} colSpan="2" className="border border-slate-400 p-1 text-center uppercase">{s.name}</th>
                                ))}
                                <th rowSpan="2" className="border border-slate-400 p-1 w-10 uppercase">{project?.name || 'PROJECT'}</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-10 uppercase">{seminar?.name || 'SEMINAR'}</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-12 uppercase">{discipline?.name || 'DESCIPLINE'}</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-10">TOTAL</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-12">TOTAL O.M.</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-10">PER (%)</th>
                                <th rowSpan="2" className="border border-slate-400 p-1 w-10">GRADE</th>
                            </tr>
                            <tr className="bg-slate-50">
                                {regular.map((_, idx) => (
                                    <React.Fragment key={idx}>
                                        <th className="border border-slate-400 p-0.5 text-[7px] w-8">Theory</th>
                                        <th className="border border-slate-400 p-0.5 text-[7px] w-8">Practical</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {group.results.map((result, index) => {
                                const getMarks = (sName) => {
                                    const target = normalizeSubjectKey(sName);
                                    const sm = result.subjectMarks?.find((m) => {
                                        const candidate = normalizeSubjectKey(m.subject?.name || m.subjectName || m.name);
                                        return candidate === target || candidate.includes(target) || target.includes(candidate);
                                    });
                                    return sm
                                        ? {
                                              theory: Number(sm.theory ?? 0),
                                              practical: Number(sm.practical ?? 0),
                                              total: Number(sm.total ?? 0),
                                          }
                                        : { theory: '-', practical: '-', total: '-' };
                                };

                                const getSpecialSubjectMarks = (sName) => {
                                    const mark = getMarks(sName);
                                    if (mark.theory === '-' && mark.practical === '-' && mark.total === '-') {
                                        return '-';
                                    }

                                    const theory = Number(mark.theory || 0);
                                    const practical = Number(mark.practical || 0);
                                    const computed = theory + practical;

                                    if (computed > 0) return computed;
                                    if (Number.isFinite(mark.total) && mark.total !== 0) return mark.total;
                                    return 0;
                                };

                                let regularTotal = 0;
                                regular.forEach(s => {
                                    const m = getMarks(s.name);
                                    regularTotal += m.total;
                                });

                                const projectMarks = project ? getSpecialSubjectMarks(project.name) : 0;
                                const seminarMarks = seminar ? getSpecialSubjectMarks(seminar.name) : 0;
                                const disciplineMarks = discipline ? getSpecialSubjectMarks(discipline.name) : 0;
                                
                                const totalMax = Number(result.totalMarks || 0) || (regularTotal + projectMarks + seminarMarks + disciplineMarks);
                                const totalOM = Number(result.marksObtained || 0) || (regularTotal + projectMarks + seminarMarks + disciplineMarks);

                                return (
                                    <tr key={result._id} className="hover:bg-slate-50">
                                        <td className="border border-slate-400 p-1 text-center">{index + 1}</td>
                                        <td className="border border-slate-400 p-1 text-center">{result.student?.regNo || '-'}</td>
                                        <td className="border border-slate-400 p-1 text-left uppercase whitespace-nowrap">{studentName(result.student)}</td>
                                        {regular.map((s, idx) => {
                                            const m = getMarks(s.name);
                                            return (
                                                <React.Fragment key={idx}>
                                                    <td className="border border-slate-400 p-1 text-center">{m.theory}</td>
                                                    <td className="border border-slate-400 p-1 text-center">{m.practical}</td>
                                                </React.Fragment>
                                            );
                                        })}
                                        <td className="border border-slate-400 p-1 text-center">{project ? projectMarks : '-'}</td>
                                        <td className="border border-slate-400 p-1 text-center">{seminar ? seminarMarks : '-'}</td>
                                        <td className="border border-slate-400 p-1 text-center">{discipline ? disciplineMarks : '-'}</td>
                                        <td className="border border-slate-400 p-1 text-center bg-slate-50">{totalMax}</td>
                                        <td className="border border-slate-400 p-1 text-center font-black bg-blue-50">{totalOM}</td>
                                        <td className="border border-slate-400 p-1 text-center font-black">{percentageOf(result)}%</td>
                                        <td className="border border-slate-400 p-1 text-center">{result.grade || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Course Summary Footer */}
                <div className="flex justify-end mt-2">
                    <div className="flex items-center gap-4 text-xs font-black uppercase">
                        <span>Total Marks : </span>
                        <div className="border-b-2 border-slate-900 px-4 py-0.5">{group.totalMaxMarks}</div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && !examResults?.length) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="font-medium text-slate-500">Loading final result details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-[297mm]">
                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><ClipboardList size={24} /></div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Exam Report</p>
                                <h1 className="text-2xl font-bold text-slate-900">Final Result Details</h1>
                                <p className="text-sm text-slate-500">Course-wise grouped report matching official format.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ClipboardList size={14} /> Results</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.results}</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Award size={14} /> Certified</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.certified}</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Percent size={14} /> Average</div><p className="mt-1 text-xl font-bold text-slate-900">{summary.average}%</p></div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><BookOpen size={14} /> Course</div><p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedCourseName}</p></div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                        <div className="relative min-w-0 flex-[1_1_18rem]">
                            <input
                                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                value={filters.search}
                                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                placeholder="Search student, reg no, subject..."
                            />
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative min-w-0 flex-[1_1_13rem]">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.examName} onChange={(e) => setFilters((prev) => ({ ...prev, examName: e.target.value, courseId: 'All' }))}>
                                <option value="All">All Exams</option>
                                {examNames.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative min-w-0 flex-[1_1_13rem]">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.courseId} onChange={(e) => setFilters((prev) => ({ ...prev, courseId: e.target.value }))}>
                                <option value="All">All Courses</option>
                                {availableCourses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <div className="relative min-w-0 flex-[1_1_13rem]">
                            <select className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.branchId} onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value, courseId: 'All' }))}>
                                <option value="All">All Branches</option>
                                {availableBranches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                            </select>
                            <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                        </div>
                        <button onClick={() => setFilters({ courseId: 'All', branchId: 'All', examName: 'All', search: '' })} className="flex flex-[0_1_8rem] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Reset</button>
                        <button onClick={handlePrint} className="flex flex-[0_1_10rem] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"><Printer size={18} /> Print Results</button>
                    </div>
                </div>

                <div ref={componentRef} className="print-container bg-white p-5 sm:p-7 shadow-lg border border-slate-200 rounded-lg">
                    {/* Page Header */}
                    <div className="mb-6 grid grid-cols-[auto_1fr_auto] items-start gap-4">
                        <img src={logo} alt="Institute Logo" className="h-14 w-auto object-contain" />
                        <div className="flex justify-center text-center">
                            <h2 className="text-2xl font-black text-blue-800 uppercase tracking-tighter">Final Examination {filters.examName === 'All' ? moment().format('MMMM - YYYY') : filters.examName}</h2>
                        </div>
                        <div className="text-right text-[10px] font-bold text-slate-800">
                            <div>Date : <span className="ml-2 border-b border-slate-800 px-4">{moment().format('DD-MMM-YY')}</span></div>
                            <div className="mt-2">({headerBranch.name?.toUpperCase()})</div>
                        </div>
                    </div>

                    {groupedResults.length === 0 ? (
                        <div className="border border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500 rounded-lg">No exam results found for the selected filters.</div>
                    ) : (
                        groupedResults.map(renderCourseTable)
                    )}
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

export default FinalResultDetails;

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  BarChart3,
  Building2,
  Layers,
  GraduationCap,
  BookOpen,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  BookOpenCheck,
  FolderCheck,
} from 'lucide-react';
import moment from 'moment';

const SyllabusReportDashboardModal = ({
  isOpen,
  onClose,
  isSuperAdmin,
  user,
  branches = [],
  batches = [],
  courses = [],
  assignedCombos = [],
  onSelectSubjectRow,
}) => {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Permissions filtering
  const allowedBranchIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(
      assignedCombos
        .map((c) => {
          const b = c.branchId;
          return typeof b === 'object' ? b?._id : b;
        })
        .filter(Boolean)
        .map(String)
    );
  }, [isSuperAdmin, assignedCombos]);

  const allowedBatchIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(
      assignedCombos
        .map((c) => {
          const b = c.batchId;
          return typeof b === 'object' ? b?._id : b;
        })
        .filter(Boolean)
        .map(String)
    );
  }, [isSuperAdmin, assignedCombos]);

  const allowedCourseIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(
      assignedCombos
        .map((c) => {
          const course = c.courseId;
          return typeof course === 'object' ? course?._id : course;
        })
        .filter(Boolean)
        .map(String)
    );
  }, [isSuperAdmin, assignedCombos]);

  const allowedSubjectIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(
      assignedCombos
        .map((c) => {
          const sub = c.subjectId;
          return typeof sub === 'object' ? sub?._id : sub;
        })
        .filter(Boolean)
        .map(String)
    );
  }, [isSuperAdmin, assignedCombos]);

  // Filtered master lists
  const filteredBranchesList = useMemo(() => {
    if (isSuperAdmin || !allowedBranchIds) return branches;
    return branches.filter((b) => allowedBranchIds.has(String(b._id)));
  }, [branches, isSuperAdmin, allowedBranchIds]);

  const filteredBatchesList = useMemo(() => {
    if (isSuperAdmin || !allowedBatchIds) return batches;
    return batches.filter((b) => allowedBatchIds.has(String(b._id)));
  }, [batches, isSuperAdmin, allowedBatchIds]);

  const filteredCoursesList = useMemo(() => {
    if (isSuperAdmin || !allowedCourseIds) return courses;
    return courses.filter((c) => allowedCourseIds.has(String(c._id)));
  }, [courses, isSuperAdmin, allowedCourseIds]);

  // Build flattened report rows
  const allReportRows = useMemo(() => {
    const rows = [];
    filteredBranchesList.forEach((branch) => {
      const branchBatches = filteredBatchesList.filter((b) => {
        const bBranchId = typeof b.branch === 'object' ? b.branch?._id : b.branch;
        return String(bBranchId) === String(branch._id);
      });

      branchBatches.forEach((batch) => {
        const linkedCourseIds = (batch.courses || []).map((cId) =>
          typeof cId === 'object' ? String(cId._id) : String(cId)
        );

        linkedCourseIds.forEach((cId) => {
          const course = filteredCoursesList.find((c) => String(c._id) === cId);
          if (!course) return;

          (course.subjects || []).forEach((subItem) => {
            const subject = subItem.subject || subItem;
            const subId = String(subject._id || '');

            if (!isSuperAdmin && allowedSubjectIds && !allowedSubjectIds.has(subId)) {
              return;
            }

            rows.push({
              branchId: branch._id,
              branchName: branch.name,
              branchCode: branch.shortCode,
              batchId: batch._id,
              batchName: batch.name,
              facultyName: batch.faculty?.name || 'Unassigned',
              courseId: course._id,
              courseName: course.name,
              courseShortName: course.shortName,
              subjectId: subId,
              subjectName: subject.name || 'Unnamed Subject',
              daysToComplete: subject.daysToComplete || 0,
              totalPages: subject.totalPages || 0,
              chaptersCount: (subject.chapters || []).length || subject.chaptersCount || 0,
              projectsCount: (subject.projects || []).length || subject.projectsCount || 0,
            });
          });
        });
      });
    });
    return rows;
  }, [
    filteredBranchesList,
    filteredBatchesList,
    filteredCoursesList,
    isSuperAdmin,
    allowedSubjectIds,
  ]);

  // Filter rows based on search & selectors
  const filteredReportRows = useMemo(() => {
    return allReportRows.filter((row) => {
      if (
        selectedBranchFilter !== 'ALL' &&
        String(row.branchId) !== String(selectedBranchFilter)
      ) {
        return false;
      }
      if (
        selectedBatchFilter !== 'ALL' &&
        String(row.batchId) !== String(selectedBatchFilter)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = row.subjectName.toLowerCase().includes(q);
        const matchesCourse = row.courseName.toLowerCase().includes(q);
        const matchesBatch = row.batchName.toLowerCase().includes(q);
        const matchesBranch = row.branchName.toLowerCase().includes(q);
        const matchesFaculty = row.facultyName.toLowerCase().includes(q);
        if (
          !matchesSubject &&
          !matchesCourse &&
          !matchesBatch &&
          !matchesBranch &&
          !matchesFaculty
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allReportRows, selectedBranchFilter, selectedBatchFilter, searchQuery]);

  // Calculate high-level KPIs
  const stats = useMemo(() => {
    const uniqueBranches = new Set(filteredReportRows.map((r) => r.branchId)).size;
    const uniqueBatches = new Set(filteredReportRows.map((r) => r.batchId)).size;
    const uniqueCourses = new Set(filteredReportRows.map((r) => r.courseId)).size;
    const totalSubjects = filteredReportRows.length;
    const totalDays = filteredReportRows.reduce(
      (sum, r) => sum + Number(r.daysToComplete || 0),
      0
    );
    const totalPages = filteredReportRows.reduce(
      (sum, r) => sum + Number(r.totalPages || 0),
      0
    );
    const totalChapters = filteredReportRows.reduce(
      (sum, r) => sum + Number(r.chaptersCount || 0),
      0
    );
    const totalProjects = filteredReportRows.reduce(
      (sum, r) => sum + Number(r.projectsCount || 0),
      0
    );

    return {
      uniqueBranches,
      uniqueBatches,
      uniqueCourses,
      totalSubjects,
      totalDays,
      totalPages,
      totalChapters,
      totalProjects,
    };
  }, [filteredReportRows]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Header Bar */}
        <div className="bg-[#0a1931] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/40 text-indigo-300 border border-indigo-400/30">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Syllabus Executive Report Dashboard
                </h2>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                    <ShieldCheck size={13} /> Super Admin Scope
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-xs font-black text-amber-300">
                    <UserCheck size={13} /> Faculty Scope ({allReportRows.length} Subjects)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Master syllabus parameters across all active branches, batches, courses & subjects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer size={15} /> Print Report
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0 print:overflow-visible text-slate-800">
          
          {/* Printable Header Title (Visible only when printing) */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-[#0a1931] uppercase">SMART INSTITUTE</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Overall Syllabus Management Master Dashboard Report
                </p>
              </div>
              <div className="text-right text-xs font-bold text-slate-600">
                <div>Printed Date: {moment().format('DD MMMM YYYY')}</div>
                <div>User Role: {isSuperAdmin ? 'Super Admin' : `Faculty (${user?.name || ''})`}</div>
              </div>
            </div>
          </div>

          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Branches</span>
                <Building2 size={15} className="text-blue-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.uniqueBranches}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Active Centers</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Batches</span>
                <Layers size={15} className="text-indigo-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.uniqueBatches}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Batches Covered</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Courses</span>
                <GraduationCap size={15} className="text-emerald-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.uniqueCourses}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Linked Programs</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Subjects</span>
                <BookOpen size={15} className="text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-700">{stats.totalSubjects}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Total Tracking</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Target Days</span>
                <Clock size={15} className="text-sky-600" />
              </div>
              <div className="text-xl font-black text-sky-700">{stats.totalDays}d</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Est. Teaching Days</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Chapters</span>
                <BookOpenCheck size={15} className="text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700">{stats.totalChapters}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Total Chapters</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Projects</span>
                <FolderCheck size={15} className="text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700">{stats.totalProjects}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">Total Projects</div>
            </div>
          </div>

          {/* Interactive Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl print:hidden">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                <Filter size={15} className="text-indigo-600" /> Filter:
              </div>
              
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Branches ({filteredBranchesList.length})</option>
                {filteredBranchesList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.shortCode})
                  </option>
                ))}
              </select>

              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Batches ({filteredBatchesList.length})</option>
                {filteredBatchesList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search subject, course, batch, faculty…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0a1931] text-white font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Batch</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Subject Name</th>
                  <th className="py-3.5 px-4 text-center">Faculty</th>
                  <th className="py-3.5 px-4 text-center">Target Days</th>
                  <th className="py-3.5 px-4 text-center">Total Pages</th>
                  <th className="py-3.5 px-4 text-center">Chapters</th>
                  <th className="py-3.5 px-4 text-center">Projects</th>
                  <th className="py-3.5 px-4 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredReportRows.length > 0 ? (
                  filteredReportRows.map((row, idx) => (
                    <tr
                      key={`${row.branchId}_${row.batchId}_${row.subjectId}_${idx}`}
                      className="hover:bg-indigo-50/40 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-center font-black text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-extrabold text-blue-800">
                          {row.branchCode || row.branchName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900">{row.batchName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-600">{row.courseName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <BookOpenCheck size={16} className="text-indigo-600 shrink-0" />
                          <span className="font-extrabold text-slate-900 text-sm">{row.subjectName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                          <UserCheck size={13} className="text-emerald-600" /> {row.facultyName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sky-800">
                        {row.daysToComplete}d
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-purple-800">
                        {row.totalPages} pgs
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-extrabold text-blue-800">
                          <BookOpenCheck size={13} className="text-blue-600" /> {row.chaptersCount} Ch
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-extrabold text-amber-800">
                          <FolderCheck size={13} className="text-amber-600" /> {row.projectsCount} Proj
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onSelectSubjectRow) {
                              onSelectSubjectRow(row);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          Inspect <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                      No syllabus records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Metadata */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-slate-400 pt-2 border-t border-slate-100">
            <div>Total Records: {filteredReportRows.length} Subjects</div>
            <div>SMART Institute Syllabus Management System</div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SyllabusReportDashboardModal;

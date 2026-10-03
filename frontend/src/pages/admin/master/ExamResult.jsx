import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchExamSchedules, 
  fetchBatches, 
  fetchExamResults, 
  fetchCourses,
  deleteExamResult 
} from '../../../features/master/masterSlice';

import { Search, RefreshCw, Edit, Printer, Award, Trash2, Plus, X } from 'lucide-react';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const formatSomNumber = (value) => {
  const number = String(value || '').trim();
  if (!number) return '-';
  return `SOM-${number.replace(/^(SOM-)+/i, '').replace(/^(LEGACY-)+/i, '')}`;
};

const formatCsrNumber = (result) => {
  const rawCsr = String(result?.csrNumber || result?.certificateNumber || '').trim();
  if (!rawCsr || rawCsr.startsWith('SOM-') || /^CSR-LEGACY-/i.test(rawCsr) || /^CERT-LEGACY-/i.test(rawCsr)) {
    const som = formatSomNumber(result?.somNumber);
    return som === '-' ? '-' : som.replace(/^SOM-/i, 'CSR-');
  }
  return `CSR-${rawCsr.replace(/^(CSR-|SOM-)+/i, '').replace(/^(LEGACY-)+/i, '')}`;
};

const ExamResult = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examSchedules, examResults, batches, courses } = useSelector((state) => state.master);
  const { delete: canDelete } = useUserRights('Exam Result');

  // Local State for Filters
  const [filters, setFilters] = useState({ examName: '', courseId: '', studentId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search dropdown states
  const [isFilterExamDropdownOpen, setIsFilterExamDropdownOpen] = useState(false);
  const [filterExamSearch, setFilterExamSearch] = useState('');
  const [isFilterCourseDropdownOpen, setIsFilterCourseDropdownOpen] = useState(false);
  const [filterCourseSearch, setFilterCourseSearch] = useState('');
  const [isFilterStudentDropdownOpen, setIsFilterStudentDropdownOpen] = useState(false);
  const [filterStudentSearch, setFilterStudentSearch] = useState('');

  // Dropdown Refs for Click Outside
  const examDropdownRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const studentDropdownRef = useRef(null);

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchExamSchedules());
    dispatch(fetchBatches());
    dispatch(fetchCourses());
    dispatch(fetchExamResults());
  }, [dispatch]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target)) {
        setIsFilterExamDropdownOpen(false);
      }
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setIsFilterCourseDropdownOpen(false);
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
        setIsFilterStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique Exam Names from Schedules AND Results
  const uniqueExamNames = useMemo(() => {
    const names = new Set();
    (examSchedules || []).forEach(e => {
      if (e?.examName && !e?.isDeleted) names.add(e.examName.trim());
    });
    (examResults || []).forEach(r => {
      if (r?.exam?.examName) names.add(r.exam.examName.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [examSchedules, examResults]);

  // Courses filtered by selected exam, or all courses if no exam selected
  const coursesForSelectedExamFilter = useMemo(() => {
    const coursesMap = new Map();

    if (filters.examName) {
      const targetExam = filters.examName.trim().toLowerCase();
      (examSchedules || [])
        .filter(e => !e.isDeleted && e.examName?.trim().toLowerCase() === targetExam)
        .forEach(e => {
          if (e.course?._id) coursesMap.set(String(e.course._id), e.course);
        });

      (examResults || [])
        .filter(r => r.exam?.examName?.trim().toLowerCase() === targetExam)
        .forEach(r => {
          if (r.course?._id) coursesMap.set(String(r.course._id), r.course);
        });
    } else {
      (courses || []).forEach(c => {
        if (c?._id && !c?.isDeleted) coursesMap.set(String(c._id), c);
      });
      (examResults || []).forEach(r => {
        if (r.course?._id) coursesMap.set(String(r.course._id), r.course);
      });
      (examSchedules || []).forEach(e => {
        if (e.course?._id && !e.isDeleted) coursesMap.set(String(e.course._id), e.course);
      });
    }

    return Array.from(coursesMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [filters.examName, examSchedules, examResults, courses]);

  // Students who have results matching current exam and course
  const studentsWithResultsFiltered = useMemo(() => {
    const studentsMap = new Map();
    const targetExam = filters.examName ? filters.examName.trim().toLowerCase() : null;

    (examResults || []).forEach(res => {
      if (targetExam && res.exam?.examName?.trim().toLowerCase() !== targetExam) return;
      if (filters.courseId && String(res.course?._id) !== String(filters.courseId)) return;
      if (res.student && res.student._id) {
        studentsMap.set(String(res.student._id), res.student);
      }
    });

    return Array.from(studentsMap.values()).sort((a, b) => {
      const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ');
      const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ');
      return nameA.localeCompare(nameB);
    });
  }, [examResults, filters.examName, filters.courseId]);

  const selectedStudent = useMemo(() => {
    if (!filters.studentId) return null;
    const fromFiltered = studentsWithResultsFiltered.find(s => String(s._id) === String(filters.studentId));
    if (fromFiltered) return fromFiltered;
    const fromResults = (examResults || []).find(r => String(r.student?._id) === String(filters.studentId));
    return fromResults?.student || null;
  }, [filters.studentId, studentsWithResultsFiltered, examResults]);

  const selectedCourse = useMemo(() => {
    if (!filters.courseId) return null;
    return coursesForSelectedExamFilter.find(c => String(c._id) === String(filters.courseId))
      || (courses || []).find(c => String(c._id) === String(filters.courseId))
      || (examResults || []).find(r => String(r.course?._id) === String(filters.courseId))?.course
      || null;
  }, [filters.courseId, coursesForSelectedExamFilter, courses, examResults]);

  // Filtered Exam Results for Display (Reactive client-side + server synced)
  const filteredExamResults = useMemo(() => {
    return (examResults || []).filter(res => {
      if (filters.examName && res.exam?.examName?.trim().toLowerCase() !== filters.examName.trim().toLowerCase()) {
        return false;
      }
      if (filters.courseId && String(res.course?._id) !== String(filters.courseId)) {
        return false;
      }
      if (filters.studentId && String(res.student?._id) !== String(filters.studentId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = [res.student?.firstName, res.student?.middleName, res.student?.lastName].filter(Boolean).join(' ').toLowerCase();
        const regNo = (res.student?.regNo || '').toLowerCase();
        const enrollNo = (res.student?.enrollmentNo || '').toLowerCase();
        const som = (res.somNumber || '').toLowerCase();
        const csr = (res.csrNumber || res.certificateNumber || '').toLowerCase();
        const batch = (res.batch || '').toLowerCase();
        const courseName = (res.course?.name || '').toLowerCase();
        const examName = (res.exam?.examName || '').toLowerCase();

        const match = fullName.includes(q) || 
                      regNo.includes(q) || 
                      enrollNo.includes(q) || 
                      som.includes(q) || 
                      csr.includes(q) || 
                      batch.includes(q) ||
                      courseName.includes(q) ||
                      examName.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [examResults, filters, searchQuery]);

  const onSearch = () => {
    setPage(1);
    const queryParams = {};
    if (filters.examName) queryParams.examName = filters.examName;
    if (filters.courseId) queryParams.courseId = filters.courseId;
    if (filters.studentId) queryParams.studentId = filters.studentId;
    dispatch(fetchExamResults(queryParams));
  };

  const onReset = () => {
    setFilters({ examName: '', courseId: '', studentId: '' });
    setSearchQuery('');
    setPage(1);
    dispatch(fetchExamResults());
  };

  const printDocument = (type, result) => {
    window.open(`/print/exam-result/${result._id}?type=${type}`, '_blank');
  };

  const handleDelete = (result) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete exam results.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete the result for ${[result.student?.firstName, result.student?.middleName, result.student?.lastName].filter(Boolean).join(' ')}?`)) {
      dispatch(deleteExamResult(result._id));
    }
  };

  // Pagination on filtered results
  const paginatedData = useMemo(() => {
    return filteredExamResults.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredExamResults, page, pageSize]);

  const totalPages = Math.ceil(filteredExamResults.length / pageSize) || 1;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exam Results</h2>
        <button 
          onClick={() => navigate('/master/exam-result/add')} 
          className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18} /> Add New Result
        </button>
      </div>

      {/* --- FILTER SECTION --- */}
      <div className="bg-white p-4 rounded shadow mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Exam Name Search Dropdown */}
              <div className="relative" ref={examDropdownRef}>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Exam Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterExamDropdownOpen(!isFilterExamDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={`truncate mr-1 ${filters.examName ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                              {filters.examName || '-- All Exams --'}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                              {filters.examName && (
                                  <span
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setFilters(f => ({ ...f, examName: '', courseId: '', studentId: '' }));
                                          setPage(1);
                                      }}
                                      className="hover:text-red-600 p-0.5 rounded cursor-pointer text-gray-400"
                                      title="Clear Exam"
                                  >
                                      <X size={14} />
                                  </span>
                              )}
                              <span className="text-gray-400 text-xs">▼</span>
                          </span>
                      </button>
                      
                      {isFilterExamDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[250px] overflow-y-auto p-2">
                              <div className="p-1 mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="Search Exam..."
                                      value={filterExamSearch}
                                      onChange={(e) => setFilterExamSearch(e.target.value)}
                                      className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none font-medium"
                                  />
                              </div>
                              <div className="divide-y divide-gray-100 max-h-[160px] overflow-y-auto font-medium">
                                  <div 
                                      onClick={() => {
                                          setFilters({...filters, examName: '', courseId: '', studentId: ''});
                                          setIsFilterExamDropdownOpen(false);
                                          setFilterExamSearch('');
                                          setPage(1);
                                      }}
                                      className="p-2 text-xs hover:bg-blue-50 text-gray-500 cursor-pointer rounded italic"
                                  >
                                      -- All Exams --
                                  </div>
                                  {uniqueExamNames && uniqueExamNames.filter(name => name.toLowerCase().includes(filterExamSearch.toLowerCase())).map(name => (
                                      <div 
                                          key={name} 
                                          onClick={() => {
                                              setFilters({...filters, examName: name, courseId: '', studentId: ''});
                                              setIsFilterExamDropdownOpen(false);
                                              setFilterExamSearch('');
                                              setPage(1);
                                          }}
                                          className={`p-2 text-xs hover:bg-blue-50 cursor-pointer rounded ${filters.examName === name ? 'bg-blue-50 text-primary font-bold' : 'text-gray-700 font-semibold'}`}
                                      >
                                          {name}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* Course Name Search Dropdown */}
              <div className="relative" ref={courseDropdownRef}>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Course Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterCourseDropdownOpen(!isFilterCourseDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={`truncate mr-1 ${filters.courseId ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                              {selectedCourse ? selectedCourse.name : '-- All Courses --'}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                              {filters.courseId && (
                                  <span
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setFilters(f => ({ ...f, courseId: '', studentId: '' }));
                                          setPage(1);
                                      }}
                                      className="hover:text-red-600 p-0.5 rounded cursor-pointer text-gray-400"
                                      title="Clear Course"
                                  >
                                      <X size={14} />
                                  </span>
                              )}
                              <span className="text-gray-400 text-xs">▼</span>
                          </span>
                      </button>
                      
                      {isFilterCourseDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[250px] overflow-y-auto p-2">
                              <div className="p-1 mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="Search Course..."
                                      value={filterCourseSearch}
                                      onChange={(e) => setFilterCourseSearch(e.target.value)}
                                      className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none font-medium"
                                  />
                              </div>
                              <div className="divide-y divide-gray-100 max-h-[160px] overflow-y-auto font-medium">
                                  <div 
                                      onClick={() => {
                                          setFilters({...filters, courseId: '', studentId: ''});
                                          setIsFilterCourseDropdownOpen(false);
                                          setFilterCourseSearch('');
                                          setPage(1);
                                      }}
                                      className="p-2 text-xs hover:bg-blue-50 text-gray-500 cursor-pointer rounded italic"
                                  >
                                      -- All Courses --
                                  </div>
                                  {coursesForSelectedExamFilter && coursesForSelectedExamFilter.filter(c => (c.name || '').toLowerCase().includes(filterCourseSearch.toLowerCase())).map(c => (
                                      <div 
                                          key={c._id} 
                                          onClick={() => {
                                              setFilters({...filters, courseId: c._id, studentId: ''});
                                              setIsFilterCourseDropdownOpen(false);
                                              setFilterCourseSearch('');
                                              setPage(1);
                                          }}
                                          className={`p-2 text-xs hover:bg-blue-50 cursor-pointer rounded ${filters.courseId === c._id ? 'bg-blue-50 text-primary font-bold' : 'text-gray-700 font-semibold'}`}
                                      >
                                          {c.name}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* Student Name Search Dropdown */}
              <div className="relative" ref={studentDropdownRef}>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Student Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterStudentDropdownOpen(!isFilterStudentDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={`truncate mr-1 ${filters.studentId ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                              {selectedStudent 
                                  ? `${[selectedStudent.firstName, selectedStudent.middleName, selectedStudent.lastName].filter(Boolean).join(' ')} (${selectedStudent.regNo || ''})`
                                  : '-- All Students --'}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                              {filters.studentId && (
                                  <span
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setFilters(f => ({ ...f, studentId: '' }));
                                          setPage(1);
                                      }}
                                      className="hover:text-red-600 p-0.5 rounded cursor-pointer text-gray-400"
                                      title="Clear Student"
                                  >
                                      <X size={14} />
                                  </span>
                              )}
                              <span className="text-gray-400 text-xs">▼</span>
                          </span>
                      </button>
                      
                      {isFilterStudentDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[250px] overflow-y-auto p-2">
                              <div className="p-1 mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="Search Student..."
                                      value={filterStudentSearch}
                                      onChange={(e) => setFilterStudentSearch(e.target.value)}
                                      className="border p-1.5 rounded text-xs w-full focus:ring-1 focus:ring-primary outline-none font-medium"
                                  />
                              </div>
                              <div className="divide-y divide-gray-100 max-h-[160px] overflow-y-auto font-medium">
                                  <div 
                                      onClick={() => {
                                          setFilters({...filters, studentId: ''});
                                          setIsFilterStudentDropdownOpen(false);
                                          setFilterStudentSearch('');
                                          setPage(1);
                                      }}
                                      className="p-2 text-xs hover:bg-blue-50 text-gray-500 cursor-pointer rounded italic"
                                  >
                                      -- All Students --
                                  </div>
                                  {studentsWithResultsFiltered && studentsWithResultsFiltered.filter(s => {
                                      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
                                      const regNo = (s.regNo || '').toLowerCase();
                                      const search = filterStudentSearch.toLowerCase();
                                      return fullName.includes(search) || regNo.includes(search);
                                  }).map(student => (
                                      <div 
                                          key={student._id} 
                                          onClick={() => {
                                              setFilters({...filters, studentId: student._id});
                                              setIsFilterStudentDropdownOpen(false);
                                              setFilterStudentSearch('');
                                              setPage(1);
                                          }}
                                          className={`p-2 text-xs hover:bg-blue-50 cursor-pointer rounded ${filters.studentId === student._id ? 'bg-blue-50 text-primary font-bold' : 'text-gray-700 font-semibold'}`}
                                      >
                                          {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')} ({student.regNo})
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex gap-2">
                  <button onClick={onReset} className="bg-gray-100 text-gray-600 px-3 py-2 rounded hover:bg-gray-200 transition-colors" title="Reset Filters"><RefreshCw size={18}/></button>
                  <button onClick={onSearch} className="bg-gray-900 text-white px-6 py-2 rounded font-bold hover:bg-black w-full transition-all flex items-center justify-center gap-2">
                      <Search size={18} /> Search
                  </button>
              </div>
          </div>

          {/* Quick Search & Summary Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              <div className="relative w-full sm:w-96">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                      type="text"
                      placeholder="Search by student, reg no, enrollment, SOM, CSR..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="border border-gray-200 pl-9 pr-8 py-1.5 rounded-lg text-xs w-full focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-medium"
                  />
                  {searchQuery && (
                      <button
                          onClick={() => { setSearchQuery(''); setPage(1); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                          <X size={14} />
                      </button>
                  )}
              </div>
              <div className="text-xs font-semibold text-gray-500 whitespace-nowrap self-end sm:self-center">
                  Showing <span className="font-bold text-gray-800">{filteredExamResults.length}</span> results
                  {filteredExamResults.length !== (examResults || []).length && (
                      <span className="text-gray-400 font-normal"> (filtered from {examResults?.length || 0} total)</span>
                  )}
              </div>
          </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-4 w-12 text-center">Sr No</th>
                        <th className="px-6 py-4">Enrollment / Reg</th>
                        <th className="px-6 py-4">SOM / CSR</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Course / Exam</th>
                        <th className="px-6 py-4 text-center">Marks</th>
                        <th className="px-6 py-4 text-center">Grade</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedData.length > 0 ? paginatedData.map((res, index) => (
                        <tr key={res._id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-4 py-4 text-center text-sm font-bold text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-gray-900">{res.student?.enrollmentNo}</div>
                                <div className="text-[10px] font-mono text-gray-400">{res.student?.regNo}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-blue-600">{formatSomNumber(res.somNumber)}</div>
                                <div className="text-[10px] text-gray-400">{formatCsrNumber(res)}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-gray-800 uppercase tracking-tight">
                                    {[res.student?.firstName, res.student?.middleName, res.student?.lastName].filter(Boolean).join(' ')}
                                </div>
                                <div className="text-[10px] text-gray-500">{res.batch}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs font-bold text-gray-600">{res.course?.name}</div>
                                <div className="text-[10px] text-blue-500 italic">{res.exam?.examName}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="text-sm font-bold text-gray-900">{res.marksObtained} / {res.totalMarks}</div>
                                <div className="text-[10px] text-gray-400">{((res.marksObtained/res.totalMarks)*100).toFixed(1)}%</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${
                                    res.grade === 'DISTINCTION' ? 'bg-green-100 text-green-700' : 
                                    res.grade === 'FIRST' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {res.grade}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => printDocument('Marksheet', res)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Marksheet">
                                        <Printer size={18} />
                                    </button>
                                    <button onClick={() => printDocument('Certificate', res)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Certificate">
                                        <Award size={18} />
                                    </button>
                                    <button onClick={() => navigate(`/master/exam-result/edit/${res._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(res)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="8" className="text-center py-16">
                            <div className="flex flex-col items-center text-gray-300">
                                <Search size={48} className="mb-2 opacity-20" />
                                <p className="italic">No exam results found matching your criteria.</p>
                            </div>
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex justify-between items-center bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Show</span>
                <select className="border rounded-lg px-2 py-1 text-sm font-bold text-gray-600" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-500 font-medium ml-2 hidden sm:inline">
                    Showing {filteredExamResults.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredExamResults.length)} of {filteredExamResults.length}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">Page {page} of {totalPages || 1}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResult;

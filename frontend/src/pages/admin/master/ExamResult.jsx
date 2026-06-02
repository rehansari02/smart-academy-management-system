import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  fetchExamSchedules, 
  fetchBatches, 
  fetchExamResults, 
  deleteExamResult 
} from '../../../features/master/masterSlice';

import { Search, RefreshCw, Edit, Printer, Award, Trash2, Plus } from 'lucide-react';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const ExamResult = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examSchedules, examResults, batches } = useSelector((state) => state.master);
  const { delete: canDelete } = useUserRights('Exam Result');

  // Local State for Filters
  const [filters, setFilters] = useState({ examName: '', courseId: '', studentId: '' });
  
  // Search dropdown states
  const [isFilterExamDropdownOpen, setIsFilterExamDropdownOpen] = useState(false);
  const [filterExamSearch, setFilterExamSearch] = useState('');
  const [isFilterCourseDropdownOpen, setIsFilterCourseDropdownOpen] = useState(false);
  const [filterCourseSearch, setFilterCourseSearch] = useState('');
  const [isFilterStudentDropdownOpen, setIsFilterStudentDropdownOpen] = useState(false);
  const [filterStudentSearch, setFilterStudentSearch] = useState('');

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchExamSchedules());
    dispatch(fetchBatches());
    dispatch(fetchExamResults());
  }, [dispatch]);

  const activeExamSchedules = useMemo(() => {
    return examSchedules.filter(e => e.isActive && !e.isDeleted && e.course && e.examName && e.attendees && e.attendees.length > 0);
  }, [examSchedules]);

  const uniqueExamNames = useMemo(() => {
    const names = new Set();
    activeExamSchedules.forEach(e => {
      if (e.examName) names.add(e.examName);
    });
    return Array.from(names);
  }, [activeExamSchedules]);

  const coursesForSelectedExamFilter = useMemo(() => {
    const coursesMap = new Map();
    activeExamSchedules
      .filter(e => !filters.examName || e.examName === filters.examName)
      .forEach(e => {
        if (e.course && e.course._id) {
          coursesMap.set(e.course._id, e.course);
        }
      });
    return Array.from(coursesMap.values());
  }, [filters.examName, activeExamSchedules]);

  const studentsWithResultsFiltered = useMemo(() => {
    const studentsMap = new Map();
    examResults.forEach(res => {
      if (filters.examName && res.exam?.examName !== filters.examName) return;
      if (filters.courseId && res.course?._id !== filters.courseId) return;
      if (res.student && res.student._id) {
          studentsMap.set(res.student._id, res.student);
      }
    });
    return Array.from(studentsMap.values());
  }, [examResults, filters.examName, filters.courseId]);

  const onSearch = () => dispatch(fetchExamResults(filters));
  const onReset = () => {
    setFilters({ examName: '', courseId: '', studentId: '' });
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
    if (window.confirm(`Are you sure you want to delete the result for ${result.student?.firstName} ${result.student?.lastName}?`)) {
      dispatch(deleteExamResult(result._id));
    }
  };

  // Client-side pagination
  const paginatedData = examResults.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(examResults.length / pageSize);

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
              <div className="relative">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Exam Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterExamDropdownOpen(!isFilterExamDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={filters.examName ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                              {filters.examName || '-- All Exams --'}
                          </span>
                          <span className="text-gray-400 text-xs">▼</span>
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
                                          }}
                                          className="p-2 text-xs hover:bg-blue-50 text-gray-700 cursor-pointer rounded font-bold"
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
              <div className="relative">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Course Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterCourseDropdownOpen(!isFilterCourseDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={filters.courseId ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                              {coursesForSelectedExamFilter.find(c => c._id === filters.courseId)?.name || '-- All Courses --'}
                          </span>
                          <span className="text-gray-400 text-xs">▼</span>
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
                                      }}
                                      className="p-2 text-xs hover:bg-blue-50 text-gray-500 cursor-pointer rounded italic"
                                  >
                                      -- All Courses --
                                  </div>
                                  {coursesForSelectedExamFilter && coursesForSelectedExamFilter.filter(c => c.name.toLowerCase().includes(filterCourseSearch.toLowerCase())).map(c => (
                                      <div 
                                          key={c._id} 
                                          onClick={() => {
                                              setFilters({...filters, courseId: c._id, studentId: ''});
                                              setIsFilterCourseDropdownOpen(false);
                                              setFilterCourseSearch('');
                                          }}
                                          className="p-2 text-xs hover:bg-blue-50 text-gray-700 cursor-pointer rounded font-bold"
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
              <div className="relative">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Student Name</label>
                  <div className="relative">
                      <button 
                          type="button"
                          onClick={() => setIsFilterStudentDropdownOpen(!isFilterStudentDropdownOpen)}
                          className="border p-2 rounded w-full text-left bg-white flex justify-between items-center text-sm min-h-[38px]"
                      >
                          <span className={filters.studentId ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                              {studentsWithResultsFiltered.find(s => s._id === filters.studentId)
                                  ? `${studentsWithResultsFiltered.find(s => s._id === filters.studentId)?.firstName} ${studentsWithResultsFiltered.find(s => s._id === filters.studentId)?.lastName} (${studentsWithResultsFiltered.find(s => s._id === filters.studentId)?.regNo})`
                                  : '-- All Students --'}
                          </span>
                          <span className="text-gray-400 text-xs">▼</span>
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
                                      }}
                                      className="p-2 text-xs hover:bg-blue-50 text-gray-500 cursor-pointer rounded italic"
                                  >
                                      -- All Students --
                                  </div>
                                  {studentsWithResultsFiltered && studentsWithResultsFiltered.filter(s => {
                                      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
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
                                          }}
                                          className="p-2 text-xs hover:bg-blue-50 text-gray-700 cursor-pointer rounded font-bold"
                                      >
                                          {student.firstName} {student.lastName} ({student.regNo})
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
                                <div className="text-sm font-medium text-blue-600">{res.somNumber}</div>
                                <div className="text-[10px] text-gray-400">{res.csrNumber}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-gray-800 uppercase tracking-tight">
                                    {res.student?.firstName} {res.student?.lastName}
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
                <select className="border rounded-lg px-2 py-1 text-sm font-bold text-gray-600" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
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

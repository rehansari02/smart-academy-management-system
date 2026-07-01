import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, resetStudentLogin, resetStatus, deleteStudent, fetchUniqueReferences } from '../../../features/student/studentSlice';
import { fetchCourses, fetchBatches, fetchBranches } from '../../../features/master/masterSlice';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Edit, Printer, FileText, Award, CheckSquare, Square, Search, RefreshCw, Plus, Lock, X, Save, Trash2 } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import SearchableDropdown from '../../../components/common/SearchableDropdown';
import { toast } from 'react-toastify';
import moment from 'moment';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import { confirmTypedDelete } from '../../../utils/confirmTypedDelete';

const StudentList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { students, pagination, isLoading, isSuccess, message, uniqueReferences } = useSelector((state) => state.students);
  const { courses, branches } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { view, add, edit, delete: canDelete } = useUserRights('Student');

  const getStudentFullName = (student) => {
    return [student?.firstName, student?.middleName, student?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ') || '-';
  };
  
  // Filter States - UPDATED KEYS TO MATCH BACKEND
  const [filters, setFilters] = useState({
    startDate: '', // Changed from fromDate
    endDate: new Date().toISOString().split('T')[0], // Changed from toDate
    courseFilter: '', // Changed from courseId
    studentName: '',
    reference: '',
    batch: '',
    branchId: '',
    pageSize: 10,
    page: 1,
    isRegistered: 'true',
    sortBy: '-admissionDate -createdAt'
  });

  // Applied Filters (Triggers API call)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Modal State for Reset Login
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetData, setResetData] = useState({ id: null, username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchBatches()); 
    dispatch(fetchUniqueReferences());
    if (user?.role === 'Super Admin') {
        dispatch(fetchBranches());
    }
  }, [dispatch, user]);

  useEffect(() => {
    dispatch(fetchStudents(appliedFilters));
  }, [dispatch, appliedFilters]); 

  // Auto-search when date, course, batch, or branch filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters({ ...filters, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [
    filters.startDate, 
    filters.endDate, 
    filters.courseFilter, 
    filters.reference,
    filters.batch, 
    filters.branchId
  ]);

  useEffect(() => {
      if(message) {
          if(isSuccess) {
              toast.success(message);
              if(showResetModal) Promise.resolve().then(() => setShowResetModal(false));
          } else {
              toast.error(message);
          }
          dispatch(resetStatus());
      }
  }, [isSuccess, message, dispatch, showResetModal]);


  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filters, page: 1 });
  };

  const handlePageChange = (newPage) => {
    const updated = { ...filters, page: newPage };
    setFilters(updated);
    setAppliedFilters(prev => ({ ...prev, page: newPage }));
  };
  
  const handlePageSizeChange = (e) => {
      const size = e.target.value;
      const updated = { ...filters, pageSize: size, page: 1 };
      setFilters(updated);
      setAppliedFilters(prev => ({ ...prev, pageSize: size, page: 1 }));
  };

  const resetFilters = () => {
    // UPDATED KEYS TO MATCH BACKEND
    const initial = {
        startDate: '', 
        endDate: new Date().toISOString().split('T')[0], 
        courseFilter: '', 
        studentName: '', 
        reference: '',
        batch: '', 
        branchId: '',
        pageSize: 10, 
        page: 1, 
        isRegistered: 'true',
        sortBy: '-admissionDate -createdAt'
    };
    setFilters(initial);
    setAppliedFilters(initial);
  };

  const handleOpenResetModal = (student) => {
      if (!edit) {
          showPermissionDenied("You don't have authority to reset student login.");
          return;
      }
      setResetData({ 
          id: student._id, 
          username: student.userId?.username || '',
          password: ''
      });
      setShowPassword(false);
      setShowResetModal(true);
  };

  const handleResetSubmit = (e) => {
      e.preventDefault();
      if(resetData.id) {
          dispatch(resetStudentLogin({ 
              id: resetData.id, 
              data: { username: resetData.username, password: resetData.password } 
          }));
      }
  };

  const handleDelete = async (student) => {
      if (!canDelete) {
          showPermissionDenied("You don't have authority to delete students.");
          return;
      }

      const fullName = getStudentFullName(student);
      const confirmed = await confirmTypedDelete({
          itemName: fullName,
          itemType: 'student',
          details: [
              student?.regNo ? `Reg No: ${student.regNo}` : '',
              student?.course?.name || student?.course?.shortName ? `Course: ${student.course?.name || student.course?.shortName}` : '',
          ],
          finalWarning: 'This will permanently delete student records, login, receipts, and related data.',
      });

      if (confirmed) {
          dispatch(deleteStudent(student._id));
      }
  };

  return (
    <div className="container mx-auto p-4">
      
      {/* --- Page Heading --- */}
      <h1 className="text-2xl font-bold text-gray-800 text-center tracking-tight mb-6">Manage Students</h1>
      
      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Search Students
        </h2>
        
        <div className="flex flex-col gap-4">
            {/* Row 1: Dates & Course */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                    {/* Updated Name to startDate */}
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                    {/* Updated Name to endDate */}
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Course</label>
                    {/* Updated Name to courseFilter */}
                    <select name="courseFilter" value={filters.courseFilter} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="">All Courses</option>
                        {courses && courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Row 2: Student Search, Reference, Batch & Branch */}
            <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                <div className="relative z-20"> 
                    <StudentSearch 
                        label="Search Student"
                        onSelect={(id, student) => {
                            if (student) {
                                const studentName = getStudentFullName(student);
                                const newFilters = { ...filters, studentName, page: 1 };
                                setFilters(newFilters);
                                setAppliedFilters(newFilters);
                            } else {
                                setFilters(prev => ({ ...prev, studentName: '', page: 1 }));
                            }
                        }}
                        additionalFilters={{ isRegistered: 'true' }}
                        placeholder="Search by Name/Reg No..."
                        className="w-full text-sm"
                    />
                </div>
                <div>
                    <SearchableDropdown 
                        label="Reference"
                        options={uniqueReferences}
                        value={filters.reference}
                        onSelect={(val) => setFilters({ ...filters, reference: val, page: 1 })}
                        placeholder="Search Reference..."
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Batch</label>
                    <input 
                        type="text" 
                        name="batch" 
                        value={filters.batch} 
                        onChange={handleFilterChange} 
                        className="w-full border p-2.5 rounded text-sm focus:ring-2 focus:ring-primary outline-none" 
                        placeholder="Enter Batch Name..."
                    />
                </div>
                {user?.role === 'Super Admin' && (
                    <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                        <select 
                            name="branchId"
                            value={filters.branchId || ''}
                            onChange={handleFilterChange}
                            className="w-full border p-2.5 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="">All Branches</option>
                            {branches && branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Row 3: Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={resetFilters} 
                    className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16}/> Reset
                </button>
                <button 
                    onClick={handleSearch} 
                    className="bg-primary text-white px-6 py-2.5 rounded hover:bg-blue-800 font-medium transition text-sm flex items-center justify-center gap-2"
                >
                    <Search size={16}/> Search
                </button>
            </div>
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show</label>
            <select name="pageSize" value={filters.pageSize} onChange={handlePageSizeChange} className="border p-1 rounded text-sm">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
            <label className="text-sm text-gray-600">entries</label>
        </div>
        <button
            type="button"
            onClick={() => {
                if (!add) {
                    showPermissionDenied("You don't have authority to add students.");
                    return;
                }
                navigate('/master/student/new');
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 shadow text-sm font-medium"
        >
            <Plus size={18}/> New Admission
        </button>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        {isLoading ? (
             <div className="p-4">
                 <TableSkeleton rows={10} cols={13} />
             </div>
        ) : (
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-2 border font-semibold w-12 text-center">Sr No</th>
              <th className="p-2 border font-semibold">Enroll No</th>
              <th className="p-2 border font-semibold">Reg No</th>
              <th className="p-2 border font-semibold">Admission Date</th>
              <th className="p-2 border font-semibold">Reg. Date</th>
              <th className="p-2 border font-semibold">Student Name</th>
              {/* <th className="p-2 border font-semibold">Father/Husband</th> */}
              {/* <th className="p-2 border font-semibold">Last Name</th> */}
              <th className="p-2 border font-semibold text-center w-36">Contact (H/S/P)</th>
              <th className="p-2 border font-semibold">Course</th>
              <th className="p-2 border font-semibold">Duration</th>
              <th className="p-2 border font-semibold">Branch</th>
              <th className="p-2 border font-semibold text-center">Result</th>
              <th className="p-2 border font-semibold text-center">Status</th>
              <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? students.map((s, index) => (
              <tr key={s._id} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                <td className="p-2 border text-center font-medium text-gray-500">{(appliedFilters.page - 1) * appliedFilters.pageSize + index + 1}</td>
                <td className="p-2 border font-bold text-gray-700">{s.enrollmentNo || '-'}</td>
                <td className="p-2 border text-blue-600 font-mono">{s.regNo || '-'}</td>
                
                <td className="p-2 border whitespace-nowrap">{moment(s.admissionDate).format('DD/MM/YYYY')}</td>
                <td className="p-2 border whitespace-nowrap">{s.registrationDate ? moment(s.registrationDate).format('DD/MM/YYYY') : '-'}</td>

                <td className="p-2 border font-medium text-gray-900">{getStudentFullName(s)}</td>
                {/* <td className="p-2 border">{s.middleName || '-'}</td>
                <td className="p-2 border">{s.lastName}</td> */}

                <td className="p-0 border align-top">
                    <div className="flex border-b border-gray-200">
                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                            {s.contactHome || '-'}
                        </div>
                    </div>
                    <div className="flex border-b border-gray-200">
                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                            {s.mobileStudent || '-'}
                        </div>
                    </div>
                    <div className="flex">
                        <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">P</div>
                        <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                            {s.mobileParent || '-'}
                        </div>
                    </div>
                </td>
                <td className="p-2 border font-semibold text-blue-800">{s.course?.name || '-'}</td>
                <td className="p-2 border">{s.course ? `${s.course.duration} ${s.course.durationType}` : '-'}</td>

                <td className="p-2 border text-gray-600">{s.branchName ? (s.branchName.endsWith(' Branch') ? s.branchName : `${s.branchName} Branch`) : 'Main'}</td>
                
                <td className="p-2 border text-center whitespace-nowrap">
                    {s.examResult ? (
                        <div className="flex justify-center gap-1">
                            <a
                                href={`/print/exam-result/${s.examResult._id}?type=Marksheet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-purple-50 text-purple-700 p-1.5 rounded border border-purple-200 hover:bg-purple-100 transition inline-flex items-center"
                                title="Marksheet"
                            >
                                <FileText size={14} />
                            </a>
                            <a
                                href={`/print/exam-result/${s.examResult._id}?type=Certificate`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-50 text-emerald-700 p-1.5 rounded border border-emerald-200 hover:bg-emerald-100 transition inline-flex items-center"
                                title="Certificate"
                            >
                                <Award size={14} />
                            </a>
                        </div>
                    ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">Pending</span>
                    )}
                </td>

                <td className="p-2 border text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        s.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>

                <td className="p-2 border text-center sticky right-0 bg-white group-hover:bg-blue-50">
                   <div className="flex justify-center gap-1">
                        <Link to={`/master/student/view/${s._id}`} className="bg-blue-50 text-blue-600 p-1 rounded border border-blue-200 hover:bg-blue-100 transition" title="View">
                            <Eye size={14}/>
                        </Link>
                        <button onClick={() => handleOpenResetModal(s)} className="bg-yellow-50 text-yellow-600 p-1 rounded border border-yellow-200 hover:bg-yellow-100 transition" title="Reset Login">
                            <Lock size={14}/>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!edit) {
                                    showPermissionDenied("You don't have authority to edit students.");
                                    return;
                                }
                                navigate(`/master/student/new?updateId=${s._id}`);
                            }}
                            className="bg-orange-50 text-orange-600 p-1 rounded border border-orange-200 hover:bg-orange-100 transition"
                            title="Update"
                        >
                            <Edit size={14}/>
                        </button>
                        <button onClick={() => handleDelete(s)} className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition" title="Delete">
                            <Trash2 size={14}/>
                        </button>
                        <Link to={`/print/admission-form/${s._id}?mode=FULL`} target="_blank" className="bg-purple-50 text-purple-600 p-1 rounded border border-purple-200 hover:bg-purple-100 transition" title="Print">
                            <Printer size={14}/>
                        </Link>
                   </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="13" className="text-center py-8 text-gray-500">No students found</td></tr>            )}
          </tbody>
        </table>
        )}
      </div>
      
      {/* Pagination Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t flex flex-col md:flex-row justify-between items-center mt-2 rounded-lg gap-4">
          <span className="text-xs text-gray-500 font-medium">Showing {students.length} of {pagination.count} records (Page {pagination.page} of {pagination.pages})</span>
          <div className="flex flex-wrap justify-center gap-1">
              <button 
                disabled={pagination.page === 1} 
                onClick={() => handlePageChange(1)} 
                className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-[10px] font-bold uppercase"
              >First</button>
              
              <button 
                disabled={pagination.page === 1} 
                onClick={() => handlePageChange(pagination.page - 1)} 
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-bold"
              >Prev</button>

              {/* Dynamic Page Numbers */}
              {[...Array(pagination.pages)].map((_, i) => {
                  const p = i + 1;
                  // Only show current, 2 before, 2 after
                  if (p === 1 || p === pagination.pages || (p >= pagination.page - 2 && p <= pagination.page + 2)) {
                      return (
                        <button 
                            key={p} 
                            onClick={() => handlePageChange(p)} 
                            className={`px-3 py-1 border rounded text-xs font-bold transition-all ${pagination.page === p ? 'bg-primary text-white border-primary shadow-md scale-110' : 'bg-white hover:bg-gray-100'}`}
                        >
                            {p}
                        </button>
                      );
                  }
                  if (p === pagination.page - 3 || p === pagination.page + 3) return <span key={p} className="px-1 text-gray-400">...</span>;
                  return null;
              })}

              <button 
                disabled={pagination.page === pagination.pages} 
                onClick={() => handlePageChange(pagination.page + 1)} 
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-bold"
              >Next</button>

              <button 
                disabled={pagination.page === pagination.pages} 
                onClick={() => handlePageChange(pagination.pages)} 
                className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-[10px] font-bold uppercase"
              >Last</button>
          </div>
      </div>

      {/* Reset Login Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Lock className="text-yellow-500"/> Reset Login Details
                </h3>
                
                <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border rounded p-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={resetData.username}
                            onChange={(e) => setResetData({...resetData, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Leave empty to keep unchanged"
                                className="w-full border rounded p-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-10"
                                value={resetData.password}
                                onChange={(e) => setResetData({...resetData, password: e.target.value})}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Existing password is encrypted. Enter new to reset.</p>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`bg-primary text-white px-4 py-2 rounded flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        >
                            <Save size={16}/> {isLoading ? 'Updating...' : 'Update Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default StudentList;

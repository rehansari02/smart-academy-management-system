import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, deleteStudent, resetStatus } from '../../../features/student/studentSlice';
import { getBranches } from '../../../features/master/branchSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Edit, Printer, Trash2, Search, RefreshCw, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import SearchableFilterInput from '../../../components/SearchableFilterInput';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const getStudentFullName = (student) => [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
const getUniqueValues = (values) => [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];

const PendingStudentRegistration = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { students, pagination = {}, isLoading, isSuccess, message } = useSelector((state) => state.students);  const { user } = useSelector((state) => state.auth);
  const { branches } = useSelector((state) => state.branch);
  const { add, edit, delete: canDelete } = useUserRights('Pending Student Registration');

  // Filters
  const [filters, setFilters] = useState({
    studentName: '',
    reference: '',
    startDate: '', 
    endDate: new Date().toISOString().split('T')[0],
    branchId: '',
    isRegistered: 'false', // Only unregistered
    isAdmissionFeesPaid: 'true', // Only those who paid admission fees
    pageNumber: 1,
    pageSize: 10
  });

  useEffect(() => {
    if (user?.role === 'Super Admin') dispatch(getBranches());
  }, [dispatch, user?.role]);

  useEffect(() => {
    dispatch(fetchStudents(filters));
  }, [dispatch, filters]);

  useEffect(() => {
      if(isSuccess && message) {
          toast.success(message);
          dispatch(resetStatus());
          // Refresh list after successful deletion
          dispatch(fetchStudents(filters));
      }
  }, [isSuccess, message, dispatch, filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, pageNumber: 1 });
  };

  const handleReset = () => {
    setFilters({
      studentName: '',
      reference: '',
      startDate: '',
      endDate: new Date().toISOString().split('T')[0],
      branchId: '',
      isRegistered: 'false',
      isAdmissionFeesPaid: 'true',
      pageNumber: 1,
      pageSize: 10
    });
  };

  const handleDelete = (id) => {
      if (!canDelete) {
          showPermissionDenied("You don't have authority to delete pending registrations.");
          return;
      }
      if (window.confirm("Are you sure you want to permanently delete this student? This action cannot be undone and will delete all associated receipts.")) {
          dispatch(deleteStudent(id));
      }
  };

  const handlePrintAll = async () => {
    const currentFilters = { ...filters };
    const printFilters = {
      ...filters,
      pageNumber: 1,
      pageSize: pagination?.count || 10000,
    };

    await dispatch(fetchStudents(printFilters));

    const restoreList = () => {
      dispatch(fetchStudents(currentFilters));
      window.removeEventListener('afterprint', restoreList);
    };

    window.addEventListener('afterprint', restoreList);
    setTimeout(() => window.print(), 100);
  };

  const handleRegister = (id) => {
    if (!add) {
      showPermissionDenied("You don't have authority to register students.");
      return;
    }
    navigate(`/transaction/student-registration-process/${id}`);
  };

  const studentNameOptions = getUniqueValues((students || []).map(getStudentFullName));
  const referenceOptions = getUniqueValues(['Direct', ...(students || []).map(s => s.reference || 'Direct')]);

  return (
    <div className="container mx-auto p-4">
      <style>{`
        .print-only-header {
          display: none !important;
        }
        @media print {
          body {
            visibility: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-table-container,
          .printable-table-container * {
            visibility: visible !important;
          }
          .printable-table-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .print-only-header {
            display: block !important;
          }
          .printable-table-container th:last-child,
          .printable-table-container td:last-child {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="relative flex justify-center items-center mb-4 border-b pb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 underline decoration-2 underline-offset-4">Pending Student Registration</h1>
          <p className="text-xs text-gray-500 mt-2">Students whose registration process is pending</p>
        </div>
        <button
          onClick={handlePrintAll}
          disabled={isLoading}
          className="absolute right-0 bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={18} /> Print All
        </button>
      </div>
      
      {/* --- Filter Section --- */}
      <div className="bg-white p-5 rounded-lg shadow mb-6 border border-gray-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Search size={18} className="text-primary" /> Search Pending Student Registration
            </h2>
            <p className="text-xs text-gray-500 mt-1">Search by student name, reference, admission date, or branch.</p>
          </div>
        </div>
        <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4`}>
            <div className="md:col-span-2">
                <SearchableFilterInput
                  label="Student Name"
                  name="studentName"
                  value={filters.studentName}
                  options={studentNameOptions}
                  onChange={handleFilterChange}
                  placeholder="Type or select student..."
                  helperText="Click to show student list, or type manually."
                />
            </div>
            <div>
                <SearchableFilterInput
                  label="Reference"
                  name="reference"
                  value={filters.reference}
                  options={referenceOptions}
                  onChange={handleFilterChange}
                  placeholder="Type or select reference..."
                />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-600 uppercase">From Date</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"/>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-600 uppercase">To Date</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"/>
            </div>
            {user?.role === 'Super Admin' && (
              <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Branch</label>
                  <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100">
                      <option value="">All Branches</option>
                      {branches?.map((branch) => (
                          <option key={branch._id} value={branch._id}>{branch.name}</option>
                      ))}
                  </select>
              </div>
            )}
            
            <div className="flex items-end gap-2">
                <button onClick={handleReset} className="h-[38px] bg-gray-100 px-4 rounded-lg hover:bg-gray-200 text-gray-700 w-full flex justify-center items-center gap-2 border"><RefreshCw size={16}/> Reset</button>
                <button onClick={() => dispatch(fetchStudents(filters))} className="h-[38px] bg-primary text-white px-4 rounded-lg hover:bg-blue-800 w-full flex justify-center items-center gap-2"><Search size={16}/> Search</button>
            </div>
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="text-blue-600"/> Pending Student Registration
            </h2>
        </div>
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show</label>
            <select name="pageSize" value={filters.pageSize} onChange={handleFilterChange} className="border p-1 rounded text-sm">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </select>
            <label className="text-sm text-gray-600">entries</label>
        </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border printable-table-container">
        <div className="print-only-header mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Pending Student Registration</h1>
          <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-GB')} | Total Records: {pagination?.count || students?.length || 0}</p>
        </div>
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-2 border font-semibold w-12 text-center">Sr No</th>
              <th className="p-2 border font-semibold">Enroll No</th>
              <th className="p-2 border font-semibold">Adm Date</th>
              <th className="p-2 border font-semibold">Student Name</th>
              {/* <th className="p-2 border font-semibold">Father/Husband</th>
              <th className="p-2 border font-semibold">Last Name</th> */}
              <th className="p-2 border font-semibold">Contact (G/H/S)</th>
                <th className="p-2 border font-semibold">Course Name</th>
              {user?.role === 'Super Admin' && (
                <th className="p-2 border font-semibold">Branch</th>
              )}
              <th className="p-2 border font-semibold">Reference</th>
              <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
                <tr><td colSpan={user?.role === 'Super Admin' ? "9" : "8"} className="p-4 text-center">Loading...</td></tr>
            ) : students.length > 0 ? students.map((s, index) => (
              <tr key={s._id} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                <td className="p-2 border text-center">{(filters.pageNumber - 1) * filters.pageSize + index + 1}</td>
                <td className="p-2 border font-bold text-gray-700">{s.enrollmentNo || '-'}</td>
                <td className="p-2 border whitespace-nowrap">{moment(s.admissionDate).format('DD/MM/YYYY')}</td>
                
                <td className="p-2 border font-medium text-gray-900">{s.firstName} {s.middleName} {s.lastName}</td>
                {/* <td className="p-2 border">{s.middleName || '-'}</td>
                <td className="p-2 border">{s.lastName}</td> */}

                <td className="p-2 border text-gray-600 leading-5">
                  <div><span className="font-bold text-gray-400">G:</span> {s.mobileParent || '-'}</div>
                  <div><span className="font-bold text-gray-400">H:</span> {s.contactHome || '-'}</div>
                  <div><span className="font-bold text-gray-400">S:</span> {s.mobileStudent || '-'}</div>
                </td>

                <td className="p-2 border font-semibold text-blue-800">{s.course?.name || '-'}</td>
                {user?.role === 'Super Admin' && (
                    <td className="p-2 border text-gray-600">{s.branchName || '-'}</td>                )}
                <td className="p-2 border">{s.reference || '-'}</td>

                <td className="p-2 border text-center sticky right-0 bg-white group-hover:bg-blue-50">
                   <div className="flex justify-center gap-1">
                        <Link to={`/master/student/view/${s._id}`} className="bg-blue-50 text-blue-600 p-1.5 rounded border border-blue-200 hover:bg-blue-100 transition" title="View">
                            <Eye size={14}/>
                        </Link>
                        
                        <button onClick={() => handleRegister(s._id)} className="bg-green-50 text-green-600 p-1.5 rounded border border-green-200 hover:bg-green-100 transition font-bold flex items-center gap-1" title="Register">
                            <CheckCircle size={14}/> 
                        </button>

                        <Link to={`/master/student/new?updateId=${s._id}&returnUrl=/transaction/pending-registration`} onClick={(e) => { if (!edit) { e.preventDefault(); showPermissionDenied("You don't have authority to edit pending registrations."); } }} className="bg-orange-50 text-orange-600 p-1.5 rounded border border-orange-200 hover:bg-orange-100 transition" title="Edit">
                            <Edit size={14}/>
                        </Link>

                        <Link to={`/print/admission-form/${s._id}?mode=REGISTRATION`} target="_blank" className="bg-purple-50 text-purple-600 p-1.5 rounded border border-purple-200 hover:bg-purple-100 transition" title="Print">
                            <Printer size={14}/>
                        </Link>

                        {user?.role === 'Super Admin' && (
                            <button onClick={() => handleDelete(s._id)} disabled={isLoading} className="bg-red-50 text-red-600 p-1.5 rounded border border-red-200 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed" title="Delete">
                                <Trash2 size={14}/>
                            </button>
                        )}
                   </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={user?.role === 'Super Admin' ? "9" : "8"} className="text-center py-8 text-gray-500">No pending registrations found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
          <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.count} records)</span>
          <div className="flex gap-1">
              <button disabled={pagination.page === 1} onClick={() => setFilters({...filters, pageNumber: pagination.page - 1})} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs">Prev</button>
              <button disabled={pagination.page === pagination.pages} onClick={() => setFilters({...filters, pageNumber: pagination.page + 1})} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs">Next</button>
          </div>
      </div>

    </div>
  );
};

export default PendingStudentRegistration;

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, deleteStudent, resetStatus } from '../../../features/student/studentSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Edit, Printer, Trash2, Search, RefreshCw, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';

const PendingStudentRegistration = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { students, pagination = {}, isLoading, isSuccess, message } = useSelector((state) => state.students);  const { user } = useSelector((state) => state.auth);
  const { employees } = useSelector((state) => state.employees) || { employees: [] };

  // Filters
  const [filters, setFilters] = useState({
    studentName: '',
    reference: '',
    startDate: '', 
    endDate: new Date().toISOString().split('T')[0],
    isRegistered: 'false', // Only unregistered
    isAdmissionFeesPaid: 'true', // Only those who paid admission fees
    pageNumber: 1,
    pageSize: 10
  });

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

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
      isRegistered: 'false',
      isAdmissionFeesPaid: 'true',
      pageNumber: 1,
      pageSize: 10
    });
  };

  const handleDelete = (id) => {
      if (window.confirm("Are you sure you want to permanently delete this student? This action cannot be undone and will delete all associated receipts.")) {
          dispatch(deleteStudent(id));
      }
  };

  const handleRegister = (id) => {
    navigate(`/transaction/student-registration-process/${id}`);
  };

  return (
    <div className="container mx-auto p-4">
      
      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Search Pending Student Registration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
                <label className="text-xs text-gray-500">Student Name</label>
                <input type="text" name="studentName" value={filters.studentName} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm" placeholder="Search name..."/>
            </div>
            <div>
                <label className="text-xs text-gray-500">Reference</label>
                <input type="text" name="reference" value={filters.reference} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm" placeholder="Search Reference..."/>
            </div>
            <div>
                <label className="text-xs text-gray-500">From Date</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
            </div>
            <div>
                <label className="text-xs text-gray-500">To Date</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
            </div>
            
            <div className="flex items-end gap-2 col-span-2 md:col-span-2">
                <button onClick={handleReset} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center items-center gap-2"><RefreshCw size={18}/> Reset</button>
                <button onClick={() => dispatch(fetchStudents(filters))} className="bg-primary text-white p-2 rounded hover:bg-blue-800 w-full flex justify-center items-center gap-2"><Search size={18}/> Search</button>
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
      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-2 border font-semibold">Enroll No</th>
              <th className="p-2 border font-semibold">Adm Date</th>
              <th className="p-2 border font-semibold">Student Name</th>
              {/* <th className="p-2 border font-semibold">Father/Husband</th>
              <th className="p-2 border font-semibold">Last Name</th> */}
              <th className="p-2 border font-semibold">Contact (Home)</th>
              <th className="p-2 border font-semibold">Contact (Student)</th>
              <th className="p-2 border font-semibold">Contact (Parent)</th>
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
                <tr><td colSpan={user?.role === 'Super Admin' ? "12" : "11"} className="p-4 text-center">Loading...</td></tr>
            ) : students.length > 0 ? students.map((s) => (
              <tr key={s._id} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                <td className="p-2 border font-bold text-gray-700">{s.enrollmentNo || '-'}</td>
                <td className="p-2 border whitespace-nowrap">{moment(s.admissionDate).format('DD/MM/YYYY')}</td>
                
                <td className="p-2 border font-medium text-gray-900">{s.firstName} {s.middleName} {s.lastName}</td>
                {/* <td className="p-2 border">{s.middleName || '-'}</td>
                <td className="p-2 border">{s.lastName}</td> */}

                <td className="p-2 border text-gray-600">{s.contactHome || '-'}</td>
                <td className="p-2 border text-gray-600">{s.mobileStudent || '-'}</td>
                <td className="p-2 border text-gray-600">{s.mobileParent || '-'}</td>

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

                        <Link to={`/master/student/new?updateId=${s._id}&returnUrl=/transaction/pending-registration`} className="bg-orange-50 text-orange-600 p-1.5 rounded border border-orange-200 hover:bg-orange-100 transition" title="Edit">
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
              <tr><td colSpan={user?.role === 'Super Admin' ? "12" : "11"} className="text-center py-8 text-gray-500">No pending registrations found</td></tr>
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
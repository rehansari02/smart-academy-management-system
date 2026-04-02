import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  fetchStudents,
  deleteStudent,
} from "../../../features/student/studentSlice";
import { fetchEmployees } from "../../../features/employee/employeeSlice";
import {
  Filter,
  Search,
  RefreshCw,
  Printer,
  Eye,
  CreditCard,
  Trash2,
  Edit,
} from "lucide-react";
import StudentSearch from "../../../components/StudentSearch";
import moment from "moment";

const PendingAdmissionFees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { students, pagination, isLoading } = useSelector(
    (state) => state.students
  );
  const { user } = useSelector((state) => state.auth);
  // Optional: Fetch employees if dynamic reference dropdown is needed, 
  // but for now we'll stick to basic standard fields or existing logic.

  // Filters State
  const [filters, setFilters] = useState({
    studentName: "",
    reference: "",
    startDate: "",
    endDate: "",
    isAdmissionFeesPaid: "false", // Show only those who haven't paid admission fees
    pageNumber: 1,
    pageSize: 10
  });

  // Load Data
  useEffect(() => {
    dispatch(fetchStudents(filters));
  }, [dispatch, filters.pageNumber, filters.pageSize]); 

  // Handlers
  const handleSearch = () => {
    dispatch(fetchStudents({ ...filters, pageNumber: 1 }));
  };

  const handleReset = () => {
    const resetFilters = {
      studentName: "",
      reference: "",
      startDate: "",
      endDate: "",
      isAdmissionFeesPaid: "false",
      pageNumber: 1,
      pageSize: 10
    };
    setFilters(resetFilters);
    dispatch(fetchStudents(resetFilters));
  };
    
  const handleFilterChange = (e) => {
      setFilters({ ...filters, [e.target.name]: e.target.value, pageNumber: 1 });
  };

  const handleDelete = (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this student record? This cannot be undone."
      )
    ) {
      dispatch(deleteStudent(id));
    }
  };

  const isSuperAdmin = user?.role === 'Super Admin';

  return (
    <div className="container mx-auto p-4">
      {/* --- Filter Section (Matching StudentList Style) --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Search Pending Admission Fees
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
             <div>
                <label className="text-xs text-gray-500">Student Name</label>
                <StudentSearch 
                    placeholder="Search Student..."
                    additionalFilters={{ isAdmissionFeesPaid: 'false' }}
                    onSelect={(id, student) => {
                    if (student) {
                        setFilters(prev => ({ ...prev, studentName: student.firstName }));
                    } else {
                        setFilters(prev => ({ ...prev, studentName: '' }));
                    }
                    }}
                    className="w-full"
                />
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
            
            <div className="flex items-end gap-2">
                <button onClick={handleReset} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center"><RefreshCw size={18}/></button>
                <button onClick={handleSearch} className="bg-primary text-white p-2 rounded hover:bg-blue-800 w-full flex justify-center">Search</button>
            </div>
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show</label>
            <select name="pageSize" value={filters.pageSize} onChange={handleFilterChange} className="border p-1 rounded text-sm">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
            <label className="text-sm text-gray-600">entries</label>
        </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-2 border font-semibold">Enrl No.</th>
              <th className="p-2 border font-semibold">Admission Date</th>
              <th className="p-2 border font-semibold">Student Name</th>
              {/* <th className="p-2 border font-semibold">Father/Husband</th>
              <th className="p-2 border font-semibold">Last Name</th> */}
              {isSuperAdmin && <th className="p-2 border font-semibold">Branch Name</th>}
              <th className="p-2 border font-semibold">Contact(Home)</th>
              <th className="p-2 border font-semibold">Contact(Student)</th>
              <th className="p-2 border font-semibold">Contact(Guardian)</th>
              <th className="p-2 border font-semibold">Course Name</th>
              <th className="p-2 border font-semibold">Reference</th>
              <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students && students.length > 0 ? students.map((s, index) => (
              <tr key={s._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                <td className="p-2 border font-bold text-gray-700">{s.enrollmentNo || '-'}</td>
                <td className="p-2 border whitespace-nowrap">{moment(s.admissionDate).format('DD/MM/YYYY')}</td>
                <td className="p-2 border font-medium text-gray-900">{s.firstName} {s.middleName} {s.lastName}</td>
                {/* <td className="p-2 border">{s.middleName || '-'}</td>
                <td className="p-2 border">{s.lastName}</td> */}
                
                {isSuperAdmin && <td className="p-2 border text-gray-600">{s.branchName ? (s.branchName.endsWith(' Branch') ? s.branchName : `${s.branchName} Branch`) : 'Main'}</td>}
                <td className="p-2 border text-gray-600">{s.contactHome || '-'}</td>
                <td className="p-2 border text-gray-600">{s.mobileStudent || '-'}</td>
                <td className="p-2 border text-gray-600">{s.mobileParent || '-'}</td>

                <td className="p-2 border font-semibold text-blue-800">{s.course?.name || '-'}</td>
                <td className="p-2 border">{s.reference || 'Direct'}</td>

                <td className="p-2 border text-center sticky right-0 bg-white">
                   <div className="flex justify-center gap-1">
                        <button 
                            onClick={() => navigate(`/transaction/admission-payment/${s._id}`)} 
                            className="bg-green-50 text-green-600 p-1 rounded border border-green-200 hover:bg-green-100 transition" 
                            title="Pay Admission Fee"
                        >
                            <CreditCard size={14}/>
                        </button>
                        
                        <Link 
                            to={`/print/admission-form/${s._id}?mode=NO_FEES`} 
                            target="_blank" 
                            className="bg-purple-50 text-purple-600 p-1 rounded border border-purple-200 hover:bg-purple-100 transition" 
                            title="Print"
                        >
                            <Printer size={14}/>
                        </Link>

                        <Link 
                            to={`/master/student/new?updateId=${s._id}`} 
                            className="bg-orange-50 text-orange-600 p-1 rounded border border-orange-200 hover:bg-orange-100 transition" 
                            title="Edit"
                        >
                            <Edit size={14}/>
                        </Link>

                        {isSuperAdmin && (
                            <button 
                                onClick={() => handleDelete(s._id)} 
                                disabled={isLoading}
                                className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Delete"
                            >
                                <Trash2 size={14}/>
                            </button>
                        )}
                   </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={isSuperAdmin ? "12" : "11"} className="text-center py-8 text-gray-500">No pending admission fees found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {pagination && (
          <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
              <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.count} records)</span>
              <div className="flex gap-1">
                  <button disabled={pagination.page === 1} onClick={() => setFilters({...filters, pageNumber: pagination.page - 1})} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs">Prev</button>
                  <button disabled={pagination.page === pagination.pages} onClick={() => setFilters({...filters, pageNumber: pagination.page + 1})} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs">Next</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default PendingAdmissionFees;

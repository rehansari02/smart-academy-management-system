import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, cancelStudent, reactivateStudent, resetStatus } from '../../../features/student/studentSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { XCircle, UserX, Search, Filter, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import StudentSearch from '../../../components/StudentSearch';

const StudentCancellation = () => {
  const dispatch = useDispatch();
  const { students, isLoading } = useSelector((state) => state.students);
  const { branches } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    branchId: '',
    studentName: '',
    courseFilter: '',
    pageNumber: 1,
    pageSize: 10, 
    includeCancelled: true
  });

  const [searchedStudents, setSearchedStudents] = useState([]);
  const [initialLoad, setInitialLoad] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch Branches and Cancelled Students
  useEffect(() => {
    if (user?.role === 'Super Admin') {
      dispatch(fetchBranches());
    }
    // Fetch all cancelled students for the list
    dispatch(fetchStudents({ branchId: filters.branchId, includeCancelled: true, isCancelled: 'true', pageSize: 1000 }));
  }, [dispatch, user, filters.branchId]);

  // Handle Search Result from StudentSearch
  const handleStudentSelect = (id, student) => {
    if (student) {
      setSearchedStudents([student]);
    } else {
      setSearchedStudents([]);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, pageNumber: 1 });
  };

  const handleSearch = () => {
    dispatch(fetchStudents({ ...filters, includeCancelled: true, isCancelled: 'true' }));
  };

  const handleCancelClick = (student) => {
    setSelectedStudent(student);
    setShowConfirmModal(true);
  };

  const handleReactivateClick = (student) => {
    dispatch(reactivateStudent(student._id)).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Student admission reactivated successfully');
        setSearchedStudents([]); // Clear
      } else {
        toast.error('Failed to reactivate student');
      }
    });
  };

  const confirmCancellation = () => {
    if (selectedStudent) {
      dispatch(cancelStudent(selectedStudent._id)).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success('Student admission cancelled successfully');
          setSearchedStudents([]); // Clear current selection
          // Optional: You might want to refresh the cancelled list, 
          // but since we are not fetching all students, we just clear the active selection.
          dispatch(fetchStudents({ branchId: filters.branchId, includeCancelled: true, isCancelled: 'true', pageSize: 1000 })); 
        } else {
          toast.error('Failed to cancel student admission');
        }
        setShowConfirmModal(false);
        setSelectedStudent(null);
      });
    }
  };

  // Separate active and cancelled students
  const activeStudents = students.filter(s => !s.isCancelled);
  const cancelledStudents = students.filter(s => s.isCancelled);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <XCircle className="text-red-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Student Cancellation</h2>
            <p className="text-sm text-gray-500">Process student admission cancellations</p>
          </div>
        </div>

        {/* Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-1">
             <StudentSearch 
               label="Search Student (Active or Cancelled)"
               placeholder="Type name or reg no..."
               onSelect={handleStudentSelect}
               additionalFilters={{ branchId: filters.branchId }}
               includeCancelled={true}
             />
          </div>
          {user?.role === 'Super Admin' && (
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-1 block">Branch Filter (For Search)</label>
              <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                <option value="">All Branches</option>
                {branches && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setSearchedStudents([])} className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300 font-medium transition flex items-center gap-1">
            <RefreshCw size={16} /> Reset Search
          </button>
        </div>
      </div>

      {/* Active Students Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="text-blue-500" size={24} /> Search Results
        </h3>
        {searchedStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border text-left">Reg. No.</th>
                  <th className="p-3 border text-left">Name</th>
                  <th className="p-3 border text-left">Course</th>
                  <th className="p-3 border text-left">Admission Date</th>
                  <th className="p-3 border text-left">Mobile</th>
                  <th className="p-3 border text-left">Status</th>
                  <th className="p-3 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {searchedStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="p-3 border">{student.regNo || '-'}</td>
                    <td className="p-3 border font-medium">{student.firstName} {student.middleName} {student.lastName}</td>
                    <td className="p-3 border">{student.course?.shortName || student.course?.name || '-'}</td>
                    <td className="p-3 border">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</td>
                    <td className="p-3 border">{student.mobileParent || '-'}</td>
                    <td className="p-3 border">
                      {student.isCancelled ? (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase">Cancelled</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="p-3 border text-center">
                      {student.isCancelled ? (
                        <button
                          onClick={() => handleReactivateClick(student)}
                          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <CheckCircle size={14} /> Active (Reactivate)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelClick(student)}
                          className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <XCircle size={14} /> Cancel Admission
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8 italic font-medium">Use the search box above to find a student to manage their admission status.</p>
        )}
      </div>

      {/* Cancelled Students Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" size={24} /> All Cancelled Students
        </h3>
        {cancelledStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border text-left">Reg. No.</th>
                  <th className="p-3 border text-left">Name</th>
                  <th className="p-3 border text-left">Course</th>
                  <th className="p-3 border text-left">Cancellation Date</th>
                  <th className="p-3 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {cancelledStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 bg-red-50">
                    <td className="p-3 border">{student.regNo || '-'}</td>
                    <td className="p-3 border font-medium">{student.firstName} {student.middleName} {student.lastName}</td>
                    <td className="p-3 border">{student.course?.shortName || student.course?.name || '-'}</td>
                    <td className="p-3 border">{student.cancelledDate ? new Date(student.cancelledDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-3 border text-center">
                       <button
                          onClick={() => handleReactivateClick(student)}
                          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <CheckCircle size={14} /> Active
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No cancelled students found.</p>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Confirm Cancellation</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel the admission for <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong>?
              This action cannot be undone and the student will be marked as cancelled.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCancellation}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCancellation;

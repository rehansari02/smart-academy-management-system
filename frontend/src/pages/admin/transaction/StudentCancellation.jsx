import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudents, cancelStudent, resetStatus } from '../../../features/student/studentSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { XCircle, UserX, Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const StudentCancellation = () => {
  const dispatch = useDispatch();
  const { students, isLoading } = useSelector((state) => state.students);
  const { branches } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);

  // Filter State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    branchId: '',
    studentName: '',
    courseFilter: '',
    pageNumber: 1,
    pageSize: 1000, // Large page size for all students
    includeCancelled: true // Include cancelled students in this page
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch Initial Data
  useEffect(() => {
    dispatch(fetchStudents({ ...filters, includeCancelled: true })); // Include cancelled for this page
    if (user?.role === 'Super Admin') {
      dispatch(fetchBranches());
    }
  }, [dispatch, user, filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, pageNumber: 1 });
  };

  const handleSearch = () => {
    dispatch(fetchStudents({ ...filters, includeCancelled: true }));
  };

  const handleCancelClick = (student) => {
    setSelectedStudent(student);
    setShowConfirmModal(true);
  };

  const confirmCancellation = () => {
    if (selectedStudent) {
      dispatch(cancelStudent(selectedStudent._id)).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          toast.success('Student admission cancelled successfully');
          dispatch(fetchStudents({ ...filters, includeCancelled: true })); // Refresh list
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">From Date</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">To Date</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" />
          </div>
          {user?.role === 'Super Admin' && (
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-1 block">Branch</label>
              <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none">
                <option value="">All Branches</option>
                {branches && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Student Name</label>
            <input type="text" name="studentName" value={filters.studentName} onChange={handleFilterChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Search by name..." />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold shadow transition flex items-center gap-2">
            <Search size={18} /> Search
          </button>
        </div>
      </div>

      {/* Active Students Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserX className="text-orange-500" size={24} /> Active Students
        </h3>
        {activeStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border text-left">Reg. No.</th>
                  <th className="p-3 border text-left">Name</th>
                  <th className="p-3 border text-left">Course</th>
                  <th className="p-3 border text-left">Admission Date</th>
                  <th className="p-3 border text-left">Mobile</th>
                  <th className="p-3 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="p-3 border">{student.regNo || '-'}</td>
                    <td className="p-3 border font-medium">{student.firstName} {student.middleName} {student.lastName}</td>
                    <td className="p-3 border">{student.course?.shortName || student.course?.name || '-'}</td>
                    <td className="p-3 border">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</td>
                    <td className="p-3 border">{student.mobileParent || '-'}</td>
                    <td className="p-3 border text-center">
                      <button
                        onClick={() => handleCancelClick(student)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs font-medium"
                      >
                        Cancel Admission
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No active students found.</p>
        )}
      </div>

      {/* Cancelled Students Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" size={24} /> Cancelled Students
        </h3>
        {cancelledStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border text-left">Reg. No.</th>
                  <th className="p-3 border text-left">Name</th>
                  <th className="p-3 border text-left">Course</th>
                  <th className="p-3 border text-left">Admission Date</th>
                  <th className="p-3 border text-left">Cancellation Date</th>
                </tr>
              </thead>
              <tbody>
                {cancelledStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 bg-red-50">
                    <td className="p-3 border">{student.regNo || '-'}</td>
                    <td className="p-3 border font-medium">{student.firstName} {student.middleName} {student.lastName}</td>
                    <td className="p-3 border">{student.course?.shortName || student.course?.name || '-'}</td>
                    <td className="p-3 border">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</td>
                    <td className="p-3 border">{student.cancelledDate ? new Date(student.cancelledDate).toLocaleDateString() : 'N/A'}</td>
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

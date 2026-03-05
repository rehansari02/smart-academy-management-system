import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExamRequests, cancelExamRequest, fetchCourses } from '../../../features/master/masterSlice';
import { Search, RefreshCw, XCircle } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import { toast } from 'react-toastify';

const ExamRequestList = () => {
  const dispatch = useDispatch();
  
  // Redux Data
  const { examRequests, courses, isLoading } = useSelector((state) => state.master);

  // Local Filter State
  const [filters, setFilters] = useState({
    studentId: '',
    courseId: ''
  });

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchExamRequests());
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(fetchExamRequests(filters));
  };

  const handleReset = () => {
    setFilters({ studentId: '', courseId: '' });
    dispatch(fetchExamRequests());
  };

  const handleCancel = (id) => {
    if (window.confirm("Are you sure you want to cancel this exam request?")) {
        dispatch(cancelExamRequest(id));
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Exam Request List</h2>

      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded shadow mb-6 border-t-4 border-primary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Student Filter */}
          {/* Student Filter */}
          <div>
            <StudentSearch 
                label="Select Registered Student"
                onSelect={(id) => setFilters({...filters, studentId: id})}
                defaultSelectedId={filters.studentId}
                additionalFilters={{ isRegistered: 'true' }} // Filter only registered students
            />
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Select Course</label>
            <select 
                className="border p-2 rounded w-full text-sm"
                value={filters.courseId}
                onChange={(e) => setFilters({...filters, courseId: e.target.value})}
            >
                <option value="">-- All Courses --</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button onClick={handleReset} className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-1 hover:bg-gray-300">
                <RefreshCw size={16}/> Reset
            </button>
            <button onClick={handleSearch} className="bg-primary text-white px-6 py-2 rounded flex items-center gap-1 hover:bg-blue-700">
                <Search size={16}/> Search
            </button>
          </div>
        </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Serial No</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Admission Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reg Number</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
            ) : examRequests.length > 0 ? (
                examRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-700">{req.examSerialNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            {req.student?.admissionDate ? new Date(req.student.admissionDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{req.student?.regNo}</td>
                        <td className="px-6 py-4 text-sm font-medium text-primary">
                            {req.student?.firstName} {req.student?.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{req.student?.course?.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{req.student?.course?.duration}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            {req.student?.mobileStudent || req.student?.mobileParent}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button 
                                onClick={() => handleCancel(req._id)}
                                disabled={isLoading}
                                className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold border border-red-200 flex items-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircle size={14} /> Cancel
                            </button>
                        </td>
                    </tr>
                ))
            ) : (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500 italic">No pending exam requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamRequestList;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExamRequests, cancelExamRequest, fetchCourses } from '../../../features/master/masterSlice';
import { Search, RefreshCw, XCircle } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import { toast } from 'react-toastify';

const ExamRequestList = () => {
  const dispatch = useDispatch();
  
  // Redux Data
  const { examRequests, courses, isLoading } = useSelector((state) => state.master);

  const [filters, setFilters] = useState({
    studentId: '',
    courseId: ''
  });
  const [cancelModal, setCancelModal] = useState({ show: false, requestId: null, reason: '' });
  const [selectedRequests, setSelectedRequests] = useState([]);
  const navigate = useNavigate();

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
    setCancelModal({ show: true, requestId: id, reason: '' });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
        setSelectedRequests(examRequests.map(r => r._id));
    } else {
        setSelectedRequests([]);
    }
  };

  const handleSelectRequest = (id) => {
    setSelectedRequests(prev => 
        prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleScheduleExam = () => {
    if (selectedRequests.length === 0) return;
    
    // Check if all selected requests belong to the same course
    const selectedData = examRequests.filter(r => selectedRequests.includes(r._id));
    const courseIds = [...new Set(selectedData.map(r => r.student?.course?._id))];
    
    if (courseIds.length > 1) {
        toast.warning("Please select students from the same course to schedule together.");
        return;
    }

    navigate('/master/exam-schedule', { 
        state: { 
            selectedStudentIds: selectedData.map(r => r.student?._id),
            courseId: courseIds[0],
            fromRequest: true
        } 
    });
  };

  const confirmCancel = () => {
    if (!cancelModal.reason.trim()) {
        toast.error("Please provide a reason for cancellation");
        return;
    }
    dispatch(cancelExamRequest({ id: cancelModal.requestId, data: { reason: cancelModal.reason } }))
        .then((res) => {
            if (!res.error) {
                toast.success("Exam request cancelled");
                setCancelModal({ show: false, requestId: null, reason: '' });
                dispatch(fetchExamRequests());
            }
        });
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
              <th className="px-6 py-3 text-left">
                  <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary h-4 w-4"
                      onChange={handleSelectAll}
                      checked={selectedRequests.length === examRequests.length && examRequests.length > 0}
                  />
              </th>
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
            ) : examRequests.filter(r => r.status === 'Pending').length > 0 ? (
                examRequests.filter(r => r.status === 'Pending').map((req, index) => (
                    <tr key={req._id || index} className={`hover:bg-gray-50 ${selectedRequests.includes(req._id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-6 py-4">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-primary h-4 w-4"
                                checked={selectedRequests.includes(req._id)}
                                onChange={() => handleSelectRequest(req._id)}
                            />
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{index + 1}</td>
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

      {/* --- Bulk Action Bar --- */}
      {selectedRequests.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-blue-200 shadow-2xl rounded-full px-8 py-4 flex items-center gap-6 animate-slideUp z-50">
              <span className="text-sm font-bold text-blue-800">{selectedRequests.length} Students Selected</span>
              <button 
                onClick={handleScheduleExam}
                className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                  Schedule Exam for Selection
              </button>
          </div>
      )}

      {/* --- Cancellation Reason Modal --- */}
      {cancelModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-100 animate-fadeIn">
                <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2">
                    <XCircle className="text-red-500" /> Cancel Exam Request
                </h3>
                <p className="text-gray-500 text-sm mb-4">Please provide a reason for cancelling this request. This will be visible on the pending list.</p>
                
                <textarea 
                    className="w-full border rounded-lg p-3 text-sm focus:ring-primary outline-none min-h-[100px] mb-4"
                    placeholder="Enter cancellation reason here..."
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal({...cancelModal, reason: e.target.value})}
                ></textarea>

                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setCancelModal({ show: false, requestId: null, reason: '' })}
                        className="px-4 py-2 rounded font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={confirmCancel}
                        className="px-6 py-2 rounded font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all"
                    >
                        Confirm Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExamRequestList;
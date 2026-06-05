import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCancelledStudents, deleteStudent } from '../../../features/student/studentSlice';
import { fetchBranches } from '../../../features/master/masterSlice';
import { UserX, Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const CONFIRM_STEPS = [
  { title: 'First Confirmation', message: 'Are you sure you want to permanently delete this student?' },
  { title: 'Second Confirmation', message: 'This action cannot be undone. Are you absolutely sure?' },
  { title: 'Final Confirmation', message: 'This will permanently delete all data including receipts, user account, and records. Continue?' },
];

const CancelledStudents = () => {
  const dispatch = useDispatch();
  const { cancelledStudents, cancelledPagination, isLoading } = useSelector((state) => state.students);
  const { branches } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { delete: canDelete } = useUserRights('Student');

  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchCancelledStudents({ page, limit, branchId }));
  }, [dispatch, page, branchId]);

  useEffect(() => {
    if (user?.role === 'Super Admin') {
      dispatch(fetchBranches());
    }
  }, [dispatch, user]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (cancelledPagination.pages || 1)) {
      setPage(newPage);
    }
  };

  const handleDeleteClick = (student) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete students.");
      return;
    }
    setDeleteTarget(student);
    setConfirmStep(0);
    setTypedName('');
    setShowDeleteModal(true);
  };

  const handleNextConfirm = () => {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1);
    } else {
      // Final step: must type the exact student name
      // When confirm step is 2 and we press "Next", we move to name entry
      setConfirmStep(3);
    }
  };

  const handleFinalDelete = () => {
    if (!deleteTarget) return;
    
    const fullName = `${deleteTarget.firstName} ${deleteTarget.middleName ? deleteTarget.middleName + ' ' : ''}${deleteTarget.lastName}`.trim();
    if (typedName.trim() !== fullName) {
      toast.error('Student name does not match. Please type the exact full name.');
      return;
    }

    setIsDeleting(true);
    dispatch(deleteStudent(deleteTarget._id)).then((result) => {
      setIsDeleting(false);
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Student permanently deleted successfully');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        setTypedName('');
        setConfirmStep(0);
        // Refresh the list
        dispatch(fetchCancelledStudents({ page, limit, branchId }));
      } else {
        toast.error(result.payload || 'Failed to delete student');
      }
    });
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setTypedName('');
      setConfirmStep(0);
    }
  };

  // Filter by search
  const filteredStudents = search
    ? cancelledStudents.filter(s => {
        const name = `${s.firstName} ${s.middleName || ''} ${s.lastName}`.toLowerCase();
        const reg = (s.regNo || '').toLowerCase();
        const enroll = (s.enrollmentNo || '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || reg.includes(q) || enroll.includes(q);
      })
    : cancelledStudents;

  const totalPages = cancelledPagination.pages || 1;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <UserX className="text-red-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Cancelled Students</h2>
            <p className="text-sm text-gray-500">
              Showing {cancelledPagination.count || 0} total cancelled students
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or reg no..."
                className="w-full border rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          {user?.role === 'Super Admin' && (
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">All Branches</option>
                {branches && branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-red-600 text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3 border border-red-700 font-semibold">#</th>
                <th className="p-3 border border-red-700 font-semibold">Reg No.</th>
                <th className="p-3 border border-red-700 font-semibold">Student Name</th>
                <th className="p-3 border border-red-700 font-semibold">Course</th>
                <th className="p-3 border border-red-700 font-semibold">Branch</th>
                <th className="p-3 border border-red-700 font-semibold">Cancelled Date</th>
                <th className="p-3 border border-red-700 font-semibold">Reason</th>
                <th className="p-3 border border-red-700 font-semibold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-500 font-medium">
                    {search ? 'No cancelled students match your search.' : 'No cancelled students found.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student._id} className="hover:bg-red-50 border-b border-gray-200 transition-colors bg-red-50/30">
                    <td className="p-3 border border-gray-200 text-gray-500 font-medium">{index + 1 + (page - 1) * limit}</td>
                    <td className="p-3 border border-gray-200 font-mono text-blue-600 font-bold">{student.regNo || '-'}</td>
                    <td className="p-3 border border-gray-200 font-semibold text-gray-800">
                      {student.firstName} {student.middleName || ''} {student.lastName}
                    </td>
                    <td className="p-3 border border-gray-200">{student.course?.name || student.course?.shortName || '-'}</td>
                    <td className="p-3 border border-gray-200 text-gray-600">{student.branchId?.name || '-'}</td>
                    <td className="p-3 border border-gray-200 whitespace-nowrap">
                      {student.cancelledDate ? new Date(student.cancelledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="p-3 border border-gray-200">
                      {student.cancellationReason ? (
                        <span 
                          className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium inline-block max-w-[200px] truncate"
                          title={student.cancellationReason}
                        >
                          {student.cancellationReason}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No reason</span>
                      )}
                    </td>
                    <td className="p-3 border border-gray-200 text-center">
                      <button
                        onClick={() => handleDeleteClick(student)}
                        disabled={isLoading}
                        className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all inline-flex items-center gap-1 text-xs font-bold shadow-sm hover:shadow-md"
                        title="Permanently Delete"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-gray-500 font-medium">
            Showing {filteredStudents.length} of {cancelledPagination.count} records 
            (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(1)}
              className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 text-[10px] font-bold uppercase transition"
            >
              First
            </button>
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-gray-700 px-3">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 transition"
            >
              <ChevronRight size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-100 disabled:opacity-40 text-[10px] font-bold uppercase transition"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Triple Confirm + Name Entry Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {confirmStep === 3 ? 'Type Name to Confirm' : CONFIRM_STEPS[confirmStep]?.title || 'Confirm Delete'}
                </h3>
                <p className="text-sm text-gray-500">Step {Math.min(confirmStep + 1, 4)} of 4</p>
              </div>
            </div>

            {/* Confirmation steps (1-3) */}
            {confirmStep < 3 && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-sm">
                    {CONFIRM_STEPS[confirmStep]?.message}
                  </p>
                  <div className="mt-3 p-3 bg-white rounded border border-red-100">
                    <p className="font-bold text-gray-800">
                      {deleteTarget.firstName} {deleteTarget.middleName || ''} {deleteTarget.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Reg No: {deleteTarget.regNo || '-'} | Course: {deleteTarget.course?.name || deleteTarget.course?.shortName || '-'}</p>
                    <p className="text-xs text-gray-500">Reason: {deleteTarget.cancellationReason || 'No reason'}</p>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex gap-2 mb-4">
                  {[0, 1, 2].map((step) => (
                    <div 
                      key={step} 
                      className={`flex-1 h-2 rounded-full transition-all ${
                        step < confirmStep ? 'bg-red-500' : 
                        step === confirmStep ? 'bg-red-400 animate-pulse' : 
                        'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeDeleteModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNextConfirm}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold flex items-center gap-2"
                  >
                    {confirmStep === 2 ? 'Next - Type Name' : 'Yes, Continue'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Type student name to confirm */}
            {confirmStep === 3 && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Final Step: Type the student's full name below to confirm permanent deletion.
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    All data including receipts, user account, and records will be permanently removed.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Type student name to confirm: <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Type: <strong>{deleteTarget.firstName} {deleteTarget.middleName || ''} {deleteTarget.lastName}</strong>
                  </p>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Type the full name here..."
                    className="w-full border-2 border-red-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    autoFocus
                    disabled={isDeleting}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalDelete}
                    disabled={typedName.trim() !== `${deleteTarget.firstName} ${deleteTarget.middleName ? deleteTarget.middleName + ' ' : ''}${deleteTarget.lastName}`.trim() || isDeleting}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} /> Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledStudents;

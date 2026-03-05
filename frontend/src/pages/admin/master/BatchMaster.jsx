import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchBatches, createBatch, updateBatch, deleteBatch, 
    fetchCourses, fetchEmployees, resetMasterStatus, fetchBranches 
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Search, Plus, X, Clock, Users, Edit2, Trash2, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';

const BatchMaster = () => {
  const dispatch = useDispatch();
  const { batches, courses, employees, branches, isSuccess, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]); // Array of Course IDs

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  // --- Search & Pagination State ---
  const [filters, setFilters] = useState({
    startDate: '', 
    endDate: new Date().toISOString().split('T')[0], 
    searchBy: 'Batch Name', 
    searchValue: ''
  });
  
  // Applied filters determines what is actually shown/fetched
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchEmployees());
    if (user?.role === 'Super Admin') dispatch(fetchBranches());
    // Initial fetch
    dispatch(fetchBatches(appliedFilters));
  }, [dispatch, user]); // Only on mount/user change, manual refetch handled in handleSearch

  const handleSearch = () => { 
      setAppliedFilters(filters);
      setCurrentPage(1); // Reset to first page on new search
      dispatch(fetchBatches(filters));
  };
  
  const handleReset = () => {
    const initialFilters = { 
        startDate: '', 
        endDate: '', 
        searchBy: 'Batch Name', 
        searchValue: '' 
    };
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
    dispatch(fetchBatches({}));
  };

  useEffect(() => {
    if (isSuccess && showForm) {
        toast.success(isEditing ? "Batch Updated" : "Batch Created");
        dispatch(resetMasterStatus());
        closeForm();
        dispatch(fetchBatches(appliedFilters));
    } else if (isSuccess && !showForm) {
        // Handle delete success
        toast.success("Batch Deleted");
        dispatch(resetMasterStatus());
        dispatch(fetchBatches(appliedFilters));
    }
  }, [isSuccess, showForm, dispatch, appliedFilters, isEditing]);

  const closeForm = () => {
      reset();
      setSelectedCourses([]);
      setIsEditing(false);
      setCurrentBatchId(null);
      setShowForm(false);
  };

  const handleEdit = (batch) => {
      setValue('name', batch.name);
      setValue('batchSize', batch.batchSize);
      setValue('startTime', batch.startTime);
      setValue('endTime', batch.endTime);
      setValue('faculty', batch.faculty?._id);
      
      // Handle Date formatting for input type="date"
      const sDate = new Date(batch.startDate).toISOString().split('T')[0];
      const eDate = new Date(batch.endDate).toISOString().split('T')[0];
      setValue('startDate', sDate);
      setValue('endDate', eDate);
      if (batch.branchId) setValue('branchId', batch.branchId._id); // Set branch if exists

      // Pre-select courses
      const courseIds = batch.courses ? batch.courses.map(c => c._id) : [];
      setSelectedCourses(courseIds);

      setCurrentBatchId(batch._id);
      setIsEditing(true);
      setShowForm(true);
  };

  const handleDelete = (id) => {
      if(window.confirm('Are you sure you want to delete this batch?')) {
          dispatch(deleteBatch(id));
      }
  };

  const toggleCourseSelection = (courseId) => {
      if (selectedCourses.includes(courseId)) {
          setSelectedCourses(selectedCourses.filter(id => id !== courseId));
      } else {
          setSelectedCourses([...selectedCourses, courseId]);
      }
  };

  const toggleSelectAll = () => {
      if (selectedCourses.length === courses.length && courses.length > 0) {
          setSelectedCourses([]);
      } else {
          setSelectedCourses(courses.map(c => c._id));
      }
  };

  const onSubmit = (data) => { 
      if (selectedCourses.length === 0) {
          toast.error("Please select at least one course");
          return;
      }
      const payload = { ...data, courses: selectedCourses };
      
      if (isEditing) {
          dispatch(updateBatch({ id: currentBatchId, data: payload }));
      } else {
          dispatch(createBatch(payload)); 
      }
  };

  // Filter only Faculty for dropdown
  const facultyList = employees.filter(e => e.type === 'Faculty');

  // Frontend Pagination Logic
  // Since the API returns ALL batches for the filter (simplistic backend), we paginate here.
  // If backend was paginated, we would send page params to API.
  // Assuming 'batches' is the filtered list from backend.
  const paginatedBatches = batches ? batches.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];
  const totalPages = batches ? Math.ceil(batches.length / pageSize) : 0;

  return (
    <div className="container mx-auto p-4">
      
      {/* --- Page Heading --- */}
      <h1 className="text-2xl font-bold text-gray-800 text-center tracking-tight mb-6">Manage Batches</h1>

      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Filter Batches
        </h2>
        
        <div className="flex flex-col gap-4">
            {/* Row 1: Dates & Search By & Value */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Start Date (From)</label>
                    <input 
                        type="date" 
                        value={filters.startDate} 
                        onChange={e => setFilters({...filters, startDate: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">End Date (To)</label>
                    <input 
                        type="date" 
                        value={filters.endDate} 
                        onChange={e => setFilters({...filters, endDate: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Search By</label>
                    <select 
                        value={filters.searchBy} 
                        onChange={e => setFilters({...filters, searchBy: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option>Batch Name</option>
                        <option>Faculty Name</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Value</label>
                    <input 
                        type="text" 
                        placeholder="Search..."
                        value={filters.searchValue} 
                        onChange={e => setFilters({...filters, searchValue: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
            </div>

            {/* Row 2: Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={handleReset} 
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
            <select 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} 
                className="border p-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
            <label className="text-sm text-gray-600">entries</label>
        </div>
        <button 
            onClick={() => setShowForm(true)} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 shadow text-sm font-medium"
        >
            <Plus size={18}/> Add New Batch
        </button>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        {isLoading ? (
             <div className="p-4"><TableSkeleton rows={8} cols={7} /></div>
        ) : (
        <table className="w-full border-collapse min-w-[1200px]">
            <thead>
                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                    <th className="p-2 border font-semibold">Batch Name</th>
                    {user?.role === 'Super Admin' && (
                        <th className="p-2 border font-semibold">Branch</th>
                    )}
                    <th className="p-2 border font-semibold">Timing</th>
                    <th className="p-2 border font-semibold">Employee</th>
                    <th className="p-2 border font-semibold text-center">Start Date</th>
                    <th className="p-2 border font-semibold text-center">End Date</th>
                    <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-24">Actions</th>
                </tr>
            </thead>
            <tbody>
                {paginatedBatches && paginatedBatches.length > 0 ? paginatedBatches.map((batch) => (
                    <tr key={batch._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                        <td className="p-2 border font-medium text-gray-900">
                            {batch.name}
                        </td>
                        {user?.role === 'Super Admin' && (
                            <td className="p-2 border text-gray-600">
                                {batch.branchId?.name || <span className="text-gray-400 italic">Global/Main</span>}
                            </td>
                        )}
                        <td className="p-2 border text-gray-600">
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                <Clock size={12} className="text-gray-500"/> {batch.startTime} - {batch.endTime}
                            </div>
                        </td>
                        <td className="p-2 border">
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 text-[10px] flex items-center gap-1 w-fit font-semibold">
                                <Users size={12}/> {batch.faculty?.name || 'Unassigned'}
                            </span>
                        </td>
                        <td className="p-2 border text-center text-gray-600">{new Date(batch.startDate).toLocaleDateString('en-GB')}</td>
                        <td className="p-2 border text-center text-gray-600">{new Date(batch.endDate).toLocaleDateString('en-GB')}</td>
                        <td className="p-2 border text-center sticky right-0 bg-white">
                            <div className="flex justify-center gap-1">
                                <button onClick={() => handleEdit(batch)} className="bg-blue-50 text-blue-600 p-1 rounded border border-blue-200 hover:bg-blue-100 transition" title="Edit">
                                    <Edit2 size={14}/>
                                </button>
                                <button onClick={() => handleDelete(batch._id)} className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition" title="Delete">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan="7" className="text-center py-8 text-gray-400">No batches found.</td></tr>
                )}
            </tbody>
        </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && batches && batches.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
              <span className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages} ({batches.length} records)
              </span>
              <div className="flex gap-1">
                  <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
                  >
                      Prev
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                       <button 
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 border rounded text-xs ${currentPage === i + 1 ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-100'}`}
                       >
                           {i + 1}
                       </button>
                  ))}
                  <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}

      {/* --- ADD/EDIT BATCH MODAL --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden animate-fadeIn h-[90vh] flex flex-col">
                <div className="bg-primary text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>} 
                        {isEditing ? 'Update Batch' : 'Create New Batch'}
                    </h2>
                    <button onClick={closeForm} className="text-white hover:text-red-200 transition"><X size={24}/></button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1">
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Batch Name */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Batch Name <span className="text-red-500">*</span></label>
                            <input {...register('name', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Morning Batch A"/>
                        </div>

                        {/* Branch Selection (Super Admin Only) */}
                        {user?.role === 'Super Admin' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Branch (Optional)</label>
                            <select {...register('branchId')} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none">
                                <option value="">Global / Head Office</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name} ({b.city})</option>
                                ))}
                            </select>
                        </div>
                        )}

                        {/* Faculty */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Faculty <span className="text-red-500">*</span></label>
                            <select {...register('faculty', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none">
                                <option value="">Select Faculty</option>
                                {facultyList.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                            </select>
                        </div>

                        {/* Size */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Batch Size</label>
                            <input type="number" {...register('batchSize')} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. 30"/>
                        </div>

                        {/* Dates */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date <span className="text-red-500">*</span></label>
                            <input type="date" {...register('startDate', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Date <span className="text-red-500">*</span></label>
                            <input type="date" {...register('endDate', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                        </div>

                        {/* Timing */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Time <span className="text-red-500">*</span></label>
                            <input type="time" {...register('startTime', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Time <span className="text-red-500">*</span></label>
                            <input type="time" {...register('endTime', {required: true})} className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"/>
                        </div>

                        {/* Course List Selection */}
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Select Courses for Batch <span className="text-red-500">*</span></label>
                            <div className="max-h-40 overflow-y-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-10 text-center">
                                                <div 
                                                    onClick={toggleSelectAll}
                                                    className="cursor-pointer text-primary inline-flex"
                                                    title="Select All"
                                                >
                                                     {selectedCourses.length === courses.length && courses.length > 0
                                                        ? <CheckSquare size={18} /> 
                                                        : <Square size={18} className="text-gray-400" />
                                                     }
                                                </div>
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Course Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {courses.map(course => (
                                            <tr key={course._id} className={selectedCourses.includes(course._id) ? "bg-blue-50" : ""}>
                                                <td className="px-4 py-2 text-center">
                                                    <div 
                                                        onClick={() => toggleCourseSelection(course._id)}
                                                        className="cursor-pointer text-primary"
                                                    >
                                                        {selectedCourses.includes(course._id) 
                                                            ? <CheckSquare size={18} /> 
                                                            : <Square size={18} className="text-gray-400" />
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{course.name}</td>
                                                <td className="px-4 py-2 text-xs text-gray-500">{course.courseType}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{selectedCourses.length} courses selected</p>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={closeForm} disabled={isLoading} className="px-4 py-2 border rounded hover:bg-gray-100 text-sm font-medium disabled:opacity-70">Cancel</button>
                    <button type="button" onClick={() => {reset(); setSelectedCourses([])}} disabled={isLoading} className="px-4 py-2 border text-orange-600 border-orange-200 hover:bg-orange-50 text-sm font-medium disabled:opacity-70">Reset</button>
                    <button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 shadow text-sm font-bold transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? <Clock className="animate-spin" size={16}/> : null}
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Batch' : 'Save Batch')}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default BatchMaster;
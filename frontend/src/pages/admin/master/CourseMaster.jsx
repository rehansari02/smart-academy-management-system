import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchCourses, createCourse, updateCourse, deleteCourse, 
    fetchSubjects, resetMasterStatus 
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Search, Plus, X, Edit2, Trash2, BookOpen, Check, Layers, Eye, Upload, RefreshCw, Clock } from 'lucide-react';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';

const CourseMaster = () => {
  const dispatch = useDispatch();
  const { courses, subjects, isSuccess, isLoading } = useSelector((state) => state.master);
  
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  
  // Subject Selection State: { subjectId: sortOrder }
  const [selectedSubjectMap, setSelectedSubjectMap] = useState({});
  const [viewingSubjects, setViewingSubjects] = useState(null); // For viewing subjects in table
  const [previewImage, setPreviewImage] = useState(null); // Image Preview State

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  
  // --- Filter & Pagination State ---
  const [filters, setFilters] = useState({ courseId: '', courseType: '' });
  const [appliedFilters, setAppliedFilters] = useState({ courseId: '', courseType: '' });
  
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Load Initial Data
  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchCourses(appliedFilters));
  }, [dispatch]); // Initial load

  // Handle Search/Filter
  const handleSearch = () => { 
      setAppliedFilters(filters);
      setCurrentPage(1);
      dispatch(fetchCourses(filters)); 
  };
  
  const handleResetFilters = () => {
    const initialFilters = { courseId: '', courseType: '' };
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setCurrentPage(1);
    dispatch(fetchCourses({}));
  };

  // Success Handling
  useEffect(() => {
    if (isSuccess && showForm) {
        toast.success(isEditing ? "Course Updated" : "Course Created");
        dispatch(resetMasterStatus());
        
        // Refetch with applied filters to keep view consistent or reset if needed
        dispatch(fetchCourses(appliedFilters));
        closeForm();
    } else if (isSuccess && !showForm) {
        toast.success("Course Deleted");
        dispatch(resetMasterStatus());
        dispatch(fetchCourses(appliedFilters));
    }
  }, [isSuccess, showForm, dispatch, appliedFilters, isEditing]);

  const closeForm = () => {
      reset();
      setSelectedSubjectMap({});
      setPreviewImage(null);
      setIsEditing(false);
      setCurrentCourseId(null);
      setShowForm(false);
  };

  // --- Subject Handling ---
  const handleSubjectToggle = (subjectId) => {
      const newMap = { ...selectedSubjectMap };
      if (newMap[subjectId] !== undefined) {
          delete newMap[subjectId];
      } else {
          newMap[subjectId] = 0; // Default sort order
      }
      setSelectedSubjectMap(newMap);
  };

  const handleSubjectSortChange = (subjectId, order) => {
      const newMap = { ...selectedSubjectMap };
      if (newMap[subjectId] !== undefined) {
          newMap[subjectId] = parseInt(order) || 0;
          setSelectedSubjectMap(newMap);
      }
  };

  // --- CRUD Operations ---
  const handleEdit = (course) => {
      // Set Form Fields
      const fields = [
          'name', 'shortName', 'courseFees', 'admissionFees', 'registrationFees', 
          'monthlyFees', 'totalInstallment', 'sorting', 'commission', 'duration', 
          'durationType', 'courseType', 'image', 'smallDescription', 'description', 'isActive'
      ];
      fields.forEach(f => setValue(f, course[f]));

      // Set Subjects
      const subjMap = {};
      if (course.subjects) {
          course.subjects.forEach(s => {
              if (s.subject) {
                  subjMap[s.subject._id] = s.sortOrder || 0;
              }
          });
      }
      setSelectedSubjectMap(subjMap);

      setCurrentCourseId(course._id);
      
      if (course.image) {
          setPreviewImage(course.image);
          setValue('image', course.image); // Keep existing URL if not changed
      }
      
      setIsEditing(true);
      setShowForm(true);
  };

  const handleDelete = (id) => {
      if(window.confirm('Are you sure you want to delete this course?')) {
          dispatch(deleteCourse(id));
      }
  };

  const onSubmit = (data) => {
      // Transform Subject Map to Array
      const subjectsArray = Object.keys(selectedSubjectMap).map(id => ({
          subject: id,
          sortOrder: selectedSubjectMap[id]
      }));

      const payload = { ...data, subjects: subjectsArray };

      if (isEditing) {
          dispatch(updateCourse({ id: currentCourseId, data: payload }));
      } else {
          dispatch(createCourse(payload));
      }
  };

  // Unique Course Types for Filter
  const uniqueCourseTypes = [...new Set(courses.map(c => c.courseType))].filter(Boolean);

  // Frontend Pagination Logic
  const paginatedCourses = courses ? courses.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];
  const totalPages = courses ? Math.ceil(courses.length / pageSize) : 0;

  return (
    <div className="container mx-auto p-4">
      
      {/* --- Header --- */}
      <h1 className="text-2xl font-bold text-gray-800 text-center tracking-tight mb-6">Manage Courses</h1>

      {/* --- Filter Section --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <Search size={16}/> Filter Courses
        </h2>
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Course Name</label>
                    <select 
                        value={filters.courseId} 
                        onChange={e => setFilters({...filters, courseId: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">All Courses</option>
                        {courses.map((c, i) => <option key={c._id || i} value={c._id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Course Type</label>
                    <select 
                        value={filters.courseType} 
                        onChange={e => setFilters({...filters, courseType: e.target.value})} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">All Types</option>
                        {uniqueCourseTypes.map((t, i) => <option key={t || i} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={handleResetFilters} 
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
            <Plus size={18}/> Add New Course
        </button>
      </div>

      {/* --- Course Table --- */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        {isLoading ? (
             <div className="p-4"><TableSkeleton rows={8} cols={8} /></div>
        ) : (
        <table className="w-full border-collapse min-w-[1200px]">
            <thead>
                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                    <th className="p-2 border font-semibold w-24">Short Name</th>
                    <th className="p-2 border font-semibold text-center">Course Name</th>
                    <th className="p-2 border font-semibold text-center">Type</th>
                    <th className="p-2 border font-semibold text-center">Fees</th>
                    <th className="p-2 border font-semibold text-center">Duration</th>
                    <th className="p-2 border font-semibold text-center">Status</th>
                    <th className="p-2 border font-semibold text-center">Subjects</th>
                    <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-24">Actions</th>
                </tr>
            </thead>
            <tbody>
                {paginatedCourses.length > 0 ? paginatedCourses.map((course, index) => (
                    <tr key={course._id || index} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                        <td className="p-2 border font-medium text-gray-700">{course.shortName}</td>
                        <td className="p-2 border font-semibold text-gray-900">{course.name}</td>
                        <td className="p-2 border text-gray-600">{course.courseType}</td>
                        <td className="p-2 border text-gray-700">₹{course.courseFees ?? 0}</td>
                        <td className="p-2 border text-gray-600">{course.duration} {course.durationType}</td>
                        <td className="p-2 border text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${course.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                {course.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td className="p-2 border text-center">
                            <button 
                                onClick={() => setViewingSubjects(course.subjects)}
                                className="text-blue-600 hover:bg-blue-100 p-1 rounded transition border border-blue-200 bg-blue-50"
                                title="View Subjects"
                            >
                                <Eye size={14}/>
                            </button>
                        </td>
                        <td className="p-2 border text-center sticky right-0 bg-white z-[5]">
                            <div className="flex justify-center gap-1">
                                <button onClick={() => handleEdit(course)} className="bg-blue-50 text-blue-600 p-1 rounded border border-blue-200 hover:bg-blue-100 transition" title="Edit">
                                    <Edit2 size={14}/>
                                </button>
                                <button onClick={() => handleDelete(course._id)} className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition" title="Delete">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan="8" className="text-center py-8 text-gray-400">No courses found.</td></tr>
                )}
            </tbody>
        </table>
        )}
      </div>

       {/* Pagination Footer */}
       {!isLoading && courses && courses.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
              <span className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages} ({courses.length} records)
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

      {/* --- Subject Viewer Modal --- */}
      {viewingSubjects && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                  <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                      <h3 className="font-bold text-gray-700">Included Subjects</h3>
                      <button onClick={() => setViewingSubjects(null)}><X size={20}/></button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                      <table className="min-w-full text-sm">
                          <thead>
                              <tr className="text-left text-xs uppercase text-gray-500 border-b">
                                  <th className="pb-2">Order</th>
                                  <th className="pb-2">Subject Name</th>
                              </tr>
                          </thead>
                          <tbody>
                              {[...viewingSubjects]
                                  .sort((a, b) => a.sortOrder - b.sortOrder)
                                  .map((s, idx) => (
                                      <tr key={idx} className="border-b last:border-0">
                                          <td className="py-2 text-gray-500 font-mono">{s.sortOrder}</td>
                                          <td className="py-2 font-medium">{s.subject?.name || 'Unknown'}</td>
                                      </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- Create/Edit Form Modal --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn h-[90vh] flex flex-col">
                <div className="bg-primary text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>} 
                        {isEditing ? 'Update Course' : 'Create New Course'}
                    </h2>
                    <button onClick={closeForm} className="text-white hover:text-red-200 transition"><X size={24}/></button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1">
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Row 1: Basic Names */}
                        <div className="md:col-span-2">
                            <label className="label">Course Name <span className="text-red-500">*</span></label>
                            <input {...register('name', {required: true})} className="input-field" placeholder="e.g. Master in Computer Science"/>
                        </div>
                        <div>
                            <label className="label">Short Name <span className="text-red-500">*</span></label>
                            <input {...register('shortName', {required: true})} className="input-field" placeholder="e.g. MCS"/>
                        </div>

                        {/* Row 2: Fees & Config */}
                        <div>
                            <label className="label">Total Fees <span className="text-red-500">*</span></label>
                            <input type="number" {...register('courseFees', {required: true})} className="input-field" placeholder="0"/>
                        </div>
                        <div>
                            <label className="label">Admission Fees</label>
                            <input type="number" {...register('admissionFees')} className="input-field" placeholder="0"/>
                        </div>
                        <div>
                            <label className="label">Registration Fees</label>
                            <input type="number" {...register('registrationFees')} className="input-field" placeholder="0"/>
                        </div>
                        
                        <div>
                            <label className="label">Monthly Fees</label>
                            <input type="number" {...register('monthlyFees')} className="input-field" placeholder="0"/>
                        </div>
                        <div>
                            <label className="label">Installments</label>
                            <input type="number" {...register('totalInstallment')} className="input-field" placeholder="1"/>
                        </div>
                        <div>
                            <label className="label">Commission (%)</label>
                            <input type="number" {...register('commission')} className="input-field" placeholder="0"/>
                        </div>

                        {/* Row 3: Duration & Type */}
                        <div>
                            <label className="label">Duration <span className="text-red-500">*</span></label>
                            <input type="number" {...register('duration', {required: true})} className="input-field" placeholder="6"/>
                        </div>
                        <div>
                            <label className="label">Duration Type</label>
                            <select {...register('durationType')} className="input-field">
                                {['Month', 'Year', 'Days'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Course Type</label>
                            <input list="courseTypes" {...register('courseType', {required: true})} className="input-field" placeholder="Select or Type"/>
                            <datalist id="courseTypes">
                                {uniqueCourseTypes.map((t, i) => <option key={t || i} value={t}/>)}
                            </datalist>
                        </div>

                         {/* Row 4: Sorting & Image */}
                        <div>
                            <label className="label">Sort Order</label>
                            <input type="number" {...register('sorting')} className="input-field" placeholder="0"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Course Image</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden">
                                {previewImage ? (
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="text-xs text-center text-gray-500 font-semibold">Click to upload or drag and drop</p>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setPreviewImage(URL.createObjectURL(file));
                                            setValue('image', file);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* Row 5: Descriptions */}
                        <div className="md:col-span-3">
                            <label className="label">Small Description</label>
                            <input {...register('smallDescription')} className="input-field" placeholder="Brief summary..."/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="label">Full Description</label>
                            <textarea {...register('description')} className="input-field h-24" placeholder="Detailed details..."></textarea>
                        </div>

                        {/* Row 6: Is Active */}
                        <div className="md:col-span-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-primary rounded"/>
                                <span className="text-sm font-bold text-gray-700">Course Is Active</span>
                            </label>
                        </div>

                        {/* --- Subject Table --- */}
                        <div className="md:col-span-3 mt-4 border-t pt-4">
                            <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Layers size={18}/> Subject Configuration</h3>
                            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-12 text-center">Select</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Subject Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-32">Sort Order</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {subjects.map((subject, index) => {
                                            const isSelected = selectedSubjectMap[subject._id] !== undefined;
                                            return (
                                                <tr key={subject._id || index} className={isSelected ? "bg-blue-50" : ""}>
                                                    <td className="px-4 py-2 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => handleSubjectToggle(subject._id)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">{subject.name}</td>
                                                    <td className="px-4 py-2">
                                                        {isSelected && (
                                                            <input 
                                                                type="number" 
                                                                value={selectedSubjectMap[subject._id]} 
                                                                onChange={(e) => handleSubjectSortChange(subject._id, e.target.value)}
                                                                className="w-full border p-1 rounded text-center text-sm"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={closeForm} className="px-4 py-2 border rounded hover:bg-gray-100 text-sm font-medium">Cancel</button>
                    <button type="button" onClick={() => {reset(); setSelectedSubjectMap({}); setPreviewImage(null);}} className="px-4 py-2 border text-orange-600 border-orange-200 hover:bg-orange-50 text-sm font-medium">Reset</button>
                    <button 
                        onClick={handleSubmit(onSubmit)} 
                        disabled={isLoading}
                        className={`bg-green-600 text-white px-6 py-2 rounded shadow text-sm font-bold transition flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
                    >
                        {isLoading ? (
                            <><Clock className="animate-spin" size={16}/> {isEditing ? 'Updating...' : 'Saving...'}</>
                        ) : (
                            isEditing ? 'Update Course' : 'Save Course'
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .label { display: block; font-size: 0.75rem; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-field { width: 100%; border: 1px solid #e5e7eb; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #2563eb; ring: 2px solid #2563eb; }
      `}</style>
    </div>
  );
};

export default CourseMaster;
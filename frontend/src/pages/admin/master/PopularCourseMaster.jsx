import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchCourses, 
    fetchPopularCourses, 
    fetchPopularCategories, 
    createPopularCourse, 
    updatePopularCourse, 
    deletePopularCourse,
    createPopularCategory,
    updatePopularCategory,
    deletePopularCategory,
    resetMasterStatus 
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Search, Plus, X, Edit2, Trash2, Check, EyeOff, Eye, List, Settings } from 'lucide-react';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const PopularCourseMaster = () => {
    const dispatch = useDispatch();
    const { courses, popularCourses, popularCategories, isSuccess, isLoading, message } = useSelector((state) => state.master);
    
    const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'categories'
    
    // Popular Course Form State
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    const [currentCourseId, setCurrentCourseId] = useState(null);

    // Category Form State
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [currentCategoryId, setCurrentCategoryId] = useState(null);

    const { add, edit, delete: canDelete } = useUserRights('Course');

    const courseForm = useForm();
    const categoryForm = useForm();
    
    // --- Filter State ---
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Load Initial Data
    useEffect(() => {
        dispatch(fetchCourses());
        dispatch(fetchPopularCourses());
        dispatch(fetchPopularCategories());
    }, [dispatch]);

    // Success Handling
    useEffect(() => {
        if (isSuccess) {
            toast.success(message);
            dispatch(resetMasterStatus());
            dispatch(fetchPopularCourses());
            dispatch(fetchPopularCategories());
            closeCourseForm();
            closeCategoryForm();
        }
    }, [isSuccess, dispatch, message]);

    const closeCourseForm = () => {
        courseForm.reset();
        setIsEditingCourse(false);
        setCurrentCourseId(null);
        setShowCourseForm(false);
    };

    const closeCategoryForm = () => {
        categoryForm.reset();
        setIsEditingCategory(false);
        setCurrentCategoryId(null);
        setShowCategoryForm(false);
    };

    // --- Popular Course CRUD ---
    const handleEditCourse = (popularCourse) => {
        courseForm.setValue('category', popularCourse.category?._id || popularCourse.category);
        courseForm.setValue('course', popularCourse.course?._id || popularCourse.course);
        courseForm.setValue('sortOrder', popularCourse.sortOrder);
        courseForm.setValue('isActive', popularCourse.isActive);
        courseForm.setValue('isHidden', popularCourse.isHidden);
        
        setCurrentCourseId(popularCourse._id);
        setIsEditingCourse(true);
        setShowCourseForm(true);
    };

    const handleDeleteCourse = (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete popular courses.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this popular course?')) {
            dispatch(deletePopularCourse(id));
        }
    };

    const onCourseSubmit = (data) => {
        if (isEditingCourse) {
            dispatch(updatePopularCourse({ id: currentCourseId, data }));
        } else {
            dispatch(createPopularCourse(data));
        }
    };

    // --- Category CRUD ---
    const handleEditCategory = (category) => {
        categoryForm.setValue('name', category.name);
        categoryForm.setValue('sortOrder', category.sortOrder);
        categoryForm.setValue('isActive', category.isActive);
        
        setCurrentCategoryId(category._id);
        setIsEditingCategory(true);
        setShowCategoryForm(true);
    };

    const handleDeleteCategory = (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete categories.");
            return;
        }
        if (window.confirm('Are you sure? This will only work if no courses are assigned to this category.')) {
            dispatch(deletePopularCategory(id));
        }
    };

    const onCategorySubmit = (data) => {
        if (isEditingCategory) {
            dispatch(updatePopularCategory({ id: currentCategoryId, data }));
        } else {
            dispatch(createPopularCategory(data));
        }
    };

    // Filter courses for display
    const filteredPopularCourses = selectedCategory 
        ? popularCourses.filter(c => (c.category?._id || c.category) === selectedCategory)
        : popularCourses;
    
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Popular Courses Management</h1>
                    <p className="mt-2 text-sm text-gray-700">Manage categories and courses shown on homepage.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${
                        activeTab === 'courses' 
                            ? 'border-b-2 border-primary text-primary' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <List size={18} /> Courses Assignment
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${
                        activeTab === 'categories' 
                            ? 'border-b-2 border-primary text-primary' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Settings size={18} /> Manage Categories
                </button>
            </div>

            {activeTab === 'courses' ? (
                <>
                    {/* Filter & Add Course Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
                        <div className="w-full sm:w-1/3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="">All Categories</option>
                                {popularCategories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setShowCourseForm(true)}
                            disabled={!add || popularCategories.length === 0}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                        >
                            <Plus size={16} className="mr-2" /> Add Course to Category
                        </button>
                    </div>
                    {popularCategories.length === 0 && (
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                            <p className="text-sm text-orange-700">Please create a category first in the "Manage Categories" tab.</p>
                        </div>
                    )}

                    {/* Courses Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        {isLoading ? (
                            <div className="p-4"><TableSkeleton rows={8} cols={6} /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-blue-600 text-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Course</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sort Order</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Visibility</th>
                                            <th className="px-4 py-3 text-center sticky right-0 bg-blue-600 text-xs font-semibold uppercase tracking-wider w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredPopularCourses.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                                    No courses assigned to categories.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPopularCourses.map((popularCourse) => (
                                                <tr key={popularCourse._id} className="hover:bg-blue-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {popularCourse.category?.name || 'Unknown Category'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {popularCourse.course?.name || 'Unknown Course'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700 text-center">
                                                        {popularCourse.sortOrder}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                                            popularCourse.isActive 
                                                                ? 'bg-green-100 text-green-800 border-green-200' 
                                                                : 'bg-red-100 text-red-800 border-red-200'
                                                        }`}>
                                                            {popularCourse.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                                            popularCourse.isHidden 
                                                                ? 'bg-orange-100 text-orange-800 border-orange-200' 
                                                                : 'bg-blue-100 text-blue-800 border-blue-200'
                                                        }`}>
                                                            {popularCourse.isHidden ? (
                                                                <EyeOff size={14} className="inline mr-1" /> 
                                                            ) : (
                                                                <Eye size={14} className="inline mr-1" />
                                                            )}
                                                            {popularCourse.isHidden ? 'Hidden' : 'Visible'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center sticky right-0 bg-white z-10">
                                                        <div className="flex justify-center gap-1">
                                                            {edit && (
                                                                <button 
                                                                    onClick={() => handleEditCourse(popularCourse)} 
                                                                    className="bg-blue-50 text-blue-600 p-1 rounded border border-blue-200 hover:bg-blue-100"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button 
                                                                    onClick={() => handleDeleteCourse(popularCourse._id)} 
                                                                    className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Add Category Button */}
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => setShowCategoryForm(true)}
                            disabled={!add}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            <Plus size={16} className="mr-2" /> Create New Category
                        </button>
                    </div>

                    {/* Categories Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-green-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Category Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sort Order</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-center sticky right-0 bg-green-600 text-xs font-semibold uppercase tracking-wider w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {popularCategories.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-12 text-center text-gray-500">
                                                No categories created yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        popularCategories.map((category) => (
                                            <tr key={category._id} className="hover:bg-green-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{category.sortOrder}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                                        category.isActive 
                                                            ? 'bg-green-100 text-green-800 border-green-200' 
                                                            : 'bg-red-100 text-red-800 border-red-200'
                                                    }`}>
                                                        {category.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center sticky right-0 bg-white z-10">
                                                    <div className="flex justify-center gap-1">
                                                        {edit && (
                                                            <button 
                                                                onClick={() => handleEditCategory(category)} 
                                                                className="bg-blue-50 text-blue-600 p-1 rounded border border-blue-200 hover:bg-blue-100"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => handleDeleteCategory(category._id)} 
                                                                className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Course Form Modal */}
            {showCourseForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditingCourse ? "Edit Course Assignment" : "Assign Course to Category"}
                            </h3>
                            <button onClick={closeCourseForm} className="text-gray-400 hover:text-gray-500">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="px-6 py-4 space-y-4">
                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Category <span className="text-red-500">*</span></label>
                                <select
                                    {...courseForm.register('category', { required: true })}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                >
                                    <option value="">Choose a category</option>
                                    {popularCategories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                                {courseForm.formState.errors.category && <p className="text-sm text-red-600">Category is required</p>}
                            </div>
                            
                            {/* Course Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Course <span className="text-red-500">*</span></label>
                                <select
                                    {...courseForm.register('course', { required: true })}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                >
                                    <option value="">Select a course</option>
                                    {courses.filter(c => c.isActive).map((course) => (
                                        <option key={course._id} value={course._id}>{course.name}</option>
                                    ))}
                                </select>
                                {courseForm.formState.errors.course && <p className="text-sm text-red-600">Course is required</p>}
                            </div>
                            
                            {/* Sort Order */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    {...courseForm.register('sortOrder')}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    placeholder="0"
                                />
                            </div>
                            
                            {/* Is Active & Is Hidden */}
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...courseForm.register('isActive')} defaultChecked className="w-4 h-4 text-primary rounded border-gray-300" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...courseForm.register('isHidden')} className="w-4 h-4 text-orange-600 rounded border-gray-300" />
                                    <span className="text-sm font-medium text-orange-700">Hide from Public</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={closeCourseForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
                                    {isEditingCourse ? "Update Assignment" : "Save Assignment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditingCategory ? "Edit Category" : "Create New Category"}
                            </h3>
                            <button onClick={closeCategoryForm} className="text-gray-400 hover:text-gray-500">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                                <input
                                    {...categoryForm.register('name', { required: true })}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    placeholder="e.g., Designing, Computer, Design"
                                />
                                {categoryForm.formState.errors.name && <p className="text-sm text-red-600">Name is required</p>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    {...categoryForm.register('sortOrder')}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    placeholder="0"
                                />
                            </div>
                            
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...categoryForm.register('isActive')} defaultChecked className="w-4 h-4 text-primary rounded border-gray-300" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={closeCategoryForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                    {isEditingCategory ? "Update Category" : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PopularCourseMaster;

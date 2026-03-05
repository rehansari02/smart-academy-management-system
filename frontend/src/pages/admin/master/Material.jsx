import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMaterials, createMaterial, updateMaterial, deleteMaterial, resetStatus } from '../../../features/master/materialSlice';
import { fetchSubjects } from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import moment from 'moment';
import { Search, Save, RefreshCw, Trash2, Edit, FileText, Plus, X } from 'lucide-react';

const Material = () => {
    const dispatch = useDispatch();
    const { materials, isLoading, isSuccess, message } = useSelector((state) => state.materials);
    const { subjects } = useSelector((state) => state.master);

    // Initial State for Filters
    const initialFilters = {
        fromDate: '',
        toDate: new Date().toISOString().split('T')[0],
        type: '',
        searchBy: 'title', // Default
        value: '',
        isActive: ''
    };
    const [filters, setFilters] = useState(initialFilters);

    // Initial State for Form
    const initialForm = {
        id: null,
        subject: '',
        title: '',
        type: 'Student only',
        document: null,
        description: '',
        isActive: true
    };
    const [formData, setFormData] = useState(initialForm);
    const [showForm, setShowForm] = useState(false); // Default to false (List View)

    useEffect(() => {
        dispatch(fetchSubjects());
    }, [dispatch]);

    useEffect(() => {
        if (!showForm) {
            dispatch(fetchMaterials(filters));
        }
    }, [dispatch, showForm, filters]);

    useEffect(() => {
        if (message) {
            if (isSuccess) {
                toast.success(message);
                if (showForm && !formData.id) { // Only reset/close if creating new
                     handleCloseForm();
                } else if (showForm && formData.id) {
                     handleCloseForm(); // Close on update too
                }
            }
            dispatch(resetStatus());
        }
    }, [isSuccess, message, dispatch, showForm, formData.id]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleFormChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, document: e.target.files[0] });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.subject) return toast.error('Please select a subject');
        if (!formData.title) return toast.error('Please enter a title');
        if (!formData.subject) return toast.error('Please select a subject');
        if (!formData.title) return toast.error('Please enter a title');
        // Document is optional now

        const data = {
            subject: formData.subject,
            title: formData.title,
            type: formData.type,
            description: formData.description,
            isActive: formData.isActive,
            document: formData.document
        };

        if (formData.id) {
            dispatch(updateMaterial({ id: formData.id, data }));
        } else {
            dispatch(createMaterial(data));
        }
    };

    const handleCloseForm = () => {
        setFormData(initialForm);
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        setShowForm(false);
    };

    const handleEdit = (material) => {
        setFormData({
            id: material._id,
            subject: material.subject?._id || '',
            title: material.title,
            type: material.type,
            description: material.description,
            isActive: material.isActive,
            document: null // Don't preload file object
        });
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this material?')) {
            dispatch(deleteMaterial(id));
        }
    };

    return (
        <div className="container mx-auto p-4">
           {/* Header */}
           <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manage Materials</h1>
                {!showForm && (
                     <button onClick={() => setShowForm(true)} className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg text-sm font-bold">
                        <Plus size={20}/> Add New Material
                    </button>
                )}
           </div>

           {showForm ? (
               <div className="bg-white p-6 rounded-lg shadow border mb-6 relative">
                   <button onClick={handleCloseForm} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">
                        <X size={24}/>
                   </button>
                   <h2 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                       <FileText className="text-blue-600"/> {formData.id ? 'Edit Material' : 'New Material'}
                   </h2>
                   
                   <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                           <select name="subject" value={formData.subject} onChange={handleFormChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none">
                               <option value="">Select Subject</option>
                               {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                           <input type="text" name="title" value={formData.title} onChange={handleFormChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter title"/>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                           <select name="type" value={formData.type} onChange={handleFormChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none">
                               <option value="Public">Public</option>
                               <option value="Student only">Student only</option>
                               <option value="Student and Faculty only">Student and Faculty only</option>
                               <option value="Faculty only">Faculty only</option>
                           </select>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Document Upload</label>
                           <input type="file" id="fileInput" onChange={handleFileChange} className="w-full border rounded p-1.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"/>
                           {formData.id && <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing document.</p>}
                       </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea name="description" value={formData.description} onChange={handleFormChange} rows="3" className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter description..."></textarea>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleFormChange} className="h-4 w-4 text-blue-600"/>
                            <label className="text-sm font-medium text-gray-700">Is Active</label>
                        </div>

                        <div className="md:col-span-2 flex gap-3 mt-4 border-t pt-4 justify-end">
                            <button type="button" onClick={handleCloseForm} className="px-6 py-2 border rounded hover:bg-gray-100 text-sm font-medium text-gray-700">
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2 font-medium">
                                <Save size={18}/> {isLoading ? 'Saving...' : 'Save Material'}
                            </button>
                        </div>
                   </form>
               </div>
           ) : (
                <div className="flex flex-col gap-6">
                    {/* Filter Section */}
                    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <Search size={14}/> Filter Materials
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">From Date</label>
                                <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary"/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">To Date</label>
                                <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary"/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">Type</label>
                                <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary">
                                    <option value="">All</option>
                                    <option value="Public">Public</option>
                                    <option value="Student only">Student only</option>
                                    <option value="Student and Faculty only">Student and Faculty only</option>
                                    <option value="Faculty only">Faculty only</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">Search By</label>
                                <select name="searchBy" value={filters.searchBy} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary">
                                    <option value="title">Title</option>
                                    <option value="subject">Subject Name</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">Value</label>
                                <input type="text" name="value" value={filters.value} onChange={handleFilterChange} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Search text..."/>
                            </div>
                             <div className="flex gap-2">
                                <button onClick={() => dispatch(fetchMaterials(filters))} className="bg-blue-800 text-white flex-1 py-2 rounded shadow hover:bg-blue-900 text-sm font-bold flex justify-center items-center gap-2">
                                    <Search size={14}/> Search
                                </button>
                                <button onClick={() => setFilters(initialFilters)} className="bg-gray-100 text-gray-600 px-3 py-2 rounded shadow hover:bg-gray-200 text-sm font-bold" title="Reset Filters">
                                    <RefreshCw size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-lg shadow overflow-x-auto border">
                        <table className="w-full border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                                    <th className="p-2 border font-semibold">Subject Name</th>
                                    <th className="p-2 border font-semibold">Title</th>
                                    <th className="p-2 border font-semibold">Type</th>
                                    <th className="p-2 border font-semibold">Date</th>
                                    <th className="p-2 border font-semibold text-center">Document</th>
                                    <th className="p-2 border font-semibold text-center">Status</th>
                                    <th className="p-2 border font-semibold text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.length > 0 ? materials.map((m, index) => (
                                    <tr key={m._id} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                        <td className="p-2 border text-center">{index + 1}</td>
                                        <td className="p-2 border font-medium">{m.subject?.name || '-'}</td>
                                        <td className="p-2 border">{m.title}</td>
                                        <td className="p-2 border text-gray-600">{m.type}</td>
                                        <td className="p-2 border">{moment(m.createdAt).format('DD/MM/YYYY')}</td>
                                        <td className="p-2 border text-center">
                                            {m.document ? (
                                                <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/${m.document}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Yes</a>
                                            ) : <span className="text-red-500">No</span>}
                                        </td>
                                        <td className="p-2 border text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                m.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
                                            }`}>
                                                {m.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-2 border text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleEdit(m)} className="bg-orange-50 text-orange-600 p-1 rounded border border-orange-200 hover:bg-orange-100 transition" title="Edit">
                                                    <Edit size={14}/>
                                                </button>
                                                <button onClick={() => handleDelete(m._id)} className="bg-red-50 text-red-600 p-1 rounded border border-red-200 hover:bg-red-100 transition" title="Delete">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="8" className="text-center py-8 text-gray-500">No materials found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
           )}
        </div>
    );
};

export default Material;

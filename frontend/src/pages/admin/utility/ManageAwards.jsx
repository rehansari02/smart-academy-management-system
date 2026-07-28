import React, { useState, useEffect } from 'react';
import { Award as AwardIcon, Plus, Search, Edit, Trash2, X, Image as ImageIcon, Calendar } from 'lucide-react';
import awardService from '../../../services/awardService';
import { toast } from 'react-toastify';
import { formatDate } from '../../../utils/dateUtils';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const ManageAwards = () => {
    // --- State ---
    const [awardsList, setAwardsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Filters
    const [filters, setFilters] = useState({
        search: '',
        isActive: '' // '' for all, 'true', 'false'
    });

    // Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const { add, edit, delete: canDelete } = useUserRights('Manage Awards');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        isActive: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    // --- Effects ---
    useEffect(() => {
        fetchAwards();
    }, []);

    // --- Methods ---
    const fetchAwards = async () => {
        setLoading(true);
        try {
            const data = await awardService.getAllAwards(filters);
            setAwardsList(data);
        } catch (error) {
            console.error("Error fetching awards:", error);
            toast.error("Failed to load awards & recognitions.");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        fetchAwards();
    };

    const handleResetFilters = () => {
        setFilters({
            search: '',
            isActive: ''
        });
        setTimeout(fetchAwards, 0);
    };

    // Form Handling
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file');
            e.target.value = '';
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        e.target.value = '';
    };

    const buildPayload = () => {
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value);
        });
        if (imageFile) {
            data.append('image', imageFile);
        }
        return data;
    };

    const handleAddNew = () => {
        setEditMode(false);
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            isActive: true
        });
        setImageFile(null);
        setImagePreview('');
        setShowModal(true);
    };

    const handleEdit = (award) => {
        setEditMode(true);
        setCurrentId(award._id);
        
        setFormData({
            title: award.title,
            description: award.description || '',
            date: award.date ? new Date(award.date).toISOString().split('T')[0] : '',
            isActive: award.isActive
        });
        setImageFile(null);
        setImagePreview(award.image || '');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete awards.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this award item?')) {
            try {
                await awardService.deleteAward(id);
                toast.success("Award deleted successfully");
                fetchAwards();
            } catch (error) {
                console.error("Error deleting award:", error);
                toast.error("Failed to delete award");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editMode) {
                if (!edit) {
                    showPermissionDenied("You don't have authority to edit awards.");
                    return;
                }
                await awardService.updateAward(currentId, buildPayload());
                toast.success("Award updated successfully");
            } else {
                if (!add) {
                    showPermissionDenied("You don't have authority to add awards.");
                    return;
                }
                await awardService.createAward(buildPayload());
                toast.success("Award created successfully");
            }
            setShowModal(false);
            fetchAwards();
        } catch (error) {
            console.error("Error saving award:", error);
            toast.error("Failed to save award");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl animate-fade-in-up">
            <div className="bg-white rounded-lg shadow-lg p-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <AwardIcon className="text-amber-500 animate-pulse" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manage Awards & Recognition</h2>
                            <p className="text-sm text-gray-500">Create, update and manage website awards and achievements</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={20} /> Add New Award
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Search Headline/Content</label>
                        <input 
                            type="text" 
                            name="search" 
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search by title or description..."
                            className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                        <select 
                            name="isActive" 
                            value={filters.isActive} 
                            onChange={handleFilterChange}
                            className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 flex-1 justify-center transition-colors"
                        >
                            <Search size={16} /> Search
                        </button>
                        <button 
                            onClick={handleResetFilters}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-600 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm text-gray-600 uppercase tracking-wider">
                                <th className="p-3 border-b w-16">Sr No.</th>
                                <th className="p-3 border-b w-24">Image</th>
                                <th className="p-3 border-b">Award Title</th>
                                <th className="p-3 border-b">Description</th>
                                <th className="p-3 border-b w-32">Date</th>
                                <th className="p-3 border-b w-24">Status</th>
                                <th className="p-3 border-b text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-500">Loading awards...</td></tr>
                            ) : awardsList.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-500">No awards found.</td></tr>
                            ) : (
                                awardsList.map((award, index) => (
                                    <tr key={award._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                        <td className="p-3 font-medium text-gray-500">{index + 1}</td>
                                        <td className="p-3">
                                            {award.image ? (
                                                <img src={award.image} alt={award.title} className="w-16 h-12 rounded object-cover border" />
                                            ) : (
                                                <div className="w-16 h-12 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                                                    <ImageIcon size={18} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 font-semibold text-gray-800">{award.title}</td>
                                        <td className="p-3 text-gray-600 line-clamp-2 mt-2 max-w-xs">{award.description}</td>
                                        <td className="p-3 text-gray-600">{formatDate(award.date)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${award.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {award.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(award)} className="text-blue-500 hover:text-blue-700 p-1 transition-colors" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(award._id)} className="text-red-500 hover:text-red-700 p-1 transition-colors" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-scale">
                            <div className="flex justify-between items-center p-6 border-b bg-gray-50 rounded-t-xl">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <AwardIcon size={20} className="text-indigo-600" />
                                    {editMode ? 'Edit Award/Recognition' : 'Add New Award/Recognition'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Award Title / Headline</label>
                                    <input 
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="e.g. Best Education Academy of 2026"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Award Date</label>
                                        <input 
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6 pl-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                name="isActive"
                                                checked={formData.isActive}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Is Active?</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Award Image</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-16 rounded-lg overflow-hidden border bg-gray-100 flex items-center justify-center">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Award preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon size={24} className="text-gray-400" />
                                            )}
                                        </div>
                                        <label className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                                            Choose Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                        </label>
                                        {imageFile && (
                                            <button
                                                type="button"
                                                onClick={() => { setImageFile(null); setImagePreview(''); }}
                                                className="text-sm text-red-600 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Award Description / Content</label>
                                    <textarea 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="5"
                                        required
                                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Write about the award achievement..."
                                    ></textarea>
                                </div>

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {submitting ? 'Saving...' : (editMode ? 'Update Award' : 'Save Award')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageAwards;

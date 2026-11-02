import React, { useState, useEffect } from 'react';
import { 
    Award as AwardIcon, Plus, Search, Edit, Trash2, X, 
    Image as ImageIcon, Calendar, Crop, RotateCw, ZoomIn, 
    ZoomOut, Monitor, Smartphone, Sparkles, Check, RefreshCw, Trophy
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../../utils/cropUtils';
import { getMediaUrl } from '../../../utils/mediaUrl';
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

    // --- Crop & Adjust State ---
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [cropRotation, setCropRotation] = useState(0);
    const [cropAspect, setCropAspect] = useState(16 / 9); // default 16:9 for awards
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // Live preview view mode: 'desktop' or 'mobile'
    const [previewMode, setPreviewMode] = useState('desktop');

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
        const url = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(url);
        setCropImageSrc(url);
        e.target.value = '';
    };

    const openAdjustModal = () => {
        if (!imagePreview) {
            toast.info('Please select or upload an image first.');
            return;
        }
        setCropImageSrc(imagePreview);
        setCrop({ x: 0, y: 0 });
        setCropZoom(1);
        setCropRotation(0);
        setCroppedAreaPixels(null);
        setShowAdjustModal(true);
    };

    const applyCropAdjustments = async () => {
        if (!cropImageSrc || !croppedAreaPixels) return;
        setIsCropping(true);
        try {
            const result = await getCroppedImg(cropImageSrc, croppedAreaPixels, {
                rotation: cropRotation,
                fileName: `award-${Date.now()}.png`,
                quality: 0.95
            });
            if (result?.file) {
                setImageFile(result.file);
                setImagePreview(result.url);
                toast.success('Image cropped & adjusted successfully!');
            }
            setShowAdjustModal(false);
        } catch (error) {
            console.error('Failed to crop image:', error);
            toast.error('Failed to adjust image.');
        } finally {
            setIsCropping(false);
        }
    };

    const resetCrop = () => {
        setCrop({ x: 0, y: 0 });
        setCropZoom(1);
        setCropRotation(0);
        setCroppedAreaPixels(null);
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
        setCurrentId(null);
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            isActive: true
        });
        setImageFile(null);
        setImagePreview('');
        setCropImageSrc('');
        setPreviewMode('desktop');
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
        const imgUrl = award.image ? getMediaUrl(award.image) : '';
        setImagePreview(imgUrl);
        setCropImageSrc(imgUrl);
        setPreviewMode('desktop');
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
                        <AwardIcon className="text-amber-500" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manage Awards & Recognition</h2>
                            <p className="text-sm text-gray-500">Create, edit, adjust and manage homepage awards</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                    >
                        <Plus size={20} /> Add New Award
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Search Award Title / Content</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                name="search" 
                                value={filters.search} 
                                onChange={handleFilterChange}
                                placeholder="Search by title..." 
                                className="w-full border rounded p-2 pl-8 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                        </div>
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
                            <option value="true">Active Only</option>
                            <option value="false">Inactive Only</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button 
                            onClick={handleSearch}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium flex-1 transition-colors"
                        >
                            Search
                        </button>
                        <button 
                            onClick={handleResetFilters}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-3 border-b">#</th>
                                <th className="p-3 border-b">Image</th>
                                <th className="p-3 border-b">Title</th>
                                <th className="p-3 border-b">Description</th>
                                <th className="p-3 border-b">Award Date</th>
                                <th className="p-3 border-b">Status</th>
                                <th className="p-3 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-500">Loading awards...</td>
                                </tr>
                            ) : awardsList.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-500">No awards found.</td>
                                </tr>
                            ) : (
                                awardsList.map((award, index) => (
                                    <tr key={award._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-medium text-gray-500">{index + 1}</td>
                                        <td className="p-3">
                                            {award.image ? (
                                                <img 
                                                    src={getMediaUrl(award.image)} 
                                                    alt={award.title} 
                                                    className="w-16 h-12 rounded object-cover border" 
                                                />
                                            ) : (
                                                <span className="text-gray-400">-</span>
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

                {/* --- CREATE / EDIT MODAL WITH LIVE PREVIEW --- */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm transition-opacity overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-scale">
                            
                            {/* Modal Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <AwardIcon size={22} className="text-amber-500" />
                                        {editMode ? 'Edit Award & Recognition' : 'Add New Award & Recognition'}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Fill details and check live Desktop vs Mobile view to adjust image framing perfectly.
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-gray-100">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            {/* Modal Body - 2 Columns (Form on Left, Live Preview on Right) */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    
                                    {/* LEFT: FORM INPUTS */}
                                    <form id="award-form" onSubmit={handleSubmit} className="lg:col-span-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                Award Title / Headline <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="e.g. Best Education Academy of Gujarat 2026"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                    Award Date <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    type="date"
                                                    name="date"
                                                    value={formData.date}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 pt-6 pl-2">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox"
                                                        name="isActive"
                                                        checked={formData.isActive}
                                                        onChange={handleInputChange}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Is Active?</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Image Upload & Adjust Section */}
                                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
                                            <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
                                                <span>Award Image</span>
                                                {imagePreview && (
                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        Image Selected
                                                    </span>
                                                )}
                                            </label>

                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* Mini Thumbnail */}
                                                <div className="w-20 h-16 rounded-lg overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center shrink-0 shadow-sm relative">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Award preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={22} className="text-gray-400" />
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 flex-1">
                                                    <label className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5">
                                                        <ImageIcon size={14} className="text-gray-500" /> Choose Image
                                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                                    </label>

                                                    {imagePreview && (
                                                        <button
                                                            type="button"
                                                            onClick={openAdjustModal}
                                                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                                            title="Crop and frame photo for website"
                                                        >
                                                            <Crop size={14} /> Crop / Adjust
                                                        </button>
                                                    )}

                                                    {imageFile && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setImageFile(null); setImagePreview(''); setCropImageSrc(''); }}
                                                            className="px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Helper guidance */}
                                            <div className="mt-3 text-[11px] text-gray-600 bg-white p-2.5 rounded-lg border border-amber-100 flex items-start gap-1.5 leading-relaxed">
                                                <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Adjust Guidance:</strong> Website par image landscape 16:9 ya 4:3 me best dikhti hai. <strong>"Crop / Adjust"</strong> click karke aap trophy/award ko center me frame kar sakte hain.
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                                Award Description / Content <span className="text-red-500">*</span>
                                            </label>
                                            <textarea 
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows="4"
                                                required
                                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="Write about the award achievement, institute recognition or competition details..."
                                            ></textarea>
                                        </div>
                                    </form>

                                    {/* RIGHT: LIVE CARD PREVIEW (DESKTOP & MOBILE VIEW TOGGLE) */}
                                    <div className="lg:col-span-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
                                        <div>
                                            {/* Preview Mode Switcher */}
                                            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                                                    <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                                                        Live Website Preview
                                                    </span>
                                                </div>
                                                <div className="inline-flex rounded-lg bg-gray-200/80 p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewMode('desktop')}
                                                        className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                            previewMode === 'desktop'
                                                                ? 'bg-white text-indigo-700 shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <Monitor size={14} /> Screen View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewMode('mobile')}
                                                        className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                            previewMode === 'mobile'
                                                                ? 'bg-white text-indigo-700 shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <Smartphone size={14} /> Mobile View
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Live Render Area */}
                                            {previewMode === 'desktop' ? (
                                                /* --- DESKTOP SCREEN CARD PREVIEW --- */
                                                <div className="w-full bg-white rounded-3xl border-2 border-gray-200 shadow-lg hover:border-amber-400/60 transition-all p-4 sm:p-5 flex flex-col justify-between min-h-[420px]">
                                                    <div>
                                                        {/* Top Row: Badge & Date */}
                                                        <div className="flex items-center justify-between gap-2 mb-3">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
                                                                <Trophy size={12} className="text-amber-500" /> Award & Recognition
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-lg border border-gray-200/80">
                                                                <Calendar size={11} className="text-gray-400" />
                                                                {formatDate(formData.date) || 'Today'}
                                                            </span>
                                                        </div>

                                                        {/* Main Image Frame with Ambient Backdrop (Matches HomePage) */}
                                                        <div className="relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden bg-slate-900/5 border border-gray-200 mb-3 flex items-center justify-center">
                                                            {imagePreview ? (
                                                                <>
                                                                    <img 
                                                                        src={imagePreview} 
                                                                        alt="" 
                                                                        aria-hidden="true"
                                                                        className="absolute inset-0 w-full h-full object-cover blur-lg scale-125 opacity-25 select-none pointer-events-none" 
                                                                    />
                                                                    <img 
                                                                        src={imagePreview} 
                                                                        alt={formData.title || 'Award Preview'} 
                                                                        className="relative z-10 w-full h-full object-contain drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]" 
                                                                    />
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 flex flex-col items-center justify-center text-primary p-4">
                                                                    <AwardIcon size={44} className="text-amber-500 mb-1.5" />
                                                                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">No Image Selected</span>
                                                                    <span className="text-[10px] text-gray-400">Choose an image from left panel</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Title */}
                                                        <h4 className="font-black text-gray-900 text-base sm:text-lg line-clamp-1 leading-snug">
                                                            {formData.title || 'Award Title / Headline will appear here'}
                                                        </h4>

                                                        {/* Description */}
                                                        <p className="mt-1 text-xs text-gray-600 font-normal line-clamp-2 leading-relaxed">
                                                            {formData.description || 'Award description and achievement details will appear here on the homepage carousel...'}
                                                        </p>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                                                        <span className="text-gray-600 flex items-center gap-1.5 text-[11px]">
                                                            <Sparkles size={12} className="text-amber-500" /> Smart Academy
                                                        </span>
                                                        <span className="text-indigo-600 text-[11px]">
                                                            Read More →
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* --- MOBILE SCREEN PREVIEW --- */
                                                <div className="w-full flex justify-center">
                                                    <div className="w-[300px] bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-700">
                                                        {/* Phone Notch */}
                                                        <div className="w-24 h-3.5 bg-slate-800 rounded-full mx-auto mb-2" />
                                                        
                                                        {/* Inner Phone Screen */}
                                                        <div className="bg-white rounded-[22px] p-3 flex flex-col justify-between min-h-[380px] text-xs">
                                                            <div>
                                                                {/* Top Row */}
                                                                <div className="flex items-center justify-between gap-1 mb-2">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200">
                                                                        <Trophy size={10} className="text-amber-500" /> Award
                                                                    </span>
                                                                    <span className="text-[9px] font-semibold text-gray-500">
                                                                        {formatDate(formData.date) || 'Today'}
                                                                    </span>
                                                                </div>

                                                                {/* Image Frame Mobile */}
                                                                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-900/5 border border-gray-200 mb-2 flex items-center justify-center">
                                                                    {imagePreview ? (
                                                                        <>
                                                                            <img 
                                                                                src={imagePreview} 
                                                                                alt="" 
                                                                                aria-hidden="true"
                                                                                className="absolute inset-0 w-full h-full object-cover blur-md scale-125 opacity-25 select-none" 
                                                                            />
                                                                            <img 
                                                                                src={imagePreview} 
                                                                                alt={formData.title} 
                                                                                className="relative z-10 w-full h-full object-contain" 
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-center p-2">
                                                                            <AwardIcon size={32} className="text-amber-500 mx-auto mb-1" />
                                                                            <span className="text-[10px] text-gray-400">Select Image</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Title */}
                                                                <h4 className="font-black text-gray-900 text-xs line-clamp-1 leading-snug">
                                                                    {formData.title || 'Award Title / Headline'}
                                                                </h4>

                                                                {/* Description */}
                                                                <p className="mt-1 text-[10px] text-gray-600 line-clamp-2 leading-tight">
                                                                    {formData.description || 'Award description details on mobile screen...'}
                                                                </p>
                                                            </div>

                                                            {/* Mobile Footer */}
                                                            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                                                                <span className="text-gray-500 flex items-center gap-1">
                                                                    <Sparkles size={10} className="text-amber-500" /> Smart Academy
                                                                </span>
                                                                <span className="text-indigo-600 font-bold">
                                                                    Read More →
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-gray-400 text-center mt-3">
                                            Yeh card website home page ke Awards & Recognitions carousel me bilkul aisa hi dikhega.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end gap-3 px-6 py-3.5 border-t bg-gray-50">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    form="award-form"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-semibold text-sm shadow-md shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting ? 'Saving...' : (editMode ? 'Update Award' : 'Save Award')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- IMAGE ADJUST / CROP MODAL --- */}
                {showAdjustModal && cropImageSrc && (
                    <div className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md">
                        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
                            
                            {/* Crop Header */}
                            <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                        <Crop size={20} className="text-indigo-600" />
                                        Adjust & Crop Award Image
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Frame the award/trophy perfectly. Use drag, zoom, and aspect ratio controls below.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAdjustModal(false)} 
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Crop Body */}
                            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_300px] overflow-y-auto items-start">
                                
                                {/* Cropper Canvas Area */}
                                <div className="rounded-xl bg-gray-900 p-3 flex flex-col items-center">
                                    <div className="relative w-full h-[360px] sm:h-[420px] overflow-hidden rounded-lg bg-black">
                                        <Cropper
                                            image={cropImageSrc}
                                            crop={crop}
                                            zoom={cropZoom}
                                            rotation={cropRotation}
                                            aspect={cropAspect}
                                            cropShape="rect"
                                            showGrid
                                            objectFit="contain"
                                            onCropChange={setCrop}
                                            onZoomChange={setCropZoom}
                                            onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-xs font-semibold text-gray-400">
                                        Image ko drag karke aur zoom karke frame set karein
                                    </p>
                                </div>

                                {/* Controls & Settings */}
                                <div className="space-y-4">
                                    {/* Aspect Ratio Presets */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Frame Ratio
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCropAspect(16 / 9)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                                                    cropAspect === 16 / 9
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                16:9 Landscape
                                                <span className="block text-[9px] font-normal text-emerald-600">Best for Website</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCropAspect(4 / 3)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                                                    cropAspect === 4 / 3
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                4:3 Standard
                                                <span className="block text-[9px] font-normal text-gray-500">Regular Photo</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCropAspect(1)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                                                    cropAspect === 1
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                1:1 Square
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCropAspect(null)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                                                    cropAspect === null
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                Freeform
                                            </button>
                                        </div>
                                    </div>

                                    {/* Zoom Control */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Zoom
                                            </label>
                                            <span className="text-xs text-gray-500 font-mono">{cropZoom.toFixed(2)}x</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ZoomOut size={16} className="text-gray-400" />
                                            <input
                                                type="range"
                                                min="1"
                                                max="3"
                                                step="0.05"
                                                value={cropZoom}
                                                onChange={(e) => setCropZoom(Number(e.target.value))}
                                                className="w-full accent-indigo-600 cursor-pointer"
                                            />
                                            <ZoomIn size={16} className="text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Rotate Control */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Rotation
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                                            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                        >
                                            <RotateCw size={14} /> Rotate 90° ({cropRotation}°)
                                        </button>
                                    </div>

                                    {/* Instructions Callout */}
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900 leading-relaxed">
                                        💡 <strong>Tip:</strong> Crop box ke andar jitna area dikhega wahi exact cut hoke live website card par desktop aur mobile view me perfectly display hoga.
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetCrop}
                                            className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <RefreshCw size={14} /> Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyCropAdjustments}
                                            disabled={isCropping}
                                            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Check size={16} /> {isCropping ? 'Cropping...' : 'Apply & Set'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageAwards;

import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus, Search, Edit, Trash2, X, Crop as CropIcon, Eye, EyeOff, Type } from 'lucide-react';
import bannerService from '../../../services/bannerService';
import homeSectionService from '../../../services/homeSectionService';
import { toast } from 'react-toastify';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../../utils/cropUtils';
import Swal from 'sweetalert2';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const ManageBanners = () => {
    const { add, edit, delete: canDelete } = useUserRights('Banner Home');
    // --- State ---
    const [bannersList, setBannersList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        linkUrl: '',
        linkLabel: '',
        isActive: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Hero Text Management State
    const [showHeroTextModal, setShowHeroTextModal] = useState(false);
    const [savingHeroText, setSavingHeroText] = useState(false);
    const [heroTextForm, setHeroTextForm] = useState({
        badgeText: 'LEARN. PRACTICE. MASTER.',
        titleLine1: 'Empowering Minds.',
        titleLine2: 'Building Futures.',
        description: 'Industry-focused training designed to build your skills, boost confidence and create better career opportunities.',
        buttonLabel: 'Explore Courses'
    });

    // Crop State
    const [originalImageSrc, setOriginalImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(560 / 640); // Default to Homepage Half-Circle ratio

    // --- Effects ---
    useEffect(() => {
        fetchBanners();
        fetchHeroText();
    }, []);

    // --- Methods ---
    const fetchBanners = async () => {
        setLoading(true);
        try {
            const data = await bannerService.getAllBanners();
            setBannersList(data);
        } catch (error) {
            console.error("Error fetching banners:", error);
            toast.error("Failed to load banners.");
        } finally {
            setLoading(false);
        }
    };

    const fetchHeroText = async () => {
        try {
            const sections = await homeSectionService.getAllSections();
            const heroSec = sections.find(s => s.sectionKey === 'hero_text');
            if (heroSec) {
                setHeroTextForm({
                    badgeText: heroSec.subtitle || 'LEARN. PRACTICE. MASTER.',
                    titleLine1: heroSec.title || 'Empowering Minds.',
                    titleLine2: heroSec.quote || 'Building Futures.',
                    description: heroSec.description || 'Industry-focused training designed to build your skills, boost confidence and create better career opportunities.',
                    buttonLabel: heroSec.buttonLabel || 'Explore Courses'
                });
            }
        } catch (err) {
            console.error("Failed to load hero text section", err);
        }
    };

    const handleOpenHeroTextModal = () => {
        fetchHeroText();
        setShowHeroTextModal(true);
    };

    const handleHeroTextChange = (e) => {
        const { name, value } = e.target;
        setHeroTextForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveHeroText = async (e) => {
        e.preventDefault();
        setSavingHeroText(true);
        try {
            const formData = new FormData();
            formData.append('sectionKey', 'hero_text');
            formData.append('subtitle', heroTextForm.badgeText);
            formData.append('title', heroTextForm.titleLine1);
            formData.append('quote', heroTextForm.titleLine2);
            formData.append('description', heroTextForm.description);
            formData.append('buttonLabel', heroTextForm.buttonLabel);
            formData.append('isActive', 'true');

            await homeSectionService.upsertSection(formData);
            toast.success("Homepage Hero Text updated successfully!");
            setShowHeroTextModal(false);
        } catch (error) {
            console.error("Error saving hero text:", error);
            toast.error("Failed to update Hero Text");
        } finally {
            setSavingHeroText(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload a valid image file');
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setOriginalImageSrc(reader.result);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleReCrop = () => {
        if (imagePreview) {
            setOriginalImageSrc(imagePreview);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setShowCropper(true);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropConfirm = async () => {
        try {
            const { file, url } = await getCroppedImg(originalImageSrc, croppedAreaPixels);
            setImageFile(file);
            setImagePreview(url);
            setShowCropper(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setOriginalImageSrc(null);
    };

    const handleAddNew = () => {
        if (!add) {
            showPermissionDenied("You don't have authority to add banners.");
            return;
        }
        setEditMode(false);
        setFormData({
            title: '',
            description: '',
            linkUrl: '',
            linkLabel: '',
            isActive: true
        });
        setImageFile(null);
        setImagePreview(null);
        setOriginalImageSrc(null);
        setShowCropper(false);
        setShowModal(true);
    };

    const handleEdit = (banner) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit banners.");
            return;
        }
        setEditMode(true);
        setCurrentId(banner._id);
        setFormData({
            title: banner.title || '',
            description: banner.testimonialQuote ?? banner.description ?? '',
            linkUrl: banner.linkUrl || '',
            linkLabel: banner.linkLabel || '',
            isActive: banner.isActive
        });
        setImagePreview(banner.image);
        setImageFile(null);
        setShowModal(true);
    };

    const handleToggleActive = async (banner) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update banner status.");
            return;
        }
        try {
            const data = new FormData();
            data.append('title', banner.title || '');
            data.append('description', banner.description || '');
            data.append('testimonialQuote', banner.testimonialQuote ?? banner.description ?? '');
            data.append('linkUrl', banner.linkUrl || '');
            data.append('linkLabel', banner.linkLabel || '');
            data.append('isActive', !banner.isActive);
            await bannerService.updateBanner(banner._id, data);
            toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchBanners();
        } catch (error) {
            toast.error('Failed to update banner status');
        }
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete banners.");
            return;
        }
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this banner deletion!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5', // indigo-600
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await bannerService.deleteBanner(id);
                toast.success("Banner deleted successfully");
                fetchBanners();
            } catch (error) {
                console.error("Error deleting banner:", error);
                toast.error("Failed to delete banner");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editMode ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editMode ? 'edit' : 'add'} banners.`);
            return;
        }
        
        if (!editMode && !imageFile) {
            toast.error('Please select an image for the banner');
            return;
        }

        setSubmitting(true);

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('testimonialQuote', formData.description);
        data.append('linkUrl', formData.linkUrl);
        data.append('linkLabel', formData.linkLabel);
        data.append('isActive', formData.isActive);
        if (imageFile) {
            data.append('image', imageFile);
        }

        try {
            if (editMode) {
                await bannerService.updateBanner(currentId, data);
                toast.success("Banner updated successfully");
            } else {
                await bannerService.createBanner(data);
                toast.success("Banner created successfully");
            }
            setShowModal(false);
            fetchBanners();
        } catch (error) {
            console.error("Error saving banner:", error);
            toast.error(error.response?.data?.message || "Failed to save banner");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBanners = bannersList.filter(b => 
        `${b.title || ''} ${b.linkLabel || ''} ${b.linkUrl || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="bg-white rounded-lg shadow-lg p-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="text-blue-500" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manage Homepage Banners</h2>
                            <p className="text-sm text-gray-500">Upload and manage hero slider images</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={handleOpenHeroTextModal}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm font-semibold"
                        >
                            <Type size={18} /> Manage Hero Text
                        </button>
                        <button 
                            type="button"
                            onClick={handleAddNew}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm font-semibold"
                        >
                            <Plus size={18} /> Add New Banner
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by title..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm text-gray-600 uppercase tracking-wider">
                                <th className="p-3 border-b">Banner Image</th>
                                <th className="p-3 border-b">Student Name</th>
                                <th className="p-3 border-b">Testimonial Quote</th>
                                <th className="p-3 border-b">Role & Company</th>
                                <th className="p-3 border-b">Status</th>
                                <th className="p-3 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center p-8 text-gray-500">Loading banners...</td></tr>
                            ) : filteredBanners.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-8 text-gray-500">No banners found.</td></tr>
                            ) : (
                                filteredBanners.map((banner) => (
                                    <tr key={banner._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                        <td className="p-3">
                                            <div className="w-32 h-16 rounded overflow-hidden border shadow-sm">
                                                <img src={banner.image || 'https://via.placeholder.com/300x150'} alt={banner.title} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-800">{banner.title || '-'}</td>
                                        <td className="p-3 text-xs text-gray-600 max-w-[240px]">
                                            {banner.description ? (
                                                <span className="line-clamp-2 italic">"{banner.description}"</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs">
                                            <div className="font-bold text-gray-800">{banner.linkLabel || '-'}</div>
                                            <div className="text-gray-500">{banner.linkUrl || '-'}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleToggleActive(banner)} className={`p-1 ${banner.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`} title={banner.isActive ? 'Deactivate' : 'Activate'}>
                                                    {banner.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <button onClick={() => handleEdit(banner)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(banner._id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
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
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className={`bg-white rounded-2xl shadow-2xl w-full ${showCropper ? 'max-w-4xl' : 'max-w-2xl'} max-h-[92vh] overflow-y-auto transition-all duration-300`}>
                            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {showCropper ? 'Adjust Image Fit & Crop' : (editMode ? 'Edit Homepage Banner' : 'Add Homepage Banner')}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {showCropper ? 'Fit your image precisely for the homepage half-circle container' : 'Configure banner details and website fit preview'}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                                    <X size={22} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {showCropper ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                                            {/* Left Column: Interactive Cropper */}
                                            <div className="w-full lg:w-3/5 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Position & Crop</span>
                                                    <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAspectRatio(560 / 640)}
                                                            className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all ${
                                                                aspectRatio === (560 / 640)
                                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            Half-Circle Fit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAspectRatio(16 / 9)}
                                                            className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all ${
                                                                aspectRatio === (16 / 9)
                                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                                    : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            16:9 Landscape
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative w-full h-[310px] bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800">
                                                    <Cropper
                                                        image={originalImageSrc}
                                                        crop={crop}
                                                        zoom={zoom}
                                                        aspect={aspectRatio}
                                                        onCropChange={setCrop}
                                                        onZoomChange={setZoom}
                                                        onCropComplete={onCropComplete}
                                                    />

                                                    {/* Visual guide mask for half circle */}
                                                    {aspectRatio === (560 / 640) && (
                                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                            <div className="w-[190px] h-[220px] rounded-l-full border-2 border-dashed border-orange-400 bg-orange-500/10 shadow-2xl flex items-center justify-center">
                                                                <span className="text-[10px] uppercase tracking-wider text-white font-bold bg-black/70 px-2 py-0.5 rounded shadow">
                                                                    Half-Circle Curve Area
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    <span className="text-xs font-bold text-gray-700 min-w-[50px]">Zoom:</span>
                                                    <input
                                                        type="range"
                                                        value={zoom}
                                                        min={1}
                                                        max={3}
                                                        step={0.05}
                                                        onChange={(e) => setZoom(Number(e.target.value))}
                                                        className="w-full accent-indigo-600 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-mono font-bold text-indigo-600 min-w-[35px] text-right">{zoom.toFixed(1)}x</span>
                                                </div>
                                            </div>

                                            {/* Right Column: Homepage Half-Circle Live Fit Preview */}
                                            <div className="w-full lg:w-2/5 bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                                                        Homepage Live Fit
                                                    </span>
                                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">http://localhost:5173/</span>
                                                </div>

                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    This preview shows exactly how much of your image will fit inside the half-circle hero container on the homepage:
                                                </p>

                                                {/* Mini Homepage Replica Card */}
                                                <div className="relative bg-slate-950 rounded-xl p-3.5 min-h-[210px] flex items-center justify-between overflow-hidden border border-slate-800 shadow-2xl">
                                                    <div className="space-y-1.5 max-w-[120px] z-10">
                                                        <span className="text-[8px] font-extrabold tracking-widest uppercase text-slate-400 block">LEARN. PRACTICE. MASTER.</span>
                                                        <div className="text-xs font-bold text-white leading-tight">Empowering Minds.</div>
                                                        <div className="text-[10px] text-slate-400 leading-tight">Industry-focused training...</div>
                                                        <div className="inline-block bg-indigo-600 text-[8px] text-white px-2 py-0.5 rounded font-bold uppercase mt-1">Explore</div>
                                                    </div>

                                                    {/* Half-circle container replica */}
                                                    <div className="relative w-[140px] h-[180px] rounded-l-full overflow-hidden border-l-[4px] border-white shadow-2xl bg-slate-900 flex items-center justify-center shrink-0">
                                                        <img
                                                            src={originalImageSrc}
                                                            alt="Live Fit Preview"
                                                            className="w-full h-full object-cover object-center transition-transform duration-100"
                                                            style={{ transform: `scale(${zoom})` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="text-[11px] text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-start gap-2">
                                                    <span className="text-orange-400">💡</span>
                                                    <span>Center the main person/subject inside the box so the curved border doesn't clip important features.</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 w-full border-t pt-4">
                                            <button type="button" onClick={handleCropCancel} className="px-5 py-2 border rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors">
                                                Cancel
                                            </button>
                                            <button type="button" onClick={handleCropConfirm} className="px-6 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-md text-sm font-semibold transition-colors">
                                                <CropIcon size={18} /> Confirm & Apply Crop
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Dual Image Preview & Fit View */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Upload / Original Preview */}
                                            <div className="flex flex-col">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                                    Uploaded Image File
                                                </label>
                                                <div className="w-full h-44 rounded-xl overflow-hidden border-2 border-dashed border-indigo-200 relative group flex flex-col justify-center items-center bg-slate-50 shadow-inner">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center text-gray-400 p-4 text-center">
                                                            <ImageIcon size={36} className="mb-2 text-indigo-400" />
                                                            <span className="text-xs font-bold text-gray-700">Click to Upload Banner Image</span>
                                                            <span className="text-[11px] text-gray-400 mt-1">PNG, JPG or WEBP image</span>
                                                        </div>
                                                    )}
                                                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white p-4">
                                                        <span className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow mb-1">Upload New Image</span>
                                                        <span className="text-[10px] text-gray-200">Opens Crop & Fit Adjuster</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                    </label>
                                                </div>
                                                {imagePreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleReCrop}
                                                        className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 self-start bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 transition-colors"
                                                    >
                                                        <CropIcon size={14} /> Adjust / Crop Fit
                                                    </button>
                                                )}
                                            </div>

                                            {/* Homepage Half-Circle Live Fit Preview Box */}
                                            <div className="flex flex-col">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                                                    <span>Homepage Half-Circle Fit</span>
                                                    <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                        Live Preview
                                                    </span>
                                                </label>
                                                <div className="w-full h-44 rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between overflow-hidden shadow-inner relative">
                                                    <div className="space-y-1 text-white max-w-[100px] z-10">
                                                        <span className="text-[7px] font-extrabold tracking-wider uppercase text-orange-400 block">HOMEPAGE HERO</span>
                                                        <div className="text-[10px] font-bold leading-tight">Empowering Minds.</div>
                                                        <div className="text-[8px] text-slate-400 leading-tight line-clamp-2">Industry-focused training...</div>
                                                    </div>

                                                    {/* Half-Circle Container Replica */}
                                                    <div className="relative w-[110px] h-[145px] rounded-l-full overflow-hidden border-l-[3px] border-white shadow-2xl bg-slate-900 flex items-center justify-center shrink-0">
                                                        {imagePreview ? (
                                                            <img src={imagePreview} alt="Homepage Fit" className="w-full h-full object-cover object-center" />
                                                        ) : (
                                                            <div className="text-[10px] text-slate-500 text-center px-2">No image uploaded</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-1">This shows exactly how your image will fit in the half-circle container on the website.</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name / Title (Optional)</label>
                                            <input 
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                placeholder="e.g. Ishwar Nirvikar"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Testimonial Quote / Description (Optional)</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                placeholder="e.g. As a student of UI/UX & Graphic Design course, I gained both technical and creative skills..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role / Subtitle (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="linkLabel"
                                                    value={formData.linkLabel}
                                                    onChange={handleInputChange}
                                                    className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    placeholder="e.g. Designer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Working At / Company Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="linkUrl"
                                                    value={formData.linkUrl}
                                                    onChange={handleInputChange}
                                                    className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    placeholder="e.g. French Crown"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center pt-1">
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border w-full">
                                                <input 
                                                    type="checkbox"
                                                    name="isActive"
                                                    checked={formData.isActive}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-indigo-600 rounded"
                                                />
                                                <span className="text-sm font-bold text-gray-700">Show on Website Homepage</span>
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                            <button 
                                                type="button" 
                                                onClick={() => setShowModal(false)}
                                                className="px-6 py-2 rounded-xl border hover:bg-gray-50 transition-colors text-sm font-semibold"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                disabled={submitting}
                                                className="px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2 text-sm font-bold shadow-md"
                                            >
                                                {submitting ? 'Saving...' : (editMode ? 'Update Banner' : 'Save Banner')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>
                )}

                {/* Hero Text Management Modal */}
                {showHeroTextModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
                            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/80 sticky top-0 z-20 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                                        <Type size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">Manage Homepage Hero Text</h3>
                                        <p className="text-xs text-gray-500">Edit the main heading, tagline & description on http://localhost:5173/</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHeroTextModal(false)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                                    <X size={22} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSaveHeroText} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Left Form Controls */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                                Tagline / Badge Text
                                            </label>
                                            <input 
                                                type="text"
                                                name="badgeText"
                                                value={heroTextForm.badgeText}
                                                onChange={handleHeroTextChange}
                                                required
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-gray-800"
                                                placeholder="LEARN. PRACTICE. MASTER."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                                Heading Line 1
                                            </label>
                                            <input 
                                                type="text"
                                                name="titleLine1"
                                                value={heroTextForm.titleLine1}
                                                onChange={handleHeroTextChange}
                                                required
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-gray-800"
                                                placeholder="Empowering Minds."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                                Heading Line 2 (Highlighted)
                                            </label>
                                            <input 
                                                type="text"
                                                name="titleLine2"
                                                value={heroTextForm.titleLine2}
                                                onChange={handleHeroTextChange}
                                                required
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-gray-800"
                                                placeholder="Building Futures."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                                Description Paragraph
                                            </label>
                                            <textarea 
                                                name="description"
                                                value={heroTextForm.description}
                                                onChange={handleHeroTextChange}
                                                rows={3}
                                                required
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-sm leading-relaxed text-gray-800"
                                                placeholder="Industry-focused training designed to build your skills..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                                Primary CTA Button Label
                                            </label>
                                            <input 
                                                type="text"
                                                name="buttonLabel"
                                                value={heroTextForm.buttonLabel}
                                                onChange={handleHeroTextChange}
                                                required
                                                className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-gray-800"
                                                placeholder="Explore Courses"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Live Preview Box */}
                                    <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                                    Live Homepage Text Preview
                                                </span>
                                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">http://localhost:5173/</span>
                                            </div>

                                            {/* Replica Hero Text Section */}
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <div className="text-[11px] font-extrabold tracking-widest text-amber-400 uppercase">
                                                    {heroTextForm.badgeText || 'LEARN. PRACTICE. MASTER.'}
                                                </div>

                                                <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                                                    {heroTextForm.titleLine1 || 'Empowering Minds.'} <br />
                                                    <span className="text-blue-400">{heroTextForm.titleLine2 || 'Building Futures.'}</span>
                                                </h2>

                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    {heroTextForm.description || 'Industry-focused training designed to build your skills, boost confidence and create better career opportunities.'}
                                                </p>

                                                <div className="pt-1">
                                                    <span className="inline-flex items-center gap-2 bg-[#0a1931] border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                        {heroTextForm.buttonLabel || 'Explore Courses'} →
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                                            💡 <strong>Tip:</strong> Saving will update this hero text instantly on the main website homepage!
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowHeroTextModal(false)}
                                        className="px-6 py-2 rounded-xl border hover:bg-gray-50 transition-colors text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={savingHeroText}
                                        className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-70 flex items-center gap-2 text-sm font-bold shadow-md"
                                    >
                                        {savingHeroText ? 'Saving...' : 'Save Hero Text'}
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

export default ManageBanners;

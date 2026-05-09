import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus, Search, Edit, Trash2, X, Crop as CropIcon } from 'lucide-react';
import bannerService from '../../../services/bannerService';
import { toast } from 'react-toastify';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../../utils/cropUtils';
import Swal from 'sweetalert2';

const ManageBanners = () => {
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
        isActive: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Crop State
    const [originalImageSrc, setOriginalImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    // --- Effects ---
    useEffect(() => {
        fetchBanners();
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
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
        e.target.value = '';
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
        setEditMode(false);
        setFormData({
            title: '',
            isActive: true
        });
        setImageFile(null);
        setImagePreview(null);
        setOriginalImageSrc(null);
        setShowCropper(false);
        setShowModal(true);
    };

    const handleEdit = (banner) => {
        setEditMode(true);
        setCurrentId(banner._id);
        setFormData({
            title: banner.title || '',
            isActive: banner.isActive
        });
        setImagePreview(banner.image);
        setImageFile(null);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
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
        
        if (!editMode && !imageFile) {
            toast.error('Please select an image for the banner');
            return;
        }

        setSubmitting(true);

        const data = new FormData();
        data.append('title', formData.title);
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
        (b.title || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                    <button 
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={20} /> Add New Banner
                    </button>
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
                                <th className="p-3 border-b">Title (Optional)</th>
                                <th className="p-3 border-b">Status</th>
                                <th className="p-3 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-8 text-gray-500">Loading banners...</td></tr>
                            ) : filteredBanners.length === 0 ? (
                                <tr><td colSpan="4" className="text-center p-8 text-gray-500">No banners found.</td></tr>
                            ) : (
                                filteredBanners.map((banner) => (
                                    <tr key={banner._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                        <td className="p-3">
                                            <div className="w-32 h-16 rounded overflow-hidden border shadow-sm">
                                                <img src={banner.image || 'https://via.placeholder.com/300x150'} alt={banner.title} className="w-full h-full object-cover" />
                                            </div>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-800">{banner.title || '-'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {editMode ? 'Edit Banner' : 'Add New Banner'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {showCropper ? (
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-full h-[300px] bg-gray-900 rounded-lg overflow-hidden mb-4">
                                            <Cropper
                                                image={originalImageSrc}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={1920 / 800} // Fixed aspect ratio for wide banners
                                                onCropChange={setCrop}
                                                onZoomChange={setZoom}
                                                onCropComplete={onCropComplete}
                                            />
                                        </div>
                                        <div className="w-full flex items-center gap-4 mb-4">
                                            <span className="text-sm font-medium text-gray-700">Zoom:</span>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                onChange={(e) => setZoom(e.target.value)}
                                                className="w-full accent-indigo-600"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 w-full border-t pt-4">
                                            <button type="button" onClick={handleCropCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                            <button type="button" onClick={handleCropConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                                                <CropIcon size={16} /> Apply Crop
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-center mb-4">
                                    <div className="w-full h-40 rounded-lg overflow-hidden border-4 border-indigo-50 mb-2 relative group flex justify-center items-center bg-gray-100">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <ImageIcon size={40} className="mb-2" />
                                                <span>Upload Banner Image</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                            <span className="text-white text-sm font-bold">Choose Image</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">Recommended: 1920x800px landscape image</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                                    <input 
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. Summer Admissions"
                                    />
                                </div>
                                
                                <div className="flex items-center pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Show on Website</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {submitting ? 'Saving...' : (editMode ? 'Update' : 'Save')}
                                    </button>
                                </div>
                                </>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageBanners;

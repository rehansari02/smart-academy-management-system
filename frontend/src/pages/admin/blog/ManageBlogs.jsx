import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogs, createBlog, updateBlog, deleteBlog, resetBlogState } from '../../../features/blog/blogSlice';
import { toast } from 'react-toastify';
import { 
    Plus, Edit, Trash2, Search, X, Image as ImageIcon, 
    Calendar, User, Tag, Eye, Save, RotateCcw, Loader,
    Crop, RotateCw, ZoomIn, ZoomOut, Check, Sparkles
} from 'lucide-react';
import moment from 'moment';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { getCroppedImg, createImage, getRadianAngle, rotateSize } from '../../../utils/cropUtils';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const BlogImageCropperModal = ({
    isOpen,
    onClose,
    imageSrc,
    onCropSave,
    articleTitle = '',
    articleCategory = 'General',
    articleExcerpt = ''
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(16 / 9);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const canvasRef = useRef(null);

    const onCropComplete = useCallback((croppedArea, pixels) => {
        setCroppedAreaPixels(pixels);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setAspect(16 / 9);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !canvasRef.current || !croppedAreaPixels || !imageSrc) return;
        let isCancelled = false;

        const updateLiveCanvas = async () => {
            try {
                const img = await createImage(imageSrc);
                if (isCancelled) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const rotRad = getRadianAngle(rotation);
                const { width: bBoxWidth, height: bBoxHeight } = rotateSize(img.width, img.height, rotation);

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = bBoxWidth;
                tempCanvas.height = bBoxHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
                tempCtx.rotate(rotRad);
                tempCtx.translate(-img.width / 2, -img.height / 2);
                tempCtx.drawImage(img, 0, 0);

                canvas.width = croppedAreaPixels.width;
                canvas.height = croppedAreaPixels.height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    tempCanvas,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );
            } catch (err) {
                // Ignore transient draw updates while panning
            }
        };

        updateLiveCanvas();
        return () => { isCancelled = true; };
    }, [isOpen, croppedAreaPixels, rotation, imageSrc]);

    if (!isOpen || !imageSrc) return null;

    const handleApplyCrop = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const result = await getCroppedImg(imageSrc, croppedAreaPixels, {
                rotation,
                fileName: `blog_cover_${Date.now()}.png`
            });
            if (result) {
                onCropSave(result);
                onClose();
            }
        } catch (error) {
            console.error('Failed to crop image:', error);
            toast.error('Failed to process cropped image');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/20">
                            <Crop size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                                Adjust & Crop Cover Image
                                <span className="text-[10px] uppercase font-extrabold bg-amber-400/20 text-amber-300 border border-amber-300/30 px-2 py-0.5 rounded-full">Live Website Preview</span>
                            </h3>
                            <p className="text-xs text-slate-300 font-medium">
                                Adjust crop position to control exactly how visitors will see the cover on the website
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white"
                        title="Close"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* Left: Cropper Viewport & Controls (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            {/* Aspect Ratio Tabs */}
                            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-500 uppercase px-2">Crop Ratio:</span>
                                {[
                                    { label: '16:9 (Website Best)', value: 16 / 9 },
                                    { label: '4:3 (Standard)', value: 4 / 3 },
                                    { label: '1:1 (Square)', value: 1 / 1 },
                                    { label: 'Free (Any)', value: null },
                                ].map((tab) => (
                                    <button
                                        key={tab.label}
                                        type="button"
                                        onClick={() => setAspect(tab.value)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            aspect === tab.value
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Cropper Viewport */}
                            <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={aspect}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                    onCropComplete={onCropComplete}
                                    showGrid={true}
                                />
                            </div>

                            {/* Controls */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                {/* Zoom slider */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <div className="flex-grow flex items-center gap-2">
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.05}
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <span className="text-xs font-bold text-slate-600 w-12 text-right">
                                            {zoom.toFixed(1)}x
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                                        title="Zoom In"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                </div>

                                {/* Rotation & Reset */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRotation((prev) => (prev + 90) % 360)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5"
                                        >
                                            <RotateCw size={14} /> Rotate 90° ({rotation}°)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCrop({ x: 0, y: 0 });
                                                setZoom(1);
                                                setRotation(0);
                                                setAspect(16 / 9);
                                            }}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition flex items-center gap-1.5"
                                        >
                                            <RotateCcw size={14} /> Reset
                                        </button>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                        Drag image to reposition • Scroll to zoom
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Live Website Preview (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col items-center">
                            <div className="w-full max-w-[340px] space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <Eye size={15} className="text-indigo-600" /> Website Live Preview
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        Exact Website Look
                                    </span>
                                </div>

                                {/* Mock Website Blog Card */}
                                <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl overflow-hidden group">
                                    {/* Live Canvas Image */}
                                    <div className="relative h-44 sm:h-48 bg-slate-100 overflow-hidden flex items-center justify-center">
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-full object-cover transition-all"
                                        />
                                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                                            {articleCategory || 'General'}
                                        </div>
                                    </div>

                                    {/* Mock Card Content */}
                                    <div className="p-4 sm:p-5 space-y-2.5">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                                            <span className="text-indigo-600 font-bold uppercase">{articleCategory || 'General'}</span>
                                            <span>•</span>
                                            <span>4 min read</span>
                                        </div>

                                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug line-clamp-2">
                                            {articleTitle?.trim() || 'Enter your catchy blog article title...'}
                                        </h4>

                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">
                                            {articleExcerpt?.trim() || 'This is how your excerpt summary will be presented to students and readers on the blog listing page...'}
                                        </p>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">
                                                    S
                                                </div>
                                                <span className="font-bold text-slate-700">Smart Institute</span>
                                            </div>
                                            <span>Just now</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/80 rounded-2xl p-3 border border-blue-100 text-xs text-blue-900 space-y-1">
                                    <div className="font-bold flex items-center gap-1 text-blue-800">
                                        <Sparkles size={14} className="text-blue-600" /> Auto-Fit Optimization
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-blue-700">
                                        Website card aur Article header dono me image bina kisi cut-off ke perfectly dikhegi.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400">
                        High definition quality is preserved automatically.
                    </span>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyCrop}
                            disabled={isProcessing}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader size={16} className="animate-spin" /> Processing...
                                </>
                            ) : (
                                <>
                                    <Check size={16} /> Apply Crop & Use Image
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManageBlogs = () => {
    const dispatch = useDispatch();
    const { add, edit, delete: canDelete } = useUserRights('Manage Blogs');
    const { blogs = [], isLoading, isSuccess, isError, message } = useSelector((state) => state.blogs);
    
    console.log("Current Blogs in State:", blogs);

    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropRawImageSrc, setCropRawImageSrc] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        excerpt: '',
        category: 'General',
        tags: '',
        isPublished: true
    });

    useEffect(() => {
        dispatch(fetchBlogs());
    }, [dispatch]);

    useEffect(() => {
        if (isSuccess) {
            toast.success(editMode ? 'Blog updated successfully' : 'Blog created successfully');
            dispatch(fetchBlogs()); // Refresh list from server
            closeForm();
            dispatch(resetBlogState());
        }
        if (isError) {
            toast.error(message);
            dispatch(resetBlogState());
        }
    }, [isSuccess, isError, message, dispatch, editMode]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setCropRawImageSrc(objectUrl);
            setShowCropModal(true);
        }
        e.target.value = '';
    };

    const handleOpenCropAdjust = () => {
        const srcToCrop = cropRawImageSrc || previewImage;
        if (srcToCrop) {
            setCropRawImageSrc(srcToCrop);
            setShowCropModal(true);
        }
    };

    const handleCropSave = ({ file, url }) => {
        setImageFile(file);
        setPreviewImage(url);
        toast.success('Image crop & adjust ho gaya!');
    };

    const openForm = (blog = null) => {
        if (blog) {
            if (!edit) {
                showPermissionDenied("You don't have authority to edit blogs.");
                return;
            }
            setEditMode(true);
            setCurrentId(blog._id);
            setFormData({
                title: blog.title,
                content: blog.content,
                excerpt: blog.excerpt || '',
                category: blog.category || 'General',
                tags: blog.tags ? blog.tags.join(', ') : '',
                isPublished: blog.isPublished
            });
            setPreviewImage(blog.image ? (blog.image.startsWith('http') ? blog.image : `http://localhost:5000/${blog.image}`) : null);
        } else {
            if (!add) {
                showPermissionDenied("You don't have authority to add blogs.");
                return;
            }
            setEditMode(false);
            setCurrentId(null);
            setFormData({
                title: '',
                content: '',
                excerpt: '',
                category: 'General',
                tags: '',
                isPublished: true
            });
            setPreviewImage(null);
            setImageFile(null);
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditMode(false);
        setCurrentId(null);
        setPreviewImage(null);
        setImageFile(null);
        setShowCropModal(false);
        setCropRawImageSrc(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode && !edit) {
            showPermissionDenied("You don't have authority to edit blogs.");
            return;
        }
        if (!editMode && !add) {
            showPermissionDenied("You don't have authority to add blogs.");
            return;
        }
        
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });
        if (imageFile) {
            data.append('image', imageFile);
        }

        if (editMode) {
            dispatch(updateBlog({ id: currentId, formData: data }));
        } else {
            dispatch(createBlog(data));
        }
    };

    const handleDelete = (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete blogs.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this blog?')) {
            dispatch(deleteBlog(id));
        }
    };

    const filteredBlogs = blogs.filter(blog => 
        (blog.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (blog.category?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Blog Manager</h1>
                        <p className="text-gray-500 mt-1">Manage your website's articles and content</p>
                    </div>
                    <button 
                        onClick={() => openForm()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg hover:shadow-indigo-200"
                    >
                        <Plus size={20} /> New Article
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by title or category..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                    <button onClick={() => dispatch(fetchBlogs())} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition" title="Refresh">
                        <RotateCcw size={20} />
                    </button>
                    </div>
                </div>

                {/* Blogs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading && blogs.length === 0 ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100"></div>
                        ))
                    ) : (
                        filteredBlogs.map(blog => (
                            <div key={blog._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                                <div className="h-48 bg-gray-200 relative overflow-hidden">
                                    {blog.image ? (
                                        <img 
                                            src={blog.image.startsWith('http') ? blog.image : `http://localhost:5000/${blog.image}`} 
                                            alt={blog.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <ImageIcon size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-wider">
                                        {blog.category}
                                    </div>
                                    {!blog.isPublished && (
                                        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase">
                                            Draft
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1 mb-2">{blog.title}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{blog.excerpt || 'No excerpt available...'}</p>
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-5 border-t border-gray-50 pt-4">
                                        <div className="flex items-center gap-1.5">
                                            <User size={14} />
                                            <span>{blog.authorName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            <span>{moment(blog.createdAt).format('MMM DD, YYYY')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Eye size={14} />
                                            <span>{blog.views}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => openForm(blog)}
                                            className="flex-grow flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition"
                                        >
                                            <Edit size={16} /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(blog._id)}
                                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {filteredBlogs.length === 0 && !isLoading && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 mt-6">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700">No blogs found</h3>
                        <p className="text-gray-400 mt-1">Try adjusting your search term or create a new article</p>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-scale-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-[2rem]">
                            <div>
                                <h2 className="text-2xl font-black">{editMode ? 'Edit Article' : 'Create Article'}</h2>
                                <p className="text-indigo-100 text-sm">{editMode ? 'Make changes to your article' : 'Write a new article for your readers'}</p>
                            </div>
                            <button onClick={closeForm} className="bg-white/20 hover:bg-white/40 p-2.5 rounded-full transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-8">
                            {/* Main Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6 md:col-span-2">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Article Title</label>
                                        <input 
                                            name="title"
                                            required
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter a catchy title..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition text-lg font-bold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                                            <select 
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition font-bold"
                                            >
                                                <option>General</option>
                                                <option>Education</option>
                                                <option>Tech</option>
                                                <option>News</option>
                                                <option>Career</option>
                                                <option>Success Stories</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tags (Comma separated)</label>
                                            <div className="relative">
                                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input 
                                                    name="tags"
                                                    value={formData.tags}
                                                    onChange={handleInputChange}
                                                    placeholder="exam, study, smart..."
                                                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Excerpt */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Excerpt (Short Summary)</label>
                                    <textarea 
                                        name="excerpt"
                                        rows="2"
                                        value={formData.excerpt}
                                        onChange={handleInputChange}
                                        placeholder="Briefly describe what this article is about..."
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition font-medium resize-none"
                                    ></textarea>
                                </div>

                                {/* Content */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Article Content</label>
                                    <textarea 
                                        name="content"
                                        required
                                        rows="10"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        placeholder="Start writing your masterpiece here..."
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition font-medium"
                                    ></textarea>
                                </div>

                                {/* Image Upload */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Featured Image</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div 
                                            className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-300 transition cursor-pointer bg-gray-50 group"
                                            onClick={() => document.getElementById('blog-image-input').click()}
                                        >
                                            <div className="bg-indigo-100 p-4 rounded-2xl group-hover:bg-indigo-200 transition">
                                                <Plus size={32} className="text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase">Upload Cover Photo</p>
                                            <input 
                                                id="blog-image-input"
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden" 
                                            />
                                        </div>
                                        {previewImage && (
                                            <div className="relative group rounded-3xl overflow-hidden shadow-xl aspect-video border-2 border-indigo-100 bg-slate-900">
                                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                                
                                                {/* Action Overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-[2px]">
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCropAdjust}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition transform hover:scale-105"
                                                    >
                                                        <Crop size={15} /> Adjust & Crop
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('blog-image-input').click()}
                                                        className="bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition transform hover:scale-105"
                                                    >
                                                        <Edit size={15} /> Change
                                                    </button>
                                                </div>

                                                {/* Delete Button */}
                                                <button 
                                                    type="button"
                                                    onClick={() => { setPreviewImage(null); setImageFile(null); setCropRawImageSrc(null); }}
                                                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition"
                                                    title="Remove image"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Settings */}
                                <div className="md:col-span-2 bg-gray-50 p-6 rounded-3xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${formData.isPublished ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                            <Save size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Publication Status</h4>
                                            <p className="text-xs text-gray-500">{formData.isPublished ? 'Visible to everyone' : 'Only visible in manager'}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            name="isPublished"
                                            className="sr-only peer"
                                            checked={formData.isPublished}
                                            onChange={handleInputChange}
                                        />
                                        <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-[2rem] flex justify-end gap-4">
                            <button 
                                type="button" 
                                onClick={closeForm}
                                className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-10 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                {editMode ? 'Update Article' : 'Publish Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blog Image Cropper & Live Website Preview Modal */}
            <BlogImageCropperModal
                isOpen={showCropModal}
                onClose={() => setShowCropModal(false)}
                imageSrc={cropRawImageSrc}
                onCropSave={handleCropSave}
                articleTitle={formData.title}
                articleCategory={formData.category}
                articleExcerpt={formData.excerpt}
            />
        </div>
    );
};

export default ManageBlogs;

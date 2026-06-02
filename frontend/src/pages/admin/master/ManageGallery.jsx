import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Search, Image as ImageIcon, Edit2, Trash2, X, Upload, ArrowLeft, CheckCircle, Camera, Layers, Tag, Eye, EyeOff, ExternalLink, PlayCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import galleryService from '../../../services/galleryService';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const getYoutubeVideoId = (parsed) => {
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname.includes('youtu.be')) return pathParts[0] || '';
    if (['embed', 'shorts', 'live'].includes(pathParts[0])) return pathParts[1] || '';
    return parsed.searchParams.get('v') || '';
};

const getInstagramEmbedUrl = (url) => {
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    return `${cleanUrl}/embed`;
};

const getFacebookEmbedUrl = (parsed, url) => {
    const path = parsed.pathname.toLowerCase();
    const isVideo = parsed.hostname.includes('fb.watch')
        || path.includes('/videos/')
        || path.includes('/watch/')
        || path.includes('/reel/')
        || path.includes('/share/v/');
    const pluginType = isVideo ? 'video' : 'post';
    return `https://www.facebook.com/plugins/${pluginType}.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;
};

const getGalleryLinkInfo = (rawUrl = '') => {
    const value = rawUrl.trim();
    if (!value) return { type: 'none', label: 'No Link', url: '', embedUrl: '', host: '' };

    const normalizedUrl = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
        const parsed = new URL(normalizedUrl);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host.includes('youtube.com') || host.includes('youtu.be')) {
            const videoId = getYoutubeVideoId(parsed);

            return {
                type: 'youtube',
                label: 'YouTube',
                url: normalizedUrl,
                embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : normalizedUrl,
                thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '',
                host
            };
        }

        if (host.includes('instagram.com')) {
            return {
                type: 'instagram',
                label: 'Instagram',
                url: normalizedUrl,
                embedUrl: getInstagramEmbedUrl(normalizedUrl),
                thumbnailUrl: '',
                host
            };
        }

        if (host.includes('facebook.com') || host.includes('fb.watch')) {
            return {
                type: 'facebook',
                label: 'Facebook',
                url: normalizedUrl,
                embedUrl: getFacebookEmbedUrl(parsed, normalizedUrl),
                thumbnailUrl: '',
                host
            };
        }

        return { type: 'link', label: 'External Link', url: normalizedUrl, embedUrl: '', thumbnailUrl: '', host };
    } catch {
        return { type: 'link', label: 'External Link', url: value, embedUrl: '', thumbnailUrl: '', host: value };
    }
};

// Keep saved links clean, but only convert YouTube to iframe format.
const formatVideoLink = (url) => {
    const linkInfo = getGalleryLinkInfo(url);
    return linkInfo.type === 'youtube' ? linkInfo.embedUrl : linkInfo.url;
};

const getLinkTheme = (type) => {
    switch (type) {
        case 'youtube': return 'bg-red-600 text-white border-red-600';
        case 'instagram': return 'bg-pink-600 text-white border-pink-600';
        case 'facebook': return 'bg-blue-600 text-white border-blue-600';
        default: return 'bg-gray-800 text-white border-gray-800';
    }
};

const GalleryLinkPreview = ({ url, compact = false }) => {
    const linkInfo = getGalleryLinkInfo(url);
    if (!linkInfo.url) return null;

    if (linkInfo.embedUrl && ['youtube', 'instagram', 'facebook'].includes(linkInfo.type)) {
        return (
            <div className={`rounded-xl overflow-hidden border shadow-sm ${
                linkInfo.type === 'youtube' ? 'border-red-100 bg-black' :
                linkInfo.type === 'instagram' ? 'border-pink-100 bg-white' :
                'border-blue-100 bg-white'
            }`}>
                {linkInfo.type !== 'youtube' && (
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${linkInfo.type === 'instagram' ? 'bg-pink-50' : 'bg-blue-50'}`}>
                        <div className="min-w-0">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">{linkInfo.label} Preview</p>
                            <p className="truncate text-sm font-bold text-gray-800">{linkInfo.host || linkInfo.url}</p>
                        </div>
                        <a href={linkInfo.url} target="_blank" rel="noreferrer" className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${getLinkTheme(linkInfo.type)}`}>
                            Open
                        </a>
                    </div>
                )}
                <iframe
                    src={linkInfo.embedUrl}
                    title={`${linkInfo.label} preview`}
                    className={linkInfo.type === 'youtube' ? 'w-full aspect-video' : 'w-full min-h-[420px] bg-white'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <a
            href={linkInfo.url}
            target="_blank"
            rel="noreferrer"
            className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'text-center' : ''} ${
                linkInfo.type === 'instagram' ? 'border-pink-200 bg-pink-50' :
                linkInfo.type === 'facebook' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200 bg-gray-50'
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getLinkTheme(linkInfo.type)}`}>
                        {linkInfo.type === 'youtube' ? <PlayCircle size={20} /> : <ExternalLink size={18} />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 text-sm">{linkInfo.label}</p>
                        <p className="text-xs text-gray-500 font-semibold truncate">{linkInfo.host || linkInfo.url}</p>
                    </div>
                </div>
                <ExternalLink size={16} className="text-gray-400 shrink-0" />
            </div>
        </a>
    );
};

// ── Image Upload Panel (add more photos to existing event) ──────────────────
const ImagePanel = ({ gallery, onBack, onUpdated }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [current, setCurrent] = useState({ ...gallery });
    const currentLink = getGalleryLinkInfo(current.videoLink);
    const { add, delete: canDelete } = useUserRights('Gallery');

    const refresh = async () => {
        const data = await galleryService.getGalleryById(gallery._id);
        setCurrent(data);
        onUpdated();
    };

    const handleFile = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 5) { toast.error('Max 5 images at a time'); return; }
        setFiles(selected.map(f => ({ file: f, preview: URL.createObjectURL(f) })));
    };

    const handleUpload = async () => {
        if (!add) {
            showPermissionDenied("You don't have authority to upload gallery photos.");
            return;
        }
        if (!files.length) return toast.error('Select at least one image');
        setUploading(true);
        const fd = new FormData();
        files.forEach(f => fd.append('images', f.file));
        try {
            await galleryService.addImages(gallery._id, fd);
            toast.success(`${files.length} image(s) uploaded!`);
            setFiles([]);
            refresh();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Upload failed');
        } finally { setUploading(false); }
    };

    const handleDeleteImg = (imgUrl) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete gallery photos.");
            return;
        }
        Swal.fire({
            title: 'Delete this photo?', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33',
            confirmButtonText: 'Delete'
        }).then(async r => {
            if (r.isConfirmed) {
                try {
                    await galleryService.deleteImage(gallery._id, imgUrl);
                    toast.success('Photo removed');
                    refresh();
                } catch { toast.error('Failed to delete'); }
            }
        });
    };

    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-1 text-pink-600 hover:underline text-sm font-semibold mb-4">
                <ArrowLeft size={16} /> Back to events
            </button>

            <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100 flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h2 className="font-extrabold text-gray-800 text-lg">{current.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{current.category} &bull; {current.images?.length || 0} photos</p>
                    {current.description && <p className="text-sm text-gray-600 mt-1">{current.description}</p>}
                </div>
                {currentLink.url && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getLinkTheme(currentLink.type)}`}>
                        <ExternalLink size={14} /> {currentLink.label} Link Attached
                    </div>
                )}
            </div>

            {currentLink.url && (
                <div className="mb-5">
                    <h3 className="font-bold text-gray-700 text-sm uppercase mb-3">Attached Link</h3>
                    <GalleryLinkPreview url={current.videoLink} />
                </div>
            )}

            {/* Upload zone */}
            <div className="border-2 border-dashed border-pink-300 rounded-xl p-5 text-center bg-pink-50/50 mb-5">
                <Upload size={32} className="mx-auto text-pink-400 mb-2" />
                <p className="text-sm font-semibold text-gray-700 mb-3">Add up to <span className="text-pink-600">5 photos</span> at once</p>
                <label>
                    <input type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />
                    <span className="cursor-pointer inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        <Camera size={16} /> Choose Photos
                    </span>
                </label>
            </div>

            {files.length > 0 && (
                <div className="mb-5">
                    <div className="flex gap-3 flex-wrap mb-3">
                        {files.map((f, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm">
                                <img src={f.preview} className="w-full h-full object-cover" />
                                <button onClick={() => setFiles(prev => prev.filter((_, ii) => ii !== i))}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleUpload} disabled={uploading}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
                        {uploading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><CheckCircle size={16} /> Upload {files.length} Photo{files.length > 1 ? 's' : ''}</>}
                    </button>
                </div>
            )}

            {/* Existing photos */}
            <h3 className="font-bold text-gray-700 text-sm uppercase mb-3">Photos ({current.images?.length || 0})</h3>
            {!current.images?.length ? (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                    <ImageIcon size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No photos yet. Upload above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {current.images.map((img, i) => (
                        <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border shadow-sm">
                            <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${img}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                            <button onClick={() => handleDeleteImg(img)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                <Trash2 size={11} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Admin Component ─────────────────────────────────────────────────────
const ManageGallery = () => {
    const [activeTab, setActiveTab] = useState('albums'); // 'albums' or 'categories'
    const [galleries, setGalleries] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');
    const [selectedGallery, setSelectedGallery] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [submitting, setSubmitting] = useState(false);

    // New Category Form
    const [newCatName, setNewCatName] = useState('');
    const [catLoading, setCatLoading] = useState(false);

    // Form
    const [form, setForm] = useState({ title: '', description: '', category: '', videoLink: '', isActive: true });
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const { add, edit, delete: canDelete } = useUserRights('Gallery');

    const fetchData = async () => {
        try { 
            setLoading(true); 
            const [galData, catData] = await Promise.all([
                galleryService.getGalleries(),
                galleryService.getCategories()
            ]);
            setGalleries(galData);
            setCategoryList(catData);
        } catch { 
            toast.error('Failed to load gallery data'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!add) {
            showPermissionDenied("You don't have authority to create gallery categories.");
            return;
        }
        if (!newCatName.trim()) return;
        setCatLoading(true);
        try {
            await galleryService.createCategory({ name: newCatName.trim(), isActive: true });
            toast.success('Category created successfully!');
            setNewCatName('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create category');
        } finally {
            setCatLoading(false);
        }
    };

    const handleToggleCategoryActive = async (cat) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update gallery categories.");
            return;
        }
        try {
            await galleryService.updateCategory(cat._id, { isActive: !cat.isActive });
            toast.success('Category status updated');
            fetchData();
        } catch {
            toast.error('Failed to update category');
        }
    };

    const handleToggleGalleryActive = async (g) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update gallery albums.");
            return;
        }
        try {
            await galleryService.updateGallery(g._id, { isActive: !g.isActive });
            toast.success(`Event album is now ${!g.isActive ? 'Visible' : 'Hidden'} on website`);
            fetchData();
        } catch {
            toast.error('Failed to update event status');
        }
    };

    const handleDeleteCategory = async (id, name) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete gallery categories.");
            return;
        }
        Swal.fire({
            title: `Delete Category "${name}"?`,
            text: "This will remove the category from selection options.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete!'
        }).then(async r => {
            if (r.isConfirmed) {
                try {
                    await galleryService.deleteCategory(id);
                    toast.success('Category deleted');
                    fetchData();
                } catch {
                    toast.error('Failed to delete category');
                }
            }
        });
    };

    const openCreate = () => {
        if (!add) {
            showPermissionDenied("You don't have authority to create gallery albums.");
            return;
        }
        setEditItem(null);
        setForm({ title: '', description: '', category: categoryList[0]?.name || '', videoLink: '', isActive: true });
        setFiles([]); setPreviews([]);
        setShowModal(true);
    };

    const openEdit = (g) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit gallery albums.");
            return;
        }
        setEditItem(g);
        setForm({ title: g.title, description: g.description, category: g.category, videoLink: g.videoLink || '', isActive: g.isActive });
        setFiles([]); setPreviews([]);
        setShowModal(true);
    };

    const handleFileChange = (e) => {
        const sel = Array.from(e.target.files);
        if (sel.length > 5) { toast.error('Max 5 images'); return; }
        setFiles(sel);
        setPreviews(sel.map(f => URL.createObjectURL(f)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editItem ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editItem ? 'edit' : 'create'} gallery albums.`);
            return;
        }
        if (!form.title) return toast.error('Title is required');
        if (!form.category) return toast.error('Please select or create a category first');
        if (!editItem && files.length === 0 && (!form.videoLink || !form.videoLink.trim())) {
            return toast.error('Please upload at least one photo or provide a video link');
        }

        setSubmitting(true);
        try {
            const formattedVideo = formatVideoLink(form.videoLink);
            if (editItem) {
                await galleryService.updateGallery(editItem._id, { ...form, videoLink: formattedVideo });
                toast.success('Event updated!');
            } else {
                const fd = new FormData();
                fd.append('title', form.title);
                fd.append('description', form.description);
                fd.append('category', form.category);
                fd.append('videoLink', formattedVideo);
                fd.append('isActive', form.isActive);
                files.forEach(f => fd.append('images', f));
                await galleryService.createGallery(fd);
                toast.success('Gallery event created!');
            }
            setShowModal(false);
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save');
        } finally { setSubmitting(false); }
    };

    const handleDelete = (id, title) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete gallery albums.");
            return;
        }
        Swal.fire({ title: `Delete "${title}"?`, text: 'All photos & links will be removed!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete!'
        }).then(async r => {
            if (r.isConfirmed) {
                try { await galleryService.deleteGallery(id); toast.success('Deleted'); fetchData(); }
                catch { toast.error('Failed'); }
            }
        });
    };

    const categoriesFilterOptions = ['All', ...new Set(galleries.map(g => g.category))];
    const filteredGalleries = galleries.filter(g =>
        (filterCat === 'All' || g.category === filterCat) &&
        ((g.title || '').toLowerCase().includes(search.toLowerCase()) || (g.category || '').toLowerCase().includes(search.toLowerCase()))
    );

    if (view === 'images' && selectedGallery) {
        return (
            <div className="max-w-6xl mx-auto p-4">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <ImagePanel gallery={selectedGallery} onBack={() => { setView('list'); fetchData(); }} onUpdated={fetchData} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow-lg p-6">

                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 mb-5 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-pink-100 p-2.5 rounded-xl"><Layers className="text-pink-600" size={28} /></div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gallery & Category Management</h2>
                            <p className="text-sm text-gray-500">Manage categories, event albums, photos, and video links</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('albums')}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'albums' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <ImageIcon size={16} /> Event Albums
                        </button>
                        <button 
                            onClick={() => setActiveTab('categories')}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'categories' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <Tag size={16} /> Categories
                        </button>
                    </div>
                </div>

                {/* --- TAB 1: ALBUMS --- */}
                {activeTab === 'albums' && (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <div className="relative max-w-xs w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                    <input type="text" placeholder="Search events..." value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-8 pr-3 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-pink-300 outline-none" />
                                </div>
                                <div className="flex gap-1.5 flex-wrap items-center">
                                    {categoriesFilterOptions.map(cat => (
                                        <button key={cat} onClick={() => setFilterCat(cat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filterCat === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={openCreate}
                                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm whitespace-nowrap">
                                <Plus size={18} /> New Event Album
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600" /></div>
                        ) : filteredGalleries.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
                                <ImageIcon size={48} className="mx-auto mb-3 text-gray-300" />
                                <p className="font-semibold">No events found</p>
                                <p className="text-sm mt-1">Click "New Event Album" to create one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {filteredGalleries.map(g => {
                                    const linkInfo = getGalleryLinkInfo(g.videoLink);

                                    return (
                                    <div key={g._id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col justify-between"
                                        onClick={() => { setSelectedGallery(g); setView('images'); }}>
                                        <div>
                                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                                {g.images?.[0] ? (
                                                    <img src={g.images[0].startsWith('http') ? g.images[0] : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${g.images[0]}`} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : linkInfo.url ? (
                                                    <div className={`w-full h-full text-white flex flex-col items-center justify-center p-4 ${
                                                        linkInfo.type === 'youtube' ? 'bg-red-900' :
                                                        linkInfo.type === 'instagram' ? 'bg-pink-900' :
                                                        linkInfo.type === 'facebook' ? 'bg-blue-900' :
                                                        'bg-gray-900'
                                                    }`}>
                                                        <ExternalLink size={36} className="text-white/70 mb-2" />
                                                        <span className="text-xs font-bold uppercase tracking-wider text-white/80">{linkInfo.label}</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-gray-300" /></div>
                                                )}
                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <ImageIcon size={10} /> {g.images?.length || 0}
                                                </div>
                                                {linkInfo.url && (
                                                    <div className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getLinkTheme(linkInfo.type)}`}>
                                                        <ExternalLink size={10} /> {linkInfo.label}
                                                    </div>
                                                )}
                                                <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${g.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>{g.isActive ? 'Active' : 'Hidden'}</div>
                                            </div>
                                            <div className="p-4">
                                                <div className="inline-block text-[10px] font-bold uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200 rounded px-1.5 py-0.5 mb-1.5">{g.category}</div>
                                                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{g.title}</h3>
                                                {g.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</p>}
                                                {linkInfo.url && (
                                                    <a
                                                        href={linkInfo.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span className="truncate">{linkInfo.host || linkInfo.label}</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 pt-0">
                                            <div className="flex gap-1.5 border-t pt-3" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => { setSelectedGallery(g); setView('images'); }}
                                                    className="flex-1 text-xs bg-pink-50 text-pink-600 border border-pink-200 rounded-lg py-1.5 font-semibold hover:bg-pink-100 flex items-center justify-center gap-1">
                                                    <Camera size={12} /> Manage
                                                </button>
                                                <button onClick={() => handleToggleGalleryActive(g)} title={g.isActive ? "Hide on website" : "Show on website"} className={`p-1.5 border rounded-lg transition ${g.isActive ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                                                    {g.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                <button onClick={() => openEdit(g)} className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(g._id, g.title)} className="p-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 2: CATEGORIES --- */}
                {activeTab === 'categories' && (
                    <div className="max-w-3xl mx-auto py-4">
                        <div className="bg-pink-50/50 border border-pink-200 rounded-2xl p-6 mb-8 shadow-sm">
                            <h3 className="font-extrabold text-gray-800 text-lg mb-2 flex items-center gap-2">
                                <Plus className="text-pink-600" /> Create New Gallery Category
                            </h3>
                            <form onSubmit={handleCreateCategory} className="flex gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Enter category name (e.g., Campus Events, Awards, Seminars)..."
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="flex-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-400 outline-none font-medium bg-white shadow-inner"
                                    required
                                />
                                <button 
                                    type="submit" 
                                    disabled={catLoading}
                                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-6 py-3 rounded-xl shadow transition disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
                                >
                                    {catLoading ? 'Creating...' : 'Add Category'}
                                </button>
                            </form>
                        </div>

                        <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-4">Existing Categories ({categoryList.length})</h3>
                        {loading ? (
                            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" /></div>
                        ) : categoryList.length === 0 ? (
                            <div className="text-center py-12 border rounded-xl text-gray-400 font-medium">No categories created yet. Create one above!</div>
                        ) : (
                            <div className="space-y-3">
                                {categoryList.map(cat => (
                                    <div key={cat._id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-gray-800 text-base">{cat.name}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                    {cat.isActive ? 'Active (Visible)' : 'Hidden'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => handleToggleCategoryActive(cat)}
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${cat.isActive ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}`}
                                            >
                                                {cat.isActive ? 'Hide on Website' : 'Show on Website'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCategory(cat._id, cat.name)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Delete Category"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] animate-fadeIn border border-pink-100">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-2xl">
                            <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                                <Layers className="text-pink-600" size={20} /> {editItem ? 'Edit Event Info' : 'Create New Event Album'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition"><X size={22} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Event Title <span className="text-red-500">*</span></label>
                                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g., Annual Sports Meet 2024"
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none font-medium" required />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-700 block">Category <span className="text-red-500">*</span></label>
                                    <button type="button" onClick={() => { setShowModal(false); setActiveTab('categories'); }} className="text-xs font-bold text-pink-600 hover:underline">
                                        + Manage Categories
                                    </button>
                                </div>
                                <select 
                                    value={form.category} 
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none font-medium bg-white" 
                                    required
                                >
                                    {categoryList.length === 0 ? (
                                        <option value="">-- No Categories Found (Please create one first) --</option>
                                    ) : (
                                        categoryList.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Social / Video Link <span className="text-purple-600 font-normal">(Optional)</span></label>
                                <div className="relative">
                                    <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={form.videoLink} 
                                        onChange={e => setForm({ ...form, videoLink: e.target.value })}
                                        placeholder="Paste YouTube, Instagram, Facebook, or website link"
                                        className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 outline-none font-medium" 
                                    />
                                </div>
                                <span className="text-[11px] text-gray-400 mt-1 block">Supports YouTube, Instagram, Facebook, and normal website links. You can include photos with the link.</span>
                                {form.videoLink?.trim() && (
                                    <div className="mt-3">
                                        <GalleryLinkPreview url={form.videoLink} compact />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={3} placeholder="Write a brief overview of this event/celebration..."
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-400 outline-none font-medium resize-none" />
                            </div>

                            {!editItem && (
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Photos <span className="text-gray-400 font-normal">(Optional if video link is provided, max 5 at once)</span></label>
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-pink-300 rounded-xl p-5 bg-pink-50/40 cursor-pointer hover:bg-pink-50 transition shadow-inner">
                                        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                                        <Upload size={28} className="text-pink-400 mb-2 animate-bounce" />
                                        <span className="text-sm font-bold text-gray-700">{files.length > 0 ? `${files.length} photo(s) selected` : 'Click to select event photos'}</span>
                                        <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</span>
                                    </label>
                                    {previews.length > 0 && (
                                        <div className="flex gap-2.5 mt-3 flex-wrap">
                                            {previews.map((p, i) => (
                                                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border shadow-sm"><img src={p} className="w-full h-full object-cover" /></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1 border-t">
                                <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-400" />
                                <label htmlFor="active" className="text-sm font-bold text-gray-700">Active (Visible on public website gallery)</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-60 flex items-center gap-2 transition active:scale-95">
                                    {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : (editItem ? 'Save Changes' : 'Create Event Album')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGallery;

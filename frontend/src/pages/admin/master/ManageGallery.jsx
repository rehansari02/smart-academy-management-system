import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Search, Image as ImageIcon, Edit2, Trash2, X, Upload, ArrowLeft, CheckCircle, Camera } from 'lucide-react';
import Swal from 'sweetalert2';
import galleryService from '../../../services/galleryService';

const SUGGESTED_CATEGORIES = ['Events', 'School Festival', 'Seminars', 'Awards', 'Campus Life', 'Classroom', 'Sports', 'Cultural', 'Others'];

// ── Image Upload Panel (add more photos to existing event) ──────────────────
const ImagePanel = ({ gallery, onBack, onUpdated }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [current, setCurrent] = useState({ ...gallery });

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

            <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                <h2 className="font-extrabold text-gray-800 text-lg">{current.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{current.category} &bull; {current.images?.length || 0} photos</p>
                {current.description && <p className="text-sm text-gray-600 mt-1">{current.description}</p>}
            </div>

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
                            <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
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
    const [galleries, setGalleries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');
    const [selectedGallery, setSelectedGallery] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [form, setForm] = useState({ title: '', description: '', category: '', isActive: true });
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const fetchAll = async () => {
        try { setLoading(true); const d = await galleryService.getGalleries(); setGalleries(d); }
        catch { toast.error('Failed to load gallery'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const openCreate = () => {
        setEditItem(null);
        setForm({ title: '', description: '', category: '', isActive: true });
        setFiles([]); setPreviews([]);
        setShowModal(true);
    };

    const openEdit = (g) => {
        setEditItem(g);
        setForm({ title: g.title, description: g.description, category: g.category, isActive: g.isActive });
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
        if (!form.title) return toast.error('Title is required');
        if (!form.category) return toast.error('Category is required');
        if (!editItem && files.length === 0) return toast.error('Upload at least one photo');

        setSubmitting(true);
        try {
            if (editItem) {
                await galleryService.updateGallery(editItem._id, form);
                toast.success('Event updated!');
            } else {
                const fd = new FormData();
                fd.append('title', form.title);
                fd.append('description', form.description);
                fd.append('category', form.category);
                fd.append('isActive', form.isActive);
                files.forEach(f => fd.append('images', f));
                await galleryService.createGallery(fd);
                toast.success('Gallery event created!');
            }
            setShowModal(false);
            fetchAll();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save');
        } finally { setSubmitting(false); }
    };

    const handleDelete = (id, title) => {
        Swal.fire({ title: `Delete "${title}"?`, text: 'All photos will be lost!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete!'
        }).then(async r => {
            if (r.isConfirmed) {
                try { await galleryService.deleteGallery(id); toast.success('Deleted'); fetchAll(); }
                catch { toast.error('Failed'); }
            }
        });
    };

    const categories = ['All', ...new Set(galleries.map(g => g.category))];
    const filtered = galleries.filter(g =>
        (filterCat === 'All' || g.category === filterCat) &&
        ((g.title || '').toLowerCase().includes(search.toLowerCase()) || (g.category || '').toLowerCase().includes(search.toLowerCase()))
    );

    if (view === 'images' && selectedGallery) {
        return (
            <div className="max-w-6xl mx-auto p-4">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <ImagePanel gallery={selectedGallery} onBack={() => { setView('list'); fetchAll(); }} onUpdated={fetchAll} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow-lg p-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 mb-5 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-pink-100 p-2 rounded-xl"><ImageIcon className="text-pink-600" size={26} /></div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gallery Management</h2>
                            <p className="text-sm text-gray-500">Create event albums; each album has a title, category, and photos</p>
                        </div>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm">
                        <Plus size={18} /> New Event Album
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input type="text" placeholder="Search events..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-pink-300 outline-none" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setFilterCat(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filterCat === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
                        <ImageIcon size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold">No events found</p>
                        <p className="text-sm mt-1">Click "New Event Album" to create one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {filtered.map(g => (
                            <div key={g._id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group cursor-pointer"
                                onClick={() => { setSelectedGallery(g); setView('images'); }}>
                                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                    {g.images?.[0] ? (
                                        <img src={g.images[0]} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-gray-300" /></div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{g.images?.length || 0} photos</div>
                                    <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${g.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>{g.isActive ? 'Active' : 'Hidden'}</div>
                                </div>
                                <div className="p-3">
                                    <div className="inline-block text-[10px] font-bold uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200 rounded px-1.5 py-0.5 mb-1.5">{g.category}</div>
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{g.title}</h3>
                                    {g.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>}
                                    <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setSelectedGallery(g); setView('images'); }}
                                            className="flex-1 text-xs bg-pink-50 text-pink-600 border border-pink-200 rounded-lg py-1.5 font-semibold hover:bg-pink-100 flex items-center justify-center gap-1">
                                            <Camera size={12} /> Photos
                                        </button>
                                        <button onClick={() => openEdit(g)} className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(g._id, g.title)} className="p-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] animate-fadeIn">
                        <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-800">{editItem ? 'Edit Event Info' : 'Create New Event Album'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Event Title <span className="text-red-500">*</span></label>
                                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g., Annual Day 2024, Diwali Celebration"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Category <span className="text-red-500">*</span></label>
                                <input type="text" list="catList" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    placeholder="e.g., School Festival, Events"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none" required />
                                <datalist id="catList">
                                    {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={2} placeholder="Brief description of this event..."
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none resize-none" />
                            </div>

                            {!editItem && (
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Photos <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(max 5 at once)</span></label>
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-pink-300 rounded-lg p-4 bg-pink-50/40 cursor-pointer hover:bg-pink-50">
                                        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" required />
                                        <Upload size={24} className="text-pink-400 mb-1" />
                                        <span className="text-sm text-gray-600 font-medium">{files.length > 0 ? `${files.length} photo(s) selected` : 'Click to select photos'}</span>
                                    </label>
                                    {previews.length > 0 && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {previews.map((p, i) => (
                                                <div key={i} className="w-16 h-16 rounded overflow-hidden border"><img src={p} className="w-full h-full object-cover" /></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-pink-600 rounded" />
                                <label htmlFor="active" className="text-sm text-gray-700">Active (visible on public gallery)</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center gap-2">
                                    {submitting ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : (editItem ? 'Save Changes' : 'Create Event')}
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

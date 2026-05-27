import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X, ChevronLeft, ChevronRight, Layers, Play, Eye, ExternalLink } from 'lucide-react';
import galleryService from '../../services/galleryService';

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

const getLinkPreviewClass = (type) => {
    switch (type) {
        case 'youtube': return 'from-red-900 to-black';
        case 'instagram': return 'from-pink-600 via-purple-700 to-orange-500';
        case 'facebook': return 'from-blue-700 to-blue-950';
        default: return 'from-purple-900 to-indigo-900';
    }
};

const SocialEmbedPreview = ({ linkInfo, title }) => {
    if (!linkInfo?.url) return null;

    if (linkInfo.type === 'youtube' && linkInfo.embedUrl) {
        return (
            <div className="mb-12 bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-900 aspect-video max-w-5xl mx-auto relative group">
                <iframe
                    src={linkInfo.embedUrl}
                    title={title}
                    className="w-full h-full absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        );
    }

    if ((linkInfo.type === 'instagram' || linkInfo.type === 'facebook') && linkInfo.embedUrl) {
        return (
            <div className="mb-12 max-w-2xl mx-auto rounded-3xl bg-white border border-gray-100 shadow-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${getLinkPreviewClass(linkInfo.type)} px-5 py-4 text-white flex items-center justify-between gap-3`}>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest opacity-80">{linkInfo.label} Preview</p>
                        <p className="text-lg font-black">Attached social post</p>
                    </div>
                    <a href={linkInfo.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black hover:bg-white/25">
                        Open
                    </a>
                </div>
                <iframe
                    src={linkInfo.embedUrl}
                    title={`${linkInfo.label} preview`}
                    className="w-full min-h-[520px] bg-white"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
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
            className="mb-12 max-w-3xl mx-auto flex items-center justify-between gap-4 rounded-3xl bg-white border border-gray-100 p-6 shadow-lg hover:shadow-xl transition"
        >
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-600">{linkInfo.label}</p>
                <p className="text-xl font-black text-gray-900 mt-1">Open attached gallery link</p>
                <p className="text-sm font-semibold text-gray-500 mt-1 break-all">{linkInfo.host || linkInfo.url}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white flex items-center justify-center shrink-0">
                <ExternalLink size={22} />
            </div>
        </a>
    );
};

// ── Lightbox for Images ───────────────────────────────────────────────────────
const Lightbox = ({ images, startIndex, onClose }) => {
    const [current, setCurrent] = useState(startIndex);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
            if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [images.length, onClose]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 rounded-full p-3 z-10 hover:bg-white/20 transition shadow-lg">
                <X size={24} />
            </button>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/80 font-bold bg-white/10 px-4 py-1.5 rounded-full text-sm backdrop-blur z-10 shadow">
                {current + 1} / {images.length}
            </div>
            {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length); }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-4 z-10 transition shadow-xl hover:scale-110 active:scale-95">
                    <ChevronLeft size={32} />
                </button>
            )}
            <Motion.img
                key={current}
                src={images[current].startsWith('http') ? images[current] : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${images[current]}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-white/10"
                onClick={e => e.stopPropagation()}
            />
            {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-4 z-10 transition shadow-xl hover:scale-110 active:scale-95">
                    <ChevronRight size={32} />
                </button>
            )}
            {images.length > 1 && (
                <div className="absolute bottom-6 flex gap-3 justify-center overflow-x-auto max-w-full px-6 py-2">
                    {images.map((img, idx) => (
                        <button key={idx} onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                            className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all shadow-md ${idx === current ? 'border-pink-500 scale-110 ring-4 ring-pink-500/30' : 'border-white/20 opacity-50 hover:opacity-90'}`}>
                            <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${img}`} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Event Detail View (Video + Photos) ────────────────────────────────────────
const EventDetailView = ({ event, onBack }) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const linkInfo = getGalleryLinkInfo(event.videoLink);

    return (
        <div className="animate-fadeIn">
            <button onClick={onBack} className="flex items-center gap-2 text-pink-600 hover:text-pink-700 font-extrabold text-base mb-8 bg-pink-50 px-4 py-2 rounded-xl w-fit shadow-sm transition hover:pr-5">
                <ChevronLeft size={20} /> Back to {event.category}
            </button>

            {/* Title + description */}
            <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="inline-block text-xs font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 rounded-full px-3 py-1 shadow-sm">
                        {event.category}
                    </span>
                    {linkInfo.url && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full px-3 py-1 shadow-sm">
                            <ExternalLink size={14} /> {linkInfo.label}
                        </span>
                    )}
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{event.title}</h2>
                {event.description && <p className="text-gray-600 mt-4 text-lg max-w-4xl leading-relaxed">{event.description}</p>}
            </div>

            <SocialEmbedPreview linkInfo={linkInfo} title={event.title} />

            {/* Masonry photo grid */}
            {event.images && event.images.length > 0 && (
                <div>
                    <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <ImageIcon className="text-pink-600" /> Event Gallery ({event.images.length} Photos)
                    </h3>
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6">
                        {event.images.map((img, idx) => (
                            <Motion.div key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="break-inside-avoid mb-6 cursor-pointer group rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 relative border border-gray-100"
                                onClick={() => setLightboxIndex(idx)}
                            >
                                <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${img}`} alt="" loading="lazy"
                                    className="w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <span className="text-white text-sm font-bold flex items-center gap-1.5 shadow">
                                        <Eye size={16} /> View Fullscreen
                                    </span>
                                </div>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            )}

            {lightboxIndex !== null && (
                <Lightbox images={event.images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
            )}
        </div>
    );
};

// ── Main Public Gallery Page ──────────────────────────────────────────────────
const GalleryPage = () => {
    const [galleries, setGalleries] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        Promise.all([
            galleryService.getPublicGalleries(),
            galleryService.getPublicCategories()
        ])
            .then(([galData, catData]) => {
                setGalleries(galData);
                setCategoryList(catData);
            })
            .catch(e => console.error('Gallery error', e))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...categoryList];
    const filtered = activeCategory === 'All' ? galleries : galleries.filter(g => g.category === activeCategory);

    // Detail view
    if (selectedEvent) {
        return (
            <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <EventDetailView event={selectedEvent} onBack={() => setSelectedEvent(null)} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen py-14 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Page Header */}
                <Motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 flex items-center justify-center gap-3.5 tracking-tight">
                        <Layers className="text-pink-600 animate-bounce" size={48} /> Campus Highlights & Memories
                    </h1>
                    <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                        Explore our vibrant celebrations, academic achievements, video recaps, and special event albums.
                    </p>
                </Motion.div>

                {/* Category Filter Tabs */}
                {!loading && categories.length > 1 && (
                    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-2.5 mb-12">
                        {categories.map((cat, i) => (
                            <button key={i} onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 shadow-sm ${
                                    activeCategory === cat
                                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white scale-105 shadow-lg ring-4 ring-pink-500/20'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-pink-600 border border-gray-200 shadow-sm'
                                }`}>
                                {cat}
                            </button>
                        ))}
                    </Motion.div>
                )}

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-600" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-xl mx-auto p-8">
                        <div className="bg-pink-50 p-6 rounded-full w-fit mx-auto mb-4">
                            <ImageIcon className="h-14 w-14 text-pink-400" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">No events found in this category</h3>
                        <p className="text-gray-500 text-base">We're updating our gallery soon with exciting new memories!</p>
                    </div>
                ) : (
                    <Motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        <AnimatePresence>
                            {filtered.map((event, idx) => {
                                const linkInfo = getGalleryLinkInfo(event.videoLink);

                                return (
                                <Motion.div key={event._id} layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 flex flex-col justify-between hover:-translate-y-1.5"
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    <div>
                                        {/* Cover photo / Video Placeholder */}
                                        <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                                            {event.images?.[0] ? (
                                                <img src={event.images[0].startsWith('http') ? event.images[0] : `${import.meta.env.VITE_API_URL.replace('/api', '')}/${event.images[0]}`} alt={event.title} loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : linkInfo.url ? (
                                                <div className={`w-full h-full bg-gradient-to-tr ${getLinkPreviewClass(linkInfo.type)} text-white flex flex-col items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-500 relative overflow-hidden`}>
                                                    {linkInfo.thumbnailUrl && (
                                                        <img
                                                            src={linkInfo.thumbnailUrl}
                                                            alt={event.title}
                                                            className="absolute inset-0 w-full h-full object-cover opacity-75"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/35"></div>
                                                    <div className="relative bg-white/20 p-4 rounded-full backdrop-blur mb-3 shadow-lg group-hover:bg-pink-600 transition-colors duration-300">
                                                        {linkInfo.type === 'youtube' ? <Play size={36} className="text-white fill-white ml-0.5" /> : <ExternalLink size={34} className="text-white" />}
                                                    </div>
                                                    <span className="relative text-xs font-extrabold uppercase tracking-widest text-white/90">{linkInfo.label} Preview</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon size={48} className="text-gray-300" />
                                                </div>
                                            )}

                                            {/* Badges */}
                                            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                                {linkInfo.url && (
                                                    <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                                        <ExternalLink size={12} /> {linkInfo.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5">
                                                <ImageIcon size={12} /> {event.images?.length || 0} Photos
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                                <span className="text-white font-extrabold text-sm flex items-center gap-2">
                                                    {linkInfo.url ? 'Open Link & Explore' : 'Open Album'} <ChevronRight size={16} className="text-pink-400" />
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-6">
                                            <span className="inline-block text-[11px] font-black uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-100 rounded-lg px-2.5 py-1 mb-2.5">
                                                {event.category}
                                            </span>
                                            <h3 className="font-black text-gray-900 text-lg leading-snug line-clamp-1 group-hover:text-pink-600 transition-colors">
                                                {event.title}
                                            </h3>
                                            {event.description && (
                                                <p className="text-gray-500 text-sm mt-1.5 line-clamp-2 leading-relaxed font-normal">{event.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-6 pb-6 pt-0">
                                        <div className="w-full text-center text-xs font-bold text-pink-600 bg-pink-50/50 group-hover:bg-pink-600 group-hover:text-white border border-pink-100 rounded-xl py-2.5 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm">
                                            {linkInfo.url ? <><ExternalLink size={14} /> Open Link</> : <><Eye size={14} /> View Album</>}
                                        </div>
                                    </div>
                                </Motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </Motion.div>
                )}
            </div>
        </div>
    );
};

export default GalleryPage;

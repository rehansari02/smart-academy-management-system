import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import galleryService from '../../services/galleryService';

// ── Lightbox ──────────────────────────────────────────────────────────────────
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
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2 z-10">
                <X size={24} />
            </button>
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
                {current + 1} / {images.length}
            </div>
            {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10 transition">
                    <ChevronLeft size={28} />
                </button>
            )}
            <motion.img
                key={current}
                src={images[current]}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                onClick={e => e.stopPropagation()}
            />
            {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10 transition">
                    <ChevronRight size={28} />
                </button>
            )}
            {images.length > 1 && (
                <div className="absolute bottom-4 flex gap-2 justify-center overflow-x-auto max-w-full px-4">
                    {images.map((img, idx) => (
                        <button key={idx} onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                            className={`w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${idx === current ? 'border-pink-400 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Event Photo Grid (group view — one title/desc, all photos) ────────────────
const EventPhotos = ({ event, onBack }) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);

    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-semibold text-sm mb-6">
                <ChevronLeft size={18} /> Back to {event.category}
            </button>

            {/* Single group title + description */}
            <div className="mb-8">
                <span className="inline-block text-xs font-bold uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200 rounded px-2 py-0.5 mb-2">
                    {event.category}
                </span>
                <h2 className="text-3xl font-extrabold text-gray-800">{event.title}</h2>
                {event.description && <p className="text-gray-500 mt-2 max-w-2xl">{event.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{event.images?.length || 0} photos</p>
            </div>

            {/* Masonry photo grid — no individual titles/descriptions */}
            <div className="columns-2 sm:columns-3 md:columns-4 gap-4">
                {event.images?.map((img, idx) => (
                    <motion.div key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="break-inside-avoid mb-4 cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                        onClick={() => setLightboxIndex(idx)}
                    >
                        <img src={img} alt="" loading="lazy"
                            className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </motion.div>
                ))}
            </div>

            {lightboxIndex !== null && (
                <Lightbox images={event.images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
            )}
        </div>
    );
};

// ── Main Public Gallery Page ──────────────────────────────────────────────────
const GalleryPage = () => {
    const [galleries, setGalleries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        galleryService.getPublicGalleries()
            .then(data => setGalleries(data))
            .catch(e => console.error('Gallery error', e))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...new Set(galleries.map(g => g.category))];
    const filtered = activeCategory === 'All' ? galleries : galleries.filter(g => g.category === activeCategory);

    // Show event photo grid
    if (selectedEvent) {
        return (
            <div className="bg-gray-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <EventPhotos event={selectedEvent} onBack={() => setSelectedEvent(null)} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-3 flex items-center justify-center gap-3">
                        <Layers className="text-pink-600" size={40} /> Our Gallery
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        Explore our events, celebrations, and precious memories.
                    </p>
                </motion.div>

                {/* Category Filter Tabs */}
                {!loading && categories.length > 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-2 mb-10">
                        {categories.map((cat, i) => (
                            <button key={i} onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm ${
                                    activeCategory === cat
                                        ? 'bg-pink-600 text-white scale-105 shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-pink-600 border'
                                }`}>
                                {cat}
                            </button>
                        ))}
                    </motion.div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-pink-600" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border">
                        <ImageIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700">No events in this category yet!</h3>
                        <p className="text-gray-500 mt-1">Check back soon.</p>
                    </div>
                ) : (
                    // Event album cards — click to see grouped photos
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filtered.map((event, idx) => (
                                <motion.div key={event._id} layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    {/* Cover photo — first image of the album */}
                                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                        {event.images?.[0] ? (
                                            <img src={event.images[0]} alt={event.title} loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon size={40} className="text-gray-300" />
                                            </div>
                                        )}
                                        {/* Photo count badge */}
                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                            <ImageIcon size={10} /> {event.images?.length || 0}
                                        </div>
                                        <div className="absolute inset-0 bg-pink-600/0 group-hover:bg-pink-600/15 transition-colors duration-300" />
                                    </div>

                                    {/* Album info — one title + one description for the whole group */}
                                    <div className="p-4">
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200 rounded px-1.5 py-0.5 mb-1.5">
                                            {event.category}
                                        </span>
                                        <h3 className="font-extrabold text-gray-800 text-sm leading-tight line-clamp-1 group-hover:text-pink-600 transition-colors">
                                            {event.title}
                                        </h3>
                                        {event.description && (
                                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{event.description}</p>
                                        )}
                                        <div className="mt-3 flex items-center text-xs text-pink-600 font-semibold">
                                            View Photos <ChevronRight size={13} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default GalleryPage;

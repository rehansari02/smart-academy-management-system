import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Trash2, RefreshCw, Filter, ImageIcon, ExternalLink, AlertTriangle } from 'lucide-react';

const CloudinaryManager = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('All'); // All, Used, Unused
    const [nextCursor, setNextCursor] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchImages = async (cursor = null) => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/cloudinary${cursor ? `?next_cursor=${cursor}` : ''}`, {
                withCredentials: true
            });
            
            if (res.data.success) {
                if (cursor) {
                    setImages(prev => [...prev, ...res.data.images]);
                } else {
                    setImages(res.data.images);
                }
                setNextCursor(res.data.next_cursor);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch images");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleDelete = async (public_id) => {
        if (!window.confirm("Are you sure you want to delete this image? This action cannot be undone.")) return;

        try {
            setDeletingId(public_id);
            const res = await axios.post('/api/cloudinary/delete', { public_id }, { withCredentials: true });
            
            if (res.data.success) {
                toast.success("Image deleted successfully");
                setImages(prev => prev.filter(img => img.public_id !== public_id));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete image");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredImages = images.filter(img => {
        if (filter === 'All') return true;
        return img.status === filter;
    });

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <ImageIcon className="w-8 h-8 text-blue-600" />
                            Cloudinary Manager
                        </h1>
                        <p className="text-gray-500 mt-1">Manage your cloud storage and remove unused assets</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
                        <div className="flex bg-gray-100 rounded-md p-1">
                            {['All', 'Used', 'Unused'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        filter === f 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => fetchImages()} 
                            disabled={loading}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {loading && images.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredImages.map((img) => (
                            <div key={img.public_id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 group">
                                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                                    <img 
                                        src={img.url} 
                                        alt={img.public_id} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full backdrop-blur-md ${
                                            img.status === 'Used' 
                                            ? 'bg-green-500/90 text-white' 
                                            : 'bg-red-500/90 text-white'
                                        }`}>
                                            {img.status}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <a 
                                            href={img.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all mr-2"
                                            title="View Full Size"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                        {img.status === 'Unused' && (
                                            <button
                                                onClick={() => handleDelete(img.public_id)}
                                                disabled={deletingId === img.public_id}
                                                className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                                title="Delete"
                                            >
                                                {deletingId === img.public_id ? (
                                                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 className="w-5 h-5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-gray-500 mb-1 truncate" title={img.public_id}>{img.public_id}</p>
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                        <span>{img.format.toUpperCase()}</span>
                                        <span>{formatSize(img.bytes)}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        {new Date(img.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {filteredImages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>No images found matching your filter.</p>
                    </div>
                )}

                {nextCursor && !loading && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => fetchImages(nextCursor)}
                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm font-medium"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloudinaryManager;

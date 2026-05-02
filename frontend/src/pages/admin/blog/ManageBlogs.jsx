import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogs, createBlog, updateBlog, deleteBlog, resetBlogState } from '../../../features/blog/blogSlice';
import { toast } from 'react-toastify';
import { 
    Plus, Edit, Trash2, Search, X, Image as ImageIcon, 
    Calendar, User, Tag, Eye, Save, RotateCcw, Loader 
} from 'lucide-react';
import moment from 'moment';

const ManageBlogs = () => {
    const dispatch = useDispatch();
    const { blogs = [], isLoading, isSuccess, isError, message } = useSelector((state) => state.blogs);
    
    console.log("Current Blogs in State:", blogs);

    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);

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
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const openForm = (blog = null) => {
        if (blog) {
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
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
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
                                            <div className="relative group rounded-3xl overflow-hidden shadow-xl aspect-video">
                                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => { setPreviewImage(null); setImageFile(null); }}
                                                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
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
        </div>
    );
};

export default ManageBlogs;

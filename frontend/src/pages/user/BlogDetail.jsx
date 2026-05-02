import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogs } from '../../features/blog/blogSlice';
import moment from 'moment';
import { 
    Calendar, User, Clock, ChevronLeft, Share2, 
    MessageCircle, TrendingUp, Tag, ArrowRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import Reveal from '../../components/Reveal';

const BlogDetail = () => {
    const { slug } = useParams();
    const dispatch = useDispatch();
    const { blogs, isLoading } = useSelector((state) => state.blogs);

    useEffect(() => {
        if (blogs.length === 0) {
            dispatch(fetchBlogs());
        }
        window.scrollTo(0, 0);
    }, [dispatch, blogs.length]);

    const blog = blogs.find(b => b.slug === slug);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold animate-pulse">Loading Article...</p>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-4xl font-black text-gray-900 mb-4">Article Not Found</h2>
                    <p className="text-gray-500 mb-8">The article you are looking for might have been removed or the URL is incorrect.</p>
                    <Link to="/blog" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
                        <ChevronLeft size={20} /> Back to Blogs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Header */}
            <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
                <img 
                    src={blog.image ? (blog.image.startsWith('http') ? blog.image : `http://localhost:5000/${blog.image}`) : 'https://placehold.co/1200x600/png?text=Smart+Institute'} 
                    alt={blog.title} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
                
                <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-4xl w-full text-white text-center">
                        <Reveal>
                            <span className="bg-accent text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">
                                {blog.category}
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight drop-shadow-2xl">
                                {blog.title}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:text-base text-gray-200">
                                <div className="flex items-center gap-2">
                                    <User size={18} className="text-accent" />
                                    <span className="font-bold">{blog.authorName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} className="text-accent" />
                                    <span>{moment(blog.createdAt).format('MMMM DD, YYYY')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={18} className="text-accent" />
                                    <span>{blog.views || 0} Views</span>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                    <motion.div 
                        animate={{ y: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1"
                    >
                        <div className="w-1 h-2 bg-white rounded-full"></div>
                    </motion.div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Main Content */}
                    <article className="lg:col-span-8">
                        <Reveal>
                            <div className="prose prose-lg max-w-none prose-headings:font-black prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-img:rounded-3xl">
                                {/* Excerpt if exists */}
                                {blog.excerpt && (
                                    <div className="text-2xl font-medium text-gray-400 italic border-l-4 border-primary pl-6 mb-12 py-2">
                                        "{blog.excerpt}"
                                    </div>
                                )}
                                
                                {/* Full Content - Rendered as whitespace preserved text for now */}
                                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg font-medium">
                                    {blog.content}
                                </div>
                            </div>

                            {/* Tags */}
                            {blog.tags && blog.tags.length > 0 && (
                                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap gap-3">
                                    {blog.tags.map(tag => (
                                        <span key={tag} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                            <Tag size={14} /> {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="mt-12 flex items-center justify-end p-6 bg-gray-50 rounded-3xl">
                                <div className="flex items-center gap-2 text-gray-400 text-sm italic">
                                    Article last updated {moment(blog.updatedAt).fromNow()}
                                </div>
                            </div>
                        </Reveal>
                    </article>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-12">
                        {/* Author Card */}
                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 sticky top-24">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                <User size={24} className="text-primary" /> About Author
                            </h3>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-100">
                                    {blog.authorName?.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{blog.authorName}</h4>
                                    <p className="text-gray-500 text-sm">Official Contributor</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                Dedicated educator and technologist sharing insights on future trends in learning and career development.
                            </p>
                            <Link to="/blog" className="w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-black hover:bg-gray-100 transition flex items-center justify-center gap-2">
                                View All Posts <ArrowRight size={18} />
                            </Link>
                        </div>

                        {/* Similar Posts Placeholder */}
                        <div className="p-8">
                            <h3 className="text-xl font-black text-gray-900 mb-8">Related Articles</h3>
                            <div className="space-y-8">
                                {blogs.filter(b => b._id !== blog._id).slice(0, 3).map(related => (
                                    <Link key={related._id} to={`/blog/${related.slug}`} className="flex gap-4 group">
                                        <div className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100">
                                            <img src={related.image ? (related.image.startsWith('http') ? related.image : `http://localhost:5000/${related.image}`) : 'https://placehold.co/100x100'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-primary transition">{related.title}</h4>
                                            <p className="text-gray-400 text-[10px] mt-1 font-bold uppercase tracking-wider">{related.category}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default BlogDetail;

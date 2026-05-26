import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogs, fetchComments, addComment, deleteComment } from '../../features/blog/blogSlice';
import moment from 'moment';
import { 
    Calendar, User, Clock, ChevronLeft, Share2, 
    MessageCircle, TrendingUp, Tag, ArrowRight, Send, Trash2, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Reveal from '../../components/Reveal';
import { toast } from 'react-toastify';

const BlogDetail = () => {
    const { slug } = useParams();
    const dispatch = useDispatch();
    const { blogs, comments, isLoading } = useSelector((state) => state.blogs);
    const { user } = useSelector((state) => state.auth);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (blogs.length === 0) {
            dispatch(fetchBlogs());
        }
        window.scrollTo(0, 0);
    }, [dispatch, blogs.length]);

    const blog = blogs.find(b => b.slug === slug);
    const blogComments = blog ? (comments[blog._id] || []) : [];

    useEffect(() => {
        if (blog) {
            dispatch(fetchComments(blog._id));
        }
    }, [dispatch, blog]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Please login to comment');
            return;
        }
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            await dispatch(addComment({ blogId: blog._id, content: newComment })).unwrap();
            setNewComment('');
            toast.success('Comment posted successfully');
        } catch (error) {
            toast.error(error || 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (id) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            try {
                await dispatch(deleteComment(id)).unwrap();
                toast.success('Comment deleted');
            } catch (error) {
                toast.error(error || 'Failed to delete comment');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold animate-pulse">Loading Article...</p>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
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
        <div className="min-h-screen bg-white font-sans">
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

                            <div className="mt-12 flex items-center justify-end p-6 bg-gray-50 rounded-3xl">
                                <div className="flex items-center gap-2 text-gray-400 text-sm italic">
                                    Article last updated {moment(blog.updatedAt).fromNow()}
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="mt-32 pt-20 border-t border-gray-100">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                                            <div>
                                                <h3 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-none">
                                                    Reader <span className="text-primary">Discussions</span>
                                                </h3>
                                                <p className="text-gray-400 font-bold mt-4 uppercase tracking-[0.2em] text-[10px]">
                                                    {blogComments.length} Thought{blogComments.length !== 1 ? 's' : ''} shared so far
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-5 py-2.5 rounded-2xl border border-primary/10">
                                                <MessageCircle size={18} />
                                                Join the conversation
                                            </div>
                                        </div>

                                        {/* Comment Form */}
                                        {user ? (
                                            <div className="relative mb-24 group">
                                                <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 via-blue-400/5 to-accent/10 rounded-[3rem] blur-2xl opacity-50 group-focus-within:opacity-100 transition duration-1000"></div>
                                                <div className="relative bg-white border border-gray-100 p-2 rounded-[2.8rem] shadow-2xl shadow-blue-900/5 focus-within:border-primary/20 transition-all duration-500">
                                                    <form onSubmit={handleCommentSubmit} className="flex flex-col">
                                                        <div className="flex gap-5 p-6">
                                                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-blue-700 flex-shrink-0 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-200 ring-4 ring-white">
                                                                {user.firstName?.charAt(0) || user.name?.charAt(0)}
                                                            </div>
                                                            <textarea
                                                                value={newComment}
                                                                onChange={(e) => setNewComment(e.target.value)}
                                                                placeholder="Write a thoughtful response..."
                                                                className="flex-1 bg-transparent border-none rounded-2xl p-2 text-gray-800 outline-none placeholder:text-gray-300 transition-all resize-none font-semibold text-xl leading-relaxed pt-3"
                                                                rows="3"
                                                            ></textarea>
                                                        </div>
                                                        <div className="flex items-center justify-between p-5 border-t border-gray-50 bg-gray-50/30 rounded-b-[2.5rem]">
                                                            <div className="flex items-center gap-6 px-4">
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                                                    <Shield size={14} className="text-emerald-500" /> Secure Submission
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmitting || !newComment.trim()}
                                                                className="group/btn relative overflow-hidden bg-gray-900 text-white px-10 py-4.5 rounded-[1.25rem] font-bold hover:bg-primary transition-all duration-500 flex items-center gap-3 disabled:opacity-50 active:scale-95 shadow-xl shadow-gray-900/10"
                                                            >
                                                                <span className="relative z-10 flex items-center gap-2">
                                                                    {isSubmitting ? 'Publishing...' : 'Post Comment'}
                                                                    <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                                </span>
                                                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-900 rounded-[3.5rem] p-16 mb-24 relative overflow-hidden text-center group shadow-2xl shadow-blue-900/20">
                                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -mr-40 -mt-40 animate-pulse"></div>
                                                <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/20 rounded-full blur-[100px] -ml-40 -mb-40"></div>
                                                <div className="relative z-10">
                                                    <h4 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Voices of our Community</h4>
                                                    <p className="text-gray-400 max-w-md mx-auto mb-12 font-medium text-lg leading-relaxed">Join thousands of students and educators in sharing knowledge and perspectives.</p>
                                                    <Link to="/login" className="inline-flex items-center gap-3 bg-white text-gray-900 px-12 py-5 rounded-2xl font-bold hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl shadow-white/5 active:scale-95">
                                                        Sign In to Comment <ArrowRight size={22} />
                                                    </Link>
                                                </div>
                                            </div>
                                        )}

                                        {/* Comments List */}
                                        <div className="space-y-16">
                                            <AnimatePresence mode='popLayout'>
                                                {blogComments.map((comment, index) => (
                                                    <motion.div
                                                        key={comment._id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                                                        className="relative group"
                                                    >
                                                        {/* Connecting line for threads visual */}
                                                        {index !== blogComments.length - 1 && (
                                                            <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-gradient-to-b from-gray-100 via-gray-50 to-transparent"></div>
                                                        )}

                                                        <div className="flex gap-8">
                                                            <div className="relative flex-shrink-0">
                                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary font-extrabold text-2xl overflow-hidden border border-gray-100 relative z-10 group-hover:scale-105 transition-transform duration-500">
                                                                    {comment.userPhoto ? (
                                                                        <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                                                            {comment.userName?.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {comment.userId === blog.author && (
                                                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full border-4 border-white flex items-center justify-center z-20 shadow-lg" title="Author">
                                                                        <Shield size={12} className="text-white" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 pt-1">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-4">
                                                                        <h4 className={`font-bold text-xl tracking-tight ${comment.userId === blog.author ? 'text-primary' : 'text-gray-900'}`}>
                                                                            {comment.userName}
                                                                        </h4>
                                                                        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
                                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                                                                            {moment(comment.createdAt).fromNow()}
                                                                        </span>
                                                                    </div>
                                                                    {(user && (user._id === comment.userId || user.role === 'Super Admin')) && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(comment._id)}
                                                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition-all p-2.5 hover:bg-rose-50 rounded-xl"
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="relative">
                                                                    <p className="text-gray-600 leading-relaxed font-semibold text-xl max-w-3xl">
                                                                        {comment.content}
                                                                    </p>
                                                                </div>
                                                                <div className="mt-6 flex items-center gap-8">
                                                                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-primary transition-colors group/link">
                                                                        <TrendingUp size={14} className="group-hover/link:-translate-y-0.5 transition-transform" /> Helpful
                                                                    </button>
                                                                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-primary transition-colors group/link">
                                                                        <MessageSquare size={14} /> Reply
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {blogComments.length === 0 && (
                                                <div className="text-center py-40 bg-gray-50/40 rounded-[4rem] border-4 border-dashed border-gray-100 relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mx-auto mb-8 animate-bounce">
                                                        <MessageCircle size={48} className="text-gray-100" />
                                                    </div>
                                                    <h5 className="text-3xl font-extrabold text-gray-900 mb-2">The floor is yours</h5>
                                                    <p className="text-gray-400 font-bold max-w-xs mx-auto text-lg leading-relaxed">Be the pioneer and start a meaningful discussion today.</p>
                                                </div>
                                            )}
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

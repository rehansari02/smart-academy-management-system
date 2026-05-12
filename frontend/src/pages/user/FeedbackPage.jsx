import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, Star, MessageSquare, CheckCircle, User, Phone, Mail, Tag, Lightbulb, Quote } from 'lucide-react';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/feedback`;

const CATEGORIES = [
    { value: 'general',        label: 'General Feedback' },
    { value: 'course',         label: 'Course Content' },
    { value: 'faculty',        label: 'Faculty Performance' },
    { value: 'infrastructure', label: 'Infrastructure & Facilities' },
    { value: 'placement',      label: 'Placement Support' },
    { value: 'administration', label: 'Administrative Services' },
    { value: 'complaint',      label: 'Complaint' },
    { value: 'suggestion',     label: 'Suggestion' },
];

const CATEGORY_LABELS = {
    general: 'General', course: 'Course Content', faculty: 'Faculty',
    infrastructure: 'Infrastructure', placement: 'Placement',
    administration: 'Administration', complaint: 'Complaint', suggestion: 'Suggestion'
};

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const StarRow = ({ rating }) => (
    <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
            <Star key={s} size={13} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
        ))}
    </div>
);

const FeedbackPage = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', category: 'general', rating: 5, message: '', suggestions: '' });
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ total: 0, avgRating: '0', recent: [] });

    const fetchStats = async () => {
        try {
            const { data } = await axios.get(`${API}/public-stats`);
            setStats(data);
        } catch {}
    };

    useEffect(() => { fetchStats(); }, []);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post(API, form);
            setSubmitted(true);
            fetchStats();
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 py-16 px-4 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
                        <MessageSquare size={14} /> Share Your Experience
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-4">Your Feedback <span className="text-yellow-300">Matters</span></h1>
                    <p className="text-blue-100 text-lg">Help us improve by sharing your honest experience with Smart Institute.</p>
                    {stats.total > 0 && (
                        <p className="mt-4 text-white/70 text-sm">
                            <span className="font-bold text-white">{stats.total}</span> reviews &nbsp;·&nbsp;
                            <span className="font-bold text-yellow-300">{stats.avgRating} ★</span> average
                        </p>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                {/* ── Form (left 3 cols) ── */}
                <div className="lg:col-span-3">
                    {submitted ? (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="text-green-600" size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-3">Thank You!</h2>
                            <p className="text-gray-500 mb-8">Your feedback has been submitted. We appreciate your time and will use it to improve our services.</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link to="/" className="bg-blue-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-800 transition-colors">Back to Home</Link>
                                <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', category: 'general', rating: 5, message: '', suggestions: '' }); }}
                                    className="border-2 border-blue-900 text-blue-900 font-bold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors">
                                    Submit Another
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-900 to-indigo-800 px-6 py-4">
                                <h2 className="text-white font-bold text-lg flex items-center gap-2"><MessageSquare size={20} /> Feedback Form</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name"
                                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Phone</label>
                                        <div className="relative">
                                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile number" maxLength={10}
                                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com"
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Category <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select name="category" value={form.category} onChange={handleChange} required
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 appearance-none">
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Overall Rating <span className="text-red-500">*</span></label>
                                    <div className="flex items-center gap-2">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} type="button"
                                                onClick={() => setForm(p => ({ ...p, rating: star }))}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition-transform hover:scale-110">
                                                <Star size={32} className={`transition-colors ${star <= (hoverRating || form.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm font-bold text-gray-600">{RATING_LABELS[hoverRating || form.rating]}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Your Feedback <span className="text-red-500">*</span></label>
                                    <textarea name="message" value={form.message} onChange={handleChange} required rows={4}
                                        placeholder="Share your detailed experience..."
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 resize-none" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lightbulb size={13} /> Suggestions (optional)</label>
                                    <textarea name="suggestions" value={form.suggestions} onChange={handleChange} rows={2}
                                        placeholder="Any suggestions for improvement?"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 resize-none" />
                                </div>

                                {error && <p className="text-red-500 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

                                <button type="submit" disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-60">
                                    {loading
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                                        : <><Send size={18} /> Submit Feedback</>}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* ── Recent Feedback Sidebar (right 2 cols) ── */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Recent Reviews</h3>

                    {stats.recent.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                            <Quote size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No feedback yet. Be the first!</p>
                        </div>
                    ) : (
                        stats.recent.map((fb, i) => (
                            <div key={fb._id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{fb.name}</p>
                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                                            {CATEGORY_LABELS[fb.category] || fb.category}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <StarRow rating={fb.rating} />
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{fb.message}</p>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default FeedbackPage;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Star, Send, Quote } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/feedback`;

const CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'course', label: 'Course Content' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'placement', label: 'Placement' },
];

const CATEGORY_LABELS = {
    general: 'General', course: 'Course Content', faculty: 'Faculty',
    infrastructure: 'Infrastructure', placement: 'Placement',
    administration: 'Administration', complaint: 'Complaint', suggestion: 'Suggestion'
};

const StarRow = ({ rating, size = 13 }) => (
    <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
            <Star key={s} size={size} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
        ))}
    </div>
);

const StarRating = ({ value, onChange }) => (
    <div className="flex gap-1">
        {[1,2,3,4,5].map(s => (
            <button key={s} type="button" onClick={() => onChange(s)}>
                <Star size={28} className={s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100'} />
            </button>
        ))}
    </div>
);

const FeedbackSection = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', category: 'general', rating: 5, message: '', suggestions: '' });
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState({ total: 0, avgRating: '0', recent: [] });

    const fetchStats = async () => {
        try {
            const { data } = await axios.get(`${API}/public-stats`);
            setStats(data);
        } catch {}
    };

    useEffect(() => { fetchStats(); }, []);

    const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(API, form);
            toast.success('Thank you for your feedback!');
            setForm({ name: '', email: '', phone: '', category: 'general', rating: 5, message: '', suggestions: '' });
            fetchStats();
        } catch { toast.error('Failed to submit. Please try again.'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="bg-slate-50 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h4 className="text-accent font-bold uppercase tracking-widest text-sm mb-3">Your Voice Matters</h4>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                        Share Your <span className="text-primary">Feedback</span>
                    </h2>
                    {stats.total > 0 && (
                        <p className="text-gray-500 mt-3">
                            <span className="font-bold text-gray-700">{stats.total}</span> reviews &nbsp;·&nbsp;
                            <span className="font-bold text-yellow-500">{stats.avgRating} ★</span> average rating
                        </p>
                    )}
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                    {/* ── Form (left 3 cols) ── */}
                    <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Name <span className="text-red-500">*</span></label>
                                <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Phone</label>
                                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Your phone number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Email</label>
                            <input name="email" value={form.email} onChange={handleChange} placeholder="Your email address"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Category</label>
                                <select name="category" value={form.category} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Your Rating</label>
                                <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Message <span className="text-red-500">*</span></label>
                            <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder="Share your experience..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" required />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Suggestions (optional)</label>
                            <textarea name="suggestions" value={form.suggestions} onChange={handleChange} rows={2} placeholder="Any suggestions for improvement..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
                        </div>

                        <button type="submit" disabled={submitting}
                            className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-60 flex items-center justify-center gap-2 text-base">
                            {submitting
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                                : <><Send size={18} /> Submit Feedback</>}
                        </button>
                    </form>

                    {/* ── Recent Feedback Cards (right 2 cols) ── */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-2">Recent Reviews</h3>

                        {stats.recent.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
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
        </div>
    );
};

export default FeedbackSection;

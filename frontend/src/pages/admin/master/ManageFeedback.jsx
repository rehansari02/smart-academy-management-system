import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MessageSquare, Star, Trash2, Eye, X, CheckCircle, Clock, Inbox, Filter, Search, TrendingUp } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/feedback`;

const CATEGORY_LABELS = {
    general: 'General', course: 'Course Content', faculty: 'Faculty',
    infrastructure: 'Infrastructure', placement: 'Placement',
    administration: 'Administration', complaint: 'Complaint', suggestion: 'Suggestion'
};

const STATUS_CONFIG = {
    New:      { color: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
    Read:     { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    Resolved: { color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500' },
};

const StarDisplay = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(s => (
            <Star key={s} size={13} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
        ))}
    </div>
);

// ── View / Edit Modal ─────────────────────────────────────────────────────────
const FeedbackModal = ({ fb, onClose, onUpdated }) => {
    const [status, setStatus] = useState(fb.status);
    const [note, setNote] = useState(fb.adminNote || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API}/${fb._id}`, { status, adminNote: note }, { withCredentials: true });
            toast.success('Updated!');
            onUpdated();
            onClose();
        } catch { toast.error('Failed to update'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b bg-gradient-to-r from-blue-900 to-indigo-800">
                    <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={18} /> Feedback Detail</h3>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Person info */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-extrabold text-gray-800 text-base">{fb.name}</p>
                                {fb.email && <p className="text-xs text-gray-500 mt-0.5">{fb.email}</p>}
                                {fb.phone && <p className="text-xs text-gray-500">{fb.phone}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <StarDisplay rating={fb.rating} />
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(fb.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
                            </div>
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                                {CATEGORY_LABELS[fb.category] || fb.category}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${STATUS_CONFIG[fb.status]?.color}`}>
                                {fb.status}
                            </span>
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Feedback</p>
                        <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-xl p-3">{fb.message}</p>
                    </div>

                    {fb.suggestions && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Suggestions</p>
                            <p className="text-sm text-gray-700 leading-relaxed bg-yellow-50 border border-yellow-100 rounded-xl p-3">{fb.suggestions}</p>
                        </div>
                    )}

                    {/* Admin controls */}
                    <div className="border-t pt-4 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">Update Status</label>
                            <div className="flex gap-2">
                                {['New','Read','Resolved'].map(s => (
                                    <button key={s} type="button" onClick={() => setStatus(s)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${status === s ? STATUS_CONFIG[s].color + ' scale-105 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">Admin Note</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                                placeholder="Internal note (not visible to user)..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-2">
                                {saving ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</> : <><CheckCircle size={15}/>Save</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main Admin Page ───────────────────────────────────────────────────────────
const ManageFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState({ total: 0, new: 0, resolved: 0, avgRating: '0' });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [fbRes, statsRes] = await Promise.all([
                axios.get(API, { withCredentials: true }),
                axios.get(`${API}/stats`, { withCredentials: true })
            ]);
            setFeedbacks(fbRes.data);
            setStats(statsRes.data);
        } catch { toast.error('Failed to load feedback'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    // Mark as Read when opening
    const openFeedback = async (fb) => {
        setSelected(fb);
        if (fb.status === 'New') {
            try {
                await axios.put(`${API}/${fb._id}`, { status: 'Read' }, { withCredentials: true });
                setFeedbacks(prev => prev.map(f => f._id === fb._id ? { ...f, status: 'Read' } : f));
                setStats(prev => ({ ...prev, new: Math.max(0, prev.new - 1) }));
            } catch {}
        }
    };

    const handleDelete = (id, name) => {
        Swal.fire({ title: `Delete feedback from "${name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
            .then(async r => {
                if (r.isConfirmed) {
                    try { await axios.delete(`${API}/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchAll(); }
                    catch { toast.error('Failed'); }
                }
            });
    };

    const filtered = feedbacks.filter(f => {
        const matchStatus   = filterStatus === 'All' || f.status === filterStatus;
        const matchCategory = filterCategory === 'All' || f.category === filterCategory;
        const matchSearch   = !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.message?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchCategory && matchSearch;
    });

    const statCards = [
        { label: 'Total Feedback', value: stats.total,     icon: <Inbox size={22} />,       color: 'bg-blue-50 text-blue-700 border-blue-100' },
        { label: 'New / Unread',   value: stats.new,       icon: <Clock size={22} />,        color: 'bg-orange-50 text-orange-700 border-orange-100' },
        { label: 'Resolved',       value: stats.resolved,  icon: <CheckCircle size={22} />,  color: 'bg-green-50 text-green-700 border-green-100' },
        { label: 'Avg Rating',     value: `${stats.avgRating}★`, icon: <TrendingUp size={22} />, color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    ];

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow-lg p-6">

                {/* Header */}
                <div className="flex items-center gap-3 border-b pb-5 mb-5">
                    <div className="bg-blue-100 p-2 rounded-xl"><MessageSquare className="text-blue-900" size={26} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Feedback & Support</h2>
                        <p className="text-sm text-gray-500">Manage all public feedback submissions</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {statCards.map((s, i) => (
                        <div key={i} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
                            <div className="opacity-80">{s.icon}</div>
                            <div>
                                <p className="text-2xl font-black">{s.value}</p>
                                <p className="text-xs font-semibold opacity-70">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input type="text" placeholder="Search name or message..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-2 border rounded-lg text-sm w-full focus:ring-2 focus:ring-blue-300 outline-none" />
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <Filter size={14} className="text-gray-400" />
                        {['All','New','Read','Resolved'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${filterStatus === s ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {s}
                            </button>
                        ))}
                        <span className="text-gray-300">|</span>
                        {['All', ...Object.keys(CATEGORY_LABELS)].map(c => (
                            <button key={c} onClick={() => setFilterCategory(c)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${filterCategory === c ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {c === 'All' ? 'All Categories' : CATEGORY_LABELS[c]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
                        <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold">No feedback found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Message</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(fb => (
                                    <tr key={fb._id} className={`hover:bg-gray-50 transition-colors ${fb.status === 'New' ? 'bg-blue-50/40' : ''}`}>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-800">{fb.name}</p>
                                            {fb.phone && <p className="text-xs text-gray-400">{fb.phone}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                                                {CATEGORY_LABELS[fb.category] || fb.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3"><StarDisplay rating={fb.rating} /></td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="text-gray-600 text-xs line-clamp-2">{fb.message}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-1 ${STATUS_CONFIG[fb.status]?.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[fb.status]?.dot}`} />
                                                {fb.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(fb.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1.5">
                                                <button onClick={() => openFeedback(fb)} className="p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors" title="View">
                                                    <Eye size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(fb._id, fb.name)} className="p-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <FeedbackModal fb={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
        </div>
    );
};

export default ManageFeedback;

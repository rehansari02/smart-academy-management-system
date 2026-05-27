import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitComplain, getMyComplains, resetComplainState } from '../../features/transaction/complainSlice';
import { toast } from 'react-toastify';
import { 
    MessageSquare, Send, Clock, CheckCircle, 
    XCircle, ChevronLeft, ChevronRight, MessageCircle, Shield, Sparkles 
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import Loading from '../../components/Loading';

const Complain = () => {
    const dispatch = useDispatch();
    const { complains, isLoading } = useSelector((state) => state.complain);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedComplain, setSelectedComplain] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;

    useEffect(() => {
        dispatch(getMyComplains());
        return () => dispatch(resetComplainState());
    }, [dispatch]);

    const totalPages = Math.max(1, Math.ceil(complains.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * pageSize;
    const paginatedComplains = useMemo(
        () => complains.slice(pageStart, pageStart + pageSize),
        [complains, pageStart]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            toast.error('Please fill all fields');
            return;
        }
        try {
            await dispatch(submitComplain({ subject, description })).unwrap();
            toast.success('Your complaint has been submitted successfully.');
            setSubject('');
            setDescription('');
            setIsFormOpen(false);
            setCurrentPage(1);
            dispatch(resetComplainState());
        } catch (error) {
            toast.error(error || 'Failed to submit complaint');
            dispatch(resetComplainState());
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Accepted': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Accepted': return <CheckCircle size={12} />;
            case 'Resolved': return <Sparkles size={12} />;
            case 'Rejected': return <XCircle size={12} />;
            default: return <Clock size={12} />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        Support <span className="text-primary">& Help</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-base">We're here to listen and resolve your concerns.</p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-sm active:scale-95 ${
                        isFormOpen 
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                        : 'bg-primary text-white hover:bg-blue-800 shadow-blue-900/10'
                    }`}
                >
                    {isFormOpen ? <XCircle size={22} /> : <MessageSquare size={22} />}
                    {isFormOpen ? 'Cancel Request' : 'File a Complaint'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* Complain Form */}
                <AnimatePresence>
                    {isFormOpen && (
                        <Motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm relative group overflow-hidden">
                                <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Subject of Concern</label>
                                            <input 
                                                type="text" 
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                placeholder="e.g., Course access, Technical issue"
                                                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-semibold outline-none focus:border-primary focus:bg-white transition-all text-base"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 px-5 py-4 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                            <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                <Shield className="text-primary" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-blue-900">Direct & Private</p>
                                                <p className="text-sm text-blue-700/60 font-medium">Your message goes directly to branch admins.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea 
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Explain your situation in detail..."
                                            rows="5"
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-semibold outline-none focus:border-primary focus:bg-white transition-all resize-none text-base leading-relaxed"
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary transition-all duration-500 flex items-center gap-3 disabled:opacity-50 shadow-sm active:scale-95"
                                        >
                                            {isLoading ? 'Submitting...' : 'Send Message'}
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* Complains List */}
                <div className="space-y-8 pt-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-4">
                            History <span className="w-8 h-px bg-gray-200"></span> <span className="text-primary">{complains.length}</span>
                        </h2>
                    </div>

                    {isLoading && complains.length === 0 ? (
                        <div className="py-24 flex justify-center bg-white rounded-lg border border-gray-100 shadow-sm">
                            <Loading />
                        </div>
                    ) : (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {paginatedComplains.map((item, index) => (
                                <Motion.div 
                                    key={item._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 group relative"
                                >
                                    <div className={`absolute top-6 right-6 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(item.status)} flex items-center gap-2`}>
                                        {getStatusIcon(item.status)}
                                        {item.status}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                                                Ref: #{item._id.substring(item._id.length - 6).toUpperCase()} | {moment(item.createdAt).fromNow()}
                                            </span>
                                            <h4 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors pr-20">
                                                {item.subject}
                                            </h4>
                                        </div>

                                        <p className="text-gray-500 font-medium text-base line-clamp-3 leading-relaxed">
                                            {item.description}
                                        </p>

                                        {item.adminRemark && (
                                            <div className="bg-gray-50/80 p-5 rounded-lg border border-gray-100/50 space-y-3 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20"></div>
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                                    <MessageCircle size={14} /> Official Response
                                                </p>
                                                <p className="text-base font-semibold text-gray-700 leading-relaxed italic">
                                                    "{item.adminRemark}"
                                                </p>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                        Processed on {moment(item.acceptedAt || item.resolvedAt || item.updatedAt).format('MMM DD, YYYY')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 flex items-center justify-between border-t border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-xs border border-gray-100 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                                    #{pageStart + index + 1}
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tracking Info</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedComplain(item)}
                                                className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white"
                                            >
                                                View Details <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </Motion.div>
                            ))}

                            {complains.length === 0 && (
                                <div className="md:col-span-2 text-center py-24 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-8">
                                        <MessageSquare size={36} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-gray-900">All Quiet Here</h3>
                                    <p className="text-gray-400 font-semibold max-w-xs mx-auto mt-2 leading-relaxed">You haven't filed any complaints yet. We hope everything is going smoothly!</p>
                                </div>
                            )}
                        </div>
                        {complains.length > pageSize && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                                <p className="text-sm text-gray-500 font-semibold">
                                    Showing {pageStart + 1}-{Math.min(pageStart + pageSize, complains.length)} of {complains.length} complaints
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        disabled={safeCurrentPage === 1}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <span className="px-3 py-2 text-sm font-bold text-gray-500">
                                        Page {safeCurrentPage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                        disabled={safeCurrentPage === totalPages}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedComplain && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedComplain(null)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        />

                        <Motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 24 }}
                            className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-lg shadow-2xl font-sans"
                        >
                            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                        Ref: #{selectedComplain._id.substring(selectedComplain._id.length - 8).toUpperCase()}
                                    </p>
                                    <h3 className="text-xl font-extrabold text-gray-900 mt-1">{selectedComplain.subject}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedComplain(null)}
                                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(selectedComplain.status)} flex items-center gap-2`}>
                                        {getStatusIcon(selectedComplain.status)}
                                        {selectedComplain.status}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-400">
                                        Submitted {moment(selectedComplain.createdAt).format('DD MMM YYYY, hh:mm A')}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Complaint Details</p>
                                    <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4 text-sm font-semibold leading-relaxed text-gray-700 whitespace-pre-wrap">
                                        {selectedComplain.description}
                                    </div>
                                </div>

                                {selectedComplain.adminRemark ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-primary">Official Response</p>
                                        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm font-semibold leading-relaxed text-blue-950 whitespace-pre-wrap">
                                            {selectedComplain.adminRemark}
                                        </div>
                                        <p className="text-xs font-semibold text-gray-400">
                                            Processed on {moment(selectedComplain.acceptedAt || selectedComplain.resolvedAt || selectedComplain.updatedAt).format('DD MMM YYYY')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                                        No official response has been added yet.
                                    </div>
                                )}
                            </div>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Complain;

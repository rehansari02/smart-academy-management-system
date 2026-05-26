import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitComplain, getMyComplains, resetComplainState } from '../../features/transaction/complainSlice';
import { toast } from 'react-toastify';
import { 
    MessageSquare, Send, Clock, CheckCircle, AlertCircle, 
    XCircle, ChevronRight, MessageCircle, Shield, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import Loading from '../../components/Loading';

const Complain = () => {
    const dispatch = useDispatch();
    const { complains, isLoading, isSuccess, isError, message } = useSelector((state) => state.complain);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        dispatch(getMyComplains());
        return () => dispatch(resetComplainState());
    }, [dispatch]);

    useEffect(() => {
        if (isSuccess && message === 'Complain submitted') {
            toast.success('Your complaint has been submitted successfully.');
            setSubject('');
            setDescription('');
            setIsFormOpen(false);
            dispatch(resetComplainState());
        }
        if (isError) {
            toast.error(message);
            dispatch(resetComplainState());
        }
    }, [isSuccess, isError, message, dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            toast.error('Please fill all fields');
            return;
        }
        dispatch(submitComplain({ subject, description }));
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
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-none">
                        Support <span className="text-primary">& Help</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-lg">We're here to listen and resolve your concerns.</p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl active:scale-95 ${
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
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-blue-900/5 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl -mr-48 -mt-48"></div>
                                <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Subject of Concern</label>
                                            <input 
                                                type="text" 
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                placeholder="e.g., Course access, Technical issue"
                                                className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 py-5 text-gray-900 font-semibold outline-none focus:border-primary focus:bg-white transition-all text-lg"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 px-8 py-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
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
                                            className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[2rem] px-6 py-5 text-gray-900 font-semibold outline-none focus:border-primary focus:bg-white transition-all resize-none text-lg leading-relaxed"
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-gray-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-primary transition-all duration-500 flex items-center gap-3 disabled:opacity-50 shadow-2xl shadow-gray-900/10 active:scale-95"
                                        >
                                            {isLoading ? 'Submitting...' : 'Send Message'}
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
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
                        <div className="py-24 flex justify-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                            <Loading />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                            {complains.map((item, index) => (
                                <motion.div 
                                    key={item._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 group relative"
                                >
                                    <div className={`absolute top-6 right-6 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(item.status)} flex items-center gap-2`}>
                                        {getStatusIcon(item.status)}
                                        {item.status}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                                                Ref: #{item._id.substring(item._id.length - 6).toUpperCase()} • {moment(item.createdAt).fromNow()}
                                            </span>
                                            <h4 className="text-2xl font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors pr-20">
                                                {item.subject}
                                            </h4>
                                        </div>

                                        <p className="text-gray-500 font-medium text-base line-clamp-3 leading-relaxed">
                                            {item.description}
                                        </p>

                                        {item.adminRemark && (
                                            <div className="bg-gray-50/80 p-6 rounded-[1.5rem] border border-gray-100/50 space-y-3 relative overflow-hidden">
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
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-xs border border-gray-100 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                                    #{index + 1}
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tracking Info</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                View Details <ChevronRight size={12} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {complains.length === 0 && (
                                <div className="md:col-span-2 text-center py-32 bg-gray-50/50 rounded-[4rem] border-4 border-dashed border-gray-100">
                                    <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mx-auto mb-8">
                                        <MessageSquare size={36} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-gray-900">All Quiet Here</h3>
                                    <p className="text-gray-400 font-semibold max-w-xs mx-auto mt-2 leading-relaxed">You haven't filed any complaints yet. We hope everything is going smoothly!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Complain;

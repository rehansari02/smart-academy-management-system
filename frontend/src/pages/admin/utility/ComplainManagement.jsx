import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllComplains, updateComplainStatus, resetComplainState } from '../../../features/transaction/complainSlice';
import { toast } from 'react-toastify';
import { 
    MessageSquare, CheckCircle, XCircle, Clock, 
    Filter, Search, User, Phone, MapPin, 
    Calendar, Check, AlertCircle, Trash2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import Loading from '../../../components/Loading';
import SmartTable from '../../../components/ui/SmartTable';

const ComplainManagement = () => {
    const dispatch = useDispatch();
    const { complains, isLoading } = useSelector((state) => state.complain);
    const { user } = useSelector((state) => state.auth);
    
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComplain, setSelectedComplain] = useState(null);
    const [adminRemark, setAdminRemark] = useState('');

    useEffect(() => {
        dispatch(getAllComplains({ status: statusFilter }));
        return () => dispatch(resetComplainState());
    }, [dispatch, statusFilter]);

    const handleUpdateStatus = async (id, status) => {
        if (!adminRemark.trim() && (status === 'Rejected' || status === 'Resolved')) {
            toast.error('Please provide a remark for this action');
            return;
        }

        try {
            await dispatch(updateComplainStatus({ id, status, adminRemark })).unwrap();
            toast.success(`Complaint marked as ${status}`);
            setSelectedComplain(null);
            setAdminRemark('');
        } catch (error) {
            toast.error(error || 'Failed to update status');
        }
    };

    const filteredComplains = complains.filter(c => 
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.studentId?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.studentId?.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'Date',
            accessor: (row) => moment(row.createdAt).format('DD MMM YYYY')
        },
        {
            header: 'Student',
            accessor: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{row.studentId?.firstName} {row.studentId?.lastName}</span>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{row.studentId?.enrollmentNo}</span>
                </div>
            )
        },
        {
            header: 'Subject',
            accessor: 'subject',
            className: 'font-bold text-gray-700'
        },
        {
            header: 'Status',
            accessor: (row) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    row.status === 'Accepted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    row.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                    row.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-orange-50 text-orange-700 border-orange-100'
                }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: (row) => (
                <button 
                    onClick={() => setSelectedComplain(row)}
                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                >
                    <ExternalLink size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="p-6 md:p-10 space-y-10 font-sans max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-none">
                        Complaint <span className="text-primary">Box</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-lg">Review and resolve student concerns across all branches.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search student or subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-primary focus:bg-white transition-all w-80 shadow-sm"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-12 pr-10 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-primary appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-gray-200/50">
                <SmartTable 
                    data={filteredComplains}
                    columns={columns}
                    isLoading={isLoading}
                />
            </div>

            {/* Complaint Detail Modal */}
            <AnimatePresence>
                {selectedComplain && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedComplain(null)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        ></motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 40 }}
                            className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden font-sans"
                        >
                            <div className="p-8 md:p-12 space-y-10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                            <MessageSquare size={40} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">{selectedComplain.subject}</h2>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">
                                                    Ref: #{selectedComplain._id.substring(selectedComplain._id.length - 8).toUpperCase()}
                                                </span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    selectedComplain.status === 'Accepted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    selectedComplain.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    selectedComplain.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {selectedComplain.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedComplain(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-90">
                                        <XCircle size={28} className="text-gray-300" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Student Information</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary font-bold shadow-sm border border-gray-100">
                                                {selectedComplain.studentId?.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">{selectedComplain.studentId?.firstName} {selectedComplain.studentId?.lastName}</p>
                                                <p className="text-sm text-gray-500 font-medium">{selectedComplain.studentId?.enrollmentNo}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Communication / Origin</p>
                                        <div className="space-y-1">
                                            <p className="font-bold text-gray-900 flex items-center gap-2">
                                                <Phone size={14} className="text-gray-300" /> {selectedComplain.studentId?.mobileStudent || 'N/A'}
                                            </p>
                                            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                                <MapPin size={14} className="text-gray-300" /> {selectedComplain.studentId?.branchName}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Complaint Narrative</p>
                                    <div className="bg-white border-2 border-gray-50 p-8 rounded-[2rem] text-gray-700 font-semibold text-lg leading-relaxed shadow-inner">
                                        {selectedComplain.description}
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t border-gray-100">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2">Official Resolution Remark</label>
                                        <textarea 
                                            value={adminRemark}
                                            onChange={(e) => setAdminRemark(e.target.value)}
                                            placeholder="Document your response or reason for the decision..."
                                            rows="4"
                                            className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[2rem] px-8 py-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all resize-none text-lg shadow-sm"
                                        ></textarea>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        {selectedComplain.status === 'Pending' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedComplain._id, 'Accepted')}
                                                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 active:scale-95"
                                            >
                                                <Check size={20} /> Accept & Review
                                            </button>
                                        )}
                                        {selectedComplain.status === 'Accepted' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedComplain._id, 'Resolved')}
                                                className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-3 active:scale-95"
                                            >
                                                <Sparkles size={20} /> Mark as Resolved
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedComplain._id, 'Rejected')}
                                            className="px-10 bg-rose-50 text-rose-600 py-5 rounded-2xl font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            <XCircle size={20} /> Reject Request
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComplainManagement;

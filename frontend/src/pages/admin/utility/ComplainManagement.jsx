import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllComplains, updateComplainStatus, resetComplainState } from '../../../features/transaction/complainSlice';
import { toast } from 'react-toastify';
import { 
    MessageSquare, XCircle, 
    Filter, Search, Phone, MapPin, 
    Check, ExternalLink, Sparkles
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import SmartTable from '../../../components/ui/SmartTable';

const getStudentDetails = (complain) => {
    const student = typeof complain?.studentId === 'object' && complain.studentId ? complain.studentId : {};
    const name = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();

    return {
        name: name || 'Student profile unavailable',
        initial: name?.charAt(0)?.toUpperCase() || 'S',
        enrollmentNo: student.enrollmentNo || student.regNo || 'Enrollment not available',
        phone: student.mobileStudent || student.mobileParent || 'Phone not available',
        branchName: student.branchName || 'Branch not available'
    };
};

const ComplainManagement = () => {
    const dispatch = useDispatch();
    const { complains, isLoading } = useSelector((state) => state.complain);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedComplain, setSelectedComplain] = useState(null);
    const [adminRemark, setAdminRemark] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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

    const filteredComplains = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return complains;

        return complains.filter((c) => 
            c.subject?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term) ||
            c.studentId?.firstName?.toLowerCase().includes(term) ||
            c.studentId?.lastName?.toLowerCase().includes(term) ||
            c.studentId?.enrollmentNo?.toLowerCase().includes(term)
        );
    }, [complains, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredComplains.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * pageSize;
    const paginatedComplains = useMemo(
        () => filteredComplains.slice(pageStart, pageStart + pageSize),
        [filteredComplains, pageStart]
    );
    const selectedStudent = getStudentDetails(selectedComplain);

    const openComplainDialog = (complain) => {
        setSelectedComplain(complain);
        setAdminRemark(complain.adminRemark || '');
    };

    const closeComplainDialog = () => {
        setSelectedComplain(null);
        setAdminRemark('');
    };

    const columns = [
        {
            header: 'S.No',
            accessor: (_row, rowIndex, offset) => offset + rowIndex + 1,
            className: 'whitespace-nowrap font-bold text-gray-500'
        },
        {
            header: 'Date',
            accessor: (row) => moment(row.createdAt).format('DD MMM YYYY')
        },
        {
            header: 'Student',
            accessor: (row) => {
                const student = getStudentDetails(row);
                return (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{student.name}</span>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{student.enrollmentNo}</span>
                </div>
                );
            }
        },
        {
            header: 'Subject',
            accessor: (row) => (
                <div className="max-w-md">
                    <p className="font-bold text-gray-800 truncate">{row.subject}</p>
                    <p className="text-xs text-gray-400 font-medium truncate">{row.description}</p>
                </div>
            ),
            className: 'min-w-[260px]'
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
                    onClick={() => openComplainDialog(row)}
                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                >
                    <ExternalLink size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8 font-sans max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        Complaint <span className="text-primary">Box</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-base">Review and resolve student concerns across all branches.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group w-full sm:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search student or subject..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all w-full sm:w-80 shadow-sm"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        <select 
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-primary appearance-none cursor-pointer shadow-sm w-full"
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Pending', 'Accepted', 'Resolved', 'Rejected'].map((status) => {
                    const count = complains.filter((item) => item.status === status).length;
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => {
                                setStatusFilter(statusFilter === status ? '' : status);
                                setCurrentPage(1);
                            }}
                            className={`text-left bg-white border rounded-lg p-4 shadow-sm transition-all ${
                                statusFilter === status ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{status}</p>
                            <p className="text-2xl font-extrabold text-gray-900 mt-1">{count}</p>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <SmartTable 
                    data={paginatedComplains}
                    columns={columns}
                    isLoading={isLoading}
                    rowIndexOffset={pageStart}
                    pagination={{
                        page: safeCurrentPage,
                        pages: totalPages,
                        total: filteredComplains.length
                    }}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Complaint Detail Modal */}
            <AnimatePresence>
                {selectedComplain && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
                        <Motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeComplainDialog}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        ></Motion.div>
                        
                        <Motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 40 }}
                            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden font-sans flex flex-col"
                        >
                            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-12 h-12 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                                            <MessageSquare size={28} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight tracking-tight break-words">{selectedComplain.subject}</h2>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">
                                                    Ref: #{selectedComplain._id.substring(selectedComplain._id.length - 8).toUpperCase()}
                                                </span>
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
                                    <button onClick={closeComplainDialog} className="p-2 shrink-0 hover:bg-gray-100 rounded-lg transition-all active:scale-90">
                                        <XCircle size={24} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
                                <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 shrink-0 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-primary font-extrabold">
                                            {selectedStudent.initial}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Student Information</p>
                                                    <p className="font-extrabold text-gray-900 text-base break-words mt-1">{selectedStudent.name}</p>
                                                    <p className="text-sm text-gray-500 font-semibold">{selectedStudent.enrollmentNo}</p>
                                                </div>
                                                {typeof selectedComplain.studentId !== 'object' && (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                                                        Refresh may be required
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone</p>
                                                    <p className="font-bold text-gray-900 flex items-center gap-2 mt-1">
                                                        <Phone size={14} className="text-gray-300" /> {selectedStudent.phone}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branch</p>
                                                    <p className="font-bold text-gray-900 flex items-center gap-2 mt-1">
                                                        <MapPin size={14} className="text-gray-300" /> {selectedStudent.branchName}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Complaint Narrative</p>
                                    <div className="bg-white border border-gray-100 p-4 rounded-lg text-gray-700 font-semibold text-sm leading-relaxed shadow-inner whitespace-pre-wrap">
                                        {selectedComplain.description}
                                    </div>
                                </div>

                                <div className="space-y-5 pt-4 border-t border-gray-100">
                                    {selectedComplain.adminRemark && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">Current Official Remark</p>
                                            <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-lg text-blue-950 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
                                                {selectedComplain.adminRemark}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Official Resolution Remark</label>
                                        <textarea 
                                            value={adminRemark}
                                            onChange={(e) => setAdminRemark(e.target.value)}
                                            placeholder="Document your response or reason for the decision..."
                                            rows="3"
                                            className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all resize-none text-sm shadow-sm"
                                        ></textarea>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {selectedComplain.status === 'Pending' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedComplain._id, 'Accepted')}
                                                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95 text-sm"
                                            >
                                                <Check size={20} /> Accept & Review
                                            </button>
                                        )}
                                        {selectedComplain.status === 'Accepted' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedComplain._id, 'Resolved')}
                                                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95 text-sm"
                                            >
                                                <Sparkles size={20} /> Mark as Resolved
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedComplain._id, 'Rejected')}
                                            className="px-6 bg-rose-50 text-rose-600 py-3 rounded-lg font-bold hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 text-sm"
                                        >
                                            <XCircle size={20} /> Reject Request
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComplainManagement;

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Edit, Trash2, X, Printer, Eye, GraduationCap, PhoneCall, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import visitorService from '../../../services/visitorService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import VisitorForm from '../../../components/transaction/VisitorForm';
import VisitorViewModal from '../../../components/transaction/VisitorViewModal';
import VisitorFollowUpModal from '../../../components/transaction/VisitorFollowUpModal';
import SearchableDropdown from '../../../components/common/SearchableDropdown';

const TodaysVisitorsList = () => {
    const navigate = useNavigate();
    
    const handlePrintList = () => {
        window.print();
    };
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Fixed filter for Today
    const today = new Date().toISOString().split('T')[0];
    const [studentName, setStudentName] = useState('');
    const [referenceBy, setReferenceBy] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [inquirySource, setInquirySource] = useState('');
    const { user } = useSelector((state) => state.auth);
    
    const [showModal, setShowModal] = useState(false);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [branches, setBranches] = useState([]);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingVisitor, setViewingVisitor] = useState(null);
    const [followUpVisitor, setFollowUpVisitor] = useState(null);
    const activeStudentNames = [...new Set(visitors.map(v => v.studentName).filter(Boolean))].sort();
    const activeReferences = [...new Set(visitors.map(v => v.reference).filter(Boolean))].sort();

    useEffect(() => {
        fetchVisitors();
    }, [filterBranch]);

    useEffect(() => {
        if (user?.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user]);

    const fetchVisitors = async (override = {}) => {
        setLoading(true);
        const nextStudentName = override.studentName ?? studentName;
        const nextReferenceBy = override.referenceBy ?? referenceBy;
        const nextBranch = override.branchId ?? filterBranch;
        const nextInquirySource = override.inquirySource ?? inquirySource;
        try {
            const data = await visitorService.getAllVisitors({
                fromDate: today,
                toDate: today,
                studentName: nextStudentName,
                referenceBy: nextReferenceBy,
                branchId: nextBranch,
                inquirySource: nextInquirySource
            });
            setVisitors(data);
        } catch (error) {
            console.error("Error fetching visitors:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const handleSearch = () => {
        fetchVisitors();
    };

    const handleResetSearch = () => {
        setStudentName('');
        setReferenceBy('');
        setFilterBranch('');
        setInquirySource('');
        fetchVisitors({ studentName: '', referenceBy: '', branchId: '', inquirySource: '' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this visitor?')) {
            try {
                await visitorService.deleteVisitor(id);
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting visitor:", error);
            }
        }
    };

    const handleAddNew = () => {
        setSelectedVisitor(null);
        setShowModal(true);
    };

    const handleView = (visitor) => {
        setViewingVisitor(visitor);
        setShowViewModal(true);
    };

    const handleEdit = (visitor) => {
        setSelectedVisitor(visitor);
        setShowModal(true);
    };

    const handleFormSuccess = () => {
        setShowModal(false);
        fetchVisitors();
    };

    const handleSaveFollowUp = async (id, data) => {
        try {
            await visitorService.createVisitorFollowUp(data);
            setFollowUpVisitor(null);
            fetchVisitors();
        } catch (error) {
            console.error("Error saving visitor follow-up:", error);
        }
    };

    return (
        <div className="w-full p-2 animate-fadeIn">
            <style>{`
                .print-only-header {
                    display: none !important;
                }
                @media print {
                    body {
                        visibility: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .printable-table-container,
                    .printable-table-container * {
                        visibility: visible !important;
                    }
                    .printable-table-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    .print-only-header {
                        display: block !important;
                    }
                    /* Hide the Actions column (last th and td) */
                    .printable-table-container th:last-child,
                    .printable-table-container td:last-child {
                        display: none !important;
                    }
                    /* Clean up page breaks */
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
            <div className="bg-white rounded-lg shadow-lg p-2">
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-blue-500" size={24} />
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Today's Visitors</h2>
                            <p className="text-xs text-gray-500">{new Date().toDateString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrintList}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 shadow-sm font-bold transition-all transform hover:scale-105"
                        >
                            <Printer size={16} /> Print List
                        </button>
                        <button 
                            onClick={handleAddNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 shadow-sm"
                        >
                            <Plus size={16} /> Add New
                        </button>
                    </div>
                </div>

                {/* Search Section */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                        <Search size={16} /> Search Today's Visitors
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                            {user?.role === 'Super Admin' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                    <select
                                        value={filterBranch}
                                        onChange={(e) => setFilterBranch(e.target.value)}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <SearchableDropdown
                                    options={activeStudentNames}
                                    value={studentName}
                                    onSelect={setStudentName}
                                    label="Search Student"
                                    placeholder="Search or type student name/mobile..."
                                    clearLabel="All Students"
                                />
                            </div>
                            <div>
                                <SearchableDropdown
                                    options={activeReferences}
                                    value={referenceBy}
                                    onSelect={setReferenceBy}
                                    label="Reference By"
                                    placeholder="Search or type Reference..."
                                    clearLabel="All References"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Inquiry List</label>
                                <select
                                    value={inquirySource}
                                    onChange={(e) => setInquirySource(e.target.value)}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">All Inquiry Lists</option>
                                    <option value="Online">Online</option>
                                    <option value="Walk-in">Offline</option>
                                    <option value="DSR">DSR</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                onClick={handleResetSearch}
                                className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Reset
                            </button>
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <Search size={16} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto printable-table-container">
                    <div className="print-only-header mb-6 text-center">
                        <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Today's Visitors List</h1>
                        <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-GB')} | Total Visitors: {visitors?.length || 0}</p>
                    </div>
                    <table className="w-full border-collapse min-w-[1300px]">
                        <thead>
                            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                <th className="p-2 border font-semibold w-12">Sr No</th>
                                <th className="p-2 border font-semibold">Visiting Date</th>
                                {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                <th className="p-2 border font-semibold">Student Name</th>
                                <th className="p-2 border font-semibold text-center w-36">Contact</th>
                                <th className="p-2 border font-semibold">Reference</th>
                                <th className="p-2 border font-semibold">Attend By</th>
                                <th className="p-2 border font-semibold text-center">Status</th>
                                <th className="p-2 border font-semibold">In Time</th>
                                <th className="p-2 border font-semibold">Out Time</th>
                                <th className="p-2 border font-semibold">Remarks</th>
                                <th className="p-2 border font-semibold">Create Date</th>
                                <th className="p-2 border font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="13" className="text-center p-4">Loading...</td></tr>
                            ) : visitors.length === 0 ? (
                                <tr><td colSpan="13" className="text-center p-4 text-gray-500">No visitors today.</td></tr>
                            ) : (
                                visitors.map((visitor, index) => (
                                    <tr key={visitor._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                        <td className="p-2 text-center">{index + 1}</td>
                                        <td className="p-2">{visitor.visitingDate ? new Date(visitor.visitingDate).toLocaleDateString('en-GB') : '-'}</td>
                                        {user?.role === 'Super Admin' && <td className="p-2 text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                        <td className="p-2 font-bold text-gray-800">{visitor.studentName}</td>
                                        <td className="p-0 border align-top w-36">
                                            <div className="flex border-b border-gray-200 last:border-b-0">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">G</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                    {visitor.contactParent || '-'}
                                                </div>
                                            </div>
                                            <div className="flex border-b border-gray-200 last:border-b-0">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                    {visitor.contactHome || '-'}
                                                </div>
                                            </div>
                                            <div className="flex">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start text-blue-600">
                                                    {visitor.mobileNumber || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2">{visitor.reference || '-'}</td>
                                        <td className="p-2">{visitor.attendedBy?.name || visitor.attendedBy?.username || '-'}</td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                visitor.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                visitor.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                visitor.status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                visitor.status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                {visitor.status || 'Open'}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            <span className="text-green-700 font-semibold">{visitor.inTime}</span>
                                        </td>
                                        <td className="p-2">
                                            {visitor.outTime && <span className="text-red-500 font-semibold"> {visitor.outTime}</span>}
                                        </td>
                                        <td className="p-2 truncate max-w-xs" title={visitor.remarks}>{visitor.remarks || '-'}</td>
                                        <td className="p-2 text-xs">
                                            {visitor.createdAt ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(visitor.createdAt).toLocaleDateString('en-GB')}</span>
                                                    <span className="text-gray-500">{new Date(visitor.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-center print:hidden">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => setFollowUpVisitor(visitor)} className="bg-purple-50 text-purple-600 hover:bg-purple-100 p-1.5 rounded border border-purple-200 transition" title="Visitor Follow-up">
                                                    <PhoneCall size={14} />
                                                </button>
                                                <button onClick={() => navigate('/master/student-admission', { state: { visitorData: visitor } })} className="bg-green-50 text-green-600 hover:bg-green-100 p-1.5 rounded border border-green-200 transition" title="Take Admission">
                                                    <GraduationCap size={14} />
                                                </button>
                                                <button onClick={() => handleView(visitor)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-1.5 rounded border border-indigo-200 transition" title="View Profile">
                                                    <Eye size={14} />
                                                </button>
                                                <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded border border-blue-200 transition" title="Edit">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded border border-red-200 transition" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Visitor Form Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto animate-zoomIn">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <Plus className="text-blue-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {selectedVisitor ? 'Edit Visitor Details' : 'New Visitor Registration'}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <VisitorForm 
                                    initialData={selectedVisitor}
                                    onSuccess={handleFormSuccess}
                                    onCancel={() => setShowModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Visitor View Modal */}
                {showViewModal && (
                    <VisitorViewModal 
                        visitor={viewingVisitor}
                        onClose={() => {
                            setShowViewModal(false);
                            setViewingVisitor(null);
                        }}
                    />
                )}

                {followUpVisitor && (
                    <VisitorFollowUpModal
                        visitor={followUpVisitor}
                        onClose={() => setFollowUpVisitor(null)}
                        onSave={handleSaveFollowUp}
                    />
                )}
            </div>
        </div>
    );
};

export default TodaysVisitorsList;

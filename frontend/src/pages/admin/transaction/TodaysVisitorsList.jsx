import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import visitorService from '../../../services/visitorService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import VisitorForm from '../../../components/transaction/VisitorForm';

const TodaysVisitorsList = () => {
    const navigate = useNavigate();
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Fixed filter for Today
    const today = new Date().toISOString().split('T')[0];
    const [search, setSearch] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const { user } = useSelector((state) => state.auth);
    
    const [showModal, setShowModal] = useState(false);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        fetchVisitors();
        if (user?.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user]);

    const fetchVisitors = async () => {
        setLoading(true);
        try {
            const data = await visitorService.getAllVisitors({
                fromDate: today,
                toDate: today,
                search: search,
                branchId: filterBranch
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

    const handleEdit = (visitor) => {
        setSelectedVisitor(visitor);
        setShowModal(true);
    };

    const handleFormSuccess = () => {
        setShowModal(false);
        fetchVisitors();
    };

    return (
        <div className="w-full p-2 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-lg p-2">
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-blue-500" size={24} />
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Today's Visitors</h2>
                            <p className="text-xs text-gray-500">{new Date().toDateString()}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 shadow-sm"
                    >
                        <Plus size={16} /> Add New
                    </button>
                </div>

                {/* Simple Search */}
                <div className="flex gap-2 mb-3 flex-wrap items-center bg-gray-50 p-2 rounded">
                    {user?.role === 'Super Admin' && (
                        <select 
                            value={filterBranch} 
                            onChange={(e) => { setFilterBranch(e.target.value); setTimeout(fetchVisitors, 100); }} 
                            className="border rounded p-1.5 focus:ring-1 focus:ring-blue-500 text-sm h-9"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    )}
                    <div className="flex gap-2 flex-grow max-w-sm">
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Name or Mobile..."
                        className="flex-1 border rounded p-1.5 focus:ring-1 focus:ring-blue-500 text-sm h-9"
                    />
                    <button onClick={handleSearch} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg text-gray-600">
                        <Search size={20} />
                    </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                <th className="p-2 border font-semibold w-12">Sr No</th>
                                <th className="p-2 border font-semibold">Visiting Date</th>
                                {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                <th className="p-2 border font-semibold">Name</th>
                                <th className="p-2 border font-semibold">Contact No</th>
                                <th className="p-2 border font-semibold">Reference</th>
                                <th className="p-2 border font-semibold">Attend By</th>
                                <th className="p-2 border font-semibold">In Time</th>
                                <th className="p-2 border font-semibold">Out Time</th>
                                <th className="p-2 border font-semibold">Remarks</th>
                                <th className="p-2 border font-semibold">Create Date</th>
                                <th className="p-2 border font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="12" className="text-center p-4">Loading...</td></tr>
                            ) : visitors.length === 0 ? (
                                <tr><td colSpan="12" className="text-center p-4 text-gray-500">No visitors today.</td></tr>
                            ) : (
                                visitors.map((visitor, index) => (
                                    <tr key={visitor._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                        <td className="p-2 text-center">{index + 1}</td>
                                        <td className="p-2">{visitor.visitingDate ? new Date(visitor.visitingDate).toLocaleDateString('en-GB') : '-'}</td>
                                        {user?.role === 'Super Admin' && <td className="p-2 text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                        <td className="p-2 font-bold text-gray-800">{visitor.studentName}</td>
                                        <td className="p-2 text-gray-600">{visitor.mobileNumber}</td>
                                        <td className="p-2">{visitor.reference || '-'}</td>
                                        <td className="p-2">{visitor.attendedBy?.name || visitor.attendedBy?.username || '-'}</td>
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
                                        <td className="p-2 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1 rounded border border-blue-200" title="Edit">
                                                    <Edit size={14} />
                                                </button>
                                            <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1 rounded border border-red-200" title="Delete">
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
            </div>
        </div>
    );
};

export default TodaysVisitorsList;

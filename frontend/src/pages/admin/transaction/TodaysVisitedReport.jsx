import React, { useState, useEffect } from 'react';
import { FileText, Search, Edit, Trash2, ArrowRightCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import visitorService from '../../../services/visitorService';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import axios from 'axios';

const TodaysVisitedReport = () => {
    const navigate = useNavigate();
    
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const { user } = useSelector((state) => state.auth);
    
    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        search: '',
        limit: 10,
        branchId: ''
    });

    useEffect(() => {
        if (user && user.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user]);

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    // Fetch visitors only when filters are applied
    const fetchVisitors = async () => {
        // Only fetch if at least one filter is set
        if (!filters.fromDate && !filters.toDate && !filters.search) {
            setVisitors([]);
            return;
        }

        setLoading(true);
        try {
            const data = await visitorService.getAllVisitors(filters);
            setVisitors(data);
        } catch (error) {
            console.error("Error fetching visitors:", error);
            toast.error("Failed to fetch visitors");
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        fetchVisitors();
    };

    const handleReset = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            search: '',
            limit: 10,
            branchId: ''
        });
        setVisitors([]);
        toast.info('Filters reset');
    };

    const handleEdit = (visitor) => {
        // Navigate to Visitors page with pre-filled data
        navigate('/transaction/visitors', { state: { visitorData: visitor } });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this visitor?')) {
            try {
                await visitorService.deleteVisitor(id);
                toast.success('Visitor deleted successfully');
                fetchVisitors(); // Refresh the list
            } catch (error) {
                console.error("Error deleting visitor:", error);
                toast.error("Failed to delete visitor");
            }
        }
    };

    return (
        <div className="w-full p-2 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-lg p-2">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <FileText className="text-green-600" size={24} />
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Today's Visited Report</h2>
                        <p className="text-xs text-gray-500">View and filter records</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 bg-gray-50 p-2 rounded-lg">
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">From Date</label>
                        <input 
                            type="date" 
                            name="fromDate" 
                            value={filters.fromDate}
                            onChange={handleFilterChange}
                            className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 mb-1 h-8"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">To Date</label>
                        <input 
                            type="date" 
                            name="toDate" 
                            value={filters.toDate}
                            onChange={handleFilterChange}
                            className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 mb-1 h-8"
                        />
                    </div>
                    
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-600 mb-1">Branch</label>
                            <select 
                                name="branchId" 
                                value={filters.branchId} 
                                onChange={handleFilterChange}
                                className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 h-8"
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">Ref / Search</label>
                        <input 
                            type="text" 
                            name="search" 
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Name..."
                            className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 h-8"
                        />
                    </div>
                    <div className="flex items-end gap-1">
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 hover:bg-blue-700 flex-1 justify-center h-8"
                        >
                            <Search size={14} /> Search
                        </button>
                        <button 
                            onClick={handleReset}
                            className="bg-gray-500 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 hover:bg-gray-600 h-8"
                        >
                            Reset
                        </button>
                    </div>
                    <div className="flex items-end">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 w-full justify-center">
                            <FileText size={16} /> Report
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <div className="mb-2 flex justify-end">
                        <select 
                            name="limit" 
                            value={filters.limit}
                            onChange={(e) => {
                                handleFilterChange(e); 
                                if (filters.fromDate || filters.toDate || filters.search) {
                                    setTimeout(fetchVisitors, 100); 
                                }
                            }}
                            className="border rounded p-1 text-xs text-gray-600"
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
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
                                <tr>
                                    <td colSpan="12" className="text-center p-4 text-gray-500">
                                        {!filters.fromDate && !filters.toDate && !filters.search 
                                            ? 'Please apply filters to view visitor records.' 
                                            : 'No visitors found for the selected filters.'}
                                    </td>
                                </tr>
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
                                            <div className="flex gap-1 justify-center">
                                                {visitor.inquiryId ? (
                                                    <button 
                                                        disabled
                                                        className="bg-green-100 text-green-700 p-1 rounded border border-green-200 cursor-not-allowed" 
                                                        title="Converted"
                                                    >
                                                        <ArrowRightCircle size={14} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => navigate('/transaction/inquiry/offline', { state: { visitorData: visitor } })} 
                                                        className="bg-orange-100 text-orange-700 p-1 rounded hover:bg-orange-200 border border-orange-200 transition-colors" 
                                                        title="Convert"
                                                    >
                                                        <ArrowRightCircle size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-500 hover:text-blue-700 border border-blue-200 p-1 rounded" title="Edit">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-500 hover:text-red-700 border border-red-200 p-1 rounded" title="Delete">
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
            </div>
        </div>
    );
};

export default TodaysVisitedReport;

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
        limit: 50,
        branchId: '',
        reportType: 'followup' // Default to follow-up as requested
    });

    const [followups, setFollowups] = useState([]);

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

    // Fetch data based on report type
    const fetchVisitors = async () => {
        setLoading(true);
        try {
            if (filters.reportType === 'visited') {
                const data = await visitorService.getAllVisitors(filters);
                setVisitors(data);
                setFollowups([]);
            } else {
                // Fetch Inquiries for Follow-up
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry`, {
                    params: {
                        startDate: filters.fromDate,
                        endDate: filters.toDate,
                        search: filters.search,
                        branchId: filters.branchId,
                        dateFilterType: 'followUpDate'
                    },
                    withCredentials: true
                });
                setFollowups(res.data);
                setVisitors([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch records");
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
            limit: 50,
            branchId: '',
            reportType: 'followup'
        });
        setVisitors([]);
        setFollowups([]);
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Activity Report</h2>
                            <p className="text-xs text-gray-500">Track visitors and follow-ups for {formatDate(filters.fromDate)}</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        <button 
                            onClick={() => setFilters({...filters, reportType: 'followup'})}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'followup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Follow-ups
                        </button>
                        <button 
                            onClick={() => setFilters({...filters, reportType: 'visited'})}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'visited' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Visitors
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div>
                        <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">From Date</label>
                        <input 
                            type="date" 
                            name="fromDate" 
                            value={filters.fromDate}
                            onChange={handleFilterChange}
                            className="w-full border-blue-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none h-10 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">To Date</label>
                        <input 
                            type="date" 
                            name="toDate" 
                            value={filters.toDate}
                            onChange={handleFilterChange}
                            className="w-full border-blue-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none h-10 shadow-sm"
                        />
                    </div>
                    
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Branch</label>
                            <select 
                                name="branchId" 
                                value={filters.branchId} 
                                onChange={handleFilterChange}
                                className="w-full border-blue-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none h-10 shadow-sm"
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Search</label>
                        <input 
                            type="text" 
                            name="search" 
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search by name..."
                            className="w-full border-blue-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none h-10 shadow-sm"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 h-10 flex-1 justify-center"
                        >
                            <Search size={16} /> Fetch
                        </button>
                        <button 
                            onClick={handleReset}
                            className="bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 h-10 transition-all shadow-sm"
                        >
                            Reset
                        </button>
                    </div>
                    
                    <div className="flex items-end">
                        <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-50 transition-all h-10 w-full justify-center">
                            <FileText size={16} /> Export
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <div className="mb-4 flex justify-between items-center">
                        <div className="text-sm font-bold text-gray-700">
                            Showing {filters.reportType === 'visited' ? visitors.length : followups.length} {filters.reportType} records
                        </div>
                        <select 
                            name="limit" 
                            value={filters.limit}
                            onChange={(e) => {
                                handleFilterChange(e); 
                                setTimeout(fetchVisitors, 100); 
                            }}
                            className="border rounded-lg p-2 text-xs text-gray-600 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="50">50 Records</option>
                            <option value="100">100 Records</option>
                            <option value="200">200 Records</option>
                        </select>
                    </div>
                    <table className="w-full border-collapse min-w-[1200px]">
                        {filters.reportType === 'visited' ? (
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-[10px] uppercase tracking-widest">
                                    <th className="p-3 border-r border-blue-500 font-bold w-12 text-center">Sr</th>
                                    <th className="p-3 border-r border-blue-500 font-bold">Visiting Date</th>
                                    {user?.role === 'Super Admin' && <th className="p-3 border-r border-blue-500 font-bold">Branch</th>}
                                    <th className="p-3 border-r border-blue-500 font-bold">Student Name</th>
                                    <th className="p-3 border-r border-blue-500 font-bold">Contact No</th>
                                    <th className="p-3 border-r border-blue-500 font-bold text-center">In Time</th>
                                    <th className="p-3 border-r border-blue-500 font-bold text-center">Out Time</th>
                                    <th className="p-3 border-r border-blue-500 font-bold">Remarks</th>
                                    <th className="p-3 font-bold text-center">Actions</th>
                                </tr>
                            </thead>
                        ) : (
                            <thead>
                                <tr className="bg-orange-600 text-white text-left text-[10px] uppercase tracking-widest">
                                    <th className="p-3 border-r border-orange-500 font-bold w-12 text-center">Sr</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Inquiry Date</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Follow-up Date</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Student Name</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Contact Number</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Course Interested</th>
                                    <th className="p-3 border-r border-orange-500 font-bold">Reference By</th>
                                    <th className="p-3 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="12" className="text-center p-12">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                        <p className="text-gray-400 font-medium">Fetching records...</p>
                                    </div>
                                </td></tr>
                            ) : filters.reportType === 'visited' ? (
                                visitors.length === 0 ? (
                                    <tr><td colSpan="12" className="text-center p-12 text-gray-400 italic">No visitor records found for this period.</td></tr>
                                ) : (
                                    visitors.map((visitor, index) => (
                                        <tr key={visitor._id} className="hover:bg-blue-50/50 text-xs border-b border-gray-100 transition-colors">
                                            <td className="p-3 text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-3 font-semibold text-gray-700">{formatDate(visitor.visitingDate)}</td>
                                            {user?.role === 'Super Admin' && <td className="p-3 text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                            <td className="p-3 font-bold text-gray-800">{visitor.studentName}</td>
                                            <td className="p-3 text-blue-600 font-medium">{visitor.mobileNumber}</td>
                                            <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">{visitor.inTime}</span></td>
                                            <td className="p-3 text-center"><span className="bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">{visitor.outTime || '-'}</span></td>
                                            <td className="p-3 text-gray-600 truncate max-w-xs" title={visitor.remarks}>{visitor.remarks || '-'}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => handleEdit(visitor)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"><Edit size={14} /></button>
                                                    <button onClick={() => handleDelete(visitor._id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                followups.length === 0 ? (
                                    <tr><td colSpan="12" className="text-center p-12 text-gray-400 italic">No student follow-ups scheduled for this period.</td></tr>
                                ) : (
                                    followups.map((hist, index) => (
                                        <tr key={hist._id} className="hover:bg-orange-50/50 text-xs border-b border-gray-100 transition-colors">
                                            <td className="p-3 text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-3 font-semibold text-gray-700">{formatDate(hist.inquiryDate)}</td>
                                            <td className="p-3 font-bold text-orange-600">{formatDate(hist.followUpDate)}</td>
                                            <td className="p-3 font-bold text-gray-800">{hist.firstName} {hist.lastName}</td>
                                            <td className="p-3 text-blue-600 font-medium">{hist.contactStudent || hist.contactParent || hist.contactHome}</td>
                                            <td className="p-3 text-gray-700 font-medium">{hist.interestedCourse?.name || '-'}</td>
                                            <td className="p-3 text-gray-600">{hist.referenceBy || 'Direct'}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    hist.status === 'Converted' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                                    hist.status === 'Recall' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                    'bg-blue-100 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {hist.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TodaysVisitedReport;

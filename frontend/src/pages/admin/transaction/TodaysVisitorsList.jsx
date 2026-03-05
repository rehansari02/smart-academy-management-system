import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, User, Clock, FileText, Edit, Trash2, ArrowRightCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import visitorService from '../../../services/visitorService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TodaysVisitorsList = () => {
    const navigate = useNavigate();
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Fixed filter for Today
    const today = new Date().toISOString().split('T')[0];
    const [search, setSearch] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const { user } = useSelector((state) => state.auth);
    
    // Dropdown Data (for Add/Edit Modal if we include it here too)
    // For brevity, assuming this page might just list them, but user said "Add new Visitor" here too.
    // So duplication of logic is needed unless refactored. I will duplicate for speed and independence.
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        visitingDate: today,
        studentName: '',
        mobileNumber: '',
        reference: '',
        referenceContact: '',
        referenceAddress: '',
        course: '',
        inTime: '',
        outTime: '',
        attendedBy: '',
        remarks: '',
        branchId: ''
    });

    const [courses, setCourses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isNewReference, setIsNewReference] = useState(false);

    useEffect(() => {
        fetchVisitors();
        fetchDropdowns();
        if (user?.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user]); // Re-run if user loads

    const fetchVisitors = async () => {
        setLoading(true);
        try {
            // Filter for today only
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

    const fetchDropdowns = async () => {
        try {
            const coursesRes = await axios.get(`${import.meta.env.VITE_API_URL}/master/course`); 
            setCourses(coursesRes.data);
            const empRes = await axios.get(`${import.meta.env.VITE_API_URL}/employees`);
            setEmployees(empRes.data);
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
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

    // Form Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNew = () => {
        setEditMode(false);
        setIsNewReference(false);
        setFormData({
            visitingDate: today,
            studentName: '',
            mobileNumber: '',
            reference: '',
            referenceContact: '',
            referenceAddress: '',
            course: '',
            inTime: '',
            outTime: '',
            attendedBy: '',
            remarks: '',
            branchId: ''
        });
        setShowModal(true);
    };

    const handleEdit = (visitor) => {
        setEditMode(true);
        setCurrentId(visitor._id);
        const isExternal = !!visitor.referenceContact; 
        setIsNewReference(isExternal);
        setFormData({
            visitingDate: visitor.visitingDate ? visitor.visitingDate.split('T')[0] : '',
            studentName: visitor.studentName,
            mobileNumber: visitor.mobileNumber,
            reference: visitor.reference,
            referenceContact: visitor.referenceContact || '',
            referenceAddress: visitor.referenceAddress || '',
            course: visitor.course?._id || visitor.course,
            inTime: visitor.inTime,
            outTime: visitor.outTime,
            attendedBy: visitor.attendedBy?._id || visitor.attendedBy,
            remarks: visitor.remarks,
            branchId: visitor.branchId?._id || visitor.branchId || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editMode) {
                await visitorService.updateVisitor(currentId, formData);
            } else {
                await visitorService.createVisitor(formData);
            }
            setShowModal(false);
            fetchVisitors();
        } catch (error) {
            console.error("Error saving visitor:", error);
            alert("Failed to save visitor");
        } finally {
            setIsSubmitting(false);
        }
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

                {/* Reuse Modal Logic - Simplified */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between">
                                <h3 className="text-lg font-bold">{editMode ? 'Edit Visitor' : 'Add Today\'s Visitor'}</h3>
                                <button onClick={() => setShowModal(false)}><Plus size={24} className="rotate-45" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Same fields as Visitors.jsx roughly */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} required className="w-full border rounded p-2" />
                                </div>
                                {user?.role === 'Super Admin' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Branch</label>
                                        <select name="branchId" value={formData.branchId} onChange={handleInputChange} className="w-full border rounded p-2" required>
                                            <option value="">Select Branch</option>
                                            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Mobile</label>
                                    <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} required className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Reference</label>
                                    <select 
                                        name="reference"
                                        value={isNewReference ? 'new_ref_option' : formData.reference}
                                        onChange={(e) => {
                                            if (e.target.value === 'new_ref_option') {
                                                setIsNewReference(true);
                                                setFormData(prev => ({ ...prev, reference: '' }));
                                            } else {
                                                setIsNewReference(false);
                                                handleInputChange(e);
                                            }
                                        }}
                                        className="w-full border rounded p-2"
                                    >
                                        <option value="">Select Reference</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp.name || `${emp.firstName} ${emp.lastName}`}>{emp.name || `${emp.firstName} ${emp.lastName}`} (Staff)</option>
                                        ))}
                                        <option value="new_ref_option" className="text-blue-600 font-bold">+ Add New Reference</option>
                                    </select>
                                    {isNewReference && (
                                        <div className="mt-2 bg-gray-50 p-2 border rounded">
                                            <input type="text" name="reference" value={formData.reference} onChange={handleInputChange} placeholder="Name" required className="w-full border rounded p-1 mb-1 text-sm" />
                                            <input type="tel" name="referenceContact" value={formData.referenceContact} onChange={handleInputChange} placeholder="Mobile" className="w-full border rounded p-1 mb-1 text-sm" />
                                            <input type="text" name="referenceAddress" value={formData.referenceAddress} onChange={handleInputChange} placeholder="Address" className="w-full border rounded p-1 text-sm" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Course</label>
                                    <select name="course" value={formData.course} onChange={handleInputChange} className="w-full border rounded p-2">
                                        <option value="">Select Course</option>
                                        {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">In Time</label>
                                    <input type="time" name="inTime" value={formData.inTime} onChange={handleInputChange} className="w-full border rounded p-2" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium mb-1">Out Time</label>
                                    <input type="time" name="outTime" value={formData.outTime} onChange={handleInputChange} className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Attended By</label>
                                    <select name="attendedBy" value={formData.attendedBy} onChange={handleInputChange} className="w-full border rounded p-2">
                                        <option value="">Select Staff</option>
                                        {employees.map(e => <option key={e._id} value={e._id}>{e.name || e.firstName}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Remarks</label>
                                    <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full border rounded p-2"></textarea>
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                        {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodaysVisitorsList;

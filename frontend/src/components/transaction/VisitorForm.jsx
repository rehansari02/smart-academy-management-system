import React, { useState, useEffect } from 'react';
import { Users, Plus, Copy, ClipboardPaste, RotateCcw, X, Eye, ArrowRight, Save } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReferences, createReference } from '../../features/master/masterSlice';
import { toast } from 'react-toastify';
import axios from 'axios'; 
import visitorService from '../../services/visitorService';
import { formatInputText } from '../../utils/textFormatter';
import InquiryViewModal from './InquiryViewModal';

const VisitorForm = ({ initialData = null, onSuccess = null, onCancel = null }) => {
    const dispatch = useDispatch();
    const { references } = useSelector((state) => state.master);
    const { user } = useSelector((state) => state.auth);
    
    // State
    const [formData, setFormData] = useState({
        visitingDate: new Date().toISOString().split('T')[0],
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
        branchId: user?.branchId || ''
    });

    // Dropdown Data State
    const [courses, setCourses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    
    // Modal State for Reference
    const [showRefModal, setShowRefModal] = useState(false);
    const [newRef, setNewRef] = useState({ name: '', mobile: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefLoading, setIsRefLoading] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        fetchDropdowns();
        dispatch(fetchReferences());
        
        if (user && user.role === 'Super Admin') {
            fetchBranches();
        }
    }, [user, dispatch]);

    // Handle initial data for edit mode
    useEffect(() => {
        if (initialData) {
            setFormData({
                visitingDate: initialData.visitingDate ? initialData.visitingDate.split('T')[0] : '',
                studentName: initialData.studentName || '',
                mobileNumber: initialData.mobileNumber || '',
                reference: initialData.reference || '',
                referenceContact: initialData.referenceContact || '',
                referenceAddress: initialData.referenceAddress || '',
                course: initialData.course?._id || initialData.course || '',
                inTime: initialData.inTime || '',
                outTime: initialData.outTime || '',
                attendedBy: initialData.attendedBy?._id || initialData.attendedBy || '',
                remarks: initialData.remarks || '',
                branchId: initialData.branchId?._id || initialData.branchId || user?.branchId || ''
            });
        }
    }, [initialData, user]);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setFormData({
            visitingDate: new Date().toISOString().split('T')[0],
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
            branchId: user?.branchId || ''
        });
    };

    const handleCopyData = () => {
        const dataString = JSON.stringify(formData);
        navigator.clipboard.writeText(dataString).then(() => {
            toast.success('Form data copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            toast.error('Failed to copy data');
        });
    };

    const handlePasteData = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const pastedData = JSON.parse(clipboardText);
            
            if (pastedData && typeof pastedData === 'object') {
                setFormData(prev => ({
                    ...prev,
                    ...pastedData
                }));
                toast.success('Data pasted successfully!');
            } else {
                toast.error('Invalid data format in clipboard');
            }
        } catch (err) {
            console.error('Failed to paste:', err);
            toast.error('Failed to paste data. Make sure you copied valid form data.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (initialData?._id) {
                // Update existing visitor
                await visitorService.updateVisitor(initialData._id, formData);
                toast.success('Visitor updated successfully!');
            } else {
                // Create new visitor
                await visitorService.createVisitor(formData);
                toast.success('Visitor saved successfully!');
            }
            
            if (onSuccess) {
                onSuccess();
            } else {
                handleReset();
            }
        } catch (error) {
            console.error("Error saving visitor:", error);
            toast.error("Failed to save visitor");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Search State
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [viewInquiry, setViewInquiry] = useState(null); // For Modal

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formData.studentName && formData.studentName.length > 2) {
                setIsSearching(true);
                try {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry?studentName=${formData.studentName}`, { withCredentials: true });
                    setSearchResults(res.data);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.studentName]);

    const handleFillDetails = (inquiry) => {
        const fullName = [inquiry.firstName, inquiry.middleName, inquiry.lastName].filter(Boolean).join(' ');
        const matchedCourse = courses.find(c => c._id === inquiry.interestedCourse?._id || c._id === inquiry.interestedCourse);

        setFormData(prev => ({
            ...prev,
            studentName: fullName,
            mobileNumber: inquiry.contactStudent || inquiry.contactParent || inquiry.mobile || '',
            reference: inquiry.source === 'Reference' ? (inquiry.referenceBy || '') : inquiry.source,
            course: matchedCourse ? matchedCourse._id : '',
        }));
        
        toast.info("Details filled from Inquiry record");
    };

    return (
        <div className={`transition-all duration-300 ${searchResults.length > 0 ? 'w-full' : 'max-w-4xl mx-auto'}`}>
            <div className={`grid grid-cols-1 ${searchResults.length > 0 ? 'lg:grid-cols-3 gap-6' : 'gap-4'}`}>
                
                {/* Main Form Section */}
                <div className={`bg-white rounded-lg p-2 ${searchResults.length > 0 ? 'lg:col-span-2' : ''}`}>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Visiting Date *</label>
                            <input 
                                type="date"
                                name="visitingDate"
                                value={formData.visitingDate}
                                onChange={handleInputChange}
                                required
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        
                        {user?.role === 'Super Admin' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                                <select 
                                    name="branchId" 
                                    value={formData.branchId} 
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    required={user?.role === 'Super Admin'}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, studentName: formatInputText(e.target.value) }))}
                                    required
                                    autoComplete="off"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Start typing to search..."
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-2.5">
                                        <RotateCcw className="animate-spin text-gray-400" size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                            <input 
                                type="tel"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleInputChange}
                                required
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                            <div className="flex gap-2">
                                <select 
                                    name="reference"
                                    value={formData.reference}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const extRef = references.find(r => r.name === val);
                                        if(extRef) {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                reference: val,
                                                referenceContact: extRef.mobile || '',
                                                referenceAddress: extRef.address || ''
                                            }));
                                        } else {
                                            handleInputChange(e);
                                        }
                                    }}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select Reference</option>
                                    <optgroup label="Staff">
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp.name || `${emp.firstName} ${emp.lastName}`}>
                                                {emp.name || `${emp.firstName} ${emp.lastName}`} (Staff)
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="External References">
                                        {references.map((r, i) => (
                                            <option key={r._id || i} value={r.name}>{r.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <button 
                                    type="button" 
                                    onClick={() => setShowRefModal(true)}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded border hover:bg-indigo-100 flex-shrink-0"
                                    title="Add New Reference"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Course Interested</label>
                            <select 
                                name="course" 
                                value={formData.course} 
                                onChange={handleInputChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>{course.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attended By</label>
                            <select 
                                name="attendedBy" 
                                value={formData.attendedBy} 
                                onChange={handleInputChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Staff</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name || emp.firstName + ' ' + emp.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">In Time</label>
                            <input 
                                type="time" 
                                name="inTime" 
                                value={formData.inTime} 
                                onChange={handleInputChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Out Time</label>
                            <input 
                                type="time" 
                                name="outTime" 
                                value={formData.outTime} 
                                onChange={handleInputChange}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea 
                                name="remarks"
                                value={formData.remarks}
                                onChange={(e) => setFormData(prev => ({ ...prev, remarks: formatInputText(e.target.value) }))}
                                rows="2"
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="md:col-span-2 flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t">
                            <button 
                                type="button" 
                                onClick={handleReset}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={18} />
                                Reset
                            </button>
                            <button 
                                type="button" 
                                onClick={handlePasteData}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <ClipboardPaste size={18} />
                                Paste
                            </button>
                            <button 
                                type="button" 
                                onClick={handleCopyData}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Copy size={18} />
                                Copy
                            </button>
                            {onCancel && (
                                <button 
                                    type="button" 
                                    onClick={onCancel}
                                    className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                    <X size={18} />
                                    Cancel
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting ? <RotateCcw className="animate-spin" size={16} /> : <Save size={18} />}
                                {isSubmitting ? 'Saving...' : (initialData?._id ? 'Update Visitor' : 'Save Visitor')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Side Panel for Search Matches */}
                {searchResults.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-0 overflow-hidden border flex flex-col h-[500px] animate-slideInRight">
                        <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-indigo-900 text-sm">Possible Matches</h3>
                                <p className="text-[10px] text-indigo-600">{searchResults.length} students found</p>
                            </div>
                            <button 
                                onClick={() => setSearchResults([])}
                                className="p-1 hover:bg-indigo-200 rounded text-indigo-700"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {searchResults.map((inquiry) => (
                                <div key={inquiry._id} className="border rounded-lg p-2 hover:bg-gray-50 transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-800 text-xs">
                                            {inquiry.firstName} {inquiry.lastName}
                                        </p>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border ${
                                            inquiry.status === 'Open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                            {inquiry.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-y-0.5 text-[10px] text-gray-600 mb-2">
                                        <div><span className="text-gray-400">Course:</span> {inquiry.interestedCourse?.name || '-'}</div>
                                        <div><span className="text-gray-400">Mobile:</span> {inquiry.contactStudent || '-'}</div>
                                    </div>
    
                                    <div className="flex gap-1 border-t pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setViewInquiry(inquiry)}
                                            className="flex-1 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-[4px] text-[10px] font-bold hover:bg-indigo-50 flex items-center justify-center gap-1"
                                        >
                                            <Eye size={12}/> View
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleFillDetails(inquiry)}
                                            className="flex-1 py-1 bg-indigo-600 text-white rounded-[4px] text-[10px] font-bold hover:bg-indigo-700 flex items-center justify-center gap-1"
                                        >
                                            <ArrowRight size={12}/> Fill
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Reference Modal */}
            {showRefModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white p-5 rounded-lg shadow-2xl w-80 border">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h4 className="font-bold text-gray-800 text-sm">Add New Reference</h4>
                            <button type="button" onClick={() => setShowRefModal(false)}>
                                <X size={16} className="text-gray-500 hover:text-red-500"/>
                            </button>
                        </div>
                        <div className="space-y-3">
                            <input 
                                className="w-full border p-2 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Full Name *"
                                value={newRef.name}
                                onChange={e => setNewRef({...newRef, name: formatInputText(e.target.value)})}
                            />
                            <input 
                                className="w-full border p-2 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Mobile Number *"
                                value={newRef.mobile}
                                onChange={e => setNewRef({...newRef, mobile: e.target.value})}
                            />
                            <input 
                                className="w-full border p-2 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="City / Address"
                                value={newRef.address}
                                onChange={e => setNewRef({...newRef, address: formatInputText(e.target.value)})}
                            />
                            <button 
                                type="button" 
                                disabled={isRefLoading}
                                onClick={() => {
                                    if(!newRef.name || !newRef.mobile) return toast.error('Name & Mobile required');
                                    setIsRefLoading(true);
                                    dispatch(createReference(newRef)).then((res) => {
                                        setIsRefLoading(false);
                                        if(!res.error) {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                reference: newRef.name,
                                                referenceContact: newRef.mobile,
                                                referenceAddress: newRef.address
                                            }));
                                            setShowRefModal(false);
                                            setNewRef({ name: '', mobile: '', address: '' });
                                            toast.success('Reference added successfully!');
                                        }
                                    });
                                }}
                                className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isRefLoading && <RotateCcw className="animate-spin" size={14} />}
                                {isRefLoading ? 'Saving...' : 'Save Reference'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewInquiry && (
                <InquiryViewModal inquiry={viewInquiry} onClose={() => setViewInquiry(null)} />
            )}
        </div>
    );
};

export default VisitorForm;

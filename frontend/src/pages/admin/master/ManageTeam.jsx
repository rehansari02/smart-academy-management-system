import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit, Trash2, X, Image as ImageIcon, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import teamService from '../../../services/teamService';
import { toast } from 'react-toastify';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../../utils/cropUtils';
import Swal from 'sweetalert2';
import axios from 'axios';

const ManageTeam = () => {
    // --- State ---
    const [membersList, setMembersList] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState('');

    // Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        branch: '',
        profession: '',
        experience: '',
        subjects: '',
        isActive: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Crop State
    const [originalImageSrc, setOriginalImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    // --- Effects ---
    useEffect(() => {
        fetchMembers();
        fetchBranches();
    }, []);

    // --- Methods ---
    const fetchMembers = async () => {
        setLoading(true);
        try {
            const data = await teamService.getAllTeamMembers();
            setMembersList(data);
        } catch (error) {
            console.error("Error fetching team members:", error);
            toast.error("Failed to load team members.");
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload a valid image file');
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setOriginalImageSrc(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropConfirm = async () => {
        try {
            const { file, url } = await getCroppedImg(originalImageSrc, croppedAreaPixels);
            setImageFile(file);
            setImagePreview(url);
            setShowCropper(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setOriginalImageSrc(null);
    };

    const handleAddNew = () => {
        setEditMode(false);
        // Auto-calculate sort order for the currently selected branch
        const branchMembers = membersList.filter(m => {
            const bId = typeof m.branch === 'object' ? m.branch?._id : m.branch;
            return bId === selectedBranchFilter;
        });
        const nextSortOrder = branchMembers.length > 0
            ? Math.max(...branchMembers.map(m => m.sortOrder || 0)) + 1
            : 1;
        setFormData({
            name: '',
            branch: selectedBranchFilter || '',
            profession: '',
            experience: '',
            subjects: '',
            sortOrder: nextSortOrder,
            isActive: true
        });
        setImageFile(null);
        setImagePreview(null);
        setOriginalImageSrc(null);
        setShowCropper(false);
        setShowModal(true);
    };

    const handleEdit = (member) => {
        setEditMode(true);
        setCurrentId(member._id);
        setFormData({
            name: member.name || '',
            branch: member.branch?._id || '',
            profession: member.profession || '',
            experience: member.experience || '',
            subjects: Array.isArray(member.subjects) ? member.subjects.join(', ') : (member.subjects || ''),
            isActive: member.isActive
        });
        setImagePreview(member.image || null);
        setImageFile(null);
        setShowModal(true);
    };

    const handleToggleActive = async (member) => {
        try {
            const formData = new FormData();
            formData.append('isActive', !member.isActive);
            await teamService.updateTeamMember(member._id, formData);
            toast.success(`Team member ${!member.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchMembers();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this deletion!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await teamService.deleteTeamMember(id);
                toast.success("Team member deleted successfully");
                fetchMembers();
            } catch (error) {
                console.error("Error deleting team member:", error);
                toast.error("Failed to delete team member");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.branch || !formData.profession || !formData.experience) {
            toast.error('Please fill all required fields (Name, Branch, Profession, Experience)');
            return;
        }

        setSubmitting(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('branch', formData.branch);
        data.append('profession', formData.profession);
        data.append('experience', formData.experience);
        data.append('subjects', formData.subjects);
        data.append('isActive', formData.isActive);
        if (imageFile) {
            data.append('image', imageFile);
        }

        try {
            if (editMode) {
                await teamService.updateTeamMember(currentId, data);
                toast.success("Team member updated successfully");
            } else {
                await teamService.createTeamMember(data);
                toast.success("Team member created successfully");
            }
            setShowModal(false);
            fetchMembers();
        } catch (error) {
            console.error("Error saving team member:", error);
            toast.error(error.response?.data?.message || "Failed to save team member");
        } finally {
            setSubmitting(false);
        }
    };

    const getBranchName = (branch) => {
        if (!branch) return 'N/A';
        if (typeof branch === 'object') return branch.name || branch.shortCode || 'N/A';
        return branch;
    };

    // Get members of the currently selected branch only
    const currentBranchMembers = membersList
        .filter(m => {
            const branchId = typeof m.branch === 'object' ? m.branch?._id : m.branch;
            return !selectedBranchFilter || branchId === selectedBranchFilter;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const filteredMembers = currentBranchMembers
        .filter(m =>
            !searchTerm ||
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getBranchName(m.branch)?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // All members grouped by branch (for "All Branches" view)
    const groupedByBranch = branches.reduce((acc, branch) => {
        const branchMembers = membersList
            .filter(m => {
                const bId = typeof m.branch === 'object' ? m.branch?._id : m.branch;
                return bId === branch._id;
            })
            .filter(m =>
                !searchTerm ||
                m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getBranchName(m.branch)?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        if (branchMembers.length > 0) {
            acc.push({ branch, members: branchMembers });
        }
        return acc;
    }, []);

    const handleMoveUp = async (index) => {
        if (!selectedBranchFilter || index === 0) return;
        const updated = [...filteredMembers];
        const temp = updated[index - 1];
        updated[index - 1] = updated[index];
        updated[index] = temp;

        const batch = updated.map((m, i) => ({
            _id: m._id,
            sortOrder: i + 1
        }));

        try {
            await teamService.updateSortOrder(batch);
            fetchMembers();
        } catch (error) {
            toast.error('Failed to update sort order');
        }
    };

    const handleMoveDown = async (index) => {
        if (!selectedBranchFilter || index === filteredMembers.length - 1) return;
        const updated = [...filteredMembers];
        const temp = updated[index + 1];
        updated[index + 1] = updated[index];
        updated[index] = temp;

        const batch = updated.map((m, i) => ({
            _id: m._id,
            sortOrder: i + 1
        }));

        try {
            await teamService.updateSortOrder(batch);
            fetchMembers();
        } catch (error) {
            toast.error('Failed to update sort order');
        }
    };

    const handleSortOrderEdit = async (memberId, newSortOrder) => {
        const parsed = parseInt(newSortOrder, 10);
        if (isNaN(parsed) || parsed < 1) return;

        try {
            const formData = new FormData();
            formData.append('sortOrder', parsed);
            await teamService.updateTeamMember(memberId, formData);
            fetchMembers();
        } catch (error) {
            toast.error('Failed to update sort order');
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="bg-white rounded-lg shadow-lg p-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <Users className="text-indigo-500" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manage Our Team</h2>
                            <p className="text-sm text-gray-500">Add and manage branch-wise teachers and staff</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={20} /> Add Team Member
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative md:max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, profession, or branch..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:w-64">
                        <select
                            value={selectedBranchFilter}
                            onChange={(e) => setSelectedBranchFilter(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm text-gray-600 uppercase tracking-wider">
                                <th className="p-3 border-b w-24">Sort</th>
                                <th className="p-3 border-b">Sr No</th>
                                <th className="p-3 border-b">Photo</th>
                                <th className="p-3 border-b">Name</th>
                                <th className="p-3 border-b">Branch</th>
                                <th className="p-3 border-b">Profession</th>
                                <th className="p-3 border-b">Experience</th>
                                <th className="p-3 border-b">Subjects</th>
                                <th className="p-3 border-b">Status</th>
                                <th className="p-3 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="10" className="text-center p-8 text-gray-500">Loading team members...</td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan="10" className="text-center p-8 text-gray-500">No team members found.</td></tr>
                            ) : !selectedBranchFilter ? (
                                /* Grouped by branch view for "All Branches" */
                                groupedByBranch.map(({ branch, members }) => (
                                    <React.Fragment key={branch._id}>
                                        <tr className="bg-indigo-50">
                                            <td colSpan="10" className="px-3 py-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                                {branch.name} — {members.length} Teacher{members.length > 1 ? 's' : ''}
                                            </td>
                                        </tr>
                                        {members.map((member, idx) => (
                                            <tr key={member._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                                <td className="p-3 text-center text-gray-300">
                                                    <span className="text-xs">{member.sortOrder || idx + 1}</span>
                                                </td>
                                                <td className="p-3 text-gray-500 font-medium">{idx + 1}</td>
                                                <td className="p-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border shadow-sm bg-gray-100">
                                                        <img
                                                            src={member.image || 'https://via.placeholder.com/150'}
                                                            alt={member.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-800">{member.name}</td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                        {getBranchName(member.branch)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-600">{member.profession}</td>
                                                <td className="p-3 text-gray-600">{member.experience}</td>
                                                <td className="p-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {Array.isArray(member.subjects) && member.subjects.length > 0 ? (
                                                            member.subjects.map((sub, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{sub}</span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {member.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleToggleActive(member)} className={`p-1 ${member.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`} title={member.isActive ? 'Deactivate' : 'Activate'}>
                                                            {member.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                                        </button>
                                                        <button onClick={() => handleEdit(member)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(member._id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                /* Single branch view with reorder controls */
                                filteredMembers.map((member, index) => (
                                    <tr key={member._id} className="hover:bg-gray-50 text-sm border-b transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={searchTerm !== '' || index === 0}
                                                    className={`p-1 rounded ${searchTerm !== '' || index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    title={searchTerm ? "Clear search to reorder" : "Move Up"}
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    defaultValue={member.sortOrder || index + 1}
                                                    onBlur={(e) => handleSortOrderEdit(member._id, e.target.value)}
                                                    className="w-10 text-center text-xs font-bold text-gray-500 border border-gray-200 rounded bg-transparent focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                                                    title="Edit sort order number"
                                                />
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={searchTerm !== '' || index === filteredMembers.length - 1}
                                                    className={`p-1 rounded ${searchTerm !== '' || index === filteredMembers.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    title={searchTerm ? "Clear search to reorder" : "Move Down"}
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-500 font-medium">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border shadow-sm bg-gray-100">
                                                <img
                                                    src={member.image || 'https://via.placeholder.com/150'}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-800">{member.name}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                {getBranchName(member.branch)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600">{member.profession}</td>
                                        <td className="p-3 text-gray-600">{member.experience}</td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {Array.isArray(member.subjects) && member.subjects.length > 0 ? (
                                                    member.subjects.map((sub, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{sub}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {member.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleToggleActive(member)} className={`p-1 ${member.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`} title={member.isActive ? 'Deactivate' : 'Activate'}>
                                                    {member.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <button onClick={() => handleEdit(member)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(member._id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {editMode ? 'Edit Team Member' : 'Add New Team Member'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {showCropper ? (
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-full h-[300px] bg-gray-900 rounded-lg overflow-hidden mb-4">
                                            <Cropper
                                                image={originalImageSrc}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={1 / 1}
                                                onCropChange={setCrop}
                                                onZoomChange={setZoom}
                                                onCropComplete={onCropComplete}
                                            />
                                        </div>
                                        <div className="w-full flex items-center gap-4 mb-4">
                                            <span className="text-sm font-medium text-gray-700">Zoom:</span>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                onChange={(e) => setZoom(e.target.value)}
                                                className="w-full accent-indigo-600"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 w-full border-t pt-4">
                                            <button type="button" onClick={handleCropCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                            <button type="button" onClick={handleCropConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                                                <ImageIcon size={16} /> Apply Crop
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Photo Upload */}
                                        <div className="flex flex-col items-center mb-4">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-50 mb-2 relative group bg-gray-100">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon size={40} />
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                                                    <span className="text-white text-xs font-bold">Change Photo</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500">Recommended: Square image</p>
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. Dr. Rajesh Kumar"
                                            />
                                        </div>

                                        {/* Branch */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch <span className="text-red-500">*</span></label>
                                            <select
                                                name="branch"
                                                value={formData.branch}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="">-- Select Branch --</option>
                                                {branches.map(b => (
                                                    <option key={b._id} value={b._id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Profession */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Profession <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="profession"
                                                value={formData.profession}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. Senior Teacher, Faculty Head"
                                            />
                                        </div>

                                        {/* Experience */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Experience <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="experience"
                                                value={formData.experience}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. 5 Years, 10+ Years"
                                            />
                                        </div>

                                        {/* Subjects */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
                                            <input
                                                type="text"
                                                name="subjects"
                                                value={formData.subjects}
                                                onChange={handleInputChange}
                                                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. Mathematics, Physics, Chemistry"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Enter subjects separated by commas</p>
                                        </div>

                                        {/* Active */}
                                        <div className="flex items-center pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="isActive"
                                                    checked={formData.isActive}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-indigo-600 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Show on Website</span>
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                            <button
                                                type="button"
                                                onClick={() => setShowModal(false)}
                                                className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                                            >
                                                {submitting ? 'Saving...' : (editMode ? 'Update' : 'Save')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageTeam;

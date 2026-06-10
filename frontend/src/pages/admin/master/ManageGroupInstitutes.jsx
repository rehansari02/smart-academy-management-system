import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import groupInstituteService from '../../../services/groupInstituteService';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const defaultForm = {
    name: '',
    link: '',
    isActive: true
};

const ManageGroupInstitutes = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { add, edit, delete: canDelete } = useUserRights('Group Of Institute Manage');

    const fetchItems = async () => {
        try {
            setIsLoading(true);
            const data = await groupInstituteService.getAllItems();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load group institutes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData(defaultForm);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAdd = () => {
        if (!add) {
            showPermissionDenied("You don't have authority to add group institute links.");
            return;
        }
        setEditingItem(null);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit group institute links.");
            return;
        }
        setEditingItem(item);
        setFormData({
            name: item.name || '',
            link: item.link || '',
            isActive: item.isActive !== false
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editingItem ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editingItem ? 'edit' : 'add'} group institute links.`);
            return;
        }

        if (!formData.name.trim() || !formData.link.trim()) {
            toast.error('Name and link are required');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                link: formData.link.trim()
            };

            if (editingItem) {
                await groupInstituteService.updateItem(editingItem._id, payload);
                toast.success('Group institute link updated successfully');
            } else {
                await groupInstituteService.createItem(payload);
                toast.success('Group institute link created successfully');
            }

            closeModal();
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save group institute link');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (item) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete group institute links.");
            return;
        }

        const result = await Swal.fire({
            title: 'Delete link?',
            text: 'This link will be removed from the public navbar.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#dc2626',
            confirmButtonText: 'Yes, delete it'
        });

        if (!result.isConfirmed) return;

        try {
            await groupInstituteService.deleteItem(item._id);
            toast.success('Group institute link deleted successfully');
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete group institute link');
        }
    };

    return (
        <div className="container mx-auto max-w-5xl p-4 space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Group Of Institute Manage</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage public navbar labels and external website links.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <Plus size={18} /> Add Link
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                                <th className="px-6 py-4">Label</th>
                                <th className="px-6 py-4">Website Link</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-sm text-gray-500">Loading group institute links...</td>
                                </tr>
                            ) : items.length > 0 ? (
                                items.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50/70">
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex max-w-[28rem] items-center gap-2 truncate text-primary hover:underline"
                                            >
                                                {item.link}
                                                <ExternalLink size={14} />
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {item.isActive ? 'Active' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-sm text-gray-500">No group institute links found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
                    <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingItem ? 'Edit Group Institute Link' : 'Add Group Institute Link'}
                            </h2>
                            <button onClick={closeModal} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 p-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Label Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Smart College"
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Website Link *</label>
                                <input
                                    type="url"
                                    name="link"
                                    value={formData.link}
                                    onChange={handleChange}
                                    placeholder="https://example.com"
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded text-primary"
                                />
                                <span className="text-sm font-medium text-gray-700">Show in public navbar</span>
                            </label>

                            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                >
                                    <Save size={16} />
                                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Link' : 'Save Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGroupInstitutes;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Edit, FolderPlus, Plus, Search, Tag, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import expenseCategoryService from '../../../services/expenseCategoryService';
import Loading from '../../../components/Loading';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const ExpenseCategories = () => {
    const { view, add, edit, delete: canDelete } = useUserRights('Expenses');

    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    useEffect(() => {
        fetchCategories(currentPage);
    }, [currentPage]);

    const fetchCategories = async (page) => {
        try {
            setIsLoading(true);
            const response = await expenseCategoryService.getCategories(page, limit);
            setCategories(Array.isArray(response.data) ? response.data : []);
            setCurrentPage(response.currentPage || 1);
            setTotalPages(response.totalPages || 1);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error(error.response?.data?.message || 'Failed to load expense categories');
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        if (!add) {
            showPermissionDenied("You don't have authority to add expense categories.");
            return;
        }
        setEditingCategoryId(null);
        setCategoryName('');
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit expense categories.");
            return;
        }
        setEditingCategoryId(category._id);
        setCategoryName(category.name || '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategoryId(null);
        setCategoryName('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!categoryName.trim()) {
            toast.error('Category name is required');
            return;
        }
        if (editingCategoryId ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editingCategoryId ? 'edit' : 'add'} expense categories.`);
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = { name: categoryName.trim() };
            if (editingCategoryId) {
                await expenseCategoryService.updateCategory(editingCategoryId, payload);
                toast.success('Category updated successfully');
            } else {
                await expenseCategoryService.createCategory(payload);
                toast.success('Category created successfully');
            }
            closeModal();
            fetchCategories(currentPage);
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete expense categories.");
            return;
        }

        const result = await Swal.fire({
            title: 'Delete Category?',
            text: 'This category will be permanently removed.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-lg',
                cancelButton: 'rounded-lg'
            }
        });

        if (!result.isConfirmed) return;

        try {
            await expenseCategoryService.deleteCategory(id);
            Swal.fire({
                title: 'Deleted',
                text: 'Category has been deleted.',
                icon: 'success',
                confirmButtonColor: '#2563eb'
            });
            fetchCategories(categories.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
        } catch (error) {
            console.error('Error deleting category:', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to delete category', 'error');
        }
    };

    const filteredCategories = categories.filter(category =>
        (category.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!view) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
                    <FolderPlus className="mx-auto mb-4 h-12 w-12 text-red-300" />
                    <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
                    <p className="mt-2 text-sm text-gray-500">You don't have authority to view expense categories.</p>
                </div>
            </div>
        );
    }

    if (isLoading && categories.length === 0) return <Loading />;

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link to="/transaction/expenses" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                        <ArrowLeft size={16} />
                        Back to Expenses
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Expense Categories</h1>
                    <p className="mt-1 text-gray-500">Manage categories used while recording expenses</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
                >
                    <Plus size={20} />
                    New Category
                </button>
            </div>

            <div className="mb-6 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-center">
                    <Search className="ml-2 mr-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search categories..."
                        className="w-full border-none bg-transparent py-2 text-gray-700 outline-none"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-gray-800">
                        <Tag size={18} className="text-primary" />
                        Categories
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 bg-white text-sm uppercase tracking-wider text-gray-500">
                                <th className="px-6 py-4 font-semibold">Category Name</th>
                                <th className="px-6 py-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map(category => (
                                    <tr key={category._id} className="transition-colors hover:bg-blue-50/30">
                                        <td className="px-6 py-4 font-semibold text-gray-800">{category.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(category)}
                                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category._id)}
                                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="px-6 py-12 text-center">
                                        <FolderPlus className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                        <p className="font-medium text-gray-500">No categories found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                        <span className="text-sm text-gray-500">
                            Showing page <span className="font-semibold text-gray-700">{currentPage}</span> of <span className="font-semibold text-gray-700">{totalPages}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
                            <div className="border-b border-gray-100 bg-indigo-50/50 p-5">
                                <h2 className="text-xl font-bold text-gray-900">{editingCategoryId ? 'Edit Category' : 'New Category'}</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4 p-5">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Category Name *</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        required
                                        value={categoryName}
                                        onChange={(event) => setCategoryName(event.target.value)}
                                        placeholder="e.g. Utilities"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={closeModal} className="rounded-xl px-4 py-2 font-semibold text-gray-600 transition-colors hover:bg-gray-100">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                        {isSubmitting ? 'Saving...' : (editingCategoryId ? 'Update' : 'Create')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExpenseCategories;

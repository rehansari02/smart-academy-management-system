import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, IndianRupee, Trash2, Edit, Calendar, FolderPlus, Tag, ChevronLeft, ChevronRight, Building2, Printer } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useReactToPrint } from 'react-to-print';
import expenseService from '../../../services/expenseService';
import expenseCategoryService from '../../../services/expenseCategoryService';
import Loading from '../../../components/Loading';
import { getBranches } from '../../../features/master/branchSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const todayInputDate = () => new Date().toISOString().split('T')[0];

const toDateInputValue = (value) => {
    if (!value) return todayInputDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? todayInputDate() : parsed.toISOString().split('T')[0];
};

const Expenses = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { branches } = useSelector((state) => state.branch);
    const { add, edit, delete: canDelete } = useUserRights('Expenses');
    const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';
    const userBranchId = typeof user?.branchId === 'object' ? user.branchId?._id : user?.branchId;
    const userBranchName = user?.branchDetails?.name || user?.branchName || 'My Branch';

    // State for Expenses
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    
    // Pagination State (Expenses)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // State for Categories
    const [categories, setCategories] = useState([]);
    const [allCategories, setAllCategories] = useState([]); // For Dropdown
    const [isCategoryLoading, setIsCategoryLoading] = useState(false);
    
    // Pagination State (Categories)
    const [catCurrentPage, setCatCurrentPage] = useState(1);
    const [catTotalPages, setCatTotalPages] = useState(1);
    const catLimit = 10;

    // Modal States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // Edit Modes
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    // Form States
    const [expenseData, setExpenseData] = useState({
        amount: '',
        reason: '',
        category: '',
        branch: '',
        date: todayInputDate(),
        paymentMode: 'Cash'
    });
    const [categoryName, setCategoryName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const componentRef = useRef(null);

    useEffect(() => {
        dispatch(getBranches());
        fetchAllCategoriesForDropdown();
    }, [dispatch]);

    useEffect(() => {
        fetchCategories(catCurrentPage);
    }, [catCurrentPage, branchFilter]);

    useEffect(() => {
        fetchAllCategoriesForDropdown();
    }, [branchFilter]);

    useEffect(() => {
        if (!isSuperAdmin && userBranchId) {
            setExpenseData(prev => ({ ...prev, branch: userBranchId }));
        }
    }, [isSuperAdmin, userBranchId]);

    useEffect(() => {
        if (dateFilter === 'custom') {
            // Only fetch when both dates are selected
            if (customStartDate && customEndDate) {
                fetchExpenses(currentPage);
            }
        } else {
            fetchExpenses(currentPage);
        }
    }, [currentPage, dateFilter, customStartDate, customEndDate, branchFilter]);

    // Fetch all categories for the dropdown in the Add Expense modal
    const fetchAllCategoriesForDropdown = async () => {
        try {
            const data = await expenseCategoryService.getCategories(1, 1000, true, branchFilter);
            setAllCategories(data);
            if(data.length > 0) {
                setExpenseData(prev => ({ ...prev, category: data[0]._id }));
            }
        } catch (error) {
            console.error('Error fetching all categories:', error);
        }
    };

    const fetchCategories = async (page) => {
        try {
            setIsCategoryLoading(true);
            const response = await expenseCategoryService.getCategories(page, catLimit, false, branchFilter);
            setCategories(Array.isArray(response.data) ? response.data : []);
            setCatCurrentPage(response.currentPage);
            setCatTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load expense categories');
        } finally {
            setIsCategoryLoading(false);
        }
    };

    const fetchExpenses = async (page) => {
        try {
            setIsLoading(true);
            const response = await expenseService.getExpenses(page, limit, dateFilter, customStartDate, customEndDate, branchFilter);
            setExpenses(Array.isArray(response.data) ? response.data : []);
            setCurrentPage(response.currentPage);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error(error.response?.data?.message || 'Failed to load expenses');
        } finally {
            setIsLoading(false);
        }
    };

    // --- EXPENSE HANDLERS ---
    const handleExpenseInputChange = (e) => {
        const { name, value } = e.target;
        setExpenseData(prev => ({ ...prev, [name]: value }));
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (editingExpenseId ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editingExpenseId ? 'edit' : 'add'} expenses.`);
            return;
        }
        
        if (!expenseData.amount || !expenseData.reason || !expenseData.category || !expenseData.branch || !expenseData.date) {
            return toast.error('Please fill all required fields');
        }

        try {
            setIsSubmitting(true);
            if (editingExpenseId) {
                await expenseService.updateExpense(editingExpenseId, expenseData);
                toast.success('Expense updated successfully');
            } else {
                await expenseService.createExpense(expenseData);
                toast.success('Expense recorded successfully');
            }
            closeExpenseModal();
            fetchExpenses(currentPage); 
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error(error.response?.data?.message || 'Failed to save expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditExpense = (expense) => {
        setEditingExpenseId(expense._id);
        setExpenseData({
            amount: expense.amount,
            reason: expense.reason,
            category: expense.category?._id || '',
            branch: expense.branch?._id || userBranchId || '',
            date: toDateInputValue(expense.date),
            paymentMode: expense.paymentMode
        });
        setIsExpenseModalOpen(true);
    };

    const handleDeleteExpense = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete expenses.");
            return;
        }
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await expenseService.deleteExpense(id);
                Swal.fire('Deleted!', 'Expense has been deleted.', 'success');
                fetchExpenses(safeExpenses.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
            } catch (error) {
                console.error('Error deleting expense:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete expense', 'error');
            }
        }
    };

    const closeExpenseModal = () => {
        setIsExpenseModalOpen(false);
        setEditingExpenseId(null);
        setExpenseData({
            amount: '',
            reason: '',
            category: allCategories.length > 0 ? allCategories[0]._id : '',
            branch: isSuperAdmin ? '' : (userBranchId || ''),
            date: todayInputDate(),
            paymentMode: 'Cash'
        });
    };

    // --- CATEGORY HANDLERS ---
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        if(!categoryName.trim()) return toast.error('Category name is required');
        if (editingCategoryId ? !edit : !add) {
            showPermissionDenied(`You don't have authority to ${editingCategoryId ? 'edit' : 'add'} expense categories.`);
            return;
        }

        try {
            setIsSubmitting(true);
            if (editingCategoryId) {
                await expenseCategoryService.updateCategory(editingCategoryId, { name: categoryName });
                toast.success('Category updated successfully');
            } else {
                await expenseCategoryService.createCategory({ name: categoryName });
                toast.success('Category created successfully');
            }
            closeCategoryModal();
            fetchCategories(catCurrentPage);
            fetchAllCategoriesForDropdown(); // Refresh dropdown list
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditCategory = (category) => {
        setEditingCategoryId(category._id);
        setCategoryName(category.name);
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = async (id) => {
         if (!canDelete) {
            showPermissionDenied("You don't have authority to delete expense categories.");
            return;
         }
         const result = await Swal.fire({
            title: 'Delete Category?',
            text: "Ensure no expenses are currently linked to this category.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await expenseCategoryService.deleteCategory(id);
                Swal.fire('Deleted!', 'Category has been deleted.', 'success');
                fetchCategories(categories.length === 1 && catCurrentPage > 1 ? catCurrentPage - 1 : catCurrentPage);
                fetchAllCategoriesForDropdown();
            } catch (error) {
                console.error('Error deleting category:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete category', 'error');
            }
        }
    };

    const closeCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setEditingCategoryId(null);
        setCategoryName('');
    };

    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const filteredExpenses = safeExpenses.filter(exp => 
        (exp.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const activeBranchName = isSuperAdmin
        ? (branches.find(branch => branch._id === branchFilter)?.name || 'All Branches')
        : userBranchName;
    const activeDateLabel = dateFilter
        ? dateFilter === 'custom'
            ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
            : dateFilter
        : 'All Time';
    const totalExpenseAmount = filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Expenses_${activeBranchName.replace(/\s+/g, '_')}_${activeDateLabel.replace(/\s+/g, '_')}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 12mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .expense-print-area { width: 100% !important; max-width: none !important; }
                .expense-print-card { box-shadow: none !important; border: 1px solid #d1d5db !important; border-radius: 0 !important; overflow: visible !important; }
                .expense-print-table { width: 100% !important; table-layout: fixed !important; font-size: 11px !important; }
                .expense-print-table th, .expense-print-table td { padding: 7px 8px !important; border: 1px solid #e5e7eb !important; vertical-align: top !important; }
                .expense-print-table thead tr { background: #f3f4f6 !important; color: #111827 !important; }
                .expense-print-reason { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; max-width: none !important; }
                .expense-print-category { background: transparent !important; color: #111827 !important; padding: 0 !important; }
            }
        `
    });

    if (isLoading && safeExpenses.length === 0) return <Loading />;

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Management</h1>
                    <p className="text-gray-500 mt-1">Track and manage your institutional expenses and categories</p>
                </div>
                
                <div className="flex items-center gap-3 print:hidden">
                     <button
                        onClick={handlePrint}
                        disabled={filteredExpenses.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer size={20} />
                        <span className="hidden sm:inline">Print</span>
                    </button>
                     <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 border border-indigo-200"
                    >
                        <FolderPlus size={20} />
                        <span className="hidden sm:inline">New Category</span>
                    </button>
                    <button 
                        onClick={() => {
                            setExpenseData(prev => ({
                                ...prev,
                                branch: isSuperAdmin ? (branchFilter || '') : (userBranchId || ''),
                                date: prev.date || todayInputDate()
                            }));
                            setIsExpenseModalOpen(true);
                        }}
                        className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Panel: Categories */}
                <div className="lg:w-1/4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <Tag size={18} className="text-primary"/> 
                                Categories
                            </h2>
                        </div>
                        <div className="p-3">
                            {isCategoryLoading ? (
                                <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                            ) : categories.length > 0 ? (
                                <ul className="space-y-1">
                                    {categories.map(cat => (
                                        <li key={cat._id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                                            <span className="text-sm font-medium text-gray-700 truncate mr-2">{cat.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openEditCategory(cat)}
                                                    className="text-gray-400 hover:text-blue-500 p-1"
                                                >
                                                    <Edit size={14}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat._id)}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-8 px-4">
                                    <p className="text-sm text-gray-500 mb-3">No categories found.</p>
                                    <button 
                                        onClick={() => setIsCategoryModalOpen(true)}
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        Create category
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Category Pagination Controls */}
                        {catTotalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <button 
                                    onClick={() => setCatCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={catCurrentPage === 1}
                                    className="p-1 rounded bg-white border text-gray-500 disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs text-gray-500">{catCurrentPage} / {catTotalPages}</span>
                                <button 
                                    onClick={() => setCatCurrentPage(prev => Math.min(prev + 1, catTotalPages))}
                                    disabled={catCurrentPage === catTotalPages}
                                    className="p-1 rounded bg-white border text-gray-500 disabled:opacity-50"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Expenses Table */}
                <div ref={componentRef} className="lg:w-3/4 print:w-full expense-print-area">
                    {/* Search Bar & Filter */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-6 print:hidden">
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 flex items-center w-full">
                                <Search className="text-gray-400 ml-2 mr-3" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search expenses by reason (current page)..." 
                                    className="w-full py-2 bg-transparent border-none outline-none text-gray-700"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <select 
                                    value={dateFilter}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDateFilter(val);
                                        setCurrentPage(1);
                                        if (val !== 'custom') {
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                        }
                                    }}
                                    className="w-full sm:w-48 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-700 font-medium cursor-pointer"
                                >
                                    <option value="">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="year">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-auto">
                                {isSuperAdmin ? (
                                    <select
                                        value={branchFilter}
                                        onChange={(e) => {
                                            setBranchFilter(e.target.value);
                                            setCurrentPage(1);
                                            setCatCurrentPage(1);
                                        }}
                                        className="w-full sm:w-56 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-700 font-medium cursor-pointer"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(branch => (
                                            <option key={branch._id} value={branch._id}>{branch.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 w-full sm:w-56 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 font-semibold">
                                        <Building2 size={16} className="text-primary" />
                                        <span className="truncate">{userBranchName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Custom Date Range Pickers */}
                        {dateFilter === 'custom' && (
                            <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="text-sm font-medium text-gray-500 whitespace-nowrap">From:</label>
                                    <input 
                                        type="date" 
                                        value={customStartDate}
                                        onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-700 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="text-sm font-medium text-gray-500 whitespace-nowrap">To:</label>
                                    <input 
                                        type="date" 
                                        value={customEndDate}
                                        onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-700 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden expense-print-card">
                        <div className="hidden print:block px-6 pt-6 pb-3 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Expense Report</h2>
                            <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                                <span><strong>Branch:</strong> {activeBranchName}</span>
                                <span><strong>Range:</strong> {activeDateLabel}</span>
                                <span><strong>Records:</strong> {filteredExpenses.length}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-left border-collapse expense-print-table">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-100">
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Category</th>
                                        <th className="px-6 py-4 font-semibold">Branch</th>
                                        <th className="px-6 py-4 font-semibold">Reason</th>
                                        <th className="px-6 py-4 font-semibold">Mode</th>
                                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                        <th className="px-6 py-4 font-semibold text-center print:hidden">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredExpenses.length > 0 ? (
                                        filteredExpenses.map((expense) => (
                                            <tr key={expense._id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {new Date(expense.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap print:whitespace-normal">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 expense-print-category">
                                                        {expense.category?.name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                                                    {expense.branch?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-800 font-medium max-w-xs truncate expense-print-reason">
                                                    {expense.reason}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {expense.paymentMode}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">
                                                    ₹{expense.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center print:hidden">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => openEditExpense(expense)}
                                                            className="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteExpense(expense._id)}
                                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
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
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                                <p className="text-gray-500 font-medium">No expenses found for this page.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {filteredExpenses.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                            <td colSpan="5" className="px-6 py-4 text-right text-sm font-black uppercase text-gray-700">Total</td>
                                            <td className="px-6 py-4 text-right font-black text-primary">₹{totalExpenseAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4 print:hidden"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 print:hidden">
                                <span className="text-sm text-gray-500">
                                    Showing page <span className="font-semibold text-gray-700">{currentPage}</span> of <span className="font-semibold text-gray-700">{totalPages}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Add/Edit Expense */}
            <AnimatePresence>
                {isExpenseModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeExpenseModal} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[88vh]">
                            <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{editingExpenseId ? 'Edit Expense' : 'Record Expense'}</h2>
                            </div>

                            <form onSubmit={handleExpenseSubmit} className="flex min-h-0 flex-1 flex-col">
                                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expense Date *</label>
                                    <input type="date" name="date" required value={expenseData.date} onChange={handleExpenseInputChange} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹) *</label>
                                    <input type="number" name="amount" required value={expenseData.amount} onChange={handleExpenseInputChange} placeholder="e.g. 5000" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                                  </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason *</label>
                                    <input type="text" name="reason" required value={expenseData.reason} onChange={handleExpenseInputChange} placeholder="e.g. Office Supplies" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                                        <select 
                                            name="category"
                                            required
                                            value={expenseData.category}
                                            onChange={handleExpenseInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-gray-700"
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {allCategories.map(cat => (
                                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Branch *</label>
                                        {isSuperAdmin ? (
                                            <select
                                                name="branch"
                                                required
                                                value={expenseData.branch}
                                                onChange={handleExpenseInputChange}
                                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-gray-700"
                                            >
                                                <option value="" disabled>Select Branch</option>
                                                {branches.map(branch => (
                                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <select
                                                name="branch"
                                                required
                                                disabled
                                                value={expenseData.branch || userBranchId || ''}
                                                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 outline-none font-medium text-gray-500"
                                            >
                                                <option value={userBranchId || ''}>{userBranchName}</option>
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Mode</label>
                                        <select 
                                            name="paymentMode"
                                            value={expenseData.paymentMode}
                                            onChange={handleExpenseInputChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-gray-700"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Online">Online</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                </div>

                                <div className="shrink-0 flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
                                    <button type="button" onClick={closeExpenseModal} className="px-6 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting || allCategories.length === 0} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                                        {isSubmitting ? 'Saving...' : (editingExpenseId ? 'Update Expense' : 'Save Expense')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

             {/* Modal: Add/Edit Category */}
             <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCategoryModal} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-indigo-50/50">
                                <h2 className="text-xl font-bold text-gray-900">{editingCategoryId ? 'Edit Category' : 'New Category'}</h2>
                            </div>

                            <form onSubmit={handleCategorySubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name *</label>
                                    <input type="text" autoFocus required value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} placeholder="e.g. Utilities" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={closeCategoryModal} className="px-4 py-2 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                                        {editingCategoryId ? 'Update' : 'Create'}
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

export default Expenses;

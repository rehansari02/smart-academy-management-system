import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CalendarDays, PlusCircle, Trash2, RotateCcw, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}/transaction/attendance/`;

const today = new Date().toISOString().split('T')[0];
const toDateInputValue = (value) => value ? new Date(value).toISOString().split('T')[0] : today;

const ManageAttendance = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        type: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [formData, setFormData] = useState({
        title: '',
        type: 'Holiday',
        startDate: today,
        endDate: today,
        remarks: '',
        isActive: true
    });

    const fetchItems = async (params = filters, page = pagination.page) => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(API_URL + 'manage', {
                params: { ...params, page, limit: pagination.limit },
                withCredentials: true
            });

            if (Array.isArray(data)) {
                setItems(data);
                setPagination(prev => ({ ...prev, page: 1, total: data.length, totalPages: 1 }));
                return;
            }

            setItems(data.items || []);
            setPagination(data.pagination || { page, limit: pagination.limit, total: 0, totalPages: 1 });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load attendance calendar');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchItems(filters, 1);
        }, 250);

        return () => clearTimeout(timer);
    }, [filters.fromDate, filters.toDate, filters.type]);

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: '',
            type: 'Holiday',
            startDate: today,
            endDate: today,
            remarks: '',
            isActive: true
        });
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'Holiday':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'Vacation':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Please enter title');
            return;
        }

        try {
            const payload = {
                ...formData,
                endDate: formData.endDate || formData.startDate
            };
            const request = editingId
                ? axios.put(API_URL + `manage/${editingId}`, payload, { withCredentials: true })
                : axios.post(API_URL + 'manage', payload, { withCredentials: true });
            const { data } = await request;
            toast.success(data.message || 'Saved');
            resetForm();
            fetchItems(filters, editingId ? pagination.page : 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this attendance calendar entry?')) return;

        try {
            const { data } = await axios.delete(API_URL + `manage/${id}`, { withCredentials: true });
            toast.success(data.message || 'Deleted');
            const nextPage = items.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
            fetchItems(filters, nextPage);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    const handleEdit = (item) => {
        setEditingId(item._id);
        setFormData({
            title: item.title || '',
            type: item.type || 'Holiday',
            startDate: toDateInputValue(item.startDate),
            endDate: toDateInputValue(item.endDate || item.startDate),
            remarks: item.remarks || '',
            isActive: item.isActive !== false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';
    const goToPage = (page) => {
        const nextPage = Math.min(Math.max(page, 1), pagination.totalPages || 1);
        fetchItems(filters, nextPage);
    };

    return (
        <div className="container mx-auto p-6 min-h-screen">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarDays className="text-primary" /> Manage Attendance
                    </h2>
                    <p className="text-sm text-gray-500">Manage holidays and vacation dates for attendance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {editingId ? <Pencil size={18} /> : <PlusCircle size={18} />}
                        {editingId ? 'Edit Closed Date' : 'Add Closed Date'}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value="Holiday">Holiday</option>
                                <option value="Vacation">Vacation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Diwali holiday, Summer vacation..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: formData.type !== 'Vacation' ? e.target.value : formData.endDate })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2"
                                rows="2"
                                placeholder="Optional note"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            Active
                        </label>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            {editingId ? 'Update' : 'Save'}
                        </button>
                        <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2">
                            <RotateCcw size={16} /> {editingId ? 'Cancel' : 'Reset'}
                        </button>
                    </div>
                </form>

                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
                            <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                            <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="border rounded px-3 py-2 text-sm">
                                <option value="">All</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Vacation">Vacation</option>
                            </select>
                        </div>
                        <button onClick={() => fetchItems(filters, 1)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            Search
                        </button>
                        <button
                            onClick={() => {
                                const next = { fromDate: '', toDate: '', type: '' };
                                setFilters(next);
                            }}
                            className="bg-gray-400 text-white px-4 py-2 rounded text-sm hover:bg-gray-500"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.length > 0 ? items.map((item, index) => (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-500">
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded border px-2 py-1 text-xs font-semibold ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-800">{item.title}</div>
                                            {item.remarks && <div className="text-xs text-gray-500">{item.remarks}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatDate(item.startDate)}{new Date(item.startDate).toDateString() !== new Date(item.endDate).toDateString() ? ` - ${formatDate(item.endDate)}` : ''}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {item.isActive ? <span className="text-green-600 font-semibold">Active</span> : <span className="text-gray-400">Inactive</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                <Pencil size={17} />
                                            </button>
                                            <button onClick={() => handleDelete(item._id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete">
                                                <Trash2 size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                            {isLoading ? 'Loading...' : 'No closed dates found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-4 py-3 text-sm">
                        <div className="text-gray-600">
                            Page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span>
                            <span className="ml-2 text-gray-400">({pagination.total} records, limit {pagination.limit})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToPage(pagination.page - 1)}
                                disabled={isLoading || pagination.page <= 1}
                                className="flex items-center gap-1 rounded border bg-white px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => goToPage(pagination.page + 1)}
                                disabled={isLoading || pagination.page >= pagination.totalPages}
                                className="flex items-center gap-1 rounded border bg-white px-3 py-1.5 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageAttendance;

import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/transaction/expenses`;

const expenseService = {
    // Create new expense
    createExpense: async (expenseData) => {
        const response = await axios.post(API_URL, expenseData, {
            withCredentials: true
        });
        return response.data;
    },

    // Get all expenses with pagination
    getExpenses: async (page = 1, limit = 10, dateFilter = '', customStartDate = '', customEndDate = '', branchId = '', categoryId = '', all = false) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
        });

        if (all) params.set('all', 'true');
        if (dateFilter) params.set('dateFilter', dateFilter);
        if (dateFilter === 'custom' && customStartDate) params.set('startDate', customStartDate);
        if (dateFilter === 'custom' && customEndDate) params.set('endDate', customEndDate);
        if (branchId) params.set('branchId', branchId);
        if (categoryId) params.set('categoryId', categoryId);

        const response = await axios.get(`${API_URL}?${params.toString()}`, { withCredentials: true });
        return response.data;
    },

    // Update expense
    updateExpense: async (id, expenseData) => {
        const response = await axios.put(`${API_URL}/${id}`, expenseData, {
            withCredentials: true
        });
        return response.data;
    },

    // Delete expense
    deleteExpense: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    }
};

export default expenseService;

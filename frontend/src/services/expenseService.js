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
    getExpenses: async (page = 1, limit = 10, dateFilter = '', customStartDate = '', customEndDate = '', branchId = '') => {
        let url = `${API_URL}?page=${page}&limit=${limit}`;
        if (dateFilter) {
            url += `&dateFilter=${dateFilter}`;
        }
        if (dateFilter === 'custom' && customStartDate) {
            url += `&startDate=${customStartDate}`;
        }
        if (dateFilter === 'custom' && customEndDate) {
            url += `&endDate=${customEndDate}`;
        }
        if (branchId) {
            url += `&branchId=${branchId}`;
        }
        const response = await axios.get(url, { withCredentials: true });
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

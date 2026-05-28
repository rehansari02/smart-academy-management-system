import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/transaction/expense-categories`;

const expenseCategoryService = {
    // Create new category
    createCategory: async (categoryData) => {
        const response = await axios.post(API_URL, categoryData, {
            withCredentials: true
        });
        return response.data;
    },

    // Get categories with optional pagination
    getCategories: async (page = 1, limit = 10, all = false, branchId = '') => {
        const params = new URLSearchParams();
        if (all) {
            params.append('all', 'true');
        } else {
            params.append('page', page);
            params.append('limit', limit);
        }
        if (branchId) params.append('branchId', branchId);
        const url = `${API_URL}?${params.toString()}`;
        const response = await axios.get(url, { withCredentials: true });
        return response.data;
    },

    // Update category
    updateCategory: async (id, categoryData) => {
        const response = await axios.put(`${API_URL}/${id}`, categoryData, {
            withCredentials: true
        });
        return response.data;
    },

    // Delete category
    deleteCategory: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    }
};

export default expenseCategoryService;

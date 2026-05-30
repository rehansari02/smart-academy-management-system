import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/team`;

const teamService = {
    // Create new team member
    createTeamMember: async (formData) => {
        const response = await axios.post(API_URL, formData, {
            withCredentials: true
        });
        return response.data;
    },

    // Get all team members (Admin)
    getAllTeamMembers: async () => {
        const response = await axios.get(API_URL, { withCredentials: true });
        return response.data;
    },

    // Get public team members (optionally by branch)
    getPublicTeamMembers: async (branchId = '') => {
        const params = branchId ? `?branch=${branchId}` : '';
        const response = await axios.get(`${API_URL}/public${params}`);
        return response.data;
    },

    // Update team member
    updateTeamMember: async (id, formData) => {
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            withCredentials: true
        });
        return response.data;
    },

    // Delete team member
    deleteTeamMember: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    },

    // Update sort order (batch)
    updateSortOrder: async (members) => {
        const response = await axios.put(`${API_URL}/sort-order`, { members }, { withCredentials: true });
        return response.data;
    }
};

export default teamService;

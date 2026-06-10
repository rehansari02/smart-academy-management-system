import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/group-institutes`;

const groupInstituteService = {
    getPublicItems: async () => {
        const res = await axios.get(`${API_URL}/public`);
        return res.data;
    },
    getAllItems: async () => {
        const res = await axios.get(API_URL, { withCredentials: true });
        return res.data;
    },
    createItem: async (payload) => {
        const res = await axios.post(API_URL, payload, { withCredentials: true });
        return res.data;
    },
    updateItem: async (id, payload) => {
        const res = await axios.put(`${API_URL}/${id}`, payload, { withCredentials: true });
        return res.data;
    },
    deleteItem: async (id) => {
        const res = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return res.data;
    }
};

export default groupInstituteService;

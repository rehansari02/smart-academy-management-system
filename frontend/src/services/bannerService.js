import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/banners`;

const bannerService = {
    // Create new banner
    createBanner: async (formData) => {
        const response = await axios.post(API_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
        });
        return response.data;
    },

    // Get all banners (Admin)
    getAllBanners: async () => {
        const response = await axios.get(API_URL, { withCredentials: true });
        return response.data;
    },

    // Get public banners (Homepage)
    getPublicBanners: async () => {
        const response = await axios.get(`${API_URL}/public`);
        return response.data;
    },

    // Update banner
    updateBanner: async (id, formData) => {
        const response = await axios.put(`${API_URL}/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
        });
        return response.data;
    },

    // Delete banner
    deleteBanner: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    }
};

export default bannerService;

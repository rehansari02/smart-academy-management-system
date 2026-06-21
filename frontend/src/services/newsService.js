import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/news';
const API_URL = `${import.meta.env.VITE_API_URL}/news`;

// for production use uncomment below one line
// const API_URL = '/api/news';

const createNews = async (newsData) => {
    const response = await axios.post(API_URL, newsData, {
        headers: newsData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        withCredentials: true
    });
    return response.data;
};

const getAllNews = async (filters) => {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(`${API_URL}?${params}`, { withCredentials: true });
    return response.data;
};

const updateNews = async (id, newsData) => {
    const response = await axios.put(`${API_URL}/${id}`, newsData, {
        headers: newsData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        withCredentials: true
    });
    return response.data;
};

const deleteNews = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
    return response.data;
};

// Public fetch for homepage (if different endpoint usage is preferred later, currently same controller)
const getPublicNews = async (filters = {}) => {
    const params = new URLSearchParams({
        isActive: 'true',
        limit: '12',
        ...filters
    }).toString();
    const response = await axios.get(`${API_URL}/public?${params}`); 
    return response.data;
};

const newsService = {
    createNews,
    getAllNews,
    updateNews,
    deleteNews,
    getPublicNews
};

export default newsService;

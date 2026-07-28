import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/awards`;

const createAward = async (awardData) => {
    const response = await axios.post(API_URL, awardData, {
        headers: awardData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        withCredentials: true
    });
    return response.data;
};

const getAllAwards = async (filters) => {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(`${API_URL}?${params}`, { withCredentials: true });
    return response.data;
};

const updateAward = async (id, awardData) => {
    const response = await axios.put(`${API_URL}/${id}`, awardData, {
        headers: awardData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        withCredentials: true
    });
    return response.data;
};

const deleteAward = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
    return response.data;
};

const getPublicAwards = async (filters = {}) => {
    const params = new URLSearchParams({
        isActive: 'true',
        ...filters
    }).toString();
    const response = await axios.get(`${API_URL}/public?${params}`); 
    return response.data;
};

const awardService = {
    createAward,
    getAllAwards,
    updateAward,
    deleteAward,
    getPublicAwards
};

export default awardService;

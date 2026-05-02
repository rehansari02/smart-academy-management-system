import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/topper-results`;

const createTopper = async (formData) => {
    const response = await axios.post(API_URL, formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const getAllToppers = async () => {
    const response = await axios.get(`${API_URL}?t=${new Date().getTime()}`, { withCredentials: true });
    return response.data;
};

const getPublicToppers = async () => {
    const response = await axios.get(`${API_URL}/public?t=${new Date().getTime()}`);
    return response.data;
};

const updateTopper = async (id, formData) => {
    const response = await axios.put(`${API_URL}/${id}`, formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const deleteTopper = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
    return response.data;
};

const topperService = {
    createTopper,
    getAllToppers,
    getPublicToppers,
    updateTopper,
    deleteTopper
};

export default topperService;

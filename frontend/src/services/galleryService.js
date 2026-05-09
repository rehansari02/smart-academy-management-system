import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/galleries`;

const getGalleries = async () => {
    const res = await axios.get(API_URL, { withCredentials: true });
    return res.data;
};

const getPublicGalleries = async () => {
    const res = await axios.get(`${API_URL}/public`);
    return res.data;
};

const getGalleryById = async (id) => {
    const res = await axios.get(`${API_URL}/${id}`);
    return res.data;
};

const createGallery = async (formData) => {
    const res = await axios.post(API_URL, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

const addImages = async (id, formData) => {
    const res = await axios.post(`${API_URL}/${id}/images`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

const updateGallery = async (id, data) => {
    const res = await axios.put(`${API_URL}/${id}`, data, { withCredentials: true });
    return res.data;
};

const deleteImage = async (galleryId, imageUrl) => {
    const res = await axios.delete(`${API_URL}/${galleryId}/images`, {
        withCredentials: true,
        data: { imageUrl }
    });
    return res.data;
};

const deleteGallery = async (id) => {
    const res = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
    return res.data;
};

const galleryService = {
    getGalleries, getPublicGalleries, getGalleryById,
    createGallery, addImages, updateGallery,
    deleteImage, deleteGallery
};

export default galleryService;

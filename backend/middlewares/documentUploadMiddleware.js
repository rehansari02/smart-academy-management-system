const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const documentStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
        const isDocument = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext);
        return {
            folder: 'materials_uploads',
            allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'webp'],
            resource_type: isDocument ? 'raw' : 'image',
        };
    },
});

const documentUpload = multer({
    storage: documentStorage,
    limits: { fileSize: 1024 * 1024 * 50 }, // 50MB limit
});

module.exports = documentUpload;

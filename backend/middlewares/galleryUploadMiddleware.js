const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage Config for Gallery - high quality, no compression
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "gallery_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // No transformation = original quality
  },
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 1024 * 1024 * 15 }, // 15MB per file
});

module.exports = galleryUpload;

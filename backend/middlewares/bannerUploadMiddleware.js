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

// Storage Config for Banners without compression
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banner_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // Intentionally omitting 'transformation' to retain original quality and size
  },
});

const bannerUpload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 15 }, // 15MB limit for high quality banners
});

module.exports = bannerUpload;

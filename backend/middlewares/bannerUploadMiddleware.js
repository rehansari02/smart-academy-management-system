const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");

dotenv.config();

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "banner_uploads",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });
} else {
  const uploadDirectory = path.join(__dirname, "..", "uploads", "banner_uploads");
  fs.mkdirSync(uploadDirectory, { recursive: true });

  storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase() || ".png";
      callback(null, `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  });
}

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const bannerUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 15 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG and WEBP images are allowed"));
      return;
    }
    callback(null, true);
  },
});

module.exports = bannerUpload;

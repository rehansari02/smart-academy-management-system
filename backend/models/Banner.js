const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, trim: true, default: '' },
    image: { type: String, required: true }, // Cloudinary URL
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);

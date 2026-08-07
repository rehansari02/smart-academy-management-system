const mongoose = require('mongoose');

if (mongoose.models && mongoose.models.Banner) {
    delete mongoose.models.Banner;
}

const bannerSchema = new mongoose.Schema({
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    testimonialQuote: { type: String, trim: true, default: '' },
    image: { type: String, required: true }, // Cloudinary URL
    linkUrl: { type: String, trim: true, default: '' },
    linkLabel: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Banner', bannerSchema);

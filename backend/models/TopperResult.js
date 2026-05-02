const mongoose = require('mongoose');

const topperResultSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    image: { type: String, default: '' }, // Cloudinary URL
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('TopperResult', topperResultSchema);

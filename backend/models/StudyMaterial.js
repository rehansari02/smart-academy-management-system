const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String }, // 'More' details
    link: { type: String, required: true }, // Download/View link (Cloudinary URL or other)
    isFree: { type: Boolean, default: true },
    uploadDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);

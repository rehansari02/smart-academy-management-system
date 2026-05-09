const mongoose = require('mongoose');

// Each gallery entry = one event/album with a title, description, category, and photos
const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide an event/album title'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        required: [true, 'Please provide a category'],
        trim: true
    },
    images: [{ type: String }], // Array of image URLs only
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);

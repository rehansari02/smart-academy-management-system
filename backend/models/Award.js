const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String }, // Content or details
    image: { type: String, default: '' }, // Image URL from upload
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Award', awardSchema);

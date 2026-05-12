const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    email:       { type: String, trim: true, default: '' },
    phone:       { type: String, trim: true, default: '' },
    category:    { type: String, required: true, default: 'general' },
    rating:      { type: Number, min: 1, max: 5, default: 5 },
    message:     { type: String, required: true, trim: true },
    suggestions: { type: String, trim: true, default: '' },
    status:      { type: String, enum: ['New', 'Read', 'Resolved'], default: 'New' },
    adminNote:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);

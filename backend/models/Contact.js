const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    branch: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['New', 'Read', 'Resolved'], default: 'New' }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);

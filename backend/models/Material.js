const mongoose = require('mongoose');

const materialSchema = mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Public', 'Student only', 'Student and Faculty only', 'Faculty only'],
        required: true,
        default: 'Student only'
    },
    document: {
        type: String, // Path to the uploaded file
    },
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Material', materialSchema);

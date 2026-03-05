const mongoose = require('mongoose');

const courseFeedbackSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String },
    courseName: { type: String, required: true },
    title: { type: String, required: true },
    email: { type: String },
    mobile: { type: String },
    feedback: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false } // For admin to mark as read
}, { timestamps: true });

module.exports = mongoose.model('CourseFeedback', courseFeedbackSchema);

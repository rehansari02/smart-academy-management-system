const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
    course: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true 
    },
    examName: { type: String, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    timeTable: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        date: { type: Date },
        startTime: { type: String },
        endTime: { type: String },
        theory: { type: Number, default: 0 },
        practical: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    }],
    remarks: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
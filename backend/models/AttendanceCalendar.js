const mongoose = require('mongoose');

const attendanceCalendarSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['Holiday', 'Sunday', 'Vacation'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    remarks: { type: String, trim: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceCalendarSchema.index({ startDate: 1, endDate: 1, type: 1, branch: 1 });

module.exports = mongoose.model('AttendanceCalendar', attendanceCalendarSchema);

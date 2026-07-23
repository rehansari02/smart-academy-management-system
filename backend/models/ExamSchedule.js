const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
    course: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true 
    },
    examName: { type: String, required: true },
    examiner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    alternateExaminer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    branchExaminers: [{
        examDate: { type: String },
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
        branchName: { type: String },
        examiner: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        alternateExaminer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        conductPasswordEnabled: { type: Boolean, default: false },
        conductPasswordText: { type: String, default: '' },
        conductPasswordHash: { type: String, default: '' }
    }],
    attendance: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
        examDate: { type: String },
        status: { type: String, enum: ['Present', 'Absent'], default: 'Present' },
        updatedAt: { type: Date, default: Date.now }
    }],
    conductPasswordEnabled: { type: Boolean, default: false },
    conductPasswordText: { type: String, default: '' },
    conductPasswordHash: { type: String, default: '' },
    scheduleType: {
        type: String,
        enum: ['regular', 'reExam'],
        default: 'regular'
    },
    isReExam: { type: Boolean, default: false },
    reExamOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSchedule'
    },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    timeTable: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        date: { type: Date },
        startTime: { type: String },
        endTime: { type: String },
        theory: { type: Number, default: 0 },
        practical: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        conductPasswordEnabled: { type: Boolean, default: false },
        conductPasswordText: { type: String, default: '' },
        conductPasswordHash: { type: String, default: '' }
    }],
    remarks: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);

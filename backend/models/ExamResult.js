const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student', 
        required: true 
    },
    exam: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ExamSchedule', 
        required: true 
    },
    course: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true 
    },
    batch: { type: String, required: true }, // Stored as string in Student model
    
    // Result Specifics
    somNumber: { type: String, unique: true },
    csrNumber: { type: String, unique: true },
    subjectMarks: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        theory: { type: Number, default: 0 },
        practical: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    }],
    marksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    grade: { type: String },
    
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
const mongoose = require('mongoose');

const examAnswerSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mcq', 'qa'],
        required: true
    },
    questionIndex: { type: Number, required: true },
    selectedOption: { type: String, default: '' },
    answerText: { type: String, default: '' },
    marks: { type: Number, default: 0 },
    savedAt: { type: Date, default: Date.now }
}, { _id: false });

const assignedMcqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String },
    marks: { type: Number, default: 1 }
}, { _id: false });

const assignedQaSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String },
    marks: { type: Number, default: 1 }
}, { _id: false });

const examAttemptSchema = new mongoose.Schema({
    schedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSchedule',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    examName: { type: String, required: true },
    answers: { type: [examAnswerSchema], default: [] },
    assignedMcqs: { type: [assignedMcqSchema], default: [] },
    assignedQuestionAnswers: { type: [assignedQaSchema], default: [] },
    totalMcq: { type: Number, default: 0 },
    totalQa: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    answeredCount: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: false },
    startedAt: { type: Date },
    lastSavedAt: { type: Date },
    submittedAt: { type: Date },
    expiresAt: { type: Date },
    passwordVerifiedAt: { type: Date }
}, { timestamps: true });

examAttemptSchema.index({ schedule: 1, subject: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

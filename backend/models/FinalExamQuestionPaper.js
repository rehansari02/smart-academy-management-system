const mongoose = require('mongoose');

const mcqQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String },
    marks: { type: Number, default: 1 }
}, { _id: true });

const answerQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String },
    marks: { type: Number, default: 1 }
}, { _id: true });

const subjectPaperSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    duration: { type: String },
    mcqs: { type: [mcqQuestionSchema], default: [] },
    questionAnswers: { type: [answerQuestionSchema], default: [] }
}, { _id: false });

const finalExamQuestionPaperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    examName: { type: String, default: 'Final Exam' },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    subjects: { type: [subjectPaperSchema], default: [] },
    remarks: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('FinalExamQuestionPaper', finalExamQuestionPaperSchema);

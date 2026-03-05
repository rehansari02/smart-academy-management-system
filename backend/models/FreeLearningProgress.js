const mongoose = require('mongoose');

const freeLearningProgressSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    questions: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreeLearning' },
        selectedOption: { type: Number },
        isCorrect: { type: Boolean }
    }],
    totalScore: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('FreeLearningProgress', freeLearningProgressSchema);

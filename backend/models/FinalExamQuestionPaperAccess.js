const mongoose = require('mongoose');

const finalExamQuestionPaperAccessSchema = new mongoose.Schema({
    key: {
        type: String,
        default: 'final-exam-question-paper',
        unique: true
    },
    passwordText: {
        type: String,
        default: ''
    },
    passwordHash: {
        type: String,
        default: ''
    },
    isEnabled: {
        type: Boolean,
        default: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FinalExamQuestionPaperAccess', finalExamQuestionPaperAccessSchema);

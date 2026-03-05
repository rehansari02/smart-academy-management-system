const mongoose = require('mongoose');

const freeLearningSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }], // Array of options i.e. ["Option 1", "Option 2", "Option 3", "Option 4"]
    correctOption: { type: Number, required: true }, // Index of correct option (0-3)
    explanation: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Reference to Admin/User who created it
}, { timestamps: true });
module.exports = mongoose.model('FreeLearning', freeLearningSchema);

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    blogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userPhoto: {
        type: String
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    isApproved: {
        type: Boolean,
        default: true // Auto-approve for now, can be changed to false for moderation
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema);

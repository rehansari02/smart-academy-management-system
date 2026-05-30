const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a team member name'],
        trim: true
    },
    image: {
        type: String,
        default: ''
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: [true, 'Please select a branch']
    },
    profession: {
        type: String,
        required: [true, 'Please add a profession'],
        trim: true
    },
    experience: {
        type: String,
        required: [true, 'Please add experience'],
        trim: true
    },
    subjects: [{
        type: String,
        trim: true
    }],
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);

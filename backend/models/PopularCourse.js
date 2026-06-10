const mongoose = require('mongoose');

const popularCourseSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PopularCategory',
        required: [true, 'Category is required']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required']
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isHidden: {
        type: Boolean,
        default: false // Controls visibility on public homepage
    }
}, { timestamps: true });

module.exports = mongoose.model('PopularCourse', popularCourseSchema);

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g. "Programming in C"
    printedName: { type: String, required: true }, // Name on Certificate
    
    // --- Duration ---
    duration: { type: Number, required: true },
    durationType: { type: String, enum: ['Month', 'Year', 'Days'], default: 'Month' },

    // --- Marks Configuration ---
    totalMarks: { type: Number, required: true },
    theoryMarks: { type: Number, default: 0 },
    practicalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, required: true },

    // --- Details ---
    topicName: { type: String }, // Specific topic focus
    description: { type: String },
    
    // --- Syllabus Details ---
    daysToComplete: { type: Number, default: 0 },
    totalPages: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    projects: [{
        name: { type: String, required: true },
        chapterId: { type: mongoose.Schema.Types.ObjectId }
    }],
    chaptersCount: { type: Number, default: 0 },
    chapters: [{
        name: { type: String, required: true },
        startPage: { type: Number, default: 0 },
        endPage: { type: Number, default: 0 }
    }],

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// --- Self-Healing Hooks for Legacy String Data ---

subjectSchema.pre('validate', function(next) {
    if (this.chapters && this.chapters.length > 0) {
        this.chapters = this.chapters.map(c => {
            if (typeof c === 'string') {
                return { name: c, startPage: 0, endPage: 0 };
            }
            return c;
        });
    }
    if (this.projects && this.projects.length > 0) {
        this.projects = this.projects.map(p => {
            if (typeof p === 'string') {
                return { name: p, chapterId: null };
            }
            return p;
        });
    }
    next();
});

subjectSchema.post('init', function(doc) {
    if (doc.chapters && doc.chapters.length > 0) {
        doc.chapters = doc.chapters.map(c => {
            if (typeof c === 'string') {
                return { name: c, startPage: 0, endPage: 0 };
            }
            return c;
        });
    }
    if (doc.projects && doc.projects.length > 0) {
        doc.projects = doc.projects.map(p => {
            if (typeof p === 'string') {
                return { name: p, chapterId: null };
            }
            return p;
        });
    }
});

module.exports = mongoose.model('Subject', subjectSchema);
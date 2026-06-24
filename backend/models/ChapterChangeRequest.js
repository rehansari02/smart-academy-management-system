const mongoose = require('mongoose');

/**
 * ChapterChangeRequest – tracks requests to modify finalized chapters.
 * When a teacher clicks "Final Complete" on a chapter, a request is created.
 * Super Admin must approve/reject before changes can be made again.
 */
const chapterChangeRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    chapterName: {
      type: String,
      default: '',
    },

    // What type of change is being requested?
    type: {
      type: String,
      enum: ['final_complete', 'modification'],
      default: 'final_complete',
    },

    // Reason provided by the teacher
    reason: {
      type: String,
      default: '',
    },

    // Requestor info
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    requestedByName: {
      type: String,
      default: '',
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // Reviewer info
    reviewedBy: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

chapterChangeRequestSchema.index({ status: 1, createdAt: -1 });
chapterChangeRequestSchema.index({ studentId: 1, subjectId: 1, chapterId: 1 });

module.exports = mongoose.model('ChapterChangeRequest', chapterChangeRequestSchema);

const mongoose = require('mongoose');

const studentSyllabusResponseSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['project', 'theory', 'chapter', 'comment'],
      required: true,
    },
    understood: {
      type: Boolean,
      default: false,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    comments: [
      {
        comment: {
          type: String,
          required: true,
          trim: true,
        },
        commentedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

studentSyllabusResponseSchema.index(
  { studentId: 1, subjectId: 1, chapterId: 1, projectId: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model('StudentSyllabusResponse', studentSyllabusResponseSchema);

const mongoose = require('mongoose');

/**
 * SyllabusLog – one document per log entry recorded by a teacher.
 *
 * Every time a teacher sits down and teaches, they add one entry here.
 * The entry captures:
 *   - which student it applies to
 *   - which subject was covered
 *   - which chapter was covered
 *   - which projects were done that session
 *   - the date of the session
 *   - who logged it (teacher / employee)
 *
 * Analytics (days elapsed, chapter completion %, projects pending)
 * are computed at query time in the controller so that no derived
 * data is ever stale.
 */

const syllabusLogSchema = new mongoose.Schema(
  {
    // ── Core References ────────────────────────────────────────────
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
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
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
      index: true,
    },

    // ── Session Details ───────────────────────────────────────────
    /** Date the teaching session took place */
    sessionDate: {
      type: Date,
      required: true,
    },

    /**
     * The chapter taught in this session.
     * We store _id + name snapshot so even if the Subject document
     * is later edited the log remains meaningful.
     */
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    chapterName: {
      type: String,
      default: '',
    },

    /**
     * Projects completed in this session.
     * Each entry stores both the project _id (from the Subject's projects array)
     * and a snapshot of the name.
     */
    projects: [
      {
        projectId: { type: mongoose.Schema.Types.ObjectId, default: null },
        projectName: { type: String, default: '' },
      },
    ],

    /** Free-text notes the teacher can optionally add */
    notes: {
      type: String,
      default: '',
    },

    // ── Teacher / Employee who logged this entry ──────────────────
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    loggedByName: {
      type: String,
      default: '',
    },

    chapterStatus: {
      type: String,
      enum: ['Running', 'Completed', 'Stopped'],
      default: undefined,
    },

    // ── Soft-delete ───────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for the most common query pattern
syllabusLogSchema.index({ studentId: 1, subjectId: 1, isDeleted: 1 });
syllabusLogSchema.index({ subjectId: 1, batchId: 1, isDeleted: 1 });

module.exports = mongoose.model('SyllabusLog', syllabusLogSchema);

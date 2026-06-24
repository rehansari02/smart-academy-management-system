const mongoose = require('mongoose');

const teacherSubjectAccessSchema = new mongoose.Schema({
    // Teacher (Employee)
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    // Assignments: Batch + Course + Subject combinations
    assignments: [
        {
            batchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Batch',   required: true },
            courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }
        }
    ]

}, { timestamps: true });

// One document per employee
teacherSubjectAccessSchema.index({ employeeId: 1 }, { unique: true });

module.exports = mongoose.model('TeacherSubjectAccess', teacherSubjectAccessSchema);

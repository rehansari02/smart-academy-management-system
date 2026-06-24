const asyncHandler = require('express-async-handler');
const TeacherSubjectAccess = require('../models/TeacherSubjectAccess');
const Employee = require('../models/Employee');

/**
 * GET /master/teacher-subject/subject/:subjectId
 * Returns ALL teachers assigned to a specific subject (across any batch/course).
 * Used by the Manage Teacher modal to show current assignments for a subject.
 */
const getTeachersBySubject = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    const records = await TeacherSubjectAccess.find({
        'assignments.subjectId': subjectId
    }).populate('employeeId', 'name type isActive photo');

    // Flatten: for each record find assignments matching this subjectId
    const result = records
        .filter(r => r.employeeId && r.employeeId.isActive)
        .map(r => {
            const matchingAssignments = r.assignments.filter(
                a => String(a.subjectId) === String(subjectId)
            );
            return {
                employeeId: r.employeeId._id,
                employeeName: r.employeeId.name,
                employeeType: r.employeeId.type,
                photo: r.employeeId.photo,
                assignments: matchingAssignments
            };
        });

    res.status(200).json(result);
});

/**
 * GET /master/teacher-subject/employee/:employeeId
 * Returns all assignments for a specific teacher.
 */
const getTeacherSubjectAccess = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    let empId = employeeId;
    if (!empId || empId === 'me') {
        const employee = await Employee.findOne({ userAccount: req.user._id });
        if (!employee) {
            return res.status(200).json({ employeeId: null, assignments: [] });
        }
        empId = employee._id;
    }

    const record = await TeacherSubjectAccess.findOne({ employeeId: empId })
        .populate('assignments.batchId', 'name branchId')
        .populate('assignments.courseId', 'name')
        .populate('assignments.subjectId', 'name');

    res.status(200).json(record || { employeeId: empId, assignments: [] });
});

/**
 * POST /master/teacher-subject/assign
 * Add one batch+course+subject assignment to a teacher.
 * Body: { employeeId, batchId, courseId, subjectId }
 */
const assignTeacherToSubject = asyncHandler(async (req, res) => {
    const { employeeId, batchId, courseId, subjectId } = req.body;

    if (!employeeId || !batchId || !courseId || !subjectId) {
        res.status(400);
        throw new Error('employeeId, batchId, courseId, and subjectId are all required.');
    }

    // Validate employee exists and is active
    const employee = await Employee.findById(employeeId);
    if (!employee || !employee.isActive) {
        res.status(404);
        throw new Error('Active employee not found.');
    }

    // Upsert: find the teacher's document, push assignment if not already present
    let record = await TeacherSubjectAccess.findOne({ employeeId });

    if (!record) {
        record = await TeacherSubjectAccess.create({
            employeeId,
            assignments: [{ batchId, courseId, subjectId }]
        });
    } else {
        // Check duplicate
        const alreadyExists = record.assignments.some(
            a =>
                String(a.batchId)   === String(batchId)   &&
                String(a.courseId)  === String(courseId)  &&
                String(a.subjectId) === String(subjectId)
        );
        if (alreadyExists) {
            return res.status(200).json({ message: 'Assignment already exists.', record });
        }
        record.assignments.push({ batchId, courseId, subjectId });
        await record.save();
    }

    // Re-populate for clean response
    const populated = await TeacherSubjectAccess.findById(record._id)
        .populate('employeeId', 'name type')
        .populate('assignments.batchId', 'name')
        .populate('assignments.courseId', 'name')
        .populate('assignments.subjectId', 'name');

    res.status(201).json({ message: 'Teacher assigned successfully.', record: populated });
});

/**
 * DELETE /master/teacher-subject/remove
 * Remove one assignment from a teacher.
 * Body: { employeeId, batchId, courseId, subjectId }
 */
const removeTeacherAssignment = asyncHandler(async (req, res) => {
    const { employeeId, batchId, courseId, subjectId } = req.body;

    if (!employeeId || !batchId || !courseId || !subjectId) {
        res.status(400);
        throw new Error('employeeId, batchId, courseId, and subjectId are all required.');
    }

    const record = await TeacherSubjectAccess.findOne({ employeeId });
    if (!record) {
        res.status(404);
        throw new Error('No assignments found for this teacher.');
    }

    record.assignments = record.assignments.filter(
        a =>
            !(
                String(a.batchId)   === String(batchId)   &&
                String(a.courseId)  === String(courseId)  &&
                String(a.subjectId) === String(subjectId)
            )
    );

    await record.save();

    res.status(200).json({ message: 'Assignment removed successfully.' });
});

/**
 * GET /master/teacher-subject/batch/:batchId/course/:courseId
 * Returns all teachers assigned to any subject in this batch and course.
 */
const getAssignmentsByBatchAndCourse = asyncHandler(async (req, res) => {
    const { batchId, courseId } = req.params;

    const records = await TeacherSubjectAccess.find({
        'assignments.batchId': batchId,
        'assignments.courseId': courseId
    }).populate('employeeId', 'name type isActive photo');

    // Flatten to list of: { employeeName, employeeId, subjectId }
    const result = [];
    records.forEach(r => {
        if (r.employeeId && r.employeeId.isActive) {
            r.assignments.forEach(a => {
                if (String(a.batchId) === String(batchId) && String(a.courseId) === String(courseId)) {
                    result.push({
                        employeeId: r.employeeId._id,
                        employeeName: r.employeeId.name,
                        subjectId: a.subjectId
                    });
                }
            });
        }
    });

    res.status(200).json(result);
});

module.exports = {
    getTeachersBySubject,
    getTeacherSubjectAccess,
    assignTeacherToSubject,
    removeTeacherAssignment,
    getAssignmentsByBatchAndCourse
};

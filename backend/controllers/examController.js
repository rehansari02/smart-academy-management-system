const asyncHandler = require('express-async-handler');
const ExamRequest = require('../models/ExamRequest');
const Student = require('../models/Student');
const Branch = require('../models/Branch');

const populateExamRequest = (query) => query.populate({
    path: 'student',
    populate: { path: 'course', select: 'name duration' },
    select: 'firstName lastName regNo enrollmentNo admissionDate mobileParent mobileStudent branchId course'
});

// @desc    Get Exam Requests with Filters
// @route   GET /api/master/exam-request
const getExamRequests = asyncHandler(async (req, res) => {
    const { studentId, courseId, branchId } = req.query;

    let query = { isDeleted: false, status: 'Pending' };

    // Filter by Student directly
    if (studentId) {
        query.student = studentId;
    } 

    // Build student filter for course/branch (these filter through Student)
    let studentFilter = {};
    if (courseId) {
        studentFilter.course = courseId;
    }
    if (branchId) {
        studentFilter.branchId = branchId;
    }

    // If filtering by course or branch, find matching students first
    const hasStudentFields = Object.keys(studentFilter).length > 0;
    if (hasStudentFields && !studentId) {
        const studentsInFilter = await Student.find(studentFilter).select('_id');
        query.student = { $in: studentsInFilter };
    } else if (hasStudentFields && studentId) {
        // If both studentId and other filters, verify the student matches
        const student = await Student.findOne({ _id: studentId, ...studentFilter });
        if (!student) {
            return res.json([]);
        }
        query.student = studentId;
    }

    const requests = await ExamRequest.find(query)
        .populate({
            path: 'student',
            populate: { path: 'course', select: 'name duration' },
            select: 'firstName lastName regNo enrollmentNo admissionDate mobileParent mobileStudent branchId course'
        })
        .sort({ createdAt: -1 })
        .lean();

    // Do not render legacy requests whose referenced student no longer exists.
    res.json(requests.filter(request => request.student));
});

// @desc    Get branches that have exam request data
// @route   GET /api/master/exam-request/branches
const getExamRequestBranches = asyncHandler(async (req, res) => {
    // Find all exam requests that are pending and not deleted
    const examRequests = await ExamRequest.find({ isDeleted: false, status: 'Pending' })
        .populate({
            path: 'student',
            select: 'branchId',
            match: { branchId: { $exists: true, $ne: null } }
        })
        .lean();

    // Extract unique branch IDs from students that have a branchId
    const branchIds = [...new Set(
        examRequests
            .filter(r => r.student && r.student.branchId)
            .map(r => r.student.branchId.toString())
    )];

    // Fetch the branch details
    const branches = await Branch.find({ _id: { $in: branchIds }, isActive: true }).select('name shortCode').lean();

    res.json(branches);
});

// @desc    Get Pending Exams (Dashboard)
// @route   GET /api/master/exam-pending
const getPendingExams = asyncHandler(async (req, res) => {
    const { courseId, minPendingDays } = req.query;

    let query = { 
        isDeleted: false, 
        status: { $in: ['Pending', 'Approved'] } // Not 'Completed' or 'Cancelled'
    };

    // Filter by Course (via Student)
    if (courseId) {
        const studentsInCourse = await Student.find({ course: courseId }).select('_id');
        query.student = { $in: studentsInCourse };
    }

    let requests = await ExamRequest.find(query)
        .populate({
            path: 'student',
            populate: { path: 'course', select: 'name duration' },
            select: 'firstName lastName regNo enrollmentNo admissionDate mobileStudent mobileParent course'
        })
        .sort({ createdAt: 1 }); // Oldest first

    // Calculate Pending Days and Filter
    const today = new Date();
    
    let pendingList = requests.filter(req => req.student).map(req => {
        const reqDate = new Date(req.createdAt);
        const diffTime = Math.abs(today - reqDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        return {
            ...req.toObject(),
            pendingDays: diffDays
        };
    });

    if (minPendingDays) {
        pendingList = pendingList.filter(req => req.pendingDays >= Number(minPendingDays));
    }

    res.json(pendingList);
});

// @desc    Cancel Exam Request
// @route   PUT /api/master/exam-request/:id/cancel
const cancelExamRequest = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const request = await ExamRequest.findById(req.params.id);
    if (request) {
        request.status = 'Cancelled';
        request.cancellationReason = reason;
        await request.save();
        res.json({ message: 'Exam request cancelled successfully', id: req.params.id });
    } else {
        res.status(404); throw new Error('Exam Request not found');
    }
});

// @desc    Create Manual Request (Helper for testing)
// @route   POST /api/master/exam-request
const createExamRequest = asyncHandler(async (req, res) => {
    const { studentId, studentIds } = req.body;

    const isBulkRequest = Array.isArray(studentIds);
    const requestedIds = isBulkRequest ? studentIds : [studentId];
    const uniqueStudentIds = [...new Set(requestedIds.filter(Boolean).map(String))];

    if (uniqueStudentIds.length === 0) {
        res.status(400);
        throw new Error('At least one student is required');
    }

    const students = await Student.find({
        _id: { $in: uniqueStudentIds },
        isDeleted: false
    }).select('_id').lean();
    const validStudentIds = new Set(students.map(student => String(student._id)));
    const invalidStudentIds = uniqueStudentIds.filter(id => !validStudentIds.has(id));

    if (invalidStudentIds.length > 0) {
        res.status(400);
        throw new Error('One or more selected students no longer exist');
    }

    const existingRequests = await ExamRequest.find({
        student: { $in: uniqueStudentIds },
        isDeleted: false,
        status: { $in: ['Pending', 'Approved'] }
    }).select('student').lean();
    const existingStudentIds = new Set(existingRequests.map(request => String(request.student)));
    const idsToCreate = uniqueStudentIds.filter(id => !existingStudentIds.has(id));

    if (idsToCreate.length === 0) {
        res.status(409);
        throw new Error('Exam request already exists for the selected student(s)');
    }

    const createdRequests = [];
    for (const id of idsToCreate) {
        createdRequests.push(await ExamRequest.create({ student: id }));
    }

    const populatedRequests = await populateExamRequest(
        ExamRequest.find({ _id: { $in: createdRequests.map(request => request._id) } })
    ).sort({ createdAt: -1 }).lean();

    res.status(201).json(isBulkRequest ? populatedRequests : populatedRequests[0]);
});

module.exports = { getExamRequests, getExamRequestBranches, cancelExamRequest, createExamRequest, getPendingExams };

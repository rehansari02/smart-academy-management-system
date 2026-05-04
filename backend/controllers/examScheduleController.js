const asyncHandler = require('express-async-handler');
const ExamSchedule = require('../models/ExamSchedule');
const Student = require('../models/Student');
const ExamRequest = require('../models/ExamRequest');

// @desc    Get Exam Schedules
// @route   GET /api/master/exam-schedule
const getExamSchedules = asyncHandler(async (req, res) => {
    const { courseId, examName } = req.query;

    let query = { isDeleted: false };

    if (courseId) {
        query.course = courseId;
    }
    if (examName) {
        query.examName = { $regex: examName, $options: 'i' };
    }

    const schedules = await ExamSchedule.find(query)
        .populate('course', 'name')
        .populate('timeTable.subject', 'name')
        .sort({ createdAt: -1 });

    res.json(schedules);
});

// @desc    Create Exam Schedule
// @route   POST /api/master/exam-schedule
const createExamSchedule = asyncHandler(async (req, res) => {
    const { course, examName, remarks, isActive, attendees, timeTable } = req.body;
    
    const schedule = await ExamSchedule.create({
        course, examName, remarks, isActive, attendees, timeTable
    });

    console.log(`Creating schedule for course ${course} with ${attendees?.length} attendees`);

    // Update corresponding ExamRequests to 'Approved'
    if (attendees && attendees.length > 0) {
        const updateResult = await ExamRequest.updateMany(
            { student: { $in: attendees }, status: 'Pending' },
            { status: 'Approved' }
        );
        console.log(`Updated ${updateResult.modifiedCount} ExamRequests to Approved`);
    }

    // Populate course immediately for frontend return
    const populated = await ExamSchedule.findById(schedule._id).populate('course', 'name');
    res.status(201).json(populated);
});

// @desc    Update Exam Schedule
// @route   PUT /api/master/exam-schedule/:id
const updateExamSchedule = asyncHandler(async (req, res) => {
    const { course, examName, remarks, isActive, attendees, timeTable } = req.body;
    const schedule = await ExamSchedule.findById(req.params.id);
    if (schedule) {
        schedule.course = course || schedule.course;
        schedule.examName = examName || schedule.examName;
        schedule.remarks = remarks || schedule.remarks;
        schedule.isActive = isActive !== undefined ? isActive : schedule.isActive;
        schedule.attendees = attendees || schedule.attendees;
        schedule.timeTable = timeTable || schedule.timeTable;

        const updated = await schedule.save();

        console.log(`Updating schedule ${req.params.id}. Attendees: ${attendees?.length}`);

        // Ensure current attendees are marked as Approved
        if (attendees && attendees.length > 0) {
            const updateResult = await ExamRequest.updateMany(
                { student: { $in: attendees }, status: 'Pending' },
                { status: 'Approved' }
            );
            console.log(`Updated ${updateResult.modifiedCount} ExamRequests to Approved during update`);
        }

        const populated = await ExamSchedule.findById(updated._id).populate('course', 'name');
        res.json(populated);
    } else {
        res.status(404); throw new Error('Schedule not found');
    }
});

// @desc    Delete Exam Schedule Permanently
// @route   DELETE /api/master/exam-schedule/:id
const deleteExamSchedule = asyncHandler(async (req, res) => {
    const schedule = await ExamSchedule.findById(req.params.id);
    if (schedule) {
        // Optional: Revert ExamRequests to 'Pending' if needed, but usually delete is destructive
        await ExamSchedule.findByIdAndDelete(req.params.id);
        res.json({ id: req.params.id, message: 'Exam Schedule removed permanently' });
    } else {
        res.status(404); throw new Error('Schedule not found');
    }
});

// @desc    Get Details (Students who took the exam / linked to course)
// @route   GET /api/master/exam-schedule/:id/details
const getExamScheduleDetails = asyncHandler(async (req, res) => {
    const schedule = await ExamSchedule.findById(req.params.id)
        .populate({
            path: 'attendees',
            select: 'firstName lastName regNo admissionDate mobileStudent course'
        })
        .populate('timeTable.subject', 'name');

    if (!schedule) {
        res.status(404); throw new Error('Schedule not found');
    }

    // Transform to flat format for table (Students)
    const attendees = (schedule.attendees || []).map(student => ({
        _id: student._id,
        admissionDate: student.admissionDate,
        regNo: student.regNo,
        studentName: `${student.firstName} ${student.lastName}`,
        mobile: student.mobileStudent,
        courseName: schedule.course
    }));

    res.json({
        attendees,
        timeTable: schedule.timeTable
    });
});

module.exports = { 
    getExamSchedules, 
    createExamSchedule, 
    updateExamSchedule, 
    deleteExamSchedule,
    getExamScheduleDetails 
};
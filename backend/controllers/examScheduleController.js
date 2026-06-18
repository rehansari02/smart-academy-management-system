const asyncHandler = require('express-async-handler');
const moment = require('moment');
const ExamSchedule = require('../models/ExamSchedule');
const Student = require('../models/Student');
const ExamRequest = require('../models/ExamRequest');
const Course = require('../models/Course');
const sendSMS = require('../utils/smsSender');

const formatDate = (value) => {
    if (!value) return '';
    const date = moment(value);
    return date.isValid() ? date.format('DD/MM/YYYY') : '';
};

const getStudentName = (student) => [
    student.firstName,
    student.middleName,
    student.lastName
].filter(Boolean).join(' ').trim() || 'Student';

const getExamDateRange = (schedule) => {
    const dates = (schedule.timeTable || [])
        .map(item => item.date)
        .filter(Boolean)
        .map(date => new Date(date))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

    const fromDate = formatDate(dates[0]) || 'scheduled date';
    const toDate = formatDate(dates[dates.length - 1]) || fromDate;

    return { fromDate, toDate };
};

const buildExamScheduleMessage = (student, schedule) => {
    const { fromDate, toDate } = getExamDateRange(schedule);
    const studentName = getStudentName(student);
    const branchName = (student.branchId?.name || student.branchName || 'Smart Institute').replace(/\s*Branch$/i, '');

    return `Dear, ${studentName}. Your exam has been scheduled from ${fromDate} to ${toDate}, for any other details contact your ${branchName} Branch. Regards, Smart Institute`;
};

const queueExamScheduleSms = (scheduleId) => {
    setImmediate(async () => {
        try {
            const schedule = await ExamSchedule.findById(scheduleId)
                .populate('course', 'name')
                .populate({
                    path: 'attendees',
                    select: 'firstName middleName lastName mobileStudent mobileParent course branchId branchName isDeleted isCancelled isRegistered',
                    populate: { path: 'branchId', select: 'name' }
                });

            if (!schedule) return;

            const attendeeIds = (schedule.attendees || [])
                .map(student => student?._id)
                .filter(Boolean);

            let students = [];

            if (attendeeIds.length > 0) {
                students = await Student.find({
                    _id: { $in: attendeeIds },
                    isDeleted: { $ne: true },
                    isCancelled: { $ne: true }
                })
                    .select('firstName middleName lastName mobileStudent mobileParent branchId branchName')
                    .populate('branchId', 'name');
            } else if (schedule.course) {
                students = await Student.find({
                    course: schedule.course._id,
                    isDeleted: { $ne: true },
                    isCancelled: { $ne: true },
                    isRegistered: true
                })
                    .select('firstName middleName lastName mobileStudent mobileParent branchId branchName')
                    .populate('branchId', 'name');
            }

            if (!students.length) return;

            await Promise.allSettled(students.map(async (student) => {
                const mobile = student.mobileStudent || student.mobileParent;
                if (!mobile) return;
                const message = buildExamScheduleMessage(student, schedule);
                await sendSMS(mobile, message, 'General');
            }));
        } catch (error) {
            console.error('Exam schedule SMS failed:', error.message);
        }
    });
};

// @desc    Get Exam Schedules
// @route   GET /api/master/exam-schedule
const getExamSchedules = asyncHandler(async (req, res) => {
    const { courseId, examName, branchId } = req.query;

    let query = { isDeleted: false };

    if (courseId) {
        query.course = courseId;
    }
    if (examName) {
        query.examName = { $regex: examName, $options: 'i' };
    }
    if (branchId) {
        const students = await Student.find({ branchId }).select('_id');
        query.attendees = { $in: students.map(student => student._id) };
    }

    const schedules = await ExamSchedule.find(query)
        .populate('course', 'name')
        .populate('attendees', 'firstName lastName regNo branchId branchName')
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
    queueExamScheduleSms(schedule._id);
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

    const course = await Course.findById(schedule.course)
        .populate({
            path: 'subjects.subject',
            select: 'name theoryMarks practicalMarks totalMarks'
        });

    const savedTimeTable = new Map(
        (schedule.timeTable || []).map(item => [
            item.subject?._id?.toString() || item.subject?.toString(),
            item
        ])
    );

    const timeTable = course?.subjects?.length
        ? [...course.subjects]
            .filter(item => item.subject)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map(item => {
                const saved = savedTimeTable.get(item.subject._id.toString());
                const theory = saved?.theory ?? item.subject.theoryMarks ?? 0;
                const practical = saved?.practical ?? item.subject.practicalMarks ?? 0;

                return {
                    subject: item.subject,
                    date: saved?.date || '',
                    startTime: saved?.startTime || '10:00 AM',
                    endTime: saved?.endTime || '01:00 PM',
                    theory,
                    practical,
                    total: saved?.total || item.subject.totalMarks || ((Number(theory) || 0) + (Number(practical) || 0))
                };
            })
        : schedule.timeTable;

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
        timeTable
    });
});

// @desc    Get My Exam Schedules
// @route   GET /api/master/exam-schedule/my
const getMyExamSchedules = asyncHandler(async (req, res) => {
    const student = await Student.findOne({
        userId: req.user._id,
        isDeleted: { $ne: true }
    }).populate('course', 'name');

    if (!student) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    if (!student.course?._id) {
        return res.json({ student: null, schedules: [] });
    }

    const schedules = await ExamSchedule.find({
        isDeleted: false,
        isActive: true,
        course: student.course._id
    })
        .populate('course', 'name')
        .populate('timeTable.subject', 'name')
        .sort({ createdAt: -1 });

    const visibleSchedules = schedules.filter((schedule) => {
        const attendees = (schedule.attendees || []).map(id => String(id));
        return attendees.length === 0 || attendees.includes(String(student._id));
    });

    const payload = visibleSchedules.map((schedule) => ({
        _id: schedule._id,
        examName: schedule.examName,
        remarks: schedule.remarks,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        course: schedule.course,
        timeTable: (schedule.timeTable || []).map((row) => ({
            subject: row.subject,
            date: row.date,
            startTime: row.startTime,
            endTime: row.endTime,
            theory: row.theory,
            practical: row.practical,
            total: row.total
        }))
    }));

    res.json({
        student: {
            _id: student._id,
            name: `${student.firstName} ${student.lastName}`.trim(),
            courseName: student.course?.name || ''
        },
        schedules: payload
    });
});

module.exports = { 
    getExamSchedules, 
    createExamSchedule, 
    updateExamSchedule, 
    deleteExamSchedule,
    getExamScheduleDetails,
    getMyExamSchedules 
};

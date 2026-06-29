const asyncHandler = require('express-async-handler');
const moment = require('moment');
const ExamSchedule = require('../models/ExamSchedule');
const ExamAttempt = require('../models/ExamAttempt');
const FinalExamQuestionPaper = require('../models/FinalExamQuestionPaper');
const Student = require('../models/Student');
const ExamRequest = require('../models/ExamRequest');
const Course = require('../models/Course');
const Employee = require('../models/Employee');
const UserRight = require('../models/UserRight');
const sendSMS = require('../utils/smsSender');
const { getParentSmsRecipients } = require('../utils/smsRecipients');
const bcrypt = require('bcryptjs');

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

const getScheduleRowWindow = (row) => {
    if (!row?.date) return { startAt: null, endAt: null };
    const date = moment(row.date);
    if (!date.isValid()) return { startAt: null, endAt: null };

    const parseTime = (timeValue, fallbackHour, fallbackMinute) => {
        if (!timeValue) return { hour: fallbackHour, minute: fallbackMinute };
        const match = String(timeValue).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return { hour: fallbackHour, minute: fallbackMinute };
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        return { hour, minute };
    };

    const start = parseTime(row.startTime, 9, 0);
    const end = parseTime(row.endTime, 12, 0);
    const startAt = date.clone().hour(start.hour).minute(start.minute).second(0).millisecond(0);
    const endAt = date.clone().hour(end.hour).minute(end.minute).second(59).millisecond(999);
    return { startAt: startAt.toDate(), endAt: endAt.toDate() };
};

const getScheduleRowStatus = (row, now = new Date()) => {
    const { startAt, endAt } = getScheduleRowWindow(row);
    if (!startAt || !endAt) {
        return { status: 'upcoming', canOpen: false };
    }
    const current = moment(now);
    const start = moment(startAt);
    const end = moment(endAt);
    if (current.isBefore(start)) return { status: 'upcoming', canOpen: false };
    if (current.isAfter(end)) return { status: 'ended', canOpen: false };
    return { status: 'live', canOpen: true };
};

const getSchedulePasswordSnapshot = (schedule) => ({
    examiner: schedule.examiner || null,
    conductPasswordEnabled: Boolean(
        schedule.conductPasswordEnabled ||
        (schedule.timeTable || []).some((row) => row.conductPasswordEnabled)
    ),
    hasConductPassword: Boolean(
        schedule.conductPasswordHash ||
        schedule.conductPasswordText ||
        (schedule.timeTable || []).some((row) => row.conductPasswordHash || row.conductPasswordText)
    )
});

const normalizeScheduleTimeTable = async (timeTable = [], existingRows = []) => {
    const normalizedRows = [];

    for (const row of (Array.isArray(timeTable) ? timeTable : [])) {
        if (!row?.subject) {
            continue;
        }

        const existing = existingRows.find((item) => String(item.subject?._id || item.subject) === String(row.subject));
        const passwordEnabled = Boolean(row.conductPasswordEnabled);
        const providedPassword = String(row.conductPassword || row.conductPasswordText || '').trim();

        let conductPasswordText = existing?.conductPasswordText || '';
        let conductPasswordHash = existing?.conductPasswordHash || '';

        if (passwordEnabled) {
            if (providedPassword) {
                const normalizedPassword = await normalizeConductPassword(providedPassword, true);
                conductPasswordText = normalizedPassword.passwordText;
                conductPasswordHash = normalizedPassword.passwordHash;
            } else if (!conductPasswordHash && !conductPasswordText) {
                throw new Error(`Password is required for ${String(row.subjectName || 'this subject')}`);
            }
        } else {
            conductPasswordText = '';
            conductPasswordHash = '';
        }

        normalizedRows.push({
            subject: row.subject,
            date: row.date || null,
            startTime: String(row.startTime || '').trim(),
            endTime: String(row.endTime || '').trim(),
            theory: Number(row.theory) || 0,
            practical: Number(row.practical) || 0,
            total: Number(row.total) || ((Number(row.theory) || 0) + (Number(row.practical) || 0)),
            conductPasswordEnabled: passwordEnabled,
            conductPasswordText,
            conductPasswordHash
        });
    }

    return normalizedRows;
};

const getRowPasswordSnapshot = (row, schedule) => ({
    conductPasswordEnabled: Boolean(row?.conductPasswordEnabled || schedule?.conductPasswordEnabled),
    hasConductPassword: Boolean(
        row?.conductPasswordHash ||
        row?.conductPasswordText ||
        schedule?.conductPasswordHash ||
        schedule?.conductPasswordText
    )
});

const normalizeAnswerText = (value) => String(value || '').trim().toLowerCase();

const getMcqCorrectOptionLetter = (mcq) => {
    const correct = normalizeAnswerText(mcq?.correctAnswer);
    if (!correct) return '';

    const optionIndex = (mcq?.options || []).findIndex((option) => normalizeAnswerText(option) === correct);
    if (optionIndex >= 0) {
        return String.fromCharCode(65 + optionIndex);
    }

    if (/^[a-d]$/i.test(correct)) {
        return correct.toUpperCase();
    }

    return '';
};

const scoreAttemptAgainstPaper = (attempt, subjectPaper) => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const mcqs = Array.isArray(subjectPaper?.mcqs) ? subjectPaper.mcqs : [];
    const questionAnswers = Array.isArray(subjectPaper?.questionAnswers) ? subjectPaper.questionAnswers : [];

    let mcqCorrectCount = 0;
    let mcqWrongCount = 0;
    let qaAnsweredCount = 0;
    let mcqMarksObtained = 0;
    let qaMarksObtained = 0;

    const mcqAnswerMap = new Map(
        answers
            .filter((item) => item.type === 'mcq')
            .map((item) => [Number(item.questionIndex) || 0, item.selectedOption || ''])
    );
    const qaAnswerMap = new Map(
        answers
            .filter((item) => item.type === 'qa')
            .map((item) => [Number(item.questionIndex) || 0, item.answerText || ''])
    );

    mcqs.forEach((mcq, index) => {
        const selected = normalizeAnswerText(mcqAnswerMap.get(index + 1));
        const correctLetter = normalizeAnswerText(getMcqCorrectOptionLetter(mcq));
        if (!selected) {
            return;
        }

        if (correctLetter && selected === correctLetter) {
            mcqCorrectCount += 1;
            mcqMarksObtained += Number(mcq.marks) || 0;
        } else {
            mcqWrongCount += 1;
        }
    });

    questionAnswers.forEach((qa, index) => {
        const answerText = String(qaAnswerMap.get(index + 1) || '').trim();
        if (answerText) {
            qaAnsweredCount += 1;
        }
    });

    return {
        mcqCorrectCount,
        mcqWrongCount,
        qaAnsweredCount,
        mcqMarksObtained,
        qaMarksObtained,
        totalMarksObtained: mcqMarksObtained + qaMarksObtained,
        totalMarksPossible: mcqs.reduce((sum, mcq) => sum + (Number(mcq.marks) || 0), 0) + questionAnswers.reduce((sum, qa) => sum + (Number(qa.marks) || 0), 0)
    };
};

const canViewExamScheduleConduct = async (req, schedule) => {
    if (req.user?.role === 'Super Admin') {
        return true;
    }

    const userRights = await UserRight.findOne({ user: req.user._id }).lean();
    const hasExplicitRight = userRights?.permissions?.some((permission) => (
        permission.page === 'Exam Schedule' && permission.view === true
    ));

    if (hasExplicitRight) {
        return true;
    }

    const employee = await Employee.findOne({
        userAccount: req.user._id,
        isDeleted: { $ne: true }
    }).select('_id').lean();

    const scheduleExaminerId = schedule?.examiner?._id || schedule?.examiner;

    return Boolean(
        employee?._id &&
        scheduleExaminerId &&
        String(employee._id) === String(scheduleExaminerId)
    );
};

const normalizeConductPassword = async (password, enabled) => {
    const trimmed = String(password || '').trim();
    if (!enabled) {
        return { passwordText: '', passwordHash: '' };
    }
    if (!trimmed) {
        throw new Error('Password is required');
    }
    const passwordHash = await bcrypt.hash(trimmed, 10);
    return { passwordText: trimmed, passwordHash };
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
                const mobile = getParentSmsRecipients(student)[0];
                if (!mobile) return;
                const message = buildExamScheduleMessage(student, schedule);
                await sendSMS(mobile, message, 'Exam Schedule');
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
        .populate('examiner', 'name designation role')
        .populate('attendees', 'firstName lastName regNo branchId branchName')
        .populate('timeTable.subject', 'name')
        .sort({ createdAt: -1 });

    res.json(schedules);
});

// @desc    Create Exam Schedule
// @route   POST /api/master/exam-schedule
const createExamSchedule = asyncHandler(async (req, res) => {
    const { course, examName, remarks, isActive, attendees, timeTable, examiner, conductPasswordEnabled, conductPassword } = req.body;
    const passwordEnabled = Boolean(conductPasswordEnabled);
    const normalizedPassword = await normalizeConductPassword(conductPassword, passwordEnabled);
    let normalizedTimeTable = [];
    try {
        normalizedTimeTable = await normalizeScheduleTimeTable(timeTable, []);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
    
    const schedule = await ExamSchedule.create({
        course,
        examName,
        remarks,
        isActive,
        attendees,
        timeTable: normalizedTimeTable,
        examiner: examiner || undefined,
        conductPasswordEnabled: passwordEnabled,
        conductPasswordText: normalizedPassword.passwordText,
        conductPasswordHash: normalizedPassword.passwordHash
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
    const populated = await ExamSchedule.findById(schedule._id).populate('course', 'name').populate('examiner', 'name designation role');
    queueExamScheduleSms(schedule._id);
    res.status(201).json(populated);
});

// @desc    Update Exam Schedule
// @route   PUT /api/master/exam-schedule/:id
const updateExamSchedule = asyncHandler(async (req, res) => {
    const { course, examName, remarks, isActive, attendees, timeTable, examiner, conductPasswordEnabled, conductPassword } = req.body;
    const schedule = await ExamSchedule.findById(req.params.id);
    if (schedule) {
        const existingRows = Array.isArray(schedule.timeTable) ? schedule.timeTable : [];
        let normalizedTimeTable = existingRows;
        if (timeTable !== undefined) {
            try {
                normalizedTimeTable = await normalizeScheduleTimeTable(timeTable, existingRows);
            } catch (error) {
                res.status(400);
                throw new Error(error.message);
            }
        }
        schedule.course = course || schedule.course;
        schedule.examName = examName || schedule.examName;
        schedule.remarks = remarks || schedule.remarks;
        schedule.isActive = isActive !== undefined ? isActive : schedule.isActive;
        schedule.attendees = attendees || schedule.attendees;
        schedule.timeTable = normalizedTimeTable;
        if (examiner !== undefined) schedule.examiner = examiner || null;
        if (conductPasswordEnabled !== undefined) schedule.conductPasswordEnabled = Boolean(conductPasswordEnabled);
        if (conductPasswordEnabled !== undefined) {
            const passwordOn = Boolean(conductPasswordEnabled);
            const trimmedPassword = String(conductPassword || '').trim();
            if (passwordOn) {
                if (trimmedPassword) {
                    const normalizedPassword = await normalizeConductPassword(trimmedPassword, true);
                    schedule.conductPasswordText = normalizedPassword.passwordText;
                    schedule.conductPasswordHash = normalizedPassword.passwordHash;
                } else if (!schedule.conductPasswordHash && !schedule.conductPasswordText) {
                    res.status(400);
                    throw new Error('Password is required');
                }
            } else {
                schedule.conductPasswordText = '';
                schedule.conductPasswordHash = '';
            }
        }

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

        const populated = await ExamSchedule.findById(updated._id).populate('course', 'name').populate('examiner', 'name designation role');
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
        .populate('examiner', 'name designation role')
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
                    conductPasswordEnabled: Boolean(saved?.conductPasswordEnabled || schedule.conductPasswordEnabled),
                    hasConductPassword: Boolean(
                        saved?.conductPasswordHash ||
                        saved?.conductPasswordText ||
                        schedule.conductPasswordHash ||
                        schedule.conductPasswordText
                    ),
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
        timeTable,
        conduct: getSchedulePasswordSnapshot(schedule)
    });
});

// @desc    Get conduct summary for a schedule
// @route   GET /api/master/exam-schedule/:id/conduct
const getExamScheduleConductSummary = asyncHandler(async (req, res) => {
    const schedule = await ExamSchedule.findById(req.params.id)
        .populate('course', 'name shortName')
        .populate('examiner', 'name designation role')
        .populate('timeTable.subject', 'name');

    if (!schedule) {
        res.status(404);
        throw new Error('Schedule not found');
    }

    const canView = await canViewExamScheduleConduct(req, schedule);
    if (!canView) {
        res.status(403);
        throw new Error('Access denied. You do not have permission to view Exam Schedule.');
    }

    const attendees = await Student.find({
        _id: { $in: schedule.attendees || [] },
        isDeleted: { $ne: true },
        isCancelled: { $ne: true }
    }).populate('course', 'name shortName');

    const attempts = await ExamAttempt.find({ schedule: schedule._id })
        .populate('student', 'firstName lastName regNo course')
        .populate('subject', 'name printedName')
        .sort({ updatedAt: -1 });

    const paper = await FinalExamQuestionPaper.findOne({
        isDeleted: false,
        isActive: true,
        course: schedule.course?._id || schedule.course,
        'subjects.subject': { $in: (schedule.timeTable || []).map((row) => row.subject?._id || row.subject).filter(Boolean) }
    }).populate('subjects.subject', 'name printedName');

    const paperSubjects = new Map(
        (paper?.subjects || []).map((subjectRow) => [
            String(subjectRow.subject?._id || subjectRow.subject),
            subjectRow
        ])
    );

    const attemptMap = new Map(
        attempts.map((attempt) => [
            `${attempt.student?._id?.toString() || ''}:${attempt.subject?._id?.toString() || ''}`,
            attempt
        ])
    );

    const attendeeSummary = attendees.map((student) => {
        const rows = (schedule.timeTable || []).map((row) => {
            const subjectKey = row.subject?._id?.toString() || row.subject?.toString?.() || String(row.subject || '');
            const attempt = attemptMap.get(`${student._id.toString()}:${subjectKey}`);
            const subjectPaper = paperSubjects.get(String(subjectKey));
            const score = scoreAttemptAgainstPaper(attempt, subjectPaper);
            const { status, canOpen } = getScheduleRowStatus(row);
            return {
                subjectId: row.subject,
                subjectName: row.subject?.name || row.subject?.printedName || 'Subject',
                status,
                canOpen,
                answeredCount: attempt?.answeredCount || 0,
                totalQuestions: attempt?.totalQuestions || 0,
                isSubmitted: Boolean(attempt?.isSubmitted),
                submittedAt: attempt?.submittedAt || null,
                lastSavedAt: attempt?.lastSavedAt || null,
                mcqCorrectCount: score.mcqCorrectCount,
                mcqWrongCount: score.mcqWrongCount,
                qaAnsweredCount: score.qaAnsweredCount,
                mcqMarksObtained: score.mcqMarksObtained,
                qaMarksObtained: score.qaMarksObtained,
                totalMarksObtained: score.totalMarksObtained,
                totalMarksPossible: score.totalMarksPossible
            };
        });

        return {
            _id: student._id,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            regNo: student.regNo || '',
            courseName: student.course?.name || '',
            rows
        };
    });

    res.json({
        schedule: {
            _id: schedule._id,
            examName: schedule.examName,
            course: schedule.course,
            examiner: schedule.examiner,
            conductPasswordEnabled: Boolean(schedule.conductPasswordEnabled),
            hasConductPassword: Boolean(schedule.conductPasswordHash || schedule.conductPasswordText),
            timeTable: schedule.timeTable
        },
        attendees: attendeeSummary,
        attempts: attempts.map((attempt) => ({
            _id: attempt._id,
            student: attempt.student,
            subject: attempt.subject,
            totalQuestions: attempt.totalQuestions,
            answeredCount: attempt.answeredCount,
            isSubmitted: attempt.isSubmitted,
            submittedAt: attempt.submittedAt,
            lastSavedAt: attempt.lastSavedAt,
            updatedAt: attempt.updatedAt,
            score: scoreAttemptAgainstPaper(attempt, paperSubjects.get(String(attempt.subject?._id || attempt.subject)))
        }))
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
    getExamScheduleConductSummary,
    getMyExamSchedules 
};

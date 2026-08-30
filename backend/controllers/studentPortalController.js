const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const Course = require('../models/Course');
const CourseFeedback = require('../models/CourseFeedback');
const moment = require('moment');
const ExamSchedule = require('../models/ExamSchedule');
const ExamAttempt = require('../models/ExamAttempt');
const FinalExamQuestionPaper = require('../models/FinalExamQuestionPaper');
const bcrypt = require('bcryptjs');
const SyllabusLog = require('../models/SyllabusLog');
const StudentSyllabusResponse = require('../models/StudentSyllabusResponse');

// Returns YYYY-MM-DD using LOCAL time (server timezone)
const getDateKey = (date) => {
    if (!date) return 'no-date';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'no-date';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Returns YYYY-MM-DD using UTC — used when comparing against frontend-stored dates
// which are produced in the browser's local timezone (e.g. IST)
const getDateKeyUTC = (date) => {
    if (!date) return 'no-date';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'no-date';
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Return all plausible date-key variants for a date value (handles timezone shifts)
const getDateKeyVariants = (date) => {
    const local = getDateKey(date);
    const utc = getDateKeyUTC(date);
    const set = new Set([local, utc]);
    // Also try +5:30 (IST) in case server is UTC and frontend stored IST date
    if (date) {
        const parsed = new Date(date);
        if (!Number.isNaN(parsed.getTime())) {
            const ist = new Date(parsed.getTime() + (5 * 60 + 30) * 60 * 1000);
            const istKey = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
            set.add(istKey);
        }
    }
    return [...set].filter((k) => k && k !== 'no-date');
};

const getStudentAttendanceStatusForScheduleRow = (schedule, studentId, rowDateKey) => {
    const records = (schedule.attendance || []).filter(
        (a) => String(a.student?._id || a.student) === String(studentId)
    );
    if (records.length === 0) return null;

    // The rowDateKey might be in a different timezone than examDate stored by frontend.
    // Collect all plausible date keys for the row date.
    // Also fall back: if rowDateKey is 'no-date', match any record.
    const dateRecords = records.filter((a) => {
        if (!a.examDate || !rowDateKey || rowDateKey === 'no-date') return true;
        // Direct match first
        if (a.examDate === rowDateKey) return true;
        // The stored examDate was set by frontend (browser local time).
        // rowDateKey is from backend local time. Try all variants.
        const rowVariants = getDateKeyVariants(rowDateKey);
        if (rowVariants.includes(a.examDate)) return true;
        // Also convert stored examDate via all variants
        const storedVariants = getDateKeyVariants(a.examDate);
        return storedVariants.some((v) => v === rowDateKey || rowVariants.includes(v));
    });

    // If no attendance record matches this specific date → student is NOT absent for this row
    if (dateRecords.length === 0) return null;
    const latestRecord = [...dateRecords].sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    )[0];
    return latestRecord?.status || null;
};

const isStudentAbsentForScheduleRow = (schedule, studentId, rowDateKey) => (
    getStudentAttendanceStatusForScheduleRow(schedule, studentId, rowDateKey) === 'Absent'
);

const isStudentPresentForScheduleRow = (schedule, studentId, rowDateKey) => (
    getStudentAttendanceStatusForScheduleRow(schedule, studentId, rowDateKey) === 'Present'
);

const getActiveStudentForUser = async (userId, populateCourse = false) => {
    const query = Student.findOne({ userId, isDeleted: false });
    if (populateCourse) {
        query.populate({
            path: 'course',
            populate: {
                path: 'subjects.subject',
                model: 'Subject'
            }
        });
    }
    return query.lean();
};

const buildChapterProgress = (subject, logs, responses) => {
    const chapters = subject?.chapters || [];
    const projects = subject?.projects || [];
    const chapterStatusMap = {};
    const chapterProjectMap = {};

    logs.forEach((log) => {
        const cid = log.chapterId ? String(log.chapterId) : null;
        if (!cid) return;

        if (!chapterStatusMap[cid]) {
            chapterStatusMap[cid] = {
                status: null,
                startedAt: null,
                completedAt: null,
                startedBy: null,
                completedBy: null,
                firstActivityAt: null,
            };
        }

        const state = chapterStatusMap[cid];
        if (!state.firstActivityAt) state.firstActivityAt = log.sessionDate;

        if (log.chapterStatus === 'Running' && /chapter (started|restarted|session started)/i.test(log.notes || '')) {
            state.status = 'Running';
            state.startedAt = log.sessionDate;
            state.startedBy = log.loggedByName;
        }

        if (log.chapterStatus === 'Completed') {
            state.status = 'Completed';
            state.completedAt = log.sessionDate;
            state.completedBy = log.loggedByName;
        }

        (log.projects || []).forEach((p) => {
            if (!p.projectId) return;
            if (!chapterProjectMap[cid]) chapterProjectMap[cid] = {};
            chapterProjectMap[cid][String(p.projectId)] = {
                completedAt: log.sessionDate,
                completedBy: log.loggedByName,
            };
        });
    });

    const responseMap = {};
    responses.forEach((response) => {
        const key = [
            response.type,
            String(response.chapterId),
            response.projectId ? String(response.projectId) : '',
        ].join(':');
        responseMap[key] = response;
    });

    return chapters.map((chapter) => {
        const cid = chapter._id ? String(chapter._id) : '';
        const status = chapterStatusMap[cid] || {};
        const chapterProjects = projects.filter((project) => String(project.chapterId || '') === cid);

        const getResponse = (type, projectId = '') => {
            const response = responseMap[[type, cid, projectId ? String(projectId) : ''].join(':')];
            const comments = (response?.comments || []).map((item) => ({
                comment: item.comment || '',
                commentedAt: item.commentedAt || item.createdAt || response.respondedAt || response.updatedAt || response.createdAt,
            })).filter((item) => item.comment);
            if (response?.comment && comments.length === 0) {
                comments.push({
                    comment: response.comment,
                    commentedAt: response.respondedAt || response.updatedAt || response.createdAt,
                });
            }
            return response
                ? {
                    understood: Boolean(response.understood),
                    comment: response.comment || '',
                    comments,
                    respondedAt: response.respondedAt || response.updatedAt || response.createdAt,
                }
                : null;
        };

        return {
            chapter,
            status: status.status || null,
            startedAt: status.startedAt || status.firstActivityAt || null,
            completedAt: status.completedAt || null,
            startedBy: status.startedBy || null,
            completedBy: status.completedBy || null,
            theoryResponse: getResponse('theory'),
            chapterResponse: getResponse('chapter'),
            commentResponse: getResponse('comment'),
            projects: chapterProjects.map((project) => {
                const completedInfo = chapterProjectMap[cid]?.[String(project._id)];
                return {
                    ...project,
                    completed: Boolean(completedInfo),
                    completedAt: completedInfo?.completedAt || null,
                    completedBy: completedInfo?.completedBy || null,
                    studentResponse: getResponse('project', project._id),
                };
            }),
        };
    });
};

const parseExamTime = (dateValue, timeValue) => {
    if (!dateValue) return null;
    const storedDate = moment(dateValue);
    if (!storedDate.isValid()) return null;

    // Build the exam instant explicitly in IST so UTC production and IST local servers agree.
    const examDateKey = storedDate.clone().utcOffset(330).format('YYYY-MM-DD');
    const time = String(timeValue || '').trim();
    const time24Match = time.match(/^(\d{1,2}):(\d{2})$/);
    let hour;
    let minute;

    if (time24Match) {
        hour = Number(time24Match[1]);
        minute = Number(time24Match[2]);
    } else {
        const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        hour = Number(match[1]);
        minute = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
    }

    const parsed = moment.parseZone(
        `${examDateKey} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} +05:30`,
        'YYYY-MM-DD HH:mm Z',
        true
    );
    return parsed.isValid() ? parsed.toDate() : null;
};

const getScheduleSubjectWindow = (row) => {
    const startAt = parseExamTime(row?.date, row?.startTime);
    const endAt = parseExamTime(row?.date, row?.endTime);
    if (!startAt || !endAt) {
        return { startAt: null, endAt: null, status: 'upcoming', canOpen: false };
    }

    const now = moment();
    const start = moment(startAt);
    const end = moment(endAt).add(59, 'seconds').add(999, 'milliseconds');

    if (now.isBefore(start)) {
        return { startAt, endAt: end.toDate(), status: 'upcoming', canOpen: false };
    }
    if (now.isAfter(end)) {
        return { startAt, endAt: end.toDate(), status: 'ended', canOpen: false };
    }
    return { startAt, endAt: end.toDate(), status: 'live', canOpen: true };
};

const getScheduleSubjectDurationMs = (row) => {
    const startAt = parseExamTime(row?.date, row?.startTime);
    const endAt = parseExamTime(row?.date, row?.endTime);
    if (!startAt || !endAt) return 0;
    let durationMs = endAt.getTime() - startAt.getTime();
    if (durationMs <= 0) durationMs += 24 * 60 * 60 * 1000;
    return durationMs;
};

const getAttemptAccessWindow = (attempt, scheduleWindow) => {
    const expiresAt = attempt?.expiresAt ? new Date(attempt.expiresAt) : null;
    const hasValidExpiry = expiresAt && !Number.isNaN(expiresAt.getTime());
    const canEdit = Boolean(
        attempt
        && !attempt.isSubmitted
        && hasValidExpiry
        && Date.now() <= expiresAt.getTime()
    );

    return {
        ...scheduleWindow,
        scheduledEndAt: scheduleWindow.endAt,
        endAt: hasValidExpiry ? expiresAt : scheduleWindow.endAt,
        status: attempt?.isSubmitted ? 'submitted' : canEdit ? 'live' : scheduleWindow.status,
        canOpen: canEdit
    };
};

const getStudentCourseSubjects = (student) => {
    return (student.course?.subjects || [])
        .map((item) => item?.subject || item)
        .filter(Boolean);
};

const isStudentInSchedule = (schedule, studentId) => {
    const attendeeIds = (schedule.attendees || []).map((id) => String(id));
    return attendeeIds.length === 0 || attendeeIds.includes(String(studentId));
};

const getScheduleSubjectRow = (schedule, subjectId) => {
    return (schedule.timeTable || []).find((row) =>
        String(row.subject?._id || row.subject) === String(subjectId)
    ) || null;
};

const validateSchedulePassword = async (schedule, password) => {
    const trimmedPassword = String(password || '').trim();
    const storedHash = String(schedule?.conductPasswordHash || '').trim();
    const storedText = String(schedule?.conductPasswordText || '').trim();

    if (!trimmedPassword) {
        return { valid: false, message: 'Password is required' };
    }

    if (storedHash) {
        const valid = await bcrypt.compare(trimmedPassword, storedHash);
        return {
            valid,
            message: valid ? '' : 'Incorrect password'
        };
    }

    if (storedText) {
        const valid = trimmedPassword === storedText;
        return {
            valid,
            message: valid ? '' : 'Incorrect password'
        };
    }

    return {
        valid: false,
        message: 'No password configured for this exam schedule'
    };
};

const getEffectiveConductPassword = (row, schedule) => ({
    enabled: Boolean(row?.conductPasswordEnabled || schedule?.conductPasswordEnabled),
    hash: String(row?.conductPasswordHash || schedule?.conductPasswordHash || '').trim(),
    text: String(row?.conductPasswordText || schedule?.conductPasswordText || '').trim()
});

const isPasswordRequiredForConduct = (conductPassword) => (
    conductPassword.enabled && Boolean(conductPassword.hash || conductPassword.text)
);

const isAttemptVerifiedForSession = (attempt, authSessionId) => Boolean(
    attempt
    && authSessionId
    && Array.isArray(attempt.passwordVerifiedSessionIds)
    && attempt.passwordVerifiedSessionIds.includes(authSessionId)
);

const getSchedulePaper = async (courseId, subjectId) => {
    return FinalExamQuestionPaper.findOne({
        isDeleted: false,
        isActive: true,
        course: courseId,
        'subjects.subject': subjectId
    })
        .populate('course', 'name shortName')
        .populate('subjects.subject', 'name printedName');
};

const serializeQuestionPaperSubject = (paper, subjectId) => {
    const subjectRow = (paper?.subjects || []).find((row) =>
        String(row.subject?._id || row.subject) === String(subjectId)
    );
    if (!subjectRow) return null;

    return {
        subject: subjectRow.subject,
        duration: subjectRow.duration || '',
        rawMcqs: subjectRow.mcqs || [],
        rawQuestionAnswers: subjectRow.questionAnswers || [],
        mcqs: (subjectRow.mcqs || []).map((mcq, index) => ({
            questionId: `mcq-${index + 1}`,
            question: mcq.question || '',
            options: mcq.options || [],
            marks: Number(mcq.marks) || 1
        })),
        questionAnswers: (subjectRow.questionAnswers || []).map((qa, index) => ({
            questionId: `qa-${index + 1}`,
            question: qa.question || '',
            marks: Number(qa.marks) || 1
        }))
    };
};

const buildAttemptPayload = (attempt) => ({
    _id: attempt._id,
    schedule: attempt.schedule,
    subject: attempt.subject,
    student: attempt.student,
    answers: attempt.answers || [],
    totalMcq: attempt.totalMcq || 0,
    totalQa: attempt.totalQa || 0,
    totalQuestions: attempt.totalQuestions || 0,
    answeredCount: attempt.answeredCount || 0,
    isSubmitted: Boolean(attempt.isSubmitted),
    startedAt: attempt.startedAt || null,
    lastSavedAt: attempt.lastSavedAt || null,
    submittedAt: attempt.submittedAt || null,
    expiresAt: attempt.expiresAt || null,
    passwordVerifiedAt: attempt.passwordVerifiedAt || null
});

// @desc    Get Student Dashboard Stats (Attendance)
// @route   GET /api/student-portal/dashboard
// @access  Private (Student)
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // 1. Find Student Profile linked to this User
        // Use find().sort() to be deterministic, or ensure uniqueness in the DB
        const students = await Student.find({ userId, isDeleted: false }).populate('course');
        
        if (students.length === 0) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        if (students.length > 1) {
            console.warn(`[SECURITY] Multiple student profiles found for userId: ${userId}. Using the most recent active one.`);
        }

        // Pick the most recent active student if multiple exist
        const student = students.sort((a, b) => b.updatedAt - a.updatedAt)[0];

        // 2. Calculate Total Course Days
        let totalCourseDays = 0;
        if (student.course) {
            const { duration, durationType } = student.course;
            if (durationType === 'Month') {
                // Approximate or Exact? "if 12 months than 365 (adjust leap year)"
                // We'll calculate based on admission date to admission date + duration
                const startDate = moment(student.admissionDate);
                const endDate = moment(startDate).add(duration, 'months');
                totalCourseDays = endDate.diff(startDate, 'days');
            } else if (durationType === 'Year') {
                 const startDate = moment(student.admissionDate);
                 const endDate = moment(startDate).add(duration, 'years');
                 totalCourseDays = endDate.diff(startDate, 'days');
            } else if (durationType === 'Days') {
                totalCourseDays = duration;
            }
        }

        // 3. Calculate Attendance Stats
        // We need to count how many 'records' in StudentAttendance have this studentId and isPresent: true
        const attendanceRecords = await StudentAttendance.find({
            'records.studentId': student._id
        });

        let presentDays = 0;
        let currentMonthPresent = 0;
        let currentMonthTotal = 0; // Total days attendance was TAKEN this month for this student's batch

        const startOfMonth = moment().startOf('month');
        const endOfMonth = moment().endOf('month');

        attendanceRecords.forEach(att => {
            const record = att.records.find(r => r.studentId.toString() === student._id.toString());
            if (record) {
                 // Overall Present
                if (record.isPresent) {
                    presentDays++;
                }

                // Current Month Stats
                if (moment(att.date).isBetween(startOfMonth, endOfMonth, null, '[]')) {
                    currentMonthTotal++; // Count every day attendance was taken for this batch
                    if (record.isPresent) {
                        currentMonthPresent++;
                    }
                }
            }
        });
        
        // Total days since admission (optional, but good for context vs Total Course Days)
        const daysSinceJoining = moment().diff(moment(student.admissionDate), 'days');

        res.json({
            studentName: student.firstName + ' ' + student.lastName,
            studentPhoto: student.studentPhoto || '',
            courseName: student.course?.name,
            totalCourseDays,
            daysSinceJoining,
            presentDays,
            currentMonthPresent,
            currentMonthTotal, // Days classes were held this month
            admissionDate: student.admissionDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Course Details (Subjects)
// @route   GET /api/student-portal/course
// @access  Private (Student)
const getCourseDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const student = await Student.findOne({ userId, isDeleted: false }).populate({
            path: 'course',
            populate: {
                path: 'subjects.subject',
                model: 'Subject'
            }
        });

        if (!student || !student.course) {
             return res.status(404).json({ message: 'Course details not found' });
        }

        // Sort subjects if needed
        const subjects = student.course.subjects.map(s => s.subject).filter(Boolean);

        res.json({
            courseName: student.course.name,
            courseCode: student.course.shortName,
            description: student.course.description || student.course.smallDescription,
            subjects: subjects
        });

    } catch (error) {
         console.error(error);
         res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Course Feedback
// @route   POST /api/student-portal/feedback
// @access  Private (Student)
const submitFeedback = async (req, res) => {
    try {
        const { courseName, title, email, mobile, feedback } = req.body;
        
        // Basic validation
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({ message: 'Feedback is required' });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        
        const userId = req.user._id;
        
        // Find Student to link properly (optional but good for checking validity)
        const student = await Student.findOne({ userId, isDeleted: false });

        const newFeedback = await CourseFeedback.create({
            studentId: student?._id,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            courseName,
            title,
            email,
            mobile,
            feedback,
            date: new Date()
        });
        res.status(201).json(newFeedback);

    } catch (error) {
         console.error(error);
         res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Study Materials
// @route   GET /api/student-portal/materials
// @access  Private (Student)
const getStudyMaterials = async (req, res) => {
    try {
        const Student = require('../models/Student');
        const Material = require('../models/Material');

        const { fromDate, toDate, searchBy, value } = req.query;
        const student = await Student.findOne({ userId: req.user._id, isDeleted: false })
            .populate({
                path: 'course',
                select: 'name shortName subjects',
                populate: {
                    path: 'subjects.subject',
                    select: 'name'
                }
            })
            .lean();

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const subjectIds = (student.course?.subjects || [])
            .map((item) => item?.subject?._id || item?.subject)
            .filter(Boolean);

        if (!subjectIds.length) {
            return res.json([]);
        }

        const query = {
            isActive: true,
            type: { $in: ['Public', 'Student only', 'Student and Faculty only'] },
            subject: { $in: subjectIds }
        };

        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endOfDay;
            }
        }

        if (searchBy === 'title' && value) {
            query.title = { $regex: value, $options: 'i' };
        }

        let materials = await Material.find(query)
            .populate('subject', 'name')
            .sort({ createdAt: -1 })
            .lean();

        if (searchBy === 'subject' && value) {
            materials = materials.filter((material) =>
                material.subject?.name?.toLowerCase().includes(String(value).toLowerCase())
            );
        }

        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Learning Questions (MCQ)
// @route   GET /api/student-portal/learning/questions
// @access  Private (Student)
const getFreeLearningQuestions = async (req, res) => {
    try {
        const Student = require('../models/Student');
        const FreeLearning = require('../models/FreeLearning');

        const student = await Student.findOne({ userId: req.user._id, isDeleted: false })
            .populate({
                path: 'course',
                select: 'subjects',
                populate: {
                    path: 'subjects.subject',
                    select: '_id'
                }
            })
            .lean();

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const subjectIds = (student.course?.subjects || [])
            .map((item) => item?.subject?._id || item?.subject)
            .filter(Boolean);

        if (!subjectIds.length) {
            return res.json([]);
        }

        const progressRecords = await require('../models/FreeLearningProgress')
            .find({ studentId: student._id })
            .select('questions.questionId')
            .lean();
        const answeredQuestionIds = progressRecords
            .flatMap((record) => record.questions || [])
            .map((item) => item.questionId)
            .filter(Boolean);

        const questions = await FreeLearning.find({
            isActive: true,
            subject: { $in: subjectIds },
            _id: { $nin: answeredQuestionIds }
        })
            .populate('subject', 'name')
            .select('-correctOption -explanation')
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Free Learning Quiz
// @route   POST /api/student-portal/learning/submit
// @access  Private (Student)
const submitFreeLearning = async (req, res) => {
    try {
        const { answers } = req.body; // Array of { questionId, selectedOption }
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FreeLearning = require('../models/FreeLearning');
        const FreeLearningProgress = require('../models/FreeLearningProgress');

        const student = await Student.findOne({ userId, isDeleted: false })
            .populate({
                path: 'course',
                select: 'subjects',
                populate: {
                    path: 'subjects.subject',
                    select: '_id'
                }
            })
            .lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const subjectIds = (student.course?.subjects || [])
            .map((item) => item?.subject?._id || item?.subject)
            .filter(Boolean)
            .map((id) => String(id));
        const allowedSubjectIds = new Set(subjectIds);
        const previousProgress = await FreeLearningProgress.find({ studentId: student._id })
            .select('questions.questionId')
            .lean();
        const answeredQuestionIds = new Set(
            previousProgress
                .flatMap((record) => record.questions || [])
                .map((item) => String(item.questionId))
                .filter(Boolean)
        );
        let totalScore = 0;
        const processedQuestions = [];

        // Validate answers
        for (const ans of answers) {
            const question = await FreeLearning.findOne({
                _id: ans.questionId,
                isActive: true
            });
            if (
                question &&
                allowedSubjectIds.has(String(question.subject)) &&
                !answeredQuestionIds.has(String(question._id))
            ) {
                const isCorrect = question.correctOption === parseInt(ans.selectedOption);
                if (isCorrect) totalScore++;
                
                processedQuestions.push({
                    questionId: question._id,
                    selectedOption: ans.selectedOption,
                    isCorrect
                });
            }
        }

        if (!processedQuestions.length) {
            return res.status(400).json({ message: 'No valid questions were submitted for your course subjects' });
        }

        // Save Progress
        const progress = await FreeLearningProgress.create({
            studentId: student._id,
            questions: processedQuestions,
            totalScore,
            date: new Date()
        });

        res.status(201).json({
            score: totalScore,
            totalQuestions: answers.length,
            progressId: progress._id,
            message: 'Quiz Submitted Successfully'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Learning Reports
// @route   GET /api/student-portal/learning/report
// @access  Private (Student)
const getFreeLearningReport = async (req, res) => {
    try {
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FreeLearningProgress = require('../models/FreeLearningProgress');

        const student = await Student.findOne({ userId, isDeleted: false });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const reports = await FreeLearningProgress.find({ studentId: student._id })
            .populate({
                path: 'questions.questionId',
                populate: {
                    path: 'subject',
                    select: 'name'
                }
            })
            .sort({ date: -1 });

        res.json(reports);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Fees (Receipts)
// @route   GET /api/student-portal/fees
// @access  Private (Student)
const getStudentFees = async (req, res) => {
    try {
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FeeReceipt = require('../models/FeeReceipt');

        const student = await Student.findOne({ userId, isDeleted: false });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const receipts = await FeeReceipt.find({ student: student._id })
            .populate({
                 path: 'student',
                 select: 'firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails branchId',
                 populate: {
                     path: 'branchId',
                     select: 'name address city state phone mobile email type'
                 }
            })
            .populate('course', 'name')
            .sort({ date: -1 });

        res.json(receipts);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Exam Schedules
// @route   GET /api/student-portal/exam-schedules
// @access  Private (Student)
const getStudentExamSchedules = async (req, res) => {
    try {
        const userId = req.user._id;

        const student = await Student.findOne({ userId, isDeleted: { $ne: true } }).populate('course', 'name');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.course?._id) {
            return res.json({
                student: {
                    _id: student._id,
                    name: `${student.firstName} ${student.lastName}`.trim(),
                    courseName: ''
                },
                schedules: []
            });
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
            const attendeeIds = (schedule.attendees || []).map(id => String(id));
            return attendeeIds.length === 0 || attendeeIds.includes(String(student._id));
        });
        const attempts = await ExamAttempt.find({
            schedule: { $in: visibleSchedules.map((schedule) => schedule._id) },
            student: student._id
        }).lean();
        const attemptMap = new Map(
            attempts.map((attempt) => [
                `${String(attempt.schedule)}:${String(attempt.subject?._id || attempt.subject)}`,
                attempt
            ])
        );

        const payload = visibleSchedules.map((schedule) => ({
            _id: schedule._id,
            examName: schedule.examName,
            remarks: schedule.remarks,
            isActive: schedule.isActive,
            isReExam: Boolean(schedule.isReExam),
            scheduleType: schedule.scheduleType || (schedule.isReExam ? 'reExam' : 'regular'),
            createdAt: schedule.createdAt,
            course: schedule.course,
            timeTable: (schedule.timeTable || []).map((row) => {
                const subjectId = row.subject?._id || row.subject;
                const attempt = attemptMap.get(`${String(schedule._id)}:${String(subjectId)}`);
                const window = getScheduleSubjectWindow(row);
                const rowDateKey = getDateKey(row.date);
                const isExplicitlyPresent = isStudentPresentForScheduleRow(schedule, student._id, rowDateKey);
                const isExplicitlyAbsent = isStudentAbsentForScheduleRow(schedule, student._id, rowDateKey);

                return {
                    subject: row.subject,
                    date: row.date,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    theory: row.theory,
                    practical: row.practical,
                    total: row.total,
                    status: window.status,
                    isSubmitted: Boolean(attempt?.isSubmitted),
                    isAbsent: isExplicitlyAbsent || (window.status === 'ended' && !attempt),
                    isPresent: isExplicitlyPresent,
                    attendanceStatus: isExplicitlyPresent ? 'Present' : isExplicitlyAbsent ? 'Absent' : 'Not Marked'
                };
            })
        }));

        res.json({
            student: {
                _id: student._id,
                name: `${student.firstName} ${student.lastName}`.trim(),
                courseName: student.course?.name || ''
            },
            schedules: payload
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Exam Conduct list
// @route   GET /api/student-portal/exam-conduct
// @access  Private (Student)
const getStudentExamConduct = async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id, isDeleted: { $ne: true } })
            .populate({
                path: 'course',
                populate: {
                    path: 'subjects.subject',
                    model: 'Subject'
                }
            });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.course?._id) {
            return res.json({
                student: {
                    _id: student._id,
                    name: `${student.firstName} ${student.lastName}`.trim(),
                    courseName: ''
                },
                schedules: []
            });
        }

        const schedules = await ExamSchedule.find({
            isDeleted: false,
            isActive: true,
            course: student.course._id
        })
            .populate('course', 'name shortName')
            .populate('examiner', 'name designation role')
            .populate('alternateExaminer', 'name designation role')
            .populate('timeTable.subject', 'name printedName')
            .sort({ createdAt: -1 });

        const visibleSchedules = schedules.filter((schedule) => isStudentInSchedule(schedule, student._id));
        const courseSubjects = getStudentCourseSubjects(student);
        const activeNow = moment();
        const scheduleIds = visibleSchedules.map((schedule) => schedule._id);
        const attempts = await ExamAttempt.find({
            schedule: { $in: scheduleIds },
            student: student._id
        })
            .populate('subject', 'name printedName')
            .lean();

        const attemptMap = new Map(
            attempts.map((attempt) => [
                `${String(attempt.schedule)}:${String(attempt.subject?._id || attempt.subject)}`,
                attempt
            ])
        );

        const payload = visibleSchedules.map((schedule) => ({
            _id: schedule._id,
            examName: schedule.examName,
            remarks: schedule.remarks,
            isActive: schedule.isActive,
            isReExam: Boolean(schedule.isReExam),
            scheduleType: schedule.scheduleType || (schedule.isReExam ? 'reExam' : 'regular'),
            examiner: schedule.examiner,
            alternateExaminer: schedule.alternateExaminer,
            conductPasswordEnabled: Boolean(schedule.conductPasswordEnabled),
            hasConductPassword: Boolean(schedule.conductPasswordHash || schedule.conductPasswordText),
            course: schedule.course,
            timeTable: (schedule.timeTable || []).map((row) => {
                const window = getScheduleSubjectWindow(row);
                const subjectId = row.subject?._id || row.subject;
                const attempt = attemptMap.get(`${String(schedule._id)}:${String(subjectId)}`);
                const isCourseSubject = courseSubjects.some((subject) => String(subject?._id || subject) === String(subjectId));
                
                const rowDateKey = getDateKey(row.date);
                const isExplicitlyPresent = isStudentPresentForScheduleRow(schedule, student._id, rowDateKey);
                const isExplicitlyAbsent = isStudentAbsentForScheduleRow(schedule, student._id, rowDateKey);
                const isAbsent = isExplicitlyAbsent || (window.status === 'ended' && !attempt);
                const accessWindow = getAttemptAccessWindow(attempt, window);

                return {
                    subject: row.subject,
                    date: row.date,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    theory: row.theory,
                    practical: row.practical,
                    total: row.total,
                    status: accessWindow.status,
                    canOpen: isExplicitlyPresent && isCourseSubject && (window.canOpen || accessWindow.canOpen),
                    isAbsent,
                    isPresent: isExplicitlyPresent,
                    attendanceStatus: isExplicitlyPresent ? 'Present' : isExplicitlyAbsent ? 'Absent' : 'Not Marked',
                    isCourseSubject,
                    conductPasswordEnabled: Boolean(row.conductPasswordEnabled || schedule.conductPasswordEnabled),
                    hasConductPassword: Boolean(
                        row.conductPasswordHash ||
                        row.conductPasswordText ||
                        schedule.conductPasswordHash ||
                        schedule.conductPasswordText
                    ),
                    answeredCount: attempt?.answeredCount || 0,
                    totalQuestions: attempt?.totalQuestions || 0,
                    isSubmitted: Boolean(attempt?.isSubmitted),
                    startedAt: attempt?.startedAt || null,
                    expiresAt: attempt?.expiresAt || null,
                    submittedAt: attempt?.submittedAt || null,
                    lastSavedAt: attempt?.lastSavedAt || null
                };
            }),
            currentStatus: (() => {
                const liveRow = (schedule.timeTable || []).find((row) => getScheduleSubjectWindow(row).status === 'live');
                if (liveRow) return 'live';
                const upcomingRow = (schedule.timeTable || []).find((row) => getScheduleSubjectWindow(row).status === 'upcoming');
                if (upcomingRow) return 'upcoming';
                return 'ended';
            })(),
            currentTime: activeNow.toISOString()
        }));

        res.json({
            student: {
                _id: student._id,
                name: `${student.firstName} ${student.lastName}`.trim(),
                courseName: student.course?.name || ''
            },
            schedules: payload
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Open student exam paper after password verification
// @route   POST /api/student-portal/exam-conduct/:scheduleId/:subjectId/open
// @access  Private (Student)
const openStudentExamConduct = async (req, res) => {
    try {
        const { scheduleId, subjectId } = req.params;
        const password = String(req.body.password || '').trim();
        const student = await Student.findOne({ userId: req.user._id, isDeleted: { $ne: true } })
            .populate({
                path: 'course',
                populate: {
                    path: 'subjects.subject',
                    model: 'Subject'
                }
            });

        if (!student || !student.course?._id) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const schedule = await ExamSchedule.findOne({
            _id: scheduleId,
            isDeleted: false,
            isActive: true,
            course: student.course._id
        })
            .populate('course', 'name shortName')
            .populate('examiner', 'name designation role')
            .populate('timeTable.subject', 'name printedName');

        if (!schedule) {
            return res.status(404).json({ message: 'Exam schedule not found' });
        }

        if (!isStudentInSchedule(schedule, student._id)) {
            return res.status(403).json({ message: 'This exam is not assigned to you' });
        }

        const row = getScheduleSubjectRow(schedule, subjectId);
        if (!row) {
            return res.status(404).json({ message: 'Subject not found in schedule' });
        }

        const rowDateKey = getDateKey(row.date);
        const isExplicitlyPresent = isStudentPresentForScheduleRow(schedule, student._id, rowDateKey);
        const isExplicitlyAbsent = isStudentAbsentForScheduleRow(schedule, student._id, rowDateKey);
        if (isExplicitlyAbsent) {
            return res.status(403).json({ message: 'You have been marked ABSENT for this exam date and cannot attempt the paper.' });
        }
        if (!isExplicitlyPresent) {
            return res.status(403).json({ message: 'Your exam attendance is not marked PRESENT yet. Please contact the examiner.' });
        }

        const window = getScheduleSubjectWindow(row);
        const conductPassword = getEffectiveConductPassword(row, schedule);
        const existingAttempt = await ExamAttempt.findOne({
            schedule: schedule._id,
            subject: subjectId,
            student: student._id
        }).select('+passwordVerifiedSessionIds');

        const existingAccessWindow = getAttemptAccessWindow(existingAttempt, window);
        if (!window.canOpen && !existingAccessWindow.canOpen && !existingAttempt?.isSubmitted) {
            return res.status(400).json({
                message: window.status === 'ended'
                    ? 'This exam time has ended'
                    : 'This exam is not live yet'
            });
        }

        const isAlreadyVerified = isAttemptVerifiedForSession(existingAttempt, req.authSessionId);

        if (!isAlreadyVerified && isPasswordRequiredForConduct(conductPassword)) {
            const passwordCheck = await validateSchedulePassword({
                conductPasswordHash: conductPassword.hash,
                conductPasswordText: conductPassword.text
            }, password);
            if (!passwordCheck.valid) {
                return res.status(passwordCheck.message === 'Password is required' ? 400 : 401).json({ message: passwordCheck.message });
            }
        }

        const paper = await getSchedulePaper(student.course._id, subjectId);
        if (!paper) {
            return res.status(404).json({ message: 'Question paper not found for this subject' });
        }

        const subjectPaper = serializeQuestionPaperSubject(paper, subjectId);
        if (!subjectPaper) {
            return res.status(404).json({ message: 'Question paper subject data not found' });
        }

        let assignedMcqs = existingAttempt?.assignedMcqs || [];
        let assignedQuestionAnswers = existingAttempt?.assignedQuestionAnswers || [];

        // If no assigned questions yet for this student attempt, select 50 random MCQs from Question Bank
        if (assignedMcqs.length === 0) {
            const rawMcqs = subjectPaper.rawMcqs || [];
            const MAX_MCQS = 50;

            const shuffleArray = (arr) => {
                const copy = [...arr];
                for (let i = copy.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [copy[i], copy[j]] = [copy[j], copy[i]];
                }
                return copy;
            };

            const selectedPool = shuffleArray(rawMcqs).slice(0, MAX_MCQS);
            assignedMcqs = selectedPool.map((mcq) => ({
                question: mcq.question || '',
                options: mcq.options || [],
                correctAnswer: mcq.correctAnswer || '',
                marks: Number(mcq.marks) || 1
            }));

            assignedQuestionAnswers = (subjectPaper.rawQuestionAnswers || []).map((qa) => ({
                question: qa.question || '',
                answer: qa.answer || '',
                marks: Number(qa.marks) || 1
            }));
        }

        const totalMcq = assignedMcqs.length;
        const totalQa = assignedQuestionAnswers.length;
        const totalQuestions = totalMcq + totalQa;
        const attemptStartedAt = existingAttempt?.startedAt || new Date();
        const durationMs = getScheduleSubjectDurationMs(row);
        const fullDurationExpiresAt = durationMs > 0
            ? new Date(new Date(attemptStartedAt).getTime() + durationMs)
            : window.endAt;
        const existingExpiresAt = existingAttempt?.expiresAt ? new Date(existingAttempt.expiresAt) : null;
        const personalExpiresAt = existingExpiresAt && existingExpiresAt > fullDurationExpiresAt
            ? existingExpiresAt
            : fullDurationExpiresAt;

        const attempt = await ExamAttempt.findOneAndUpdate(
            {
                schedule: schedule._id,
                subject: subjectId,
                student: student._id
            },
            {
                $setOnInsert: {
                    schedule: schedule._id,
                    course: student.course._id,
                    subject: subjectId,
                    student: student._id,
                    examName: schedule.examName,
                    startedAt: attemptStartedAt,
                    expiresAt: personalExpiresAt
                },
                $set: {
                    assignedMcqs,
                    assignedQuestionAnswers,
                    totalMcq,
                    totalQa,
                    totalQuestions,
                    passwordVerifiedAt: new Date()
                },
                $addToSet: { passwordVerifiedSessionIds: req.authSessionId }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (personalExpiresAt && (!attempt.expiresAt || new Date(attempt.expiresAt) < personalExpiresAt)) {
            attempt.expiresAt = personalExpiresAt;
            await attempt.save();
        }
        const attemptWindow = getAttemptAccessWindow(attempt, window);

        // Map assigned questions for client (without leaking correct answers)
        const clientMcqs = assignedMcqs.map((mcq, index) => ({
            questionId: `mcq-${index + 1}`,
            question: mcq.question || '',
            options: mcq.options || [],
            marks: Number(mcq.marks) || 1
        }));

        const clientQa = assignedQuestionAnswers.map((qa, index) => ({
            questionId: `qa-${index + 1}`,
            question: qa.question || '',
            marks: Number(qa.marks) || 1
        }));

        res.json({
            schedule: {
                _id: schedule._id,
                examName: schedule.examName,
                course: schedule.course,
                examiner: schedule.examiner,
                conductPasswordEnabled: Boolean(schedule.conductPasswordEnabled),
                hasConductPassword: Boolean(schedule.conductPasswordHash || schedule.conductPasswordText),
                timeRow: {
                    subject: row.subject,
                    date: row.date,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    theory: row.theory,
                    practical: row.practical,
                    total: row.total,
                    status: attemptWindow.status,
                    canOpen: attemptWindow.canOpen,
                    startAt: window.startAt,
                    endAt: window.endAt,
                    actualStartedAt: attempt.startedAt,
                    personalExpiresAt: attempt.expiresAt
                }
            },
            paper: {
                _id: paper._id,
                title: paper.title,
                examName: paper.examName,
                course: paper.course,
                subject: subjectPaper.subject,
                duration: subjectPaper.duration,
                mcqs: clientMcqs,
                questionAnswers: clientQa
            },
            attempt: buildAttemptPayload(attempt),
            canEdit: attemptWindow.canOpen && !attempt.isSubmitted,
            status: attemptWindow.status,
            window: attemptWindow
        });
    } catch (error) {
        console.error(error);
        if (error.message === 'Incorrect password') {
            return res.status(401).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Save student exam draft
// @route   POST /api/student-portal/exam-conduct/:scheduleId/:subjectId/save
// @access  Private (Student)
const saveStudentExamConduct = async (req, res) => {
    try {
        const { scheduleId, subjectId } = req.params;
        const { answers = [] } = req.body;

        const student = await Student.findOne({ userId: req.user._id, isDeleted: { $ne: true } })
            .populate('course', 'name shortName');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const schedule = await ExamSchedule.findOne({
            _id: scheduleId,
            isDeleted: false,
            isActive: true,
            course: student.course?._id
        });
        if (!schedule) {
            return res.status(404).json({ message: 'Exam schedule not found' });
        }

        if (!isStudentInSchedule(schedule, student._id)) {
            return res.status(403).json({ message: 'This exam is not assigned to you' });
        }

        const row = getScheduleSubjectRow(schedule, subjectId);
        if (!row) {
            return res.status(404).json({ message: 'Subject not found in schedule' });
        }

        const rowDateKey = getDateKey(row.date);
        if (!isStudentPresentForScheduleRow(schedule, student._id, rowDateKey)) {
            return res.status(403).json({ message: 'Your exam attendance is not marked PRESENT.' });
        }

        const attempt = await ExamAttempt.findOne({
            schedule: schedule._id,
            subject: subjectId,
            student: student._id
        }).select('+passwordVerifiedSessionIds');

        if (!attempt) {
            return res.status(404).json({ message: 'Exam attempt not found. Open the exam first.' });
        }
        const conductPassword = getEffectiveConductPassword(row, schedule);
        if (
            isPasswordRequiredForConduct(conductPassword)
            && !isAttemptVerifiedForSession(attempt, req.authSessionId)
        ) {
            return res.status(401).json({ message: 'Exam password verification required for this login session.' });
        }
        if (attempt.isSubmitted) {
            return res.status(400).json({ message: 'Exam already submitted' });
        }
        if (!attempt.expiresAt || Date.now() > new Date(attempt.expiresAt).getTime()) {
            return res.status(400).json({ message: 'Your full exam duration has ended' });
        }

        const cleanedAnswers = Array.isArray(answers)
            ? answers
                .filter((item) => item && (item.type === 'mcq' || item.type === 'qa'))
                .map((item) => ({
                    type: item.type,
                    questionIndex: Number(item.questionIndex) || 0,
                    selectedOption: String(item.selectedOption || ''),
                    answerText: String(item.answerText || ''),
                    marks: Number(item.marks) || 0,
                    savedAt: new Date()
                }))
            : [];

        attempt.answers = cleanedAnswers;
        attempt.totalQuestions = Number(attempt.totalQuestions) || cleanedAnswers.length;
        attempt.answeredCount = cleanedAnswers.filter((item) =>
            item.type === 'mcq' ? Boolean(item.selectedOption) : Boolean(item.answerText.trim())
        ).length;
        attempt.lastSavedAt = new Date();

        await attempt.save();

        res.json({
            message: 'Draft saved',
            attempt: buildAttemptPayload(attempt)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit student exam
// @route   POST /api/student-portal/exam-conduct/:scheduleId/:subjectId/submit
// @access  Private (Student)
const submitStudentExamConduct = async (req, res) => {
    try {
        const { scheduleId, subjectId } = req.params;

        const student = await Student.findOne({ userId: req.user._id, isDeleted: { $ne: true } })
            .populate('course', 'name shortName');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const schedule = await ExamSchedule.findOne({
            _id: scheduleId,
            isDeleted: false,
            isActive: true,
            course: student.course?._id
        });
        if (!schedule) {
            return res.status(404).json({ message: 'Exam schedule not found' });
        }

        if (!isStudentInSchedule(schedule, student._id)) {
            return res.status(403).json({ message: 'This exam is not assigned to you' });
        }

        const row = getScheduleSubjectRow(schedule, subjectId);
        if (!row) {
            return res.status(404).json({ message: 'Subject not found in schedule' });
        }

        const rowDateKey = getDateKey(row.date);
        if (!isStudentPresentForScheduleRow(schedule, student._id, rowDateKey)) {
            return res.status(403).json({ message: 'Your exam attendance is not marked PRESENT.' });
        }

        const attempt = await ExamAttempt.findOne({
            schedule: schedule._id,
            subject: subjectId,
            student: student._id
        }).select('+passwordVerifiedSessionIds');

        if (!attempt) {
            return res.status(404).json({ message: 'Exam attempt not found. Open the exam first.' });
        }
        const conductPassword = getEffectiveConductPassword(row, schedule);
        if (
            isPasswordRequiredForConduct(conductPassword)
            && !isAttemptVerifiedForSession(attempt, req.authSessionId)
        ) {
            return res.status(401).json({ message: 'Exam password verification required for this login session.' });
        }

        attempt.isSubmitted = true;
        attempt.submittedAt = new Date();
        attempt.lastSavedAt = new Date();
        await attempt.save();

        res.json({
            message: 'Exam submitted successfully',
            attempt: buildAttemptPayload(attempt)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get student syllabus progression
// @route   GET /api/student-portal/syllabus
// @access  Private (Student)
const getStudentSyllabus = async (req, res) => {
    try {
        const student = await getActiveStudentForUser(req.user._id, true);
        if (!student || !student.course) {
            return res.status(404).json({ message: 'Course details not found' });
        }

        const subjects = (student.course.subjects || [])
            .map((item) => item.subject)
            .filter(Boolean);

        const subjectIds = subjects.map((subject) => subject._id);
        const [logs, responses] = await Promise.all([
            SyllabusLog.find({
                studentId: student._id,
                subjectId: { $in: subjectIds },
                isDeleted: false,
            }).sort({ sessionDate: 1, createdAt: 1 }).lean(),
            StudentSyllabusResponse.find({
                studentId: student._id,
                subjectId: { $in: subjectIds },
            }).lean(),
        ]);

        const logsBySubject = new Map();
        logs.forEach((log) => {
            const key = String(log.subjectId);
            if (!logsBySubject.has(key)) logsBySubject.set(key, []);
            logsBySubject.get(key).push(log);
        });

        const responsesBySubject = new Map();
        responses.forEach((response) => {
            const key = String(response.subjectId);
            if (!responsesBySubject.has(key)) responsesBySubject.set(key, []);
            responsesBySubject.get(key).push(response);
        });

        res.json({
            student: {
                _id: student._id,
                name: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim(),
                enrollmentNo: student.enrollmentNo || student.regNo || '',
                courseName: student.course.name || '',
            },
            course: {
                _id: student.course._id,
                name: student.course.name,
                shortName: student.course.shortName,
            },
            subjects: subjects.map((subject) => ({
                _id: subject._id,
                name: subject.name,
                printedName: subject.printedName,
                daysToComplete: subject.daysToComplete || 0,
                chapters: buildChapterProgress(
                    subject,
                    logsBySubject.get(String(subject._id)) || [],
                    responsesBySubject.get(String(subject._id)) || []
                ),
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Save student syllabus understanding response
// @route   POST /api/student-portal/syllabus/ack
// @access  Private (Student)
const saveStudentSyllabusAck = async (req, res) => {
    try {
        const { subjectId, chapterId, projectId, type } = req.body;
        if (!subjectId || !chapterId || !['project', 'theory', 'chapter'].includes(type)) {
            return res.status(400).json({ message: 'Invalid syllabus response request' });
        }
        if (type === 'project' && !projectId) {
            return res.status(400).json({ message: 'projectId is required for project response' });
        }

        const student = await getActiveStudentForUser(req.user._id, false);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const response = await StudentSyllabusResponse.findOneAndUpdate(
            {
                studentId: student._id,
                subjectId,
                chapterId,
                projectId: type === 'project' ? projectId : null,
                type,
            },
            {
                studentId: student._id,
                subjectId,
                chapterId,
                projectId: type === 'project' ? projectId : null,
                type,
                understood: true,
                respondedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Save student chapter comment/review
// @route   POST /api/student-portal/syllabus/comment
// @access  Private (Student)
const saveStudentSyllabusComment = async (req, res) => {
    try {
        const { subjectId, chapterId, comment } = req.body;
        if (!subjectId || !chapterId) {
            return res.status(400).json({ message: 'Invalid chapter comment request' });
        }

        const trimmedComment = String(comment || '').trim().slice(0, 1000);
        if (!trimmedComment) {
            return res.status(400).json({ message: 'Comment is required' });
        }
        const student = await getActiveStudentForUser(req.user._id, false);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const now = new Date();
        let response = await StudentSyllabusResponse.findOne({
            studentId: student._id,
            subjectId,
            chapterId,
            projectId: null,
            type: 'comment',
        });

        if (!response) {
            response = new StudentSyllabusResponse({
                studentId: student._id,
                subjectId,
                chapterId,
                projectId: null,
                type: 'comment',
            });
        }

        if (response.comment && (!response.comments || response.comments.length === 0)) {
            response.comments = [{
                comment: response.comment,
                commentedAt: response.respondedAt || response.updatedAt || response.createdAt || now,
            }];
        }

        response.comment = trimmedComment;
        response.respondedAt = now;
        response.comments.push({ comment: trimmedComment, commentedAt: now });
        await response.save();

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const resetFreeLearningProgress = async (req, res) => {
    try {
        const Student = require('../models/Student');
        const FreeLearningProgress = require('../models/FreeLearningProgress');

        const student = await Student.findOne({ userId: req.user._id, isDeleted: false }).select('_id').lean();
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const result = await FreeLearningProgress.deleteMany({ studentId: student._id });

        res.json({
            message: 'Free learning progress reset successfully',
            removedAttempts: result.deletedCount || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
module.exports = {
    getDashboardStats,
    getCourseDetails,
    submitFeedback,
    getStudyMaterials,
    getFreeLearningQuestions,
    submitFreeLearning,
    getFreeLearningReport,
    resetFreeLearningProgress,
    getStudentFees,
    getStudentExamSchedules,
    getStudentExamConduct,
    openStudentExamConduct,
    saveStudentExamConduct,
    submitStudentExamConduct,
    getStudentSyllabus,
    saveStudentSyllabusAck,
    saveStudentSyllabusComment
};




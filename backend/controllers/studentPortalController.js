const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const Course = require('../models/Course');
const CourseFeedback = require('../models/CourseFeedback');
const moment = require('moment');
const ExamSchedule = require('../models/ExamSchedule');
const SyllabusLog = require('../models/SyllabusLog');
const StudentSyllabusResponse = require('../models/StudentSyllabusResponse');

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
module.exports = {
    getDashboardStats,
    getCourseDetails,
    submitFeedback,
    getStudyMaterials,
    getFreeLearningQuestions,
    submitFreeLearning,
    getFreeLearningReport,
    getStudentFees,
    getStudentExamSchedules,
    getStudentSyllabus,
    saveStudentSyllabusAck,
    saveStudentSyllabusComment
};




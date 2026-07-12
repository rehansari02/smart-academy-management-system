const FreeLearning = require('../models/FreeLearning');
const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const FreeLearningProgress = require('../models/FreeLearningProgress');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// @desc    Create a new question
// @route   POST /api/master/free-learning
// @access  Private (Admin)
const createQuestion = asyncHandler(async (req, res) => {
    const { subject, question, options, correctOption, isActive } = req.body;

    if (!subject || !question || !options || options.length < 2 || correctOption === undefined) {
        res.status(400);
        throw new Error('Please provide subject, question, at least 2 options, and the correct option index');
    }

    const newQuestion = await FreeLearning.create({
        subject,
        question,
        options,
        correctOption,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user._id
    });

    const populatedQuestion = await FreeLearning.findById(newQuestion._id)
        .populate('subject', 'name')
        .populate('createdBy', 'name email');

    res.status(201).json(populatedQuestion);
});

// @desc    Get all questions (Admin with filters)
// @route   GET /api/master/free-learning
// @access  Private (Admin)
const getQuestions = asyncHandler(async (req, res) => {
    const { fromDate, toDate, search, subject } = req.query;
    let query = {};

    // Date Filter
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
             const endDate = new Date(toDate);
             endDate.setHours(23, 59, 59, 999);
             query.createdAt.$lte = endDate;
        }
    }

    // Search Filter
    if (search) {
        query.question = { $regex: search, $options: 'i' };
    }

    if (subject) {
        query.subject = subject;
    }

    const questions = await FreeLearning.find(query)
        .populate('subject', 'name')
        .populate('createdBy', 'name email') // Populate creator details
        .sort({ createdAt: -1 });

    res.json(questions);
});

// @desc    Update a question
// @route   PUT /api/master/free-learning/:id
// @access  Private (Admin)
const updateQuestion = asyncHandler(async (req, res) => {
    const question = await FreeLearning.findById(req.params.id);

    if (!question) {
        res.status(404);
        throw new Error('Question not found');
    }

    const updatedQuestion = await FreeLearning.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
        .populate('subject', 'name')
        .populate('createdBy', 'name email');

    res.json(updatedQuestion);
});

// @desc    Delete a question
// @route   DELETE /api/master/free-learning/:id
// @access  Private (Admin)
const deleteQuestion = asyncHandler(async (req, res) => {
    const question = await FreeLearning.findById(req.params.id);

    if (!question) {
        res.status(404);
        throw new Error('Question not found');
    }

    await question.deleteOne();
    res.json({ id: req.params.id });
});

// @desc    Get subjects that have free learning questions
// @route   GET /api/master/free-learning-report/subjects
// @access  Private (Admin)
const getFreeLearningSubjectsReport = asyncHandler(async (req, res) => {
    const grouped = await FreeLearning.aggregate([
        { $match: { subject: { $ne: null } } },
        {
            $group: {
                _id: '$subject',
                totalQuestions: { $sum: 1 },
                activeQuestions: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                }
            }
        },
        { $sort: { activeQuestions: -1, totalQuestions: -1 } }
    ]);

    const subjectIds = grouped.map((item) => item._id).filter(Boolean);
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name').lean();
    const subjectMap = new Map(subjects.map((subject) => [String(subject._id), subject]));

    const payload = grouped.map((item) => {
        const subject = subjectMap.get(String(item._id));
        return {
            subject: subject ? { _id: subject._id, name: subject.name } : { _id: item._id, name: 'Unknown Subject' },
            totalQuestions: item.totalQuestions,
            activeQuestions: item.activeQuestions
        };
    });

    res.json(payload);
});

// @desc    Get student performance for one free learning subject
// @route   GET /api/master/free-learning-report/subjects/:subjectId
// @access  Private (Admin)
const getFreeLearningSubjectStudentReport = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId).select('name').lean();
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    const courses = await Course.find({
        isDeleted: false,
        'subjects.subject': subjectId
    }).select('name shortName').lean();
    const courseIds = courses.map((course) => course._id);

    const questions = await FreeLearning.find({
        subject: subjectId,
        isActive: true
    }).select('_id').lean();
    const questionIds = questions.map((question) => question._id);
    const questionIdSet = new Set(questionIds.map((id) => String(id)));

    if (!courseIds.length) {
        return res.json({
            subject,
            totalQuestions: questionIds.length,
            students: []
        });
    }

    const students = await Student.find({
        isDeleted: false,
        isCancelled: { $ne: true },
        course: { $in: courseIds }
    })
        .populate('course', 'name shortName')
        .select('firstName middleName lastName enrollmentNo regNo mobileStudent mobileParent course batch')
        .sort({ firstName: 1, lastName: 1 })
        .lean();

    const studentIds = students.map((student) => student._id);
    const progressRecords = await FreeLearningProgress.find({
        studentId: { $in: studentIds },
        'questions.questionId': { $in: questionIds }
    }).select('studentId questions date').lean();

    const statsByStudent = new Map();
    for (const record of progressRecords) {
        const studentKey = String(record.studentId);
        if (!statsByStudent.has(studentKey)) {
            statsByStudent.set(studentKey, {
                attempted: 0,
                correct: 0,
                wrong: 0,
                lastAttemptAt: null
            });
        }

        const stats = statsByStudent.get(studentKey);
        for (const item of record.questions || []) {
            if (!questionIdSet.has(String(item.questionId))) continue;
            stats.attempted += 1;
            if (item.isCorrect) stats.correct += 1;
            else stats.wrong += 1;
            if (!stats.lastAttemptAt || new Date(record.date) > new Date(stats.lastAttemptAt)) {
                stats.lastAttemptAt = record.date;
            }
        }
    }

    const payloadStudents = students.map((student) => {
        const stats = statsByStudent.get(String(student._id)) || {
            attempted: 0,
            correct: 0,
            wrong: 0,
            lastAttemptAt: null
        };

        return {
            _id: student._id,
            name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
            enrollmentNo: student.enrollmentNo || student.regNo || '',
            mobile: student.mobileStudent || student.mobileParent || '',
            course: student.course,
            batch: student.batch,
            totalQuestions: questionIds.length,
            pending: Math.max(questionIds.length - stats.attempted, 0),
            ...stats
        };
    });

    res.json({
        subject,
        courses,
        totalQuestions: questionIds.length,
        students: payloadStudents
    });
});

// Reset one student's attempts for one subject without affecting other subjects.
const resetFreeLearningStudentProgress = asyncHandler(async (req, res) => {
    const { subjectId, studentId } = req.params;
    const questionIds = await FreeLearning.find({ subject: subjectId }).distinct('_id');
    const questionIdSet = new Set(questionIds.map(String));
    const records = await FreeLearningProgress.find({ studentId });
    let removedAttempts = 0;

    for (const record of records) {
        const retainedQuestions = (record.questions || []).filter((item) => {
            const shouldRemove = questionIdSet.has(String(item.questionId));
            if (shouldRemove) removedAttempts += 1;
            return !shouldRemove;
        });
        if (retainedQuestions.length === 0) {
            await record.deleteOne();
        } else if (retainedQuestions.length !== record.questions.length) {
            record.questions = retainedQuestions;
            record.totalScore = retainedQuestions.filter((item) => item.isCorrect).length;
            await record.save();
        }
    }

    res.json({ message: 'Free learning progress reset successfully', removedAttempts });
});

module.exports = {
    createQuestion,
    getQuestions,
    updateQuestion,
    deleteQuestion,
    getFreeLearningSubjectsReport,
    getFreeLearningSubjectStudentReport,
    resetFreeLearningStudentProgress
};

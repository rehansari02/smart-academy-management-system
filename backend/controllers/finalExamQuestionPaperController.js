const asyncHandler = require('express-async-handler');
const FinalExamQuestionPaper = require('../models/FinalExamQuestionPaper');
const Course = require('../models/Course');

const normalizeMcqs = (mcqs = []) => mcqs
    .filter((item) => String(item?.question || '').trim())
    .map((item) => ({
        question: String(item.question).trim(),
        options: (item.options || []).map((option) => String(option || '').trim()).filter(Boolean),
        correctAnswer: String(item.correctAnswer || '').trim(),
        marks: Number(item.marks) || 1
    }));

const normalizeQuestionAnswers = (questions = []) => questions
    .filter((item) => String(item?.question || '').trim())
    .map((item) => ({
        question: String(item.question).trim(),
        answer: String(item.answer || '').trim(),
        marks: Number(item.marks) || 1
    }));

const normalizeSubjects = (subjects = []) => subjects
    .filter((item) => item?.subject)
    .map((item) => ({
        subject: item.subject,
        duration: String(item.duration || '').trim(),
        mcqs: normalizeMcqs(item.mcqs),
        questionAnswers: normalizeQuestionAnswers(item.questionAnswers)
    }));

const getFinalExamQuestionPapers = asyncHandler(async (req, res) => {
    const { courseId, examName, search } = req.query;
    const query = { isDeleted: false };

    if (courseId) query.course = courseId;
    if (examName) query.examName = { $regex: examName, $options: 'i' };
    if (search) query.title = { $regex: search, $options: 'i' };

    const papers = await FinalExamQuestionPaper.find(query)
        .populate('course', 'name shortName')
        .populate('subjects.subject', 'name printedName')
        .sort({ createdAt: -1 });

    res.json(papers);
});

const getFinalExamQuestionPaperById = asyncHandler(async (req, res) => {
    const paper = await FinalExamQuestionPaper.findOne({ _id: req.params.id, isDeleted: false })
        .populate('course', 'name shortName subjects')
        .populate('subjects.subject', 'name printedName');

    if (!paper) {
        res.status(404);
        throw new Error('Question paper not found');
    }

    res.json(paper);
});

const createFinalExamQuestionPaper = asyncHandler(async (req, res) => {
    const { title, examName, course, subjects, remarks, isActive } = req.body;

    if (!title || !course) {
        res.status(400);
        throw new Error('Title and course are required');
    }

    const courseExists = await Course.exists({ _id: course, isDeleted: false });
    if (!courseExists) {
        res.status(400);
        throw new Error('Selected course is invalid');
    }

    const paper = await FinalExamQuestionPaper.create({
        title: String(title).trim(),
        examName: String(examName || 'Final Exam').trim(),
        course,
        subjects: normalizeSubjects(subjects),
        remarks: String(remarks || '').trim(),
        isActive: isActive !== undefined ? isActive : true
    });

    const populated = await FinalExamQuestionPaper.findById(paper._id)
        .populate('course', 'name shortName')
        .populate('subjects.subject', 'name printedName');

    res.status(201).json(populated);
});

const updateFinalExamQuestionPaper = asyncHandler(async (req, res) => {
    const paper = await FinalExamQuestionPaper.findOne({ _id: req.params.id, isDeleted: false });

    if (!paper) {
        res.status(404);
        throw new Error('Question paper not found');
    }

    const { title, examName, course, subjects, remarks, isActive } = req.body;

    if (course) {
        const courseExists = await Course.exists({ _id: course, isDeleted: false });
        if (!courseExists) {
            res.status(400);
            throw new Error('Selected course is invalid');
        }
        paper.course = course;
    }

    if (title !== undefined) paper.title = String(title).trim();
    if (examName !== undefined) paper.examName = String(examName || 'Final Exam').trim();
    if (subjects !== undefined) paper.subjects = normalizeSubjects(subjects);
    if (remarks !== undefined) paper.remarks = String(remarks || '').trim();
    if (isActive !== undefined) paper.isActive = isActive;

    const updated = await paper.save();
    const populated = await FinalExamQuestionPaper.findById(updated._id)
        .populate('course', 'name shortName')
        .populate('subjects.subject', 'name printedName');

    res.json(populated);
});

const deleteFinalExamQuestionPaper = asyncHandler(async (req, res) => {
    const paper = await FinalExamQuestionPaper.findOne({ _id: req.params.id, isDeleted: false });

    if (!paper) {
        res.status(404);
        throw new Error('Question paper not found');
    }

    paper.isDeleted = true;
    await paper.save();

    res.json({ id: req.params.id, message: 'Question paper deleted successfully' });
});

module.exports = {
    getFinalExamQuestionPapers,
    getFinalExamQuestionPaperById,
    createFinalExamQuestionPaper,
    updateFinalExamQuestionPaper,
    deleteFinalExamQuestionPaper
};

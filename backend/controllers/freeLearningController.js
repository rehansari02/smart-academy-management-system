const FreeLearning = require('../models/FreeLearning');
const asyncHandler = require('express-async-handler');

// @desc    Create a new question
// @route   POST /api/master/free-learning
// @access  Private (Admin)
const createQuestion = asyncHandler(async (req, res) => {
    const { question, options, correctOption, isActive } = req.body;

    if (!question || !options || options.length < 2 || correctOption === undefined) {
        res.status(400);
        throw new Error('Please provide question, at least 2 options, and the correct option index');
    }

    const newQuestion = await FreeLearning.create({
        question,
        options,
        correctOption,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user._id
    });

    res.status(201).json(newQuestion);
});

// @desc    Get all questions (Admin with filters)
// @route   GET /api/master/free-learning
// @access  Private (Admin)
const getQuestions = asyncHandler(async (req, res) => {
    const { fromDate, toDate, search } = req.query;
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

    const questions = await FreeLearning.find(query)
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
        { new: true }
    ).populate('createdBy', 'name email');

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

module.exports = {
    createQuestion,
    getQuestions,
    updateQuestion,
    deleteQuestion
};

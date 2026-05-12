const Feedback = require('../models/Feedback');
const asyncHandler = require('express-async-handler');

// @route POST /api/feedback  — Public
const submitFeedback = asyncHandler(async (req, res) => {
    const { name, email, phone, category, rating, message, suggestions } = req.body;
    if (!name || !message) { res.status(400); throw new Error('Name and message are required'); }
    const fb = await Feedback.create({ name, email, phone, category, rating, message, suggestions });
    res.status(201).json({ success: true, message: 'Feedback submitted successfully', data: fb });
});

// @route GET /api/feedback  — Admin
const getAllFeedback = asyncHandler(async (req, res) => {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const feedbacks = await Feedback.find(filter).sort('-createdAt');
    res.json(feedbacks);
});

// @route PUT /api/feedback/:id  — Admin (update status / note)
const updateFeedback = asyncHandler(async (req, res) => {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) { res.status(404); throw new Error('Feedback not found'); }
    if (req.body.status)    fb.status    = req.body.status;
    if (req.body.adminNote !== undefined) fb.adminNote = req.body.adminNote;
    const updated = await fb.save();
    res.json(updated);
});

// @route DELETE /api/feedback/:id  — Admin
const deleteFeedback = asyncHandler(async (req, res) => {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) { res.status(404); throw new Error('Feedback not found'); }
    await fb.deleteOne();
    res.json({ message: 'Deleted' });
});

// @route GET /api/feedback/stats  — Admin
const getFeedbackStats = asyncHandler(async (req, res) => {
    const total   = await Feedback.countDocuments();
    const newCount = await Feedback.countDocuments({ status: 'New' });
    const resolved = await Feedback.countDocuments({ status: 'Resolved' });
    const avgRatingResult = await Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]);
    const avgRating = avgRatingResult[0]?.avg?.toFixed(1) || '0';
    res.json({ total, new: newCount, resolved, avgRating });
});

// @route GET /api/feedback/public-stats  — Public
const getPublicFeedbackStats = asyncHandler(async (req, res) => {
    const total = await Feedback.countDocuments();
    const avgRatingResult = await Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]);
    const avgRating = avgRatingResult[0]?.avg?.toFixed(1) || '0';
    const ratingDist = await Feedback.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
    ]);
    const recent = await Feedback.find().sort('-createdAt').limit(6).select('name rating message category createdAt');
    res.json({ total, avgRating, ratingDist, recent });
});

module.exports = { submitFeedback, getAllFeedback, updateFeedback, deleteFeedback, getFeedbackStats, getPublicFeedbackStats };

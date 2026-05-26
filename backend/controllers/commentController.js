const Comment = require('../models/Comment');
const asyncHandler = require('express-async-handler');

// @desc    Add a comment to a blog
// @route   POST /api/blogs/:blogId/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { blogId } = req.params;

    if (!content) {
        res.status(400);
        throw new Error('Comment content is required');
    }

    const comment = await Comment.create({
        blogId,
        userId: req.user._id,
        userName: req.user.name,
        userPhoto: req.user.photo,
        content
    });

    res.status(201).json(comment);
});

// @desc    Get all comments for a blog
// @route   GET /api/blogs/:blogId/comments
// @access  Public
const getBlogComments = asyncHandler(async (req, res) => {
    const { blogId } = req.params;
    const comments = await Comment.find({ 
        blogId, 
        isDeleted: false,
        isApproved: true 
    }).sort({ createdAt: -1 });
    
    res.json(comments);
});

// @desc    Delete a comment
// @route   DELETE /api/blogs/comments/:id
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    // Only author or admin can delete
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
        res.status(401);
        throw new Error('Not authorized to delete this comment');
    }

    comment.isDeleted = true;
    await comment.save();

    res.json({ message: 'Comment removed' });
});

module.exports = {
    addComment,
    getBlogComments,
    deleteComment
};

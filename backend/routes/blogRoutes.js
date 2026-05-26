const express = require('express');
const router = express.Router();
const { 
    getBlogs, 
    getBlogBySlug, 
    createBlog, 
    updateBlog, 
    deleteBlog 
} = require('../controllers/blogController');
const {
    addComment,
    getBlogComments,
    deleteComment
} = require('../controllers/commentController');
const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Assuming this exists for Multer

router.route('/')
    .get(getBlogs)
    .post(protect, admin, upload.single('image'), createBlog);

router.get('/:slug', getBlogBySlug);

router.route('/:id')
    .put(protect, admin, upload.single('image'), updateBlog)
    .delete(protect, admin, deleteBlog);

// Comment routes
router.route('/:blogId/comments')
    .get(getBlogComments)
    .post(protect, addComment);

router.delete('/comments/:id', protect, deleteComment);

module.exports = router;

const Blog = require('../models/Blog');
const asyncHandler = require('express-async-handler');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
    const blogs = await Blog.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json(blogs);
});

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = asyncHandler(async (req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug, isDeleted: false });
    if (blog) {
        blog.views += 1;
        await blog.save();
        res.json(blog);
    } else {
        res.status(404);
        throw new Error('Blog not found');
    }
});

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
    const { title, content, excerpt, category, tags, isPublished } = req.body;

    if (!title || !content) {
        res.status(400);
        throw new Error('Please provide title and content');
    }

    // Handle image upload if exists
    let image = '';
    if (req.file) {
        image = req.file.path;
    }

    // Generate base slug
    let slug = title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    
    // Check if slug exists
    const slugExists = await Blog.findOne({ slug });
    if (slugExists) {
        slug = `${slug}-${Date.now()}`;
    }

    try {
        const blog = await Blog.create({
            title,
            slug,
            content,
            excerpt,
            category,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            isPublished: isPublished === 'true' || isPublished === true,
            author: req.user._id,
            authorName: req.user.name,
            image
        });
        res.status(201).json(blog);
    } catch (error) {
        res.status(400);
        throw new Error('Failed to create blog: ' + error.message);
    }
});

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    if (blog) {
        if (req.body.title && req.body.title !== blog.title) {
            blog.title = req.body.title;
            // Regenerate slug
            let newSlug = req.body.title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
            const slugExists = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
            if (slugExists) {
                newSlug = `${newSlug}-${Date.now()}`;
            }
            blog.slug = newSlug;
        }
        
        blog.content = req.body.content || blog.content;
        blog.excerpt = req.body.excerpt || blog.excerpt;
        blog.category = req.body.category || blog.category;
        blog.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : blog.isPublished;
        
        if (req.body.tags) {
            blog.tags = req.body.tags.split(',').map(tag => tag.trim());
        }

        if (req.file) {
            blog.image = req.file.path;
        }

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } else {
        res.status(404);
        throw new Error('Blog not found');
    }
});

// @desc    Delete a blog (Soft delete)
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    if (blog) {
        blog.isDeleted = true;
        await blog.save();
        res.json({ message: 'Blog removed' });
    } else {
        res.status(404);
        throw new Error('Blog not found');
    }
});

module.exports = {
    getBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    deleteBlog
};

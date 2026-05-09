const Gallery = require('../models/Gallery');
const asyncHandler = require('express-async-handler');

// @desc    Create new gallery event/album
// @route   POST /api/galleries
// @access  Private
const createGallery = asyncHandler(async (req, res) => {
    const { title, description, category, isActive } = req.body;

    if (!title) { res.status(400); throw new Error('Title is required'); }
    if (!category) { res.status(400); throw new Error('Category is required'); }
    if (!req.files || req.files.length === 0) { res.status(400); throw new Error('At least one image is required'); }
    if (req.files.length > 5) { res.status(400); throw new Error('Maximum 5 images allowed per upload'); }

    const images = req.files.map(f => f.path);

    const gallery = await Gallery.create({
        title,
        description: description || '',
        category,
        images,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    });

    res.status(201).json(gallery);
});

// @desc    Add more images to existing gallery event
// @route   POST /api/galleries/:id/images
// @access  Private
const addImages = asyncHandler(async (req, res) => {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) { res.status(404); throw new Error('Gallery not found'); }

    if (!req.files || req.files.length === 0) { res.status(400); throw new Error('Please upload at least one image'); }
    if (req.files.length > 5) { res.status(400); throw new Error('Maximum 5 images allowed at once'); }

    const newImages = req.files.map(f => f.path);
    gallery.images.push(...newImages);
    await gallery.save();

    res.json(gallery);
});

// @desc    Get all gallery events (Admin)
// @route   GET /api/galleries
// @access  Private
const getGalleries = asyncHandler(async (req, res) => {
    const galleries = await Gallery.find({}).sort('-createdAt');
    res.json(galleries);
});

// @desc    Get distinct active categories
// @route   GET /api/galleries/categories
// @access  Public
const getPublicCategories = asyncHandler(async (req, res) => {
    const cats = await Gallery.distinct('category', { isActive: true });
    res.json(cats);
});

// @desc    Get public gallery events (Active only), optional ?category=
// @route   GET /api/galleries/public
// @access  Public
const getPublicGalleries = asyncHandler(async (req, res) => {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    const galleries = await Gallery.find(filter).sort('-createdAt');
    res.json(galleries);
});

// @desc    Get single gallery event
// @route   GET /api/galleries/:id
// @access  Public
const getGalleryById = asyncHandler(async (req, res) => {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) { res.status(404); throw new Error('Gallery not found'); }
    res.json(gallery);
});

// @desc    Update gallery event info
// @route   PUT /api/galleries/:id
// @access  Private
const updateGallery = asyncHandler(async (req, res) => {
    const { title, description, category, isActive } = req.body;
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) { res.status(404); throw new Error('Gallery not found'); }

    if (title) gallery.title = title;
    if (description !== undefined) gallery.description = description;
    if (category) gallery.category = category;
    if (isActive !== undefined) gallery.isActive = isActive === 'true' || isActive === true;

    const updated = await gallery.save();
    res.json(updated);
});

// @desc    Delete a single image from gallery event
// @route   DELETE /api/galleries/:id/images
// @access  Private
const deleteImage = asyncHandler(async (req, res) => {
    const { imageUrl } = req.body;
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) { res.status(404); throw new Error('Gallery not found'); }

    gallery.images = gallery.images.filter(img => img !== imageUrl);
    await gallery.save();
    res.json(gallery);
});

// @desc    Delete entire gallery event
// @route   DELETE /api/galleries/:id
// @access  Private
const deleteGallery = asyncHandler(async (req, res) => {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) { res.status(404); throw new Error('Gallery not found'); }
    await gallery.deleteOne();
    res.json({ message: 'Gallery event deleted' });
});

module.exports = {
    createGallery,
    addImages,
    getGalleries,
    getPublicGalleries,
    getPublicCategories,
    getGalleryById,
    updateGallery,
    deleteImage,
    deleteGallery
};

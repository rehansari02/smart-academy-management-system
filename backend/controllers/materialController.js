const asyncHandler = require('express-async-handler');
const Material = require('../models/Material');
const fs = require('fs');
const path = require('path');

// @desc    Get all materials with filters
// @route   GET /api/materials
// @access  Private/Public (depending on type)
const getMaterials = asyncHandler(async (req, res) => {
    const { fromDate, toDate, type, searchBy, value, isActive } = req.query;

    let query = {};

    // Date Filter
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endOfDay;
        }
    }

    // Type Filter
    if (type && type !== 'All' && type !== '') {
        query.type = type;
    }
    
    // Search By (Subject Name or Title)
    if (searchBy && value) {
        if (searchBy === 'subject') {
            // This requires a populate query or aggregation, simplified by fetching first or ensuring subject population
            // For now, simpler approach: we populate subject and filter in memory if needed, OR use aggregation
            // Better approach: use regex on title, but for subject we need to find subject IDs first
            // Let's assume searchBy 'title' is direct. 'subject' is trickier without aggregation.
            // We will handle 'title' directly. For subject, we might need a workaround or aggregation.
            // Let's stick to simple text search for now if value is provided.
             if (searchBy === 'title') {
                query.title = { $regex: value, $options: 'i' };
            }
        } else if (value) {
             // Default search if no specific 'searchBy' or general search
             query.title = { $regex: value, $options: 'i' };
        }
    }

    if (isActive) {
        query.isActive = isActive === 'true';
    }

    // Student View Filter (Public + Student accessible)
    if (req.query.studentView === 'true') {
        query.type = { $in: ['Public', 'Student only', 'Student and Faculty only'] };
        query.isActive = true; // Force active only
    }

    let materials = await Material.find(query)
        .populate('subject', 'name')
        .sort({ createdAt: -1 });

    // Post-query filtering for Subject Name if needed
    if (searchBy === 'subject' && value) {
        materials = materials.filter(m => m.subject?.name?.toLowerCase().includes(value.toLowerCase()));
    }

    res.json(materials);
});

// @desc    Create new material
// @route   POST /api/materials
// @access  Private/Admin
const createMaterial = asyncHandler(async (req, res) => {
    const { subject, title, type, description, isActive } = req.body;

    const material = await Material.create({
        subject,
        title,
        type,
        document: req.file ? req.file.path : null,
        description,
        isActive: isActive === 'true' || isActive === true
    });

    res.status(201).json(material);
});

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private/Admin
const updateMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Material not found');
    }

    const { subject, title, type, description, isActive } = req.body;

    material.subject = subject || material.subject;
    material.title = title || material.title;
    material.type = type || material.type;
    material.description = description || material.description;
    // Handle boolean toggle explicitly if passed
    if (isActive !== undefined) material.isActive = isActive;

    if (req.file) {
        // Delete old file if exists
        if (material.document && fs.existsSync(material.document)) {
            // Check if it's a local file (starts with uploads)
            if (material.document.startsWith('uploads')) {
                 try {
                    fs.unlinkSync(material.document);
                } catch (err) {
                    console.error("Error deleting old file:", err);
                }
            }
        }
        material.document = req.file.path;
    }

    const updatedMaterial = await material.save();
    res.json(updatedMaterial);
});

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private/Admin
const deleteMaterial = asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Material not found');
    }

    // Delete file
    if (material.document && fs.existsSync(material.document)) {
         if (material.document.startsWith('uploads')) {
            try {
                fs.unlinkSync(material.document);
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }
    }

    await material.deleteOne();
    res.json({ message: 'Material removed' });
});

module.exports = {
    getMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial
};

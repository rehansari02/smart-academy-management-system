const Complain = require('../models/Complain');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');

// @desc    Submit a new complain
// @route   POST /api/complains
// @access  Private (Student)
const submitComplain = asyncHandler(async (req, res) => {
    const { subject, description } = req.body;

    if (!subject || !description) {
        res.status(400);
        throw new Error('Subject and description are required');
    }

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    const complain = await Complain.create({
        studentId: student._id,
        userId: req.user._id,
        subject,
        description
    });

    res.status(201).json(complain);
});

// @desc    Get student's own complains
// @route   GET /api/complains/my
// @access  Private (Student)
const getMyComplains = asyncHandler(async (req, res) => {
    const complains = await Complain.find({ userId: req.user._id, isDeleted: false })
        .sort({ createdAt: -1 });
    res.json(complains);
});

// @desc    Get all complains (Admin)
// @route   GET /api/complains
// @access  Private/Admin
const getAllComplains = asyncHandler(async (req, res) => {
    const { status, branchId } = req.query;
    let query = { isDeleted: false };

    if (status) query.status = status;
    
    // If branch admin, filter by branch
    if (req.user.role !== 'Super Admin' && req.user.branchId) {
        const studentsInBranch = await Student.find({ branchId: req.user.branchId }).select('_id');
        const studentIds = studentsInBranch.map(s => s._id);
        query.studentId = { $in: studentIds };
    } else if (branchId) {
        const studentsInBranch = await Student.find({ branchId }).select('_id');
        const studentIds = studentsInBranch.map(s => s._id);
        query.studentId = { $in: studentIds };
    }

    const complains = await Complain.find(query)
        .populate({
            path: 'studentId',
            select: 'firstName lastName enrollmentNo regNo mobileStudent branchName'
        })
        .sort({ createdAt: -1 });
    
    res.json(complains);
});

// @desc    Update complain status (Admin)
// @route   PUT /api/complains/:id/status
// @access  Private/Admin
const updateComplainStatus = asyncHandler(async (req, res) => {
    const { status, adminRemark } = req.body;
    const complain = await Complain.findById(req.params.id);

    if (!complain) {
        res.status(404);
        throw new Error('Complain not found');
    }

    complain.status = status || complain.status;
    complain.adminRemark = adminRemark || complain.adminRemark;

    if (status === 'Accepted') {
        complain.acceptedAt = new Date();
    } else if (status === 'Resolved') {
        complain.resolvedAt = new Date();
    }

    const updatedComplain = await complain.save();
    res.json(updatedComplain);
});

// @desc    Delete a complain (Soft delete)
// @route   DELETE /api/complains/:id
// @access  Private/Admin or Owner
const deleteComplain = asyncHandler(async (req, res) => {
    const complain = await Complain.findById(req.params.id);

    if (!complain) {
        res.status(404);
        throw new Error('Complain not found');
    }

    // Only owner or admin can delete
    if (complain.userId.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
        res.status(401);
        throw new Error('Not authorized to delete this complain');
    }

    complain.isDeleted = true;
    await complain.save();

    res.json({ message: 'Complain removed' });
});

module.exports = {
    submitComplain,
    getMyComplains,
    getAllComplains,
    updateComplainStatus,
    deleteComplain
};

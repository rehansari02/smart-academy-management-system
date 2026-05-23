const Contact = require('../models/Contact');
const asyncHandler = require('express-async-handler');

// @desc Submit a new contact form
// @route POST /api/contact
// @access Public
const submitContact = asyncHandler(async (req, res) => {
    const { name, email, phone, state, city, branch, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
        res.status(400);
        throw new Error('Please fill all required fields');
    }
    
    const contact = await Contact.create({
        name, email, phone, state, city, branch, subject, message
    });
    
    if (contact) {
        res.status(201).json({ message: 'Message sent successfully!' });
    } else {
        res.status(400);
        throw new Error('Invalid contact data');
    }
});

// @desc Get contact submissions with pagination & date filter
// @route GET /api/contact
// @access Private/Admin
const getContacts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { startDate, endDate } = req.query;

    // Build filter object
    const filter = {};
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            // Include the entire end day by setting to end of day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }
    
    const count = await Contact.countDocuments(filter);
    const contacts = await Contact.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);
        
    res.json({
        contacts,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
});

// @desc Update contact status
// @route PUT /api/contact/:id
// @access Private/Admin
const updateContactStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const contact = await Contact.findById(req.params.id);
    
    if (contact) {
        contact.status = status || contact.status;
        const updatedContact = await contact.save();
        res.json(updatedContact);
    } else {
        res.status(404);
        throw new Error('Contact not found');
    }
});

// @desc Delete contact submission
// @route DELETE /api/contact/:id
// @access Private/Admin
const deleteContact = asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);
    if (contact) {
        await contact.deleteOne();
        res.json({ message: 'Contact removed' });
    } else {
        res.status(404);
        throw new Error('Contact not found');
    }
});

module.exports = { submitContact, getContacts, updateContactStatus, deleteContact };

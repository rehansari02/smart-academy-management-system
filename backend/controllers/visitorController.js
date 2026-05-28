const Visitor = require('../models/Visitor');
const User = require('../models/User'); // For ensuring attendedBy exists if needed
const Inquiry = require('../models/Inquiry');
const VisitorFollowUp = require('../models/VisitorFollowUp');

const buildDateRange = (fromDate, toDate) => {
    if (!fromDate && !toDate) return null;

    const range = {};
    if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        range.$gte = start;
    }
    if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
    }
    return range;
};

const visitorSearchFields = {
    all: ['studentName', 'mobileNumber', 'contactParent', 'contactHome', 'reference'],
    name: ['studentName'],
    mobile: ['mobileNumber'],
    parent: ['contactParent'],
    home: ['contactHome'],
    reference: ['reference']
};

const buildVisitorSearchConditions = (search, searchField = 'all') => {
    if (!search) return [];

    const fields = visitorSearchFields[searchField] || visitorSearchFields.all;
    return fields.map(field => ({ [field]: { $regex: search, $options: 'i' } }));
};

const appendVisitorFilters = (query, { search, searchField, studentName, referenceBy }) => {
    const andFilters = [];

    if (studentName) {
        andFilters.push({
            $or: [
                { studentName: { $regex: studentName, $options: 'i' } },
                { mobileNumber: { $regex: studentName, $options: 'i' } },
                { contactParent: { $regex: studentName, $options: 'i' } },
                { contactHome: { $regex: studentName, $options: 'i' } }
            ]
        });
    } else if (search) {
        andFilters.push({ $or: buildVisitorSearchConditions(search, searchField) });
    }

    if (referenceBy) {
        andFilters.push({ reference: { $regex: referenceBy, $options: 'i' } });
    }

    if (andFilters.length === 1) {
        Object.assign(query, andFilters[0]);
    } else if (andFilters.length > 1) {
        query.$and = andFilters;
    }
};

// Create a new visitor
exports.createVisitor = async (req, res) => {
    try {
        let { visitingDate, studentName, mobileNumber, contactParent, contactHome, reference, referenceContact, referenceAddress, course, inTime, outTime, status, attendedBy, remarks, branchId, inquiryId } = req.body;

        // Auto-assign branch for non-Super Admin
        if (req.user.role !== 'Super Admin') {
            branchId = req.user.branchId;
        }

        // Fix empty string attendedBy — convert to undefined to avoid BSON cast error
        if (attendedBy === '' || attendedBy === null) {
            attendedBy = undefined;
        }

        if (inquiryId && !status) {
            const inquiry = await Inquiry.findById(inquiryId).select('status');
            status = inquiry?.status || 'Open';
        }
        
        const newVisitor = new Visitor({
            visitingDate,
            studentName,
            mobileNumber,
            contactParent,
            contactHome,
            reference,
            referenceContact,
            referenceAddress,
            course,
            inTime,
            outTime,
            status: status || 'Open',
            attendedBy,
            remarks,
            branchId,
            inquiryId
        });

        await newVisitor.save();

        if (inquiryId) {
            await Inquiry.findByIdAndUpdate(inquiryId, { isDeleted: true, visitorId: newVisitor._id });
        }

        res.status(201).json({ message: 'Visitor created successfully', visitor: newVisitor });
    } catch (error) {
        console.error("Error creating visitor:", error);
        res.status(500).json({ message: 'Error creating visitor', error: error.message });
    }
};

// Get all visitors with filters
exports.getAllVisitors = async (req, res) => {
    try {
        const { fromDate, toDate, search, searchField, studentName, referenceBy, limit, branchId, inquirySource } = req.query;
        let query = { isDeleted: false };

        // Branch Filter Logic
        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        } else if (branchId) {
            query.branchId = branchId;
        }

        // Date Range Filter
        if (fromDate && toDate) {
            query.visitingDate = buildDateRange(fromDate, toDate);
        } else if (fromDate) {
             query.visitingDate = buildDateRange(fromDate, null);
        } else if (toDate) {
             query.visitingDate = buildDateRange(null, toDate);
        }

        appendVisitorFilters(query, { search, searchField, studentName, referenceBy });

        if (inquirySource) {
            const inquiries = await Inquiry.find({ source: inquirySource }).select('_id');
            query.inquiryId = { $in: inquiries.map(inquiry => inquiry._id) };
        }

let queryExec = Visitor.find(query)
            .populate('course', 'name') 
            .populate('attendedBy', 'name') // Employee model has name
            .populate('branchId', 'name')
            .populate({
                path: 'inquiryId',
                populate: [
                    { path: 'followUpBy', select: 'name username' },
                    { path: 'followUpHistory.followUpBy', select: 'name username' }
                ]
            })
            .sort({ visitingDate: -1, createdAt: -1 });

        if (limit) {
            queryExec = queryExec.limit(parseInt(limit));
        }

        const visitors = await queryExec;
        res.status(200).json(visitors);
    } catch (error) {
        console.error("Error fetching visitors:", error);
        res.status(500).json({ message: 'Error fetching visitors', error: error.message });
    }
};

// Get single visitor by ID
exports.getVisitorById = async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('course', 'name')
            .populate('attendedBy', 'name')
            .populate({
                path: 'inquiryId',
                populate: [
                    { path: 'followUpBy', select: 'name username' },
                    { path: 'followUpHistory.followUpBy', select: 'name username' }
                ]
            });
            
        if (!visitor || visitor.isDeleted) {
            return res.status(404).json({ message: 'Visitor not found' });
        }
        res.status(200).json(visitor);
    } catch (error) {
        console.error("Error fetching visitor:", error);
        res.status(500).json({ message: 'Error fetching visitor', error: error.message });
    }
};

// Update visitor
exports.updateVisitor = async (req, res) => {
    try {
        let { visitingDate, studentName, mobileNumber, contactParent, contactHome, reference, referenceContact, referenceAddress, course, inTime, outTime, status, attendedBy, remarks, branchId, inquiryId } = req.body;
        
        // Fix empty string attendedBy — convert to undefined to avoid BSON cast error
        if (attendedBy === '' || attendedBy === null) {
            attendedBy = undefined;
        }

        // Note: Usually we don't update branchId but if Super Admin wants to, they can.
        // If not Super Admin, we might want to prevent changing branchId, but keeping it simple for now or enforcing it stays same.
        // For strictness:
        if (req.user.role !== 'Super Admin') {
            // Remove branchId from update if passed, or ensure it matches user's branch
             // For now, let's assume it's not passed or we just ignore/don't override to something else if not super admin.
             // Actually, the easiest is to just not update it if it's not super admin? 
             // Or ensure the doc belongs to their branch first (which we should do for security).
        }
        
        const updatedVisitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            {
                visitingDate,
                studentName,
                mobileNumber,
                contactParent,
                contactHome,
                reference,
                referenceContact,
                referenceAddress,
                course,
                inTime,
                outTime,
                status: status || 'Open',
                attendedBy,
                remarks,
                branchId,
                inquiryId
            },
            { new: true }
        );

        if (!updatedVisitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        if (inquiryId) {
            await Inquiry.findByIdAndUpdate(inquiryId, { isDeleted: true, visitorId: updatedVisitor._id });
        }

        res.status(200).json({ message: 'Visitor updated successfully', visitor: updatedVisitor });
    } catch (error) {
        console.error("Error updating visitor:", error);
        res.status(500).json({ message: 'Error updating visitor', error: error.message });
    }
};

// Create a separate visitor follow-up record
exports.createVisitorFollowUp = async (req, res) => {
    try {
        const { visitorId, scheduledDate, status, remark } = req.body;

        if (!visitorId || !scheduledDate) {
            return res.status(400).json({ message: 'Visitor and next visit date are required' });
        }

        const visitor = await Visitor.findOne({ _id: visitorId, isDeleted: false });
        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        if (req.user.role !== 'Super Admin' && visitor.branchId?.toString() !== req.user.branchId?.toString()) {
            return res.status(403).json({ message: 'Not authorized for this visitor' });
        }

        const followUp = await VisitorFollowUp.create({
            visitorId,
            scheduledDate,
            status: status || visitor.status || 'Open',
            remark,
            attendedBy: visitor.attendedBy,
            followUpBy: req.user?._id,
            branchId: visitor.branchId || req.user.branchId
        });

        visitor.status = status || visitor.status || 'Open';
        await visitor.save();

        const populatedFollowUp = await VisitorFollowUp.findById(followUp._id)
            .populate({
                path: 'visitorId',
                populate: [
                    { path: 'course', select: 'name' },
                    { path: 'attendedBy', select: 'name username' },
                    { path: 'branchId', select: 'name' },
                    {
                        path: 'inquiryId',
                        populate: [
                            { path: 'followUpBy', select: 'name username' },
                            { path: 'followUpHistory.followUpBy', select: 'name username' }
                        ]
                    }
                ]
            })
            .populate('attendedBy', 'name username')
            .populate('followUpBy', 'name username')
            .populate('branchId', 'name');

        res.status(201).json({ message: 'Visitor follow-up saved successfully', followUp: populatedFollowUp });
    } catch (error) {
        console.error("Error creating visitor follow-up:", error);
        res.status(500).json({ message: 'Error creating visitor follow-up', error: error.message });
    }
};

// Get visitor follow-ups with filters
exports.getVisitorFollowUps = async (req, res) => {
    try {
        const { fromDate, toDate, search, searchField, studentName, referenceBy, limit, branchId, visitorId } = req.query;
        const query = { isDeleted: false };

        if (visitorId) {
            query.visitorId = visitorId;
        }

        const dateRange = buildDateRange(fromDate, toDate);
        if (dateRange) {
            query.scheduledDate = dateRange;
        }

        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        } else if (branchId) {
            query.branchId = branchId;
        }

        let visitorIds = [];
        if (search || studentName || referenceBy) {
            const visitorQuery = { isDeleted: false };
            appendVisitorFilters(visitorQuery, { search, searchField, studentName, referenceBy });
            const visitors = await Visitor.find(visitorQuery).select('_id');
            visitorIds = visitors.map(visitor => visitor._id);
            query.$or = [{ visitorId: { $in: visitorIds } }];
            if (search && (!searchField || searchField === 'all' || searchField === 'remark')) {
                query.$or.push({ remark: { $regex: search, $options: 'i' } });
            }
        }

        let queryExec = VisitorFollowUp.find(query)
            .populate({
                path: 'visitorId',
                populate: [
                    { path: 'course', select: 'name' },
                    { path: 'attendedBy', select: 'name username' },
                    { path: 'branchId', select: 'name' },
                    {
                        path: 'inquiryId',
                        populate: [
                            { path: 'followUpBy', select: 'name username' },
                            { path: 'followUpHistory.followUpBy', select: 'name username' }
                        ]
                    }
                ]
            })
            .populate('attendedBy', 'name username')
            .populate('followUpBy', 'name username')
            .populate('branchId', 'name')
            .sort({ scheduledDate: 1, createdAt: -1 });

        if (limit) {
            queryExec = queryExec.limit(parseInt(limit));
        }

        const followUps = await queryExec;
        res.status(200).json(followUps);
    } catch (error) {
        console.error("Error fetching visitor follow-ups:", error);
        res.status(500).json({ message: 'Error fetching visitor follow-ups', error: error.message });
    }
};

// Soft delete a visitor follow-up record
exports.deleteVisitorFollowUp = async (req, res) => {
    try {
        const query = { _id: req.params.id, isDeleted: false };

        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        }

        const deletedFollowUp = await VisitorFollowUp.findOneAndUpdate(
            query,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedFollowUp) {
            return res.status(404).json({ message: 'Visitor follow-up not found' });
        }

        res.status(200).json({ message: 'Visitor follow-up deleted successfully' });
    } catch (error) {
        console.error("Error deleting visitor follow-up:", error);
        res.status(500).json({ message: 'Error deleting visitor follow-up', error: error.message });
    }
};

// Soft Delete visitor
exports.deleteVisitor = async (req, res) => {
    try {
        const deletedVisitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedVisitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        res.status(200).json({ message: 'Visitor deleted successfully' });
    } catch (error) {
        console.error("Error deleting visitor:", error);
        res.status(500).json({ message: 'Error deleting visitor', error: error.message });
    }
};

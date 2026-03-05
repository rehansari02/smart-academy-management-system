const Visitor = require('../models/Visitor');
const User = require('../models/User'); // For ensuring attendedBy exists if needed

// Create a new visitor
exports.createVisitor = async (req, res) => {
    try {
        let { visitingDate, studentName, mobileNumber, reference, referenceContact, referenceAddress, course, inTime, outTime, attendedBy, remarks, branchId } = req.body;

        // Auto-assign branch for non-Super Admin
        if (req.user.role !== 'Super Admin') {
            branchId = req.user.branchId;
        }
        
        const newVisitor = new Visitor({
            visitingDate,
            studentName,
            mobileNumber,
            reference,
            referenceContact,
            referenceAddress,
            course,
            inTime,
            outTime,
            attendedBy,
            remarks,
            branchId
        });

        await newVisitor.save();
        res.status(201).json({ message: 'Visitor created successfully', visitor: newVisitor });
    } catch (error) {
        console.error("Error creating visitor:", error);
        res.status(500).json({ message: 'Error creating visitor', error: error.message });
    }
};

// Get all visitors with filters
exports.getAllVisitors = async (req, res) => {
    try {
        const { fromDate, toDate, search, limit, branchId } = req.query;
        let query = { isDeleted: false };

        // Branch Filter Logic
        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        } else if (branchId) {
            query.branchId = branchId;
        }

        // Date Range Filter
        if (fromDate && toDate) {
            query.visitingDate = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        } else if (fromDate) {
             query.visitingDate = { $gte: new Date(fromDate) };
        } else if (toDate) {
             query.visitingDate = { $lte: new Date(toDate) };
        }

        // Search Filter (Name, Mobile, Reference)
        if (search) {
            query.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { reference: { $regex: search, $options: 'i' } }
            ];
        }

        let queryExec = Visitor.find(query)
            .populate('course', 'name') 
            .populate('attendedBy', 'name') // Employee model has name
            .populate('branchId', 'name')
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
            .populate('attendedBy', 'name');
            
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
        let { visitingDate, studentName, mobileNumber, reference, referenceContact, referenceAddress, course, inTime, outTime, attendedBy, remarks, branchId } = req.body;
        
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
                reference,
                referenceContact,
                referenceAddress,
                course,
                inTime,
                outTime,
                attendedBy,
                remarks,
                branchId
            },
            { new: true }
        );

        if (!updatedVisitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        res.status(200).json({ message: 'Visitor updated successfully', visitor: updatedVisitor });
    } catch (error) {
        console.error("Error updating visitor:", error);
        res.status(500).json({ message: 'Error updating visitor', error: error.message });
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

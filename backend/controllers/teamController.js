const TeamMember = require('../models/TeamMember');

// Create Team Member
exports.createTeamMember = async (req, res) => {
    try {
        const { name, branch, profession, experience, subjects, isActive } = req.body;
        const image = req.file ? req.file.path : '';

        if (!name || !branch || !profession || !experience) {
            return res.status(400).json({ message: 'Name, branch, profession, and experience are required.' });
        }

        const parsedSubjects = subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim()).filter(Boolean)) : [];

        // Auto-calculate next sortOrder for this branch
        const lastMember = await TeamMember.findOne({ branch })
            .sort({ sortOrder: -1 })
            .select('sortOrder');
        const nextSortOrder = (lastMember?.sortOrder || 0) + 1;

        const member = new TeamMember({
            name,
            image,
            branch,
            profession,
            experience,
            subjects: parsedSubjects,
            sortOrder: nextSortOrder,
            isActive: isActive !== undefined ? isActive : true
        });

        await member.save();
        const populated = await TeamMember.findById(member._id).populate('branch', 'name shortCode');

        res.status(201).json({ message: 'Team member created successfully', teamMember: populated });
    } catch (error) {
        console.error('Error creating team member:', error);
        res.status(500).json({ message: 'Error creating team member', error: error.message });
    }
};

// Get All Team Members (Admin)
exports.getAllTeamMembers = async (req, res) => {
    try {
        const members = await TeamMember.find({ isDeleted: { $ne: true } })
            .populate('branch', 'name shortCode')
            .sort({ sortOrder: 1 });
        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Error fetching team members', error: error.message });
    }
};

// Get Public Team Members (active only, optionally filtered by branch)
exports.getPublicTeamMembers = async (req, res) => {
    try {
        const { branch } = req.query;
        const filter = { isActive: true, isDeleted: { $ne: true } };
        if (branch) filter.branch = branch;

        const members = await TeamMember.find(filter)
            .populate('branch', 'name shortCode')
            .sort({ sortOrder: 1 });
        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching public team members:', error);
        res.status(500).json({ message: 'Error fetching team members', error: error.message });
    }
};

// Get Single Team Member
exports.getTeamMemberById = async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id).populate('branch', 'name shortCode');
        if (!member) return res.status(404).json({ message: 'Team member not found' });
        res.status(200).json(member);
    } catch (error) {
        console.error('Error fetching team member:', error);
        res.status(500).json({ message: 'Error fetching team member', error: error.message });
    }
};

// Update Team Member
exports.updateTeamMember = async (req, res) => {
    try {
        const { name, branch, profession, experience, subjects, isActive, sortOrder } = req.body;
        const updateData = { name, branch, profession, experience };

        if (req.file) {
            updateData.image = req.file.path;
        }

        if (subjects !== undefined) {
            updateData.subjects = Array.isArray(subjects) ? subjects : (typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()).filter(Boolean) : []);
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive === 'true' || isActive === true;
        }

        if (sortOrder !== undefined) {
            const parsed = parseInt(sortOrder, 10);
            if (!isNaN(parsed)) {
                updateData.sortOrder = parsed;
            }
        }

        const updated = await TeamMember.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('branch', 'name shortCode');

        if (!updated) return res.status(404).json({ message: 'Team member not found' });
        res.status(200).json({ message: 'Team member updated successfully', teamMember: updated });
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ message: 'Error updating team member', error: error.message });
    }
};

// Delete Team Member (Soft Delete)
// Delete Team Member (Soft Delete)
exports.deleteTeamMember = async (req, res) => {
    try {
        const deleted = await TeamMember.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );
        if (!deleted) return res.status(404).json({ message: 'Team member not found' });
        res.status(200).json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Error deleting team member', error: error.message });
    }
};

// Update Sort Order
exports.updateSortOrder = async (req, res) => {
    try {
        const { members } = req.body;
        if (!Array.isArray(members)) {
            return res.status(400).json({ message: 'Members array is required' });
        }

        const ops = members.map((m, index) => ({
            updateOne: {
                filter: { _id: m._id },
                update: { $set: { sortOrder: m.sortOrder || index + 1 } }
            }
        }));

        await TeamMember.bulkWrite(ops);
        res.status(200).json({ message: 'Sort order updated successfully' });
    } catch (error) {
        console.error('Error updating sort order:', error);
        res.status(500).json({ message: 'Error updating sort order', error: error.message });
    }
};

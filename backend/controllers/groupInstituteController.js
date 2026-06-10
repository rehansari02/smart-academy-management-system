const GroupInstitute = require('../models/GroupInstitute');

exports.getPublicGroupInstitutes = async (req, res) => {
    try {
        const items = await GroupInstitute.find({ isActive: true }).sort({ createdAt: 1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group institutes', error: error.message });
    }
};

exports.getAllGroupInstitutes = async (req, res) => {
    try {
        const items = await GroupInstitute.find().sort({ createdAt: 1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group institutes', error: error.message });
    }
};

exports.createGroupInstitute = async (req, res) => {
    try {
        const { name, link, isActive } = req.body;
        if (!name || !link) {
            return res.status(400).json({ message: 'Name and link are required' });
        }

        const item = await GroupInstitute.create({ name, link, isActive });
        res.status(201).json({ message: 'Group institute created successfully', item });
    } catch (error) {
        res.status(500).json({ message: 'Error creating group institute', error: error.message });
    }
};

exports.updateGroupInstitute = async (req, res) => {
    try {
        const { name, link, isActive } = req.body;
        if (!name || !link) {
            return res.status(400).json({ message: 'Name and link are required' });
        }

        const item = await GroupInstitute.findByIdAndUpdate(
            req.params.id,
            { name, link, isActive },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: 'Group institute not found' });
        }

        res.status(200).json({ message: 'Group institute updated successfully', item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating group institute', error: error.message });
    }
};

exports.deleteGroupInstitute = async (req, res) => {
    try {
        const item = await GroupInstitute.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Group institute not found' });
        }
        res.status(200).json({ message: 'Group institute deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting group institute', error: error.message });
    }
};

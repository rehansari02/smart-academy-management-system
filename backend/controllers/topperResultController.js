const TopperResult = require('../models/TopperResult');

// Create Topper Result
exports.createTopperResult = async (req, res) => {
    try {
        console.log('Creating topper result:', req.body);
        const { name, course, percentage, isActive } = req.body;
        const image = req.file ? req.file.path : ''; // Cloudinary URL from multer

        if (!name || !course || percentage === undefined) {
            return res.status(400).json({ message: 'Name, course, and percentage are required.' });
        }

        const topper = new TopperResult({ name, course, percentage, image, isActive });
        await topper.save();
        console.log('Topper saved successfully:', topper._id);
        res.status(201).json({ message: 'Topper result created successfully', topper });
    } catch (error) {
        console.error('Error creating topper result:', error);
        res.status(500).json({ message: 'Error creating topper result', error: error.message });
    }
};

// Get All Topper Results (Admin)
exports.getAllTopperResults = async (req, res) => {
    try {
        const toppers = await TopperResult.find({ isDeleted: { $ne: true } }).sort({ percentage: -1, createdAt: -1 });
        console.log(`Fetched ${toppers.length} toppers`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(toppers);
    } catch (error) {
        console.error('Error fetching topper results:', error);
        res.status(500).json({ message: 'Error fetching topper results', error: error.message });
    }
};

// Get Public Topper Results (Homepage - active only)
exports.getPublicTopperResults = async (req, res) => {
    try {
        const toppers = await TopperResult.find({ isDeleted: false, isActive: true }).sort({ percentage: -1 });
        res.status(200).json(toppers);
    } catch (error) {
        console.error('Error fetching public topper results:', error);
        res.status(500).json({ message: 'Error fetching topper results', error: error.message });
    }
};

// Update Topper Result
exports.updateTopperResult = async (req, res) => {
    try {
        const { name, course, percentage, isActive } = req.body;
        const updateData = { name, course, percentage, isActive };
        if (req.file) {
            updateData.image = req.file.path; // New Cloudinary URL
        }

        const updated = await TopperResult.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Topper result not found' });
        res.status(200).json({ message: 'Topper result updated successfully', topper: updated });
    } catch (error) {
        console.error('Error updating topper result:', error);
        res.status(500).json({ message: 'Error updating topper result', error: error.message });
    }
};

// Delete Topper Result (Soft Delete)
exports.deleteTopperResult = async (req, res) => {
    try {
        const deleted = await TopperResult.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );
        if (!deleted) return res.status(404).json({ message: 'Topper result not found' });
        res.status(200).json({ message: 'Topper result deleted successfully' });
    } catch (error) {
        console.error('Error deleting topper result:', error);
        res.status(500).json({ message: 'Error deleting topper result', error: error.message });
    }
};

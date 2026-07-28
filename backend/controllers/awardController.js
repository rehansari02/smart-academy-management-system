const Award = require('../models/Award');

// Create Award
exports.createAward = async (req, res) => {
    try {
        const { title, description, date, isActive } = req.body;
        const award = new Award({
            title,
            description,
            image: req.file ? req.file.path : '',
            date: date ? new Date(date) : undefined,
            isActive: isActive === 'false' ? false : true
        });
        await award.save();
        res.status(201).json({ message: 'Award/Recognition created successfully', award });
    } catch (error) {
        console.error("Error creating award:", error);
        res.status(500).json({ message: 'Error creating award', error: error.message });
    }
};

// Get All Awards
exports.getAllAwards = async (req, res) => {
    try {
        const { search, isActive } = req.query;
        let query = { isDeleted: false };

        if (isActive !== undefined && isActive !== '') {
            query.isActive = isActive === 'true';
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const awards = await Award.find(query).sort({ date: -1, createdAt: -1 });
        res.status(200).json(awards);
    } catch (error) {
        console.error("Error fetching awards:", error);
        res.status(500).json({ message: 'Error fetching awards', error: error.message });
    }
};

// Update Award
exports.updateAward = async (req, res) => {
    try {
        const { title, description, date, isActive } = req.body;
        const updateData = { title, description };
        
        if (date) {
            updateData.date = new Date(date);
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive === 'false' ? false : true;
        }
        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedAward = await Award.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!updatedAward) return res.status(404).json({ message: 'Award not found' });
        res.status(200).json({ message: 'Award updated successfully', award: updatedAward });
    } catch (error) {
        console.error("Error updating award:", error);
        res.status(500).json({ message: 'Error updating award', error: error.message });
    }
};

// Delete Award (Soft Delete)
exports.deleteAward = async (req, res) => {
    try {
        const deletedAward = await Award.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );
        if (!deletedAward) return res.status(404).json({ message: 'Award not found' });
        res.status(200).json({ message: 'Award deleted successfully' });
    } catch (error) {
        console.error("Error deleting award:", error);
        res.status(500).json({ message: 'Error deleting award', error: error.message });
    }
};

const Banner = require('../models/Banner');

// Create Banner
exports.createBanner = async (req, res) => {
    try {
        console.log('Creating banner req.body:', req.body);
        const { title, description, testimonialQuote, isActive, linkUrl, linkLabel } = req.body;
        const image = req.file ? req.file.path : ''; // Cloudinary URL from multer
        const quote = testimonialQuote !== undefined ? testimonialQuote : description;

        if (!image) {
            return res.status(400).json({ message: 'Banner image is required.' });
        }

        const banner = new Banner({
            title: title ? title.trim() : '',
            description: quote ? quote.trim() : '',
            testimonialQuote: quote ? quote.trim() : '',
            image,
            linkUrl: linkUrl ? linkUrl.trim() : '',
            linkLabel: linkLabel ? linkLabel.trim() : '',
            isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
        });
        await banner.save();
        console.log('Banner created in DB:', banner._id, banner);
        res.status(201).json({ message: 'Banner created successfully', banner });
    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({ message: 'Error creating banner', error: error.message });
    }
};

// Get All Banners (Admin)
exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
        console.log(`Fetched ${banners.length} banners`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(banners);
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ message: 'Error fetching banners', error: error.message });
    }
};

// Get Public Banners (Homepage - active only)
exports.getPublicBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isDeleted: false, isActive: true }).sort({ createdAt: -1 });
        res.status(200).json(banners);
    } catch (error) {
        console.error('Error fetching public banners:', error);
        res.status(500).json({ message: 'Error fetching banners', error: error.message });
    }
};

// Update Banner
exports.updateBanner = async (req, res) => {
    try {
        console.log('Updating banner req.body:', req.params.id, req.body);
        const { title, description, testimonialQuote, isActive, linkUrl, linkLabel } = req.body;
        
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (testimonialQuote !== undefined) {
            updateData.testimonialQuote = testimonialQuote.trim();
            updateData.description = testimonialQuote.trim();
        }
        if (linkUrl !== undefined) updateData.linkUrl = linkUrl.trim();
        if (linkLabel !== undefined) updateData.linkLabel = linkLabel.trim();
        if (isActive !== undefined) updateData.isActive = (isActive === 'true' || isActive === true);

        if (req.file) {
            updateData.image = req.file.path; // New Cloudinary URL
        }

        const updated = await Banner.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Banner not found' });
        console.log('Banner updated in DB:', updated._id, updated);
        res.status(200).json({ message: 'Banner updated successfully', banner: updated });
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ message: 'Error updating banner', error: error.message });
    }
};

// Delete Banner (Soft Delete)
exports.deleteBanner = async (req, res) => {
    try {
        const deleted = await Banner.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );
        if (!deleted) return res.status(404).json({ message: 'Banner not found' });
        res.status(200).json({ message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ message: 'Error deleting banner', error: error.message });
    }
};

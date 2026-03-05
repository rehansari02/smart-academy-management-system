const cloudinary = require('cloudinary').v2;
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to extract public ID from URL strictly if needed, 
// but Cloudinary API gives us public_id directly.
// We need to check if a public_id exists in our DB URLs.

exports.getCloudinaryImages = async (req, res) => {
  try {
    // 1. Fetch all resources from Cloudinary
    // max_results default is 10, increasing to 500 for now or implement pagination
    const { next_cursor } = req.query;
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'students_uploads', // Based on uploadMiddleware.js folder
      max_results: 100,
      next_cursor: next_cursor
    });

    const resources = result.resources;

    // 2. Fetch all image URLs from Database
    // We only select the fields we need to optimize performance
    const students = await Student.find({ studentPhoto: { $exists: true, $ne: '' } }).select('studentPhoto');
    const employees = await Employee.find({ photo: { $exists: true, $ne: '' } }).select('photo');

    // 3. Create a Set of all used URLs or Public IDs for O(1) lookup
    // Since DB stores full URLs usually, we need to be careful.
    // Cloudinary URL: https://res.cloudinary.com/demo/image/upload/v132/students_uploads/xyz.jpg
    // Public ID: students_uploads/xyz
    
    // Let's create a Set of "Used" Public IDs derived from DB URLs
    const usedPublicIds = new Set();

    const extractPublicId = (url) => {
        if (!url) return null;
        // Remove query parameters first
        const urlWithoutQuery = url.split('?')[0];
        // Regex to match the part after /upload/v<version>/ or just /upload/
        // and remove extension
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
        const match = urlWithoutQuery.match(regex);
        return match ? match[1] : null;
    };
    students.forEach(s => {
        if (s.studentPhoto) {
            const pid = extractPublicId(s.studentPhoto);
            if (pid) usedPublicIds.add(pid);
        }
    });

    employees.forEach(e => {
        if (e.photo) {
            const pid = extractPublicId(e.photo);
            if (pid) usedPublicIds.add(pid);
        }
    });
    // 4. Map resources to add 'status'
    const processedImages = resources.map(img => {
        const isUsed = usedPublicIds.has(img.public_id);
        return {
            public_id: img.public_id,
            url: img.secure_url,
            format: img.format,
            bytes: img.bytes,
            created_at: img.created_at,
            status: isUsed ? 'Used' : 'Unused'
        };
    });

    res.status(200).json({
        success: true,
        images: processedImages,
        next_cursor: result.next_cursor
    });

  } catch (error) {
    console.error("Error fetching Cloudinary images:", error);
    res.status(500).json({ success: false, message: "Failed to fetch images", error: error.message });
  }
};

exports.deleteCloudinaryImage = async (req, res) => {
    const { public_id } = req.body;

    if (!public_id.startsWith('students_uploads/')) {
        return res.status(403).json({ success: false, message: "Cannot delete images outside allowed folder" });    
    }

    try {
        // Double check usage before delete (Optional but safer)
        // ... skipping for now to rely on frontend/admin judgment, but could be added.

        const result = await cloudinary.uploader.destroy(public_id);

        if (result.result === 'ok') {
            res.status(200).json({ success: true, message: "Image deleted successfully" });
        } else {
            res.status(400).json({ success: false, message: "Failed to delete image", result });
        }

    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ success: false, message: "Server error deleting image", error: error.message });
    }
};

const mongoose = require('mongoose');

const groupInstituteSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        link: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('GroupInstitute', groupInstituteSchema);

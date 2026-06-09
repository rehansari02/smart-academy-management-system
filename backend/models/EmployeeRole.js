const mongoose = require('mongoose');

const employeeRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

employeeRoleSchema.index(
    { name: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('EmployeeRole', employeeRoleSchema);

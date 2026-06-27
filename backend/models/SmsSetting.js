const mongoose = require('mongoose');

const smsSettingSchema = new mongoose.Schema({
    isGlobalEnabled: {
        type: Boolean,
        default: true
    },
    isAdmissionEnabled: {
        type: Boolean,
        default: true
    },
    isFeesEnabled: {
        type: Boolean,
        default: true
    },
    isAttendanceEnabled: {
        type: Boolean,
        default: true
    },
    isInquiryEnabled: {
        type: Boolean,
        default: true
    },
    isExamScheduleEnabled: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('SmsSetting', smsSettingSchema);

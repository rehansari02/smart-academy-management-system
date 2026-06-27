const asyncHandler = require('express-async-handler');
const SmsSetting = require('../models/SmsSetting');
const SmsLog = require('../models/SmsLog');

// @desc Get SMS settings and stats
// @route GET /api/sms/station
// @access Private/SuperAdmin
const getSmsStationData = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, startDate, endDate, search } = req.query;
    
    let setting = await SmsSetting.findOne();
    if (!setting) {
        setting = await SmsSetting.create({ 
            isGlobalEnabled: true,
            isAdmissionEnabled: true,
            isFeesEnabled: true,
            isAttendanceEnabled: true,
            isInquiryEnabled: true,
            isExamScheduleEnabled: true
        });
    } else if (setting.isExamScheduleEnabled === undefined) {
        setting.isExamScheduleEnabled = true;
        await setting.save();
    }

    const stats = {
        totalSent: await SmsLog.countDocuments({ status: 'success' }),
        totalFailed: await SmsLog.countDocuments({ status: 'failed' }),
        totalDisabled: await SmsLog.countDocuments({ status: 'disabled' })
    };
    stats.totalAttempts = stats.totalSent + stats.totalFailed + stats.totalDisabled;
    
    // Build Log Query
    let logQuery = {};
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        logQuery.createdAt = { $gte: start, $lte: end };
    }

    if (search) {
        logQuery.$or = [
            { mobileNumber: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } }
        ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalLogs = await SmsLog.countDocuments(logQuery);
    const recentLogs = await SmsLog.find(logQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    res.json({
        setting,
        stats,
        recentLogs,
        pagination: {
            total: totalLogs,
            pages: Math.ceil(totalLogs / Number(limit)),
            page: Number(page),
            limit: Number(limit)
        }
    });
});

// @desc Update SMS settings
// @route PUT /api/sms/settings
// @access Private/SuperAdmin
const updateSmsSettings = asyncHandler(async (req, res) => {
    const { 
        isGlobalEnabled, 
        isAdmissionEnabled, 
        isFeesEnabled, 
        isAttendanceEnabled, 
        isInquiryEnabled,
        isExamScheduleEnabled
    } = req.body;
    
    let setting = await SmsSetting.findOne();
    if (setting) {
        if (isGlobalEnabled !== undefined) setting.isGlobalEnabled = isGlobalEnabled;
        if (isAdmissionEnabled !== undefined) setting.isAdmissionEnabled = isAdmissionEnabled;
        if (isFeesEnabled !== undefined) setting.isFeesEnabled = isFeesEnabled;
        if (isAttendanceEnabled !== undefined) setting.isAttendanceEnabled = isAttendanceEnabled;
        if (isInquiryEnabled !== undefined) setting.isInquiryEnabled = isInquiryEnabled;
        if (isExamScheduleEnabled !== undefined) setting.isExamScheduleEnabled = isExamScheduleEnabled;
        
        setting.updatedBy = req.user._id;
        await setting.save();
    } else {
        setting = await SmsSetting.create({
            isGlobalEnabled: isGlobalEnabled ?? true,
            isAdmissionEnabled: isAdmissionEnabled ?? true,
            isFeesEnabled: isFeesEnabled ?? true,
            isAttendanceEnabled: isAttendanceEnabled ?? true,
            isInquiryEnabled: isInquiryEnabled ?? true,
            isExamScheduleEnabled: isExamScheduleEnabled ?? true,
            updatedBy: req.user._id
        });
    }

    res.json(setting);
});

module.exports = {
    getSmsStationData,
    updateSmsSettings
};

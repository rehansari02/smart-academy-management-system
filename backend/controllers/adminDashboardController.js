const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Student = require('../models/Student');
const FeeReceipt = require('../models/FeeReceipt');
const Visitor = require('../models/Visitor');

const RECENT_LIST_LIMIT = 5;

const buildRange = ({ period = 'today', fromDate, toDate }) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
    } else if (period === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
        start.setDate(1);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
        if (fromDate) {
            const customStart = new Date(fromDate);
            customStart.setHours(0, 0, 0, 0);
            start.setTime(customStart.getTime());
        }
        if (toDate) {
            const customEnd = new Date(toDate);
            customEnd.setHours(23, 59, 59, 999);
            end.setTime(customEnd.getTime());
        }
    }

    return { start, end };
};

const addBranchScope = (query, field, branchId) => {
    if (branchId) query[field] = branchId;
    return query;
};

const moneySum = async (match) => {
    const result = await FeeReceipt.aggregate([
        { $match: match },
        { $group: { _id: null, amount: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
    ]);
    return result[0] || { amount: 0, count: 0 };
};

const getAdminDashboard = asyncHandler(async (req, res) => {
    const { period = 'today', fromDate, toDate } = req.query;
    let branchId = req.query.branchId || '';

    if (req.user.role !== 'Super Admin') {
        branchId = req.user.branchId;
    }

    const { start, end } = buildRange({ period, fromDate, toDate });
    const dateMatch = { $gte: start, $lte: end };

    const inquiryQuery = addBranchScope({ isDeleted: false, createdAt: dateMatch }, 'branchId', branchId);
    const admissionQuery = addBranchScope({ isDeleted: false, admissionDate: dateMatch }, 'branchId', branchId);
    const registrationQuery = addBranchScope({ isDeleted: false, isRegistered: true, registrationDate: dateMatch }, 'branchId', branchId);
    const visitorQuery = addBranchScope({ isDeleted: false, visitingDate: dateMatch }, 'branchId', branchId);
    const feeQuery = addBranchScope({ date: dateMatch }, 'branch', branchId);

    const admissionFeeQuery = {
        ...feeQuery,
        remarks: { $regex: 'admission', $options: 'i' }
    };
    const registrationFeeQuery = {
        ...feeQuery,
        remarks: { $regex: 'registration', $options: 'i' }
    };

    const [
        inquiryCount,
        admissionCount,
        registrationCount,
        visitorCount,
        feeSummary,
        admissionFeeSummary,
        registrationFeeSummary,
        sourceCounts,
        paymentModeCounts,
        recentInquiries,
        recentAdmissions,
        recentReceipts,
        recentVisitors,
        pendingAdmissionFees,
        pendingRegistrationFees
    ] = await Promise.all([
        Inquiry.countDocuments(inquiryQuery),
        Student.countDocuments(admissionQuery),
        Student.countDocuments(registrationQuery),
        Visitor.countDocuments(visitorQuery),
        moneySum(feeQuery),
        moneySum(admissionFeeQuery),
        moneySum(registrationFeeQuery),
        Inquiry.aggregate([
            { $match: inquiryQuery },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        FeeReceipt.aggregate([
            { $match: feeQuery },
            { $group: { _id: '$paymentMode', count: { $sum: 1 }, amount: { $sum: '$amountPaid' } } },
            { $sort: { amount: -1 } }
        ]),
        Inquiry.find(inquiryQuery)
            .populate('interestedCourse', 'name')
            .populate('branchId', 'name')
            .sort({ createdAt: -1 })
            .limit(RECENT_LIST_LIMIT)
            .lean(),
        Student.find(admissionQuery)
            .populate('course', 'name')
            .populate('branchId', 'name')
            .sort({ admissionDate: -1, createdAt: -1 })
            .limit(RECENT_LIST_LIMIT)
            .lean(),
        FeeReceipt.find(feeQuery)
            .populate('student', 'firstName middleName lastName regNo enrollmentNo')
            .populate('course', 'name')
            .populate('branch', 'name')
            .sort({ date: -1, createdAt: -1 })
            .limit(RECENT_LIST_LIMIT)
            .lean(),
        Visitor.find(visitorQuery)
            .populate('branchId', 'name')
            .populate('course', 'name')
            .sort({ visitingDate: -1, createdAt: -1 })
            .limit(RECENT_LIST_LIMIT)
            .lean(),
        Student.countDocuments(addBranchScope({ isDeleted: false, isAdmissionFeesPaid: false }, 'branchId', branchId)),
        Student.countDocuments(addBranchScope({ isDeleted: false, isRegistered: false }, 'branchId', branchId))
    ]);

    res.json({
        filters: { period, fromDate, toDate, branchId, start, end, recentListLimit: RECENT_LIST_LIMIT },
        cards: {
            inquiries: inquiryCount,
            admissions: admissionCount,
            registrations: registrationCount,
            visitors: visitorCount,
            receipts: feeSummary.count,
            collection: feeSummary.amount,
            admissionFees: admissionFeeSummary.amount,
            registrationFees: registrationFeeSummary.amount,
            pendingAdmissionFees,
            pendingRegistrationFees
        },
        charts: {
            sourceCounts,
            paymentModeCounts
        },
        lists: {
            inquiries: recentInquiries,
            admissions: recentAdmissions,
            receipts: recentReceipts,
            visitors: recentVisitors
        }
    });
});

module.exports = { getAdminDashboard };

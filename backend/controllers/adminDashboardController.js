const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Student = require('../models/Student');
const FeeReceipt = require('../models/FeeReceipt');
const Visitor = require('../models/Visitor');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

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

const normalizeBranchId = (branchId) => {
    if (!branchId) return null;
    if (!mongoose.Types.ObjectId.isValid(branchId)) return false;
    return new mongoose.Types.ObjectId(branchId);
};

const addBranchScope = (query, field, branchObjectId) => {
    if (branchObjectId) query[field] = branchObjectId;
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

    const branchObjectId = normalizeBranchId(branchId);
    if (branchObjectId === false) {
        res.status(400);
        throw new Error('Invalid branch selected');
    }

    const { start, end } = buildRange({ period, fromDate, toDate });
    const dateMatch = { $gte: start, $lte: end };

    const inquiryQuery = addBranchScope({ isDeleted: false, createdAt: dateMatch }, 'branchId', branchObjectId);
    const admissionQuery = addBranchScope({ isDeleted: false, admissionDate: dateMatch }, 'branchId', branchObjectId);
    const registrationQuery = addBranchScope({ isDeleted: false, isRegistered: true, registrationDate: dateMatch }, 'branchId', branchObjectId);
    const visitorQuery = addBranchScope({ isDeleted: false, visitingDate: dateMatch }, 'branchId', branchObjectId);
    const feeQuery = addBranchScope({ date: dateMatch }, 'branch', branchObjectId);
    const expenseQuery = addBranchScope({ date: dateMatch }, 'branch', branchObjectId);

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
        pendingRegistrationFees,
        expenseSummaryResult,
        recentExpenses
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
        Student.countDocuments(addBranchScope({ isDeleted: false, isAdmissionFeesPaid: false }, 'branchId', branchObjectId)),
        Student.countDocuments(addBranchScope({ isDeleted: false, isRegistered: false }, 'branchId', branchObjectId)),
        Expense.aggregate([
            { $match: expenseQuery },
            { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Expense.find(expenseQuery)
            .populate('category', 'name')
            .populate('branch', 'name')
            .sort({ date: -1, createdAt: -1 })
            .limit(RECENT_LIST_LIMIT)
            .lean()
    ]);

    res.json({
        filters: { period, fromDate, toDate, branchId: branchObjectId ? branchObjectId.toString() : '', start, end, recentListLimit: RECENT_LIST_LIMIT },
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
            pendingRegistrationFees,
            totalExpenses: (expenseSummaryResult[0] || { amount: 0 }).amount,
            expenseCount: (expenseSummaryResult[0] || { count: 0 }).count
        },
        charts: {
            sourceCounts,
            paymentModeCounts
        },
        lists: {
            inquiries: recentInquiries,
            admissions: recentAdmissions,
            receipts: recentReceipts,
            visitors: recentVisitors,
            expenses: recentExpenses
        }
    });
});

// @desc    Get Reference Incentive Dashboard Data
// @route   GET /api/admin-dashboard/reference-incentive
const getReferenceIncentive = asyncHandler(async (req, res) => {
    const { period = 'today', fromDate, toDate, reference } = req.query;
    let branchId = req.query.branchId || '';

    // Relaxation: For Reference Incentive, we don't force branchId filter for non-admins 
    // unless they explicitly selected one. Teachers might refer students to other branches.
    // Security is already handled by 'referenceFilter' below.
    if (req.user.role !== 'Super Admin' && !req.query.branchId) {
        branchId = ''; // Ignore user.branchId auto-filter for incentives
    }

    const branchObjectId = normalizeBranchId(branchId);
    if (branchObjectId === false) {
        res.status(400);
        throw new Error('Invalid branch selected');
    }

    const resolveCommissionType = (courseInfo) => {
        const raw = String(courseInfo?.commissionType || '').trim().toLowerCase();
        if (raw === 'percentage' || raw === '%') return 'Percentage';
        if (raw === 'amount' || raw === 'rupee' || raw === 'rs') return 'Amount';
        const commission = Number(courseInfo?.commission || 0);
        return commission > 0 && commission <= 100 ? 'Percentage' : 'Amount';
    };

    const { start, end } = buildRange({ period, fromDate, toDate });
    const dateMatch = { $gte: start, $lte: end };

    // Determine reference scope for non-super admins
    let referenceFilter = { $exists: true, $ne: '', $ne: null, $ne: 'Direct' };
    if (req.user.role !== 'Super Admin') {
        // Only show this user's references
        // We match against full name, first name, or username for better compatibility
        const firstName = req.user.name ? req.user.name.split(' ')[0] : '';
        const searchTerms = [
            req.user.name,
            firstName,
            req.user.username
        ].filter(t => t && t.trim().length > 0)
         .map(t => `^\\s*${t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`); // Escape, anchor and handle spaces
        
        referenceFilter = { $regex: searchTerms.join('|'), $options: 'i' };
    }

    // Get all unique references with aggregation and incentive calculation
    const allRefs = await Student.aggregate([
        {
            $match: {
                isDeleted: false,
                ...(branchObjectId ? { branchId: branchObjectId } : {}),
                reference: referenceFilter
            }
        },
        {
            $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'courseInfo'
            }
        },
        { $unwind: { path: '$courseInfo', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                calculatedIncentive: {
                    $cond: [
                        {
                            $or: [
                                { $eq: ['$courseInfo.commissionType', 'Percentage'] },
                                { $eq: ['$courseInfo.commissionType', '%'] },
                                {
                                    $and: [
                                        { $eq: [{ $ifNull: ['$courseInfo.commissionType', ''] }, ''] },
                                        { $gt: [{ $ifNull: ['$courseInfo.commission', 0] }, 0] },
                                        { $lte: [{ $ifNull: ['$courseInfo.commission', 0] }, 100] }
                                    ]
                                }
                            ]
                        },
                        { $multiply: [{ $divide: [{ $ifNull: ['$courseInfo.commission', 0] }, 100] }, '$totalFees'] },
                        { $ifNull: ['$courseInfo.commission', 0] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: '$reference',
                studentCount: { $sum: 1 },
                admissionCount: {
                    $sum: { $cond: [{ $ne: ['$admissionDate', null] }, 1, 0] }
                },
                registrationCount: {
                    $sum: { $cond: ['$isRegistered', 1, 0] }
                },
                totalFees: { $sum: '$totalFees' },
                pendingFees: { $sum: '$pendingFees' },
                totalIncentive: { $sum: '$calculatedIncentive' },
                pendingIncentive: {
                    $sum: { $cond: [{ $eq: ['$incentiveStatus', 'Paid'] }, 0, '$calculatedIncentive'] }
                },
                paidIncentive: {
                    $sum: { $cond: [{ $eq: ['$incentiveStatus', 'Paid'] }, '$calculatedIncentive', 0] }
                }
            }
        },
        { $sort: { totalIncentive: -1, studentCount: -1 } }
    ]);

    // If a specific reference is selected, get detailed data
    let referenceDetail = null;
    
    // For non-super admins, if they haven't selected a reference, 
    // we can auto-select their own reference to show them data immediately
    let selectedRef = reference;
    if (req.user.role !== 'Super Admin' && !selectedRef) {
        selectedRef = req.user.name;
    }

    if (selectedRef) {
        // If not super admin, ensure they can only see their own details
        let finalReferenceMatch;
        if (req.user.role === 'Super Admin') {
            finalReferenceMatch = { $regex: `^\\s*${selectedRef.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, $options: 'i' };
        } else {
            // Re-use the flexible referenceFilter for non-admins
            finalReferenceMatch = referenceFilter;
        }

        const studentQuery = {
            isDeleted: false,
            reference: finalReferenceMatch,
            ...(branchObjectId ? { branchId: branchObjectId } : {})
        };

        const students = await Student.find(studentQuery)
            .populate('course', 'name duration durationType shortName commission commissionType')
            .populate('branchId', 'name')
            .sort({ admissionDate: -1 })
            .lean();

        // Calculate incentive for each student in the detailed view
        const studentsWithIncentive = students.map(s => {
            let incentive = 0;
            if (s.course) {
                if (resolveCommissionType(s.course) === 'Percentage') {
                    incentive = (s.course.commission / 100) * (s.totalFees || 0);
                } else {
                    incentive = s.course.commission || 0;
                }
            }
            return { ...s, incentive };
        });

        const studentIds = students.map(s => s._id);

        // Get fee receipts for these students
        const receipts = await FeeReceipt.aggregate([
            {
                $match: {
                    student: { $in: studentIds },
                    date: dateMatch
                }
            },
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: '$amountPaid' },
                    receiptCount: { $sum: 1 },
                    admissionPaid: {
                        $sum: {
                            $cond: [
                                { $regexMatch: { input: { $toLower: '$remarks' }, regex: 'admission' } },
                                '$amountPaid',
                                0
                            ]
                        }
                    },
                    registrationPaid: {
                        $sum: {
                            $cond: [
                                { $regexMatch: { input: { $toLower: '$remarks' }, regex: 'registration' } },
                                '$amountPaid',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Get recent receipts for these students (with populate)
        const recentReceipts = await FeeReceipt.find({
            student: { $in: studentIds },
            date: dateMatch
        })
            .populate('student', 'firstName middleName lastName enrollmentNo regNo')
            .sort({ date: -1, createdAt: -1 })
            .limit(10)
            .lean();

        // Monthly trend for this reference's students (admissions by month)
        const monthlyTrend = await Student.aggregate([
            {
                $match: {
                    ...studentQuery,
                    admissionDate: dateMatch
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$admissionDate' },
                        month: { $month: '$admissionDate' }
                    },
                    count: { $sum: 1 },
                    totalFees: { $sum: '$totalFees' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        referenceDetail = {
            students: studentsWithIncentive,
            feeSummary: receipts[0] || { totalPaid: 0, receiptCount: 0, admissionPaid: 0, registrationPaid: 0 },
            recentReceipts,
            monthlyTrend: monthlyTrend.map(t => ({
                label: `${t._id.month}/${t._id.year}`,
                count: t.count,
                fees: t.totalFees
            })),
            summary: {
                studentCount: students.length,
                admissionCount: students.filter(s => s.admissionDate).length,
                registrationCount: students.filter(s => s.isRegistered).length,
                totalFees: students.reduce((sum, s) => sum + (s.totalFees || 0), 0),
                pendingFees: students.reduce((sum, s) => sum + (s.pendingFees || 0), 0),
                totalPaid: (receipts[0] || { totalPaid: 0 }).totalPaid,
                totalIncentive: studentsWithIncentive.reduce((sum, s) => sum + (s.incentive || 0), 0),
                pendingIncentive: studentsWithIncentive.reduce((sum, s) => sum + (s.incentiveStatus === 'Paid' ? 0 : (s.incentive || 0)), 0),
                paidIncentive: studentsWithIncentive.reduce((sum, s) => sum + (s.incentiveStatus === 'Paid' ? (s.incentive || 0) : 0), 0)
            }
        };
    }

    res.json({
        filters: { 
            period, 
            fromDate, 
            toDate, 
            branchId: branchObjectId ? branchObjectId.toString() : '', 
            start, 
            end, 
            reference: reference || (req.user.role !== 'Super Admin' ? req.user.name : '')
        },
        references: allRefs,
        selectedReference: referenceDetail
    });
});

// @desc    Update Student Incentive Status
// @route   PUT /api/admin-dashboard/reference-incentive/update-status
const updateIncentiveStatus = asyncHandler(async (req, res) => {
    const { studentIds, status } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400);
        throw new Error('Please provide student IDs');
    }

    if (!['Pending', 'Paid'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status. Use "Pending" or "Paid"');
    }

    const updateData = {
        incentiveStatus: status,
        incentivePaidAt: status === 'Paid' ? new Date() : null,
        incentivePaidBy: status === 'Paid' ? (req.user.name || req.user.username) : null
    };

    await Student.updateMany(
        { _id: { $in: studentIds } },
        { $set: updateData }
    );

    res.json({ message: `Incentive status updated to ${status} for ${studentIds.length} students` });
});

module.exports = { getAdminDashboard, getReferenceIncentive, updateIncentiveStatus };

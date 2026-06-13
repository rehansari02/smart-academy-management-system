const Visitor = require('../models/Visitor');
const User = require('../models/User'); // For ensuring attendedBy exists if needed
const Inquiry = require('../models/Inquiry');
const VisitorFollowUp = require('../models/VisitorFollowUp');
const Reference = require('../models/Reference');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isDirectReference = (value) => {
    const text = String(value || "").trim().toLowerCase();
    return !text || ["direct", "self", "none", "na", "n/a", "-"].includes(text);
};

const resolveAssignableUserId = async (value) => {
    const raw = typeof value === "object"
        ? value?._id || value?.userAccount?._id || value?.userAccount
        : value;
    const text = String(raw || "").trim();
    if (!text || text === "[object Object]") return null;

    if (mongoose.Types.ObjectId.isValid(text)) {
        const user = await User.findById(text).select("_id").lean();
        if (user?._id) return user._id;

        const employee = await Employee.findOne({ _id: text, isDeleted: false, isActive: true })
            .select("userAccount loginUsername email mobile name")
            .lean();

        if (employee?.userAccount) {
            const linkedUser = await User.findById(employee.userAccount).select("_id").lean();
            if (linkedUser?._id) return linkedUser._id;
        }

        const employeeLogin = [employee?.loginUsername, employee?.email, employee?.mobile, employee?.name]
            .map((item) => String(item || "").trim())
            .filter(Boolean);

        if (employeeLogin.length) {
            const matchedUser = await User.findOne({
                isActive: { $ne: false },
                $or: employeeLogin.flatMap((item) => [
                    { username: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
                    { email: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
                    { name: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
                ]),
            }).select("_id").lean();
            if (matchedUser?._id) return matchedUser._id;
        }
    }

    const matchedUser = await User.findOne({
        isActive: { $ne: false },
        $or: [
            { username: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
            { email: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
            { name: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
        ],
    }).select("_id").lean();

    if (matchedUser?._id) return matchedUser._id;

    const matchedEmployee = await Employee.findOne({
        isDeleted: false,
        isActive: true,
        $or: [
            { name: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
            { loginUsername: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
            { email: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
            { mobile: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
        ],
    }).select("userAccount loginUsername email mobile name").lean();

    if (matchedEmployee?.userAccount) {
        const linkedUser = await User.findById(matchedEmployee.userAccount).select("_id").lean();
        if (linkedUser?._id) return linkedUser._id;
    }

    if (matchedEmployee) {
        const employeeLogin = [matchedEmployee.loginUsername, matchedEmployee.email, matchedEmployee.mobile, matchedEmployee.name]
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        const linkedByEmployee = await User.findOne({
            isActive: { $ne: false },
            $or: employeeLogin.flatMap((item) => [
                { username: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
                { email: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
                { name: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
            ]),
        }).select("_id").lean();
        if (linkedByEmployee?._id) return linkedByEmployee._id;
    }

    return null;
};

const resolveVisitorOwner = async ({ reference, fallbackUserId, isExternalRef }) => {
    // 1. Explicitly marked as external ref from frontend
    if (isExternalRef) return fallbackUserId;

    // 2. Direct/Self reference stays with creator
    if (isDirectReference(reference)) return fallbackUserId;

    const referenceText = String(reference || "").trim();
    if (!referenceText) return fallbackUserId;

    // 3. Try to resolve to a Staff/User account
    const referenceOwner = await resolveAssignableUserId(referenceText);
    if (referenceOwner) return referenceOwner;

    // 4. Check if this name exists in the Reference master (External References)
    const isSavedExternalRef = await Reference.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(referenceText)}$`, "i") },
        isDeleted: false
    }).lean();

    if (isSavedExternalRef) return fallbackUserId;

    return fallbackUserId;
};

const addVisitorOwnershipScope = (query, ownerId) => {
    const ownership = {
        $or: [
            { allocatedTo: ownerId },
            { allocatedTo: { $exists: false }, createdBy: ownerId },
            { allocatedTo: null, createdBy: ownerId },
        ],
    };

    if (query.$or) {
        query.$and = [...(query.$and || []), { $or: query.$or }, ownership];
        delete query.$or;
    } else {
        query.$and = [...(query.$and || []), ownership];
    }
};

const buildDateRange = (fromDate, toDate) => {
    if (!fromDate && !toDate) return null;

    const range = {};
    if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        
        // Adjust for India Timezone (UTC+5:30)
        // If start of day is 2026-06-05T00:00:00.000Z, 
        // it misses records created between 12:00 AM and 5:30 AM local time
        // which are stored as 2026-06-04T18:30:00.000Z to 2026-06-04T23:59:59.000Z
        const now = new Date();
        if (start.toDateString() === now.toDateString()) {
            start.setDate(start.getDate() - 1);
            start.setHours(18, 0, 0, 0); // Catch entries from 11:30 PM previous day UTC (6:00 PM previous day UTC)
        }
        
        range.$gte = start;
    }
    if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
    }
    return range;
};

const visitorSearchFields = {
    all: ['studentName', 'mobileNumber', 'contactParent', 'contactHome', 'reference'],
    name: ['studentName'],
    mobile: ['mobileNumber'],
    parent: ['contactParent'],
    home: ['contactHome'],
    reference: ['reference']
};

const buildVisitorSearchConditions = (search, searchField = 'all') => {
    if (!search) return [];

    const fields = visitorSearchFields[searchField] || visitorSearchFields.all;
    return fields.map(field => ({ [field]: { $regex: search, $options: 'i' } }));
};

const appendVisitorFilters = (query, { search, searchField, studentName, referenceBy }) => {
    const andFilters = [];

    if (studentName) {
        andFilters.push({
            $or: [
                { studentName: { $regex: studentName, $options: 'i' } },
                { mobileNumber: { $regex: studentName, $options: 'i' } },
                { contactParent: { $regex: studentName, $options: 'i' } },
                { contactHome: { $regex: studentName, $options: 'i' } }
            ]
        });
    } else if (search) {
        andFilters.push({ $or: buildVisitorSearchConditions(search, searchField) });
    }

    if (referenceBy) {
        andFilters.push({ reference: { $regex: referenceBy, $options: 'i' } });
    }

    if (andFilters.length === 1) {
        Object.assign(query, andFilters[0]);
    } else if (andFilters.length > 1) {
        query.$and = andFilters;
    }
};

const normalizeOptionalObjectId = (value) => {
    if (value === '' || value === null || value === undefined || value === 'null' || value === 'undefined') {
        return undefined;
    }

    return value;
};

// Create a new visitor
exports.createVisitor = async (req, res) => {
    try {
        let { visitingDate, studentName, mobileNumber, contactParent, contactHome, address, reference, referenceContact, referenceAddress, course, inTime, outTime, status, attendedBy, remarks, branchId, inquiryId, isExternalRef, allocatedTo: assignedTo } = req.body;

        // Auto-assign branch for non-Super Admin
        if (req.user.role !== 'Super Admin') {
            branchId = req.user.branchId;
        }

        // Normalize visitingDate to start of day in UTC to avoid time-of-day filtering issues
        // If visitingDate is "2026-06-05", new Date("2026-06-05") creates 2026-06-05T00:00:00.000Z
        if (visitingDate) {
            const vDate = new Date(visitingDate);
            vDate.setHours(0, 0, 0, 0);
            visitingDate = vDate;
        } else {
            // Default to current day start if not provided
            const vDate = new Date();
            vDate.setHours(0, 0, 0, 0);
            visitingDate = vDate;
        }

        // Fix empty string attendedBy — convert to undefined to avoid BSON cast error
        if (attendedBy === '' || attendedBy === null) {
            attendedBy = undefined;
        }

        course = normalizeOptionalObjectId(course);
        branchId = normalizeOptionalObjectId(branchId);
        inquiryId = normalizeOptionalObjectId(inquiryId);

        if (inquiryId) {
            const inquiry = await Inquiry.findById(inquiryId).select('status referenceBy referenceDetail isExternalRef');
            status = inquiry?.status || 'Open';
            if (req.user.role !== 'Super Admin') {
                reference = inquiry?.referenceBy || inquiry?.referenceDetail?.name || reference || 'Direct';
                referenceContact = inquiry?.referenceDetail?.mobile || referenceContact;
                referenceAddress = inquiry?.referenceDetail?.address || referenceAddress;
                isExternalRef = inquiry?.isExternalRef === true;
            }
        }

        // Resolve Ownership
        const creatorId = req.user._id;
        const allocatedTo = await resolveVisitorOwner({
            reference,
            fallbackUserId: creatorId,
            isExternalRef: isExternalRef === 'true' || isExternalRef === true
        });
        
        const newVisitor = new Visitor({
            visitingDate,
            studentName,
            mobileNumber,
            contactParent,
            contactHome,
            address,
            reference,
            referenceContact,
            referenceAddress,
            course,
            inTime,
            outTime,
            status: status || 'Open',
            attendedBy,
            remarks,
            branchId,
            inquiryId,
            createdBy: creatorId,
            allocatedTo,
            isExternalRef: isExternalRef === 'true' || isExternalRef === true
        });

        await newVisitor.save();

        if (inquiryId) {
            await Inquiry.findByIdAndUpdate(inquiryId, { isDeleted: true, visitorId: newVisitor._id });
        }

        res.status(201).json({ message: 'Visitor created successfully', visitor: newVisitor });
    } catch (error) {
        console.error("Error creating visitor:", error);
        res.status(500).json({ message: 'Error creating visitor', error: error.message });
    }
};

// Get all visitors with filters
exports.getAllVisitors = async (req, res) => {
    try {
        const { fromDate, toDate, search, searchField, studentName, referenceBy, limit, branchId, inquirySource, employeeId, allocatedTo, onlyWithFollowups, excludeFollowedVisitors, scope, status, dateFilterType } = req.query;
        let query = { isDeleted: false };
        const isAdmissionLookup = scope === 'admission' || req.query.forAdmission === 'true';
        const dateRange = buildDateRange(fromDate, toDate);

        // Branch Filter Logic
        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        } else if (branchId) {
            query.branchId = branchId;
        }

        // Date Range Filter
        if (dateFilterType !== 'followUpDate' && dateFilterType !== 'callingDate') {
            if (fromDate && toDate) {
                query.visitingDate = dateRange;
            } else if (fromDate) {
                 query.visitingDate = buildDateRange(fromDate, null);
            } else if (toDate) {
                 query.visitingDate = buildDateRange(null, toDate);
            }
        }

        appendVisitorFilters(query, { search, searchField, studentName, referenceBy });

        // Status Filter: By default hide Close/Complete visitors
        // User must explicitly pass status=Close or status=Complete to see them
        if (status) {
            query.status = status;
        } else if (!isAdmissionLookup) {
            query.status = { $nin: ["Close", "Complete"] };
        }

        if (inquirySource) {
            const inquiries = await Inquiry.find({ source: inquirySource }).select('_id');
            query.inquiryId = { $in: inquiries.map(inquiry => inquiry._id) };
        }

        const isRestrictedRole = !["Super Admin", "Branch Director", "Branch Admin"].includes(req.user.role);

        // Employee/Allocation Filter
        const targetEmployee = isRestrictedRole && !isAdmissionLookup ? req.user._id : (employeeId || allocatedTo);
        if (targetEmployee) {
            const employeeUserId = await resolveAssignableUserId(targetEmployee);
            if (employeeUserId) {
                addVisitorOwnershipScope(query, employeeUserId);
            } else {
                query._id = { $exists: false }; // No matches
            }
        }

        if (req.user && isRestrictedRole && !targetEmployee && !isAdmissionLookup) {
            addVisitorOwnershipScope(query, req.user._id);
        }

        // --- External Reference Privacy ---
        // If not Super Admin/Director/Admin, inquiries marked as External Reference are only visible to the owner/creator
        // Bypass for admission lookup to allow matching, but ensure sensitive data is handled in frontend
        if (req.user && isRestrictedRole && !isAdmissionLookup) {
            const privacyQuery = {
                $or: [
                    { isExternalRef: { $ne: true } }, // Show if not external ref
                    { createdBy: req.user._id },      // OR if I created it
                    { allocatedTo: req.user._id }      // OR if it's allocated to me
                ]
            };

            if (query.$and) {
                query.$and.push(privacyQuery);
            } else if (query.$or) {
                const existingOr = query.$or;
                delete query.$or;
                query.$and = [{ $or: existingOr }, privacyQuery];
            } else {
                query.$and = [privacyQuery];
            }
        }

        // Requirement: show visitor rows by follow-up schedule date when requested
        if (dateFilterType === 'followUpDate' || dateFilterType === 'callingDate' || onlyWithFollowups === 'true') {
            const followupQuery = { isDeleted: false };

            if (dateFilterType === 'followUpDate' && dateRange) {
                followupQuery.isDone = { $ne: true };
                followupQuery.scheduledDate = dateRange;
            } else if (dateFilterType === 'callingDate' && dateRange) {
                followupQuery.isDone = true;
                followupQuery.$or = [
                    { callingDate: dateRange },
                ];
            }

            if (branchId && req.user.role === 'Super Admin') {
                followupQuery.branchId = branchId;
            } else if (req.user.role !== 'Super Admin') {
                followupQuery.branchId = req.user.branchId;
            }

            const followups = await VisitorFollowUp.find(followupQuery).select('visitorId').lean();
            const visitorIdsWithFollowups = [...new Set(followups.map(f => f.visitorId.toString()))];
            if (visitorIdsWithFollowups.length) {
                query._id = { ...query._id, $in: visitorIdsWithFollowups };
            } else {
                query._id = { $in: [] };
            }
        }

        let queryExec = Visitor.find(query)
            .populate('course', 'name') 
            .populate('attendedBy', 'name') 
            .populate('branchId', 'name')
            .populate('allocatedTo', 'name username role')
            .populate('createdBy', 'name username role')
            .populate({
                path: 'inquiryId',
                populate: [
                    { path: 'followUpBy', select: 'name username' },
                    { path: 'followUpHistory.followUpBy', select: 'name username' }
                ]
            })
            .sort({ visitingDate: -1, createdAt: -1 });

        if (limit) {
            queryExec = queryExec.limit(parseInt(limit));
        }

        const visitors = await queryExec;

        // Fetch latest follow-up for each visitor to show "Handled By" details
        const visitorIds = visitors.map(v => v._id);
        const latestFollowups = await VisitorFollowUp.find({
            visitorId: { $in: visitorIds },
            isDeleted: false
        })
        .sort({ scheduledDate: -1, createdAt: -1 })
        .populate('followUpBy', 'name username')
        .lean();

        const visitorsWithLatestFollowup = visitors.map(v => {
            const visitorObj = v.toObject();
            // Find the most recent followup for this visitor
            visitorObj.latestFollowup = latestFollowups.find(f => f.visitorId.toString() === v._id.toString());
            return visitorObj;
        });

        const shouldExcludeFollowedVisitors = excludeFollowedVisitors === 'true';
        const filteredVisitors = shouldExcludeFollowedVisitors
            ? visitorsWithLatestFollowup.filter((visitor) => {
                const hasFollowup = Boolean(visitor.latestFollowup);
                return !hasFollowup;
            })
            : visitorsWithLatestFollowup;

        res.status(200).json(filteredVisitors);
    } catch (error) {
        console.error("Error fetching visitors:", error);
        res.status(500).json({ message: 'Error fetching visitors', error: error.message });
    }
};

// Get single visitor by ID
exports.getVisitorById = async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('course', 'name')
            .populate('attendedBy', 'name')
            .populate({
                path: 'inquiryId',
                populate: [
                    { path: 'followUpBy', select: 'name username' },
                    { path: 'followUpHistory.followUpBy', select: 'name username' }
                ]
            });
            
        if (!visitor || visitor.isDeleted) {
            return res.status(404).json({ message: 'Visitor not found' });
        }
        res.status(200).json(visitor);
    } catch (error) {
        console.error("Error fetching visitor:", error);
        res.status(500).json({ message: 'Error fetching visitor', error: error.message });
    }
};

// Update visitor
exports.updateVisitor = async (req, res) => {
    try {
        let { visitingDate, studentName, mobileNumber, contactParent, contactHome, address, reference, referenceContact, referenceAddress, course, inTime, outTime, status, attendedBy, remarks, branchId, inquiryId, isExternalRef, allocatedTo: assignedTo } = req.body;
        
        // Fix empty string attendedBy — convert to undefined to avoid BSON cast error
        if (attendedBy === '' || attendedBy === null) {
            attendedBy = undefined;
        }

        course = normalizeOptionalObjectId(course);
        branchId = normalizeOptionalObjectId(branchId);
        inquiryId = normalizeOptionalObjectId(inquiryId);

        const visitor = await Visitor.findById(req.params.id);
        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }
        const existingReference = String(visitor.reference || '').trim();
        const canChangeReference = req.user.role === 'Super Admin' || !existingReference;

        // Update basic fields
        if (visitingDate) {
            const vDate = new Date(visitingDate);
            vDate.setHours(0, 0, 0, 0);
            visitor.visitingDate = vDate;
        }
        visitor.studentName = studentName || visitor.studentName;
        visitor.mobileNumber = mobileNumber || visitor.mobileNumber;
        visitor.contactParent = contactParent || visitor.contactParent;
        visitor.contactHome = contactHome || visitor.contactHome;
        visitor.address = address || visitor.address;
        if (canChangeReference) {
            visitor.reference = reference || visitor.reference;
            visitor.referenceContact = referenceContact || visitor.referenceContact;
            visitor.referenceAddress = referenceAddress || visitor.referenceAddress;
        }
        visitor.course = course || visitor.course;
        visitor.inTime = inTime || visitor.inTime;
        visitor.outTime = outTime || visitor.outTime;
        visitor.status = status || visitor.status;
        visitor.attendedBy = attendedBy || visitor.attendedBy;
        visitor.remarks = remarks || visitor.remarks;
        visitor.branchId = branchId || visitor.branchId;
        visitor.inquiryId = inquiryId || visitor.inquiryId;

        if (assignedTo !== undefined) {
            visitor.allocatedTo = await resolveAssignableUserId(assignedTo) || visitor.allocatedTo;
        }

        if (isExternalRef !== undefined && canChangeReference) {
            visitor.isExternalRef = isExternalRef === 'true' || isExternalRef === true;
        }

        if (req.user.role !== 'Super Admin') {
            if (existingReference) {
                reference = undefined;
            }

            if (visitor.inquiryId || inquiryId) {
                const lockedInquiryId = inquiryId || visitor.inquiryId;
                const inquiry = await Inquiry.findById(lockedInquiryId).select('referenceBy referenceDetail isExternalRef');
                if (inquiry) {
                    visitor.reference = inquiry.referenceBy || inquiry.referenceDetail?.name || visitor.reference || 'Direct';
                    visitor.referenceContact = inquiry.referenceDetail?.mobile || visitor.referenceContact;
                    visitor.referenceAddress = inquiry.referenceDetail?.address || visitor.referenceAddress;
                    visitor.isExternalRef = inquiry.isExternalRef === true;
                }
            }
        }

        // Re-resolve ownership if reference changed
        if (reference && req.user.role === 'Super Admin') {
            visitor.allocatedTo = await resolveVisitorOwner({
                reference,
                fallbackUserId: visitor.createdBy || req.user._id,
                isExternalRef: visitor.isExternalRef
            });
        } else if (req.user.role !== 'Super Admin' && (visitor.reference || reference)) {
            visitor.allocatedTo = await resolveVisitorOwner({
                reference: visitor.reference || reference,
                fallbackUserId: visitor.createdBy || req.user._id,
                isExternalRef: visitor.isExternalRef
            });
        }

        await visitor.save();

        if (inquiryId) {
            await Inquiry.findByIdAndUpdate(inquiryId, { isDeleted: true, visitorId: visitor._id });
        }

        res.status(200).json({ message: 'Visitor updated successfully', visitor });
    } catch (error) {
        console.error("Error updating visitor:", error);
        res.status(500).json({ message: 'Error updating visitor', error: error.message });
    }
};

// Create a separate visitor follow-up record
exports.createVisitorFollowUp = async (req, res) => {
    try {
        const { visitorId, scheduledDate, status, remark, followUpId } = req.body;

        if (!visitorId || !scheduledDate) {
            return res.status(400).json({ message: 'Visitor and next visit date are required' });
        }

        const visitor = await Visitor.findOne({ _id: visitorId, isDeleted: false });
        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        if (req.user.role !== 'Super Admin' && visitor.branchId?.toString() !== req.user.branchId?.toString()) {
            return res.status(403).json({ message: 'Not authorized for this visitor' });
        }

        let followUp;
        if (followUpId) {
            followUp = await VisitorFollowUp.findOneAndUpdate(
                {
                    _id: followUpId,
                    visitorId,
                    isDeleted: false,
                    ...(req.user.role !== 'Super Admin' ? { branchId: req.user.branchId } : {})
                },
                {
                    callingDate: new Date(),
                    status: status || visitor.status || 'Open',
                    remark,
                    attendedBy: visitor.attendedBy,
                    followUpBy: req.user?._id,
                    branchId: visitor.branchId || req.user.branchId,
                    isDone: true
                },
                { new: true }
            );

            if (!followUp) {
                return res.status(404).json({ message: 'Visitor follow-up not found' });
            }

            await VisitorFollowUp.create({
                visitorId,
                scheduledDate,
                status: status || visitor.status || 'Open',
                remark,
                attendedBy: visitor.attendedBy,
                followUpBy: req.user?._id,
                branchId: visitor.branchId || req.user.branchId,
                isDone: false
            });
        } else {
            followUp = await VisitorFollowUp.create({
                visitorId,
                scheduledDate,
                status: status || visitor.status || 'Open',
                remark,
                attendedBy: visitor.attendedBy,
                followUpBy: req.user?._id,
                branchId: visitor.branchId || req.user.branchId,
                isDone: false
            });
        }

        visitor.status = status || visitor.status || 'Open';
        await visitor.save();

        const populatedFollowUp = await VisitorFollowUp.findById(followUp._id)
            .populate({
                path: 'visitorId',
                populate: [
                    { path: 'course', select: 'name' },
                    { path: 'attendedBy', select: 'name username' },
                    { path: 'branchId', select: 'name' },
                    {
                        path: 'inquiryId',
                        populate: [
                            { path: 'followUpBy', select: 'name username' },
                            { path: 'followUpHistory.followUpBy', select: 'name username' }
                        ]
                    }
                ]
            })
            .populate('attendedBy', 'name username')
            .populate('followUpBy', 'name username')
            .populate('branchId', 'name');

        res.status(201).json({ message: 'Visitor follow-up saved successfully', followUp: populatedFollowUp });
    } catch (error) {
        console.error("Error creating visitor follow-up:", error);
        res.status(500).json({ message: 'Error creating visitor follow-up', error: error.message });
    }
};

// Get visitor follow-ups with filters
exports.getVisitorFollowUps = async (req, res) => {
    try {
        const { fromDate, toDate, search, searchField, studentName, referenceBy, limit, branchId, visitorId, employeeId, dateFilterType } = req.query;
        const query = { isDeleted: false };

        if (visitorId) {
            query.visitorId = visitorId;
        }

        if (employeeId) {
            const employeeUserId = await resolveAssignableUserId(employeeId);
            if (employeeUserId) {
                query.followUpBy = employeeUserId;
            } else {
                query._id = { $exists: false }; // No matches
            }
        }

        const dateRange = buildDateRange(fromDate, toDate);
        if (dateRange) {
            if (dateFilterType === 'callingDate') {
                query.isDone = true;
                query.callingDate = dateRange;
            } else {
                query.isDone = { $ne: true };
                query.scheduledDate = dateRange;
            }
        }

        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        } else if (branchId) {
            query.branchId = branchId;
        }

        let visitorIds = [];
        if (search || studentName || referenceBy) {
            const visitorQuery = { isDeleted: false };
            appendVisitorFilters(visitorQuery, { search, searchField, studentName, referenceBy });
            const visitors = await Visitor.find(visitorQuery).select('_id');
            visitorIds = visitors.map(visitor => visitor._id);
            query.$or = [{ visitorId: { $in: visitorIds } }];
            if (search && (!searchField || searchField === 'all' || searchField === 'remark')) {
                query.$or.push({ remark: { $regex: search, $options: 'i' } });
            }
        }

        let queryExec = VisitorFollowUp.find(query)
            .populate({
                path: 'visitorId',
                populate: [
                    { path: 'course', select: 'name' },
                    { path: 'attendedBy', select: 'name username' },
                    { path: 'branchId', select: 'name' },
                    {
                        path: 'inquiryId',
                        populate: [
                            { path: 'followUpBy', select: 'name username' },
                            { path: 'followUpHistory.followUpBy', select: 'name username' }
                        ]
                    }
                ]
            })
            .populate('attendedBy', 'name username')
            .populate('followUpBy', 'name username')
            .populate('branchId', 'name')
            .sort({ scheduledDate: 1, createdAt: -1 });

        if (limit) {
            queryExec = queryExec.limit(parseInt(limit));
        }

        const followUps = await queryExec;
        const followUpsWithCallingDate = followUps.map((followUp) => {
            const item = followUp.toObject ? followUp.toObject() : { ...followUp };
            item.callingDate = item.isDone ? (item.callingDate || null) : null;
            return item;
        });
        res.status(200).json(followUpsWithCallingDate);
    } catch (error) {
        console.error("Error fetching visitor follow-ups:", error);
        res.status(500).json({ message: 'Error fetching visitor follow-ups', error: error.message });
    }
};

// Soft delete a visitor follow-up record
exports.deleteVisitorFollowUp = async (req, res) => {
    try {
        const query = { _id: req.params.id, isDeleted: false };

        if (req.user.role !== 'Super Admin') {
            query.branchId = req.user.branchId;
        }

        const deletedFollowUp = await VisitorFollowUp.findOneAndUpdate(
            query,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedFollowUp) {
            return res.status(404).json({ message: 'Visitor follow-up not found' });
        }

        res.status(200).json({ message: 'Visitor follow-up deleted successfully' });
    } catch (error) {
        console.error("Error deleting visitor follow-up:", error);
        res.status(500).json({ message: 'Error deleting visitor follow-up', error: error.message });
    }
};

// Get Visitor follow-up statistics
exports.getVisitorFollowUpStats = async (req, res) => {
    try {
        const { fromDate, toDate, branchId, employeeId } = req.query;

        // Date Range for "New" visitors and followups performed
        const start = fromDate ? new Date(fromDate) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = toDate ? new Date(toDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const canViewBranchWideVisitors = ["Super Admin", "Branch Director", "Branch Admin"].includes(req.user.role);
        const baseQuery = { isDeleted: false };
        if (req.user.role !== 'Super Admin' && req.user.branchId) {
            baseQuery.branchId = req.user.branchId;
        } else if (branchId) {
            baseQuery.branchId = branchId;
        }

        let employeeUserId = null;
        const rangeVisitorQuery = { ...baseQuery };
        const followupVisitorQuery = { ...baseQuery };

        if (employeeId && canViewBranchWideVisitors) {
            employeeUserId = await resolveAssignableUserId(employeeId);
            if (!employeeUserId) {
                return res.status(200).json({
                    totalInquiries: 0,
                    openCount: 0,
                    completedCount: 0,
                    totalFollowUps: 0,
                    pendingFromBefore: 0,
                    pendingByDate: [],
                    followUpsDoneToday: 0,
                    followupDetails: [],
                    employees: [],
                    summary: {
                        total: 0,
                        open: 0,
                        completed: 0,
                        followUpsToday: 0,
                        followUpsDoneToday: 0
                    }
                });
            }
            addVisitorOwnershipScope(rangeVisitorQuery, employeeUserId);
        } else if (req.user && !canViewBranchWideVisitors) {
            employeeUserId = req.user._id;
            addVisitorOwnershipScope(rangeVisitorQuery, employeeUserId);
            addVisitorOwnershipScope(followupVisitorQuery, employeeUserId);
        }

        const openStatuses = ["Open", "InProgress", "Recall", "Pending"];
        const completedStatuses = ["Complete", "Converted"];

        const rangeVisitorsQuery = {
            ...rangeVisitorQuery,
            visitingDate: { $gte: start, $lte: end }
        };

        const [rangeVisitors, completedVisitors, visibleFollowupVisitors] = await Promise.all([
            Visitor.find(rangeVisitorsQuery).select('_id status visitingDate').lean(),
            Visitor.find({ ...rangeVisitorsQuery, status: { $in: completedStatuses } }).select('_id').lean(),
            Visitor.find(followupVisitorQuery).select('_id').lean()
        ]);

        const visibleFollowupVisitorIds = visibleFollowupVisitors.map((visitor) => visitor._id);
        const followUpsDoneQuery = {
            isDeleted: false,
            isDone: true,
            ...(baseQuery.branchId ? { branchId: baseQuery.branchId } : {}),
            ...(visibleFollowupVisitorIds.length ? { visitorId: { $in: visibleFollowupVisitorIds } } : {}),
            callingDate: { $gte: start, $lte: end },
            ...(employeeUserId ? { followUpBy: employeeUserId } : {})
        };

        if (!visibleFollowupVisitorIds.length) {
            followUpsDoneQuery._id = { $exists: false };
        }

        const followUpsDoneDocs = await VisitorFollowUp.find(followUpsDoneQuery)
            .select('visitorId scheduledDate followUpBy callingDate createdAt updatedAt status remark attendedBy branchId')
            .populate({
                path: 'visitorId',
                select: 'studentName mobileNumber contactParent contactHome visitingDate inquiryId reference createdBy allocatedTo branchId status',
                populate: [
                    { path: 'createdBy', select: 'name username' },
                    { path: 'allocatedTo', select: 'name username' },
                    { path: 'branchId', select: 'name' }
                ]
            })
            .populate('followUpBy', 'name username')
            .populate('branchId', 'name')
            .lean();

        const latestFollowupByVisitor = new Map();
        for (const item of followUpsDoneDocs) {
            const visitorId = item.visitorId?._id?.toString() || item.visitorId?.toString();
            if (!visitorId) continue;
            const actionDate = item.callingDate;
            const existing = latestFollowupByVisitor.get(visitorId);
            if (!existing || new Date(actionDate || 0) > new Date(existing.callingDate || 0)) {
                latestFollowupByVisitor.set(visitorId, item);
            }
        }

        const totalInquiries = rangeVisitors.length;
        const totalFollowUpsCount = latestFollowupByVisitor.size;
        const openCount = Math.max(totalInquiries - totalFollowUpsCount, 0);
        const completedCount = completedVisitors.length;

        const pendingVisitorDocs = employeeUserId
            ? await Visitor.find({
                ...rangeVisitorQuery,
                visitingDate: { $lt: start },
                status: { $in: openStatuses }
            }).select('_id status visitingDate').lean()
            : [];
        const pendingFromBefore = pendingVisitorDocs.length;
        const pendingByDateMap = new Map();
        for (const visitor of pendingVisitorDocs) {
            const baseDate = visitor.visitingDate;
            const key = new Date(baseDate).toISOString().slice(0, 10);
            pendingByDateMap.set(key, (pendingByDateMap.get(key) || 0) + 1);
        }
        const pendingByDate = [...pendingByDateMap.entries()]
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Employee performance
        const employeeMap = new Map();
        for (const f of latestFollowupByVisitor.values()) {
            const by = f.followUpBy;
            if (!by) continue;
            const key = by._id.toString();
            if (!employeeMap.has(key)) {
                employeeMap.set(key, {
                    employeeId: key,
                    employeeName: by.name || by.username,
                    followUpCount: 0,
                    latestFollowUpAt: f.createdAt
                });
            }
            const entry = employeeMap.get(key);
            entry.followUpCount++;
            const latestDate = f.callingDate;
            if (new Date(latestDate) > new Date(entry.latestFollowUpAt)) {
                entry.latestFollowUpAt = latestDate;
            }
        }

        const employeeStats = [...employeeMap.values()].sort((a, b) => b.followUpCount - a.followUpCount);

        const followupDetails = [...latestFollowupByVisitor.values()]
            .sort((a, b) => new Date(b.callingDate || 0) - new Date(a.callingDate || 0))
            .map((item) => ({
                inquiryDate: item.visitorId?.visitingDate || null,
                branchName: item.branchId?.name || item.visitorId?.branchId?.name || '-',
                filledBy: item.visitorId?.createdBy?.name || item.visitorId?.createdBy?.username || item.visitorId?.allocatedTo?.name || item.visitorId?.allocatedTo?.username || '-',
                referenceBy: item.visitorId?.reference || '-',
                studentName: item.visitorId?.studentName || '-',
                contactHome: item.visitorId?.contactHome || '-',
                contactStudent: item.visitorId?.mobileNumber || '-',
                contactParent: item.visitorId?.contactParent || '-',
                status: item.status || item.visitorId?.status || 'Open',
                followUpDate: item.scheduledDate || null,
                followUpDetails: item.remark || '-',
                followUpBy: item.followUpBy?.name || item.followUpBy?.username || '-',
                callingDate: item.callingDate || null
            }));

        res.status(200).json({
            totalInquiries,
            openCount,
            completedCount,
            totalFollowUps: totalFollowUpsCount,
            pendingFromBefore,
            pendingByDate,
            followUpsDoneToday: totalFollowUpsCount,
            followupDetails,
            employees: employeeStats,
            summary: {
                total: totalInquiries,
                open: openCount,
                completed: completedCount,
                followUpsToday: totalFollowUpsCount,
                followUpsDoneToday: totalFollowUpsCount
            }
        });
    } catch (error) {
        console.error("Error fetching visitor stats:", error);
        res.status(500).json({ message: 'Error fetching visitor stats', error: error.message });
    }
};

// Soft Delete visitor
exports.deleteVisitor = async (req, res) => {
    try {
        const deletedVisitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedVisitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        res.status(200).json({ message: 'Visitor deleted successfully' });
    } catch (error) {
        console.error("Error deleting visitor:", error);
        res.status(500).json({ message: 'Error deleting visitor', error: error.message });
    }
};

const StudentAttendance = require('../models/StudentAttendance');
const EmployeeAttendance = require('../models/EmployeeAttendance');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const ExamSchedule = require('../models/ExamSchedule');
const AttendanceCalendar = require('../models/AttendanceCalendar');
const sendSMS = require('../utils/smsSender');
const { getParentSmsRecipients } = require('../utils/smsRecipients');

const getObjectIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
};

const parseLocalDate = (dateValue) => {
    if (!dateValue) return new Date();

    if (dateValue instanceof Date) {
        return new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate(), dateValue.getUTCHours(), dateValue.getUTCMinutes(), dateValue.getUTCSeconds(), dateValue.getUTCMilliseconds()));
    }

    if (typeof dateValue === 'string') {
        const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, year, month, day] = match;
            return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        }
    }

    const d = new Date(dateValue);
    if (!Number.isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
    }

    return d;
};

const normalizeDateRange = (dateValue) => {
    const start = parseLocalDate(dateValue);
    start.setUTCHours(0, 0, 0, 0);
    const end = parseLocalDate(dateValue);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
};

const getCourseEndDate = (student) => {
    const duration = Number(student?.course?.duration || 0);
    if (!duration) return null;

    const startDate = new Date(student.registrationDate || student.admissionDate || student.batchStartDate);
    if (Number.isNaN(startDate.getTime())) return null;

    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    const durationType = String(student?.course?.durationType || 'Month').toLowerCase();

    if (durationType.startsWith('year')) {
        endDate.setUTCFullYear(endDate.getUTCFullYear() + duration);
    } else if (durationType.startsWith('day')) {
        endDate.setUTCDate(endDate.getUTCDate() + duration);
    } else {
        endDate.setUTCMonth(endDate.getUTCMonth() + duration);
    }

    endDate.setUTCHours(23, 59, 59, 999);
    return endDate;
};

const getStudentAttendanceStartDate = (student) => {
    // Attendance is valid from registration through the calculated course end.
    const rawStartDate = student?.registrationDate || student?.admissionDate || student?.batchStartDate;
    if (!rawStartDate) return null;
    const startDate = parseLocalDate(rawStartDate);
    if (Number.isNaN(startDate.getTime())) return null;
    startDate.setUTCHours(0, 0, 0, 0);
    return startDate;
};

const isStudentEligibleForAttendanceDate = (student, attendanceDayStart) => {
    const attendanceStartDate = getStudentAttendanceStartDate(student);
    if (attendanceStartDate && attendanceStartDate > attendanceDayStart) {
        return false;
    }

    const courseEndDate = getCourseEndDate(student);
    return !courseEndDate || courseEndDate >= attendanceDayStart;
};

const getAttendanceBranchScope = (req, requestedBranchId = null) => {
    if (req.user?.role !== 'Super Admin') {
        return getObjectIdString(req.user?.branchId);
    }
    return getObjectIdString(requestedBranchId);
};

const getAccessibleBatchNamesForBranch = async (branchId) => {
    if (!branchId) return null;
    const batches = await require('../models/Batch')
        .find({ branchId, isDeleted: false })
        .select('name')
        .lean();
    return [...new Set(batches.map(batch => batch.name).filter(Boolean))];
};

const getCalendarYears = (fromDate, toDate) => {
    const currentYear = new Date().getFullYear();
    const startYear = fromDate ? parseLocalDate(fromDate).getUTCFullYear() : currentYear;
    const endYear = toDate ? parseLocalDate(toDate).getUTCFullYear() : startYear;

    if (Number.isNaN(startYear) || Number.isNaN(endYear)) return [currentYear];

    const years = [];
    for (let year = Math.min(startYear, endYear); year <= Math.max(startYear, endYear); year += 1) {
        years.push(year);
    }
    return years;
};

const ensureSundayCalendarEntries = async (years, user) => {
    const branch = user?.role !== 'Super Admin' ? user?.branchId : undefined;
    const operations = [];

    years.forEach((year) => {
        const date = new Date(Date.UTC(year, 0, 1));
        while (date.getUTCDay() !== 0) {
            date.setUTCDate(date.getUTCDate() + 1);
        }

        while (date.getUTCFullYear() === year) {
            const { start, end } = normalizeDateRange(date);
            const query = { type: 'Sunday', startDate: start, endDate: end };
            if (branch) query.branch = branch;
            else query.$or = [{ branch: { $exists: false } }, { branch: null }];

            operations.push({
                updateOne: {
                    filter: query,
                    update: {
                        $setOnInsert: {
                            title: 'Sunday',
                            type: 'Sunday',
                            startDate: start,
                            endDate: end,
                            remarks: 'Auto Sunday holiday',
                            isActive: true,
                            branch,
                            createdBy: user?._id
                        }
                    },
                    upsert: true
                }
            });

            date.setUTCDate(date.getUTCDate() + 7);
        }
    });

    if (operations.length > 0) {
        await AttendanceCalendar.bulkWrite(operations, { ordered: false });
    }
};

const getAttendanceClosureForDate = async (dateValue, user, branchId = null) => {
    if (!dateValue) return null;

    const { start, end } = normalizeDateRange(dateValue);
    if (Number.isNaN(start.getTime())) return null;

    if (start.getUTCDay() === 0) {
        return {
            type: 'Sunday',
            title: 'Sunday',
            reason: 'Attendance is closed on Sunday'
        };
    }

    const query = {
        isActive: { $ne: false },
        startDate: { $lte: end },
        endDate: { $gte: start }
    };

    const scopedBranchId = user && user.role !== 'Super Admin'
        ? getObjectIdString(user.branchId)
        : getObjectIdString(branchId);

    if (scopedBranchId) {
        query.$or = [{ branch: scopedBranchId }, { branch: { $exists: false } }, { branch: null }];
    } else if (user?.role === 'Super Admin') {
        query.$or = [{ branch: { $exists: false } }, { branch: null }];
    }

    const closure = await AttendanceCalendar.findOne(query).sort({ startDate: 1 });
    if (!closure) return null;

    return {
        _id: closure._id,
        type: closure.type,
        title: closure.title,
        reason: `${closure.type}: ${closure.title}`
    };
};

exports.getAttendanceCalendar = async (req, res) => {
    try {
        const { fromDate, toDate, type } = req.query;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;
        const query = {};

        if (type) query.type = type;
        else query.type = { $ne: 'Sunday' };

        if (fromDate || toDate) {
            const start = fromDate ? normalizeDateRange(fromDate).start : new Date('1970-01-01');
            const end = toDate ? normalizeDateRange(toDate).end : new Date('2999-12-31');
            query.startDate = { $lte: end };
            query.endDate = { $gte: start };
        }

        const scopedBranchId = req.user?.role !== 'Super Admin'
            ? getObjectIdString(req.user?.branchId)
            : getObjectIdString(req.query.branchId);

        if (scopedBranchId) {
            query.$or = [{ branch: scopedBranchId }, { branch: { $exists: false } }, { branch: null }];
        } else if (req.query.globalOnly === 'true') {
            query.$or = [{ branch: { $exists: false } }, { branch: null }];
        }

        const [items, total] = await Promise.all([
            AttendanceCalendar.find(query)
                .populate('createdBy', 'name')
                .sort({ startDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AttendanceCalendar.countDocuments(query)
        ]);

        res.status(200).json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance calendar', error: error.message });
    }
};

exports.createAttendanceCalendar = async (req, res) => {
    try {
        const { title, type, startDate, endDate, remarks, isActive } = req.body;

        if (!title || !type || !startDate) {
            return res.status(400).json({ message: 'Title, type, and start date are required' });
        }

        const normalizedStart = normalizeDateRange(startDate).start;
        const normalizedEnd = normalizeDateRange(endDate || startDate).end;

        if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid date' });
        }

        if (normalizedEnd < normalizedStart) {
            return res.status(400).json({ message: 'End date cannot be before start date' });
        }

        const item = await AttendanceCalendar.create({
            title,
            type,
            startDate: normalizedStart,
            endDate: normalizedEnd,
            remarks,
            isActive: isActive !== undefined ? isActive : true,
            branch: req.user?.role !== 'Super Admin' ? req.user?.branchId : req.body.branch || undefined,
            createdBy: req.user?._id
        });

        res.status(201).json({ message: 'Attendance calendar saved', item });
    } catch (error) {
        res.status(500).json({ message: 'Error saving attendance calendar', error: error.message });
    }
};

exports.updateAttendanceCalendar = async (req, res) => {
    try {
        const { title, type, startDate, endDate, remarks, isActive } = req.body;
        const item = await AttendanceCalendar.findById(req.params.id);

        if (!item) return res.status(404).json({ message: 'Calendar entry not found' });

        if (
            req.user &&
            req.user.role !== 'Super Admin' &&
            item.branch &&
            req.user.branchId &&
            item.branch.toString() !== req.user.branchId.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to update this calendar entry' });
        }

        if (!title || !type || !startDate) {
            return res.status(400).json({ message: 'Title, type, and start date are required' });
        }

        const normalizedStart = normalizeDateRange(startDate).start;
        const normalizedEnd = normalizeDateRange(endDate || startDate).end;

        if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid date' });
        }

        if (normalizedEnd < normalizedStart) {
            return res.status(400).json({ message: 'End date cannot be before start date' });
        }

        item.title = title;
        item.type = type;
        item.startDate = normalizedStart;
        item.endDate = normalizedEnd;
        item.remarks = remarks;
        item.isActive = isActive !== undefined ? isActive : true;

        await item.save();

        res.status(200).json({ message: 'Attendance calendar updated', item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendance calendar', error: error.message });
    }
};

exports.deleteAttendanceCalendar = async (req, res) => {
    try {
        const item = await AttendanceCalendar.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Calendar entry not found' });

        await item.deleteOne();
        res.status(200).json({ message: 'Attendance calendar entry deleted', id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendance calendar', error: error.message });
    }
};

exports.checkAttendanceCalendarStatus = async (req, res) => {
    try {
        const closure = await getAttendanceClosureForDate(req.query.date, req.user, req.query.branchId);
        res.status(200).json({ isClosed: !!closure, closure });
    } catch (error) {
        res.status(500).json({ message: 'Error checking attendance calendar', error: error.message });
    }
};

// --- STUDENT ATTENDANCE SECTION ---

// Get list of registered students for a specific batch and time to take attendance
exports.getStudentsForAttendance = async (req, res) => {
    try {
        const { batch, batchId, date, branchId } = req.query;

        if (!batch && !batchId) {
            return res.status(400).json({ message: "Batch is required" });
        }

        const batchValues = [batch, batchId].filter(Boolean).map(value => String(value).trim()).filter(Boolean);
        let batchDoc = null;
        if (batchId || batch) {
            const Batch = require('../models/Batch');
            const batchLookup = [];
            if (batchId && /^[0-9a-fA-F]{24}$/.test(String(batchId))) {
                batchLookup.push({ _id: batchId });
            }
            if (batch) {
                batchLookup.push({ name: new RegExp(`^${String(batch).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
            }

            batchDoc = batchLookup.length > 0
                ? await Batch.findOne({ $or: batchLookup }).select('name branchId')
                : null;

            if (batchDoc?.name) batchValues.push(batchDoc.name);
        }

        const scopedBranchId = getAttendanceBranchScope(req, branchId || batchDoc?.branchId);
        if (
            scopedBranchId &&
            batchDoc?.branchId &&
            batchDoc.branchId.toString() !== scopedBranchId.toString()
        ) {
            return res.status(200).json([]);
        }

        const closureBranchId = branchId || batchDoc?.branchId;
        const closure = await getAttendanceClosureForDate(date, req.user, closureBranchId);
        if (closure) {
            return res.status(200).json([]);
        }

        const batchMatchers = [...new Set(batchValues)].map(value => (
            new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        ));

        const query = {
            batch: { $in: batchMatchers },
            isActive: true,
            isDeleted: { $ne: true },
            isCancelled: { $ne: true },
            $or: [
                { isRegistered: true },
                { registrationFeeAmount: { $gt: 0 } }
            ]
        };

        if (scopedBranchId) {
            query.branchId = scopedBranchId;
        }

        const students = await Student.find(query)
            .populate('course', 'name duration durationType')
            .sort({ admissionDate: -1, createdAt: -1 });

        const attendanceDate = date ? parseLocalDate(date) : new Date();
        attendanceDate.setUTCHours(23, 59, 59, 999);
        const attendanceDayStart = new Date(attendanceDate);
        attendanceDayStart.setUTCHours(0, 0, 0, 0);

        let eligibleStudents = students.filter(student => isStudentEligibleForAttendanceDate(student, attendanceDayStart));

        if (!Number.isNaN(attendanceDate.getTime()) && eligibleStudents.length > 0) {
            const scheduledStudentIds = await ExamSchedule.distinct('attendees', {
                attendees: { $in: eligibleStudents.map(student => student._id) },
                isDeleted: { $ne: true },
                isActive: { $ne: false },
                'timeTable.date': { $lte: attendanceDate }
            });
            const scheduledStudentIdSet = new Set(scheduledStudentIds.map(id => id.toString()));
            eligibleStudents = eligibleStudents.filter(student => !scheduledStudentIdSet.has(student._id.toString()));
        }

        // Map to a cleaner format for frontend
        const mappedStudents = eligibleStudents.map(s => ({
            _id: s._id,
            enrollmentNo: s.enrollmentNo,
            name: `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`,
            firstName: s.firstName,
            middleName: s.middleName,
            lastName: s.lastName,
            courseName: s.course ? s.course.name : '',
            contactStudent: s.mobileStudent,
            contactParent: s.mobileParent,
        }));

        res.status(200).json(mappedStudents);

    } catch (error) {
        console.error("Error fetching students for attendance:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Check if attendance already taken
exports.checkStudentAttendanceStatus = async (req, res) => {
    try {
        const { date, batch, batchTime, branchId } = req.query;
        if (!date || !batch || !batchTime) return res.status(400).json({ message: "Missing params" });

        const closure = await getAttendanceClosureForDate(date, req.user, branchId);
        if (closure) {
            return res.status(200).json({
                exists: false,
                isClosed: true,
                closure,
                message: closure.reason
            });
        }

        // Date needs to be normalized to start of day or ISO string match depending on how frontend sends it.
        // Usually frontend sends YYYY-MM-DD.
        // MongoDB stores Dates with time. 
        // Best approach: Store date as start of day payload from frontend or range query.
        // For simplicity, let's assume specific date match if stored with time 00:00:00, or use range.
        
        const { start: startOfDay, end: endOfDay } = normalizeDateRange(date);
        const scopedBranchId = getAttendanceBranchScope(req, branchId);
        const attendanceQuery = {
            batchName: batch,
            batchTime: batchTime,
            date: { $gte: startOfDay, $lte: endOfDay }
        };
        if (scopedBranchId) {
            attendanceQuery.$or = [
                { branchId: scopedBranchId },
                { branchId: { $exists: false } },
                { branchId: null }
            ];
        }

        const existingRecord = await StudentAttendance.findOne(attendanceQuery)
          .populate('takenBy', 'name')
          .populate({
              path: 'records.studentId',
              select: 'firstName middleName lastName admissionDate registrationDate batchStartDate course branchId',
              populate: { path: 'course', select: 'duration durationType' }
          });

        if (existingRecord) {
            existingRecord.records = existingRecord.records.filter(record => (
                record.studentId &&
                (!scopedBranchId || record.studentId.branchId?.toString() === scopedBranchId.toString()) &&
                isStudentEligibleForAttendanceDate(record.studentId, startOfDay)
            ));

            if (scopedBranchId && existingRecord.records.length === 0) {
                return res.status(200).json({ exists: false });
            }

            return res.status(200).json({ 
                exists: true, 
                takenBy: existingRecord.takenBy?.name || 'Unknown',
                record: existingRecord
            });
        }

        res.status(200).json({ exists: false });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// Save Student Attendance
exports.saveStudentAttendance = async (req, res) => {
    try {
        const { date, batchName, batchTime, remarks, records, branchId } = req.body;
        const takenBy = req.user.id; // From auth middleware
        const scopedBranchId = getAttendanceBranchScope(req, branchId);

        // Validate basic
        if(!date || !batchName || !batchTime || !records) {
             return res.status(400).json({ message: "Missing required fields" });
        }

        const closure = await getAttendanceClosureForDate(date, req.user, branchId);
        if (closure) {
            return res.status(400).json({ message: `Attendance cannot be taken on this date. ${closure.reason}`, closure });
        }
        
        // Parse date
        const attendanceDate = parseLocalDate(date);
        // Normalize time to avoid dupes if strictly checking date
        // But the schema has unique index on date+batch+time. 
        // It's safer if we rely on the Date object being consistent (e.g. set to noon or midnight UTC) OR use the query range check above.
        // Ideally, we should check if exists first to update or throw error.
        
        // Double check uniqueness to be safe (though index handles it)
        const { start: startOfDay, end: endOfDay } = normalizeDateRange(attendanceDate);
        const requestedStudentIds = records
            .map(record => getObjectIdString(record.studentId))
            .filter(Boolean);
        const validStudents = await Student.find({
            _id: { $in: requestedStudentIds },
            isActive: true,
            isDeleted: { $ne: true },
            isCancelled: { $ne: true },
            ...(scopedBranchId ? { branchId: scopedBranchId } : {})
        }).populate('course', 'duration durationType');
        const validStudentIdSet = new Set(
            validStudents
                .filter(student => isStudentEligibleForAttendanceDate(student, startOfDay))
                .map(student => student._id.toString())
        );
        const eligibleRecords = records.filter(record => validStudentIdSet.has(getObjectIdString(record.studentId)));

        const attendanceQuery = {
            batchName,
            batchTime,
            date: { $gte: startOfDay, $lte: endOfDay }
        };
        if (scopedBranchId) {
            attendanceQuery.branchId = scopedBranchId;
        }

        let attendance = await StudentAttendance.findOne(attendanceQuery);

        if (attendance) {
            // Update existing
             attendance.takenBy = takenBy;
             attendance.branchId = scopedBranchId || attendance.branchId;
             attendance.remarks = remarks;
             attendance.records = eligibleRecords;
             await attendance.save();
             // response handled at end
        } else {
            // Create new
            attendance = new StudentAttendance({
                date: attendanceDate,
                batchName,
                batchTime,
                branchId: scopedBranchId || undefined,
                takenBy,
                remarks,
                records: eligibleRecords
            });
            await attendance.save();
        }

        // --- Send Absent SMS (One by One) ---
        try {
            // Parse Times from batchTime (e.g. "08:00 - 10:00")
            let startTime = 'N/A';
            let endTime = 'N/A';
            if (batchTime && batchTime.includes('-')) {
                const parts = batchTime.split('-');
                if (parts.length >= 2) {
                    startTime = parts[0].trim();
                    endTime = parts[1].trim();
                }
            }

            // Loop sequentially to send SMS to absent students
            for (const record of eligibleRecords) {
                if (!record.isPresent) {
                    const studentName = record.studentName || record.name || 'Student';
                    const parentMobile = getParentSmsRecipients({ mobileParent: record.contactParent })[0];
                    
                    if (parentMobile) {
                        const message = `Dear, ${studentName} is Absent in class on today ${date} for ${startTime}-${endTime}, Batch Time-${batchName}. Regards, Smart Institute`;
                         await sendSMS(parentMobile, message, 'Attendance');
                    }
                }
            }
        } catch (smsError) {
             console.error("Error sending absent SMS:", smsError);
        }

        return res.status(200).json({ message: "Attendance saved successfully", attendance });

    } catch (error) {
        console.error("Save Student Attendance Error:", error);
        res.status(500).json({ message: "Error saving attendance", error: error.message });
    }
};

// Get Attendance History (Filter)
exports.getStudentAttendanceHistory = async (req, res) => {
    try {
        const { fromDate, toDate, batch, batchTime, branchId } = req.query;
        let query = {};
        const scopedBranchId = getAttendanceBranchScope(req, branchId);
        
        if (fromDate && toDate) {
             const { start } = normalizeDateRange(fromDate);
             const { end } = normalizeDateRange(toDate);
             query.date = { $gte: start, $lte: end };
        }
        
        if (batch) {
            query.batchName = batch;
        }

        if (batchTime) {
            query.batchTime = batchTime;
        }

        if (scopedBranchId) {
            const scopedBatchNames = await getAccessibleBatchNamesForBranch(scopedBranchId);
            query.$or = [
                { branchId: scopedBranchId },
                {
                    $and: [
                        { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
                        { batchName: { $in: scopedBatchNames || [] } }
                    ]
                }
            ];
        }

        // Removed unused 'history' variable block

        const records = await StudentAttendance.find(query)
                                .populate('takenBy', 'name')
                                .populate('branchId', 'name')
                                .populate('records.studentId', 'firstName middleName lastName branchId')
                                .sort({ date: -1 });

        const filteredRecords = scopedBranchId
            ? records.map(record => {
                const recordObject = record.toObject();
                recordObject.records = (recordObject.records || []).filter(item => (
                    item.studentId?.branchId?.toString?.() === scopedBranchId.toString()
                ));
                return recordObject;
            }).filter(record => record.branchId || record.records.length > 0)
            : records;

        res.status(200).json(filteredRecords);

    } catch (error) {
         res.status(500).json({ message: "Server Error", error });
    }
};

// Delete Student Attendance
exports.deleteStudentAttendance = async (req, res) => {
    try {
        const record = await StudentAttendance.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ message: "Attendance record not found" });
        }

        const scopedBranchId = getAttendanceBranchScope(req, null);
        if (
            scopedBranchId &&
            record.branchId &&
            record.branchId.toString() !== scopedBranchId.toString()
        ) {
            return res.status(403).json({ message: "Not authorized for this branch" });
        }

        await StudentAttendance.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting", error });
    }
};

// --- EMPLOYEE ATTENDANCE SECTION ---

exports.getEmployeesForAttendance = async (req, res) => {
    try {
        // Fetch active employees with branch filtering
        const query = { 
            isActive: true, 
            isDeleted: false 
        };

        if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const employees = await Employee.find(query);

        // Map
        const mapped = employees.map(e => ({
            _id: e._id,
            name: e.name,
            srNumber: e.regNo || e._id.toString().substring(0,6), // Fallback if no regNo
            role: e.type
        }));

        res.status(200).json(mapped);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

exports.checkEmployeeAttendanceStatus = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: "Date required" });

        const closure = await getAttendanceClosureForDate(date, req.user);
        if (closure) {
            return res.status(200).json({
                exists: false,
                isClosed: true,
                closure,
                message: closure.reason
            });
        }
        
        const { start: startOfDay, end: endOfDay } = normalizeDateRange(date);

        const record = await EmployeeAttendance.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            branchId: req.user.branchId || null // Check specifically for this branch
        }).populate('takenBy', 'name')
          .populate('records.employeeId', 'name');

        if (record) {
             return res.status(200).json({ exists: true, record, takenBy: record.takenBy?.name });
        }
        res.status(200).json({ exists: false });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

exports.saveEmployeeAttendance = async (req, res) => {
    try {
        const { date, remarks, records } = req.body;
        const takenBy = req.user.id;

        const attendanceDate = parseLocalDate(date);
        const closure = await getAttendanceClosureForDate(date, req.user);
        if (closure) {
            return res.status(400).json({ message: `Attendance cannot be taken on this date. ${closure.reason}`, closure });
        }
        const { start: startOfDay, end: endOfDay } = normalizeDateRange(attendanceDate);

        const branchId = req.user.branchId || null; // Use current user's branch
        
        let attendance = await EmployeeAttendance.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            branchId: branchId // Find specific branch record
        });

        if (attendance) {
            attendance.takenBy = takenBy;
            attendance.remarks = remarks;
            attendance.records = records;
            await attendance.save();
            return res.status(200).json({ message: "Employee attendance updated", attendance });
        } else {
            attendance = new EmployeeAttendance({
                date: attendanceDate,
                takenBy,
                remarks,
                records,
                branchId: branchId // Save with branchId
            });
            await attendance.save();
            return res.status(201).json({ message: "Employee attendance saved", attendance });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving employee attendance", error });
    }
};

exports.getEmployeeAttendanceHistory = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        let query = {};
        if (fromDate && toDate) {
            const { start } = normalizeDateRange(fromDate);
            const { end } = normalizeDateRange(toDate);
            query.date = { $gte: start, $lte: end };
        }
        
        // Filter by branch for non-super admins
        if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const records = await EmployeeAttendance.find(query)
            .populate('takenBy', 'name')
            .populate('records.employeeId', 'name')
            .sort({ date: -1 });

        res.status(200).json(records);

    } catch (error) {
         res.status(500).json({ message: "Server Error", error });
    }
};

exports.deleteEmployeeAttendance = async (req, res) => {
    try {
        await EmployeeAttendance.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting", error });
    }
};

const StudentAttendance = require('../models/StudentAttendance');
const EmployeeAttendance = require('../models/EmployeeAttendance');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const ExamSchedule = require('../models/ExamSchedule');
const AttendanceCalendar = require('../models/AttendanceCalendar');
const sendSMS = require('../utils/smsSender');

const normalizeDateRange = (dateValue) => {
    const start = new Date(dateValue);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateValue);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getCourseEndDate = (student) => {
    const duration = Number(student?.course?.duration || 0);
    if (!duration) return null;

    const startDate = new Date(student.batchStartDate || student.admissionDate);
    if (Number.isNaN(startDate.getTime())) return null;

    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    const durationType = String(student?.course?.durationType || 'Month').toLowerCase();

    if (durationType.startsWith('year')) {
        endDate.setFullYear(endDate.getFullYear() + duration);
    } else if (durationType.startsWith('day')) {
        endDate.setDate(endDate.getDate() + duration);
    } else {
        endDate.setMonth(endDate.getMonth() + duration);
    }

    endDate.setHours(23, 59, 59, 999);
    return endDate;
};

const getCalendarYears = (fromDate, toDate) => {
    const currentYear = new Date().getFullYear();
    const startYear = fromDate ? new Date(fromDate).getFullYear() : currentYear;
    const endYear = toDate ? new Date(toDate).getFullYear() : startYear;

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
        const date = new Date(year, 0, 1);
        while (date.getDay() !== 0) {
            date.setDate(date.getDate() + 1);
        }

        while (date.getFullYear() === year) {
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

            date.setDate(date.getDate() + 7);
        }
    });

    if (operations.length > 0) {
        await AttendanceCalendar.bulkWrite(operations, { ordered: false });
    }
};

const getAttendanceClosureForDate = async (dateValue, user) => {
    if (!dateValue) return null;

    const { start, end } = normalizeDateRange(dateValue);
    if (Number.isNaN(start.getTime())) return null;

    if (start.getDay() === 0) {
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

    if (user && user.role !== 'Super Admin' && user.branchId) {
        query.$or = [{ branch: user.branchId }, { branch: { $exists: false } }, { branch: null }];
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
        await ensureSundayCalendarEntries(getCalendarYears(fromDate, toDate), req.user);

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;
        const query = {};

        if (type) query.type = type;

        if (fromDate || toDate) {
            const start = fromDate ? normalizeDateRange(fromDate).start : new Date('1970-01-01');
            const end = toDate ? normalizeDateRange(toDate).end : new Date('2999-12-31');
            query.startDate = { $lte: end };
            query.endDate = { $gte: start };
        }

        if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
            query.$or = [{ branch: req.user.branchId }, { branch: { $exists: false } }, { branch: null }];
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
        const closure = await getAttendanceClosureForDate(req.query.date, req.user);
        res.status(200).json({ isClosed: !!closure, closure });
    } catch (error) {
        res.status(500).json({ message: 'Error checking attendance calendar', error: error.message });
    }
};

// --- STUDENT ATTENDANCE SECTION ---

// Get list of registered students for a specific batch and time to take attendance
exports.getStudentsForAttendance = async (req, res) => {
    try {
        const { batch, batchId, date } = req.query;

        if (!batch && !batchId) {
            return res.status(400).json({ message: "Batch is required" });
        }

        const closure = await getAttendanceClosureForDate(date, req.user);
        if (closure) {
            return res.status(200).json([]);
        }

        const batchValues = [batch, batchId].filter(Boolean).map(value => String(value).trim()).filter(Boolean);
        if (batchId || batch) {
            const Batch = require('../models/Batch');
            const batchLookup = [];
            if (batchId && /^[0-9a-fA-F]{24}$/.test(String(batchId))) {
                batchLookup.push({ _id: batchId });
            }
            if (batch) {
                batchLookup.push({ name: new RegExp(`^${String(batch).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
            }

            const batchDoc = batchLookup.length > 0
                ? await Batch.findOne({ $or: batchLookup }).select('name')
                : null;

            if (batchDoc?.name) batchValues.push(batchDoc.name);
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

        if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const students = await Student.find(query)
            .populate('course', 'name duration durationType')
            .sort({ admissionDate: -1, createdAt: -1 });

        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(23, 59, 59, 999);
        const attendanceDayStart = new Date(attendanceDate);
        attendanceDayStart.setHours(0, 0, 0, 0);

        let eligibleStudents = students.filter(student => {
            const courseEndDate = getCourseEndDate(student);
            return !courseEndDate || courseEndDate >= attendanceDayStart;
        });
        if (!Number.isNaN(attendanceDate.getTime()) && eligibleStudents.length > 0) {
            const scheduledStudentIds = await ExamSchedule.distinct('attendees', {
                attendees: { $in: eligibleStudents.map(student => student._id) },
                isDeleted: { $ne: true },
                isActive: { $ne: false },
                'timeTable.date': { $lte: attendanceDate }
            });
            const scheduledStudentIdSet = new Set(scheduledStudentIds.map(id => id.toString()));
            eligibleStudents = students.filter(student => !scheduledStudentIdSet.has(student._id.toString()));
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
        const { date, batch, batchTime } = req.query;
        if (!date || !batch || !batchTime) return res.status(400).json({ message: "Missing params" });

        const closure = await getAttendanceClosureForDate(date, req.user);
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
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23,59,59,999);

        const existingRecord = await StudentAttendance.findOne({
            batchName: batch,
            batchTime: batchTime,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).populate('takenBy', 'name')
          .populate('records.studentId', 'firstName middleName lastName');

        if (existingRecord) {
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
        const { date, batchName, batchTime, remarks, records } = req.body;
        const takenBy = req.user.id; // From auth middleware

        // Validate basic
        if(!date || !batchName || !batchTime || !records) {
             return res.status(400).json({ message: "Missing required fields" });
        }

        const closure = await getAttendanceClosureForDate(date, req.user);
        if (closure) {
            return res.status(400).json({ message: `Attendance cannot be taken on this date. ${closure.reason}`, closure });
        }
        
        // Parse date
        const attendanceDate = new Date(date);
        // Normalize time to avoid dupes if strictly checking date
        // But the schema has unique index on date+batch+time. 
        // It's safer if we rely on the Date object being consistent (e.g. set to noon or midnight UTC) OR use the query range check above.
        // Ideally, we should check if exists first to update or throw error.
        
        // Double check uniqueness to be safe (though index handles it)
        const startOfDay = new Date(attendanceDate);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(attendanceDate);
        endOfDay.setHours(23,59,59,999);

        let attendance = await StudentAttendance.findOne({
            batchName,
            batchTime,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (attendance) {
            // Update existing
             attendance.takenBy = takenBy;
             attendance.remarks = remarks;
             attendance.records = records;
             await attendance.save();
             // response handled at end
        } else {
            // Create new
            attendance = new StudentAttendance({
                date: attendanceDate,
                batchName,
                batchTime,
                takenBy,
                remarks,
                records
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
            for (const record of records) {
                if (!record.isPresent) {
                    const studentName = record.studentName || record.name || 'Student';
                    const parentMobile = record.contactParent;
                    
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
        const { fromDate, toDate, batch, batchTime } = req.query;
        let query = {};
        
        if (fromDate && toDate) {
             query.date = {
                 $gte: new Date(fromDate),
                 $lte: new Date(toDate)
             };
        }
        
        if (batch) {
            query.batchName = batch;
        }

        if (batchTime) {
            query.batchTime = batchTime;
        }

        // Removed unused 'history' variable block

        const records = await StudentAttendance.find(query)
                                .populate('takenBy', 'name')
                                .populate('records.studentId', 'firstName middleName lastName')
                                .sort({ date: -1 });
                                
        res.status(200).json(records);

    } catch (error) {
         res.status(500).json({ message: "Server Error", error });
    }
};

// Delete Student Attendance
exports.deleteStudentAttendance = async (req, res) => {
    try {
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
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23,59,59,999);

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

        const attendanceDate = new Date(date);
        const closure = await getAttendanceClosureForDate(date, req.user);
        if (closure) {
            return res.status(400).json({ message: `Attendance cannot be taken on this date. ${closure.reason}`, closure });
        }
        const startOfDay = new Date(attendanceDate);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(attendanceDate);
        endOfDay.setHours(23,59,59,999);

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
            query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
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

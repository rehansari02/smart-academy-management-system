const StudentAttendance = require('../models/StudentAttendance');
const Course = require('../models/Course');

/**
 * Auto-mark student as Present in all past batch attendance records
 * between student's admission date and registration date.
 */
const autoMarkAttendanceOnRegistration = async (student, registrationDate = new Date()) => {
    try {
        if (!student || !student.batch) {
            return { updatedCount: 0 };
        }

        const admissionDate = student.admissionDate || student.batchStartDate || student.createdAt;
        if (!admissionDate) {
            return { updatedCount: 0 };
        }

        const startDate = new Date(admissionDate);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(registrationDate || student.registrationDate || new Date());
        endDate.setUTCHours(23, 59, 59, 999);

        // If registration date is earlier than admission date, nothing to backfill
        if (startDate > endDate) {
            return { updatedCount: 0 };
        }

        const batchName = String(student.batch).trim();
        const batchRegex = new RegExp(`^${batchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        const query = {
            batchName: batchRegex,
            date: { $gte: startDate, $lte: endDate }
        };

        if (student.branchId) {
            query.$or = [
                { branchId: student.branchId },
                { branchId: { $exists: false } },
                { branchId: null }
            ];
        }

        const attendances = await StudentAttendance.find(query);
        if (!attendances || attendances.length === 0) {
            return { updatedCount: 0 };
        }

        let courseName = '';
        if (student.course && typeof student.course === 'object' && student.course.name) {
            courseName = student.course.name;
        } else if (student.course) {
            const courseDoc = await Course.findById(student.course).select('name').lean();
            courseName = courseDoc?.name || '';
        }

        const studentIdStr = student._id.toString();
        const studentName = `${student.firstName || ''} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName || ''}`.trim();
        const enrollmentNo = student.regNo || student.enrollmentNo || '';
        const contactStudent = student.mobileStudent || '';
        const contactParent = student.mobileParent || '';

        let updatedCount = 0;

        for (const attendance of attendances) {
            let modified = false;
            const records = attendance.records || [];
            const existingIdx = records.findIndex(r => {
                const id = r.studentId?._id || r.studentId;
                return id && id.toString() === studentIdStr;
            });

            if (existingIdx >= 0) {
                if (!records[existingIdx].isPresent) {
                    records[existingIdx].isPresent = true;
                    if (!records[existingIdx].studentRemark) {
                        records[existingIdx].studentRemark = 'Auto Present (Registration Completed)';
                    }
                    modified = true;
                }
            } else {
                records.push({
                    studentId: student._id,
                    enrollmentNo,
                    studentName,
                    courseName,
                    contactStudent,
                    contactParent,
                    isPresent: true,
                    studentRemark: 'Auto Present (Registration Completed)'
                });
                modified = true;
            }

            if (modified) {
                attendance.records = records;
                await attendance.save();
                updatedCount++;
            }
        }

        console.log(`[AutoAttendance] Marked Present for ${studentName} (${enrollmentNo}) across ${updatedCount} attendance records (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
        return { updatedCount };
    } catch (error) {
        console.error('[AutoAttendance] Error auto-marking attendance on registration:', error);
        return { updatedCount: 0, error: error.message };
    }
};

module.exports = {
    autoMarkAttendanceOnRegistration
};

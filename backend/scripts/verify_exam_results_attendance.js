require('dotenv').config({ path: 'e:/smart/smart-academy-management-system/backend/.env' });
const connectDB = require('../config/db');
const Student = require('../models/Student');
const ExamSchedule = require('../models/ExamSchedule');
const ExamResult = require('../models/ExamResult');
const StudentAttendance = require('../models/StudentAttendance');

const getAttendanceCutoffDate = (exam) => {
    if (!exam) return null;
    let cutoff = null;
    if (exam.timeTable && Array.isArray(exam.timeTable) && exam.timeTable.length > 0) {
        exam.timeTable.forEach((item) => {
            if (item.date) {
                const itemDate = new Date(item.date);
                if (!cutoff || itemDate < cutoff) {
                    cutoff = itemDate;
                }
            }
        });
    }
    if (!cutoff && (exam.startDate || exam.examDate)) {
        cutoff = new Date(exam.startDate || exam.examDate);
    }
    if (!cutoff) return null;
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setMilliseconds(-1);
    return cutoff;
};

const getStudentAttendanceSummary = async (studentId, exam) => {
    const cutoffDate = getAttendanceCutoffDate(exam);

    const calculateSummary = async (dateFilter = null) => {
        const match = { 'records.studentId': studentId };
        if (dateFilter) {
            match.date = dateFilter;
        }

        const [summary] = await StudentAttendance.aggregate([
            { $match: match },
            { $unwind: '$records' },
            { $match: { 'records.studentId': studentId } },
            {
                $group: {
                    _id: null,
                    totalDays: { $sum: 1 },
                    presentDays: {
                        $sum: {
                            $cond: ['$records.isPresent', 1, 0]
                        }
                    }
                }
            }
        ]);

        return summary || { presentDays: 0, totalDays: 0 };
    };

    let summary = cutoffDate
        ? await calculateSummary({ $lte: cutoffDate })
        : await calculateSummary();

    if (summary.totalDays === 0 && cutoffDate) {
        summary = await calculateSummary();
    }

    const presentDays = summary?.presentDays || 0;
    const totalDays = summary?.totalDays || 0;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0.00';

    return {
        presentDays,
        totalDays,
        percentage,
        totalPresentsText: `DAYS ${presentDays} OUT OF ${totalDays} (${percentage})`
    };
};

async function main() {
    await connectDB();

    const studentIds = [
        '6a5b9ad20360da1e6c2b0a96', // SARITA DINESH BHAGAT
        '6a5b98e80360da1e6c2b072a', // RAJ KUMAR RAM KUMAR SINGH
        '6a634d8e04966a7a75dadec2', // ANMOL PRAHLAD TIWARI
        '6a5dd00cb00ad76c2628b89b', // SHITAL SURESH KUMAR YADAV
        '6a5dd2c250c79e077e5d02cd'  // SAHIL SURESH KUMAR YADAV
    ];

    for (const id of studentIds) {
        const student = await Student.findById(id).lean();
        const result = await ExamResult.findOne({ student: id }).populate('exam').lean();
        const summary = await getStudentAttendanceSummary(student._id, result?.exam);

        console.log({
            student: `${student.firstName} ${student.lastName} (${student.regNo})`,
            examResultId: result?._id,
            somNumber: result?.somNumber,
            totalPresentsText: summary.totalPresentsText,
            percentage: `${summary.percentage}%`
        });
    }

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

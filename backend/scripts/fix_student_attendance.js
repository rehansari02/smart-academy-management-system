require('dotenv').config({ path: 'e:/smart/smart-academy-management-system/backend/.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Branch = require('../models/Branch');
const Batch = require('../models/Batch');
const StudentAttendance = require('../models/StudentAttendance');
const ExamResult = require('../models/ExamResult');

function getCourseEndDate(student) {
    const duration = Number(student?.course?.duration || 0);
    if (!duration) return null;
    const startDate = new Date(student.admissionDate || student.batchStartDate || student.registrationDate);
    if (Number.isNaN(startDate.getTime())) return null;

    const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const durationType = String(student?.course?.durationType || 'Month').toLowerCase();

    if (durationType.startsWith('year')) {
        endDate.setUTCFullYear(endDate.getUTCFullYear() + duration);
    } else if (durationType.startsWith('day')) {
        endDate.setUTCDate(endDate.getUTCDate() + duration);
    } else {
        endDate.setUTCMonth(endDate.getUTCMonth() + duration);
    }
    return endDate;
}

// Generate evenly spaced absent indices
function getAbsentIndices(totalDays, absentCount) {
    const absentIndices = new Set();
    if (absentCount <= 0) return absentIndices;

    const step = totalDays / absentCount;
    for (let k = 0; k < absentCount; k++) {
        const idx = Math.min(totalDays - 1, Math.floor((k + 0.5) * step));
        absentIndices.add(idx);
    }

    let filler = 3;
    while (absentIndices.size < absentCount && filler < totalDays) {
        absentIndices.add(filler);
        filler += 5;
    }
    return absentIndices;
}

async function fixAttendance() {
    await connectDB();
    console.log('Connected to MongoDB');

    const studentsToFix = [
        { id: '6a5b9ad20360da1e6c2b0a96', expectedName: 'SARITA DINESH BHAGAT' },
        { id: '6a5b98e80360da1e6c2b072a', expectedName: 'RAJ KUMAR RAM KUMAR SINGH' },
        { id: '6a634d8e04966a7a75dadec2', expectedName: 'ANMOL PRAHLAD TIWARI' },
        { id: '6a5dd00cb00ad76c2628b89b', expectedName: 'SHITAL SURESH KUMAR YADAV' },
        { id: '6a5dd2c250c79e077e5d02cd', expectedName: 'SAHIL SURESH KUMAR YADAV' }
    ];

    // Default faculty / attendance takers
    const defaultTakers = {
        'Bhestan Branch': new mongoose.Types.ObjectId('6a23a4f502f99734ce75b16a'), // Naina
        'Godadara Branch': new mongoose.Types.ObjectId('6a215e7d63002268ce1e787b') // Gaurav
    };

    for (const item of studentsToFix) {
        const student = await Student.findById(item.id)
            .populate('course')
            .populate('branchId');

        if (!student) {
            console.error(`Student not found for ID: ${item.id}`);
            continue;
        }

        const studentName = `${student.firstName || ''} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
        const branchName = student.branchId?.name || 'Main Branch';
        const branchId = student.branchId?._id;
        const courseName = student.course?.name || '';
        const enrollmentNo = student.regNo || student.enrollmentNo || '';
        const contactStudent = student.mobileStudent || '';
        const contactParent = student.mobileParent || '';
        const takenBy = defaultTakers[branchName] || defaultTakers['Bhestan Branch'];

        // Batch details
        const batchDoc = await Batch.findOne({ name: student.batch, branchId }).lean();
        const batchTime = (batchDoc?.startTime && batchDoc?.endTime)
            ? `${batchDoc.startTime} - ${batchDoc.endTime}`
            : (student.batchTime || '12:00 - 02:00');

        const startDate = new Date(student.admissionDate || student.batchStartDate);
        const utcStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
        const utcEnd = getCourseEndDate(student);

        // Collect all working days (skip Sundays)
        const workingDays = [];
        let sundaysSkipped = 0;
        let cur = new Date(utcStart.getTime());

        while (cur <= utcEnd) {
            if (cur.getUTCDay() === 0) {
                sundaysSkipped++;
            } else {
                workingDays.push(new Date(cur.getTime()));
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }

        const totalWorkingDays = workingDays.length;
        const targetPresent = Math.ceil(totalWorkingDays * 0.80);
        const targetAbsent = totalWorkingDays - targetPresent;
        const absentIndices = getAbsentIndices(totalWorkingDays, targetAbsent);

        console.log(`\n========================================`);
        console.log(`Processing: ${studentName} (${enrollmentNo})`);
        console.log(`Branch: ${branchName} | Batch: ${student.batch} (${batchTime})`);
        console.log(`Course: ${courseName} (${student.course?.duration} ${student.course?.durationType})`);
        console.log(`Dates: ${utcStart.toISOString().split('T')[0]} to ${utcEnd.toISOString().split('T')[0]}`);
        console.log(`Sundays Skipped: ${sundaysSkipped} | Working Days: ${totalWorkingDays}`);
        console.log(`Target: Present=${targetPresent}, Absent=${targetAbsent} (${((targetPresent/totalWorkingDays)*100).toFixed(2)}%)`);

        let insertedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < totalWorkingDays; i++) {
            const dayDate = workingDays[i];
            const isPresent = !absentIndices.has(i);

            const startOfDay = new Date(dayDate.getTime());
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(dayDate.getTime());
            endOfDay.setUTCHours(23, 59, 59, 999);

            // Match by batchName and date range (without branchId constraint to avoid missing docs where branchId is null)
            let att = await StudentAttendance.findOne({
                batchName: student.batch,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            const studentRecordData = {
                studentId: student._id,
                enrollmentNo,
                studentName,
                courseName,
                contactStudent,
                contactParent,
                isPresent,
                studentRemark: isPresent ? '' : 'Absent'
            };

            if (att) {
                // Find existing record by studentId OR by matching name
                const normName = studentName.toUpperCase().replace(/\s+/g, ' ');
                const recIdx = att.records.findIndex(r => {
                    const matchId = String(r.studentId?._id || r.studentId) === String(student._id);
                    const matchName = r.studentName && r.studentName.toUpperCase().replace(/\s+/g, ' ') === normName;
                    return matchId || matchName;
                });

                if (recIdx >= 0) {
                    att.records[recIdx].studentId = student._id;
                    att.records[recIdx].isPresent = isPresent;
                    att.records[recIdx].studentName = studentName;
                    att.records[recIdx].courseName = courseName;
                    att.records[recIdx].enrollmentNo = enrollmentNo;
                    att.records[recIdx].contactStudent = contactStudent;
                    att.records[recIdx].contactParent = contactParent;
                    att.records[recIdx].studentRemark = isPresent ? '' : 'Absent';
                } else {
                    att.records.push(studentRecordData);
                }

                if (!att.branchId && branchId) {
                    att.branchId = branchId;
                }
                if (!att.batchTime && batchTime) {
                    att.batchTime = batchTime;
                }

                await att.save();
                updatedCount++;
            } else {
                try {
                    await StudentAttendance.create({
                        date: startOfDay,
                        batchName: student.batch,
                        batchTime,
                        branchId,
                        takenBy,
                        remarks: 'Batch Attendance',
                        records: [studentRecordData]
                    });
                    insertedCount++;
                } catch (err) {
                    if (err.code === 11000) {
                        // In case of race condition / index collision, find and update
                        att = await StudentAttendance.findOne({
                            batchName: student.batch,
                            date: { $gte: startOfDay, $lte: endOfDay }
                        });
                        if (att) {
                            const normName = studentName.toUpperCase().replace(/\s+/g, ' ');
                            const recIdx = att.records.findIndex(r => {
                                const matchId = String(r.studentId?._id || r.studentId) === String(student._id);
                                const matchName = r.studentName && r.studentName.toUpperCase().replace(/\s+/g, ' ') === normName;
                                return matchId || matchName;
                            });
                            if (recIdx >= 0) {
                                att.records[recIdx].studentId = student._id;
                                att.records[recIdx].isPresent = isPresent;
                            } else {
                                att.records.push(studentRecordData);
                            }
                            await att.save();
                            updatedCount++;
                        }
                    } else {
                        throw err;
                    }
                }
            }
        }

        console.log(`Done for ${studentName}: Created ${insertedCount} new docs, updated ${updatedCount} docs.`);
    }

    console.log('\n========================================');
    console.log('Verifying final attendance for all 5 students...');

    for (const item of studentsToFix) {
        const student = await Student.findById(item.id).lean();
        const records = await StudentAttendance.find({ 'records.studentId': student._id }).lean();
        let total = 0, present = 0;
        records.forEach(att => {
            const r = att.records.find(rec => String(rec.studentId) === String(student._id));
            if (r) {
                total++;
                if (r.isPresent) present++;
            }
        });
        const pct = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';
        console.log(`- ${student.firstName} ${student.lastName} (${student.regNo}): ${present} / ${total} Present (${pct}%)`);
    }

    console.log('\nAttendance fix script completed successfully.');
    process.exit(0);
}

fixAttendance().catch(err => {
    console.error('Fatal error in fixAttendance:', err);
    process.exit(1);
});

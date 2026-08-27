const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Course = require('../models/Course');
require('../models/Subject');
const Exam = require('../models/Exam');
const ExamRequest = require('../models/ExamRequest');
const ExamSchedule = require('../models/ExamSchedule');

const STUDENT_TAG = 'exam-list-demo-20260826';
const SCHEDULE_TAG = 'final-september-2026-demo14';
const EXAM_NAME = 'Final Exam September';
const addDays = (date, days) => new Date(date.getTime() + (days * 86400000));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const students = await Student.find({ email: new RegExp(`^${STUDENT_TAG}\\.`), isDeleted: { $ne: true } }).sort({ email: 1 }).lean();
  if (students.length !== 14) throw new Error(`Expected 14 tagged students, found ${students.length}.`);
  const existing = await ExamSchedule.countDocuments({ remarks: SCHEDULE_TAG });
  if (existing) throw new Error(`Found ${existing} tagged schedules; refusing duplicates.`);

  await Exam.findOneAndUpdate({ name: EXAM_NAME }, { $set: { isActive: true, isDeleted: false } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const createdIds = [];
  try {
    for (const student of students) {
      const course = await Course.findById(student.course).populate('subjects.subject').lean();
      if (!course) throw new Error(`Course missing for ${student.email}.`);
      const subjects = (course.subjects || []).filter(item => item.subject?._id).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      if (!subjects.length) throw new Error(`No subjects configured for ${course.name}.`);
      const firstDate = new Date('2026-08-27T00:00:00.000Z');
      const timeTable = subjects.map((item, index) => ({
        subject: item.subject._id,
        date: addDays(firstDate, index),
        startTime: index === 0 ? '12:00 PM' : '10:00 AM',
        endTime: index === 0 ? '02:00 PM' : '12:00 PM',
        theory: Number(item.subject.theoryMarks || 0),
        practical: Number(item.subject.practicalMarks || 0),
        total: Number(item.subject.totalMarks || 0),
      }));
      const schedule = await ExamSchedule.create({ course: course._id, examName: EXAM_NAME, remarks: SCHEDULE_TAG, isActive: true, attendees: [student._id], timeTable });
      createdIds.push(schedule._id);
    }

    const studentIds = students.map(student => student._id);
    const updateResult = await ExamRequest.updateMany({ student: { $in: studentIds }, status: 'Pending', isDeleted: { $ne: true } }, { $set: { status: 'Approved' } });
    const pending = await ExamRequest.countDocuments({ student: { $in: studentIds }, status: 'Pending', isDeleted: { $ne: true } });
    const schedules = await ExamSchedule.find({ _id: { $in: createdIds } }).populate('course', 'name').populate('attendees', 'firstName lastName regNo branchName').populate('timeTable.subject', 'name').lean();
    console.log(JSON.stringify({ schedulesCreated: schedules.length, requestsApproved: updateResult.modifiedCount, pendingRequestsForStudents: pending, schedules: schedules.map(s => ({ course: s.course?.name, student: `${s.attendees[0]?.firstName} ${s.attendees[0]?.lastName}`, regNo: s.attendees[0]?.regNo, branch: s.attendees[0]?.branchName, exams: s.timeTable.map(row => ({ subject: row.subject?.name, date: row.date?.toISOString().slice(0, 10), time: `${row.startTime} - ${row.endTime}` })) })) }, null, 2));
  } catch (error) {
    if (createdIds.length) await ExamSchedule.deleteMany({ _id: { $in: createdIds } });
    throw error;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => mongoose.disconnect());

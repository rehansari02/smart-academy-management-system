const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

require('../models/Course');
require('../models/Student');
require('../models/Branch');
const ExamSchedule = require('../models/ExamSchedule');

async function inspectSchedules() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');

  const schedules = await ExamSchedule.find({ isDeleted: { $ne: true } })
    .populate('course', 'name')
    .populate('attendees', 'firstName lastName regNo branchId branchName')
    .lean();

  console.log(`Found ${schedules.length} ExamSchedules.`);
  schedules.forEach((s, idx) => {
    const branches = [...new Set((s.attendees || []).map(a => a.branchName || 'Main'))];
    console.log(`\n[${idx + 1}] ID: ${s._id} | ExamName: "${s.examName}" | Course: "${s.course?.name}" | Attendees: ${s.attendees?.length || 0} | Branches:`, branches);
  });

  await mongoose.disconnect();
}

inspectSchedules().catch(console.error);

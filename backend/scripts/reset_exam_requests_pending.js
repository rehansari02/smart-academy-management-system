const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

require('../models/Course');
require('../models/Branch');
const Student = require('../models/Student');
const ExamRequest = require('../models/ExamRequest');

async function resetExamRequestsToPending() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
    console.log('Connected to MongoDB successfully.');

    // Find the 20 students created/registered with mobile 9054578057
    const students = await Student.find({
      mobileParent: '9054578057',
      isRegistered: true,
      isDeleted: { $ne: true }
    });

    console.log(`Found ${students.length} matching students.`);

    const studentIds = students.map((s) => s._id);

    // Update all existing ExamRequests for these students back to 'Pending'
    const updateResult = await ExamRequest.updateMany(
      { student: { $in: studentIds } },
      { status: 'Pending', isDeleted: false }
    );

    console.log(`Updated ${updateResult.modifiedCount} existing ExamRequests to 'Pending'.`);

    // Check if any student doesn't have an ExamRequest yet
    let createdCount = 0;
    for (const student of students) {
      const existing = await ExamRequest.findOne({ student: student._id, isDeleted: false });
      if (!existing) {
        const count = await ExamRequest.countDocuments();
        const examSerialNo = `EX-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        await ExamRequest.create({
          student: student._id,
          examSerialNo,
          status: 'Pending',
          requestDate: new Date()
        });
        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`Created ${createdCount} new Pending ExamRequests for students who didn't have one.`);
    }

    const totalPendingCount = await ExamRequest.countDocuments({
      student: { $in: studentIds },
      status: 'Pending',
      isDeleted: false
    });

    console.log('\n========================================');
    console.log(`SUCCESS: ${totalPendingCount} Exam Requests are now Pending!`);
    console.log('Available at: http://localhost:5173/master/exam-request-list');
    console.log('========================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error resetting exam requests:', err);
    process.exit(1);
  }
}

resetExamRequestsToPending();

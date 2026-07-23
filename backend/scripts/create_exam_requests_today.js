const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('../models/Student');
const ExamRequest = require('../models/ExamRequest');

async function createExamRequestsForTodayStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
    console.log('Connected to MongoDB successfully.');

    // Find 20 students with mobile 9054578057 created/registered today
    const students = await Student.find({
      mobileParent: '9054578057',
      isRegistered: true,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });

    console.log(`Found ${students.length} matching students created today.`);

    let createdCount = 0;

    for (const student of students) {
      // Check if an existing exam request exists
      const existing = await ExamRequest.findOne({
        student: student._id,
        isDeleted: false,
        status: { $ne: 'Cancelled' }
      });

      if (existing) {
        console.log(`Exam request already exists for ${student.firstName} ${student.lastName} (${student.regNo || student.enrollmentNo}): ${existing.examSerialNo}`);
        continue;
      }

      // Generate serial numberEX-YYYY-XXXX
      const count = await ExamRequest.countDocuments();
      const examSerialNo = `EX-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const newRequest = await ExamRequest.create({
        student: student._id,
        examSerialNo,
        status: 'Pending',
        requestDate: new Date()
      });

      createdCount++;
      console.log(`[${createdCount}/${students.length}] Created Exam Request: ${newRequest.examSerialNo} for Student: ${student.firstName} ${student.lastName} (RegNo: ${student.regNo || student.enrollmentNo}, Branch: ${student.branchName})`);
    }

    console.log('\n========================================');
    console.log(`SUCCESS: Created ${createdCount} Exam Requests!`);
    console.log('Available at: http://localhost:5173/master/exam-request-list');
    console.log('========================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error creating exam requests:', err);
    process.exit(1);
  }
}

createExamRequestsForTodayStudents();

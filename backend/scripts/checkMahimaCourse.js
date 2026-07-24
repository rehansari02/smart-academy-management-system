const mongoose = require('mongoose');

async function testLocalCourses() {
  await mongoose.connect('mongodb://127.0.0.1:27017/education_erp');
  require('../models/Course');
  const Student = require('../models/Student');
  const FeeReceipt = require('../models/FeeReceipt');

  const mahima = await Student.findOne({ regNo: { $regex: '1947', $options: 'i' } })
    .populate('course')
    .lean();

  console.log('\n--- Mahima Student Course Test ---');
  console.log('Mahima Name:', mahima?.firstName, mahima?.lastName);
  console.log('Populated Course Object:', mahima?.course);
  console.log('Course Name:', mahima?.course?.name || mahima?.course?.shortName || 'N/A');

  process.exit(0);
}

testLocalCourses().catch(err => {
  console.error(err);
  process.exit(1);
});

const mongoose = require('mongoose');
const Student = require('./models/Student');
const Course = require('./models/Course');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const courseId = '9f5f1e2059705775df28865c';
  const batchName = 'BATCH-G01';
  
  const students = await Student.find({
    course: courseId,
    batch: batchName,
    isActive: true,
    isDeleted: false
  }).populate('course');
  
  console.log(`Found ${students.length} students:`);
  students.forEach(s => {
    console.log({
      name: `${s.firstName} ${s.lastName}`,
      admissionDate: s.admissionDate,
      batchStartDate: s.batchStartDate,
      course: s.course ? {
        _id: s.course._id,
        name: s.course.name,
        duration: s.course.duration,
        durationType: s.course.durationType
      } : null
    });
  });
  
  mongoose.connection.close();
}

test().catch(console.error);

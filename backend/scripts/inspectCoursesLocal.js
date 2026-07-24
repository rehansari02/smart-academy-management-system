const mongoose = require('mongoose');

async function inspectCoursesLocal() {
  await mongoose.connect('mongodb://127.0.0.1:27017/education_erp');
  const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));

  const courses = await Course.find({}).lean();
  console.log(`Local Courses Count: ${courses.length}`);
  courses.forEach(c => {
    console.log(`  Course ID: ${c._id} (type: ${typeof c._id}) | Name: ${c.name} | shortName: ${c.shortName}`);
  });

  process.exit(0);
}

inspectCoursesLocal();

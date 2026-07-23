const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Branch = require('../models/Branch');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
  console.log('Connected to MongoDB');

  const branches = await Branch.find({ isDeleted: { $ne: true } });
  console.log('--- BRANCHES ---');
  branches.forEach(b => console.log({ id: b._id, name: b.name, code: b.code }));

  const courses = await Course.find({ isDeleted: { $ne: true } });
  console.log('\n--- COURSES ---');
  courses.forEach(c => console.log({ id: c._id, name: c.name, fees: c.totalFees }));

  const batches = await Batch.find({ isDeleted: { $ne: true } });
  console.log('\n--- BATCHES ---');
  batches.forEach(b => console.log({ id: b._id, name: b.name, branch: b.branchId }));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});

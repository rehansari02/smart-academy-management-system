const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const FeeReceipt = require('../models/FeeReceipt');
const ExamRequest = require('../models/ExamRequest');

const RUN_TAG = 'exam-list-demo-20260826';
const PHONE = '9054578057';
const people = [
  ['Aarav', 'Patel', 'Male'], ['Diya', 'Shah', 'Female'], ['Vivaan', 'Mehta', 'Male'],
  ['Anaya', 'Desai', 'Female'], ['Reyansh', 'Joshi', 'Male'], ['Ishita', 'Rana', 'Female'],
  ['Krish', 'Verma', 'Male'], ['Myra', 'Chauhan', 'Female'], ['Arjun', 'Singh', 'Male'],
  ['Kiara', 'Prajapati', 'Female'], ['Dhruv', 'Yadav', 'Male'], ['Riya', 'Mishra', 'Female'],
  ['Kabir', 'Gupta', 'Male'], ['Aadhya', 'Trivedi', 'Female'],
];

const numericPrefix = (value) => {
  const parsed = Number(String(value || '').split('-')[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function maxStudentNumber(field, query = {}) {
  const rows = await Student.find({ ...query, [field]: { $exists: true, $nin: [null, ''] } }).select(field).lean();
  return rows.reduce((max, row) => Math.max(max, numericPrefix(row[field])), 0);
}

async function maxReceiptNumber() {
  const rows = await FeeReceipt.find({ receiptNo: { $exists: true, $nin: [null, ''] } }).select('receiptNo').lean();
  return rows.reduce((max, row) => Math.max(max, numericPrefix(row.receiptNo)), 0);
}

async function maxExamSequence() {
  const rows = await ExamRequest.find({ examSerialNo: /^EX-\d{4}-\d+$/ }).select('examSerialNo').lean();
  return rows.reduce((max, row) => Math.max(max, Number(String(row.examSerialNo).split('-').pop()) || 0), 0);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Student.countDocuments({ email: new RegExp(`^${RUN_TAG}`) });
  if (existing) throw new Error(`Run tag already exists (${existing} students); refusing to create duplicates.`);

  const branches = await Branch.find({ name: { $in: ['Bhestan Branch', 'Godadara Branch'] }, isActive: true }).lean();
  const bhestan = branches.find(branch => branch.name === 'Bhestan Branch');
  const godadara = branches.find(branch => branch.name === 'Godadara Branch');
  if (!bhestan || !godadara) throw new Error('Required Bhestan/Godadara branches are missing.');

  const courses = await Course.find({ isActive: true, isDeleted: false }).sort({ sorting: 1, name: 1 }).limit(14).lean();
  if (courses.length < 14) throw new Error('At least 14 active courses are required.');

  const batches = {};
  for (const branch of [bhestan, godadara]) {
    batches[String(branch._id)] = await Batch.findOne({
      branchId: branch._id,
      isActive: true,
      isDeleted: false,
      courses: { $all: courses.map(course => course._id) },
    }).lean();
    if (!batches[String(branch._id)]) throw new Error(`No common active batch found for ${branch.name}.`);
  }

  let globalReg = await maxStudentNumber('regNo', { isRegistered: true, isDeleted: { $ne: true } });
  let receiptSequence = await maxReceiptNumber();
  let examSequence = await maxExamSequence();
  const enrollmentByBranch = {
    [String(bhestan._id)]: await maxStudentNumber('enrollmentNo', { branchId: bhestan._id }),
    [String(godadara._id)]: await maxStudentNumber('enrollmentNo', { branchId: godadara._id }),
  };
  const created = { students: [], users: [], receipts: [], requests: [] };
  const results = [];
  const admin = await User.findOne({ role: 'Super Admin', isActive: true }).select('_id').lean();
  if (!admin) throw new Error('Active Super Admin not found for receipt creator.');

  try {
    for (let index = 0; index < people.length; index += 1) {
      const [firstName, lastName, gender] = people[index];
      const branch = index < 7 ? bhestan : godadara;
      const branchKey = String(branch._id);
      const course = courses[index];
      const batch = batches[branchKey];
      enrollmentByBranch[branchKey] += 1;
      globalReg += 1;
      examSequence += 1;

      const admissionDate = new Date('2025-01-15T00:00:00.000Z');
      const registrationDate = new Date();
      const enrollmentNo = String(enrollmentByBranch[branchKey]);
      const regNo = `${globalReg}-${branch.shortCode}`;
      const username = `${RUN_TAG}-${String(index + 1).padStart(2, '0')}`;
      const totalPaid = Number(course.admissionFees || 0) + Number(course.registrationFees || 0);

      const student = await Student.create({
        enrollmentNo,
        regNo,
        isActive: true,
        isRegistered: true,
        isCancelled: false,
        isDeleted: false,
        isAdmissionFeesPaid: true,
        admissionFeeAmount: Number(course.admissionFees || 0),
        registrationFeeAmount: Number(course.registrationFees || 0),
        branchId: branch._id,
        branchName: branch.name,
        registrationDate,
        admissionDate,
        firstName,
        middleName: 'Kumar',
        lastName,
        motherName: 'Demo Parent',
        dob: new Date(`200${index % 8}-0${(index % 8) + 1}-15T00:00:00.000Z`),
        gender,
        email: `${RUN_TAG}.${index + 1}@local.test`,
        mobileStudent: PHONE,
        mobileParent: PHONE,
        address: `${branch.name}, Surat`,
        state: 'Gujarat',
        city: 'Surat',
        pincode: '395023',
        occupationType: 'Student',
        education: '12th',
        reference: 'Direct',
        course: course._id,
        batch: batch.name,
        batchStartDate: admissionDate,
        paymentMode: 'Cash',
        paymentPlan: 'One Time',
        totalFees: Number(course.courseFees || 0),
        pendingFees: Math.max(0, Number(course.courseFees || 0) - totalPaid),
        emiDetails: { registrationFees: Number(course.registrationFees || 0) },
      });
      created.students.push(student._id);

      const user = await User.create({
        name: `${firstName} ${lastName}`,
        username,
        email: `${username}@student.local`,
        password: PHONE,
        role: 'Student',
        branchId: branch._id,
        branchName: branch.name,
        mobile: PHONE,
        isActive: true,
      });
      created.users.push(user._id);
      student.userId = user._id;
      await student.save();

      for (const fee of [
        { purpose: 'admission', amount: Number(course.admissionFees || 0), remarks: 'Admission Fee' },
        { purpose: 'registration', amount: Number(course.registrationFees || 0), remarks: 'Registration Fee' },
      ]) {
        if (fee.amount <= 0) continue;
        receiptSequence += 1;
        const receipt = await FeeReceipt.create({
          receiptNo: String(receiptSequence),
          student: student._id,
          course: course._id,
          branch: branch._id,
          amountPaid: fee.amount,
          paymentMode: 'Cash',
          receiptPurpose: fee.purpose,
          remarks: fee.remarks,
          date: registrationDate,
          createdBy: admin._id,
          idempotencyKey: `${RUN_TAG}-${fee.purpose}-${index + 1}`,
        });
        created.receipts.push(receipt._id);
      }

      const request = await ExamRequest.create({
        student: student._id,
        examSerialNo: `EX-${new Date().getFullYear()}-${String(examSequence).padStart(4, '0')}`,
        status: 'Pending',
        requestDate: new Date(),
        isDeleted: false,
      });
      created.requests.push(request._id);

      results.push({
        name: `${firstName} ${lastName}`,
        branch: branch.name,
        course: course.shortName,
        enrollmentNo,
        regNo,
        examSerialNo: request.examSerialNo,
      });
    }
  } catch (error) {
    await ExamRequest.deleteMany({ _id: { $in: created.requests } });
    await FeeReceipt.deleteMany({ _id: { $in: created.receipts } });
    await Student.deleteMany({ _id: { $in: created.students } });
    await User.deleteMany({ _id: { $in: created.users } });
    throw error;
  }

  console.log(JSON.stringify({ created: results.length, phone: PHONE, students: results }, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error.stack || error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

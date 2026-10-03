const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Student = require('../models/Student');
const FeeReceipt = require('../models/FeeReceipt');
const Course = require('../models/Course');
const helpers = require('../controllers/transactionController');

async function testController() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  await mongoose.connect(uri);

  const names = ['SARVESH', 'MAHIMA', 'GULNOOR', 'HASNAIN'];
  for (const n of names) {
    const student = await Student.findOne({
      $or: [{ firstName: n }, { firstName: { $regex: n, $options: 'i' } }],
      isDeleted: false
    }).populate('course');
    if (!student) continue;

    console.log(`\n======================================================`);
    console.log(`STUDENT: ${student.firstName} ${student.lastName} (${student.regNo})`);
    console.log(`Branch: ${student.branchName}`);
    console.log(`admissionFeeAmount in DB: ${student.admissionFeeAmount}`);
    console.log(`registrationFeeAmount in DB: ${student.registrationFeeAmount}`);
    console.log(`totalFees in DB: ${student.totalFees}, pendingFees: ${student.pendingFees}`);

    const allReceipts = await FeeReceipt.find({ student: student._id }).sort({ date: 1, createdAt: 1 }).lean();
    
    console.log('\n--- CURRENT DB RECEIPTS & SUMMARY ---');
    const currentSummary = helpers.calculateStudentPaymentSummary(student, allReceipts);
    console.log('totalReceived:', currentSummary.totalReceived);
    console.log('dueAmount:', currentSummary.dueAmount);
    console.log('outstandingAmount:', currentSummary.outstandingAmount);
    console.log('monthlyOutstanding:', currentSummary.monthlyOutstanding);
    console.log('currentInstallmentDue:', currentSummary.currentInstallmentDue);
    console.log('previousOutstanding:', currentSummary.previousOutstanding);
    console.log('admissionFee:', currentSummary.admissionFee, 'admissionPaid:', currentSummary.admissionPaid, 'admissionOutstanding:', currentSummary.admissionOutstanding);
    console.log('registrationFee:', currentSummary.registrationFee, 'registrationPaid:', currentSummary.registrationPaid, 'registrationOutstanding:', currentSummary.registrationOutstanding);

    const lifecycle = helpers.getReceiptLifecycleInfo(allReceipts, student);
    console.log('\nLifecycle of receipts:');
    allReceipts.forEach(r => {
      const info = lifecycle.get(r._id.toString());
      console.log(`  #${r.receiptNo} | amt: ${r.amountPaid} | dbPurpose: ${r.receiptPurpose} | lifecyclePurpose: ${info?.purpose} | dispInst: ${info?.displayInstallmentNumber} | remarks: "${r.remarks}"`);
    });
  }

  await mongoose.disconnect();
}
testController();

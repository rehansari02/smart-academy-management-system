const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Student = require('../models/Student');
const FeeReceipt = require('../models/FeeReceipt');
const Course = require('../models/Course');
const Branch = require('../models/Branch');

// Let's also import the helper functions from transactionController by requiring it or extracting them
async function test() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  await mongoose.connect(uri);

  const names = ['Mahima', 'Gulnoor', 'Hasnain', 'Sarvesh'];
  for (const n of names) {
    const students = await Student.find({
      $or: [
        { firstName: { $regex: n, $options: 'i' } },
        { lastName: { $regex: n, $options: 'i' } }
      ]
    }).populate('course');

    for (const student of students) {
      if (student.isDeleted) continue;
      // Filter for Bhestan or Godadara matching user's students
      if (!['MAHIMA MUNNALAL BHARDWAJ', 'GULNOOR JAVED  KHAN', 'Md. HASNAIN Md. KAISAR MANSURI', 'SARVESH NARENDRA YADAV'].includes(student.firstName + ' ' + (student.middleName ? student.middleName + ' ' : '') + student.lastName)) {
        continue;
      }

      console.log('\n======================================================');
      console.log(`STUDENT: ${student.firstName} ${student.lastName} (${student.regNo})`);
      console.log(`Branch: ${student.branchName}`);
      console.log('Total Fees:', student.totalFees, 'Pending Fees:', student.pendingFees);
      console.log('AdmissionFeeAmount:', student.admissionFeeAmount, 'RegistrationFeeAmount:', student.registrationFeeAmount);
      console.log('Course Fees in Course model: total =', student.course?.totalFees, 'adm =', student.course?.admissionFees, 'reg =', student.course?.registrationFees);
      console.log('EMI:', student.emiDetails);

      const receipts = await FeeReceipt.find({ student: student._id }).sort({ date: 1, createdAt: 1 }).lean();
      console.log(`Receipts (${receipts.length}):`);
      receipts.forEach((r, idx) => {
        console.log(`  [${idx + 1}] #${r.receiptNo} | Amt: ${r.amountPaid} | Date: ${r.date?.toISOString()?.split('T')[0]} | Purpose: ${r.receiptPurpose} | InstNo: ${r.installmentNumber} | DispInst: ${r.displayInstallmentNumber} | Remarks: "${r.remarks}"`);
      });

      // Let's call payment summary logic by simulating getStudentPaymentSummary
      // We can make an HTTP request or invoke the function
    }
  }
  await mongoose.disconnect();
}
test();

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const targetStudents = [
    { label: 'Mahima Bharadwaj', query: { firstName: { $regex: 'Mahima', $options: 'i' } } },
    { label: 'Gulnoor javed khan', query: { firstName: { $regex: 'Gulnoor', $options: 'i' } } }
  ];

  for (const t of targetStudents) {
    console.log(`\n======================================================`);
    console.log(`TARGET: ${t.label}`);
    console.log(`======================================================`);
    const students = await db.collection('students').find(t.query).toArray();
    for (const s of students) {
      const course = s.course ? await db.collection('courses').findOne({ _id: s.course }) : null;
      const branch = s.branchId ? await db.collection('branches').findOne({ _id: s.branchId }) : null;
      
      console.log(`Student: ${s.firstName} ${s.middleName || ''} ${s.lastName || ''}`);
      console.log(`RegNo: ${s.regNo}, Enrollment: ${s.enrollmentNo}, Branch: ${branch?.name || s.branchName}`);
      console.log(`Admission Date: ${s.admissionDate}, Batch Start: ${s.batchStartDate}, CreatedAt: ${s.createdAt}`);
      console.log(`Payment Mode: ${s.paymentMode}, Payment Plan: ${s.paymentPlan}`);
      console.log(`TotalFees in DB: ${s.totalFees}, PendingFees in DB: ${s.pendingFees}`);
      console.log(`AdmissionFeeAmount: ${s.admissionFeeAmount}, RegistrationFeeAmount: ${s.registrationFeeAmount}`);
      console.log(`EMI Details:`, JSON.stringify(s.emiDetails));
      console.log(`Course Info:`, {
        name: course?.name,
        shortName: course?.shortName,
        totalFees: course?.totalFees,
        admissionFees: course?.admissionFees,
        registrationFees: course?.registrationFees,
        duration: course?.duration,
        durationUnit: course?.durationUnit
      });

      const receipts = await db.collection('feereceipts').find({
        student: s._id
      }).sort({ date: 1, createdAt: 1 }).toArray();

      let sumPaid = 0;
      console.log(`Receipts (${receipts.length}):`);
      receipts.forEach((r, idx) => {
        sumPaid += Number(r.amountPaid || 0);
        console.log(`  [${idx + 1}] No: ${r.receiptNo} | Amt: ${r.amountPaid} | Date: ${r.date?.toISOString()?.split('T')[0] || r.createdAt} | Purpose: ${r.receiptPurpose} | Remarks: "${r.remarks}" | Mode: ${r.paymentMode}`);
      });
      console.log(`SUM OF ALL RECEIPTS: ${sumPaid}`);
      console.log(`totalFees - sumPaid: ${(s.totalFees || 0) - sumPaid}`);
      console.log(`(totalFees + admissionFeeAmount) - sumPaid: ${(s.totalFees || 0) + (s.admissionFeeAmount || 0) - sumPaid}`);
    }
  }
  await mongoose.disconnect();
}
check();

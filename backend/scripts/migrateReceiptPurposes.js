const mongoose = require('mongoose');

async function migrateTarget(uri, label) {
  console.log(`\n🚀 Starting FeeReceipt Lock & Migration for [ ${label} ]...`);
  const conn = await mongoose.createConnection(uri).asPromise();
  console.log(`✅ Connected to [ ${label} ]`);

  const Course = conn.model('Course', require('../models/Course').schema);
  const Student = conn.model('Student', require('../models/Student').schema);
  const FeeReceipt = conn.model('FeeReceipt', require('../models/FeeReceipt').schema);

  const studentsWithReceipts = await FeeReceipt.distinct('student');
  console.log(`📦 Found ${studentsWithReceipts.length} students with fee receipts in ${label}.`);

  let totalUpdated = 0;

  for (const studentId of studentsWithReceipts) {
    const student = await Student.findById(studentId).populate('course').lean();
    if (!student) continue;

    const receipts = await FeeReceipt.find({ student: studentId })
      .sort({ createdAt: 1, receiptNo: 1 })
      .lean();

    let hasAdmission = false;
    let hasRegistration = false;
    let installmentCounter = 0;

    for (const r of receipts) {
      const remarksLower = (r.remarks || '').toLowerCase();
      let purpose = 'installment';

      if (remarksLower.includes('admission')) {
        if (!hasAdmission) {
          purpose = 'admission';
          hasAdmission = true;
        } else {
          purpose = 'installment';
        }
      } else if (remarksLower.includes('registration')) {
        if (!hasRegistration) {
          purpose = 'registration';
          hasRegistration = true;
        } else {
          purpose = 'installment';
        }
      } else {
        if (!hasAdmission && (student.admissionFeeAmount > 0 || r.amountPaid <= 2500)) {
          purpose = 'admission';
          hasAdmission = true;
        } else if (!hasRegistration && student.course?.registrationFees > 0) {
          purpose = 'registration';
          hasRegistration = true;
        } else {
          purpose = 'installment';
        }
      }

      let displayInstallmentNumber = 0;
      if (purpose === 'installment') {
        installmentCounter += 1;
        displayInstallmentNumber = installmentCounter;
      }

      await FeeReceipt.updateOne(
        { _id: r._id },
        {
          $set: {
            receiptPurpose: purpose,
            installmentNumber: displayInstallmentNumber || r.installmentNumber || 1,
            displayInstallmentNumber: displayInstallmentNumber
          }
        }
      );
      totalUpdated++;
    }
  }

  console.log(`🎉 SUCCESS! Locked and updated ${totalUpdated} fee receipts across ${studentsWithReceipts.length} students in [ ${label} ].`);
  await conn.close();
}

async function runAll() {
  const localUri = 'mongodb://127.0.0.1:27017/education_erp';
  const atlasUri = 'mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew.lbsfzqh.mongodb.net/?appName=Smartinstituenew';

  await migrateTarget(localUri, 'LOCAL DB');
  await migrateTarget(atlasUri, 'ATLAS DB');

  process.exit(0);
}

runAll().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});

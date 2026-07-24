const mongoose = require('mongoose');

async function testMahimaController() {
  await mongoose.connect('mongodb://127.0.0.1:27017/education_erp');
  console.log('Connected to local MongoDB');

  const Student = require('../models/Student');
  const FeeReceipt = require('../models/FeeReceipt');
  const { calculateStudentPaymentSummary, attachReceiptDisplayInfo } = require('../controllers/transactionController');

  const mahima = await Student.findOne({
    $or: [
      { firstName: { $regex: 'mahima', $options: 'i' } },
      { lastName: { $regex: 'bhardwaj', $options: 'i' } }
    ],
    regNo: { $regex: '1947', $options: 'i' }
  }).populate('course').lean();

  if (!mahima) {
    console.log('Mahima student not found!');
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`Student: ${mahima.firstName} ${mahima.lastName} | RegNo: ${mahima.regNo}`);

  const receipts = await FeeReceipt.find({ student: mahima._id }).sort({ createdAt: 1 }).lean();
  console.log(`Raw Receipts in DB (${receipts.length}):`);
  receipts.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ReceiptNo: ${r.receiptNo} | Date: ${r.date?.toISOString().split('T')[0]} | CreatedAt: ${r.createdAt?.toISOString()} | Purpose: ${r.receiptPurpose} | DisplayInstNo: ${r.displayInstallmentNumber} | Remarks: "${r.remarks}"`);
  });

  process.exit(0);
}

testMahimaController().catch(err => {
  console.error(err);
  process.exit(1);
});

const mongoose = require('mongoose');

async function testPaymentHistoryApi() {
  await mongoose.connect('mongodb://127.0.0.1:27017/education_erp');
  require('../models/Course');
  require('../models/Branch');
  require('../models/User');
  const Student = require('../models/Student');
  const FeeReceipt = require('../models/FeeReceipt');

  const mahima = await Student.findOne({ regNo: { $regex: '1947', $options: 'i' } }).lean();

  const receipts = await FeeReceipt.find({ student: mahima._id })
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails branchId admissionFeeAmount")
    .populate("course", "name shortName admissionFees registrationFees")
    .populate("branch", "name shortCode address city state phone mobile email")
    .populate("createdBy", "name username role")
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const receiptInfo = new Map();
  let hasAdmission = false;
  let hasRegistration = false;
  let installmentNumber = 0;

  receipts.forEach((receipt) => {
    let purpose = receipt.receiptPurpose || (
      (receipt.remarks || '').toLowerCase().includes('admission') ? 'admission' :
      (receipt.remarks || '').toLowerCase().includes('registration') ? 'registration' : 'installment'
    );
    let displayInstallmentNumber = Number(receipt.displayInstallmentNumber || 0);

    if (receipt.receiptPurpose) {
      if (purpose === "admission") hasAdmission = true;
      if (purpose === "registration") hasRegistration = true;
      if (purpose === "installment" && displayInstallmentNumber > 0) {
        installmentNumber = Math.max(installmentNumber, displayInstallmentNumber);
      }
    }

    receiptInfo.set(receipt._id.toString(), {
      purpose,
      displayInstallmentNumber
    });
  });

  const finalHistory = receipts.map((receipt) => {
    const info = receiptInfo.get(receipt._id.toString());
    return {
      ...receipt,
      receiptPurpose: info.purpose,
      displayInstallmentNumber: info.displayInstallmentNumber
    };
  });

  console.log('\n--- Output of getStudentPaymentHistory for Mahima ---');
  finalHistory.forEach((r, idx) => {
    console.log(`${idx + 1}. ReceiptNo: ${r.receiptNo} | Date: ${r.date?.toISOString().split('T')[0]} | Purpose: ${r.receiptPurpose} | DisplayInstNo: ${r.displayInstallmentNumber} | Remarks: "${r.remarks}"`);
  });

  process.exit(0);
}

testPaymentHistoryApi().catch(err => console.error(err));

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('../models/Student');
const Branch = require('../models/Branch');
const User = require('../models/User');
const FeeReceipt = require('../models/FeeReceipt');

async function registerPendingStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
    console.log('Connected to MongoDB successfully.');

    // 1. Find all pending registration students
    const pendingStudents = await Student.find({
      isRegistered: false,
      isDeleted: { $ne: true }
    }).sort({ createdAt: 1 });

    console.log(`Found ${pendingStudents.length} pending registration students.\n`);

    if (pendingStudents.length === 0) {
      console.log('No pending registration students to process.');
      await mongoose.disconnect();
      return;
    }

    const today = new Date(); // 2026-07-23

    // Find admin/system user for FeeReceipt createdBy field
    let adminUser = await User.findOne({ role: 'Super Admin' });
    if (!adminUser) {
      adminUser = await User.findOne({});
    }

    let registeredCount = 0;

    for (const student of pendingStudents) {
      // A. Calculate next sequence for regNo
      const lastStudent = await Student.aggregate([
        { 
          $match: { 
            regNo: { $exists: true, $ne: null, $ne: "" },
            isRegistered: true,
            isDeleted: { $ne: true } 
          } 
        },
        {
          $project: {
            regNo: 1,
            seq: {
              $convert: {
                input: { $arrayElemAt: [{ $split: ["$regNo", "-"] }, 0] },
                to: "int",
                onError: 0,
                onNull: 0
              }
            }
          }
        },
        { $sort: { seq: -1 } },
        { $limit: 1 }
      ]);

      let nextSequence = 1;
      if (lastStudent.length > 0 && lastStudent[0].seq > 0) {
        nextSequence = lastStudent[0].seq + 1;
      }

      let branchCode = 'MN';
      if (student.branchId) {
        const branch = await Branch.findById(student.branchId);
        if (branch && (branch.shortCode || branch.code)) {
          branchCode = branch.shortCode || branch.code;
        } else if (branch && branch.name) {
          if (branch.name.toLowerCase().includes('bhestan')) branchCode = 'BH';
          else if (branch.name.toLowerCase().includes('godadara')) branchCode = 'GD';
        }
      }

      const finalRegNo = `${nextSequence}-${branchCode}`;
      const username = `std_${student.enrollmentNo || Date.now().toString().slice(-4)}`;
      const password = '123';

      // B. Create/Get User
      let newUser = await User.findOne({ username });
      if (!newUser) {
        let accountEmail = student.email;
        if (accountEmail) {
          const emailOwner = await User.findOne({ email: accountEmail }).select('_id');
          if (emailOwner) accountEmail = null;
        }

        newUser = await User.create({
          name: `${student.firstName} ${student.lastName}`,
          email: accountEmail || `student_${student._id}@institute.local`,
          username,
          password,
          role: 'Student',
          branchId: student.branchId
        });
      }

      // C. Fee Receipt creation (Registration Fee)
      const regFeeAmount = 500;
      const lastReceipt = await FeeReceipt.findOne({})
        .sort({ receiptNo: -1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .lean();

      let receiptNo = lastReceipt && !isNaN(lastReceipt.receiptNo) ? Number(lastReceipt.receiptNo) + 1 : 1;

      await FeeReceipt.create({
        receiptNo: String(receiptNo),
        student: student._id,
        course: student.course,
        amountPaid: regFeeAmount,
        date: today,
        paymentMode: 'Cash',
        remarks: 'Registration Fee',
        createdBy: adminUser?._id,
        branch: student.branchId
      });

      // D. Update Student
      student.regNo = finalRegNo;
      student.isRegistered = true;
      student.registrationDate = today;
      student.registrationFeeAmount = (student.registrationFeeAmount || 0) + regFeeAmount;
      student.isRegistrationFeesPaid = true;
      student.pendingFees = Math.max(0, (student.pendingFees || 0) - regFeeAmount);
      student.userId = newUser._id;

      await student.save();
      registeredCount++;

      console.log(`[${registeredCount}/${pendingStudents.length}] Registered: ${student.firstName} ${student.lastName} | RegNo: ${finalRegNo} | Branch: ${student.branchName || branchCode}`);
    }

    console.log('\n========================================');
    console.log(`SUCCESS: Registered all ${registeredCount} pending students!`);
    console.log('Moved to Registered Students (Student Master) list.');
    console.log('========================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

registerPendingStudents();

const Inquiry = require("../models/Inquiry");
const FeeReceipt = require("../models/FeeReceipt");
const Student = require("../models/Student");
const Batch = require("../models/Batch");
const Counter = require("../models/Counter");
const asyncHandler = require("express-async-handler");
const generateEnrollmentNumber = require("../utils/enrollmentGenerator");
const sendSMS = require("../utils/smsSender"); // Moved to top for global use

// --- INQUIRY ---

// @desc Get Inquiries with Filters
const getInquiries = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, studentName, referenceBy, source, dateFilterType } =
    req.query;

  let query = { isDeleted: false };

  // Date Filters
  if (startDate && endDate) {
    const dateField = dateFilterType || "inquiryDate";
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query[dateField] = { $gte: new Date(startDate), $lte: end };
  }

  // Status Filter
  if (status) query.status = status;

  // Source Filter
  if (source) query.source = source;

  // Student Name Search (Regex)
  if (studentName) {
    query.$or = [
      { firstName: { $regex: studentName, $options: "i" } },
      { lastName: { $regex: studentName, $options: "i" } },
    ];
  }

  // Reference By Filter
  if (referenceBy) {
    query.referenceBy = { $regex: referenceBy, $options: "i" };
  }

  // --- BRANCH SCOPING ---
  // --- BRANCH SCOPING ---
  if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
      query.branchId = req.user.branchId;
  }
  if (req.query.branchId) {
      query.branchId = req.query.branchId;
  }

  const inquiries = await Inquiry.find(query)
    .populate("interestedCourse", "name")
    .populate("allocatedTo", "name")
    .populate("branchId", "name shortCode")
    .sort({ createdAt: -1 });

  res.json(inquiries);
});

// @desc Create Inquiry
const createInquiry = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.studentPhoto = req.file.path.replace(/\\/g, "/"); // Normalize path
  }

  // Handle empty string branchId
  if (data.branchId === '') {
    delete data.branchId;
  }

  // Assign Branch automatically for non-Super Admin
  if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
    data.branchId = req.user.branchId;
  }


  if (data.referenceDetail && typeof data.referenceDetail === "string") {
    try {
      data.referenceDetail = JSON.parse(data.referenceDetail);
    } catch (e) {
      console.error("Error parsing referenceDetail", e);
    }
  }

  const inquiry = await Inquiry.create(data);

  if (req.body.visitorId) {
    const Visitor = require("../models/Visitor");
    await Visitor.findByIdAndUpdate(req.body.visitorId, {
      inquiryId: inquiry._id,
    });
  }

  res.status(201).json(inquiry);
});

// @desc Update Inquiry
const updateInquiryStatus = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (inquiry) {
    if (req.body.isDeleted === true) {
      await Inquiry.findByIdAndDelete(req.params.id);
      return res.json({
        id: req.params.id,
        message: "Inquiry Removed Permanently",
      });
    }

    const fields = [
      "status",
      "source",
      "remarks",
      "allocatedTo",
      "referenceBy",
      "firstName",
      "middleName",
      "lastName",
      "email",
      "gender",
      "dob",
      "contactStudent",
      "contactParent",
      "contactHome",
      "address",
      "city",
      "state",
      "education",
      "qualification",
      "interestedCourse",
      "inquiryDate",
      "followUpDetails",
      "followUpDate",
      "nextVisitingDate",
      "visitReason",
      "relationType",
      "customEducation",
      "referenceDetail",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (
          field === "referenceDetail" &&
          typeof req.body[field] === "string"
        ) {
          try {
            inquiry[field] = JSON.parse(req.body[field]);
          } catch (e) {
            /* ignore parse error */
          }
        } else {
          inquiry[field] = req.body[field];
        }
      }
    });

    if (req.file) {
      inquiry.studentPhoto = req.file.path.replace(/\\/g, "/");
    }

    await inquiry.save();
    await inquiry.populate('branchId', 'name shortCode'); // Populate for frontend consistency
    res.json(inquiry);
  } else {
    res.status(404);
    throw new Error("Inquiry not found");
  }
});

// --- FEES (Standard) ---
// @desc Get Fee Receipts with Filters
const getFeeReceipts = asyncHandler(async (req, res) => {
  const { startDate, endDate, receiptNo, paymentMode, studentId, studentName, reference } = req.query;

  let query = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  // --- BRANCH SCOPING ---
  if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
      query.branch = req.user.branchId;
  }
  // Allow Super Admin to filter by branch if provided in query
  if (req.query.branchId) {
      query.branch = req.query.branchId;
  }

  if (receiptNo) query.receiptNo = { $regex: receiptNo, $options: "i" };
  if (paymentMode) query.paymentMode = paymentMode;
  if (studentId) query.student = studentId;

  if (studentName || reference) {
      let studentQuery = {};
      if (studentName) {
           studentQuery.$or = [
              { firstName: { $regex: studentName, $options: "i" } },
              { lastName: { $regex: studentName, $options: "i" } },
              { regNo: { $regex: studentName, $options: "i" } },
              { enrollmentNo: { $regex: studentName, $options: "i" } }
           ];
      }
      if (reference) {
           studentQuery.reference = { $regex: reference, $options: 'i' };
      }
      const matchingStudents = await Student.find(studentQuery).select('_id');
      if (query.student) {
          query.student = { $in: matchingStudents.map(s => s._id).filter(id => id.toString() === query.student.toString()) };
      } else {
          query.student = { $in: matchingStudents.map(s => s._id) };
      }
  }

  const receipts = await FeeReceipt.find(query)
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails")
    .populate("course", "name shortName")
    .populate("branch", "name shortCode") // Populate Branch for Super Admin visibility
    .sort({ createdAt: -1 });

  res.json(receipts);
});

// @desc Create Fee Receipt
const createFeeReceipt = asyncHandler(async (req, res) => {
  const { 
    studentId, courseId, amountPaid, paymentMode, remarks, date,
    bankName, chequeNumber, chequeDate, transactionId, transactionDate 
  } = req.body;

  // 1. Parallel Data Fetching
  const [student, existingReceipts] = await Promise.all([
    Student.findById(studentId),
    FeeReceipt.find({ student: studentId }).sort({ createdAt: 1 }).lean()
  ]);

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  // 2. Determine Branch for Receipt (Moved up for Receipt No Generation)
  // If Super Admin, use Student's Branch. If Branch User, use their Branch.
  let branchId = null;
  if (req.user.role === 'Super Admin') {
      branchId = student.branchId;
  } else if (req.user.branchId) {
      branchId = req.user.branchId;
  }

  // 3. Generate Global Receipt No (Changed from Branch-Scoped)
  // Find max existing receipt number GLOBALLY
  let receiptNo = "1";
  const lastReceipt = await FeeReceipt.findOne({}) // Empty query means global
    .sort({ receiptNo: -1 })
    .collation({ locale: "en_US", numericOrdering: true });
    
  if (lastReceipt && lastReceipt.receiptNo && !isNaN(lastReceipt.receiptNo)) {
      receiptNo = String(Number(lastReceipt.receiptNo) + 1);
  }

  // 2.5. Calculate Installment Number
  let installmentNumber = 1;
  
  if (existingReceipts.length > 0) {
    installmentNumber = existingReceipts.length + 1;
  }
  
  if (installmentNumber === 1 && student.isRegistered) {
    installmentNumber = 3; 
  }

  // branchId is already determined above

  // 3. Create Receipt
  const receipt = await FeeReceipt.create({
    receiptNo,
    student: studentId,
    course: courseId,
    branch: branchId, // Assign Branch
    amountPaid,
    paymentMode,
    remarks,
    date: date || Date.now(),
    createdBy: req.user._id,
    installmentNumber,
    bankName,
    chequeNumber,
    chequeDate,
    transactionId,
    transactionDate
  });

  // 4. Update Student Pending Fees & Status
  let admissionCompletedNow = false;

  if (!student.isAdmissionFeesPaid) {
    student.isAdmissionFeesPaid = true;
    student.admissionFeeAmount = Number(amountPaid);
    admissionCompletedNow = true;
    
    // Check if Full Course Fee is paid
    const totalCourseFee = (student.totalFees || 0);
    // Note: totalFees in student model typically includes everything. 
    // If strict match requested:
    if (Number(amountPaid) >= totalCourseFee) {
        student.pendingFees = 0;
    } else {
        // If paid more than 0, reduce pending fees logic
        // pendingFees usually starts as totalFees.
        // So we strictly subtract what is paid.
        student.pendingFees = Math.max(0, student.pendingFees - Number(amountPaid));
    }

    if (!student.enrollmentNo && student.branchId) {
        student.enrollmentNo = await generateEnrollmentNumber(student.branchId);
    }
  } else {
    student.pendingFees = student.pendingFees - Number(amountPaid);
  }

  await student.save();

  // 4.5. Remove from Admin "Online Admission" list when admission fee paid (student had inquiryId)
  if (admissionCompletedNow && student.inquiryId) {
    await Inquiry.findByIdAndUpdate(student.inquiryId, { source: 'Converted', status: 'Complete' });
  }

  // 5. Send Transaction SMS (Applies to ALL Receipts)
  try {
      const var1 = `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`; // Student Name
      const var2 = amountPaid; // Amount
      
      // Determine var3 (Purpose)
      let var3 = `Installment ${installmentNumber}`;
      if (admissionCompletedNow || (remarks && remarks.toLowerCase().includes('admission'))) {
          var3 = "Admission Fees";
      } else if (remarks && remarks.toLowerCase().includes('registration')) {
          var3 = "Registration Fees";
      }

      // Determine var4 (Reg No or Enrollment No)
      const var4 = student.regNo || student.enrollmentNo || "N/A";

      const smsMessage = `Dear, ${var1}. Your Course fees ${var2} has been deposited for ${var3}, Reg.No. ${var4}. Thank you, Smart Institute`;

      const contacts = [...new Set([student.mobileStudent, student.mobileParent, student.contactHome].filter(Boolean))]; 
      
      // Send SMS asynchronously
      console.log(`Sending Fees SMS to: ${contacts.join(', ')} | Msg: ${smsMessage}`);
      
      // Send SMS synchronously (awaited)
      await Promise.all(contacts.map(num => 
          sendSMS(num, smsMessage).catch(err => console.error(`Failed to send Transaction SMS to ${num}`, err))
      ));
      
  } catch (error) {
      console.error("Error setting up Transaction SMS", error);
  }

  // 6. Send Specific Welcome SMS (Only for new Admission)
  // This can be kept if you want a separate welcome message, or removed if the generic one is enough.
  // I have kept it as it provides specific Batch Time info which the generic one does not.
  if (admissionCompletedNow) {
    try {
      const Course = require("../models/Course");
      // sendSMS already imported at top

      const courseDoc = await Course.findById(courseId);
      const batchDoc = await Batch.findOne({ name: student.batch });

      const courseName = courseDoc ? courseDoc.name : "N/A";
      const batchTime = batchDoc
        ? `${batchDoc.startTime} to ${batchDoc.endTime}`
        : "N/A";
      const fullName = `${student.firstName} ${student.lastName}`;

      const welcomeMessage = `Welcome to Smart Institute, Dear, ${fullName}. your admission has been successfully completed. Enrollment No. ${student.enrollmentNo}, course ${courseName}, Batch Time ${batchTime}`;

      const contacts = [
        ...new Set(
          [
            student.mobileStudent,
            student.mobileParent,
            student.contactHome,
          ].filter(Boolean)
        ),
      ];
      await Promise.all(contacts.map((num) => sendSMS(num, welcomeMessage)));
    } catch (error) {
      console.error("Failed to send Welcome SMS", error);
    }
  }

  res.status(201).json(receipt);
});

// @desc Update Fee Receipt
const updateFeeReceipt = asyncHandler(async (req, res) => {
  const receipt = await FeeReceipt.findById(req.params.id);

  if (receipt) {
    if (req.body.amountPaid && req.body.amountPaid !== receipt.amountPaid) {
      const student = await Student.findById(receipt.student);
      if (student) {
        const diff = Number(req.body.amountPaid) - Number(receipt.amountPaid);
        student.pendingFees = student.pendingFees - diff;
        await student.save();
      }
    }

    receipt.amountPaid = req.body.amountPaid || receipt.amountPaid;
    receipt.paymentMode = req.body.paymentMode || receipt.paymentMode;
    receipt.remarks = req.body.remarks || receipt.remarks;
    receipt.date = req.body.date || receipt.date;
    
    if (req.body.bankName !== undefined) receipt.bankName = req.body.bankName;
    if (req.body.chequeNumber !== undefined) receipt.chequeNumber = req.body.chequeNumber;
    if (req.body.chequeDate !== undefined) receipt.chequeDate = req.body.chequeDate;
    if (req.body.transactionId !== undefined) receipt.transactionId = req.body.transactionId;
    if (req.body.transactionDate !== undefined) receipt.transactionDate = req.body.transactionDate;

    await receipt.save();
    res.json(receipt);
  } else {
    res.status(404);
    throw new Error("Receipt not found");
  }
});

// @desc Delete Fee Receipt
const deleteFeeReceipt = asyncHandler(async (req, res) => {
  const receipt = await FeeReceipt.findById(req.params.id);

  if (receipt) {
    const student = await Student.findById(receipt.student);
    if (student) {
      student.pendingFees = student.pendingFees + Number(receipt.amountPaid);
      await student.save();
    }

    await receipt.deleteOne();
    res.json({ message: "Receipt removed" });
  } else {
    res.status(404);
    throw new Error("Receipt not found");
  }
});

const getStudentFees = asyncHandler(async (req, res) => {
  const receipts = await FeeReceipt.find({
    student: req.params.studentId,
  })
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails")
    .populate("course", "name shortName")
    .sort({ createdAt: -1 });
  res.json(receipts);
});

// --- LEDGER REPORT ---
const getStudentLedger = asyncHandler(async (req, res) => {
  const { studentId, regNo } = req.query;

  let student = null;
  if (studentId) {
    student = await Student.findById(studentId).populate("course");
  } else if (regNo) {
    student = await Student.findOne({ regNo }).populate("course");
  }

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const batchDoc = await Batch.findOne({ name: student.batch });
  const receipts = await FeeReceipt.find({ student: student._id }).sort({
    date: 1,
  });

  const totalCourseFees =
    (student.totalFees || 0) + (student.admissionFeeAmount || 0);
  const totalPaid = receipts.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const dueAmount = totalCourseFees - totalPaid;

  res.json({
    student,
    course: student.course,
    batch: batchDoc,
    receipts,
    summary: { totalCourseFees, totalPaid, dueAmount },
  });
});

// @desc    Get Student Payment Summary
const getStudentPaymentSummary = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId).populate("course");
  
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const receipts = await FeeReceipt.find({ student: student._id });
  const totalReceived = receipts.reduce((acc, curr) => acc + curr.amountPaid, 0);

  // --- Total & Due Calculation (Preserved) ---
  const courseAdmissionFee = student.course && student.course.admissionFees ? student.course.admissionFees : 0;
  const paidAdmissionFee = student.admissionFeeAmount || 0;
  const effectiveAdmissionFee = Math.max(courseAdmissionFee, paidAdmissionFee);
  const totalFees = (student.totalFees || 0) + effectiveAdmissionFee;
  
  // Total Remaining Balance
  const dueAmount = totalFees - totalReceived;

  // --- NEW OUTSTANDING CALCULATION (Per User Requirement) ---
  let outstandingAmount = 0;
  const feesMethod = student.paymentPlan || "One Time";
  let emiStructure = null;

  // 1. Calculate Pending Registration Fees
  // "registration amount is decided in the course"
  const courseRegFees = student.course && student.course.registrationFees ? Number(student.course.registrationFees) : 0;
  
  // "when student pays registration fees" - filter receipts by remarks "registration"
  const regReceipts = receipts.filter(r => {
      const rem = (r.remarks || "").toLowerCase();
      return rem.includes("registration");
  });
  const totalRegPaid = regReceipts.reduce((acc, curr) => acc + curr.amountPaid, 0);
  
  // "pending registration fees... is our outstanding amount"
  const pendingRegFees = Math.max(0, courseRegFees - totalRegPaid);

  if (student.paymentPlan === "Monthly") {
      // Monthly Plan Logic:
      // "outstanding amount should show with upcoming EMI + pending registration amount"

      const monthlyInstallment = student.emiDetails && student.emiDetails.monthlyInstallment ? Number(student.emiDetails.monthlyInstallment) : 0;
      const months = student.emiDetails && student.emiDetails.months ? Number(student.emiDetails.months) : 0;

      if (monthlyInstallment && months) {
          emiStructure = `₹${monthlyInstallment} x ${months} months`;
      }

      // Add one installment (Upcoming EMI) if there is any remaining total balance
      let upcomingEMI = 0;
      
      const startDate = student.batchStartDate || student.admissionDate || student.createdAt;
      const start = new Date(startDate);
      const now = new Date();
      
      // EMI starts from the month AFTER the batch start / admission date
      // Calculate the end of the starting month
      const startMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

      if ((student.pendingFees || 0) > 0 && now > startMonthEnd) {
           upcomingEMI = monthlyInstallment;
           // Cap EMI at total pending balance to avoid asking for more than due
           if (upcomingEMI > student.pendingFees) {
               upcomingEMI = student.pendingFees;
           }
      }
      
      outstandingAmount = pendingRegFees + upcomingEMI;

  } else {
      // One Time Plan Logic:
      // "if one time plan holder then show only pending registration fees as outstanding amount"
      outstandingAmount = pendingRegFees;
  }

  res.json({
    totalReceived,
    dueAmount, // Total Balance
    outstandingAmount, // Current Due (Reg + EMI or Reg Only)
    feesMethod,
    emiStructure,
    totalFees,
  });
});

// @desc    Get Student Payment History
const getStudentPaymentHistory = asyncHandler(async (req, res) => {
  const receipts = await FeeReceipt.find({ student: req.params.studentId })
    .populate({
      path: "student",
      select: "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails branchId",
      populate: {
        path: "branchId",
        select: "name address city state phone mobile email"
      }
    })
    .populate("course", "name shortName")
    .sort({ date: 1 });

  res.json(receipts);
});

// @desc    Generate Receipt Report with Filters
const generateReceiptReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, receiptNo, paymentMode, studentId, studentName, reference } = req.query;

  let query = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  if (receiptNo) query.receiptNo = { $regex: receiptNo, $options: "i" };
  if (paymentMode) query.paymentMode = paymentMode;
  if (studentId) query.student = studentId;

  if (studentName || reference) {
      let studentQuery = {};
      if (studentName) {
           studentQuery.$or = [
              { firstName: { $regex: studentName, $options: "i" } },
              { lastName: { $regex: studentName, $options: "i" } },
              { regNo: { $regex: studentName, $options: "i" } },
              { enrollmentNo: { $regex: studentName, $options: "i" } }
           ];
      }
      if (reference) {
           studentQuery.reference = { $regex: reference, $options: 'i' };
      }
      const matchingStudents = await Student.find(studentQuery).select('_id');
      if (query.student) {
          query.student = { $in: matchingStudents.map(s => s._id).filter(id => id.toString() === query.student.toString()) };
      } else {
          query.student = { $in: matchingStudents.map(s => s._id) };
      }
  }

  const receipts = await FeeReceipt.find(query)
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails")
    .populate("course", "name shortName")
    .sort({ date: -1 });

  const totalAmount = receipts.reduce((acc, curr) => acc + curr.amountPaid, 0);

  res.json({
    receipts,
    totalAmount,
    count: receipts.length,
  });
});

// @desc    Get Next Receipt Number
const getNextReceiptNo = asyncHandler(async (req, res) => {
    let branchId = req.query.branchId;
    
    // Auto-detect branch for non-admins if not provided
    if (!branchId && req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
        branchId = req.user.branchId;
    }

    let nextNum = 1;
    // Find last receipt globally (removed branch filter)
    const query = {};
    
    const lastReceipt = await FeeReceipt.findOne(query)
        .sort({ receiptNo: -1 })
        .collation({ locale: "en_US", numericOrdering: true });

    if (lastReceipt && lastReceipt.receiptNo && !isNaN(lastReceipt.receiptNo)) {
        nextNum = Number(lastReceipt.receiptNo) + 1;
    }
    
    res.json(String(nextNum));
});

module.exports = {
  getInquiries,
  createInquiry,
  updateInquiryStatus,
  createFeeReceipt,
  getStudentFees,
  getFeeReceipts,
  updateFeeReceipt,
  deleteFeeReceipt,
  getStudentLedger,
  getNextReceiptNo,
  getStudentPaymentSummary,
  getStudentPaymentHistory,
  generateReceiptReport,
};
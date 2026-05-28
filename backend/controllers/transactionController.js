const Inquiry = require("../models/Inquiry");
const FeeReceipt = require("../models/FeeReceipt");
const Student = require("../models/Student");
const Batch = require("../models/Batch");
const Counter = require("../models/Counter");
const Education = require("../models/Education");
const Reference = require("../models/Reference");
const asyncHandler = require("express-async-handler");
const generateEnrollmentNumber = require("../utils/enrollmentGenerator");
const sendSMS = require("../utils/smsSender"); // Moved to top for global use

const getReceiptPurpose = (receipt) => {
  const remarks = (receipt?.remarks || "").toLowerCase();
  if (remarks.includes("admission")) return "admission";
  if (remarks.includes("registration")) return "registration";
  return "installment";
};

const getReceiptAmount = (receipt) => Number(receipt?.amountPaid || 0);

const getPaidAmountByPurpose = (receipts, purpose) => receipts
  .filter((receipt) => getReceiptPurpose(receipt) === purpose)
  .reduce((sum, receipt) => sum + getReceiptAmount(receipt), 0);

const getNextInstallmentNumber = (receipts) => {
  const installmentReceipts = receipts.filter((receipt) => getReceiptPurpose(receipt) === "installment");
  const maxStoredInstallment = installmentReceipts.reduce((max, receipt) => {
    const value = Number(receipt.installmentNumber || 0);
    return value > max ? value : max;
  }, 0);

  return Math.max(maxStoredInstallment, installmentReceipts.length) + 1;
};

const resolveReceiptPurposeForPayment = (student, receipts, requestedRemarks = "") => {
  const normalizedRemarks = (requestedRemarks || "").toLowerCase();
  const courseAdmissionFee = Number(student.course?.admissionFees || 0);
  const hasRegistrationReceipt = receipts.some((receipt) => getReceiptPurpose(receipt) === "registration");

  if (normalizedRemarks.includes("admission")) {
    return { purpose: "admission", remarks: requestedRemarks || "Admission Fee", installmentNumber: 0 };
  }

  if (normalizedRemarks.includes("registration") && !hasRegistrationReceipt) {
    return { purpose: "registration", remarks: requestedRemarks || "Registration Fee", installmentNumber: 0 };
  }

  const paidAdmission = Math.max(
    getPaidAmountByPurpose(receipts, "admission"),
    Number(student.admissionFeeAmount || 0)
  );
  if (courseAdmissionFee > paidAdmission) {
    return { purpose: "admission", remarks: "Admission Fee", installmentNumber: 0 };
  }

  if (!hasRegistrationReceipt) {
    return { purpose: "registration", remarks: "Registration Fee", installmentNumber: 0 };
  }

  const installmentNumber = getNextInstallmentNumber(receipts);
  const installmentRemarks = normalizedRemarks.includes("admission") || normalizedRemarks.includes("registration")
    ? ""
    : requestedRemarks;
  return {
    purpose: "installment",
    remarks: installmentRemarks || `Installment ${installmentNumber}`,
    installmentNumber
  };
};

const attachReceiptDisplayInfo = (receipts) => {
  const sortedReceipts = [...receipts].sort((a, b) => {
    const aTime = new Date(a.date || a.createdAt || 0).getTime();
    const bTime = new Date(b.date || b.createdAt || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
  });

  const receiptRole = new Map();
  const receiptId = (receipt) => receipt._id.toString();
  const receiptAmount = (receipt) => Number(receipt.amountPaid || 0);
  const receiptRemarks = (receipt) => (receipt.remarks || "").toLowerCase();
  const firstReceipt = sortedReceipts[0] || {};
  const student = firstReceipt.student || {};
  const recordedAdmissionPaid = Number(student.admissionFeeAmount || 0);

  sortedReceipts.forEach((receipt) => {
    if (receiptRemarks(receipt).includes("admission")) {
      receiptRole.set(receiptId(receipt), "admission");
    }
  });

  let totalAdmissionPaid = sortedReceipts
    .filter((receipt) => receiptRole.get(receiptId(receipt)) === "admission")
    .reduce((sum, receipt) => sum + receiptAmount(receipt), 0);

  if (recordedAdmissionPaid > totalAdmissionPaid) {
    for (const receipt of sortedReceipts) {
      const id = receiptId(receipt);
      if (receiptRole.has(id)) continue;

      const remainingAdmission = recordedAdmissionPaid - totalAdmissionPaid;
      if (remainingAdmission <= 0) break;
      if (receiptAmount(receipt) <= remainingAdmission) {
        receiptRole.set(id, "admission");
        totalAdmissionPaid += receiptAmount(receipt);
      }
    }
  }

  for (const receipt of sortedReceipts) {
    if (!receiptRole.has(receiptId(receipt)) && receiptRemarks(receipt).includes("registration")) {
      receiptRole.set(receiptId(receipt), "registration");
      break;
    }
  }

  const hasRegistrationRole = () => [...receiptRole.values()].includes("registration");

  if (!hasRegistrationRole()) {
    for (const receipt of sortedReceipts) {
      const id = receiptId(receipt);
      if (receiptRole.has(id)) continue;

      receiptRole.set(id, "registration");
      break;
    }
  }

  let installmentNumber = 0;
  return receipts.map((receipt) => {
    const role = receiptRole.get(receiptId(receipt)) || "installment";
    const displayInstallmentNumber = role === "installment" ? ++installmentNumber : 0;

    return {
      ...receipt,
      receiptPurpose: role,
      displayInstallmentNumber
    };
  });
};

// --- INQUIRY ---

// @desc Get Inquiries with Filters
const getInquiries = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, studentName, referenceBy, source, dateFilterType } =
    req.query;

  let query = { isDeleted: false };

  // Date Filters
  if (startDate && endDate) {
    const dateField = dateFilterType || "inquiryDate";
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query[dateField] = { $gte: start, $lte: end };
  }

  // Status Filter
  if (status) query.status = status;

  // Source Filter
  if (source) query.source = source;

  // Student Name or Contact Search
  const searchTerm = studentName || req.query.search;
  if (searchTerm) {
    query.$or = [
      { firstName: { $regex: searchTerm, $options: "i" } },
      { lastName: { $regex: searchTerm, $options: "i" } },
      { contactStudent: { $regex: searchTerm, $options: "i" } },
      { contactParent: { $regex: searchTerm, $options: "i" } },
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

  const sort = dateFilterType === "followUpDate"
    ? { followUpDate: 1, createdAt: -1 }
    : { createdAt: -1 };

  const inquiries = await Inquiry.find(query)
    .populate("interestedCourse", "name")
    .populate("allocatedTo", "name")
    .populate("followUpBy", "name username")
    .populate("followUpHistory.followUpBy", "name username")
    .populate("branchId", "name shortCode")
    .sort(sort);

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

  // Automatically allocate to the logged-in user if not already specified
  if (req.user && !data.allocatedTo) {
    data.allocatedTo = req.user._id;
  }


  if (data.referenceDetail && typeof data.referenceDetail === "string") {
    try {
      data.referenceDetail = JSON.parse(data.referenceDetail);
    } catch (e) {
      console.error("Error parsing referenceDetail", e);
    }
  }

  if (!req.user && data.source === "OnlineAdmission") {
    const educationName = typeof data.education === "string" ? data.education.trim() : "";
    if (educationName) {
      await Education.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${educationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, isDeleted: false },
        { $setOnInsert: { name: educationName } },
        { upsert: true, new: true }
      );
      data.education = educationName;
    }

    if (data.referenceDetail && typeof data.referenceDetail === "object") {
      const referenceName = typeof data.referenceDetail.name === "string" ? data.referenceDetail.name.trim() : "";
      const referenceMobile = typeof data.referenceDetail.mobile === "string" ? data.referenceDetail.mobile.trim() : "";
      const referenceAddress = typeof data.referenceDetail.address === "string" ? data.referenceDetail.address.trim() : "";

      if (referenceName && referenceMobile) {
        await Reference.findOneAndUpdate(
          { name: { $regex: new RegExp(`^${referenceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, isDeleted: false },
          { name: referenceName, mobile: referenceMobile, address: referenceAddress },
          { upsert: true, new: true }
        );
        data.referenceBy = referenceName;
        data.referenceDetail = {
          name: referenceName,
          mobile: referenceMobile,
          address: referenceAddress
        };
      }
    }
  }

  // Handle first follow-up creation history & count
  if (data.followUpDate) {
    const fDate = new Date(data.followUpDate);
    data.followUpCount = 1;
    if (req.user?._id) {
      data.followUpBy = req.user._id;
    }
    data.followUpHistory = [{
      date: fDate,
      remarks: data.followUpDetails || data.remarks || "Inquiry Created (First Follow-up)",
      status: data.status || "Open",
      followUpBy: req.user?._id,
      createdAt: new Date()
    }];
  }

  const inquiry = await Inquiry.create(data);

  if (req.body.visitorId) {
    const Visitor = require("../models/Visitor");
    await Visitor.findByIdAndUpdate(req.body.visitorId, {
      inquiryId: inquiry._id,
    });
  }

  await inquiry.populate([
    { path: "branchId", select: "name shortCode" },
    { path: "allocatedTo", select: "name" },
    { path: "followUpBy", select: "name username" },
    { path: "followUpHistory.followUpBy", select: "name username" },
    { path: "interestedCourse", select: "name" }
  ]);

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

      // Normalize allocatedTo if sent as full object
  if (req.body.allocatedTo && (typeof req.body.allocatedTo === 'object' || req.body.allocatedTo === '[object Object]') && req.body.allocatedTo._id) {
    req.body.allocatedTo = req.body.allocatedTo._id;
  } else if (req.body.allocatedTo === '[object Object]') {
    delete req.body.allocatedTo; // Remove if it's the stringified object version without ID
  }

  // Parse followUpHistory if sent as JSON string
  if (req.body.followUpHistory && typeof req.body.followUpHistory === 'string') {
    try {
      req.body.followUpHistory = JSON.parse(req.body.followUpHistory);
    } catch (e) {
      console.error('Failed to parse followUpHistory', e);
    }
  }

    let hasFollowUpChanged = false;
    let newFDate = null;
    if (req.body.followUpDate !== undefined) {
      newFDate = req.body.followUpDate ? new Date(req.body.followUpDate) : null;
      const oldFDate = inquiry.followUpDate ? new Date(inquiry.followUpDate) : null;

      const newTime = newFDate && !isNaN(newFDate.getTime()) ? newFDate.getTime() : null;
      const oldTime = oldFDate && !isNaN(oldFDate.getTime()) ? oldFDate.getTime() : null;

      if (newTime !== null && newTime !== oldTime) {
        hasFollowUpChanged = true;
      }
    }

    if (req.body.newRemarks && req.body.newRemarks.trim() !== '') {
      hasFollowUpChanged = true;
    }
    if (req.body.status && req.body.status !== inquiry.status) {
      hasFollowUpChanged = true;
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

    // Reference Lock Logic
    // If user is not Super Admin, and the inquiry ALREADY has a reference, prevent changing it
    if (req.user && req.user.role !== 'Super Admin') {
      const existingReference = (
        inquiry.referenceBy ||
        (inquiry.referenceDetail && typeof inquiry.referenceDetail === "object" ? inquiry.referenceDetail.name : "") ||
        ""
      ).trim();

      if (existingReference) {
        if (req.body.referenceBy !== undefined) delete req.body.referenceBy;
        if (req.body.referenceDetail !== undefined) delete req.body.referenceDetail;
      }
    }

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        // Sanitize stringified objects like "[object Object]"
        if (req.body[field] === '[object Object]') {
          return; // Skip this field
        }

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

    if (hasFollowUpChanged) {
      const historyRemarks = req.body.newRemarks || req.body.followUpDetails || req.body.remarks || "Follow-up set";
      if (req.user?._id) {
        inquiry.followUpBy = req.user._id;
      }
      inquiry.followUpHistory.push({
        date: newFDate,
        remarks: historyRemarks,
        status: req.body.status || inquiry.status || "Open",
        followUpBy: req.user?._id,
        createdAt: new Date()
      });
      inquiry.followUpCount = inquiry.followUpHistory.length;
    }

    await inquiry.save();
    await inquiry.populate([
      { path: "branchId", select: "name shortCode" },
      { path: "allocatedTo", select: "name" },
      { path: "followUpBy", select: "name username" },
      { path: "followUpHistory.followUpBy", select: "name username" },
      { path: "interestedCourse", select: "name" }
    ]);
    res.json(inquiry);
  } else {
    res.status(404);
    throw new Error("Inquiry not found");
  }
});

// --- FEES (Standard) ---
// Helper to get total paid by student
const calculateTotalPaid = async (studentId) => {
    const receipts = await FeeReceipt.find({ student: studentId });
    return receipts.reduce((acc, curr) => acc + curr.amountPaid, 0);
};

// @desc Get Fee Receipts with Filters
const getFeeReceipts = asyncHandler(async (req, res) => {
  const { startDate, endDate, receiptNo, paymentMode, studentId, studentName, reference } = req.query;

  let query = {};

  // Date Filters - make them optional individually
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
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
  
  // Student & Reference Filter
  if (studentId || studentName || reference) {
      let studentQuery = { isDeleted: false };
      
      if (studentId) {
          studentQuery._id = studentId;
      }

      if (studentName) {
          const nameClean = studentName.trim();
          const nameParts = nameClean.split(/\s+/);
          
          let nameFilters = [
              { firstName: { $regex: nameClean, $options: "i" } },
              { lastName: { $regex: nameClean, $options: "i" } },
              { regNo: { $regex: nameClean, $options: "i" } },
              { enrollmentNo: { $regex: nameClean, $options: "i" } }
          ];

          if (nameParts.length > 1) {
              nameFilters.push({
                  $and: [
                      { firstName: { $regex: nameParts[0], $options: 'i' } },
                      { lastName: { $regex: nameParts[nameParts.length - 1], $options: 'i' } }
                  ]
              });
          }
          
          studentQuery.$or = nameFilters;
      }

      if (reference) {
          studentQuery.reference = { $regex: reference, $options: 'i' };
      }

      const matchingStudents = await Student.find(studentQuery).select('_id');
      query.student = { $in: matchingStudents.map(s => s._id) };
  }

  let receipts = await FeeReceipt.find(query)
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails admissionFeeAmount")
    .populate("course", "name shortName admissionFees")
    .populate("branch", "name shortCode address city state phone mobile email") // Populate full Branch details for print rendering
    .sort({ createdAt: -1 });

  // Add calculated fields for each receipt
  receipts = await Promise.all(receipts.map(async (receipt) => {
      const totalPaid = await calculateTotalPaid(receipt.student?._id);
      const courseAdmFees = receipt.course?.admissionFees || 0;
      const effectiveAdmFee = Math.max(courseAdmFees, receipt.student?.admissionFeeAmount || 0);
      const totalFees = (receipt.student?.totalFees || 0) + effectiveAdmFee;
      
      const receiptObj = receipt.toObject();
      if (receiptObj.student) {
          receiptObj.student.calculatedTotalDue = Math.max(0, totalFees - totalPaid);
      }
      return receiptObj;
  }));

  res.json(receipts);
});

// @desc Create Fee Receipt
const createFeeReceipt = asyncHandler(async (req, res) => {
  const { 
    studentId, courseId, amountPaid, paymentMode, remarks, date,
    bankName, chequeNumber, chequeDate, transactionId, transactionDate,
    onlinePaymentType, paymentProviderName, paymentDetails
  } = req.body;

  // 1. Parallel Data Fetching
  const [student, existingReceipts] = await Promise.all([
    Student.findById(studentId).populate("course", "admissionFees registrationFees"),
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

  // 3. Generate Branch-Scoped Receipt No
  // Find max existing receipt number for THIS BRANCH
  let receiptNo = "1";
  const lastReceipt = await FeeReceipt.findOne({ branch: branchId })
    .sort({ receiptNo: -1 })
    .collation({ locale: "en_US", numericOrdering: true });
    
  if (lastReceipt && lastReceipt.receiptNo && !isNaN(lastReceipt.receiptNo)) {
      receiptNo = String(Number(lastReceipt.receiptNo) + 1);
  }

  const receiptPurpose = resolveReceiptPurposeForPayment(student, existingReceipts, remarks);

  // branchId is already determined above

  // 3. Create Receipt
  const receipt = await FeeReceipt.create({
    receiptNo,
    student: studentId,
    course: courseId,
    branch: branchId, // Assign Branch
    amountPaid,
    paymentMode,
    remarks: receiptPurpose.remarks,
    date: date || Date.now(),
    createdBy: req.user._id,
    installmentNumber: receiptPurpose.installmentNumber,
    bankName,
    chequeNumber,
    chequeDate,
    transactionId,
    transactionDate,
    onlinePaymentType,
    paymentProviderName,
    paymentDetails
  });

  // 4. Update Student Pending Fees & Status
  let admissionCompletedNow = false;

  if (receiptPurpose.purpose === "admission") {
    // If it's an admission fee payment, we update admission-specific fields
    if (!student.isAdmissionFeesPaid) {
      student.isAdmissionFeesPaid = true;
      student.admissionFeeAmount = Number(amountPaid);
      admissionCompletedNow = true;

      if (!student.enrollmentNo && student.branchId) {
        student.enrollmentNo = await generateEnrollmentNumber(student.branchId);
      }
    } else {
      // If already paid, increment the amount
      student.admissionFeeAmount = (student.admissionFeeAmount || 0) + Number(amountPaid);
    }
    // We do NOT subtract from student.pendingFees because pendingFees is for the course balance
  } else {
    // Normal fee payment reduces the course balance
    student.pendingFees = Math.max(0, student.pendingFees - Number(amountPaid));
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
      let var3 = receiptPurpose.purpose === "installment"
        ? `Installment ${receiptPurpose.installmentNumber}`
        : receiptPurpose.remarks;
      if (admissionCompletedNow || receiptPurpose.purpose === "admission") {
          var3 = "Admission Fees";
      } else if (receiptPurpose.purpose === "registration") {
          var3 = "Registration Fees";
      }

      const includeRegNo = receiptPurpose.purpose !== "admission";
      const var4 = student.regNo || student.enrollmentNo || "N/A";
      const smsMessage = includeRegNo
        ? `Dear, ${var1}. Your Course fees ${var2} has been deposited for ${var3}, Reg.No. ${var4}. Thank you, Smart Institute`
        : `Dear, ${var1}. Your Course fees ${var2} has been deposited for ${var3}. Thank you, Smart Institute`;

      const contacts = [...new Set([student.mobileStudent, student.mobileParent, student.contactHome].filter(Boolean))]; 
      
      // Send SMS asynchronously
      console.log(`Sending Fees SMS to: ${contacts.join(', ')} | Msg: ${smsMessage}`);
      
      // Send SMS synchronously (awaited)
      await Promise.all(contacts.map(num => 
          sendSMS(num, smsMessage, 'Fees').catch(err => console.error(`Failed to send Transaction SMS to ${num}`, err))
      ));
      
  } catch (error) {
      console.error("Error setting up Transaction SMS", error);
  }

  // Populate receipt for frontend immediate use (printing)
  await receipt.populate([
    { path: "student", select: "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails admissionFeeAmount" },
    { path: "course", select: "name shortName admissionFees" },
    { path: "branch", select: "name shortCode address city state phone mobile email" }
  ]);

  // Add calculated fields for the receipt
  const totalPaid = await calculateTotalPaid(receipt.student?._id);
  const courseAdmFees = receipt.course?.admissionFees || 0;
  const effectiveAdmFee = Math.max(courseAdmFees, receipt.student?.admissionFeeAmount || 0);
  const totalFeesVal = (receipt.student?.totalFees || 0) + effectiveAdmFee;
  
  const finalReceipt = receipt.toObject();
  if (finalReceipt.student) {
      finalReceipt.student.calculatedTotalDue = Math.max(0, totalFeesVal - totalPaid);
  }

  res.status(201).json(finalReceipt);
});

// @desc Update Fee Receipt
const updateFeeReceipt = asyncHandler(async (req, res) => {
  const receipt = await FeeReceipt.findById(req.params.id);

  if (receipt) {
    if (req.body.amountPaid && Number(req.body.amountPaid) !== receipt.amountPaid) {
      const student = await Student.findById(receipt.student);
      if (student) {
        const diff = Number(req.body.amountPaid) - Number(receipt.amountPaid);
        const isAdmission = (receipt.remarks || "").toLowerCase().includes("admission");
        
        if (isAdmission) {
            // Update admission fee tracking
            student.admissionFeeAmount = (student.admissionFeeAmount || 0) + diff;
        } else {
            // Update course balance
            student.pendingFees = Math.max(0, student.pendingFees - diff);
        }
        await student.save();
      }
    }

    receipt.amountPaid = req.body.amountPaid !== undefined ? Number(req.body.amountPaid) : receipt.amountPaid;
    receipt.paymentMode = req.body.paymentMode || receipt.paymentMode;
    receipt.remarks = req.body.remarks || receipt.remarks;
    receipt.date = req.body.date || receipt.date;
    
    if (req.body.bankName !== undefined) receipt.bankName = req.body.bankName;
    if (req.body.chequeNumber !== undefined) receipt.chequeNumber = req.body.chequeNumber;
    if (req.body.chequeDate !== undefined) receipt.chequeDate = req.body.chequeDate;
    if (req.body.transactionId !== undefined) receipt.transactionId = req.body.transactionId;
    if (req.body.onlinePaymentType !== undefined) receipt.onlinePaymentType = req.body.onlinePaymentType;
    if (req.body.paymentProviderName !== undefined) receipt.paymentProviderName = req.body.paymentProviderName;
    if (req.body.paymentDetails !== undefined) receipt.paymentDetails = req.body.paymentDetails;
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
      const isAdmission = (receipt.remarks || "").toLowerCase().includes("admission");
      if (isAdmission) {
          student.admissionFeeAmount = Math.max(0, (student.admissionFeeAmount || 0) - Number(receipt.amountPaid));
          if (student.admissionFeeAmount === 0) {
              student.isAdmissionFeesPaid = false;
          }
      } else {
          student.pendingFees = student.pendingFees + Number(receipt.amountPaid);
      }
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
  let receipts = await FeeReceipt.find({
    student: req.params.studentId,
  })
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails admissionFeeAmount")
    .populate("course", "name shortName admissionFees")
    .sort({ createdAt: -1 });

  // Add calculated fields for each receipt
  receipts = await Promise.all(receipts.map(async (receipt) => {
      const totalPaid = await calculateTotalPaid(receipt.student?._id);
      const courseAdmFees = receipt.course?.admissionFees || 0;
      const effectiveAdmFee = Math.max(courseAdmFees, receipt.student?.admissionFeeAmount || 0);
      const totalFees = (receipt.student?.totalFees || 0) + effectiveAdmFee;
      
      const receiptObj = receipt.toObject();
      if (receiptObj.student) {
          receiptObj.student.calculatedTotalDue = Math.max(0, totalFees - totalPaid);
      }
      return receiptObj;
  }));

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

  const courseAdmissionFee = student.course && student.course.admissionFees ? Number(student.course.admissionFees) : 0;
  const effectiveAdmissionFee = Math.max(courseAdmissionFee, student.admissionFeeAmount || 0);

  const totalCourseFees = (student.totalFees || 0) + effectiveAdmissionFee;
  const totalPaid = receipts.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const dueAmount = Math.max(0, totalCourseFees - totalPaid);

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
  let upcomingEMI = 0;

  // 1. Calculate Pending Registration Fees
  // "registration amount is decided in the course"
  const courseRegFees = student.course && student.course.registrationFees ? Number(student.course.registrationFees) : 0;
  const sortedReceipts = [...receipts].sort((a, b) => {
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
  });
  const receiptRole = new Map();
  const receiptId = (receipt) => receipt._id.toString();
  const receiptAmount = (receipt) => Number(receipt.amountPaid || 0);
  const receiptRemarks = (receipt) => (receipt.remarks || "").toLowerCase();
  
  // 1.5 Calculate Pending Admission Fees
  // courseAdmissionFee is already declared above
  
  // Calculate total admission fees paid from receipts. Older receipts may not
  // have remarks, so infer the admission receipt from the stored admission
  // amount when possible.
  sortedReceipts.forEach(r => {
      if (receiptRemarks(r).includes("admission")) {
          receiptRole.set(receiptId(r), "admission");
      }
  });

  let totalAdmissionPaid = sortedReceipts
      .filter(r => receiptRole.get(receiptId(r)) === "admission")
      .reduce((acc, curr) => acc + receiptAmount(curr), 0);

  const recordedAdmissionPaid = student.admissionFeeAmount || 0;
  if (recordedAdmissionPaid > totalAdmissionPaid) {
      for (const receipt of sortedReceipts) {
          const id = receiptId(receipt);
          if (receiptRole.has(id)) continue;

          const remainingAdmission = recordedAdmissionPaid - totalAdmissionPaid;
          if (remainingAdmission <= 0) break;

          if (receiptAmount(receipt) <= remainingAdmission) {
              receiptRole.set(id, "admission");
              totalAdmissionPaid += receiptAmount(receipt);
          }
      }
  }
  
  // We also check student.admissionFeeAmount for backward compatibility if needed, 
  // but receipts should cover it. Let's take the max to be safe.
  const effectiveAdmissionPaid = Math.max(totalAdmissionPaid, recordedAdmissionPaid);
  const pendingAdmissionFees = Math.max(0, courseAdmissionFee - effectiveAdmissionPaid);

  // "when student pays registration fees" - filter receipts by remarks
  // "registration". Older registration receipts can be blank, so after
  // admission is removed, assign the earliest remaining receipts to
  // registration until the course registration fee is covered.
  for (const receipt of sortedReceipts) {
      if (!receiptRole.has(receiptId(receipt)) && receiptRemarks(receipt).includes("registration")) {
          receiptRole.set(receiptId(receipt), "registration");
          break;
      }
  }

  let totalRegPaid = sortedReceipts
      .filter(r => receiptRole.get(receiptId(r)) === "registration")
      .reduce((acc, curr) => acc + receiptAmount(curr), 0);

  const hasRegistrationPayment = totalRegPaid > 0;

  if (!hasRegistrationPayment) {
      for (const receipt of sortedReceipts) {
          const id = receiptId(receipt);
          if (receiptRole.has(id)) continue;

          const looksLikeOldRegistration =
              !receiptRemarks(receipt) &&
              Number(receipt.installmentNumber || 1) <= 2;

          if (looksLikeOldRegistration) {
              receiptRole.set(id, "registration");
              totalRegPaid += receiptAmount(receipt);
          }
      }
  }
  
  // "pending registration fees... is our outstanding amount"
  const pendingRegFees = hasRegistrationPayment || totalRegPaid > 0 ? 0 : courseRegFees;

  if (student.paymentPlan === "Monthly") {
      // Monthly Plan Logic:
      // "outstanding amount should show with upcoming EMI + pending registration amount + pending admission amount"

      const monthlyInstallment = student.emiDetails && student.emiDetails.monthlyInstallment ? Number(student.emiDetails.monthlyInstallment) : 0;
      const months = student.emiDetails && student.emiDetails.months ? Number(student.emiDetails.months) : 0;

      if (monthlyInstallment && months) {
          emiStructure = `₹${monthlyInstallment} x ${months} months`;
      }

      const startDate = student.batchStartDate || student.admissionDate || student.createdAt;
      const start = new Date(startDate);
      const now = new Date();

      if (monthlyInstallment > 0 && !Number.isNaN(start.getTime())) {
          const monthlyReceipts = sortedReceipts.filter(r => !receiptRole.has(receiptId(r)));
          const totalMonthlyPaid = monthlyReceipts.reduce((acc, curr) => acc + receiptAmount(curr), 0);

          // EMI starts from the month after batch/admission month.
          // Example: April admission makes May the first due month.
          const dueInstallments = Math.max(
              0,
              ((now.getFullYear() - start.getFullYear()) * 12) + (now.getMonth() - start.getMonth())
          );
          const monthlyPlanTotal = Math.max(0, (student.totalFees || 0) - courseRegFees);
          const scheduledMonthlyDue = Math.min(dueInstallments * monthlyInstallment, monthlyPlanTotal);
          const remainingCourseBalance = Math.max(0, dueAmount - pendingRegFees - pendingAdmissionFees);

          upcomingEMI = Math.max(0, scheduledMonthlyDue - totalMonthlyPaid);
          upcomingEMI = Math.min(upcomingEMI, remainingCourseBalance);
      }
      
      outstandingAmount = pendingRegFees + pendingAdmissionFees + upcomingEMI;

  } else {
      // One Time Plan Logic:
      // "if one time plan holder then show only pending registration fees as outstanding amount + pending admission fees"
      outstandingAmount = pendingRegFees + pendingAdmissionFees;
  }

  res.json({
    totalReceived,
    dueAmount, // Total Balance
    outstandingAmount, // Current Due (Reg + EMI or Reg Only)
    pendingRegFees,
    pendingAdmissionFees,
    courseFee: student.totalFees || 0,
    admissionFee: effectiveAdmissionFee,
    upcomingEMI,
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
      select: "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails branchId admissionFeeAmount",
      populate: {
        path: "branchId",
        select: "name address city state phone mobile email"
      }
    })
    .populate("course", "name shortName admissionFees registrationFees")
    .populate("branch", "name shortCode address city state phone mobile email")
    .sort({ date: 1, createdAt: 1 })
    .lean();

  res.json(attachReceiptDisplayInfo(receipts));
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
    // Find last receipt for this branch
    const query = branchId ? { branch: branchId } : {};
    
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

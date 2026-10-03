
    const moment = require('moment');
    const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isDirectReference = (value) => {
  const text = String(value || "").trim().toLowerCase();
  return !text || ["direct", "self", "none", "na", "n/a", "-"].includes(text);
};

const resolveAssignableUserId = async (value) => {
  const raw = typeof value === "object"
    ? value?._id || value?.userAccount?._id || value?.userAccount
    : value;
  const text = String(raw || "").trim();
  if (!text || text === "[object Object]") return null;

  if (mongoose.Types.ObjectId.isValid(text)) {
    const user = await User.findById(text).select("_id").lean();
    if (user?._id) return user._id;

    const employee = await Employee.findOne({ _id: text, isDeleted: false, isActive: true })
      .select("userAccount loginUsername email mobile name")
      .lean();

    if (employee?.userAccount) {
      const linkedUser = await User.findById(employee.userAccount).select("_id").lean();
      if (linkedUser?._id) return linkedUser._id;
    }

    const employeeLogin = [employee?.loginUsername, employee?.email, employee?.mobile, employee?.name]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (employeeLogin.length) {
      const matchedUser = await User.findOne({
        isActive: { $ne: false },
        $or: employeeLogin.flatMap((item) => [
          { username: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
          { email: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
          { name: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
        ]),
      }).select("_id").lean();
      if (matchedUser?._id) return matchedUser._id;
    }
  }

  const matchedUser = await User.findOne({
    isActive: { $ne: false },
    $or: [
      { username: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
      { email: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
      { name: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
    ],
  }).select("_id").lean();

  if (matchedUser?._id) return matchedUser._id;

  const matchedEmployee = await Employee.findOne({
    isDeleted: false,
    isActive: true,
    $or: [
      { name: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
      { loginUsername: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
      { email: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
      { mobile: { $regex: new RegExp(`^${escapeRegex(text)}$`, "i") } },
    ],
  }).select("userAccount loginUsername email mobile name").lean();

  if (matchedEmployee?.userAccount) {
    const linkedUser = await User.findById(matchedEmployee.userAccount).select("_id").lean();
    if (linkedUser?._id) return linkedUser._id;
  }

  if (matchedEmployee) {
    const employeeLogin = [matchedEmployee.loginUsername, matchedEmployee.email, matchedEmployee.mobile, matchedEmployee.name]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const linkedByEmployee = await User.findOne({
      isActive: { $ne: false },
      $or: employeeLogin.flatMap((item) => [
        { username: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
        { email: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
        { name: { $regex: new RegExp(`^${escapeRegex(item)}$`, "i") } },
      ]),
    }).select("_id").lean();
    if (linkedByEmployee?._id) return linkedByEmployee._id;
  }

  return null;
};

const resolveInquiryOwner = async ({ referenceBy, requestedAllocatedTo, fallbackUserId, isExternalRef }) => {
  // 1. Direct/Self reference stays with creator
  if (isDirectReference(referenceBy)) return fallbackUserId;

  const referenceText = String(referenceBy || "").trim();
  if (!referenceText) return fallbackUserId;

  // Explicit external references must be handled before name matching. This
  // prevents an external ref from being assigned to a same-name student user.
  if (isExternalRef) return requestedAllocatedTo || fallbackUserId;

  // 2. Non-external employee/user references can own the inquiry.
  const referenceOwner = await resolveAssignableUserId(referenceText);
  if (referenceOwner) return referenceOwner;

  // 4. Saved external references follow the same allocation rule.
  const isSavedExternalRef = await Reference.findOne({ 
    name: { $regex: new RegExp(`^${escapeRegex(referenceText)}$`, "i") }, 
    isDeleted: false 
  }).lean();
  
  if (isSavedExternalRef) return requestedAllocatedTo || fallbackUserId;

  // 5. Fallback to requested allocation or creator
  if (requestedAllocatedTo) return requestedAllocatedTo;
  return fallbackUserId;
};

const getUserReferenceOwnershipConditions = (user) => {
  const values = [user?.name, user?.username, user?.email]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(values)].map((value) => ({
    referenceBy: { $regex: new RegExp(`^${escapeRegex(value)}$`, "i") },
  }));
};

const addInquiryOwnershipScope = (query, ownerId, extraOwnershipConditions = []) => {
  const ownership = {
    $or: [
      { allocatedTo: ownerId },
      { allocatedTo: { $exists: false }, createdBy: ownerId },
      { allocatedTo: null, createdBy: ownerId },
      ...extraOwnershipConditions,
    ],
  };

  if (query.$or) {
    query.$and = [...(query.$and || []), { $or: query.$or }, ownership];
    delete query.$or;
  } else {
    query.$and = [...(query.$and || []), ownership];
  }
};

const backfillOnlineAdmissionOwners = async (branchId) => {
  if (!branchId) return;

  const inquiries = await Inquiry.find({
    source: "OnlineAdmission",
    branchId,
    isDeleted: false,
    $or: [
      { allocatedTo: { $exists: false } },
      { allocatedTo: null },
    ],
    referenceBy: { $exists: true, $nin: [null, ""] },
  })
    .select("_id referenceBy isExternalRef")
    .limit(100)
    .lean();

  await Promise.all(inquiries.map(async (inquiry) => {
    const ownerId = await resolveInquiryOwner({
      referenceBy: inquiry.referenceBy,
      requestedAllocatedTo: null,
      fallbackUserId: null,
      isExternalRef: inquiry.isExternalRef,
    });

    if (ownerId) {
      await Inquiry.updateOne({
        _id: inquiry._id,
        $or: [
          { allocatedTo: { $exists: false } },
          { allocatedTo: null },
        ],
      }, { $set: { allocatedTo: ownerId } });
    }
  }));
};

const getReceiptPurpose = (receipt) => {
  const remarks = (receipt?.remarks || "").toLowerCase();
  if (remarks.includes("admission")) return "admission";
  if (remarks.includes("registration")) return "registration";
  return receipt?.receiptPurpose || "installment";
};

const getReceiptAmount = (receipt) => Number(receipt?.amountPaid || 0);

const sortReceiptsChronologically = (receipts = []) => [...receipts].sort((a, b) => {
  // Receipt date defines the fee sequence; createdAt may be much later for migrated/backfilled records.
  const aCreated = new Date(a.date || a.createdAt || 0).getTime();
  const bCreated = new Date(b.date || b.createdAt || 0).getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;
  return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
});

const getReceiptLifecycleInfo = (receipts = [], student = null) => {
  const receiptInfo = new Map();
  let hasAdmission = false;
  let hasRegistration = false;
  let installmentNumber = 0;
  const contextStudent = student || receipts[0]?.student || {};
  const contextCourse = contextStudent?.course && typeof contextStudent.course === 'object'
    ? contextStudent.course
    : (receipts[0]?.course || {});
  const admissionFee = Number(contextCourse?.admissionFees || contextStudent?.admissionFeeAmount || 0);
  const registrationFee = Number(contextCourse?.registrationFees || 0);

  sortReceiptsChronologically(receipts).forEach((receipt) => {
    const normalizedRemarks = (receipt.remarks || '').trim().toLowerCase();
    const hasPurposeInRemarks = normalizedRemarks.includes('admission')
      || normalizedRemarks.includes('registration')
      || normalizedRemarks.includes('installment');
    const amount = getReceiptAmount(receipt);
    let purpose = getReceiptPurpose(receipt);

    // Older receipts were created before purpose fields existed. Infer their two
    // opening milestones from the configured fee amounts, then number the rest.
    if (!hasPurposeInRemarks && !hasAdmission && admissionFee > 0 && amount === admissionFee) {
      purpose = 'admission';
    } else if (!hasPurposeInRemarks && !hasRegistration && registrationFee > 0 && amount === registrationFee) {
      purpose = 'registration';
    }
    let displayInstallmentNumber = Number(receipt.displayInstallmentNumber || 0);

    // Admission and registration are lifecycle milestones and should appear only
    // once. Any later receipt carrying the same label is part of the installment
    // stream (this also repairs histories created before receiptPurpose was saved).
    if (purpose === "admission") {
      if (hasAdmission) purpose = "installment";
      else hasAdmission = true;
    } else if (purpose === "registration") {
      if (hasRegistration) purpose = "installment";
      else hasRegistration = true;
    }

    if (purpose === "installment") {
      // Display numbers are derived from the chronological history so legacy
      // stored values cannot create gaps such as starting from installment 2.
      displayInstallmentNumber = ++installmentNumber;
    } else {
      displayInstallmentNumber = 0;
    }

    receiptInfo.set(receipt._id.toString(), {
      purpose,
      displayInstallmentNumber
    });
  });

  return receiptInfo;
};
const getFeeCaps = (student, receipts = []) => {
  const firstReceipt = receipts[0] || {};
  const course = student?.course || firstReceipt.course || {};
  const storedAdmissionFee = Number(student?.admissionFeeAmount || 0);
  const courseAdmissionFee = Number(course.admissionFees || 0);
  const admissionFee = student?.isAdmissionFeesPaid && storedAdmissionFee > 0
    ? storedAdmissionFee
    : Math.max(courseAdmissionFee, storedAdmissionFee);

  return {
    admissionFee,
    registrationFee: Number(course.registrationFees || 0)
  };
};

const allocateReceiptPayments = (student, receipts = []) => {
  const { admissionFee, registrationFee } = getFeeCaps(student, receipts);
  let admissionRemaining = admissionFee;
  let registrationRemaining = registrationFee;
  let admissionPaid = 0;
  let registrationPaid = 0;
  let installmentPaid = 0;
  const receiptAllocations = new Map();

  const sortedReceipts = sortReceiptsChronologically(receipts);
  const receiptLifecycleInfo = getReceiptLifecycleInfo(sortedReceipts, student);

  sortedReceipts.forEach((receipt) => {
    let amount = getReceiptAmount(receipt);
    const allocation = { admission: 0, registration: 0, installment: 0 };
    const purpose = receipt?._id
      ? receiptLifecycleInfo.get(receipt._id.toString())?.purpose || receipt.receiptPurpose || getReceiptPurpose(receipt)
      : getReceiptPurpose(receipt);

    if (purpose === "admission" && admissionRemaining > 0) {
      const used = Math.min(amount, admissionRemaining);
      allocation.admission += used;
      admissionPaid += used;
      admissionRemaining -= used;
      amount -= used;
    }

    if (purpose === "registration" && registrationRemaining > 0) {
      const used = Math.min(amount, registrationRemaining);
      allocation.registration += used;
      registrationPaid += used;
      registrationRemaining -= used;
      amount -= used;
    }

    if (amount > 0) {
      allocation.installment += amount;
      installmentPaid += amount;
    }

    if (receipt?._id) {
      receiptAllocations.set(receipt._id.toString(), allocation);
    }
  });

  return { admissionPaid, registrationPaid, installmentPaid, receiptAllocations };
};

const getNextInstallmentNumber = (receipts, student = null) => {
  const receiptLifecycleInfo = getReceiptLifecycleInfo(receipts, student);
  const maxDisplayInstallment = [...receiptLifecycleInfo.values()].reduce((max, info) => {
    const value = Number(info.displayInstallmentNumber || 0);
    return value > max ? value : max;
  }, 0);
  return maxDisplayInstallment + 1;
};

const resolveReceiptPurposeForPayment = (student, receipts, requestedRemarks = "") => {
  const normalizedRemarks = (requestedRemarks || "").toLowerCase();
  const receiptLifecycleInfo = getReceiptLifecycleInfo(receipts, student);
  const hasRegistrationReceipt = [...receiptLifecycleInfo.values()].some((info) => info.purpose === "registration");
  const { admissionFee, registrationFee } = getFeeCaps(student, receipts);
  const { admissionPaid, registrationPaid } = allocateReceiptPayments(student, receipts);
  const admissionOutstanding = Math.max(0, admissionFee - admissionPaid);
  const registrationOutstanding = Math.max(0, registrationFee - registrationPaid);

  if (normalizedRemarks.includes("admission") && admissionOutstanding > 0) {
    return { purpose: "admission", remarks: requestedRemarks || "Admission Fee", installmentNumber: 0 };
  }

  if (!hasRegistrationReceipt && normalizedRemarks.includes("registration") && registrationOutstanding > 0) {
    return { purpose: "registration", remarks: requestedRemarks || "Registration Fee", installmentNumber: 0 };
  }

  if (admissionOutstanding > 0) {
    return { purpose: "admission", remarks: "Admission Fee", installmentNumber: 0 };
  }

  if (!hasRegistrationReceipt && registrationOutstanding > 0) {
    return { purpose: "registration", remarks: "Registration Fee", installmentNumber: 0 };
  }

  const installmentNumber = getNextInstallmentNumber(receipts, student);
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
  const sortedReceipts = sortReceiptsChronologically(receipts);
  const receiptId = (receipt) => receipt._id.toString();
  const receiptLifecycleInfo = getReceiptLifecycleInfo(sortedReceipts, sortedReceipts[0]?.student);

  return receipts
    .map((receipt) => {
      const info = receiptLifecycleInfo.get(receiptId(receipt)) || {
        purpose: receipt.receiptPurpose || getReceiptPurpose(receipt),
        displayInstallmentNumber: Number(receipt.displayInstallmentNumber || receipt.installmentNumber || 0)
      };

      return {
        ...receipt,
        receiptPurpose: info.purpose,
        displayInstallmentNumber: info.displayInstallmentNumber
      };
    })
    .sort((a, b) => {
      // Sort chronologically by createdAt / receiptNo / date so history order is stable
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
    });
};

const isCourseDurationCompleted = (student, customDate = null) => {
  const course = student?.course || {};
  // Default to 12 months if duration is missing or 0
  const duration = Number(course.duration) || 12;
  const durationType = String(course.durationType || "Month").toLowerCase();
  const startDate = student?.batchStartDate || student?.admissionDate || student?.createdAt;

  if (!startDate) return false;

  const endDate = moment(startDate);
  if (!endDate.isValid()) return false;

  if (durationType.includes("year")) {
    endDate.add(duration, "years");
  } else if (durationType.includes("day")) {
    endDate.add(duration, "days");
  } else {
    endDate.add(duration, "months");
  }

  // If the student joined more than 2 years ago, consider it completed anyway
  const twoYearsAgo = moment(customDate || new Date()).subtract(2, 'years');
  if (moment(startDate).isBefore(twoYearsAgo)) return true;

  return endDate.endOf("day").isSameOrBefore(moment(customDate || new Date()));
};

const calculateLedgerFeeTotals = (student, receipts = []) => {
  const course = student?.course || {};
  const courseAdmissionFee = Number(course.admissionFees || 0);
  const effectiveAdmissionFee = Math.max(courseAdmissionFee, Number(student?.admissionFeeAmount || 0));
  const totalCourseFees = Number(student?.totalFees || 0) + effectiveAdmissionFee;
  const totalPaid = receipts.reduce((acc, curr) => acc + Number(curr.amountPaid || 0), 0);
  const dueAmount = Math.max(0, totalCourseFees - totalPaid);

  return { effectiveAdmissionFee, totalCourseFees, totalPaid, dueAmount };
};


    module.exports = {
      getFeeCaps,
      allocateReceiptPayments,
      getReceiptLifecycleInfo,
      resolveReceiptPurposeForPayment,
      calculateLedgerFeeTotals,
      calculateStudentPaymentSummary
    };
  
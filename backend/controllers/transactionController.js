const Inquiry = require("../models/Inquiry");
const FeeReceipt = require("../models/FeeReceipt");
const Student = require("../models/Student");
const Batch = require("../models/Batch");
const Counter = require("../models/Counter");
const Education = require("../models/Education");
const Reference = require("../models/Reference");
const Course = require("../models/Course");
const Branch = require("../models/Branch");
const asyncHandler = require("express-async-handler");
const generateEnrollmentNumber = require("../utils/enrollmentGenerator");
const sendSMS = require("../utils/smsSender"); // Moved to top for global use
const XLSX = require("xlsx");

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
  const purposeOrder = { admission: 0, registration: 1, installment: 2 };
  return receipts
    .map((receipt) => {
      const role = receiptRole.get(receiptId(receipt)) || "installment";
      const displayInstallmentNumber = role === "installment" ? ++installmentNumber : 0;

      return {
        ...receipt,
        receiptPurpose: role,
        displayInstallmentNumber
      };
    })
    .sort((a, b) => {
      // Sort by purpose: Admission first, Registration second, then Installments
      const aOrder = purposeOrder[a.receiptPurpose] ?? 3;
      const bOrder = purposeOrder[b.receiptPurpose] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Within same purpose: installments by number; admission/registration by date
      if (a.receiptPurpose === 'installment') {
        return (a.displayInstallmentNumber || 0) - (b.displayInstallmentNumber || 0);
      }
      return new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0);
    });
};

// --- INQUIRY ---

// @desc Get Inquiries with Filters
const getInquiries = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, studentName, referenceBy, source, dateFilterType } =
    req.query;
  const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined || req.query.pageSize !== undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || req.query.pageSize || 10)));
  const skip = (page - 1) * limit;

  let query = { isDeleted: false };

  // Date Filters
  const dateField = dateFilterType || "inquiryDate";
  const shouldDefaultToday = source && ["Online", "Walk-in", "DSR"].includes(source) && !startDate && !endDate;
  const effectiveStartDate = startDate || (shouldDefaultToday ? new Date() : null);
  const effectiveEndDate = endDate || (shouldDefaultToday ? new Date() : null);

  if (effectiveStartDate && effectiveEndDate) {
    const start = new Date(effectiveStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(effectiveEndDate);
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

  let inquiryQuery = Inquiry.find(query)
    .populate("interestedCourse", "name")
    .populate("allocatedTo", "name")
    .populate("followUpBy", "name username")
    .populate("followUpHistory.followUpBy", "name username")
    .populate("branchId", "name shortCode")
    .sort(sort);

  if (shouldPaginate) {
    inquiryQuery = inquiryQuery.skip(skip).limit(limit);
  }

  const [inquiries, total] = await Promise.all([
    inquiryQuery,
    shouldPaginate ? Inquiry.countDocuments(query) : Promise.resolve(0),
  ]);

  if (!shouldPaginate) {
    return res.json(inquiries);
  }

  res.json({
    data: inquiries,
    pagination: {
      page,
      limit,
      pageSize: limit,
      count: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
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

const normalizeExcelKey = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const normalizeBranchLookupKey = (value) => {
  const key = normalizeExcelKey(value);
  const aliases = {
    gododara: "godadara",
    godadra: "godadara",
    godadara: "godadara",
  };

  return aliases[key] || key;
};

const excelValue = (row, keys) => {
  for (const key of keys) {
    const normalizedKey = normalizeExcelKey(key);
    if (row[normalizedKey] !== undefined && row[normalizedKey] !== null && String(row[normalizedKey]).trim() !== "") {
      return row[normalizedKey];
    }
  }
  return "";
};

const parseExcelDate = (value) => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
  }

  const text = String(value).trim();
  const ddmmyyyy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (ddmmyyyy) {
    const year = ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3];
    return new Date(Number(year), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const combineDateAndTime = (dateValue, timeValue) => {
  const date = parseExcelDate(dateValue);
  if (!date) return undefined;

  if (timeValue instanceof Date && !Number.isNaN(timeValue.getTime())) {
    date.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    return date;
  }

  const timeText = String(timeValue || "").trim();
  if (timeText) {
    const match = timeText.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (match) {
      let hours = Number(match[1]);
      const minutes = Number(match[2] || 0);
      const meridian = match[3]?.toUpperCase();
      if (meridian === "PM" && hours < 12) hours += 12;
      if (meridian === "AM" && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
    }
  }

  return date;
};

// @desc Import Inquiry rows from Excel
const importInquiries = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    res.status(400);
    throw new Error("Please upload an Excel file");
  }

  const source = req.body.source || "Walk-in";
  const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!rawRows.length) {
    res.status(400);
    throw new Error("Excel sheet has no inquiry rows");
  }

  const rows = rawRows.map((row) => Object.entries(row).reduce((map, [key, value]) => {
    map[normalizeExcelKey(key)] = value;
    return map;
  }, {}));

  const courses = await Course.find({ isDeleted: false }).select("_id name shortName").lean();
  const branches = await Branch.find({}).select("_id name shortCode").lean();
  const courseByName = new Map();
  courses.forEach((course) => {
    courseByName.set(normalizeExcelKey(course.name), course._id);
    courseByName.set(normalizeExcelKey(course.shortName), course._id);
  });
  const branchByName = new Map();
  branches.forEach((branch) => {
    branchByName.set(normalizeBranchLookupKey(branch.name), branch._id);
    branchByName.set(normalizeBranchLookupKey(branch.shortCode), branch._id);
  });

  const errors = [];
  const docs = [];

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const firstName = String(excelValue(row, ["First Name", "Student First Name", "Name"])).trim();
    const lastName = String(excelValue(row, ["Last Name", "Surname"])).trim();
    const contactStudent = String(excelValue(row, ["S - Student Contact", "Student Contact", "Contact Student", "Mobile Student", "Mobile"])).trim();

    if (!firstName) {
      errors.push(`Row ${rowNo}: First Name is required`);
      return;
    }

    if (!lastName) {
      errors.push(`Row ${rowNo}: Last Name is required`);
      return;
    }

    if (!contactStudent) {
      errors.push(`Row ${rowNo}: S - Student Contact is required`);
      return;
    }

    const courseText = excelValue(row, ["Interested Course", "Course", "Course Name", "Course Short Name"]);
    const branchText = excelValue(row, ["Branch", "Branch Name", "Branch Code"]);
    const courseKey = normalizeExcelKey(courseText);
    const branchKey = normalizeBranchLookupKey(branchText);
    if (courseText && !courseByName.has(courseKey)) {
      errors.push(`Row ${rowNo}: Course not found (${courseText})`);
      return;
    }
    if (branchText && !branchByName.has(branchKey)) {
      errors.push(`Row ${rowNo}: Branch not found (${branchText})`);
      return;
    }

    const followUpDate = combineDateAndTime(
      excelValue(row, ["Follow-up Date", "Follow Up Date", "Update Date"]),
      excelValue(row, ["Follow-up Time", "Follow Up Time", "Time"])
    );

    const doc = {
      source,
      firstName,
      middleName: String(excelValue(row, ["Father/Husband Name", "Middle Name", "Father Name", "Husband Name"])).trim(),
      relationType: String(excelValue(row, ["Relation Type"])).trim() === "Husband" ? "Husband" : "Father",
      lastName,
      email: String(excelValue(row, ["Email", "Email Address"])).trim(),
      gender: ["Male", "Female", "Other"].includes(String(excelValue(row, ["Gender"])).trim())
        ? String(excelValue(row, ["Gender"])).trim()
        : "Male",
      dob: parseExcelDate(excelValue(row, ["Date of Birth", "DOB"])),
      contactHome: String(excelValue(row, ["H - Home Contact", "Home Contact", "Contact Home"])).trim(),
      contactStudent,
      contactParent: String(excelValue(row, ["P - Parent Contact", "Parent Contact", "Contact Parent", "Mobile Parent"])).trim(),
      state: String(excelValue(row, ["State"])).trim() || "Gujarat",
      city: String(excelValue(row, ["City"])).trim() || "Surat",
      address: String(excelValue(row, ["Address"])).trim(),
      education: String(excelValue(row, ["Education"])).trim(),
      referenceBy: String(excelValue(row, ["Reference", "Reference By"])).trim(),
      inquiryDate: parseExcelDate(excelValue(row, ["Inquiry Date", "Date"])) || new Date(),
      status: ["Open", "Close", "Complete", "Recall", "InProgress", "Pending", "Converted"].includes(String(excelValue(row, ["Status"])).trim())
        ? String(excelValue(row, ["Status"])).trim()
        : "Open",
      followUpDate,
      nextVisitingDate: followUpDate,
      followUpDetails: String(excelValue(row, ["Details", "Follow-up Details", "Follow Up Details", "Remarks"])).trim(),
      allocatedTo: req.user?._id,
    };

    if (courseText) {
      doc.interestedCourse = courseByName.get(courseKey);
    }

    if (req.user && req.user.role !== "Super Admin" && req.user.branchId) {
      doc.branchId = req.user.branchId;
    } else if (branchText) {
      doc.branchId = branchByName.get(branchKey);
    }

    if (followUpDate) {
      doc.followUpCount = 1;
      doc.followUpBy = req.user?._id;
      doc.followUpHistory = [{
        date: followUpDate,
        remarks: doc.followUpDetails || "Inquiry Created (Excel Import)",
        status: doc.status,
        followUpBy: req.user?._id,
        createdAt: new Date()
      }];
    }

    docs.push(doc);
  });

  if (!docs.length) {
    res.status(400);
    throw new Error(errors.join("; ") || "No valid inquiry rows found");
  }

  const created = await Inquiry.insertMany(docs, { ordered: false });

  res.status(201).json({
    imported: created.length,
    skipped: errors.length,
    errors: errors.slice(0, 25),
    message: `${created.length} inquiries imported successfully${errors.length ? `, ${errors.length} rows skipped` : ""}`
  });
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
  const { startDate, endDate, receiptNo, paymentMode, studentId, studentName, reference, search } = req.query;
  const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined || req.query.pageSize !== undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || req.query.pageSize || 10)));
  const skip = (page - 1) * limit;

  let query = {};

  // Date Filters - make them optional individually
  const shouldDefaultToday = shouldPaginate && !startDate && !endDate;
  const effectiveStartDate = startDate || (shouldDefaultToday ? new Date() : null);
  const effectiveEndDate = endDate || (shouldDefaultToday ? new Date() : null);

  if (effectiveStartDate || effectiveEndDate) {
    query.date = {};
    if (effectiveStartDate) {
      const start = new Date(effectiveStartDate);
      start.setHours(0, 0, 0, 0);
      query.date.$gte = start;
    }
    if (effectiveEndDate) {
      const end = new Date(effectiveEndDate);
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

  if (search) {
      const searchClean = String(search).trim();
      const searchNameParts = searchClean.split(/\s+/);
      const searchStudentFilters = [
          { firstName: { $regex: searchClean, $options: "i" } },
          { lastName: { $regex: searchClean, $options: "i" } },
          { middleName: { $regex: searchClean, $options: "i" } },
          { regNo: { $regex: searchClean, $options: "i" } },
          { enrollmentNo: { $regex: searchClean, $options: "i" } },
          { mobileStudent: { $regex: searchClean, $options: "i" } },
          { mobileParent: { $regex: searchClean, $options: "i" } },
      ];

      if (searchNameParts.length > 1) {
          searchStudentFilters.push({
              $and: [
                  { firstName: { $regex: searchNameParts[0], $options: "i" } },
                  { lastName: { $regex: searchNameParts[searchNameParts.length - 1], $options: "i" } },
              ],
          });
      }

      const matchingStudents = await Student.find({
          isDeleted: false,
          $or: searchStudentFilters,
      }).select("_id");

      query.$or = [
          { receiptNo: { $regex: searchClean, $options: "i" } },
          { student: { $in: matchingStudents.map((s) => s._id) } },
      ];
  }
  
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

  let receiptQuery = FeeReceipt.find(query)
    .populate("student", "firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails admissionFeeAmount")
    .populate("course", "name shortName admissionFees")
    .populate("branch", "name shortCode address city state phone mobile email") // Populate full Branch details for print rendering
    .sort({ createdAt: -1 });

  if (shouldPaginate) {
    receiptQuery = receiptQuery.skip(skip).limit(limit);
  }

  let [receipts, total] = await Promise.all([
    receiptQuery,
    shouldPaginate ? FeeReceipt.countDocuments(query) : Promise.resolve(0),
  ]);

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

  if (!shouldPaginate) {
    return res.json(receipts);
  }

  res.json({
    data: receipts,
    pagination: {
      page,
      limit,
      pageSize: limit,
      count: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
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
  } else if (receiptPurpose.purpose === "registration") {
    // Registration fee payment — track on student record
    student.registrationFeeAmount = (student.registrationFeeAmount || 0) + Number(amountPaid);
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
        const isRegistration = (receipt.remarks || "").toLowerCase().includes("registration");
        
        if (isAdmission) {
            student.admissionFeeAmount = (student.admissionFeeAmount || 0) + diff;
        } else if (isRegistration) {
            student.registrationFeeAmount = Math.max(0, (student.registrationFeeAmount || 0) + diff);
        } else {
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
      const isRegistration = (receipt.remarks || "").toLowerCase().includes("registration");
      
      if (isAdmission) {
          student.admissionFeeAmount = Math.max(0, (student.admissionFeeAmount || 0) - Number(receipt.amountPaid));
          if (student.admissionFeeAmount === 0) {
              student.isAdmissionFeesPaid = false;
          }
      } else if (isRegistration) {
          student.registrationFeeAmount = Math.max(0, (student.registrationFeeAmount || 0) - Number(receipt.amountPaid));
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
// Rewritten to match the new fee structure:
//   - Admission Fee (separate)
//   - Registration Fee (part of course, tracked on student)
//   - Remaining Course Fee divided into installments
//   - Outstanding carries forward month to month
const calculateStudentPaymentSummary = (student, receipts) => {
  const totalReceived = receipts.reduce((acc, curr) => acc + Number(curr.amountPaid || 0), 0);

  const course = student.course || {};
  const admissionFee = Number(course.admissionFees || 0);
  const registrationFee = Number(course.registrationFees || 0);
  const courseFee = Number(student.totalFees || 0);
  const remainingCourseFee = Math.max(0, courseFee - registrationFee);
  const totalFees = admissionFee + courseFee;

  const admissionPaidFromReceipts = receipts
    .filter(r => (r.remarks || '').toLowerCase().includes('admission'))
    .reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
  const admissionPaidFromStudent = Number(student.admissionFeeAmount || 0);
  const admissionPaid = Math.max(admissionPaidFromReceipts, admissionPaidFromStudent);
  const admissionOutstanding = Math.max(0, admissionFee - admissionPaid);

  const regPaidFromReceipts = receipts
    .filter(r => (r.remarks || '').toLowerCase().includes('registration'))
    .reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
  const regPaidFromStudent = Number(student.registrationFeeAmount || 0);
  const registrationPaid = Math.max(regPaidFromReceipts, regPaidFromStudent);
  const registrationOutstanding = Math.max(0, registrationFee - registrationPaid);

  const feesMethod = student.paymentPlan || "One Time";
  let emiStructure = null;
  let currentInstallmentDue = 0;
  let previousOutstanding = 0;
  let installmentPrepaid = 0;

  if (feesMethod === "Monthly") {
    const monthlyInstallment = Number(student.emiDetails?.monthlyInstallment || 0);
    const months = Number(student.emiDetails?.months || 0);
    if (monthlyInstallment && months) {
      emiStructure = `₹${monthlyInstallment.toLocaleString('en-IN')} x ${months} months`;
    }

    const startDate = student.batchStartDate || student.admissionDate || student.createdAt;
    const start = startDate ? new Date(startDate) : new Date();
    const now = new Date();

    if (monthlyInstallment > 0 && startDate && !Number.isNaN(start.getTime())) {
      const monthsElapsed = Math.max(0,
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      );
      const installmentsDue = Math.min(monthsElapsed, months);
      const totalScheduledInstallmentDue = installmentsDue * monthlyInstallment;

      const installmentReceipts = receipts.filter(r => {
        const remarks = (r.remarks || '').toLowerCase();
        return !remarks.includes('admission') && !remarks.includes('registration');
      });
      const totalInstallmentPaid = installmentReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
      const priorScheduled = Math.max(0, installmentsDue - 1) * monthlyInstallment;

      previousOutstanding = Math.max(0, priorScheduled - totalInstallmentPaid);
      installmentPrepaid = Math.max(0, totalInstallmentPaid - priorScheduled);
      currentInstallmentDue = installmentsDue > 0 ? monthlyInstallment : 0;

      let upcomingEMI = Math.max(0, totalScheduledInstallmentDue - totalInstallmentPaid);
      upcomingEMI = Math.min(upcomingEMI, remainingCourseFee);
    }
  } else {
    const nonAdmissionNonRegReceipts = receipts.filter(r => {
      const remarks = (r.remarks || '').toLowerCase();
      return !remarks.includes('admission') && !remarks.includes('registration');
    });
    const courseAmountPaid = nonAdmissionNonRegReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
    currentInstallmentDue = Math.max(0, remainingCourseFee - courseAmountPaid);
    previousOutstanding = 0;
  }

  const totalDue = currentInstallmentDue + registrationOutstanding + admissionOutstanding + previousOutstanding;
  const outstandingAmount = Math.max(0, totalDue - installmentPrepaid);
  const dueAmount = Math.max(0, totalFees - totalReceived);

  return {
    totalReceived,
    dueAmount,
    outstandingAmount,
    admissionFee,
    admissionPaid,
    admissionOutstanding,
    registrationFee,
    registrationPaid,
    registrationOutstanding,
    currentInstallmentDue,
    previousOutstanding,
    installmentPrepaid,
    courseFee,
    remainingCourseFee,
    feesMethod,
    emiStructure,
    totalFees,
  };
};

const getStudentPaymentSummary = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId).populate("course");

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const receipts = await FeeReceipt.find({ student: student._id }).sort({ date: 1, createdAt: 1 }).lean();
  return res.json(calculateStudentPaymentSummary(student, receipts));
  const totalReceived = receipts.reduce((acc, curr) => acc + Number(curr.amountPaid || 0), 0);

  // --- Fee Structure ---
  const course = student.course || {};
  const admissionFee = Number(course.admissionFees || 0);
  const registrationFee = Number(course.registrationFees || 0);
  const courseFee = Number(student.totalFees || 0); // total course fee BEFORE reg fee
  // Remaining course fee after registration is what gets split into installments
  const remainingCourseFee = Math.max(0, courseFee - registrationFee);
  const totalFees = admissionFee + courseFee; // grand total = admission + course

  // --- Admission Fee Tracking ---
  const admissionPaidFromReceipts = receipts
    .filter(r => (r.remarks || '').toLowerCase().includes('admission'))
    .reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
  const admissionPaidFromStudent = Number(student.admissionFeeAmount || 0);
  const admissionPaid = Math.max(admissionPaidFromReceipts, admissionPaidFromStudent);
  const admissionOutstanding = Math.max(0, admissionFee - admissionPaid);

  // --- Registration Fee Tracking ---
  const regPaidFromReceipts = receipts
    .filter(r => (r.remarks || '').toLowerCase().includes('registration'))
    .reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
  const regPaidFromStudent = Number(student.registrationFeeAmount || 0);
  const registrationPaid = Math.max(regPaidFromReceipts, regPaidFromStudent);
  const registrationOutstanding = Math.max(0, registrationFee - registrationPaid);

  const feesMethod = student.paymentPlan || "One Time";
  let emiStructure = null;
  let currentInstallmentDue = 0;
  let previousOutstanding = 0;
  let installmentPrepaid = 0;
  let upcomingEMI = 0;

  if (feesMethod === "Monthly") {
    const monthlyInstallment = Number(student.emiDetails?.monthlyInstallment || 0);
    const months = Number(student.emiDetails?.months || 0);
    if (monthlyInstallment && months) {
      emiStructure = `₹${monthlyInstallment.toLocaleString('en-IN')} x ${months} months`;
    }

    // Calculate installments due based on months elapsed since start
    const startDate = student.batchStartDate || student.admissionDate || student.createdAt;
    const start = startDate ? new Date(startDate) : new Date();
    const now = new Date();

    if (monthlyInstallment > 0 && startDate && !Number.isNaN(start.getTime())) {
      // Installments become due starting from the month AFTER admission
      // e.g. May admission → June is first installment due
      const monthsElapsed = Math.max(0,
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      );

      // Total installments that should have been paid so far
      const installmentsDue = Math.min(monthsElapsed, months);

      // Total scheduled installment amount so far
      const totalScheduledInstallmentDue = installmentsDue * monthlyInstallment;

      // What the user has paid towards installments (exclude admission & registration receipts)
      const installmentReceipts = receipts.filter(r => {
        const remarks = (r.remarks || '').toLowerCase();
        return !remarks.includes('admission') && !remarks.includes('registration');
      });
      const totalInstallmentPaid = installmentReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);

      // Scheduled amount due from PRIOR months (before this month) — never negative
      const priorScheduled = Math.max(0, installmentsDue - 1) * monthlyInstallment;

      // Previous outstanding = what was due in PRIOR months minus what was paid
      previousOutstanding = Math.max(0, priorScheduled - totalInstallmentPaid);

      // Any excess payment beyond prior months is a prepayment credit toward current/next installment
      installmentPrepaid = Math.max(0, totalInstallmentPaid - priorScheduled);

      // Current installment for this month — full amount (prepayment credit applied to total below)
      currentInstallmentDue = installmentsDue > 0 ? monthlyInstallment : 0;

      // upcomingEMI = what's unpaid from total scheduled installments
      upcomingEMI = Math.max(0, totalScheduledInstallmentDue - totalInstallmentPaid);
      // Cap at remaining course fee
      upcomingEMI = Math.min(upcomingEMI, remainingCourseFee);
    }
  } else {
    // One Time — whole course fee minus what's been paid is the installment due
    const nonAdmissionNonRegReceipts = receipts.filter(r => {
      const remarks = (r.remarks || '').toLowerCase();
      return !remarks.includes('admission') && !remarks.includes('registration');
    });
    const courseAmountPaid = nonAdmissionNonRegReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
    currentInstallmentDue = Math.max(0, remainingCourseFee - courseAmountPaid);
    previousOutstanding = 0;
  }

  // --- Outstanding Calculation ---
  // Total Due = Current Installment Due + Registration Outstanding + Admission Outstanding + Previous Outstanding
  const totalDue = currentInstallmentDue + registrationOutstanding + admissionOutstanding + previousOutstanding;

  // Apply prepayment credit to reduce total outstanding immediately
  // (student's advance payments reduce what they owe today, not just when installment becomes due)
  const outstandingAmount = Math.max(0, totalDue - installmentPrepaid);

  // For backward compatibility, keep dueAmount as the full remaining balance
  const dueAmount = Math.max(0, totalFees - totalReceived);

  res.json({
    totalReceived,
    dueAmount, // Full remaining balance (backward compat)
    outstandingAmount, // Current actionable due
    // Admission Fee breakdown
    admissionFee,
    admissionPaid,
    admissionOutstanding,
    // Registration Fee breakdown
    registrationFee,
    registrationPaid,
    registrationOutstanding,
    // Installment breakdown
    currentInstallmentDue,
    previousOutstanding,
    installmentPrepaid,
    // Course fee breakdown
    courseFee,
    remainingCourseFee,
    // Plans
    feesMethod,
    emiStructure,
    totalFees,
  });
});

const getStudentPaymentSummaries = asyncHandler(async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : String(req.query.ids || '').split(','))
    .map(id => String(id).trim())
    .filter(Boolean);

  if (!ids.length) {
    return res.json({});
  }

  const students = await Student.find({ _id: { $in: ids }, isDeleted: false })
    .populate("course")
    .lean();
  const receipts = await FeeReceipt.find({ student: { $in: ids } })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const receiptsByStudent = receipts.reduce((map, receipt) => {
    const key = receipt.student.toString();
    if (!map[key]) map[key] = [];
    map[key].push(receipt);
    return map;
  }, {});

  const summaries = {};
  students.forEach(student => {
    summaries[student._id.toString()] = calculateStudentPaymentSummary(
      student,
      receiptsByStudent[student._id.toString()] || []
    );
  });

  res.json(summaries);
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
  importInquiries,
  updateInquiryStatus,
  createFeeReceipt,
  getStudentFees,
  getFeeReceipts,
  updateFeeReceipt,
  deleteFeeReceipt,
  getStudentLedger,
  getNextReceiptNo,
  getStudentPaymentSummary,
  getStudentPaymentSummaries,
  getStudentPaymentHistory,
  generateReceiptReport,
};

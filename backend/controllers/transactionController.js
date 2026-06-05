const Inquiry = require("../models/Inquiry");
const FeeReceipt = require("../models/FeeReceipt");
const Student = require("../models/Student");
const Batch = require("../models/Batch");
const Counter = require("../models/Counter");
const Education = require("../models/Education");
const Reference = require("../models/Reference");
const Course = require("../models/Course");
const Branch = require("../models/Branch");
const User = require("../models/User");
const Employee = require("../models/Employee");
const InquiryImportHistory = require("../models/InquiryImportHistory");
const asyncHandler = require("express-async-handler");
const generateEnrollmentNumber = require("../utils/enrollmentGenerator");
const sendSMS = require("../utils/smsSender"); // Moved to top for global use
const XLSX = require("xlsx");
const mongoose = require("mongoose");

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
  // 1. Explicitly marked as external ref from frontend
  if (isExternalRef) return fallbackUserId;

  // 2. Direct/Self reference stays with creator
  if (isDirectReference(referenceBy)) return fallbackUserId;

  const referenceText = String(referenceBy || "").trim();
  if (!referenceText) return fallbackUserId;

  // 3. Check if this name exists in the Reference master (External References)
  // If it's a known external reference, it stays with the creator.
  const isSavedExternalRef = await Reference.findOne({ 
    name: { $regex: new RegExp(`^${escapeRegex(referenceText)}$`, "i") }, 
    isDeleted: false 
  }).lean();
  
  if (isSavedExternalRef) return fallbackUserId;

  // 4. Try to resolve to a Staff/User account
  const referenceOwner = await resolveAssignableUserId(referenceText);
  if (referenceOwner) return referenceOwner;

  // 5. Fallback to requested allocation or creator
  if (requestedAllocatedTo) return requestedAllocatedTo;
  return fallbackUserId;
};

const addInquiryOwnershipScope = (query, ownerId) => {
  const ownership = {
    $or: [
      { allocatedTo: ownerId },
      { allocatedTo: { $exists: false }, createdBy: ownerId },
      { allocatedTo: null, createdBy: ownerId },
    ],
  };

  if (query.$or) {
    query.$and = [...(query.$and || []), { $or: query.$or }, ownership];
    delete query.$or;
  } else {
    query.$and = [...(query.$and || []), ownership];
  }
};

const getReceiptPurpose = (receipt) => {
  const remarks = (receipt?.remarks || "").toLowerCase();
  if (remarks.includes("admission")) return "admission";
  if (remarks.includes("registration")) return "registration";
  return "installment";
};

const getReceiptAmount = (receipt) => Number(receipt?.amountPaid || 0);

const getFeeCaps = (student, receipts = []) => {
  const firstReceipt = receipts[0] || {};
  const course = student?.course || firstReceipt.course || {};

  return {
    admissionFee: Number(course.admissionFees || 0),
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

  const sortedReceipts = [...receipts].sort((a, b) => {
    const aTime = new Date(a.date || a.createdAt || 0).getTime();
    const bTime = new Date(b.date || b.createdAt || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
  });

  sortedReceipts.forEach((receipt) => {
    let amount = getReceiptAmount(receipt);
    const allocation = { admission: 0, registration: 0, installment: 0 };
    const purpose = getReceiptPurpose(receipt);

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

  admissionPaid = Math.max(
    admissionPaid,
    Math.min(Number(student?.admissionFeeAmount || 0), admissionFee)
  );
  registrationPaid = Math.max(
    registrationPaid,
    Math.min(Number(student?.registrationFeeAmount || 0), registrationFee)
  );

  return { admissionPaid, registrationPaid, installmentPaid, receiptAllocations };
};

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
  const { admissionFee, registrationFee } = getFeeCaps(student, receipts);
  const { admissionPaid, registrationPaid } = allocateReceiptPayments(student, receipts);
  const admissionOutstanding = Math.max(0, admissionFee - admissionPaid);
  const registrationOutstanding = Math.max(0, registrationFee - registrationPaid);

  if (normalizedRemarks.includes("admission") && admissionOutstanding > 0) {
    return { purpose: "admission", remarks: requestedRemarks || "Admission Fee", installmentNumber: 0 };
  }

  if (normalizedRemarks.includes("registration") && registrationOutstanding > 0) {
    return { purpose: "registration", remarks: requestedRemarks || "Registration Fee", installmentNumber: 0 };
  }

  if (admissionOutstanding > 0) {
    return { purpose: "admission", remarks: "Admission Fee", installmentNumber: 0 };
  }

  if (registrationOutstanding > 0) {
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

  const receiptId = (receipt) => receipt._id.toString();
  const firstReceipt = sortedReceipts[0] || {};
  const student = firstReceipt.student || {};
  const { receiptAllocations } = allocateReceiptPayments(student, sortedReceipts);

  let installmentNumber = 0;
  const purposeOrder = { admission: 0, registration: 1, installment: 2 };
  return receipts
    .map((receipt) => {
      const allocation = receiptAllocations.get(receiptId(receipt)) || {};
      let role = "installment";
      if (Number(allocation.admission || 0) > 0) {
        role = "admission";
      } else if (Number(allocation.registration || 0) > 0) {
        role = "registration";
      } else if (Number(allocation.installment || 0) > 0) {
        role = "installment";
      } else {
        role = getReceiptPurpose(receipt);
      }
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
  const isAdmissionLookup = req.query.scope === "admission" || req.query.forAdmission === "true";
  const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined || req.query.pageSize !== undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || req.query.pageSize || 10)));
  const skip = (page - 1) * limit;

  let query = { isDeleted: false };

  // Date Filters
  const dateField = dateFilterType || "inquiryDate";
  const shouldDefaultToday = source && ["Online", "Walk-in", "DSR"].includes(source) && !startDate && !endDate;
  // If no dates provided, use today's range in local time to avoid timezone shifts
  const effectiveStartDate = startDate || (shouldDefaultToday ? new Date() : null);
  const effectiveEndDate = endDate || (shouldDefaultToday ? new Date() : null);

  if (effectiveStartDate && effectiveEndDate) {
    const start = new Date(effectiveStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(effectiveEndDate);
    end.setHours(23, 59, 59, 999);
    
    // Check if the user is filtering for "Today" and adjust to catch UTC entries from local today
    const now = new Date();
    if (start.toDateString() === now.toDateString()) {
      // If filtering for today, expand range slightly to catch entries made in UTC that might fall in yesterday/today
      start.setDate(start.getDate() - 1); 
      start.setHours(18, 0, 0, 0); // Catch evening entries from UTC
    }

    query[dateField] = { $gte: start, $lte: end };
  }

  // Status Filter
  if (status) {
    query.status = status;
  } else if (!isAdmissionLookup && source && ["Online", "Walk-in", "DSR"].includes(source)) {
    // Default: hide Close/Complete inquiries for main inquiry pages
    // User must explicitly select Close/Complete from filter to see them
    query.status = { $nin: ["Close", "Complete"] };
  }

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

  const employeeFilter = req.query.employeeId || req.query.allocatedTo;
  if (employeeFilter) {
    const employeeUserId = await resolveAssignableUserId(employeeFilter);
    if (employeeUserId) {
      query.allocatedTo = employeeUserId;
    } else {
      query._id = { $exists: false };
    }
  }

  // Determine if we should restrict to only "Owned" inquiries
  // Super Admin, Branch Director, and Branch Admin see everything (scoped to branch if applicable)
  const shouldApplyOwnerScope = req.user
    && !["Super Admin", "Branch Director", "Branch Admin"].includes(req.user.role)
    && !isAdmissionLookup;

  if (shouldApplyOwnerScope) {
    addInquiryOwnershipScope(query, req.user._id);
  }

  // --- External Reference Privacy ---
  // If not Super Admin/Director/Admin, inquiries marked as External Reference are only visible to the owner/creator
  if (req.user && !["Super Admin", "Branch Director", "Branch Admin"].includes(req.user.role)) {
    const privacyQuery = {
      $or: [
        { isExternalRef: { $ne: true } }, // Show if not external ref
        { createdBy: req.user._id },      // OR if I created it
        { allocatedTo: req.user._id }      // OR if it's allocated to me
      ]
    };

    if (query.$and) {
      query.$and.push(privacyQuery);
    } else if (query.$or) {
      // Move existing $or to $and to combine with privacy
      const existingOr = query.$or;
      delete query.$or;
      query.$and = [{ $or: existingOr }, privacyQuery];
    } else {
      query.$and = [privacyQuery];
    }
  }

  if (req.user && req.user.role !== 'Super Admin' && req.user.branchId && !shouldApplyOwnerScope) {
      query.branchId = req.user.branchId;
  }
  if (req.query.branchId) {
      query.branchId = req.query.branchId;
  }

  const sort = dateFilterType === "followUpDate"
    ? { followUpDate: 1, createdAt: -1, _id: 1 }
    : { createdAt: -1, _id: 1 };

  let inquiryQuery = Inquiry.find(query)
    .populate("interestedCourse", "name")
    .populate("allocatedTo", "name username role")
    .populate("createdBy", "name username role")
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

  if (data.isExternalRef === "true" || data.isExternalRef === true) {
    data.isExternalRef = true;
  } else {
    // Also check if the reference name exists in the master Reference collection
    const refName = String(data.referenceBy || "").trim();
    if (refName) {
        const isSavedRef = await Reference.findOne({ 
            name: { $regex: new RegExp(`^${escapeRegex(refName)}$`, "i") }, 
            isDeleted: false 
        }).lean();
        data.isExternalRef = !!isSavedRef;
    } else {
        data.isExternalRef = false;
    }
  }

  // Assign Branch automatically for non-Super Admin
  if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
    data.branchId = req.user.branchId;
  }

  if (req.user?._id) {
    data.createdBy = req.user._id;
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

  if (req.user?._id) {
    data.allocatedTo = await resolveInquiryOwner({
      referenceBy: data.referenceBy || data.referenceDetail?.name,
      requestedAllocatedTo: req.user.role === "Super Admin" ? data.allocatedTo : null,
      fallbackUserId: req.user._id,
      isExternalRef: data.isExternalRef
    });
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

  let assignmentsByRow = {};
  try {
    assignmentsByRow = req.body.assignmentsByRow ? JSON.parse(req.body.assignmentsByRow) : {};
  } catch (error) {
    assignmentsByRow = {};
  }
  const defaultAllocatedTo = req.body.defaultAllocatedTo || "";

  const [courses, branches, activeUsers, activeEmployees] = await Promise.all([
    Course.find({ isDeleted: false }).select("_id name shortName").lean(),
    Branch.find({}).select("_id name shortCode").lean(),
    User.find({ isActive: { $ne: false } }).select("_id name username").lean(),
    Employee.find({ isDeleted: false, isActive: true }).select("_id userAccount name loginUsername email mobile").lean(),
  ]);
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
  const userByReferenceName = new Map();
  const userById = new Map();
  activeUsers.forEach((user) => {
    userById.set(String(user._id), user);
    userByReferenceName.set(normalizeExcelKey(user.name), user._id);
    userByReferenceName.set(normalizeExcelKey(user.username), user._id);
  });
  const employeeUserById = new Map();
  activeEmployees.forEach((employee) => {
    if (employee.userAccount) {
      employeeUserById.set(String(employee._id), employee.userAccount);
      [employee.name, employee.loginUsername, employee.email, employee.mobile].forEach((value) => {
        const key = normalizeExcelKey(value);
        if (key) userByReferenceName.set(key, employee.userAccount);
      });
    }
  });

  const requestedAssignmentValues = [...new Set(
    [...Object.values(assignmentsByRow), defaultAllocatedTo]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
  const resolvedAssignmentEntries = await Promise.all(
    requestedAssignmentValues.map(async (value) => [value, await resolveAssignableUserId(value)])
  );
  const resolvedAssignmentUserByValue = new Map(
    resolvedAssignmentEntries.filter(([, userId]) => userId)
  );

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

    const referenceBy = String(excelValue(row, ["Reference", "Reference By"])).trim();
    const assignedFromRow = assignmentsByRow[rowNo] || assignmentsByRow[index + 1];
    const rawAssignedUser = assignedFromRow || defaultAllocatedTo;
    const assignedUser = resolvedAssignmentUserByValue.get(String(rawAssignedUser))
      || (userById.has(String(rawAssignedUser)) ? rawAssignedUser : employeeUserById.get(String(rawAssignedUser)));
    const referenceOwner = !isDirectReference(referenceBy) ? userByReferenceName.get(normalizeExcelKey(referenceBy)) : null;

    if (rawAssignedUser && !assignedUser) {
      errors.push(`Row ${rowNo}: Selected employee has no active user login for assignment`);
      return;
    }

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
      referenceBy,
      inquiryDate: parseExcelDate(excelValue(row, ["Inquiry Date", "Date"])) || new Date(),
      status: ["Open", "Close", "Complete", "Recall", "InProgress", "Pending", "Converted"].includes(String(excelValue(row, ["Status"])).trim())
        ? String(excelValue(row, ["Status"])).trim()
        : "Open",
      followUpDate,
      nextVisitingDate: followUpDate,
      followUpDetails: String(excelValue(row, ["Details", "Follow-up Details", "Follow Up Details", "Remarks"])).trim(),
      createdBy: req.user?._id,
      allocatedTo: assignedUser || referenceOwner || req.user?._id,
      _importRowNo: rowNo,
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

  const insertDocs = docs.map(({ _importRowNo, ...doc }) => doc);
  const created = await Inquiry.insertMany(insertDocs, { ordered: false });
  const assignmentMap = new Map();
  docs.forEach((doc) => {
    const key = doc.allocatedTo ? String(doc.allocatedTo) : "unassigned";
    const current = assignmentMap.get(key) || {
      assignedTo: doc.allocatedTo || undefined,
      assignedToName: doc.allocatedTo ? (userById.get(String(doc.allocatedTo))?.name || "Unknown") : "Unassigned",
      count: 0,
      rows: [],
    };
    current.count += 1;
    current.rows.push(doc._importRowNo);
    assignmentMap.set(key, current);
  });
  const history = await InquiryImportHistory.create({
    fileName: req.file.originalname,
    source,
    importedBy: req.user?._id,
    branchId: req.user?.branchId,
    totalRows: rawRows.length,
    importedCount: created.length,
    skippedCount: errors.length,
    assignmentSummary: [...assignmentMap.values()],
    errors: errors.slice(0, 100),
  });

  await Inquiry.updateMany(
    { _id: { $in: created.map((item) => item._id) } },
    { $set: { importBatchId: history._id } }
  );

  res.status(201).json({
    imported: created.length,
    skipped: errors.length,
    history,
    errors: errors.slice(0, 25),
    message: `${created.length} inquiries imported successfully${errors.length ? `, ${errors.length} rows skipped` : ""}`
  });
});

const getInquiryImportHistory = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.source) query.source = req.query.source;
  if (req.user?.role !== "Super Admin") {
    query.importedBy = req.user._id;
  }

  const histories = await InquiryImportHistory.find(query)
    .populate("importedBy", "name username")
    .populate("assignmentSummary.assignedTo", "name username")
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  res.json(histories);
});

const getInquiryFollowupStats = asyncHandler(async (req, res) => {
  const { source, branchId, employeeId } = req.query;
  const start = req.query.startDate ? new Date(req.query.startDate) : new Date();
  const end = req.query.endDate ? new Date(req.query.endDate) : new Date(start);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const inquiryQuery = { isDeleted: false };
  if (source) inquiryQuery.source = source;
  if (branchId) inquiryQuery.branchId = branchId;
  if (req.user?.role !== "Super Admin" && req.user?.branchId) inquiryQuery.branchId = req.user.branchId;
  if (req.user?.role !== "Super Admin") addInquiryOwnershipScope(inquiryQuery, req.user._id);

  let selectedEmployeeUserId = null;
  if (employeeId) {
    selectedEmployeeUserId = await resolveAssignableUserId(employeeId);
    if (!selectedEmployeeUserId) {
      return res.json({
        range: { startDate: start, endDate: end },
        totalInquiries: 0,
        openCount: 0,
        totalFollowUps: 0,
        pendingFromBefore: 0,
        employees: [],
        summary: {
          total: 0,
          open: 0,
          completed: 0,
          followUpsToday: 0
        }
      });
    }
    inquiryQuery.allocatedTo = selectedEmployeeUserId;
  }

  const openStatuses = ["Open", "InProgress", "Recall"];
  const completedStatuses = ["Close", "Complete"];

  // Inquiries created within date range
  const inquiriesTodayQuery = {
    ...inquiryQuery,
    inquiryDate: { $gte: start, $lte: end },
  };

  // Inquiries that had followup activity in date range
  const inquiries = await Inquiry.find({
    ...inquiryQuery,
    $or: [
      { "followUpHistory.createdAt": { $gte: start, $lte: end } },
      { "followUpHistory.date": { $gte: start, $lte: end } },
    ],
  })
    .populate("allocatedTo", "name username")
    .populate("createdBy", "name username")
    .populate("followUpHistory.followUpBy", "name username")
    .select("firstName lastName contactStudent allocatedTo createdBy followUpHistory status")
    .lean();

  const employeeMap = new Map();
  let followUpsToday = 0;

  inquiries.forEach((inquiry) => {
    (inquiry.followUpHistory || []).forEach((history) => {
      const actionDate = history.createdAt || history.date;
      if (!actionDate) return;
      const actionTime = new Date(actionDate).getTime();
      if (actionTime < start.getTime() || actionTime > end.getTime()) return;

      const user = history.followUpBy || inquiry.allocatedTo || inquiry.createdBy || {};
      if (selectedEmployeeUserId && String(user._id || "") !== String(selectedEmployeeUserId)) return;
      
      followUpsToday++;
      
      const key = user._id ? String(user._id) : "unassigned";
      const current = employeeMap.get(key) || {
        employeeId: user._id || null,
        employeeName: user.name || user.username || "Unassigned",
        followUpCount: 0,
        latestFollowUpAt: null,
      };
      current.followUpCount += 1;
      if (!current.latestFollowUpAt || new Date(actionDate) > new Date(current.latestFollowUpAt)) {
        current.latestFollowUpAt = actionDate;
      }
      employeeMap.set(key, current);
    });
  });

  // Calculate detailed summary if employeeId is provided
  let summary = null;
  if (selectedEmployeeUserId) {
    const stats = await Inquiry.aggregate([
      { $match: inquiryQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ["$status", openStatuses] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $in: ["$status", completedStatuses] }, 1, 0] } }
        }
      }
    ]);
    
    summary = stats[0] || { total: 0, open: 0, completed: 0 };
    summary.followUpsToday = followUpsToday;
  }

  // Count open inquiries within date range
  const openInDateRange = await Inquiry.countDocuments({
    ...inquiriesTodayQuery,
    status: { $in: openStatuses }
  });

  // Count pending inquiries from BEFORE date range that are still open
  let pendingFromBefore = 0;
  if (selectedEmployeeUserId) {
    pendingFromBefore = await Inquiry.countDocuments({
      ...inquiryQuery,
      inquiryDate: { $lt: start },
      status: { $in: openStatuses }
    });
  }

  const [totalInquiries] = await Promise.all([
    Inquiry.countDocuments(inquiriesTodayQuery),
  ]);

  const employees = [...employeeMap.values()].sort((a, b) => b.followUpCount - a.followUpCount);

  res.json({
    range: { startDate: start, endDate: end },
    totalInquiries,
    openCount: openInDateRange,
    totalFollowUps: employees.reduce((sum, item) => sum + item.followUpCount, 0),
    pendingFromBefore,
    employees,
    summary
  });
});

const assignInquiries = asyncHandler(async (req, res) => {
  if (req.user?.role !== "Super Admin") {
    res.status(403);
    throw new Error("Only Super Admin can assign inquiries");
  }

  const inquiryIds = Array.isArray(req.body.inquiryIds) ? req.body.inquiryIds.filter(Boolean) : [];
  if (!inquiryIds.length) {
    res.status(400);
    throw new Error("Please select inquiries to assign");
  }

  const allocatedTo = await resolveAssignableUserId(req.body.allocatedTo);
  if (!allocatedTo) {
    res.status(400);
    throw new Error("Selected employee has no linked user login");
  }

  const isTransfer = req.body.transfer === true || req.body.transferMode === true;
  const currentAllocatedTo = isTransfer
    ? await resolveAssignableUserId(req.body.currentEmployeeId || req.body.fromEmployeeId)
    : null;

  if (isTransfer && !currentAllocatedTo) {
    res.status(400);
    throw new Error("Please select employee filter before transfer");
  }

  if (isTransfer && String(currentAllocatedTo) === String(allocatedTo)) {
    res.status(400);
    throw new Error("Please select a different employee to transfer");
  }

  const selectedInquiries = await Inquiry.find({
    _id: { $in: inquiryIds },
    isDeleted: false,
  }).select("_id allocatedTo createdBy adminAssignedAt").lean();

  if (selectedInquiries.length !== inquiryIds.length) {
    res.status(404);
    throw new Error("Some selected inquiries were not found");
  }

  if (!isTransfer) {
    const alreadyAssigned = selectedInquiries.filter((item) => (
      item.adminAssignedAt ||
      (item.allocatedTo && item.createdBy && String(item.allocatedTo) !== String(item.createdBy))
    ));
    if (alreadyAssigned.length) {
      res.status(409);
      throw new Error(`${alreadyAssigned.length} inquiry already assigned. Use employee filter and Transfer mode to move it.`);
    }
  } else {
    const wrongOwner = selectedInquiries.filter((item) => String(item.allocatedTo || "") !== String(currentAllocatedTo));
    if (wrongOwner.length) {
      res.status(409);
      throw new Error("Selected inquiry does not belong to the filtered employee");
    }
  }

  const now = new Date();
  const update = isTransfer
    ? {
        $set: {
          allocatedTo,
          previousAllocatedTo: currentAllocatedTo,
          adminTransferredBy: req.user._id,
          adminTransferredAt: now,
          adminAssignedBy: req.user._id,
          adminAssignedAt: now,
        },
      }
    : {
        $set: {
          allocatedTo,
          adminAssignedBy: req.user._id,
          adminAssignedAt: now,
        },
      };

  const result = await Inquiry.updateMany(
    { _id: { $in: inquiryIds }, isDeleted: false },
    update
  );

  res.json({
    message: `${result.modifiedCount || 0} inquiries ${isTransfer ? "transferred" : "assigned"} successfully`,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    allocatedTo,
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

  if (req.body.allocatedTo) {
    const allocatedTo = await resolveAssignableUserId(req.body.allocatedTo);
    if (!allocatedTo) {
      res.status(400);
      throw new Error("Selected employee has no linked user login");
    }
    req.body.allocatedTo = allocatedTo;
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
      "isExternalRef",
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

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        // Sanitize stringified objects like "[object Object]"
        if (req.body[field] === '[object Object]') {
          continue; // Skip this field
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
        } else if (field === "isExternalRef") {
          inquiry[field] = req.body[field] === "true" || req.body[field] === true;
        } else if (field === "referenceBy" && req.body.referenceBy) {
          inquiry[field] = req.body[field];
          // Re-check external ref status if reference name changes
          const refName = String(req.body[field]).trim();
          const isSavedRef = await Reference.findOne({ 
              name: { $regex: new RegExp(`^${escapeRegex(refName)}$`, "i") }, 
              isDeleted: false 
          }).lean();
          inquiry.isExternalRef = !!isSavedRef || inquiry.isExternalRef;
        } else {
          inquiry[field] = req.body[field];
        }
      }
    }

    if (req.file) {
      inquiry.studentPhoto = req.file.path.replace(/\\/g, "/");
    }

    if (req.user?._id && req.body.referenceBy !== undefined && req.body.allocatedTo === undefined) {
      inquiry.allocatedTo = await resolveInquiryOwner({
        referenceBy: inquiry.referenceBy || inquiry.referenceDetail?.name,
        requestedAllocatedTo: null,
        fallbackUserId: inquiry.createdBy || req.user._id,
        isExternalRef: inquiry.isExternalRef
      });
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
    { path: "allocatedTo", select: "name username role" },
    { path: "createdBy", select: "name username role" },
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
      query.branch = mongoose.Types.ObjectId.isValid(req.query.branchId)
        ? new mongoose.Types.ObjectId(req.query.branchId)
        : req.query.branchId;
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

  let [receipts, total, summary] = await Promise.all([
    receiptQuery,
    shouldPaginate ? FeeReceipt.countDocuments(query) : Promise.resolve(0),
    shouldPaginate
      ? FeeReceipt.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amountPaid" },
              totalReceipts: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
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
    summary: {
      totalAmount: summary?.[0]?.totalAmount || 0,
      totalReceipts: summary?.[0]?.totalReceipts || total,
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
      const var1 = `${student.firstName} ${student.lastName}`; // Student Name (Unified format)
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

      // var4 (Registration/Enrollment No)
      const var4 = student.regNo || student.enrollmentNo || "N/A";

      // ALWAYS include Reg.No. to match the approved DLT template exactly
      const smsMessage = `Dear, ${var1}. Your Course fees ${var2} has been deposited for ${var3}, Reg.No. ${var4}. Thank you, Smart Institute`;

      const contacts = [...new Set([
          student.mobileStudent,
          student.mobileParent,
          student.contactHome
      ].filter(Boolean))];

      // SMS Diagnostic Logging
      console.log('=== SMS DIAGNOSTIC ===');
      console.log('Student ID:', student._id);
      console.log('Student Mobile Numbers - Student:', student.mobileStudent, '| Parent:', student.mobileParent, '| Home:', student.contactHome);
      console.log('Filtered Contacts:', contacts);
      console.log('Receipt Purpose:', receiptPurpose.purpose);
      console.log('Admission Completed Now:', admissionCompletedNow);
      console.log('SMS Message:', smsMessage);
      
      if (contacts.length === 0) {
          console.warn('!!! SMS NOT SENT: No valid mobile numbers found for this student !!!');
          console.warn('Student fields - mobileStudent:', student.mobileStudent, 'mobileParent:', student.mobileParent, 'contactHome:', student.contactHome);
      } else {
          console.log(`Sending Fees SMS to: ${contacts.join(', ')} | Msg: ${smsMessage}`);

          // Send SMS synchronously (awaited)
          await Promise.all(contacts.map(num => 
              sendSMS(num, smsMessage, 'Fees').catch(err => console.error(`Failed to send Transaction SMS to ${num}`, err))
          ));
      }
      console.log('=== SMS DIAGNOSTIC END ===');
      
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
  const allocatedPayments = allocateReceiptPayments(student, receipts);

  const admissionPaid = allocatedPayments.admissionPaid;
  const admissionOutstanding = Math.max(0, admissionFee - admissionPaid);

  const registrationPaid = allocatedPayments.registrationPaid;
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

      const totalInstallmentPaid = allocatedPayments.installmentPaid;
      const priorScheduled = Math.max(0, installmentsDue - 1) * monthlyInstallment;

      previousOutstanding = Math.max(0, priorScheduled - totalInstallmentPaid);
      installmentPrepaid = Math.max(0, totalInstallmentPaid - priorScheduled);
      currentInstallmentDue = installmentsDue > 0 ? monthlyInstallment : 0;

      let upcomingEMI = Math.max(0, totalScheduledInstallmentDue - totalInstallmentPaid);
      upcomingEMI = Math.min(upcomingEMI, remainingCourseFee);
    }
  } else {
    const courseAmountPaid = allocatedPayments.installmentPaid;
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
  getInquiryImportHistory,
  getInquiryFollowupStats,
  assignInquiries,
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

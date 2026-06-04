const fs = require("fs");

const path = require("path");
const crypto = require("crypto");

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Branch = require("../models/Branch");
const { State, City } = require("../models/Location");
const Subject = require("../models/Subject");
const Course = require("../models/Course");
const Batch = require("../models/Batch");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Student = require("../models/Student");
const FeeReceipt = require("../models/FeeReceipt");
const Inquiry = require("../models/Inquiry");
const Visitor = require("../models/Visitor");
const StudentAttendance = require("../models/StudentAttendance");
const ExamSchedule = require("../models/ExamSchedule");
const ExamResult = require("../models/ExamResult");
const Blog = require("../models/Blog");
const News = require("../models/News");
const Contact = require("../models/Contact");
const Complain = require("../models/Complain");
const Feedback = require("../models/Feedback");
const CourseFeedback = require("../models/CourseFeedback");
const Material = require("../models/Material");
const TopperResult = require("../models/TopperResult");
const Gallery = require("../models/Gallery");
const FreeLearning = require("../models/FreeLearning");
const UserRightTemplate = require("../models/UserRightTemplate");

const exportDir = path.resolve(__dirname, "..", "..", "exports");

const LegacyExportSchema = new mongoose.Schema(
  {
    tableName: { type: String, index: true },
    legacyId: { type: String, index: true },
    rowNumber: Number,
    data: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, strict: false }
);
const LegacyExport = mongoose.model("LegacyExport", LegacyExportSchema);

const t = {};
const ids = {
  state: new Map(),
  city: new Map(),
  branch: new Map(),
  subject: new Map(),
  course: new Map(),
  batch: new Map(),
  employee: new Map(),
  user: new Map(),
  clientUser: new Map(),
  student: new Map(),
  inquiry: new Map(),
  visitor: new Map(),
  examSchedule: new Map(),
};

function oid(ns, id) {
  const key = String(id || "").trim();
  if (!key || key === "0") return undefined;
  return new mongoose.Types.ObjectId(crypto.createHash("md5").update(`${ns}:${key}`).digest("hex").slice(0, 24));
}

function val(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function text(value, fallback = "") {
  const v = val(value);
  return v || fallback;
}

function num(value, fallback = 0) {
  const v = val(value).replace(/,/g, "");
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback = false) {
  const v = val(value).toLowerCase();
  if (!v) return fallback;
  return ["true", "1", "yes", "y", "active"].includes(v);
}

function date(value) {
  const v = val(value);
  if (!v) return undefined;
  const m = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function cleanEnum(value, allowed, fallback) {
  const v = text(value);
  return allowed.includes(v) ? v : fallback;
}

function splitName(first, middle, last) {
  return {
    firstName: text(first, "Unknown"),
    middleName: text(middle),
    lastName: text(last, "."),
  };
}

function decodePassword(encoded) {
  const raw = text(encoded, "123456");
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded || raw;
  } catch {
    return raw;
  }
}

function passwordHash(encoded) {
  return bcrypt.hashSync(decodePassword(encoded), 10);
}

function csvParse(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const c = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function loadTable(file) {
  const full = path.join(exportDir, file);
  const content = fs.readFileSync(full, "utf8");
  if (!content.trim()) return [];
  const rows = csvParse(content);
  if (rows.length < 2 || rows[0].length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => val(c))).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
}

function table(name) {
  if (!t[name]) {
    t[name] = loadTable(`dbo.${name}.csv`);
  }
  return t[name];
}

function nameById(rows, idField, nameField, id) {
  const row = rows.find((r) => val(r[idField]) === val(id));
  return row ? text(row[nameField]) : "";
}

async function insertMany(Model, docs) {
  if (!docs.length) return 0;
  await Model.collection.insertMany(docs.map(cleanDoc), { ordered: false });
  return docs.length;
}

function cleanDoc(value) {
  if (Array.isArray(value)) return value.map(cleanDoc).filter((item) => item !== undefined);
  if (!value || value instanceof Date || value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value !== "object") return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const cleaned = cleanDoc(child);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

function buildLegacyArchive() {
  const files = fs.readdirSync(exportDir).filter((f) => f.endsWith(".csv") && f.startsWith("dbo."));
  const docs = [];
  for (const file of files) {
    const tableName = file.replace(/^dbo\./, "").replace(/\.csv$/, "");
    const rows = table(tableName);
    rows.forEach((row, index) => {
      const firstIdField = Object.keys(row).find((k) => /id$/i.test(k));
      docs.push({
        tableName,
        legacyId: firstIdField ? text(row[firstIdField]) : "",
        rowNumber: index + 1,
        data: row,
      });
    });
  }
  return docs;
}

function buildStatesAndCities() {
  const stateDocs = table("tblState").map((r) => {
    const _id = oid("state", r.StateID);
    ids.state.set(text(r.StateID), _id);
    return { _id, name: text(r.StateName, `State ${r.StateID}`), isActive: true, isDeleted: false };
  });
  const cityDocs = table("tblCity").map((r) => {
    const _id = oid("city", r.CityID);
    ids.city.set(text(r.CityID), _id);
    return {
      _id,
      name: text(r.CityName, `City ${r.CityID}`),
      stateId: ids.state.get(text(r.StateID)) || stateDocs[0]?._id,
      isActive: true,
      isDeleted: false,
    };
  }).filter((d) => d.stateId);
  return { stateDocs, cityDocs };
}

function buildBranches() {
  const states = table("tblState");
  const cities = table("tblCity");
  return table("tblBranchMaster").map((r) => {
    const _id = oid("branch", r.BranchID);
    ids.branch.set(text(r.BranchID), _id);
    const name = text(r.BranchName, `Branch ${r.BranchID}`);
    return {
      _id,
      name,
      shortCode: name.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || `BR${r.BranchID}`,
      phone: text(r.phoneNo),
      mobile: text(r.MobileNo, "0000000000"),
      email: text(r.EmailID, `branch${r.BranchID}@example.com`),
      address: text(r.BranchAddress, name),
      city: nameById(cities, "CityID", "CityName", r.CityID) || "Surat",
      state: nameById(states, "StateID", "StateName", r.StateID) || "Gujarat",
      isActive: bool(r.IsActive, true),
    };
  });
}

function buildSubjects() {
  return table("tblSubject").map((r) => {
    const _id = oid("subject", r.SubjectID);
    ids.subject.set(text(r.SubjectID), _id);
    return {
      _id,
      name: text(r.SubjectName, `Subject ${r.SubjectID}`),
      printedName: text(r.PrintedName, text(r.SubjectName, `Subject ${r.SubjectID}`)),
      duration: num(r.Duration, 1),
      durationType: cleanEnum(r.DurationType, ["Month", "Year", "Days"], "Month"),
      totalMarks: num(r.TotalMarks, 100),
      theoryMarks: num(r.TheoryMarks, 0),
      practicalMarks: num(r.PrecticalMarks, 0),
      passingMarks: num(r.PassingMarks, 35),
      topicName: text(r.SubjectTopic),
      description: text(r.FullDescription),
      isActive: bool(r.IsActive, true),
      isDeleted: false,
    };
  });
}

function buildCourses() {
  const detailsByCourse = new Map();
  for (const d of table("tblCourseDetail")) {
    const cid = text(d.CourseID);
    if (!detailsByCourse.has(cid)) detailsByCourse.set(cid, []);
    const subject = ids.subject.get(text(d.SubjectID));
    if (subject) detailsByCourse.get(cid).push({ subject, sortOrder: num(d.SortNo, 0) });
  }
  return table("tblCourseMaster").map((r) => {
    const _id = oid("course", r.CourseID);
    ids.course.set(text(r.CourseID), _id);
    return {
      _id,
      name: text(r.CourseName, `Course ${r.CourseID}`),
      shortName: text(r.CourseShortForm, text(r.CourseCode, `C${r.CourseID}`)).slice(0, 80),
      image: text(r.CourseImage),
      smallDescription: text(r.SmallDescription),
      description: text(r.CourseDescription),
      courseFees: num(r.CourseFees, 0),
      admissionFees: num(r.AdmissionFees, 0),
      registrationFees: num(r.RegistrationFees, 0),
      monthlyFees: num(r.MonthlyFees, 0),
      totalInstallment: num(r.TotalInstallment, 1),
      sorting: num(r.DisplayOrder, 0),
      commission: num(r.Commision, 0),
      duration: num(r.Duration, 1),
      durationType: cleanEnum(r.DurationType, ["Month", "Year", "Days"], "Month"),
      courseType: text(r.CourseType, "General"),
      subjects: detailsByCourse.get(text(r.CourseID)) || [],
      isActive: bool(r.IsActive, true),
      isDeleted: false,
    };
  });
}

function buildEmployees() {
  const rows = table("tblEmployee");
  return rows.map((r) => {
    const _id = oid("employee", r.EmployeeID);
    ids.employee.set(text(r.EmployeeID), _id);
    return {
      _id,
      regNo: text(r.EmployeeID),
      name: text(r.EmployeeName, `Employee ${r.EmployeeID}`),
      mobile: text(r.MobileNo, "0000000000"),
      gender: cleanEnum(r.Gender, ["Male", "Female", "Other"], "Other"),
      type: cleanEnum(r.EmployeeType, ["Manager", "Faculty", "Marketing Person", "Branch Director", "Receptionist", "Other"], "Other"),
      email: text(r.EmailID, `employee${r.EmployeeID}@example.com`),
      duration: text(r.TimePeriod),
      dob: date(r.DateOfBirth),
      dateOfJoining: date(r.JoiningDate),
      education: text(r.Education),
      qualification: text(r.Qualification),
      address: text(r.EmployeeAddress),
      branchId: ids.branch.get(text(r.BranchID)),
      experience: text(r.Experience),
      workingTimePeriod: text(r.TimePeriod),
      companyName: text(r.CompanyName),
      role: text(r.Role),
      isActive: bool(r.IsActive, true),
      isDeleted: false,
    };
  });
}

function buildBatches() {
  const coursesByBatch = new Map();
  for (const row of table("tblBatchDetail")) {
    const batchId = text(row.BatchID);
    if (!coursesByBatch.has(batchId)) coursesByBatch.set(batchId, []);
    const course = ids.course.get(text(row.CourseID));
    if (course) coursesByBatch.get(batchId).push(course);
  }
  return table("tblBatchMaster").map((r) => {
    const _id = oid("batch", r.BatchID);
    ids.batch.set(text(r.BatchID), _id);
    const [startTime, endTime] = text(r.BatchTime, "00:00 To 00:00").split(/\s+To\s+/i);
    return {
      _id,
      name: text(r.BatchName, `Batch ${r.BatchID}`),
      batchSize: num(r.BatchSize, 1),
      startTime: text(startTime, "00:00"),
      endTime: text(endTime, "00:00"),
      branchId: ids.branch.get(text(r.BranchID)),
      faculty: ids.employee.get(text(r.EmployeeId)),
      courses: coursesByBatch.get(text(r.BatchID)) || [],
      startDate: date(r.BatchStartDate) || new Date(),
      endDate: date(r.BatchEndDate) || date(r.BatchStartDate) || new Date(),
      isActive: true,
      isDeleted: false,
    };
  });
}

function buildUsers() {
  const usedUsernames = new Set();
  const usedEmails = new Set();
  const docs = [];

  for (const r of table("tblUsers")) {
    const _id = oid("user", r.UserID);
    ids.user.set(text(r.UserID), _id);
    const username = text(r.UserName, `user${r.UserID}`);
    usedUsernames.add(username.toLowerCase());
    const email = text(r.EmailID) || `legacy-user-${r.UserID}@legacy.local`;
    usedEmails.add(email.toLowerCase());
    docs.push({
      _id,
      name: text(r.FullName, username),
      username,
      email,
      password: passwordHash(r.Password),
      role: text(r.UserType).toLowerCase().includes("super") ? "Super Admin" : "Other",
      mobile: text(r.ContactNo),
      isActive: bool(r.IsActive, true),
    });
  }

  for (const r of table("tblClientLogin")) {
    const _id = oid("clientLogin", r.ClientLoginID);
    ids.clientUser.set(text(r.ClientLoginID), _id);
    const loginType = text(r.LoginType);
    let username = text(r.LoginName, `login${r.ClientLoginID}`);
    if (usedUsernames.has(username.toLowerCase())) username = `${username}_${r.ClientLoginID}`;
    usedUsernames.add(username.toLowerCase());
    const isStudent = loginType.includes("Student");
    const isEmployee = loginType.includes("Faculty") || loginType.includes("Manager");
    const studentRow = isStudent ? table("tblStudentMaster").find((s) => text(s.StudentID) === text(r.UserID)) : null;
    const employeeRow = isEmployee ? table("tblEmployee").find((e) => text(e.EmployeeID) === text(r.UserID)) : null;
    const email = text(studentRow?.EmailID || employeeRow?.EmailID);
    let uniqueEmail = email && !usedEmails.has(email.toLowerCase()) ? email : `legacy-clientlogin-${r.ClientLoginID}@legacy.local`;
    if (usedEmails.has(uniqueEmail.toLowerCase())) uniqueEmail = `legacy-clientlogin-${r.ClientLoginID}-${crypto.randomBytes(3).toString("hex")}@legacy.local`;
    usedEmails.add(uniqueEmail.toLowerCase());
    docs.push({
      _id,
      name: text(studentRow?.StudentName || employeeRow?.EmployeeName || username, username),
      username,
      email: uniqueEmail,
      password: passwordHash(r.Password),
      role: isStudent ? "Student" : cleanEnum(employeeRow?.EmployeeType, ["Manager", "Faculty", "Marketing Person", "Branch Director", "Receptionist", "Other"], "Other"),
      branchId: ids.branch.get(text(studentRow?.BranchID || employeeRow?.BranchID)),
      branchName: "",
      mobile: text(studentRow?.MobileNO || studentRow?.MobileNoParent || employeeRow?.MobileNo),
      gender: cleanEnum(studentRow?.Gender || employeeRow?.Gender, ["Male", "Female", "Other"], undefined),
      education: text(studentRow?.Education || employeeRow?.Education),
      address: text(studentRow?.Address || employeeRow?.EmployeeAddress),
      isActive: bool(r.IsActive, true),
    });
  }
  return docs;
}

function buildStudents() {
  const courseRowsByStudent = new Map(table("tblStudentCourse").map((r) => [text(r.StudentID), r]));
  const loginByStudent = new Map(table("tblClientLogin").filter((r) => text(r.LoginType).includes("Student")).map((r) => [text(r.UserID), ids.clientUser.get(text(r.ClientLoginID))]));
  return table("tblStudentMaster").map((r) => {
    const _id = oid("student", r.StudentID);
    ids.student.set(text(r.StudentID), _id);
    const sc = courseRowsByStudent.get(text(r.StudentID));
    const branchId = ids.branch.get(text(r.BranchID));
    const branch = table("tblBranchMaster").find((b) => text(b.BranchID) === text(r.BranchID));
    const course = ids.course.get(text(sc?.CourseID || "undefined")) || ids.course.get(text(table("tblStudentCourse")[0]?.CourseID)) || ids.course.values().next().value;
    const totalFees = num(sc?.CourseAmount, num(r.TotalRegistrationFees, 0));
    const received = num(r.TotalReceivedFees, 0);
    const name = splitName(r.StudentName, r.FatherName, r.LastName);
    return {
      _id,
      enrollmentNo: text(r.erno),
      regNo: text(r.RegistrationNo),
      isActive: bool(r.IsActive, true),
      isRegistered: true,
      isCancelled: bool(r.IsCanceled, false),
      isDeleted: false,
      cancelledDate: date(r.CancellationDate),
      isPhotos: bool(r.IsPhoto),
      isIDProof: bool(r.IsIdProof),
      isMarksheetCertificate: bool(r.IsMarkCertificate),
      isAddressProof: bool(r.IsAddressProof),
      branchId,
      branchName: text(branch?.BranchName, "Main Branch"),
      registrationDate: date(r.RegistrationDate),
      admissionDate: date(r.AdmissionDate) || date(r.RegistrationDate) || new Date(),
      firstName: name.firstName,
      middleName: name.middleName,
      relationType: bool(r.IsFather, true) ? "Father" : "Husband",
      lastName: name.lastName,
      motherName: text(r.MotherName),
      dob: date(r.DateOfBirth) || new Date(2000, 0, 1),
      gender: cleanEnum(r.Gender, ["Male", "Female", "Other"], "Other"),
      email: text(r.EmailID),
      contactHome: text(r.ContactNoHome),
      mobileStudent: text(r.MobileNO),
      mobileParent: text(r.MobileNoParent, text(r.MobileNO, "0000000000")),
      address: text(r.Address, "."),
      state: text(r.State, "Gujarat"),
      city: text(r.City, "Surat"),
      pincode: text(r.Pincode),
      occupationType: cleanEnum(r.OccupationType, ["Service", "Business", "Student", "Unemployed"], undefined),
      occupationName: text(r.Occupation),
      education: text(r.Education),
      reference: text(r.OtherReference, "Direct"),
      course,
      batch: text(sc?.BatchId || r.BatchDate, "Legacy Batch"),
      batchStartDate: date(sc?.BatchStartDate || r.BatchDate),
      paymentMode: text(r.FeesMethod).toLowerCase().includes("monthly") ? "EMI" : undefined,
      paymentPlan: text(r.FeesMethod).toLowerCase().includes("monthly") ? "Monthly" : "One Time",
      totalFees,
      pendingFees: Math.max(totalFees - received, 0),
      isAdmissionFeesPaid: bool(r.IsAdmisiionFees),
      admissionFeeAmount: num(r.TotalRegistrationFees, 0),
      registrationFeeAmount: num(sc?.RegisterFees, 0),
      userId: loginByStudent.get(text(r.StudentID)),
      inquiryId: ids.inquiry.get(text(r.InquiryID)),
      emiDetails: {
        registrationFees: num(sc?.RegisterFees, 0),
        monthlyInstallment: num(sc?.monthlyamount, 0),
        months: num(sc?.noofinstallment, 0),
      },
    };
  }).filter((d) => d.course);
}

function buildInquiries() {
  return table("tblInquiry").map((r) => {
    const _id = oid("inquiry", r.InquiryID);
    ids.inquiry.set(text(r.InquiryID), _id);
    return {
      _id,
      firstName: text(r.StudentName, "Unknown"),
      middleName: text(r.FatherName),
      relationType: bool(r.IsFather, true) ? "Father" : "Husband",
      lastName: text(r.LastName),
      gender: cleanEnum(r.Gender, ["Male", "Female", "Other"], undefined),
      dob: date(r.DateOfBirth),
      email: text(r.EmailID),
      contactHome: text(r.ContactNoHome),
      contactStudent: text(r.MobileNo),
      contactParent: text(r.MobileNoParent),
      education: text(r.Education),
      qualification: text(r.Qualification),
      address: text(r.Address),
      state: text(r.State),
      city: text(r.City, "Surat"),
      interestedCourse: ids.course.get(text(r.CourseID)),
      branchId: ids.branch.get(text(r.BranchID)),
      source: cleanEnum(r.InquiryType, ["Walk-in", "Social Media", "Reference", "Online", "Call", "DSR", "QuickContact", "OnlineAdmission", "Converted"], "Walk-in"),
      referenceBy: text(r.ReferenceName || r.OtherReference),
      referenceDetail: { name: text(r.ReferenceName), mobile: text(r.ReferenceMobileNo), address: text(r.ReferenceAddress) },
      inquiryDate: date(r.InquiryDate) || new Date(),
      status: cleanEnum(r.InquiryStatus, ["Open", "Close", "Complete", "Recall", "InProgress", "Pending", "Converted"], "Open"),
      followUpDate: date(r.FollowupDate),
      followUpDetails: text(r.FollowupDetail),
      followUpHistory: text(r.FollowupDetail) ? [{ date: date(r.FollowupDate), remarks: text(r.FollowupDetail), status: "Open" }] : [],
      nextVisitingDate: date(r.NextVisitingDate),
      visitReason: text(r.Reason),
      allocatedTo: ids.user.get(text(r.AllocationTo)),
      isDeleted: false,
    };
  });
}

function buildVisitors() {
  return table("tblVisitors").map((r) => {
    const _id = oid("visitor", r.VisitorID);
    ids.visitor.set(text(r.VisitorID), _id);
    return {
      _id,
      visitingDate: date(r.VisitingDate || r.vDate) || new Date(),
      studentName: text(r.StudentName, "Unknown"),
      mobileNumber: text(r.ContactNo, "0000000000"),
      reference: text(r.RefrenceId),
      course: ids.course.get(text(r.CourseID)),
      inTime: text(r.InTime),
      outTime: text(r.OutTime),
      attendedBy: ids.employee.get(text(r.AttendBy)),
      remarks: text(r.Remarks),
      branchId: ids.branch.get(text(r.BranchID)),
      isDeleted: false,
    };
  });
}

function buildFeeReceipts() {
  const used = new Set();
  return table("tblFeesReceipt").map((r) => {
    const branch = ids.branch.get(text(r.BranchID));
    const receiptNo = text(r.ReceiptNo, text(r.FeeReceiptID));
    const key = `${branch || "nobranch"}:${receiptNo}`;
    const finalReceiptNo = used.has(key) ? `${receiptNo}-${r.FeeReceiptID}` : receiptNo;
    used.add(`${branch || "nobranch"}:${finalReceiptNo}`);
    const receiptType = text(r.ReceiptType).toLowerCase();
    const mode = receiptType.includes("cheque") ? "Cheque" : receiptType.includes("cash") ? "Cash" : "Online/UPI";
    return {
      _id: oid("feeReceipt", r.FeeReceiptID),
      receiptNo: finalReceiptNo,
      student: ids.student.get(text(r.StudentID)),
      course: ids.course.get(text(r.CourseID)),
      branch,
      amountPaid: num(r.Amount, 0),
      paymentMode: mode,
      installmentNumber: num(r.InstallmentNo, 1),
      bankName: text(r.BankName),
      chequeNumber: text(r.ChequeNo),
      chequeDate: date(r.ChequeDate),
      transactionDate: date(r.ReceiptDate),
      transactionId: text(r.TransactionCode || r.RtgsImpsUPINo),
      paymentDetails: text(r.FeeType),
      remarks: text(r.Remarks),
      date: date(r.ReceiptDate) || new Date(),
      createdBy: ids.user.get(text(r.CreatedBy)),
      createdAt: date(r.CreatedDate) || date(r.ReceiptDate) || new Date(),
      updatedAt: date(r.CreatedDate) || date(r.ReceiptDate) || new Date(),
    };
  }).filter((d) => d.student && d.course);
}

function buildStudentAttendances() {
  const detailsByAttendance = new Map();
  for (const detail of table("tblAttendenceDetail")) {
    const id = text(detail.AttendenceID);
    if (!detailsByAttendance.has(id)) detailsByAttendance.set(id, []);
    detailsByAttendance.get(id).push(detail);
  }
  const batches = table("tblBatchMaster");
  return table("tblAttendence").filter((r) => text(r.UserType).toLowerCase() === "student").map((r) => {
    const batch = batches.find((b) => text(b.BatchID) === text(r.BatchID));
    const batchName = `${text(batch?.BatchName, `Batch ${r.BatchID}`)} #${r.BatchID} / A${r.AttendenceID}`;
    return {
      _id: oid("studentAttendance", r.AttendenceID),
      date: date(r.AttendenceDate) || new Date(),
      batchName,
      batchTime: text(batch?.BatchTime, "Legacy"),
      takenBy: ids.user.get(text(r.CreatedBy)) || ids.user.values().next().value,
      remarks: text(r.Remarks),
      records: (detailsByAttendance.get(text(r.AttendenceID)) || []).map((d) => {
        const student = table("tblStudentMaster").find((s) => text(s.StudentID) === text(d.StudentID));
        const course = table("tblCourseMaster").find((c) => text(c.CourseID) === text(table("tblStudentCourse").find((sc) => text(sc.StudentID) === text(d.StudentID))?.CourseID));
        return {
          studentId: ids.student.get(text(d.StudentID)),
          enrollmentNo: text(student?.erno),
          studentName: [student?.StudentName, student?.FatherName, student?.LastName].filter(Boolean).join(" "),
          courseName: text(course?.CourseName),
          contactStudent: text(student?.MobileNO),
          contactParent: text(student?.MobileNoParent),
          isPresent: bool(d.IsPresent),
          studentRemark: text(d.Remarks),
        };
      }).filter((rec) => rec.studentId),
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    };
  }).filter((d) => d.takenBy && d.records.length);
}

function buildExamSchedules() {
  const detailsByExam = new Map();
  for (const d of table("tblExamScheduleDetail")) {
    const id = text(d.ExamScheduleID);
    if (!detailsByExam.has(id)) detailsByExam.set(id, []);
    detailsByExam.get(id).push(d);
  }
  const attendeesByExam = new Map();
  for (const d of table("ExamScheduleDetailMaster")) {
    const id = text(d.ExamScheduleID);
    if (!attendeesByExam.has(id)) attendeesByExam.set(id, []);
    const student = ids.student.get(text(d.StudentID));
    if (student) attendeesByExam.get(id).push(student);
  }
  return table("tblExamScheduleMaster").map((r) => {
    const _id = oid("examSchedule", r.ExamScheduleID);
    ids.examSchedule.set(text(r.ExamScheduleID), _id);
    return {
      _id,
      course: ids.course.get(text(r.CourseID)),
      examName: text(r.ExamName, `Exam ${r.ExamScheduleID}`),
      attendees: attendeesByExam.get(text(r.ExamScheduleID)) || [],
      timeTable: (detailsByExam.get(text(r.ExamScheduleID)) || []).map((d) => ({
        subject: ids.subject.get(text(d.SubjectID)),
        date: date(d.ExamDate),
        startTime: text(d.ExamTime),
        endTime: text(d.PExamTime),
        theory: num(d.Theory, num(d.TheoryMarks, 0)),
        practical: num(d.Practical, 0),
        total: num(d.TotalMarks, 0),
      })).filter((d) => d.subject),
      remarks: text(r.Remarks),
      isActive: bool(r.IsActive, true),
      isDeleted: false,
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    };
  }).filter((d) => d.course);
}

function buildExamResults() {
  const detailByResult = new Map();
  for (const d of table("tblExamResultDetail")) {
    const id = text(d.ExamResultID);
    if (!detailByResult.has(id)) detailByResult.set(id, []);
    detailByResult.get(id).push(d);
  }
  const studentCourses = new Map(table("tblStudentCourse").map((r) => [text(r.StudentID), r]));
  return table("tblExamResult").map((r) => {
    const marks = (detailByResult.get(text(r.ExamResultID)) || []).map((d) => ({
      subject: ids.subject.get(text(d.SubjectID)),
      theory: num(d.TheoryMarks, 0),
      practical: num(d.PracticalMarks, 0),
      total: num(d.TotalMarks, 0),
    })).filter((d) => d.subject);
    const total = marks.reduce((sum, m) => sum + m.total, 0);
    const obtained = marks.reduce((sum, m) => sum + m.theory + m.practical, 0);
    const sc = studentCourses.get(text(r.StudentID));
    const somNumber = text(r.SRNo)
      ? `SOM-${text(r.SRNo).replace(/^(SOM-)+/i, "")}`
      : `SOM-LEGACY-${r.ExamResultID}`;
    const csrNumber = somNumber.replace(/^SOM-/i, "CSR-");
    return {
      _id: oid("examResult", r.ExamResultID),
      student: ids.student.get(text(r.StudentID)),
      exam: ids.examSchedule.get(text(r.ExamScheduleID)),
      course: ids.course.get(text(sc?.CourseID)),
      batch: text(r.BatchID || sc?.BatchId, "Legacy Batch"),
      somNumber,
      csrNumber,
      certificateNumber: csrNumber,
      subjectMarks: marks,
      marksObtained: obtained,
      totalMarks: total || 100,
      remarks: text(r.Remarks),
      isActive: bool(r.IsActive, true),
      isDeleted: false,
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    };
  }).filter((d) => d.student && d.exam && d.course);
}

function buildOtherCollections() {
  return {
    blogs: table("tblBlog").map((r) => ({
      _id: oid("blog", r.BlogID),
      title: text(r.BlogName, `Blog ${r.BlogID}`),
      slug: text(r.BlogCode, `blog-${r.BlogID}`).toLowerCase(),
      content: text(r.Description, "."),
      excerpt: text(r.Description).slice(0, 180),
      author: ids.user.get(text(r.CreatedBy)) || ids.user.values().next().value,
      authorName: "Legacy Admin",
      image: text(r.BlogImage),
      isPublished: bool(r.IsActive, true),
      isDeleted: false,
      createdAt: date(r.BlogDate) || date(r.CreatedDate) || new Date(),
      updatedAt: date(r.BlogDate) || date(r.CreatedDate) || new Date(),
    })).filter((d) => d.author),
    news: table("tblNews").map((r) => ({
      _id: oid("news", r.NewsID),
      title: text(r.NewsTitle, `News ${r.NewsID}`),
      smallDetail: text(r.SmallDesription),
      description: text(r.FullDescription),
      releaseDate: date(r.ReleaseDate) || new Date(),
      isBreaking: bool(r.IsBreakingNews),
      isActive: bool(r.IsActive, true),
      isDeleted: false,
      createdAt: date(r.CreatedDate) || date(r.ReleaseDate) || new Date(),
      updatedAt: date(r.CreatedDate) || date(r.ReleaseDate) || new Date(),
    })),
    contacts: table("tblContact").map((r) => ({
      _id: oid("contact", r.ContactID),
      name: text(r.ContactPerson, "Unknown"),
      email: text(r.EmailID, `contact${r.ContactID}@example.com`),
      phone: text(r.MobileNo),
      state: text(r.State),
      city: text(r.City),
      branch: text(r.BranchId),
      subject: text(r.Subject, "Contact"),
      message: text(r.ContactDetail, "."),
      status: cleanEnum(r.cStatus, ["New", "Read", "Resolved"], "New"),
      createdAt: date(r.ContactDate) || new Date(),
      updatedAt: date(r.ContactDate) || new Date(),
    })),
    complains: table("tblComplain").map((r) => ({
      _id: oid("complain", r.ComplainID),
      studentId: ids.student.get(text(r.StudentID)),
      userId: ids.user.get(text(r.CreatedBy)) || ids.user.values().next().value,
      subject: text(r.ComplainTitle, "Complain"),
      description: text(r.ComplainDetail, "."),
      status: cleanEnum(r.Status, ["Pending", "Accepted", "Resolved", "Rejected"], "Pending"),
      createdAt: date(r.CreatedDate) || date(r.ComplainDate) || new Date(),
      updatedAt: date(r.CreatedDate) || date(r.ComplainDate) || new Date(),
    })).filter((d) => d.studentId && d.userId),
    feedbacks: table("tblFeedback").map((r) => ({
      _id: oid("feedback", r.FeedbackId),
      name: text(r.FeedbackPerson, "Unknown"),
      email: text(r.EmailId),
      phone: text(r.MobileNo),
      category: text(r.Type, "general"),
      rating: 5,
      message: text(r.FeedbackDetail, text(r.Subject, ".")),
      suggestions: text(r.FeedbackTitle),
      status: "New",
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    })),
    courseFeedbacks: table("tblCourseFeedback").map((r) => ({
      _id: oid("courseFeedback", r.CourseFeedbackId),
      studentId: ids.student.get(text(r.StuentID)),
      studentName: text(r.FeedbackPerson),
      courseName: nameById(table("tblCourseMaster"), "CourseID", "CourseName", r.CourseID) || "Course",
      title: text(r.FeedbackTitle, "Feedback"),
      email: text(r.EmailId),
      mobile: text(r.MobileNo),
      feedback: text(r.FeedbackDetail, "."),
      date: date(r.CreatedDate) || new Date(),
      isRead: false,
    })),
    materials: table("tblMaterialMaster").map((r) => ({
      _id: oid("material", r.MaterialID),
      subject: ids.subject.get(text(r.SubjectId)) || ids.subject.values().next().value,
      title: text(r.Title, `Material ${r.MaterialID}`),
      type: cleanEnum(r.Type, ["Public", "Student only", "Student and Faculty only", "Faculty only"], "Student only"),
      document: text(r.Extension),
      description: text(r.FullDesciption),
      isActive: bool(r.IsActive, true),
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    })).filter((d) => d.subject),
    toppers: table("tblToppers").map((r) => {
      const student = table("tblStudentMaster").find((s) => text(s.StudentID) === text(r.StudentID));
      return {
        _id: oid("topper", r.TopperID),
        name: [student?.StudentName, student?.LastName].filter(Boolean).join(" ") || `Topper ${r.TopperID}`,
        course: nameById(table("tblCourseMaster"), "CourseID", "CourseName", r.CourseID) || "Course",
        percentage: Math.min(Math.max(num(r.Percentage, 0), 0), 100),
        image: "",
        isActive: bool(r.IsActive, true),
        isDeleted: false,
        createdAt: date(r.CreatedDate) || new Date(),
        updatedAt: date(r.CreatedDate) || new Date(),
      };
    }),
    galleries: table("tblSIGallery").map((r) => ({
      _id: oid("gallery", r.ID),
      title: text(r.gName, `Gallery ${r.ID}`),
      description: text(r.gSmallDesc),
      category: text(r.gType, "Legacy"),
      videoLink: text(r.gVideoLink),
      images: text(r.gimage) ? [text(r.gimage)] : [],
      isActive: bool(r.gStatus, true),
      createdAt: date(r.gCreateDate || r.gDate) || new Date(),
      updatedAt: date(r.gCreateDate || r.gDate) || new Date(),
    })),
    questions: table("tblQuestion").map((r) => ({
      _id: oid("freeLearning", r.QuestionID),
      question: text(r.Question, `Question ${r.QuestionID}`),
      options: [r.Option1, r.Option2, r.Option3, r.Option4].map((o) => text(o, "-")),
      correctOption: Math.max(num(r.Answer, 1) - 1, 0),
      isActive: bool(r.IsActive, true),
      createdBy: ids.user.get(text(r.CreatedBy)),
      createdAt: date(r.CreatedDate || r.QuestionDate) || new Date(),
      updatedAt: date(r.CreatedDate || r.QuestionDate) || new Date(),
    })),
    templates: table("tblTemplate").map((r) => ({
      _id: oid("template", r.TemplateID),
      name: `${text(r.TemplateName, "Template")} #${r.TemplateID}`,
      permissions: table("tblTemplateDetail").filter((d) => text(d.TemplateID) === text(r.TemplateID)).map((d) => ({
        page: nameById(table("tblTemplatePage"), "TemplatePageID", "DisplayName", d.TemplatePageID) || `Page ${d.TemplatePageID}`,
        view: bool(d.CanView),
        add: bool(d.CanAdd),
        edit: bool(d.CanEdit),
        delete: bool(d.CanDelete),
      })),
      createdAt: date(r.CreatedDate) || new Date(),
      updatedAt: date(r.CreatedDate) || new Date(),
    })),
  };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in backend/.env");
  console.log(`Connecting to ${process.env.MONGO_URI}`);
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Dropping current database before legacy import...");
  await mongoose.connection.db.dropDatabase();

  const counts = {};
  const { stateDocs, cityDocs } = buildStatesAndCities();
  counts.states = await insertMany(State, stateDocs);
  counts.cities = await insertMany(City, cityDocs);
  counts.branches = await insertMany(Branch, buildBranches());
  counts.subjects = await insertMany(Subject, buildSubjects());
  counts.courses = await insertMany(Course, buildCourses());
  counts.employees = await insertMany(Employee, buildEmployees());
  counts.batches = await insertMany(Batch, buildBatches());
  counts.users = await insertMany(User, buildUsers());
  counts.inquiries = await insertMany(Inquiry, buildInquiries());
  counts.students = await insertMany(Student, buildStudents());
  counts.visitors = await insertMany(Visitor, buildVisitors());
  counts.feeReceipts = await insertMany(FeeReceipt, buildFeeReceipts());
  counts.studentAttendances = await insertMany(StudentAttendance, buildStudentAttendances());
  counts.examSchedules = await insertMany(ExamSchedule, buildExamSchedules());
  counts.examResults = await insertMany(ExamResult, buildExamResults());

  const other = buildOtherCollections();
  counts.blogs = await insertMany(Blog, other.blogs);
  counts.news = await insertMany(News, other.news);
  counts.contacts = await insertMany(Contact, other.contacts);
  counts.complains = await insertMany(Complain, other.complains);
  counts.feedbacks = await insertMany(Feedback, other.feedbacks);
  counts.courseFeedbacks = await insertMany(CourseFeedback, other.courseFeedbacks);
  counts.materials = await insertMany(Material, other.materials);
  counts.toppers = await insertMany(TopperResult, other.toppers);
  counts.galleries = await insertMany(Gallery, other.galleries);
  counts.freeLearning = await insertMany(FreeLearning, other.questions);
  counts.userRightTemplates = await insertMany(UserRightTemplate, other.templates);
  counts.legacyExports = await insertMany(LegacyExport, buildLegacyArchive());

  console.log("Import counts:");
  for (const [key, count] of Object.entries(counts)) {
    console.log(`${key}: ${count}`);
  }

  const dbCounts = {};
  for (const model of [Branch, State, City, Subject, Course, Batch, Employee, User, Student, FeeReceipt, Inquiry, Visitor, StudentAttendance, ExamSchedule, ExamResult, Blog, News, Contact, Complain, Feedback, CourseFeedback, Material, TopperResult, Gallery, FreeLearning, UserRightTemplate, LegacyExport]) {
    dbCounts[model.collection.name] = await model.countDocuments();
  }
  console.log("Database counts:");
  for (const [key, count] of Object.entries(dbCounts).sort()) {
    console.log(`${key}: ${count}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Legacy import failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Inquiry = require("../models/Inquiry");
const User = require("../models/User");
const Employee = require("../models/Employee");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isDirectReference = (value) => {
  const text = String(value || "").trim().toLowerCase();
  return !text || ["direct", "self", "none", "na", "n/a", "-"].includes(text);
};

const resolveAssignableUserId = async (value) => {
  const text = String(value || "").trim();
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

  return null;
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const inquiries = await Inquiry.find({
    isDeleted: false,
    referenceBy: { $exists: true, $nin: ["", null] },
  })
    .select("_id referenceBy allocatedTo isExternalRef")
    .lean();

  const bulkOps = [];
  const reassignedByReference = {};

  for (const inquiry of inquiries) {
    if (isDirectReference(inquiry.referenceBy)) continue;

    const ownerId = await resolveAssignableUserId(inquiry.referenceBy);
    if (!ownerId) continue;
    if (String(inquiry.allocatedTo || "") === String(ownerId)) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: inquiry._id },
        update: {
          $set: {
            allocatedTo: ownerId,
            isExternalRef: false,
          },
        },
      },
    });

    const key = String(inquiry.referenceBy).trim();
    reassignedByReference[key] = (reassignedByReference[key] || 0) + 1;
  }

  let result = { matchedCount: 0, modifiedCount: 0 };
  if (bulkOps.length) {
    result = await Inquiry.bulkWrite(bulkOps);
  }

  console.log(JSON.stringify({
    checked: inquiries.length,
    updatesNeeded: bulkOps.length,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    reassignedByReference,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

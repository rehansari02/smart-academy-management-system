require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Student = require("../models/Student");

const cutoffDate = new Date("2026-03-01T00:00:00.000Z");
const admissionFeeAmount = 500;

const query = {
  isDeleted: false,
  admissionDate: { $lt: cutoffDate },
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const before = await Student.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        alreadyPaid: {
          $sum: { $cond: [{ $eq: ["$isAdmissionFeesPaid", true] }, 1, 0] },
        },
        needsFix: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $ne: ["$isAdmissionFeesPaid", true] },
                  { $ne: ["$admissionFeeAmount", admissionFeeAmount] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const result = await Student.updateMany(query, {
    $set: {
      isAdmissionFeesPaid: true,
      admissionFeeAmount,
    },
  });

  const after = await Student.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        paidAdmission500: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isAdmissionFeesPaid", true] },
                  { $eq: ["$admissionFeeAmount", admissionFeeAmount] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  console.log(JSON.stringify({
    cutoff: "admissionDate < 2026-03-01",
    admissionFeeAmount,
    before: before[0] || { total: 0, alreadyPaid: 0, needsFix: 0 },
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
    after: after[0] || { total: 0, paidAdmission500: 0 },
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

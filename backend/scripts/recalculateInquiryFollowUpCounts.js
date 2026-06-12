require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Inquiry = require("../models/Inquiry");

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const inquiries = await Inquiry.find({})
    .select("_id followUpHistory followUpCount")
    .lean();

  const bulkOps = inquiries
    .map((inquiry) => {
      const nextCount = (inquiry.followUpHistory || [])
        .filter((item) => item.activityType === "followup")
        .length;

      if (Number(inquiry.followUpCount || 0) === nextCount) return null;

      return {
        updateOne: {
          filter: { _id: inquiry._id },
          update: { $set: { followUpCount: nextCount } },
        },
      };
    })
    .filter(Boolean);

  let result = { modifiedCount: 0, matchedCount: 0 };
  if (bulkOps.length) {
    result = await Inquiry.bulkWrite(bulkOps);
  }

  console.log(JSON.stringify({
    checked: inquiries.length,
    updatesNeeded: bulkOps.length,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), override: true });

const mongoose = require("mongoose");
const FeeReceipt = require("../models/FeeReceipt");

const getPurpose = (receipt) => {
  const remarks = String(receipt?.remarks || "").toLowerCase();
  if (remarks.includes("admission")) return "admission";
  if (remarks.includes("registration")) return "registration";
  return "installment";
};

const sortReceipts = (receipts) => [...receipts].sort((a, b) => {
  const aTime = new Date(a.date || a.createdAt || 0).getTime();
  const bTime = new Date(b.date || b.createdAt || 0).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return Number(a.receiptNo || 0) - Number(b.receiptNo || 0);
});

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const receipts = await FeeReceipt.find({}).sort({ student: 1, date: 1, createdAt: 1 }).lean();
  const byStudent = receipts.reduce((map, receipt) => {
    const key = receipt.student?.toString();
    if (!key) return map;
    if (!map[key]) map[key] = [];
    map[key].push(receipt);
    return map;
  }, {});

  let checked = 0;
  let repaired = 0;
  const changed = [];

  for (const studentReceipts of Object.values(byStudent)) {
    let hasAdmission = false;
    let hasRegistration = false;
    let installmentNumber = 0;

    for (const receipt of sortReceipts(studentReceipts)) {
      checked += 1;
      const rawPurpose = getPurpose(receipt);
      let purpose = rawPurpose;

      if (rawPurpose === "admission") {
        if (hasAdmission) purpose = "installment";
        else hasAdmission = true;
      } else if (rawPurpose === "registration") {
        if (hasRegistration) purpose = "installment";
        else hasRegistration = true;
      }

      if (purpose !== "installment") continue;
      installmentNumber += 1;

      if (rawPurpose === "registration" || rawPurpose === "admission") {
        const nextRemarks = `Installment ${installmentNumber}`;
        await FeeReceipt.updateOne(
          { _id: receipt._id },
          { $set: { remarks: nextRemarks, installmentNumber } }
        );
        repaired += 1;
        changed.push({
          receiptNo: receipt.receiptNo,
          amountPaid: receipt.amountPaid,
          oldRemarks: receipt.remarks,
          newRemarks: nextRemarks,
          installmentNumber
        });
      }
    }
  }

  console.log(JSON.stringify({ checked, repaired, changed }, null, 2));
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {}
  process.exit(1);
});

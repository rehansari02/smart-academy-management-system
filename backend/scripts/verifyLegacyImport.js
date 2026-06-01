const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function parseCounts() {
  const file = path.resolve(__dirname, "..", "..", "exports", "_table_counts.csv");
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const parts = line.split(",").map((part) => part.replace(/^"|"$/g, ""));
      return { tableName: parts[1], rowCount: Number(parts[2]) };
    });
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  let mismatches = 0;
  for (const item of parseCounts()) {
    const actual = await mongoose.connection.db
      .collection("legacyexports")
      .countDocuments({ tableName: item.tableName });
    if (actual !== item.rowCount) {
      mismatches += 1;
      console.log(`${item.tableName}: expected ${item.rowCount}, archive ${actual}`);
    }
  }
  console.log(mismatches === 0 ? "legacy archive matches _table_counts for all tables" : `legacy archive mismatches: ${mismatches}`);

  for (const name of ["students", "courses", "feereceipts", "studentattendances", "inquiries", "users", "legacyexports"]) {
    const count = await mongoose.connection.db.collection(name).countDocuments();
    console.log(`${name}: ${count}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

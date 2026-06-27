/**
 * Migrate ALL data from Atlas → Local MongoDB
 * Atlas  : mongodb+srv://dpsonawane9723_admin:...@cluster0.n2h8r7f.mongodb.net/smartinstitute
 * Local  : mongodb://127.0.0.1:27017/education_erp
 */

const mongoose = require("mongoose");

const ATLAS_URI =
  "mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew.lbsfzqh.mongodb.net/?appName=Smartinstituenew";

const LOCAL_URI = "mongodb://127.0.0.1:27017/education_erp";

async function main() {
  console.log("Connecting to Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log("Connected to Atlas ✓");

  console.log("Connecting to Local...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log("Connected to Local ✓\n");

  const collections = await atlasConn.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in Atlas\n`);

  for (const col of collections) {
    const name = col.name;
    const atlasColl = atlasConn.db.collection(name);
    const localColl = localConn.db.collection(name);

    const docs = await atlasColl.find({}).toArray();
    if (docs.length === 0) {
      console.log(`${name}: 0 docs — skipped`);
      continue;
    }

    await localColl.deleteMany({});
    try {
      await localColl.dropIndexes();
    } catch (_) {}
    await localColl.insertMany(docs, { ordered: false });
    console.log(`${name}: ${docs.length} docs migrated ✓`);
  }

  console.log("\nMigration complete!");
  await atlasConn.close();
  await localConn.close();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

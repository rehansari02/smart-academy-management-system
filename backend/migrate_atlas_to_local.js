/**
 * migrate_atlas_to_local.js
 * 
 * Atlas se local MongoDB mein saara data copy karta hai.
 * Source  : mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew...
 * Target  : mongodb://localhost:27017/education_erp
 * 
 * Usage: node migrate_atlas_to_local.js
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI  = 'mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew.lbsfzqh.mongodb.net/?appName=Smartinstituenew';
const LOCAL_URI  = 'mongodb://localhost:27017/education_erp';

// Atlas pe default db name detect karte hain (agar URI mein nahi hai)
// Hum saari databases list karenge aur user ko batayenge

async function migrate() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          Atlas → Local MongoDB Migration Script          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let atlasClient, localClient;

  try {
    // ----- Connect to both -----
    console.log('🔗 Atlas se connect ho raha hoon...');
    atlasClient = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 30000 });
    await atlasClient.connect();
    console.log('✅ Atlas connected!\n');

    console.log('🔗 Local MongoDB se connect ho raha hoon...');
    localClient = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 10000 });
    await localClient.connect();
    console.log('✅ Local MongoDB connected!\n');

    // ----- List all DBs on Atlas -----
    const adminDb = atlasClient.db('admin');
    const { databases } = await adminDb.admin().listDatabases();

    // System DBs skip karte hain
    const skipDbs = ['admin', 'local', 'config'];
    const userDbs = databases.filter(d => !skipDbs.includes(d.name));

    if (userDbs.length === 0) {
      console.log('⚠️  Atlas pe koi user database nahi mili!');
      return;
    }

    console.log('📂 Atlas pe ye databases mili hain:');
    userDbs.forEach(d => console.log(`   • ${d.name}  (${(d.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`));
    console.log();

    // ----- Migrate each DB -----
    let totalCollections = 0;
    let totalDocuments   = 0;

    for (const dbInfo of userDbs) {
      const srcDb  = atlasClient.db(dbInfo.name);
      // Saara data local ke education_erp mein daal rahe hain
      const dstDb  = localClient.db('education_erp');

      const collections = await srcDb.listCollections().toArray();
      console.log(`\n📁 Database: "${dbInfo.name}"  →  local: "education_erp"`);
      console.log(`   Collections: ${collections.length}`);

      for (const colInfo of collections) {
        const colName = colInfo.name;
        const srcCol  = srcDb.collection(colName);
        const dstCol  = dstDb.collection(colName);

        const docs = await srcCol.find({}).toArray();
        const count = docs.length;

        if (count === 0) {
          console.log(`   ⏩ ${colName}: 0 documents — skipping`);
          continue;
        }

        // Drop existing local collection to avoid duplicates
        try { await dstCol.drop(); } catch (_) { /* ignore if not exists */ }

        // Insert in batches of 500
        const BATCH = 500;
        let inserted = 0;
        for (let i = 0; i < docs.length; i += BATCH) {
          const batch = docs.slice(i, i + BATCH);
          await dstCol.insertMany(batch, { ordered: false });
          inserted += batch.length;
        }

        console.log(`   ✅ ${colName}: ${inserted} documents copied`);
        totalCollections++;
        totalDocuments += inserted;
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  Migration Complete! 🎉                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n   Collections migrated : ${totalCollections}`);
    console.log(`   Total documents       : ${totalDocuments}`);
    console.log(`   Destination DB        : mongodb://localhost:27017/education_erp\n`);

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   → Local MongoDB chal nahi raha! "net start MongoDB" ya mongod chalao.');
    }
    process.exit(1);
  } finally {
    if (atlasClient) await atlasClient.close();
    if (localClient)  await localClient.close();
  }
}

migrate();

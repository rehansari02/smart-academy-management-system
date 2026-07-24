const { MongoClient } = require('mongoose').mongo;

const LOCAL_URI = 'mongodb://127.0.0.1:27017/education_erp';
const ATLAS_BASE_URI = 'mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew.lbsfzqh.mongodb.net/?appName=Smartinstituenew';

async function syncDatabases() {
  console.log('🚀 Starting MongoDB Atlas -> Local Database Sync Process...');

  let localClient, atlasClient;

  try {
    console.log('\n📡 Connecting to MongoDB Atlas Cluster...');
    atlasClient = await MongoClient.connect(ATLAS_BASE_URI);
    
    // List databases on Atlas
    const adminDb = atlasClient.db('admin').admin();
    const dbsList = await adminDb.listDatabases();
    console.log('📊 Databases found on Atlas:', dbsList.databases.map(d => `${d.name} (${(d.sizeOnDisk/1024/1024).toFixed(2)} MB)`));

    // Find database with collections (excluding admin, local, config)
    let targetDbName = 'education_erp';
    for (const dbInfo of dbsList.databases) {
      if (!['admin', 'local', 'config'].includes(dbInfo.name) && dbInfo.sizeOnDisk > 0) {
        targetDbName = dbInfo.name;
        break;
      }
    }

    console.log(`\n🎯 Selected Atlas Database to Copy: [ ${targetDbName} ]`);
    const atlasDb = atlasClient.db(targetDbName);

    // 2. Connect to Local MongoDB
    console.log('\n💻 Connecting to Local MongoDB (DESTINATION)...');
    localClient = await MongoClient.connect(LOCAL_URI);
    const localDb = localClient.db('education_erp');
    console.log('✅ Connected to Local MongoDB DB: education_erp');

    // 3. Clear all existing collections in Local Database
    console.log('\n🧹 Clearing existing collections in local education_erp...');
    const localCollections = await localDb.listCollections().toArray();
    for (const col of localCollections) {
      if (!col.name.startsWith('system.')) {
        await localDb.collection(col.name).drop();
        console.log(`   - Dropped local collection: ${col.name}`);
      }
    }

    // 4. Fetch all collections from Atlas targetDb
    console.log(`\n📥 Fetching collections from Atlas database [ ${targetDbName} ]...`);
    const atlasCollections = await atlasDb.listCollections().toArray();

    console.log(`📦 Found ${atlasCollections.length} collections on Atlas [ ${targetDbName} ]. Beginning copy...\n`);

    let totalDocsCopied = 0;

    for (const colInfo of atlasCollections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const atlasCol = atlasDb.collection(colName);
      const docs = await atlasCol.find({}).toArray();

      if (docs.length > 0) {
        const localCol = localDb.collection(colName);
        await localCol.insertMany(docs);
        totalDocsCopied += docs.length;
        console.log(`   ✅ Copied ${docs.length} documents for collection: [ ${colName} ]`);
      } else {
        console.log(`   ℹ️ Collection [ ${colName} ] is empty on Atlas. Created empty local collection.`);
        await localDb.createCollection(colName);
      }
    }

    console.log(`\n🎉 SUCCESS! Total ${totalDocsCopied} documents copied from Atlas [ ${targetDbName} ] to Local [ education_erp ].`);
    console.log('🔒 Atlas database remained 100% untouched & safe.');

  } catch (error) {
    console.error('\n❌ ERROR during database sync:', error);
  } finally {
    if (atlasClient) await atlasClient.close();
    if (localClient) await localClient.close();
    console.log('\n👋 Disconnected database clients. Sync finished.');
    process.exit(0);
  }
}

syncDatabases();

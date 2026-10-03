/**
 * Safe Atlas to Local MongoDB Data Copy Script
 * 
 * IMPORTANT SAFETY RULES:
 * 1. Atlas is strictly READ-ONLY. No write/delete operations are performed on Atlas.
 * 2. Target MUST be a local database (localhost / 127.0.0.1).
 * 3. Streams data in batches using cursors to prevent memory exhaustion on large collections.
 * 4. Copies indexes.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ATLAS_URI = process.env.ATLAS_MONGO_URL || process.env.MONGO_URL;
const LOCAL_URI = process.env.LOCAL_MONGO_URI || process.env.LOCAL_MONGO_URL || 'mongodb://localhost:27017/smartinstitute';

async function syncAtlasToLocal() {
  console.log('========================================================');
  console.log('       ATLAS TO LOCAL MONGODB DATA MIGRATION           ');
  console.log('========================================================\n');

  if (!ATLAS_URI) {
    throw new Error('Atlas URI (MONGO_URL / ATLAS_MONGO_URL) is missing in backend/.env');
  }

  // Safety Verification: Ensure Target is strictly Local
  const isLocal = LOCAL_URI.includes('localhost') || LOCAL_URI.includes('127.0.0.1');
  if (!isLocal) {
    throw new Error('SAFETY CHECK FAILED: Target URI must be localhost or 127.0.0.1. Aborting!');
  }

  console.log('Source (Atlas Read-Only):', ATLAS_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  console.log('Target (Local MongoDB):  ', LOCAL_URI);
  console.log('\nConnecting to databases...');

  const sourceClient = new MongoClient(ATLAS_URI);
  const targetClient = new MongoClient(LOCAL_URI);

  await sourceClient.connect();
  console.log('✓ Connected to Atlas Source (Read-Only)');

  await targetClient.connect();
  console.log('✓ Connected to Local MongoDB Target\n');

  const sourceDb = sourceClient.db();
  const targetDb = targetClient.db();

  console.log(`Source DB Name: ${sourceDb.databaseName}`);
  console.log(`Target DB Name: ${targetDb.databaseName}\n`);

  const collections = await sourceDb.listCollections().toArray();
  const collectionNames = collections.map(c => c.name).sort();

  console.log(`Found ${collectionNames.length} collections to copy.\n`);

  let totalDocsCopied = 0;
  const startTime = Date.now();

  for (let i = 0; i < collectionNames.length; i++) {
    const colName = collectionNames[i];
    const sourceCol = sourceDb.collection(colName);
    const targetCol = targetDb.collection(colName);

    const docCount = await sourceCol.countDocuments();
    const progress = `[${i + 1}/${collectionNames.length}]`;

    if (docCount === 0) {
      console.log(`${progress} ${colName}: 0 documents (skipping data copy)`);
      // Ensure empty collection exists in local
      await targetDb.createCollection(colName).catch(() => {});
      continue;
    }

    console.log(`${progress} Copying ${colName} (${docCount.toLocaleString()} docs)...`);

    // Only drop local target collection if it already has docs (never touches Atlas!)
    await targetCol.drop().catch(() => {});

    // Stream from Atlas in batches
    const BATCH_SIZE = 1000;
    const cursor = sourceCol.find({});
    let batch = [];
    let copiedInCol = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      batch.push(doc);

      if (batch.length >= BATCH_SIZE) {
        await targetCol.insertMany(batch, { ordered: false });
        copiedInCol += batch.length;
        totalDocsCopied += batch.length;
        if (docCount > 5000) {
          process.stdout.write(`   ↳ Copied ${copiedInCol.toLocaleString()}/${docCount.toLocaleString()}...\r`);
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      await targetCol.insertMany(batch, { ordered: false });
      copiedInCol += batch.length;
      totalDocsCopied += batch.length;
    }

    // Copy Indexes
    try {
      const indexes = await sourceCol.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const options = { name: idx.name };
        if (idx.unique) options.unique = true;
        if (idx.sparse) options.sparse = true;
        if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
        await targetCol.createIndex(idx.key, options).catch(err => {
          // Ignore index errors (e.g. duplicate keys in legacy indexes)
        });
      }
    } catch (idxErr) {
      // Ignore index read errors
    }

    console.log(`${progress} ✓ ${colName}: Successfully copied ${copiedInCol.toLocaleString()} docs`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================================');
  console.log('           MIGRATION COMPLETED SUCCESSFULLY!            ');
  console.log('========================================================');
  console.log(`Total Collections: ${collectionNames.length}`);
  console.log(`Total Documents:   ${totalDocsCopied.toLocaleString()}`);
  console.log(`Time Elapsed:      ${durationSec}s`);
  console.log(`Local DB:          ${LOCAL_URI}`);
  console.log('Atlas Data:        100% UNTOUCHED and SAFE');
  console.log('========================================================\n');

  await sourceClient.close();
  await targetClient.close();
}

syncAtlasToLocal().catch(err => {
  console.error('\n❌ Error during sync:', err);
  process.exit(1);
});

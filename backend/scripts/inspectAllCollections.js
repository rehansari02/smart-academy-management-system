const mongoose = require('mongoose');

async function inspectAllCollections() {
  await mongoose.connect('mongodb://127.0.0.1:27017/education_erp');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Local Collections count:', collections.length);

  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    if (col.name.toLowerCase().includes('course')) {
      console.log(`⭐ Collection: [ ${col.name} ] -> Count: ${count}`);
    }
  }

  process.exit(0);
}

inspectAllCollections();

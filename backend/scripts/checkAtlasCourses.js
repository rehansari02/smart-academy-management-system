const { MongoClient } = require('mongodb');

async function checkAtlasCourses() {
  const atlasUri = "mongodb+srv://stadma27_db_user:1zVxR6omFRZy1ipn@smartinstituenew.lbsfzqh.mongodb.net/?appName=Smartinstituenew";
  const client = new MongoClient(atlasUri);
  await client.connect();

  const db = client.db('test');
  const collections = await db.listCollections().toArray();
  console.log('Atlas Collections:');
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    if (c.name.toLowerCase().includes('course') || count > 0) {
      if (c.name.toLowerCase().includes('course')) {
        console.log(`⭐ Atlas Collection [ ${c.name} ] -> Count: ${count}`);
      }
    }
  }

  const courseDocs = await db.collection('courses').find({}).toArray();
  console.log('Atlas courses count:', courseDocs.length);
  if (courseDocs.length > 0) {
    console.log('First Course:', courseDocs[0]);
  }

  await client.close();
}

checkAtlasCourses();

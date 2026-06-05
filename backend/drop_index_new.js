const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    console.log('Connecting to:', mongoURI);
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    const emailIndexExists = indexes.find(idx => idx.name === 'email_1');

    if (emailIndexExists) {
      console.log('Dropping email_1 index in current database...');
      await collection.dropIndex('email_1');
      console.log('Successfully dropped email_1 index');
    } else {
      console.log('email_1 index does not exist in current database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error dropping index:', error);
    process.exit(1);
  }
};

dropIndex();

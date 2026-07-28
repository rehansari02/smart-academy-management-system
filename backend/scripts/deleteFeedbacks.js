const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Feedback = require('../models/Feedback');

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set in env');
    process.exit(1);
  }
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  const countBefore = await Feedback.countDocuments({});
  console.log(`Total feedback entries before deletion: ${countBefore}`);

  if (countBefore === 0) {
    console.log('No feedback entries to delete.');
    await mongoose.disconnect();
    return;
  }

  console.log('Deleting all feedback entries...');
  const result = await Feedback.deleteMany({});
  console.log(`Successfully deleted ${result.deletedCount} feedback entries.`);

  const countAfter = await Feedback.countDocuments({});
  console.log(`Total feedback entries after deletion: ${countAfter}`);

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log('Script execution finished successfully.');
  })
  .catch(async (error) => {
    console.error('Delete feedbacks failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });

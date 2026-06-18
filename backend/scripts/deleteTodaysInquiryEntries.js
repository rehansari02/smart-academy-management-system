const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');

const sources = ['Online', 'Walk-in', 'DSR'];

const buildTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/education_erp';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const todayRange = buildTodayRange();
  const query = {
    source: { $in: sources },
    isDeleted: false,
    $or: [
      { inquiryDate: todayRange },
      { followUpDate: todayRange },
      {
        followUpHistory: {
          $elemMatch: {
            activityType: 'followup',
            createdAt: todayRange
          }
        }
      }
    ]
  };

  const matched = await Inquiry.countDocuments(query);
  const sample = await Inquiry.find(query)
    .select('firstName middleName lastName source inquiryDate followUpDate referenceBy allocatedTo createdBy followUpHistory')
    .limit(20)
    .lean();

  console.log(`Matched inquiry rows for deletion: ${matched}`);
  if (sample.length) {
    console.log('Sample rows:');
    sample.forEach((item, index) => {
      const name = [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ').trim();
      const followupAt = item.followUpDate || item.followUpHistory?.find((row) => row.activityType === 'followup')?.createdAt || '-';
      console.log(`${index + 1}. ${name || '-'} | ${item.source || '-'} | inquiry=${item.inquiryDate || '-'} | followup=${followupAt}`);
    });
  }

  if (!matched) {
    console.log('Nothing to delete.');
    return;
  }

  const result = await Inquiry.updateMany(query, { $set: { isDeleted: true } });
  console.log(`Soft-deleted inquiries: ${result.modifiedCount || result.nModified || 0}`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Delete today inquiry entries failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exitCode = 1;
  });

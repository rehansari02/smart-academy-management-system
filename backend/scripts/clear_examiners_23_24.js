const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

require('../models/Course');
require('../models/Branch');
const ExamSchedule = require('../models/ExamSchedule');

async function clearExaminersFor23And24() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
    console.log('Connected to MongoDB successfully.');

    const schedules = await ExamSchedule.find({});
    console.log(`Found ${schedules.length} exam schedule documents.`);

    let updatedCount = 0;

    for (const schedule of schedules) {
      let modified = false;

      // Clear root examiner and alternateExaminer
      if (schedule.examiner || schedule.alternateExaminer) {
        schedule.examiner = null;
        schedule.alternateExaminer = null;
        modified = true;
      }

      // Clear branchExaminers entries for 23rd and 24th
      if (Array.isArray(schedule.branchExaminers) && schedule.branchExaminers.length > 0) {
        // Filter out or reset branchExaminers entries for 2026-07-23 and 2026-07-24
        schedule.branchExaminers = schedule.branchExaminers.map((b) => {
          if (!b.examDate || b.examDate === '2026-07-23' || b.examDate === '2026-07-24') {
            modified = true;
            return {
              ...b.toObject(),
              examiner: null,
              alternateExaminer: null
            };
          }
          return b;
        });
      }

      if (modified) {
        await schedule.save();
        updatedCount++;
      }
    }

    console.log('\n========================================');
    console.log(`SUCCESS: Cleared all examiners for 23rd & 24th across ${updatedCount} schedules!`);
    console.log('Available at: http://localhost:5173/master/exam-set');
    console.log('========================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error clearing examiners:', err);
    process.exit(1);
  }
}

clearExaminersFor23And24();

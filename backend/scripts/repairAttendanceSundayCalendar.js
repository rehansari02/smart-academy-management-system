require('dotenv').config();
const mongoose = require('mongoose');
const AttendanceCalendar = require('../models/AttendanceCalendar');

const getNearestSunday = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    let diff = 0;
    if (day === 1) diff = -1;
    else if (day === 2) diff = -2;
    else if (day === 3) diff = -3;
    else if (day === 4) diff = 3;  // Thursday goes to next Sunday (3 days away vs 4 days behind)
    else if (day === 5) diff = 2;  // Friday goes to next Sunday (2 days away vs 5 days behind)
    else if (day === 6) diff = 1;  // Saturday goes to next Sunday (1 day away vs 6 days behind)

    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

const run = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing');
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const records = await AttendanceCalendar.find({ type: 'Sunday' });
    console.log(`Total Sunday records found in database: ${records.length}`);

    let repairedCount = 0;

    for (const record of records) {
        const correctStart = getNearestSunday(record.startDate);
        const correctEnd = new Date(correctStart);
        correctEnd.setUTCHours(23, 59, 59, 999);

        const currentStartMs = record.startDate.getTime();
        const currentEndMs = record.endDate.getTime();
        const correctStartMs = correctStart.getTime();
        const correctEndMs = correctEnd.getTime();

        if (currentStartMs !== correctStartMs || currentEndMs !== correctEndMs) {
            console.log(`Repairing record ${record._id}:`);
            console.log(`  Current: [${record.startDate.toISOString()}] to [${record.endDate.toISOString()}]`);
            console.log(`  Correct: [${correctStart.toISOString()}] to [${correctEnd.toISOString()}]`);

            record.startDate = correctStart;
            record.endDate = correctEnd;
            record.title = 'Sunday';
            record.remarks = 'Auto Sunday holiday';
            record.isActive = true;

            await record.save();
            repairedCount++;
        }
    }

    console.log(`Successfully repaired ${repairedCount} records.`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Error running repair script:', error);
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {
        // Ignore disconnect failure during script exit.
    }
    process.exit(1);
});

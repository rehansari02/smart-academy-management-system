require('dotenv').config();
const mongoose = require('mongoose');
const AttendanceCalendar = require('../models/AttendanceCalendar');

const normalizeDateRange = (dateValue) => {
    const source = new Date(dateValue);
    const start = new Date(source.getFullYear(), source.getMonth(), source.getDate());
    start.setHours(0, 0, 0, 0);

    const end = new Date(source.getFullYear(), source.getMonth(), source.getDate());
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const needsRepair = (record) => {
    const { start, end } = normalizeDateRange(record.startDate);
    return record.startDate.getTime() !== start.getTime() || record.endDate.getTime() !== end.getTime();
};

const run = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing');
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const records = await AttendanceCalendar.find({ type: 'Sunday' }).sort({ startDate: 1 });
    const toRepair = records.filter(needsRepair);

    console.log(`Sunday records found: ${records.length}`);
    console.log(`Sunday records needing repair: ${toRepair.length}`);

    for (const record of toRepair) {
        const { start, end } = normalizeDateRange(record.startDate);
        record.startDate = start;
        record.endDate = end;
        record.title = record.title || 'Sunday';
        record.remarks = record.remarks || 'Auto Sunday holiday';
        record.isActive = record.isActive !== false;
        await record.save();
    }

    const after = await AttendanceCalendar.find({ type: 'Sunday' });
    const stillBad = after.filter(needsRepair);
    console.log(`Sunday records repaired: ${toRepair.length}`);
    console.log(`Sunday records still needing repair: ${stillBad.length}`);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error(error);
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {
        // Ignore disconnect failure during script exit.
    }
    process.exit(1);
});

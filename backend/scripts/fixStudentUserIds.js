const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Student = require('../models/Student');

// Load env vars from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const fixDuplicateUserIds = async () => {
    try {
        console.log('Connecting to database...');
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in environment variables');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        console.log('Searching for duplicate userIds in Students collection...');
        
        const duplicates = await Student.aggregate([
            { $match: { userId: { $ne: null }, isDeleted: false } },
            { $group: {
                _id: '$userId',
                count: { $sum: 1 },
                students: { $push: { id: '$_id', name: { $concat: ['$firstName', ' ', '$lastName'] }, regNo: '$regNo', enrollmentNo: '$enrollmentNo' } }
            }},
            { $match: { count: { $gt: 1 } } }
        ]);

        if (duplicates.length === 0) {
            console.log('No duplicate userIds found. Everything looks good!');
            process.exit(0);
        }

        console.log(`Found ${duplicates.length} duplicate userId groups.`);

        for (const group of duplicates) {
            console.log(`\nUserId: ${group._id}`);
            console.log(`Linked to ${group.count} students:`);
            
            // Keep the first student, clear userId for the others
            const [keep, ...others] = group.students;
            console.log(`  KEEPING link for: ${keep.name} (${keep.regNo || keep.enrollmentNo})`);
            
            for (const other of others) {
                console.log(`  CLEARING link for: ${other.name} (${other.regNo || other.enrollmentNo})`);
                await Student.findByIdAndUpdate(other.id, { $unset: { userId: 1 } });
            }
        }

        console.log('\nFinished fixing duplicates.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixDuplicateUserIds();

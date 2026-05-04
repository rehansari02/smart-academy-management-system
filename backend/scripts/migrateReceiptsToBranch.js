const mongoose = require('mongoose');
require('dotenv').config();

async function migrateReceipts() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/education_erp');
        console.log('Connected to MongoDB');

        const FeeReceipt = require('../models/FeeReceipt');
        const Student = require('../models/Student');
        const Branch = require('../models/Branch');

        const receipts = await FeeReceipt.find({ branch: null });
        console.log(`Found ${receipts.length} receipts with no branch assignment.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const receipt of receipts) {
            const student = await Student.findById(receipt.student);
            if (student && student.branchId) {
                receipt.branch = student.branchId;
                await receipt.save();
                updatedCount++;
            } else {
                skippedCount++;
                console.log(`Skipped receipt ${receipt.receiptNo} - Student branchId not found.`);
            }
        }

        console.log(`Migration Complete!`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped: ${skippedCount}`);

        process.exit();
    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
}

migrateReceipts();

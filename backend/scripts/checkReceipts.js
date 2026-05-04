const mongoose = require('mongoose');
require('dotenv').config();

async function checkReceipts() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/education_erp');
        console.log('Connected to MongoDB');

        const FeeReceipt = require('../models/FeeReceipt');
        const Branch = require('../models/Branch');

        const counts = await FeeReceipt.aggregate([
            { $group: { _id: '$branch', count: { $sum: 1 }, maxNo: { $max: { $toInt: "$receiptNo" } } } }
        ]);

        console.log('Receipt Counts by Branch ID:');
        for (const item of counts) {
            const branch = item._id ? await Branch.findById(item._id) : { name: 'NO BRANCH' };
            console.log(`Branch: ${branch?.name || 'Unknown'} (ID: ${item._id}) | Count: ${item.count} | Max Receipt No: ${item.maxNo}`);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReceipts();

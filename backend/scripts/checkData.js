const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Employee = require('../models/Employee');
        const User = require('../models/User');

        const oldEmployees = await Employee.find({ userAccount: { $exists: false } }).limit(5);
        console.log('Old Employees Sample (No userAccount):', JSON.stringify(oldEmployees, null, 2));

        const oldEmployeesWithUser = await Employee.find({ userAccount: { $exists: true, $ne: null } }).limit(5);
        console.log('Old Employees Sample (With userAccount):', JSON.stringify(oldEmployeesWithUser, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();

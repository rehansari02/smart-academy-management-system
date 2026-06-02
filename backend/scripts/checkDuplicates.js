const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Employee = require('../models/Employee');
        const User = require('../models/User');

        const employees = await Employee.find({});
        const emails = employees.map(e => e.email);
        const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);

        console.log('Duplicate Employee Emails:', duplicateEmails);

        const users = await User.find({});
        const userEmails = users.map(u => u.email).filter(e => e);
        const duplicateUserEmails = userEmails.filter((email, index) => userEmails.indexOf(email) !== index);
        console.log('Duplicate User Emails:', duplicateUserEmails);

        // Check if any employee email matches a user email (where userAccount is not linked)
        for (const emp of employees) {
            if (!emp.userAccount) {
                const userWithEmail = await User.findOne({ email: emp.email });
                if (userWithEmail) {
                    console.log(`Employee ${emp.name} (${emp.email}) has no userAccount but email exists in User collection (User ID: ${userWithEmail._id})`);
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDuplicates();

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const createSuperAdmin = async () => {
    await connectDB();

    const account = {
        name: 'Jayesh Patel',
        username: 'jayeshpatil0244',
        email: 'jayeshpatil0244@gmail.com',
        password: '@Joy2804',
        role: 'Super Admin',
        isActive: true
    };

    const existing = await User.findOne({
        $or: [
            { email: account.email },
            { username: account.username }
        ]
    });

    if (existing) {
        existing.name = account.name;
        existing.username = account.username;
        existing.email = account.email;
        existing.password = account.password;
        existing.role = account.role;
        existing.isActive = account.isActive;
        await existing.save();
        console.log('Super Admin updated:', existing.username);
        process.exit(0);
    }

    const user = await User.create(account);

    console.log('Super Admin created:', user.username);
    process.exit(0);
};

createSuperAdmin().catch(err => {
    console.error(err);
    process.exit(1);
});

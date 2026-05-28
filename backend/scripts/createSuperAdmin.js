require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const createSuperAdmin = async () => {
    await connectDB();

    await User.deleteOne({ username: '<your_username>' });

    const existing = await User.findOne({ role: 'Super Admin' });
    if (existing) {
        console.log('Super Admin already exists:', existing.username);
        process.exit(0);
    }

    const user = await User.create({
        name: 'Jayesh Patel',
        username: 'jaeysh12133',
        email: 'jayeshpatil0244@gmail.com',
        password: '@Joy2804',
        role: 'Super Admin',
        isActive: true
    });

    console.log('Super Admin created:', user.username);
    process.exit(0);
};

createSuperAdmin().catch(err => {
    console.error(err);
    process.exit(1);
});

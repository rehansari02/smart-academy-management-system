const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in HTTP-only cookie
    token = req.cookies.jwt;

    if (token) {
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token (exclude password)
            req.user = await User.findById(decoded.userId).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            next();
        } catch (error) {
            console.error(error);
            if (
                error instanceof mongoose.Error.MongooseServerSelectionError ||
                error.name === 'MongoServerSelectionError'
            ) {
                res.status(503);
                throw new Error('Database connection failed. Please check internet/DNS or MongoDB connection.');
            }
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    } else {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'Super Admin') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        } else {
            res.status(401);
            throw new Error('Not authorized');
        }
    };
};

module.exports = { protect, admin, checkRole };

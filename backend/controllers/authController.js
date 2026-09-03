const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
        jwtid: crypto.randomUUID()
    });
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: true, // Required for sameSite: 'None'
        sameSite: 'None', // Allows cross-origin cookies (e.g., localhost to remote API)
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
};

const getEffectiveBranchName = (user, fallback = 'Main Branch') => {
    if (user?.role === 'Super Admin') {
        return 'Head Office';
    }

    return user?.branchName || fallback;
};

// @desc Register (Seed Initial Admin)
// @route POST /api/auth/register
// @desc Register (Seed Initial Admin)
// @route POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
    const { name, username, password, role, branchId } = req.body;
    
    // Check if username already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('Username already taken');
    }

    // Prepare user data - explicitly exclude email if not provided to avoid null/unique index issues
    const userData = { name, username, password, role, branchId };
    
    // Remove undefined fields to prevent Mongoose from trying to set them to null/defaults if not intended
    Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);

    if (role === 'Super Admin') {
        userData.branchName = 'Head Office';
    }

    // FIX: Generate a unique placeholder email if not provided to avoid "duplicate key: email: null" error
    // This happens if the 'email' index is unique but not treating 'null' as distinct/sparse correctly in the DB.
    if (!userData.email) {
        userData.email = `${username.toLowerCase().replace(/\s+/g, '')}@admin.local`;
    }

    // Create user with username (email can be updated later via profile)
    const user = await User.create(userData);
    
    if (user) {
        generateToken(res, user._id);
        res.status(201).json({
            _id: user._id, 
            name: user.name, 
            username: user.username, 
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            branchName: getEffectiveBranchName(user),
            mobile: user.mobile,
            gender: user.gender,
            education: user.education,
            address: user.address,
            photo: user.photo
        });
    } else {
        res.status(400); throw new Error('Invalid user data');
    }
});

// @desc Login
// @route POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    
    let user;
    let studentProfile = null;

    // 1. If role is Student, first try to find by Enrollment Number or Registration Number
    if (role === 'Student') {
        const Student = require('../models/Student');
        const studentProfiles = await Student.find({
            $or: [
                { enrollmentNo: email },
                { regNo: email }
            ],
            isDeleted: false
        }).populate('userId');

        const linkedProfiles = studentProfiles.filter(profile => profile.userId);
        if (linkedProfiles.length === 1) {
            studentProfile = linkedProfiles[0];
            user = studentProfile.userId;
        } else if (linkedProfiles.length > 1) {
            // Enrollment numbers are branch-wise and can repeat. Resolve the
            // correct linked account with the submitted password instead of
            // letting findOne() select an arbitrary student's panel.
            const passwordMatches = [];
            for (const profile of linkedProfiles) {
                if (await profile.userId.matchPassword(password)) {
                    passwordMatches.push(profile);
                }
            }

            const exactRegistrationMatches = passwordMatches.filter(profile => profile.regNo === email);
            const resolvedProfile = exactRegistrationMatches[0]
                || (passwordMatches.length === 1 ? passwordMatches[0] : null);

            if (resolvedProfile) {
                studentProfile = resolvedProfile;
                user = resolvedProfile.userId;
            } else if (passwordMatches.length > 1) {
                res.status(409);
                throw new Error('This enrollment number exists in multiple branches. Please use your registration number or login username.');
            }
        }
    }

    // 2. If not found via student profile (or not a student), try finding by User model (email/username)
    if (!user) {
        user = await User.findOne({ 
            $or: [
                { email: email }, 
                { username: email }
            ] 
        });
    }

    // 3. Fallback: Try Employee lookup for legacy employees (imported without User links)
    if (!user) {
        const Employee = require('../models/Employee');
        const employee = await Employee.findOne({
            $or: [
                { loginUsername: email },
                { email: email }
            ],
            isDeleted: false
        });

        if (employee) {
            // Try to find linked user by userAccount
            if (employee.userAccount) {
                user = await User.findById(employee.userAccount);
            }

            // Try to find user by loginUsername (legacy username)
            if (!user && employee.loginUsername) {
                user = await User.findOne({ username: employee.loginUsername });
            }

            // If user found but employee not linked, fix the link for future lookups
            if (user && !employee.userAccount) {
                employee.userAccount = user._id;
                await employee.save();
            }

            // --- AUTO-CREATE USER ACCOUNT for legacy employees who have NO User at all ---
            if (!user) {
                // Auto-generate a username from email prefix, mobile, or a fallback
                const generatedUsername = employee.loginUsername ||
                    (employee.email ? employee.email.split('@')[0] : null) ||
                    employee.mobile ||
                    `emp_${employee._id}`;

                const defaultPassword = employee.mobile || 'smart@123';

                // Resolve branch name if branchId is set
                let branchName = 'Main';
                if (employee.branchId) {
                    try {
                        const branch = await require('../models/Branch').findById(employee.branchId);
                        if (branch) branchName = branch.name;
                    } catch (e) { /* ignore branch lookup errors */ }
                }

                try {
                    const newUser = await User.create({
                        name: employee.name,
                        username: generatedUsername,
                        email: employee.email || `${generatedUsername}@employee.local`,
                        password: defaultPassword,
                        role: employee.type || 'Faculty',
                        isActive: true,
                        mobile: employee.mobile,
                        gender: employee.gender,
                        address: employee.address,
                        education: employee.education || employee.qualification,
                        branchId: employee.branchId,
                        branchName: branchName,
                    });

                    // Link the employee to the new User
                    employee.userAccount = newUser._id;
                    if (!employee.loginUsername) {
                        employee.loginUsername = generatedUsername;
                    }
                    await employee.save();

                    user = newUser;
                } catch (createError) {
                    console.error('[Auth] Failed to auto-create User for legacy employee:', createError.message);
                    // If creation fails (e.g. duplicate username), try to find by the generated username
                    if (createError.code === 11000 && createError.keyPattern?.username) {
                        user = await User.findOne({ username: generatedUsername });
                    }
                }
            }
        }
    }

    if (user && (await user.matchPassword(password))) {
        // Enforce Role Check if provided (Security Level)
        if (role && user.role !== role) {
            res.status(401);
            throw new Error(`Access Denied: You are not authorized as ${role}`);
        }

        generateToken(res, user._id);
        
        // Populate branch details if user has a branch
        const populatedUser = await User.findById(user._id).populate('branchId', 'name shortCode address phone mobile email city state');

        // Check if branch name needs sync (Self-Correction on Login)
        let currentBranchName = getEffectiveBranchName(user);
        if (user.role === 'Super Admin') {
            if (user.branchName !== 'Head Office') {
                user.branchName = 'Head Office';
                await user.save();
            }
        } else if (populatedUser.branchId) {
            currentBranchName = populatedUser.branchId.name;
            // Optional: Persist correction if mismatch found (Slows login slightly but ensures consistency)
            if (user.branchName !== currentBranchName) {
                user.branchName = currentBranchName;
                await user.save();
            }
        }

        // --- Self-Healing: Fix swapped Email/Username for Employees ---
        // If User.email doesn't look like an email but looks like a username, 
        // and we have a linked Employee with a real email, swap/fix it.
        if (user.role !== 'Student' && user.email && !user.email.includes('@')) {
             const employee = await require('../models/Employee').findOne({ userAccount: user._id });
             if (employee && employee.email) {
                 // The current 'email' field in User is actually the username
                 user.username = user.email; 
                 user.email = employee.email;
                 await user.save();
             }
        }
        // --- Student Specific Data Sync ---
        // If role is Student, fetch details from Student model to ensure we have the latest profile info
        if (user.role === 'Student') {
             // If we already fetched it during login identification, use it, otherwise fetch now
             if (!studentProfile) {
                studentProfile = await require('../models/Student').findOne({ userId: user._id }).populate('course');
             } else if (!studentProfile.course) {
                // If we fetched it earlier but didn't populate course, populate it now
                await studentProfile.populate('course');
             }

             if (studentProfile) {
                 let userNeedsUpdate = false;
                 // Prioritize Student Profile data if User data is empty
                 if (!user.mobile && (studentProfile.mobileStudent || studentProfile.mobileParent)) {
                     user.mobile = studentProfile.mobileStudent || studentProfile.mobileParent;
                     userNeedsUpdate = true;
                 }
                 if (!user.gender && studentProfile.gender) {
                     user.gender = studentProfile.gender;
                     userNeedsUpdate = true;
                 }
                 if (!user.address && studentProfile.address) {
                     user.address = [studentProfile.address, studentProfile.city, studentProfile.state].filter(Boolean).join(', ');
                     userNeedsUpdate = true;
                 }
                 if (!user.education) {
                     const education = studentProfile.education || (studentProfile.course ? studentProfile.course.name : '');
                     if (education) {
                         user.education = education;
                         userNeedsUpdate = true;
                     }
                 }
                 if (userNeedsUpdate) {
                     await user.save();
                 }
             }
        }        // ----------------------------------

        res.json({
            _id: user._id, 
            name: user.name, 
            username: user.username,
            email: user.email, 
            role: user.role,
            branchId: user.branchId,
            branchName: currentBranchName, // Return fresh name
            branchDetails: populatedUser.branchId, // This will contain the populated branch object
            mobile: user.mobile,
            gender: user.gender,
            education: user.education,
            address: user.address,
            photo: user.photo
        });
    } else {
        res.status(401); throw new Error('Invalid email or password');
    }
});

// @desc Logout
// @route POST /api/auth/logout
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'None', 
        expires: new Date(0) 
    });
    res.status(200).json({ message: 'Logged out' });
});

// @desc Update User Profile
// @route PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.mobile = req.body.mobile || user.mobile;
        
        // Handle Email Update
        user.email = req.body.email || user.email;

        // Handle Username Update (New Feature)
        if (req.body.username && req.body.username !== user.username) {
            const usernameExists = await User.findOne({ username: req.body.username });
            if (usernameExists) {
                res.status(400);
                throw new Error('Username already taken');
            }
            user.username = req.body.username;
        }

        user.gender = req.body.gender || user.gender;
        user.education = req.body.education || user.education;
        user.address = req.body.address || user.address;

        if (user.role === 'Super Admin') {
            user.branchName = 'Head Office';
        } else {
            user.branchName = req.body.branchName || user.branchName;
            user.branchId = req.body.branchId || user.branchId;
        }

        if (req.file) {
            user.photo = req.file.path.replace(/\\/g, "/");
        }

        const updatedUser = await user.save();

        // --- Sync with Employee Record ---
        // Find employee linked to this user
        const employee = await require('../models/Employee').findOne({ userAccount: user._id });
        if (employee) {
            employee.name = user.name;
            employee.email = user.email; 
            employee.mobile = user.mobile;
            employee.gender = user.gender;
            employee.address = user.address;
            employee.branchId = user.branchId; 
            employee.qualification = user.education;
            employee.education = user.education; 
            
            if (req.file) {
                employee.photo = user.photo;
            }
            await employee.save();
        }
        // ---------------------------------

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username, // Include updated username
            email: updatedUser.email,
            role: updatedUser.role,
            mobile: updatedUser.mobile,
            gender: updatedUser.gender,
            education: updatedUser.education,
            address: updatedUser.address,
            branchName: getEffectiveBranchName(updatedUser),
            photo: updatedUser.photo,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc Reset Password
// @route PUT /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(oldPassword))) {
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(401);
        throw new Error('Invalid old password');
    }
});

// @desc Check if username is available
// @route GET /api/auth/check-username/:username
const checkUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const userExists = await User.findOne({ username });
    res.json({ available: !userExists });
});

module.exports = { registerUser, loginUser, logoutUser, updateProfile, resetPassword, checkUsername };

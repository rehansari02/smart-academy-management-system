const Employee = require('../models/Employee');
const User = require('../models/User');
const sendSMS = require('../utils/smsSender');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const enrichEmployeesWithUserAccounts = async (employees) => {
    // Only fix employees who have a populated userAccount._id (actual DB link)
    // Do NOT match by loginUsername — that causes false display of same username
    // for multiple employees who don't actually have linked User accounts.
    return employees.map((employee) => {
        // If employee already has a properly linked userAccount from populate, keep it
        if (employee.userAccount && typeof employee.userAccount === 'object' && employee.userAccount._id) {
            return employee;
        }
        // If employee has no linked userAccount, don't try to fake one
        return employee;
    });
};

// @desc    Get Employees with Filters
const getEmployees = asyncHandler(async (req, res) => {
    const { joiningFrom, joiningTo, gender, employeeStatus, searchBy, searchValue } = req.query;
    
    let query = { isDeleted: false };

    // Employee Master explicitly opts in to inactive records. All operational
    // selectors should only receive active employees.
    if (employeeStatus === 'Active') {
        query.isActive = true;
    } else if (employeeStatus === 'Inactive') {
        query.isActive = false;
    } else if (req.query.includeInactive !== 'true') {
        query.isActive = true;
    }
    
    // 1. Date Range Filter (Joining Date)
    if (joiningFrom && joiningTo) {
        // Set time to start of day for 'from' and end of day for 'to'
        const startDate = new Date(joiningFrom);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(joiningTo);
        endDate.setHours(23, 59, 59, 999);

        query.dateOfJoining = { 
            $gte: startDate, 
            $lte: endDate 
        };
    }

    // 2. Gender Filter
    if (gender && gender !== 'All') {
        query.gender = gender;
    }
    
    // 3. Dynamic Search (Name, Email, Mobile)
    if (searchBy && searchValue) {
        const regex = { $regex: searchValue, $options: 'i' }; // Case-insensitive
        
        if (searchBy === 'name') {
            query.name = regex;
        } else if (searchBy === 'email') {
            query.email = regex;
        } else if (searchBy === 'mobile') {
            query.mobile = regex;
        }
    }

    // 4. Branch Restriction for Non-Super Admins
    if (req.user && req.user.role !== 'Super Admin' && req.user.branchId) {
        query.branchId = req.user.branchId;
    }
    // Allow manual filter if Super Admin wants to see specific branch
    if (req.user && req.user.role === 'Super Admin' && req.query.branchId) {
        query.branchId = req.query.branchId;
    }

    const employees = await Employee.find(query)
        .populate('branchId', 'name shortCode')
        .populate('userAccount', 'username')
        .sort({ createdAt: -1 });

    const enrichedEmployees = await enrichEmployeesWithUserAccounts(employees.map((employee) => employee.toObject()));

    res.json(enrichedEmployees);
});

// @desc    Create Employee
const createEmployee = asyncHandler(async (req, res) => {
    console.log("--- [Debug] createEmployee Started ---");
    console.log("Req Body Keys:", Object.keys(req.body));
    console.log("Req Body:", JSON.stringify({ ...req.body, loginPassword: '***' }, null, 2));
    if (req.file) console.log("Req File:", req.file);
    console.log("User making request:", req.user ? { id: req.user._id, role: req.user.role, branchId: req.user.branchId } : 'No user');

    const { 
        name, email, mobile, gender, type, 
        loginUsername, loginPassword, isLoginActive 
    } = req.body;

    // Validate required fields
    const requiredFields = ['name', 'email', 'mobile', 'gender', 'type'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        console.log("[Debug] Missing required fields:", missingFields);
        res.status(400); 
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (req.file) {
        req.body.photo = req.file.path.replace(/\\/g, "/");
    }

    const empExists = await Employee.findOne({ email });
    if (empExists) {
        console.log("[Debug] Employee email already exists:", email);
        res.status(400); throw new Error('Employee with this email already exists');
    }

    // Sanitize branchId - empty string causes CastError
    if (req.body.branchId === '') {
        delete req.body.branchId;
    }

    // Fetch Branch Name if ID is provided
    // Fetch Branch Name if ID is provided OR if User is Branch Director
    let branchNameParam = 'Main';
    
    // Auto-assign Branch for Branch Directors/Admins
    if(req.user && (req.user.role === 'Branch Director' || req.user.role === 'Branch Admin') && req.user.branchId) {
        req.body.branchId = req.user.branchId;
    }

    if(req.body.branchId) {
        console.log("[Debug] Fetching Branch for ID:", req.body.branchId);
        const branchTry = await require('../models/Branch').findById(req.body.branchId);
        if(branchTry) {
            branchNameParam = branchTry.name;
            console.log("[Debug] Branch Found:", branchNameParam);
        } else {
            console.log("[Debug] Branch ID provided but not found in DB");
        }
    }

    let userId = null;

    if (loginUsername && loginPassword) {
        const userExists = await User.findOne({ username: loginUsername });
        if (userExists) {
            res.status(400); throw new Error(`User Login '${loginUsername}' already exists.`);
        }

        try {
            const newUser = await User.create({
                name,
                username: loginUsername, // Set Username
                email: email, // Set Real Email
                password: loginPassword,
                role: type,
                isActive: isLoginActive,
                // Populate profile fields from Employee data
                mobile, 
                gender,
                address: req.body.address,
                education: req.body.qualification, // Mapping qualification to education
                branchId: req.body.branchId, // <--- Propagate branchId to User
                branchName: branchNameParam // Set correct branch name
            });
            userId = newUser._id;
            console.log("[Debug] User Account Created. ID:", userId);
        } catch (error) {
            console.error("[Debug] User Creation Error:", error);
            if (error.code === 11000) {
                if (error.keyPattern && error.keyPattern.email) {
                    res.status(400); throw new Error('A user account with this email already exists. Please use a different email.');
                }
                if (error.keyPattern && error.keyPattern.username) {
                    res.status(400); throw new Error('A user account with this username already exists. Please try a different username.');
                }
            }
            res.status(400); throw new Error('User Login Error: ' + error.message);
        }
    }

    try {
        // Generate regNo if not provided (optional - can be removed if not needed)
        if (!req.body.regNo) {
            const lastEmployee = await Employee.findOne({ regNo: { $exists: true, $ne: null } }, { regNo: 1 }).sort({ createdAt: -1 });
            let nextNum = 1;
            if (lastEmployee && lastEmployee.regNo) {
                const match = lastEmployee.regNo.match(/\d+$/);
                if (match) {
                    nextNum = parseInt(match[0], 10) + 1;
                } else {
                    nextNum = (await Employee.countDocuments()) + 1;
                }
            } else {
                nextNum = (await Employee.countDocuments()) + 1;
            }
            
            let generatedRegNo = `EMP${String(nextNum).padStart(4, '0')}`;
            // Ensure no duplicate key error even if records were deleted
            while (await Employee.findOne({ regNo: generatedRegNo })) {
                nextNum++;
                generatedRegNo = `EMP${String(nextNum).padStart(4, '0')}`;
            }
            req.body.regNo = generatedRegNo;
        }

        const employee = await Employee.create({
            ...req.body,
            userAccount: userId
        });
        console.log("[Debug] Employee Created. ID:", employee._id);

        if (userId && loginUsername) {
             const message = `Dear, ${name}. Your Registration process has been successfully completed. User ID-${loginUsername}, Password-${loginPassword}, smart institute.`;
             sendSMS(mobile, message, 'General');
        }

        // Populate branchId for the immediate response
        const populatedEmployee = await Employee.findById(employee._id)
            .populate('branchId', 'name shortCode')
            .populate('userAccount', 'username');

        res.status(201).json(populatedEmployee);

    } catch (error) {
        console.error("[Debug] Employee Creation Failed:", error);
        console.error("[Debug] Error Details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        if(userId) {
            console.log("[Debug] Rolling back User Account:", userId);
            await User.findByIdAndDelete(userId);
        }
        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.email) {
                res.status(400); throw new Error('Employee with this email already exists');
            }
            if (error.keyPattern && error.keyPattern.regNo) {
                res.status(400); throw new Error('A registration conflict occurred. Please try again.');
            }
        }
        res.status(400); throw new Error(error.message);
    }
});

// @desc    Update Employee
const updateEmployee = asyncHandler(async (req, res) => {
    console.log("--- [Debug] updateEmployee Started ---");
    console.log("ID:", req.params.id);
    console.log("Req Body Keys:", Object.keys(req.body));

    const { id } = req.params;
    const { 
        name, type, isLoginActive, loginPassword, loginUsername, email, mobile
    } = req.body;

    // Sanitize branchId - empty string or invalid string can cause CastError
    if (req.body.branchId === '' || req.body.branchId === 'undefined' || req.body.branchId === 'null') {
        delete req.body.branchId;
        req.body.branchId = null;
    } else if (req.body.branchId && !mongoose.Types.ObjectId.isValid(req.body.branchId)) {
        console.log("[Debug] Invalid branchId provided:", req.body.branchId);
        delete req.body.branchId;
    }

    if (req.file) {
        req.body.photo = req.file.path.replace(/\\/g, "/");
    }

    const employee = await Employee.findById(id);

    if (!employee) {
        res.status(404); throw new Error('Employee not found');
    }

    if (employee.userAccount) {
        let user = await User.findById(employee.userAccount);

        // If the linked User was deleted, clear the reference so the
        // !employee.userAccount block below handles User creation/update properly
        if (!user) {
            employee.userAccount = null;
        } else {
            // User exists — update credentials
            // Update username if provided and changed — with duplicate check
            if (loginUsername && loginUsername !== user.username) {
                const usernameExists = await User.findOne({
                    username: loginUsername,
                    _id: { $ne: user._id }
                });
                if (usernameExists) {
                    res.status(400);
                    throw new Error(`Username '${loginUsername}' is already taken.`);
                }
                user.username = loginUsername;
            }

            if (loginPassword && loginPassword.trim() !== '') {
                user.password = loginPassword;
            }

            if (name !== undefined) user.name = name;
            if (type !== undefined) user.role = type || user.role;
            if (isLoginActive !== undefined) user.isActive = isLoginActive;

            // Handle Email Conflict gracefully during update
            const newEmail = req.body.email || employee.email;
            if (newEmail && newEmail !== user.email) {
                const emailExists = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
                if (!emailExists) {
                    user.email = newEmail;
                } else {
                    console.log(`[Debug] Email conflict for ${newEmail}, skipping email update for User account`);
                }
            }

            await user.save();
        }
    }

    // Create or re-create User for employees WITHOUT userAccount
    // Handles: only password provided, only username provided, or both
    if (!employee.userAccount) {
        const hasLoginCredential = loginUsername || (loginPassword && loginPassword.trim() !== '');

        if (hasLoginCredential) {
            // Auto-generate username from employee data if not provided
            let effectiveUsername = loginUsername || 
                (employee.email ? employee.email.split('@')[0] : null) ||
                employee.mobile ||
                `emp_${employee._id}`;

            // Ensure the auto-generated username is unique — append numbers if taken
            // NEVER auto-link to another employee's User account
            let userExists = await User.findOne({ username: effectiveUsername });
            if (userExists) {
                if (loginUsername) {
                    // Admin explicitly typed this username — it's taken, throw error
                    res.status(400);
                    throw new Error(`Username '${loginUsername}' is already taken.`);
                }
                // Auto-generated username is taken — append random suffix to make it unique
                const randomSuffix = Math.floor(100 + Math.random() * 900);
                effectiveUsername = `${effectiveUsername}${randomSuffix}`;
                // Double-check the new one is also unique (very unlikely to collide)
                while (await User.findOne({ username: effectiveUsername })) {
                    effectiveUsername = `${effectiveUsername}${Math.floor(Math.random() * 10)}`;
                }
            }

            const effectivePassword = (loginPassword && loginPassword.trim() !== '') 
                ? loginPassword 
                : (employee.mobile || 'smart@123');

            // Handle Email Conflict gracefully during creation
            let effectiveEmail = req.body.email || employee.email;
            if (effectiveEmail) {
                const emailExists = await User.findOne({ email: effectiveEmail });
                if (emailExists) {
                    console.log(`[Debug] Email conflict for ${effectiveEmail}, creating user WITHOUT email`);
                    effectiveEmail = undefined; // Don't set email if it's already taken
                }
            }

            const newUser = await User.create({
                name: name || employee.name,
                username: effectiveUsername,
                email: effectiveEmail,
                password: effectivePassword,
                role: type || employee.type,
                isActive: isLoginActive !== undefined ? isLoginActive : employee.isLoginActive,
                mobile: req.body.mobile || employee.mobile,
                gender: req.body.gender || employee.gender,
                address: req.body.address || employee.address,
                education: req.body.qualification || employee.qualification || employee.education,
                branchId: req.body.branchId || employee.branchId,
            });

            employee.userAccount = newUser._id;

            // Send SMS with login credentials
            const smsMobile = req.body.mobile || employee.mobile;
            if (smsMobile && effectivePassword) {
                const message = `Dear, ${name || employee.name}. Your Registration process has been successfully completed. User ID-${effectiveUsername}, Password-${effectivePassword}, smart institute.`;
                sendSMS(smsMobile, message, 'General');
            }
        }
    }

    // Update employee using save() — use validateModifiedOnly so old invalid data
    // from CSV import (e.g. gender='M', type mismatch) doesn't block valid updates
    Object.keys(req.body).forEach(key => {
        // Prevent updating immutable fields if any, or _id
        if (key !== '_id' && key !== 'userAccount' && key !== 'createdAt' && key !== 'updatedAt') {
            employee[key] = req.body[key];
        }
    });

    // Explicitly set type if provided
    if (type) employee.type = type;

    const updatedEmployee = await employee.save({ validateModifiedOnly: true });

    // Re-fetch to populate
    const populatedEmployee = await Employee.findById(updatedEmployee._id)
        .populate('branchId', 'name shortCode')
        .populate('userAccount', 'username');

    res.json(populatedEmployee);
});

// @desc    Delete Employee
// @desc    Delete Employee Permanently
const deleteEmployee = asyncHandler(async (req, res) => {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (employee) {
        if(employee.userAccount) {
            await User.findByIdAndDelete(employee.userAccount);
        }
        res.json({ id: req.params.id, message: 'Employee Removed Permanently' });
    } else {
        res.status(404); throw new Error('Employee not found');
    }
});

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee };

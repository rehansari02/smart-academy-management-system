const Employee = require('../models/Employee');
const User = require('../models/User');
const sendSMS = require('../utils/smsSender');
const asyncHandler = require('express-async-handler');

// @desc    Get Employees with Filters
const getEmployees = asyncHandler(async (req, res) => {
    const { joiningFrom, joiningTo, gender, searchBy, searchValue } = req.query;
    
    let query = { isDeleted: false };
    
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

    const employees = await Employee.find(query).populate('branchId', 'name shortCode').populate('userAccount', 'username').sort({ createdAt: -1 });
    res.json(employees);
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
        req.body.photo = req.file.path;
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
            res.status(400); throw new Error('User Login Error: ' + error.message);
        }
    }

    try {
        // Generate regNo if not provided (optional - can be removed if not needed)
        if (!req.body.regNo) {
            const count = await Employee.countDocuments();
            req.body.regNo = `EMP${String(count + 1).padStart(4, '0')}`;
        }

        const employee = await Employee.create({
            ...req.body,
            userAccount: userId
        });
        console.log("[Debug] Employee Created. ID:", employee._id);

        if (userId && loginUsername) {
             const message = `Dear, ${name}. Your Registration process has been successfully completed. User ID-${loginUsername}, Password-${loginPassword}, smart institute.`;
             sendSMS(mobile, message);
        }

        // Populate branchId for the immediate response
        const populatedEmployee = await Employee.findById(employee._id).populate('branchId', 'name shortCode');

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
        res.status(400); throw new Error(error.message);
    }
});

// @desc    Update Employee
const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
        name, type, isLoginActive, loginPassword 
    } = req.body;

    if (req.file) {
        req.body.photo = req.file.path;
    }

    const employee = await Employee.findById(id);

    if (!employee) {
        res.status(404); throw new Error('Employee not found');
    }

    if (employee.userAccount) {
        const userUpdate = { name, role: type, isActive: isLoginActive };
        if (loginPassword && loginPassword.trim() !== '') {
            const user = await User.findById(employee.userAccount);
            if(user) {
                user.password = loginPassword;
                user.name = name;
                user.role = type;
                user.isActive = isLoginActive;
                await user.save();
            }
        } else {
            await User.findByIdAndUpdate(employee.userAccount, userUpdate);
        }
    }

    // Update employee using save() to ensure all hooks/types run correctly
    // We already fetched 'employee' above
    Object.keys(req.body).forEach(key => {
        // Prevent updating immutable fields if any, or _id
        if (key !== '_id' && key !== 'userAccount' && key !== 'createdAt' && key !== 'updatedAt') {
            employee[key] = req.body[key];
        }
    });

    // Explicitly set type if provided
    if (type) employee.type = type;

    const updatedEmployee = await employee.save();

    // Re-fetch to populate
    const populatedEmployee = await Employee.findById(updatedEmployee._id)
        .populate('branchId', 'name shortCode');

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
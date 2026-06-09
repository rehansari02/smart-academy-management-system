const asyncHandler = require('express-async-handler');
const Branch = require('../models/Branch');
const User = require('../models/User');
const UserRight = require('../models/UserRight');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

const getDirectorLoginEmail = (directorUsername) => `${String(directorUsername).trim().toLowerCase()}@branch.local`;

const BRANCH_DIRECTOR_FULL_PERMISSION_PAGES = [
    'Admin Home',
    'Dashboard',
    'Banner Home',
    'Home Sub-Sections',
    'Gallery Manage',
    'Gallery',
    'Admin Home - Inquiry List',
    'Admin Home - Online Admissions',
    'Admin Home - Exam Pending List',
    'Reference Incentive',
    'Student',
    'Employee',
    'Branch',
    'Batch',
    'Course',
    'Subject',
    'Exam Request List',
    'Exam Schedule',
    'Exam Result',
    'User Rights',
    'Material',
    'Free Learning',
    'Manage News',
    'Topper Result',
    'Our Team',
    'Inquiry - Online',
    'Inquiry - Offline',
    'Inquiry - DSR',
    'Visitors - Todays Visitors List',
    'Visitors - Activity Visitor Report',
    'Visitors - Visitors',
    'Admission',
    'Pending Admission Fees',
    'Pending Student Registration',
    'Student Cancellation',
    'Fees Receipt',
    'Expenses',
    'Attendance - Manage Attendance',
    'Attendance - Student Attendance',
    'Attendance - Employee Attendance',
    'Ledger',
    'Monthly Report - Student Wise Outstanding',
    'Monthly Report - Student Following Report',
    'Monthly Report - Datewise OutStanding For Students',
    'Attendance - Student Attendance Report',
    'Attendance - Employee Attendance Report',
    'General Report - Admission Form',
    'General Report - Student Completion Report',
    'General Report - Student Contact Report',
    'General Report - Student Registration Report',
    'General Report - Batch Wise Register',
    'Exam Report - Time Table',
    'Exam Report - Certificate Issue Register',
    'Exam Report - Final Result Details',
    'Manage Blogs',
    'Video Call',
    'Feedback & Support',
    'Manage Contacts',
    'Complain Box',
    'Location',
    'Manage Terms',
    'Cloudinary Management',
    'SMS Station'
];

const buildFullBranchDirectorPermissions = () => (
    [...new Set(BRANCH_DIRECTOR_FULL_PERMISSION_PAGES)].map(page => ({
        page,
        view: true,
        add: page === 'Dashboard' ? false : true,
        edit: page === 'Dashboard' ? false : true,
        delete: page === 'Dashboard' ? false : true
    }))
);

const grantFullBranchDirectorRights = async (userId) => {
    if (!userId) return;

    await UserRight.findOneAndUpdate(
        { user: userId },
        { $set: { permissions: buildFullBranchDirectorPermissions() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const updateDirectorLogin = async ({ employee, branch, directorUsername, directorPassword }) => {
    const username = String(directorUsername || '').trim();
    const password = String(directorPassword || '');

    if (!username || !password) {
        const error = new Error('Director username and password are required');
        error.statusCode = 400;
        throw error;
    }

    const existingUsernameUser = await User.findOne({
        username,
        ...(employee.userAccount ? { _id: { $ne: employee.userAccount } } : {})
    });

    if (existingUsernameUser) {
        const error = new Error('Director username is already used by another user');
        error.statusCode = 400;
        throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let userId = employee.userAccount;

    if (userId) {
        await User.findByIdAndUpdate(employee.userAccount, {
            username,
            password: hashedPassword,
            role: 'Branch Director',
            branchId: branch._id,
            branchName: branch.name,
            isActive: true
        });
    } else {
        const newUser = await User.create({
            name: employee.name,
            username,
            email: getDirectorLoginEmail(username),
            password,
            role: 'Branch Director',
            isActive: true,
            mobile: employee.mobile,
            branchId: branch._id,
            branchName: branch.name
        });
        userId = newUser._id;
        employee.userAccount = userId;
    }

    employee.type = 'Branch Director';
    employee.branchId = branch._id;
    employee.loginUsername = username;
    employee.isLoginActive = true;
    await employee.save();
    return userId;
};

// @desc    Create a new branch
// @route   POST /api/branches
// @access  Private/Super Admin
const createBranch = asyncHandler(async (req, res) => {
    const { name, shortCode, phone, mobile, email, address, city, state, isActive, 
            branchDirector, directorUsername, directorPassword } = req.body;

    // Check if branch already exists
    const branchExists = await Branch.findOne({ $or: [{ name }, { shortCode }] });

    if (branchExists) {
        res.status(400);
        throw new Error('Branch with this name or short code already exists');
    }

    // Create the branch first to get the ID
    const branch = await Branch.create({
        name,
        shortCode,
        phone,
        mobile,
        email,
        address,
        city,
        state,
        isActive: isActive === undefined ? true : isActive,
        branchDirector: branchDirector || null,
        directorUsername: directorUsername || null,
        directorPassword: directorPassword || null // Store plain text password in Branch for display
    });

    // Handle branch director credential creation/update
    if (branch && branchDirector && directorUsername && directorPassword) {
        // Verify employee exists
        const employee = await Employee.findById(branchDirector);
        if (!employee) {
            // If employee not found, we still have the branch but we should probably log this
            console.error(`Employee ${branchDirector} not found during branch creation`);
        } else {
            try {
                const directorUserId = await updateDirectorLogin({ employee, branch, directorUsername, directorPassword });
                await grantFullBranchDirectorRights(directorUserId);
            } catch (error) {
                if (error.statusCode) res.status(error.statusCode);
                throw error;
            }
        }
    }

    if (branch) {
        const popBranch = await Branch.findById(branch._id).populate('branchDirector', 'name email mobile');
        res.status(201).json(popBranch);
    } else {
        res.status(400);
        throw new Error('Invalid branch data');
    }
});

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private/Super Admin (or authorized)
const getBranches = asyncHandler(async (req, res) => {
    const branches = await Branch.find({})
        .populate('branchDirector', 'name email mobile')
        .sort({ createdAt: -1 });
    res.json(branches);
});

// @desc    Get all active branches for public view
// @route   GET /api/branches/public
// @access  Public
const getPublicBranches = asyncHandler(async (req, res) => {
    const branches = await Branch.find({ isActive: true }).select('-createdAt -updatedAt -__v').sort({ state: 1, city: 1 });
    res.json(branches);
});

// @desc    Get branch by ID
// @route   GET /api/branches/:id
// @access  Private
const getBranchById = asyncHandler(async (req, res) => {
    const branch = await Branch.findById(req.params.id);

    if (branch) {
        res.json(branch);
    } else {
        res.status(404);
        throw new Error('Branch not found');
    }
});

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private/Super Admin
const updateBranch = asyncHandler(async (req, res) => {
    const branch = await Branch.findById(req.params.id);

    if (branch) {
        const { name, shortCode, phone, mobile, email, address, city, state } = req.body;

        if (!name || !String(name).trim()) {
            res.status(400);
            throw new Error('Please add a branch name');
        }
        if (!shortCode || !String(shortCode).trim()) {
            res.status(400);
            throw new Error('Please add a short code');
        }
        if (!mobile || !String(mobile).trim()) {
            res.status(400);
            throw new Error('Please add a mobile number');
        }
        if (!email || !String(email).trim()) {
            res.status(400);
            throw new Error('Please add an email');
        }
        if (!address || !String(address).trim()) {
            res.status(400);
            throw new Error('Please add an address');
        }
        if (!city || !String(city).trim()) {
            res.status(400);
            throw new Error('Please add a city');
        }
        if (!state || !String(state).trim()) {
            res.status(400);
            throw new Error('Please add a state');
        }

        const duplicateBranch = await Branch.findOne({
            _id: { $ne: branch._id },
            $or: [
                { name: String(name).trim() },
                { shortCode: String(shortCode).trim().toUpperCase() }
            ]
        });

        if (duplicateBranch) {
            res.status(400);
            throw new Error('Branch with this name or short code already exists');
        }

        branch.name = String(name).trim();
        branch.shortCode = String(shortCode).trim().toUpperCase();
        branch.phone = phone !== undefined ? String(phone).trim() : '';
        branch.mobile = String(mobile).trim();
        branch.email = String(email).trim();
        branch.address = String(address).trim();
        branch.city = String(city).trim();
        branch.state = String(state).trim();
        
        if (req.body.isActive !== undefined) {
            branch.isActive = req.body.isActive;
        }

        // Handle branch director updates
        if (req.body.branchDirector !== undefined) {
            const { branchDirector, directorUsername, directorPassword } = req.body;
            
            if (branchDirector && directorUsername && directorPassword) {
                // Verify employee exists
                const employee = await Employee.findById(branchDirector);
                if (!employee) {
                    res.status(400);
                    throw new Error('Selected employee not found');
                }

                try {
                    const directorUserId = await updateDirectorLogin({ employee, branch, directorUsername, directorPassword });
                    await grantFullBranchDirectorRights(directorUserId);
                } catch (error) {
                    if (error.statusCode) res.status(error.statusCode);
                    throw error;
                }

                branch.branchDirector = branchDirector;
                branch.directorUsername = String(directorUsername).trim();
                branch.directorPassword = directorPassword; // Store plain text password in Branch for display
            } else if (!branchDirector) {
                // Clear director if branchDirector is null or empty
                branch.branchDirector = null;
                branch.directorUsername = null;
                branch.directorPassword = null;
            }
            // Note: If branchDirector is provided but username/password are missing, 
            // we don't clear the director yet, as the user might be editing other fields.
            // But usually the frontend should ensure these are provided if a director is selected.
        }

        const updatedBranch = await branch.save();

        // Populate after save
        const popUpdatedBranch = await Branch.findById(updatedBranch._id).populate('branchDirector', 'name email mobile');

        // Sync branchName updates to related collections (User, Student)
        // Employee does not hold branchName string, only branchId, so no sync needed there.
        if (req.body.name) {
            await User.updateMany(
                { branchId: updatedBranch._id },
                { $set: { branchName: updatedBranch.name } }
            );
            await Student.updateMany(
                { branchId: updatedBranch._id },
                { $set: { branchName: updatedBranch.name } }
            );
        }

        res.json(popUpdatedBranch);
    } else {
        res.status(404);
        throw new Error('Branch not found');
    }
});

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private/Super Admin
const deleteBranch = asyncHandler(async (req, res) => {
    const branch = await Branch.findById(req.params.id);

    if (branch) {
        await branch.deleteOne();
        res.json({ message: 'Branch removed' });
    } else {
        res.status(404);
        throw new Error('Branch not found');
    }
});

// @desc    Get all active employees for director selection
// @route   GET /api/branches/employees/list
// @access  Private
const getAllEmployees = asyncHandler(async (req, res) => {
    const employees = await Employee.find({ 
        isDeleted: false,
        isActive: true
    }).select('_id name email mobile type');
    
    res.json(employees);
});

module.exports = {
    createBranch,
    getBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    getPublicBranches,
    getAllEmployees
};

const asyncHandler = require('express-async-handler');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

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
            // Hash the director password for User authentication
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(directorPassword, salt);

            // Update OR create employee's User account with new director credentials
            if (employee.userAccount) {
                await User.findByIdAndUpdate(employee.userAccount, {
                    username: directorUsername,
                    password: hashedPassword,
                    role: 'Branch Director',
                    branchId: branch._id,
                    branchName: branch.name,
                    isActive: true
                });
            } else {
                // Create a new User account if the employee doesn't have one
                const newUser = await User.create({
                    name: employee.name,
                    username: directorUsername,
                    email: employee.email || `${directorUsername}@branch.local`,
                    password: directorPassword, // pre('save') hook will hash this
                    role: 'Branch Director',
                    isActive: true,
                    mobile: employee.mobile,
                    branchId: branch._id,
                    branchName: branch.name
                });
                employee.userAccount = newUser._id;
            }

            // Update employee record thoroughly
            employee.type = 'Branch Director';
            employee.branchId = branch._id;
            employee.loginUsername = directorUsername;
            employee.isLoginActive = true;
            await employee.save();
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
        branch.name = req.body.name || branch.name;
        branch.shortCode = req.body.shortCode || branch.shortCode;
        branch.phone = req.body.phone || branch.phone;
        branch.mobile = req.body.mobile || branch.mobile;
        branch.email = req.body.email || branch.email;
        branch.address = req.body.address || branch.address;
        branch.city = req.body.city || branch.city;
        branch.state = req.body.state || branch.state;
        
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

                // Hash the director password for User authentication
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(directorPassword, salt);

                // Update OR create employee's User account with new director credentials
                if (employee.userAccount) {
                    await User.findByIdAndUpdate(employee.userAccount, {
                        username: directorUsername,
                        password: hashedPassword,
                        role: 'Branch Director',
                        branchId: branch._id,
                        branchName: branch.name,
                        isActive: true
                    });
                } else {
                    // Create a new User account if the employee doesn't have one
                    const newUser = await User.create({
                        name: employee.name,
                        username: directorUsername,
                        email: employee.email || `${directorUsername}@branch.local`,
                        password: directorPassword, // pre('save') hook will hash this
                        role: 'Branch Director',
                        isActive: true,
                        mobile: employee.mobile,
                        branchId: branch._id,
                        branchName: branch.name
                    });
                    employee.userAccount = newUser._id;
                }

                // Update employee record thoroughly
                employee.type = 'Branch Director';
                employee.branchId = branch._id;
                employee.loginUsername = directorUsername;
                employee.isLoginActive = true;
                await employee.save();

                branch.branchDirector = branchDirector;
                branch.directorUsername = directorUsername;
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

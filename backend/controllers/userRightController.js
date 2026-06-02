const asyncHandler = require('express-async-handler');
const UserRight = require('../models/UserRight');
const User = require('../models/User');
const Employee = require('../models/Employee');

const UserRightTemplate = require('../models/UserRightTemplate');

const normalizePermissionFlags = (permission = {}) => {
    const view = Boolean(permission.view);
    const add = Boolean(permission.add);
    const edit = Boolean(permission.edit);
    const del = Boolean(permission.delete);

    return {
        view: view || add || edit || del,
        add: add || edit || del,
        edit: edit || del,
        delete: del,
    };
};

const resolveUserFromTargetId = async (targetId) => {
    if (!targetId) return null;

    const directUser = await User.findById(targetId).select('_id').lean();
    if (directUser) return directUser;

    const employee = await Employee.findById(targetId).select('userAccount loginUsername email name mobile').lean();
    if (!employee) return null;

    if (employee.userAccount) {
        const linkedUser = await User.findById(employee.userAccount).select('_id').lean();
        if (linkedUser) return linkedUser;
    }

    const usernameCandidates = [employee.loginUsername, employee.email, employee.mobile, employee.name]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    for (const candidate of usernameCandidates) {
        const user = await User.findOne({
            $or: [
                { username: candidate },
                { email: candidate },
                { mobile: candidate },
                { name: candidate },
            ]
        }).select('_id').lean();

        if (user) return user;
    }

    return null;
};

// @desc    Get User Rights by User ID
// @route   GET /api/user-rights/:userId
// @access  Private/Admin
const getUserRights = asyncHandler(async (req, res) => {
    const user = await resolveUserFromTargetId(req.params.userId);
    if (!user) {
        res.status(404);
        throw new Error('Linked user account not found');
    }

    const rights = await UserRight.findOne({ user: user._id });
    if (rights) {
        res.json(rights);
    } else {
        // Return default empty structure if no rights exist yet
        res.json({ user: user._id, permissions: [] });
    }
});

// @desc    Update or Create User Rights
// @route   POST /api/user-rights
// @access  Private/Admin
const saveUserRights = asyncHandler(async (req, res) => {
    const { userId, employeeId, permissions } = req.body;
    const targetId = userId || employeeId;

    if (!targetId) {
        res.status(400);
        throw new Error('Employee or user account is required to save rights');
    }

    const user = await resolveUserFromTargetId(targetId);
    if (!user) {
        res.status(404);
        throw new Error('Linked user account not found');
    }

    const normalizedPermissions = Array.isArray(permissions)
        ? permissions
            .filter((permission) => permission && permission.page)
      .map((permission) => ({
                  page: String(permission.page).trim(),
                  ...normalizePermissionFlags(permission),
              }))
        : [];

    let rights = await UserRight.findOne({ user: user._id });

    if (rights) {
        rights.permissions = normalizedPermissions;
        const updatedRights = await rights.save();
        res.json(updatedRights);
    } else {
        rights = await UserRight.create({
            user: user._id,
            permissions: normalizedPermissions
        });
        res.status(201).json(rights);
    }
});

// @desc    Get Current User's Permissions (For Frontend State)
// @route   GET /api/user-rights/me
// @access  Private
const getMyRights = asyncHandler(async (req, res) => {
    const rights = await UserRight.findOne({ user: req.user._id });
    res.json(rights ? rights.permissions : []);
});

// @desc    Get All Templates
// @route   GET /api/user-rights/templates
// @access  Private/Admin
const getTemplates = asyncHandler(async (req, res) => {
    const templates = await UserRightTemplate.find({});
    res.json(templates);
});

// @desc    Create New Template
// @route   POST /api/user-rights/templates
// @access  Private/Admin
const createTemplate = asyncHandler(async (req, res) => {
    const { name, permissions } = req.body;

    const templateExists = await UserRightTemplate.findOne({ name });
    if (templateExists) {
        res.status(400);
        throw new Error('Template with this name already exists');
    }

    const template = await UserRightTemplate.create({
        name,
        permissions: Array.isArray(permissions)
            ? permissions
                .filter((permission) => permission && permission.page)
                .map((permission) => ({
                    page: String(permission.page).trim(),
                    ...normalizePermissionFlags(permission),
                }))
            : []
    });

    res.status(201).json(template);
});

// @desc    Delete Template
// @route   DELETE /api/user-rights/templates/:id
// @access  Private/Admin
const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await UserRightTemplate.findById(req.params.id);

    if (template) {
        await template.deleteOne();
        res.json({ message: 'Template removed' });
    } else {
        res.status(404);
        throw new Error('Template not found');
    }
});

module.exports = { 
    getUserRights, 
    saveUserRights, 
    getMyRights,
    getTemplates,
    createTemplate,
    deleteTemplate
};

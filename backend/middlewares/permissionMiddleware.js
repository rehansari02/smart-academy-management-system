const asyncHandler = require('express-async-handler');
const UserRight = require('../models/UserRight');

const checkPermission = (page, action) => asyncHandler(async (req, res, next) => {
    // Super Admin has all access
    if (req.user && req.user.role === 'Super Admin') {
        return next();
    }

    const userRights = await UserRight.findOne({ user: req.user._id });

    if (!userRights) {
        res.status(403);
        throw new Error('Access denied. No permissions assigned.');
    }

    // Generic Check
    const pagePermission = userRights.permissions.find(p => p.page === page);

    if (pagePermission && pagePermission[action]) {
        return next();
    }

    // --- Special Dependency Cases ---
    
    // 1. "Inquiry" covers sub-pages like "Inquiry - Online", etc.
    if (page === 'Inquiry') {
        const hasAnyInquiryRight = userRights.permissions.some(p => 
            (p.page.startsWith('Inquiry - ') ||
             p.page === 'Admin Home - Inquiry List' ||
             p.page === 'Admin Home - Online Admissions') &&
            p[action] === true
        );
        if (hasAnyInquiryRight) {
            return next();
        }
    }

    // 2. "Employee" & "Student" view rights are often needed as dependencies for dropdowns/searches
    // if a user has access to Transaction pages or certain Master pages.
    if (action === 'view' && (page === 'Employee' || page === 'Student')) {
        const dependencyPages = [
            'Inquiry', 'Fees Receipt', 'Expenses', 'Batch', 
            'Attendance', 'Exam Request', 'Exam Schedule', 'Exam Result',
            'Admission', 'Registration', 'Visitor'
        ];
        
        const hasDependencyRight = userRights.permissions.some(p => 
            dependencyPages.some(dep => p.page.includes(dep)) && p.view === true
        );
        
        if (hasDependencyRight) {
            return next();
        }
    }

    res.status(403);
    throw new Error(`Access denied. You do not have permission to ${action} ${page}.`);
});

module.exports = { checkPermission };

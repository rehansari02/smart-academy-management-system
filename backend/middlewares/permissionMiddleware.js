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
            'Admission', 'Registration', 'Visitor', 'Syllabus Management', 'Teacher Subject Management'
        ];
        
        const hasDependencyRight = userRights.permissions.some(p => 
            dependencyPages.some(dep => p.page.includes(dep)) && p.view === true
        );
        
        if (hasDependencyRight) {
            return next();
        }
    }

    // 3. Admission/registration forms need batch list as a dropdown dependency.
    if (action === 'view' && page === 'Batch') {
        const hasAdmissionDependency = userRights.permissions.some(p =>
            ['Admission', 'Registration', 'Syllabus Management', 'Teacher Subject Management'].some(dep => p.page.includes(dep)) &&
            p.view === true
        );

        if (hasAdmissionDependency) {
            return next();
        }
    }

    // 4. "Subject" edit is permitted if user has edit rights for "Syllabus Management"
    if (page === 'Subject' && action === 'edit') {
        const syllabusPermission = userRights.permissions.find(p => p.page === 'Syllabus Management');
        if (syllabusPermission && syllabusPermission.edit === true) {
            // Check if teacher is assigned to this subject
            const Employee = require('../models/Employee');
            const TeacherSubjectAccess = require('../models/TeacherSubjectAccess');

            const employee = await Employee.findOne({ userAccount: req.user._id });
            if (employee) {
                const subjectId = req.params.id;
                const assignment = await TeacherSubjectAccess.findOne({
                    employeeId: employee._id,
                    'assignments.subjectId': subjectId
                });

                if (!assignment) {
                    res.status(403);
                    throw new Error('Access denied. You are not assigned to manage the syllabus for this subject.');
                }
            }
            return next();
        }
    }

    // 5. "Teacher Subject Management" can fall back to "Syllabus Management" rights
    if (page === 'Teacher Subject Management') {
        const syllabusPermission = userRights.permissions.find(p => p.page === 'Syllabus Management');
        if (syllabusPermission && syllabusPermission[action] === true) {
            return next();
        }
    }

    res.status(403);
    throw new Error(`Access denied. You do not have permission to ${action} ${page}.`);
});

module.exports = { checkPermission };

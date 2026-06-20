const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Employee = require('../models/Employee');
const Subject = require('../models/Subject');
const Student = require('../models/Student'); // Imported Student model for aggregation
const Reference = require('../models/Reference');
const Education = require('../models/Education');
const EmployeeRole = require('../models/EmployeeRole');
const Exam = require('../models/Exam');
const PopularCourse = require('../models/PopularCourse');
const PopularCategory = require('../models/PopularCategory');
const asyncHandler = require('express-async-handler');

const DEFAULT_EMPLOYEE_ROLES = ['Faculty', 'Manager', 'Marketing Person', 'Branch Director', 'Receptionist', 'Other'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const feeFields = ['courseFees', 'admissionFees', 'registrationFees', 'monthlyFees', 'totalInstallment'];

const toNumberOrDefault = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getFeeSnapshot = (source = {}) => ({
    courseFees: toNumberOrDefault(source.courseFees, 0),
    admissionFees: toNumberOrDefault(source.admissionFees, 0),
    registrationFees: toNumberOrDefault(source.registrationFees, 0),
    monthlyFees: toNumberOrDefault(source.monthlyFees, 0),
    totalInstallment: toNumberOrDefault(source.totalInstallment, 1)
});

const feeSnapshotChanged = (current = {}, next = {}) => feeFields.some((field) => {
    const currentValue = toNumberOrDefault(current[field], field === 'totalInstallment' ? 1 : 0);
    const nextValue = toNumberOrDefault(next[field], field === 'totalInstallment' ? 1 : 0);
    return currentValue !== nextValue;
});

const buildFeeHistoryEntry = (snapshot, effectiveFrom, note = '') => ({
    ...snapshot,
    effectiveFrom,
    effectiveTo: null,
    changedAt: effectiveFrom,
    note
});

// --- COURSE CONTROLLERS ---
const getCourses = asyncHandler(async (req, res) => {
    const { courseId, courseType } = req.query;
    let query = { isDeleted: false };
    
    if (courseId) query._id = courseId;
    if (courseType) query.courseType = courseType;

    const courses = await Course.find(query)
        .populate({
            path: 'subjects.subject',
            select: 'name printedName theoryMarks practicalMarks totalMarks'
        })
        .sort({ sorting: 1, createdAt: -1 })
        .lean();

    // Get all popular course IDs to mark them in the response
    const popularCourseDocs = await PopularCourse.find({}).select('course').lean();
    const popularCourseIds = new Set(popularCourseDocs.map(p => p.course.toString()));

    const result = courses.map(course => ({
        ...course,
        isPopular: popularCourseIds.has(course._id.toString())
    }));

    res.json(result);
});

const createCourse = asyncHandler(async (req, res) => {
    const data = { ...req.body };
    if (req.file) {
        data.image = req.file.path.replace(/\\/g, "/");
    }
    
    // Parse subjects if it comes as a string (from FormData)
    if (data.subjects && typeof data.subjects === 'string') {
        try {
            data.subjects = JSON.parse(data.subjects);
        } catch (e) {
            console.error("Error parsing subjects", e);
            data.subjects = [];
        }
    }

    const feeSnapshot = getFeeSnapshot(data);
    const now = new Date();
    data.courseFees = feeSnapshot.courseFees;
    data.admissionFees = feeSnapshot.admissionFees;
    data.registrationFees = feeSnapshot.registrationFees;
    data.monthlyFees = feeSnapshot.monthlyFees;
    data.totalInstallment = feeSnapshot.totalInstallment;
    data.feeHistory = [buildFeeHistoryEntry(feeSnapshot, now, 'Initial course fee setup')];

    const course = await Course.create(data);
    res.status(201).json(course);
});

const updateCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (course) {
        const data = { ...req.body };
        if (req.file) {
            data.image = req.file.path.replace(/\\/g, "/");
        }

        // Parse subjects if it comes as a string
        if (data.subjects && typeof data.subjects === 'string') {
            try {
                data.subjects = JSON.parse(data.subjects);
            } catch (e) {
                console.error("Error parsing subjects", e);
                // Keep existing subjects if parse fails or handle error?
                // Better to just not update subjects if parse fails in this context or set empty
                // But usually it should work.
                delete data.subjects; 
            }
        }

        const currentSnapshot = getFeeSnapshot(course);
        const incomingSnapshot = getFeeSnapshot({ ...course.toObject(), ...data });
        const hasFeeChange = feeSnapshotChanged(currentSnapshot, incomingSnapshot);
        const now = new Date();

        course.set(data);
        course.courseFees = incomingSnapshot.courseFees;
        course.admissionFees = incomingSnapshot.admissionFees;
        course.registrationFees = incomingSnapshot.registrationFees;
        course.monthlyFees = incomingSnapshot.monthlyFees;
        course.totalInstallment = incomingSnapshot.totalInstallment;

        if (hasFeeChange) {
            const history = Array.isArray(course.feeHistory) ? [...course.feeHistory] : [];
            const lastEntry = history[history.length - 1];

            if (lastEntry && !lastEntry.effectiveTo) {
                lastEntry.effectiveTo = now;
            } else if (!history.length) {
                history.push(buildFeeHistoryEntry(currentSnapshot, course.createdAt || now, 'Initial course fee setup'));
                history[0].effectiveTo = now;
            }

            history.push(buildFeeHistoryEntry(incomingSnapshot, now, 'Course fee updated'));
            course.feeHistory = history;
        }

        const updatedCourse = await course.save();
        await updatedCourse.populate({
            path: 'subjects.subject',
            select: 'name printedName theoryMarks practicalMarks totalMarks'
        });
        res.json(updatedCourse);
    } else {
        res.status(404); throw new Error('Course not found');
    }
});

const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (course) {
        res.json({ id: req.params.id, message: 'Course removed permanently' });
    } else {
        res.status(404); throw new Error('Course not found');
    }
});

// --- BATCH CONTROLLERS ---
const getBatches = asyncHandler(async (req, res) => {
    const { startDate, endDate, searchBy, searchValue } = req.query;
    let query = { isDeleted: false };
    if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate) };
        query.endDate = { $lte: new Date(endDate) };
    }
    if (searchBy && searchValue) {
        if (searchBy === 'Batch Name') {
            query.name = { $regex: searchValue, $options: 'i' };
        } else if (searchBy === 'Faculty Name') {
            const employees = await Employee.find({
                name: { $regex: searchValue, $options: 'i' },
                isDeleted: false,
                isActive: true
            }).select('_id');
            const empIds = employees.map(e => e._id);
            query.faculty = { $in: empIds };
        }
    }

    // Filter by Branch if provided by Super Admin, otherwise enforce user's branch.
    if (req.query.branchId && req.user?.role === 'Super Admin') {
        query.branchId = req.query.branchId;
    } else if (req.user?.role !== 'Super Admin' && req.user?.branchId) {
        query.branchId = req.user.branchId;
    }

    // 1. Fetch Batches (Use .lean() to get plain JS objects for modification)
    const batches = await Batch.find(query)
        .populate('courses', 'name')
        .populate('faculty', 'name')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 })
        .lean();

    // 2. Aggregate Active Students Count Grouped by Batch and Course
    const stats = await Student.aggregate([
        { $match: { isDeleted: false, isActive: true } }, // Only active students
        { $group: { _id: { batch: "$batch", course: "$course" }, count: { $sum: 1 } } }
    ]);

    // 3. Map Stats for Easy Lookup: { "BatchName": { "CourseID": Count, ... }, ... }
    const batchStats = {};
    stats.forEach(s => {
        const bName = s._id.batch;
        const cId = s._id.course ? s._id.course.toString() : 'unknown';
        
        if (!batchStats[bName]) batchStats[bName] = {};
        batchStats[bName][cId] = s.count;
    });

    // 4. Attach Course-Specific Counts to Each Batch
    const result = batches.map(b => ({
        ...b,
        // b.courseCounts[courseId] will give the count of active students for that course in this batch
        courseCounts: batchStats[b.name] || {} 
    }));

    res.json(result);
});

const createBatch = asyncHandler(async (req, res) => {
    const data = { ...req.body };
    // If user is restricted branch user, enforce their branch
    if (req.user && (req.user.role === 'Branch Director' || req.user.role === 'Branch Admin') && req.user.branchId) {
        data.branchId = req.user.branchId;
    }
    const batch = await Batch.create(data);
    res.status(201).json(batch);
});

const updateBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    if (batch) {
        const updatedBatch = await Batch.findByIdAndUpdate(id, req.body, { new: true })
            .populate('courses', 'name')
            .populate('faculty', 'name');
        res.json(updatedBatch);
    } else {
        res.status(404); throw new Error('Batch not found');
    }
});

const deleteBatch = asyncHandler(async (req, res) => {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (batch) {
        res.json({ id: req.params.id, message: 'Batch removed permanently' });
    } else {
        res.status(404); throw new Error('Batch not found');
    }
});

// --- SUBJECT CONTROLLERS ---
const getSubjects = asyncHandler(async (req, res) => {
    const { searchBy, searchValue } = req.query;
    let query = { isDeleted: false };
    if (searchBy && searchValue) {
        if (searchBy === 'Subject Name') {
            query.name = { $regex: searchValue, $options: 'i' };
        } else if (searchBy === 'Printed Name') {
            query.printedName = { $regex: searchValue, $options: 'i' };
        }
    }
    const subjects = await Subject.find(query).sort({ createdAt: -1 });
    res.json(subjects);
});

const createSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
});

const updateSubject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    if (subject) {
        const updatedSubject = await Subject.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedSubject);
    } else {
        res.status(404); throw new Error('Subject not found');
    }
});

const deleteSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (subject) {
        res.json({ id: req.params.id, message: 'Subject Removed Permanently' });
    } else {
        res.status(404); throw new Error('Subject not found');
    }
});

// --- EMPLOYEE HELPERS ---
const createEmployee = asyncHandler(async (req, res) => {
    const emp = await Employee.create(req.body);
    res.status(201).json(emp);
});

const getEmployees = asyncHandler(async (req, res) => {
    const emps = await Employee.find({ isDeleted: false, isActive: true });
    res.json(emps);
});

const getPublicEmployeeReferences = asyncHandler(async (req, res) => {
    const employees = await Employee.find({ isDeleted: false, isActive: true })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

    res.json(employees);
});

// --- REFERENCE CONTROLLERS ---
const getReferences = asyncHandler(async (req, res) => {
    const references = await Reference.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json(references);
});

const createReference = asyncHandler(async (req, res) => {
    const reference = await Reference.create(req.body);
    res.status(201).json(reference);
});

// --- EDUCATION CONTROLLERS ---
const getEducations = asyncHandler(async (req, res) => {
    const educations = await Education.find({ isDeleted: false }).sort({ name: 1 });
    res.json(educations);
});

const createEducation = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const exists = await Education.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, isDeleted: false });
    if (exists) {
        res.status(400); throw new Error('Education type already exists');
    }
    const education = await Education.create({ name });
    res.status(201).json(education);
});

// --- EMPLOYEE ROLE CONTROLLERS ---
const ensureDefaultEmployeeRoles = async () => {
    const count = await EmployeeRole.countDocuments({});
    if (count > 0) return;

    await EmployeeRole.insertMany(
        DEFAULT_EMPLOYEE_ROLES.map((name) => ({ name })),
        { ordered: false }
    ).catch(() => {});
};

const getEmployeeRoles = asyncHandler(async (req, res) => {
    await ensureDefaultEmployeeRoles();
    const roles = await EmployeeRole.find({ isDeleted: false }).sort({ name: 1 });
    res.json(roles);
});

const createEmployeeRole = asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) {
        res.status(400);
        throw new Error('Role name is required');
    }

    const exists = await EmployeeRole.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
        isDeleted: false
    });
    if (exists) {
        res.status(400);
        throw new Error('Role already exists');
    }

    const role = await EmployeeRole.create({ name });
    res.status(201).json(role);
});

const updateEmployeeRole = asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) {
        res.status(400);
        throw new Error('Role name is required');
    }

    const role = await EmployeeRole.findOne({ _id: req.params.id, isDeleted: false });
    if (!role) {
        res.status(404);
        throw new Error('Role not found');
    }

    const exists = await EmployeeRole.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
        isDeleted: false
    });
    if (exists) {
        res.status(400);
        throw new Error('Role already exists');
    }

    role.name = name;
    const updatedRole = await role.save();
    res.json(updatedRole);
});

const deleteEmployeeRole = asyncHandler(async (req, res) => {
    const role = await EmployeeRole.findOne({ _id: req.params.id, isDeleted: false });
    if (!role) {
        res.status(404);
        throw new Error('Role not found');
    }

    role.isDeleted = true;
    await role.save();
    res.json({ id: req.params.id, message: 'Role Deleted Successfully' });
});

// --- EXAM NAME MASTER CONTROLLERS ---
const getExams = asyncHandler(async (req, res) => {
    const exams = await Exam.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json(exams);
});

const createExam = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Exam name is required');
    }
    const exists = await Exam.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, isDeleted: false });
    if (exists) {
        res.status(400);
        throw new Error('Exam name already exists');
    }
    const exam = await Exam.create({ name: name.trim() });
    res.status(201).json(exam);
});

// @desc    Update Exam Name
// @route   PUT /api/master/exam-name/:id
const updateExam = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Exam name not found');
    }
    if (name) {
        const exists = await Exam.findOne({
            _id: { $ne: req.params.id },
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            isDeleted: false
        });
        if (exists) {
            res.status(400);
            throw new Error('Exam name already exists');
        }
        exam.name = name.trim();
    }
    const updated = await exam.save();
    res.json(updated);
});

// @desc    Delete Exam Name
// @route   DELETE /api/master/exam-name/:id
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Exam name not found');
    }
    exam.isDeleted = true;
    await exam.save();
    res.json({ id: req.params.id, message: 'Exam Name Deleted Successfully' });
});

// --- POPULAR CATEGORY CONTROLLERS ---
const getPopularCategories = asyncHandler(async (req, res) => {
    const categories = await PopularCategory.find().sort({ sortOrder: 1, name: 1 });
    res.json(categories);
});

const createPopularCategory = asyncHandler(async (req, res) => {
    const { name, sortOrder, isActive } = req.body;
    const exists = await PopularCategory.findOne({ name });
    if (exists) {
        res.status(400);
        throw new Error('Category already exists');
    }
    const category = await PopularCategory.create({ name, sortOrder, isActive });
    res.status(201).json(category);
});

const updatePopularCategory = asyncHandler(async (req, res) => {
    const category = await PopularCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.json(category);
});

const deletePopularCategory = asyncHandler(async (req, res) => {
    // Check if category has courses
    const hasCourses = await PopularCourse.findOne({ category: req.params.id });
    if (hasCourses) {
        res.status(400);
        throw new Error('Cannot delete category with associated courses');
    }
    const category = await PopularCategory.findByIdAndDelete(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.json({ id: req.params.id, message: 'Category removed' });
});

// --- POPULAR COURSE CONTROLLERS ---
const getPopularCourses = asyncHandler(async (req, res) => {
    const popularCourses = await PopularCourse.find()
        .populate('course')
        .populate('category')
        .sort({ sortOrder: 1, createdAt: -1 });
    res.json(popularCourses);
});

const getPublicPopularCourses = asyncHandler(async (req, res) => {
    const popularCourses = await PopularCourse.find({ isActive: true, isHidden: false })
        .populate('course')
        .populate('category')
        .sort({ sortOrder: 1, createdAt: -1 });
    res.json(popularCourses);
});

const createPopularCourse = asyncHandler(async (req, res) => {
    const { category, course, sortOrder, isActive, isHidden } = req.body;
    
    const exists = await PopularCourse.findOne({ category, course });
    if (exists) {
        res.status(400);
        throw new Error('Course already exists in this category');
    }
    
    const popularCourse = await PopularCourse.create({ 
        category, 
        course, 
        sortOrder: sortOrder || 0, 
        isActive: isActive !== undefined ? isActive : true,
        isHidden: isHidden || false
    });
    
    const populated = await PopularCourse.findById(popularCourse._id).populate('course').populate('category');
    res.status(201).json(populated);
});

const updatePopularCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const popularCourse = await PopularCourse.findById(id);
    if (!popularCourse) {
        res.status(404);
        throw new Error('Popular course not found');
    }
    
    const updated = await PopularCourse.findByIdAndUpdate(id, req.body, { new: true }).populate('course').populate('category');
    res.json(updated);
});

const deletePopularCourse = asyncHandler(async (req, res) => {
    const popularCourse = await PopularCourse.findByIdAndDelete(req.params.id);
    if (popularCourse) {
        res.json({ id: req.params.id, message: 'Popular course removed' });
    } else {
        res.status(404);
        throw new Error('Popular course not found');
    }
});

module.exports = { 
    getCourses, createCourse, updateCourse, deleteCourse, 
    getBatches, createBatch, updateBatch, deleteBatch,
    getSubjects, createSubject, updateSubject, deleteSubject,
    createEmployee, getEmployees, getPublicEmployeeReferences,
    getReferences, createReference,
    getEducations, createEducation,
    getEmployeeRoles, createEmployeeRole, updateEmployeeRole, deleteEmployeeRole,
    getExams, createExam,
    updateExam, deleteExam,
    getPopularCourses, getPublicPopularCourses,
    createPopularCourse, updatePopularCourse, deletePopularCourse,
    getPopularCategories, createPopularCategory, updatePopularCategory, deletePopularCategory
};

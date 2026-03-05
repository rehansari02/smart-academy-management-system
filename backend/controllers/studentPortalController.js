const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const Course = require('../models/Course');
const CourseFeedback = require('../models/CourseFeedback');
const moment = require('moment');

// @desc    Get Student Dashboard Stats (Attendance)
// @route   GET /api/student-portal/dashboard
// @access  Private (Student)
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // 1. Find Student Profile linked to this User
        const student = await Student.findOne({ userId }).populate('course');
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        // 2. Calculate Total Course Days
        let totalCourseDays = 0;
        if (student.course) {
            const { duration, durationType } = student.course;
            if (durationType === 'Month') {
                // Approximate or Exact? "if 12 months than 365 (adjust leap year)"
                // We'll calculate based on admission date to admission date + duration
                const startDate = moment(student.admissionDate);
                const endDate = moment(startDate).add(duration, 'months');
                totalCourseDays = endDate.diff(startDate, 'days');
            } else if (durationType === 'Year') {
                 const startDate = moment(student.admissionDate);
                 const endDate = moment(startDate).add(duration, 'years');
                 totalCourseDays = endDate.diff(startDate, 'days');
            } else if (durationType === 'Days') {
                totalCourseDays = duration;
            }
        }

        // 3. Calculate Attendance Stats
        // We need to count how many 'records' in StudentAttendance have this studentId and isPresent: true
        const attendanceRecords = await StudentAttendance.find({
            'records.studentId': student._id
        });

        let presentDays = 0;
        let currentMonthPresent = 0;
        let currentMonthTotal = 0; // Total days attendance was TAKEN this month for this student's batch

        const startOfMonth = moment().startOf('month');
        const endOfMonth = moment().endOf('month');

        attendanceRecords.forEach(att => {
            const record = att.records.find(r => r.studentId.toString() === student._id.toString());
            if (record) {
                 // Overall Present
                if (record.isPresent) {
                    presentDays++;
                }

                // Current Month Stats
                if (moment(att.date).isBetween(startOfMonth, endOfMonth, null, '[]')) {
                    currentMonthTotal++; // Count every day attendance was taken for this batch
                    if (record.isPresent) {
                        currentMonthPresent++;
                    }
                }
            }
        });
        
        // Total days since admission (optional, but good for context vs Total Course Days)
        const daysSinceJoining = moment().diff(moment(student.admissionDate), 'days');

        res.json({
            studentName: student.firstName + ' ' + student.lastName,
            courseName: student.course?.name,
            totalCourseDays,
            daysSinceJoining,
            presentDays,
            currentMonthPresent,
            currentMonthTotal, // Days classes were held this month
            admissionDate: student.admissionDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Course Details (Subjects)
// @route   GET /api/student-portal/course
// @access  Private (Student)
const getCourseDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const student = await Student.findOne({ userId }).populate({
            path: 'course',
            populate: {
                path: 'subjects.subject',
                model: 'Subject'
            }
        });

        if (!student || !student.course) {
             return res.status(404).json({ message: 'Course details not found' });
        }

        // Sort subjects if needed
        const subjects = student.course.subjects.map(s => s.subject).filter(Boolean);

        res.json({
            courseName: student.course.name,
            courseCode: student.course.shortName,
            description: student.course.description || student.course.smallDescription,
            subjects: subjects
        });

    } catch (error) {
         console.error(error);
         res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Course Feedback
// @route   POST /api/student-portal/feedback
// @access  Private (Student)
const submitFeedback = async (req, res) => {
    try {
        const { courseName, title, email, mobile, feedback } = req.body;
        
        // Basic validation
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({ message: 'Feedback is required' });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        
        const userId = req.user._id;
        
        // Find Student to link properly (optional but good for checking validity)
        const student = await Student.findOne({ userId });

        const newFeedback = await CourseFeedback.create({
            studentId: student?._id,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            courseName,
            title,
            email,
            mobile,
            feedback,
            date: new Date()
        });
        res.status(201).json(newFeedback);

    } catch (error) {
         console.error(error);
         res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Study Materials
// @route   GET /api/student-portal/materials
// @access  Private (Student)
const getStudyMaterials = async (req, res) => {
    try {
        const StudyMaterial = require('../models/StudyMaterial');
        const materials = await StudyMaterial.find({ isFree: true }).sort({ createdAt: -1 });
        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Learning Questions (MCQ)
// @route   GET /api/student-portal/learning/questions
// @access  Private (Student)
const getFreeLearningQuestions = async (req, res) => {
    try {
        const FreeLearning = require('../models/FreeLearning');
        // Fetch all questions - in a real app might want to paginate or limit
        const questions = await FreeLearning.find({ isActive: true }).select('-correctOption -explanation'); // Hide answers
        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit Free Learning Quiz
// @route   POST /api/student-portal/learning/submit
// @access  Private (Student)
const submitFreeLearning = async (req, res) => {
    try {
        const { answers } = req.body; // Array of { questionId, selectedOption }
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FreeLearning = require('../models/FreeLearning');
        const FreeLearningProgress = require('../models/FreeLearningProgress');

        const student = await Student.findOne({ userId });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        let totalScore = 0;
        const processedQuestions = [];

        // Validate answers
        for (const ans of answers) {
            const question = await FreeLearning.findById(ans.questionId);
            if (question) {
                const isCorrect = question.correctOption === parseInt(ans.selectedOption);
                if (isCorrect) totalScore++;
                
                processedQuestions.push({
                    questionId: question._id,
                    selectedOption: ans.selectedOption,
                    isCorrect
                });
            }
        }

        // Save Progress
        const progress = await FreeLearningProgress.create({
            studentId: student._id,
            questions: processedQuestions,
            totalScore,
            date: new Date()
        });

        res.status(201).json({
            score: totalScore,
            totalQuestions: answers.length,
            progressId: progress._id,
            message: 'Quiz Submitted Successfully'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Free Learning Reports
// @route   GET /api/student-portal/learning/report
// @access  Private (Student)
const getFreeLearningReport = async (req, res) => {
    try {
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FreeLearningProgress = require('../models/FreeLearningProgress');

        const student = await Student.findOne({ userId });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const reports = await FreeLearningProgress.find({ studentId: student._id })
            .populate('questions.questionId')
            .sort({ date: -1 });

        res.json(reports);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Student Fees (Receipts)
// @route   GET /api/student-portal/fees
// @access  Private (Student)
const getStudentFees = async (req, res) => {
    try {
        const userId = req.user._id;
        const Student = require('../models/Student');
        const FeeReceipt = require('../models/FeeReceipt');

        const student = await Student.findOne({ userId });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const receipts = await FeeReceipt.find({ student: student._id })
            .populate({
                 path: 'student',
                 select: 'firstName lastName regNo enrollmentNo middleName mobileStudent mobileParent batch totalFees pendingFees branchName emiDetails branchId',
                 populate: {
                     path: 'branchId',
                     select: 'name address city state phone mobile email type'
                 }
            })
            .populate('course', 'name')
            .sort({ date: -1 });

        res.json(receipts);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getDashboardStats,
    getCourseDetails,
    submitFeedback,
    getStudyMaterials,
    getFreeLearningQuestions,
    submitFreeLearning,
    getFreeLearningReport,
    getStudentFees
};

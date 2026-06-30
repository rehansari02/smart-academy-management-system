const asyncHandler = require('express-async-handler');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const Counter = require('../models/Counter');
const ExamSchedule = require('../models/ExamSchedule');
const StudentAttendance = require('../models/StudentAttendance');
const ExamAttempt = require('../models/ExamAttempt');
const FinalExamQuestionPaper = require('../models/FinalExamQuestionPaper');

const normalizeSomNumber = (value) => {
    const somNumber = String(value || '').trim();
    if (!somNumber) return '';
    return `SOM-${somNumber.replace(/^(SOM-)+/i, '').replace(/^(LEGACY-)+/i, '')}`;
};

const csrFromSomNumber = (somNumber) => normalizeSomNumber(somNumber).replace(/^SOM-/i, 'CSR-');

const normalizeCsrNumber = (csrNumber, somNumber) => {
    const rawCsr = String(csrNumber || '').trim();
    if (!rawCsr || rawCsr.startsWith('SOM-') || /^CSR-LEGACY-/i.test(rawCsr) || /^CERT-LEGACY-/i.test(rawCsr)) {
        return csrFromSomNumber(somNumber);
    }
    return `CSR-${rawCsr.replace(/^(CSR-|SOM-)+/i, '').replace(/^(LEGACY-)+/i, '')}`;
};

const normalizeResultNumbers = (result) => {
    const output = typeof result.toObject === 'function' ? result.toObject() : result;
    output.somNumber = normalizeSomNumber(output.somNumber);
    output.csrNumber = normalizeCsrNumber(output.csrNumber, output.somNumber);
    if (!output.certificateNumber || /^(CERT|CSR)-LEGACY-/i.test(output.certificateNumber)) {
        output.certificateNumber = output.csrNumber;
    }
    return output;
};

const normalizeAnswerText = (value) => String(value || '').trim().toLowerCase();

const getMcqCorrectOptionLetter = (mcq) => {
    const correct = normalizeAnswerText(mcq?.correctAnswer);
    if (!correct) return '';

    const optionIndex = (mcq?.options || []).findIndex((option) => normalizeAnswerText(option) === correct);
    if (optionIndex >= 0) return String.fromCharCode(65 + optionIndex);
    if (/^[a-d]$/i.test(correct)) return correct.toUpperCase();
    return '';
};

const scoreAttemptAgainstPaper = (attempt, subjectPaper) => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const mcqs = Array.isArray(subjectPaper?.mcqs) ? subjectPaper.mcqs : [];
    const questionAnswers = Array.isArray(subjectPaper?.questionAnswers) ? subjectPaper.questionAnswers : [];

    const mcqAnswerMap = new Map(
        answers
            .filter((item) => item.type === 'mcq')
            .map((item) => [Number(item.questionIndex) || 0, item.selectedOption || ''])
    );

    let mcqMarksObtained = 0;
    mcqs.forEach((mcq, index) => {
        const selected = normalizeAnswerText(mcqAnswerMap.get(index + 1));
        const correctLetter = normalizeAnswerText(getMcqCorrectOptionLetter(mcq));
        if (selected && correctLetter && selected === correctLetter) {
            mcqMarksObtained += Number(mcq.marks) || 0;
        }
    });

    const qaMarksObtained = answers
        .filter((item) => item.type === 'qa')
        .reduce((sum, item) => sum + (Number(item.marks) || 0), 0);

    const totalMarksPossible = mcqs.reduce((sum, mcq) => sum + (Number(mcq.marks) || 0), 0)
        + questionAnswers.reduce((sum, qa) => sum + (Number(qa.marks) || 0), 0);

    return {
        mcqMarksObtained,
        qaMarksObtained,
        totalMarksObtained: mcqMarksObtained + qaMarksObtained,
        totalMarksPossible
    };
};

const getAttendanceCutoffDate = (exam) => {
    const examDates = (exam?.timeTable || [])
        .map(item => item.date ? new Date(item.date) : null)
        .filter(item => item && !Number.isNaN(item.getTime()))
        .sort((a, b) => a - b);

    if (examDates.length === 0) return null;

    const cutoff = new Date(examDates[0]);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setMilliseconds(-1);
    return cutoff;
};

const getStudentAttendanceSummary = async (studentId, exam) => {
    const cutoffDate = getAttendanceCutoffDate(exam);

    const calculateSummary = async (dateFilter = null) => {
        const match = { 'records.studentId': studentId };
        if (dateFilter) {
            match.date = dateFilter;
        }

        const [summary] = await StudentAttendance.aggregate([
        { $match: match },
        { $unwind: '$records' },
        { $match: { 'records.studentId': studentId } },
        {
            $group: {
                _id: null,
                totalDays: { $sum: 1 },
                presentDays: {
                    $sum: {
                        $cond: ['$records.isPresent', 1, 0]
                    }
                }
            }
        }
        ]);

        return summary || { presentDays: 0, totalDays: 0 };
    };

    let summary = cutoffDate
        ? await calculateSummary({ $lte: cutoffDate })
        : await calculateSummary();

    if (summary.totalDays === 0 && cutoffDate) {
        summary = await calculateSummary();
    }

    const presentDays = summary?.presentDays || 0;
    const totalDays = summary?.totalDays || 0;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0.00';

    return {
        presentDays,
        totalDays,
        percentage,
        totalPresentsText: `DAYS ${presentDays} OUT OF ${totalDays} (${percentage})`
    };
};

// @desc    Get Exam Results with Filters
// @route   GET /api/master/exam-result
const getExamResults = asyncHandler(async (req, res) => {
    const { examId, batch, regNo, studentName, courseId, examName, branchId } = req.query;

    let query = { isDeleted: false };

    if (examId) query.exam = examId;
    if (courseId) query.course = courseId;
    if (examName) {
        const schedules = await ExamSchedule.find({ examName: { $regex: examName, $options: 'i' } }).select('_id');
        query.exam = { $in: schedules.map(s => s._id) };
    }
    if (batch) query.batch = { $regex: batch, $options: 'i' };
    if (req.query.studentId) query.student = req.query.studentId;
    
    // Filter by Student details (requires looking up students first)
    if (regNo || studentName || branchId) {
        let studentQuery = {};
        if (regNo) studentQuery.regNo = { $regex: regNo, $options: 'i' };
        if (studentName) {
            studentQuery.$or = [
                { firstName: { $regex: studentName, $options: 'i' } },
                { lastName: { $regex: studentName, $options: 'i' } }
            ];
        }
        if (branchId) studentQuery.branchId = branchId;
        const students = await Student.find(studentQuery).select('_id');
        query.student = { $in: students };
    }

    const results = await ExamResult.find(query)
        .populate('student', 'firstName middleName lastName regNo enrollmentNo mobileStudent studentPhoto branchId branchName')
        .populate('course', 'name shortName')
        .populate('exam', 'examName')
        .populate('subjectMarks.subject', 'name')
        .sort({ createdAt: -1 });

    res.json(results.map(normalizeResultNumbers));
});

// @desc    Create Exam Result
// @route   POST /api/master/exam-result
const createExamResult = asyncHandler(async (req, res) => {
    const { studentId, examId, somNumber, csrNumber, certificateNumber, issueDate, subjectMarks, grade, isActive } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
        res.status(404); throw new Error('Student not found');
    }

    // Auto-generate SOM and CSR if not provided
    let finalSom = normalizeSomNumber(somNumber);
    let finalCsr = csrNumber;

    if (!finalSom) {
        const counter = await Counter.findOneAndUpdate(
            { _id: 'examResultSeq' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        finalSom = `SOM-G${counter.seq.toString().padStart(5, '0')}`;
    }

    finalCsr = normalizeCsrNumber(finalCsr, finalSom);

    let finalCert = certificateNumber;
    if (!finalCert || /^(CERT|CSR)-LEGACY-/i.test(finalCert)) {
        finalCert = finalCsr;
    }

    // Calculate totals from subjects
    const marksObtained = subjectMarks.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalMarks = subjectMarks.reduce((sum, s) => sum + Number(s.maxMarks || 100), 0);

    const result = await ExamResult.create({
        student: studentId,
        exam: examId,
        course: student.course,
        batch: student.batch,
        somNumber: finalSom,
        csrNumber: finalCsr,
        certificateNumber: finalCert,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        subjectMarks: subjectMarks.map(s => ({
            subject: s.subjectId,
            theory: s.theory,
            practical: s.practical,
            total: s.total
        })),
        marksObtained,
        totalMarks,
        grade,
        isActive
    });

    const populated = await ExamResult.findById(result._id)
        .populate('student', 'firstName lastName regNo enrollmentNo')
        .populate('course', 'name')
        .populate('exam', 'examName')
        .populate('subjectMarks.subject', 'name');

    res.status(201).json(normalizeResultNumbers(populated));
});

// @desc    Update Exam Result
// @route   PUT /api/master/exam-result/:id
const updateExamResult = asyncHandler(async (req, res) => {
    const result = await ExamResult.findById(req.params.id);
    if (result) {
        let finalSom = normalizeSomNumber(req.body.somNumber || result.somNumber);
        let finalCsr = req.body.csrNumber || result.csrNumber;
        let finalCert = req.body.certificateNumber || result.certificateNumber;

        finalCsr = normalizeCsrNumber(finalCsr, finalSom);

        if (!finalCert || /^(CERT|CSR)-LEGACY-/i.test(finalCert)) {
            finalCert = finalCsr;
        }

        result.somNumber = finalSom;
        result.csrNumber = finalCsr;
        result.certificateNumber = finalCert;
        if (req.body.issueDate !== undefined) {
            result.issueDate = req.body.issueDate ? new Date(req.body.issueDate) : result.issueDate;
        }
        result.grade = req.body.grade || result.grade;
        result.isActive = req.body.isActive !== undefined ? req.body.isActive : result.isActive;

        if (req.body.subjectMarks) {
            result.subjectMarks = req.body.subjectMarks.map(s => ({
                subject: s.subjectId || s.subject,
                theory: s.theory,
                practical: s.practical,
                total: s.total
            }));
            result.marksObtained = result.subjectMarks.reduce((sum, s) => sum + Number(s.total || 0), 0);
            result.totalMarks = req.body.subjectMarks.reduce((sum, s) => sum + Number(s.maxMarks || 100), 0);
        }

        const updated = await result.save();
        const populated = await ExamResult.findById(updated._id)
             .populate('student', 'firstName lastName regNo enrollmentNo')
             .populate('course', 'name')
             .populate('exam', 'examName')
             .populate('subjectMarks.subject', 'name');
             
        res.json(normalizeResultNumbers(populated));
    } else {
        res.status(404); throw new Error('Result not found');
    }
});

// @desc    Delete Exam Result (Soft Delete)
// @route   DELETE /api/master/exam-result/:id
const deleteExamResult = asyncHandler(async (req, res) => {
    const result = await ExamResult.findById(req.params.id);
    if (result) {
        result.isDeleted = true;
        await result.save();
        res.json({ message: 'Result deleted successfully', id: req.params.id });
    } else {
        res.status(404); throw new Error('Result not found');
    }
});

// @desc    Get Single Exam Result
// @route   GET /api/master/exam-result/:id
const getExamResultById = asyncHandler(async (req, res) => {
    const result = await ExamResult.findById(req.params.id)
        .populate('student', 'firstName middleName lastName relationType gender regNo enrollmentNo mobileStudent studentPhoto dob aadharCard address city state pincode batch branchId branchName')
        .populate('course', 'name duration durationType shortName centerName')
        .populate('subjectMarks.subject', 'name')
        .populate({
            path: 'exam',
            select: 'examName timeTable',
            populate: {
                path: 'timeTable.subject',
                select: 'name'
            }
        });
    
    if (result) {
        const attendanceSummary = await getStudentAttendanceSummary(result.student._id, result.exam);
        const marksPercentage = result.totalMarks > 0
            ? ((Number(result.marksObtained || 0) / Number(result.totalMarks)) * 100).toFixed(2)
            : '0.00';

        res.json({
            ...normalizeResultNumbers(result),
            attendanceSummary,
            totalPresentsText: attendanceSummary.totalPresentsText,
            attendancePercentage: attendanceSummary.percentage,
            percentage: marksPercentage
        });
    } else {
        res.status(404); throw new Error('Result not found');
    }
});

// @desc    Get Next Available SOM and CSR Numbers
// @route   GET /api/master/exam-result/next-numbers
const getNextResultNumbers = asyncHandler(async (req, res) => {
    let counter = await Counter.findById('examResultSeq');
    if (!counter) {
        const count = await ExamResult.countDocuments();
        counter = await Counter.create({ _id: 'examResultSeq', seq: count });
    }
    const nextSeq = counter.seq + 1;
    const nextSom = `SOM-G${nextSeq.toString().padStart(5, '0')}`;
    res.json({
        somNumber: nextSom,
        csrNumber: csrFromSomNumber(nextSom)
    });
});

// @desc    Verify Exam Result Publicly
// @route   POST /api/master/exam-result/verify
const verifyExamResult = asyncHandler(async (req, res) => {
    const { email, enrollmentNo, regNo, identifier, dob } = req.body;
    const searchVal = identifier || enrollmentNo || regNo;

    let student;

    if (searchVal && dob) {
        student = await Student.findOne({
            $or: [
                { enrollmentNo: { $regex: new RegExp(`^${searchVal.trim()}$`, 'i') } },
                { regNo: { $regex: new RegExp(`^${searchVal.trim()}$`, 'i') } }
            ],
            isDeleted: false
        })
            .populate('course', 'name duration durationType shortName')
            .lean();

        if (!student) {
            res.status(404);
            throw new Error('No student found with the provided Enrollment/Registration number');
        }

        const d1 = new Date(dob);
        const d2 = new Date(student.dob);
        const isSameDate = (d1.getUTCDate() === d2.getUTCDate() && d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCFullYear() === d2.getUTCFullYear()) ||
            (d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear());

        if (!isSameDate) {
            res.status(400);
            throw new Error('Invalid Date of Birth for the provided student');
        }
    } else {
        if (!email || !enrollmentNo) {
            res.status(400);
            throw new Error('Email and Enrollment number are required');
        }

        student = await Student.findOne({
            email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
            enrollmentNo: { $regex: new RegExp(`^${enrollmentNo.trim()}$`, 'i') },
            isDeleted: false
        })
            .populate('course', 'name duration durationType shortName')
            .lean();

        if (!student) {
            res.status(404);
            throw new Error('No student found with the provided Email and Enrollment number');
        }
    }

    // Find exam result for this student
    // User said: "those who student can be exam done and mrksheet complete"
    // We'll check for isActive results which typically means they are finalized
    const results = await ExamResult.find({
        student: student._id,
        isDeleted: false,
        isActive: true
    })
    .populate('course', 'name duration durationType shortName')
    .populate('exam', 'examName')
    .populate('subjectMarks.subject', 'name')
    .sort({ createdAt: -1 })
    .lean();

    if (!results || results.length === 0) {
        res.status(404);
        throw new Error('No finalized exam results found for this student');
    }

    // Return the results in a simplified format for public view
    const publicResults = results.map(res => {
        const normalized = normalizeResultNumbers(res);
        return ({
        _id: res._id,
        examName: res.exam?.examName,
        courseName: res.course?.name,
        somNumber: normalized.somNumber,
        csrNumber: normalized.csrNumber,
        certificateNumber: normalized.certificateNumber,
        grade: res.grade,
        percentage: res.percentage,
        marksObtained: res.marksObtained,
        totalMarks: res.totalMarks,
        issueDate: res.issueDate || res.createdAt,
        subjects: res.subjectMarks.map(sm => ({
            name: sm.subject?.name,
            theory: sm.theory,
            practical: sm.practical,
            total: sm.total
        }))
    });
    });

    res.json({
        student: {
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            regNo: student.regNo,
            enrollmentNo: student.enrollmentNo
        },
        results: publicResults
    });
});

// @desc    Get online exam attempt marks to prefill exam result
// @route   GET /api/master/exam-result/attempt-marks
const getExamAttemptMarksForResult = asyncHandler(async (req, res) => {
    const { examId, examName, courseId, studentId } = req.query;

    if (!studentId || (!examId && (!examName || !courseId))) {
        res.status(400);
        throw new Error('Exam, course and student are required');
    }

    const selectedSchedule = examId
        ? await ExamSchedule.findById(examId).populate('timeTable.subject', 'name printedName')
        : null;

    const resolvedExamName = selectedSchedule?.examName || examName;
    const resolvedCourseId = selectedSchedule?.course?._id || selectedSchedule?.course || courseId;

    const scheduleQuery = {
        examName: resolvedExamName,
        course: resolvedCourseId,
        isDeleted: false
    };

    const schedules = await ExamSchedule.find(scheduleQuery).populate('timeTable.subject', 'name printedName').lean();
    const baseSchedule = selectedSchedule ? selectedSchedule.toObject() : schedules.find((item) => !item.isReExam) || schedules[0];

    if (!baseSchedule) {
        res.status(404);
        throw new Error('Exam schedule not found');
    }

    const subjectRows = (baseSchedule.timeTable || []).map((row) => ({
        subjectId: String(row.subject?._id || row.subject),
        subjectName: row.subject?.name || row.subject?.printedName || 'Subject',
        maxMarks: Number(row.total) || ((Number(row.theory) || 0) + (Number(row.practical) || 0)) || 100
    }));

    const attempts = await ExamAttempt.find({
        examName: resolvedExamName,
        course: resolvedCourseId,
        student: studentId,
        isSubmitted: true
    })
        .populate('subject', 'name printedName')
        .sort({ submittedAt: -1, updatedAt: -1 })
        .lean();

    const paper = await FinalExamQuestionPaper.findOne({
        examName: resolvedExamName,
        course: resolvedCourseId,
        isActive: true,
        isDeleted: false
    }).lean();

    const paperBySubject = new Map(
        (paper?.subjects || []).map((subjectPaper) => [String(subjectPaper.subject), subjectPaper])
    );

    const attemptMarksBySubject = new Map();
    attempts.forEach((attempt) => {
        const subjectId = String(attempt.subject?._id || attempt.subject);
        if (attemptMarksBySubject.has(subjectId)) return;
        const score = scoreAttemptAgainstPaper(attempt, paperBySubject.get(subjectId));
        attemptMarksBySubject.set(subjectId, {
            theory: score.totalMarksObtained,
            attempted: true,
            submittedAt: attempt.submittedAt || attempt.updatedAt,
            possibleMarks: score.totalMarksPossible
        });
    });

    attempts.forEach((attempt) => {
        const subjectId = String(attempt.subject?._id || attempt.subject);
        if (!subjectRows.some((row) => row.subjectId === subjectId)) {
            const score = attemptMarksBySubject.get(subjectId) || scoreAttemptAgainstPaper(attempt, paperBySubject.get(subjectId));
            subjectRows.push({
                subjectId,
                subjectName: attempt.subject?.name || attempt.subject?.printedName || 'Subject',
                maxMarks: score.possibleMarks || 100
            });
        }
    });

    const subjects = subjectRows.map((row) => {
        const attemptScore = attemptMarksBySubject.get(row.subjectId);
        return {
            subjectId: row.subjectId,
            subjectName: row.subjectName,
            theory: Number(attemptScore?.theory) || 0,
            practical: 0,
            total: Number(attemptScore?.theory) || 0,
            maxMarks: Number(row.maxMarks) || Number(attemptScore?.possibleMarks) || 100,
            attempted: Boolean(attemptScore?.attempted),
            submittedAt: attemptScore?.submittedAt || null
        };
    });

    res.json({
        examName: resolvedExamName,
        courseId: resolvedCourseId,
        studentId,
        subjects
    });
});

module.exports = { getExamResults, createExamResult, updateExamResult, deleteExamResult, getExamResultById, getNextResultNumbers, getExamAttemptMarksForResult, verifyExamResult };

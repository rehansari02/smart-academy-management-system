const Student = require('../models/Student');
const User = require('../models/User'); 
const FeeReceipt = require('../models/FeeReceipt'); 
const Course = require('../models/Course');
const Batch = require('../models/Batch'); 
const Branch = require('../models/Branch'); 
const Inquiry = require('../models/Inquiry');
const ExamResult = require('../models/ExamResult');
const ExamRequest = require('../models/ExamRequest');
const sendSMS = require('../utils/smsSender');
const asyncHandler = require('express-async-handler');
const Counter = require('../models/Counter');
const generateEnrollmentNumber = require('../utils/enrollmentGenerator');

// @desc    Get Students
const getStudents = asyncHandler(async (req, res) => {
    // Added branchId to destructuring
    const {
        page = 1, pageSize = 10, courseFilter, studentName,
        hasPendingFees, reference, startDate, endDate,
        isRegistered, isAdmissionFeesPaid, batch, branchId,
        sortBy = '-createdAt'
    } = req.query;
    
    let query = { isDeleted: false };

    // Branch-based filtering logic
    if (req.user.role !== 'Super Admin' && req.user.branchId) {
        query.branchId = req.user.branchId;
    } else if (branchId) {
        query.branchId = branchId;
    }

    // Other filters
    if (courseFilter) query.course = courseFilter;
    if (studentName) {
        const parts = studentName.trim().split(/\s+/);
        if (parts.length > 1) {
            // Search for full name combinations
            query.$or = [
                { $and: [{ firstName: { $regex: parts[0], $options: 'i' } }, { lastName: { $regex: parts[parts.length - 1], $options: 'i' } }] },
                { $and: [{ firstName: { $regex: parts[parts.length - 1], $options: 'i' } }, { lastName: { $regex: parts[0], $options: 'i' } }] }
            ];
        } else {
            const nameRegex = new RegExp(studentName, 'i');
            query.$or = [
                { firstName: nameRegex },
                { lastName: nameRegex },
                { regNo: nameRegex },
                { enrollmentNo: nameRegex }
            ];
        }
    }
    if (hasPendingFees === 'true') query.pendingFees = { $gt: 0 };
    if (reference) query.reference = { $regex: reference, $options: 'i' };
    if (batch) query.batch = { $regex: batch, $options: 'i' };
    if (startDate && endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.admissionDate = { $gte: new Date(startDate), $lte: end };
    }

    if (isRegistered !== undefined) {
        query.isRegistered = isRegistered === 'true';
    }

    if (isAdmissionFeesPaid !== undefined) {
        query.isAdmissionFeesPaid = isAdmissionFeesPaid === 'true';
    }

    // New: Handle isCancelled filter (Default: exclude cancelled students)
    const { isCancelled } = req.query;
    if (isCancelled === 'true') {
        query.isCancelled = true;
    } else if (isCancelled === 'all') {
        // Include both active and cancelled (no filter on isCancelled)
    } else {
        // Default: only show active students (isCancelled: false)
        query.isCancelled = false;
    }

    const limit = Number(pageSize) || 10;
    const pageNum = Number(page) || 1;
    const count = await Student.countDocuments(query);

    const students = await Student.find(query)
        // CHANGED: Added 'registrationFees' to populate
        .populate('course', 'name duration shortName durationType registrationFees')
        .populate('userId', 'username')
        .limit(limit)
        .skip(limit * (pageNum - 1))
        .sort({ createdAt: -1 });

    res.json({ students, page: pageNum, pages: Math.ceil(count / limit), count });
});

// ... (Rest of the controller functions remain unchanged)
const getStudentById = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id)
        .populate('course', 'name courseFees monthlyFees totalInstallment registrationFees admissionFees') 
        .populate('userId', 'username email');
    
    if (student) {
        const receipts = await FeeReceipt.find({ student: student._id });
        const regReceipts = receipts.filter(r => {
            const rem = (r.remarks || "").toLowerCase();
            return rem.includes("registration");
        });
        let paidRegistrationFee = regReceipts.reduce((acc, curr) => acc + curr.amountPaid, 0);
        const studentObj = student.toObject();
        studentObj.paidRegistrationFee = paidRegistrationFee;

        res.json(studentObj);
    } else { 
        res.status(404); throw new Error('Student not found'); 
    }
});

const createStudent = asyncHandler(async (req, res) => {
    let { totalFees, feeDetails, paymentPlan } = req.body;

    if (typeof feeDetails === 'string') {
        try {
            feeDetails = JSON.parse(feeDetails);
        } catch (error) {
            console.error("Error parsing feeDetails JSON:", error);
            feeDetails = null;
        }
    }
    
    if (process.env.NODE_ENV === 'development') {
        console.log("Create Student Request Body:", { 
            paymentPlan,
            feeDetails,
            branchId: req.body.branchId
        });
    }    
    let pendingFees = totalFees;
    let isAdmissionFeesPaid = false;
    let admissionFeeAmount = 0;

    if (feeDetails && feeDetails.amount > 0) {
        admissionFeeAmount = Number(feeDetails.amount);
        isAdmissionFeesPaid = true;
    }

    try {
        let finalBranchId = req.body.branchId;
        if (finalBranchId === '') {
            finalBranchId = null;
        }

        if (!finalBranchId && req.user && req.user.branchId) {
            finalBranchId = req.user.branchId;
        }

        const branchPromise = finalBranchId ? Branch.findById(finalBranchId).lean() : Promise.resolve(null);
        const receiptPromise = (feeDetails && feeDetails.amount > 0) 
            ? FeeReceipt.findOne().sort({ createdAt: -1 }).lean() 
            : Promise.resolve(null);

        const [branchDoc, lastReceipt] = await Promise.all([branchPromise, receiptPromise]);

        let finalBranchName = 'Main'; 
        if (branchDoc) {
            finalBranchName = branchDoc.name;
        }

        const studentData = {
            ...req.body,
            branchId: finalBranchId, 
            branchName: finalBranchName, 
            studentPhoto: req.file ? req.file.path.replace(/\\/g, "/") : (req.body.studentPhoto || null), 
            pendingFees,
            isAdmissionFeesPaid,
            admissionFeeAmount,
            isRegistered: false 
        };

        if (finalBranchId) {
            studentData.enrollmentNo = await generateEnrollmentNumber(finalBranchId);
        }

        const student = await Student.create(studentData);

        if (feeDetails && feeDetails.amount > 0) {
            let nextNum = 1;
            if (lastReceipt && lastReceipt.receiptNo && !isNaN(lastReceipt.receiptNo)) {
                nextNum = Number(lastReceipt.receiptNo) + 1;
            }
            const receiptNo = String(nextNum);
            const receiptRemarks = feeDetails.remarks || 'Admission Fee';

            await FeeReceipt.create({
                receiptNo,
                student: student._id,
                course: student.course,
                amountPaid: feeDetails.amount,
                paymentMode: feeDetails.paymentMode,
                remarks: receiptRemarks,
                date: feeDetails.date || new Date(),
                createdBy: req.user._id
            });
        }

        if (isAdmissionFeesPaid) {
            const courseDoc = await Course.findById(student.course);
            const batchDoc = await Batch.findOne({ name: student.batch }); 
            
            const courseName = courseDoc ? courseDoc.name : 'N/A';
            const batchTime = batchDoc ? `${batchDoc.startTime} to ${batchDoc.endTime}` : 'N/A';
            const fullName = `${student.firstName} ${student.lastName}`;
    
            const smsMessage = `Welcome to Smart Institute, Dear, ${fullName}. your admission has been successfully completed. Enrollment No. ${student.enrollmentNo}, course ${courseName}, Batch Time ${batchTime}`;
    
            const contacts = [...new Set([student.mobileStudent, student.mobileParent, student.contactHome].filter(Boolean))]; 
            
            // Send Welcome SMS
            await Promise.all(contacts.map(num => sendSMS(num, smsMessage)))
                .then(() => console.log('Admission Welcome SMS sent successfully'))
                .catch(err => console.error('Admission Welcome SMS failed', err));

            // Send Fee SMS (Admission Fee)
            const feeSmsMessage = `Dear, ${fullName}. Your Course fees ${feeDetails.amount} has been deposited for Admission Fees, Reg.No. ${student.enrollmentNo || 'N/A'}. Thank you,\nSmart Institute`;
            console.log(`Sending Admission Fee SMS to: ${contacts.join(', ')} | Msg: ${feeSmsMessage}`);
            await Promise.all(contacts.map(num => sendSMS(num, feeSmsMessage)))
                .catch(err => console.error('Admission Fee SMS failed', err));
        }

        // Remove from Admin "Online Admission" list when admission fee paid (student created from inquiry)
        if (student.inquiryId && isAdmissionFeesPaid) {
            await Inquiry.findByIdAndUpdate(student.inquiryId, { source: 'Converted', status: 'Complete' });
        }

        res.status(201).json(student);
    } catch (error) {
        res.status(400);
        throw new Error('Invalid Student Data: ' + error.message);
    }
});

const confirmStudentRegistration = asyncHandler(async (req, res) => {
    // console.log("=== CONFIRM REGISTRATION DEBUG START ===");
    const { id } = req.params;
    // const { id } = req.params;
    // const { data } = req.body; // ERROR HERE: Frontend sends body directly!
    const { username, password, feeDetails } = req.body;

    // console.log("DEBUG: Confirming Registration for Student ID:", id);
    // console.log("DEBUG: Received Data:", JSON.stringify(data, null, 2));

// Retrying Logic for reliability
    let attempts = 0;
    const maxAttempts = 3;

    const student = await Student.findById(id);
    if (!student) {
        res.status(404);
        throw new Error("Student not found for confirmation");
    }

    while (attempts < maxAttempts) {
        attempts++;
        try {
            // 1. Create User Credentials
            // 1. Create User Credentials
            let newUser = null;
            
            // RegNo Generation (Moved inside loop to regenerate on retry)
            const lastStudent = await Student.aggregate([
                { 
                   $match: { 
                       regNo: { $exists: true, $ne: null, $ne: "" },
                       isRegistered: true,
                       isDeleted: { $ne: true } 
                   } 
                },
                {
                   $project: {
                       regNo: 1,
                       seq: {
                           $convert: {
                               input: { $arrayElemAt: [{ $split: ["$regNo", "-"] }, 0] },
                               to: "int",
                               onError: 0,
                               onNull: 0
                           }
                       }
                   }
                },
                { $sort: { seq: -1 } },
                { $limit: 1 }
            ]);
    
            let nextSequence = 1;
            if (lastStudent.length > 0 && lastStudent[0].seq > 0) {
                nextSequence = lastStudent[0].seq + 1;
            }
    
            let branchCode = 'MN'; 
            if (student.branchId) {
                 const branch = await Branch.findById(student.branchId);
                 if (branch && branch.shortCode) {
                     branchCode = branch.shortCode;
                 }
            }
    
            const finalRegNo = `${nextSequence}-${branchCode}`;
            console.log(`[DEBUG] Registration Attempt ${attempts}: StudentID=${id}, Generated RegNo=${finalRegNo}`);
            
            try {
                const existingUser = await User.findOne({ 
                    $or: [{ username: username }, { email: student.email || `${finalRegNo}@institute.com` }] 
                });
        
                if (existingUser) {
                    newUser = existingUser;
                } else {
                    newUser = await User.create({
                        name: `${student.firstName} ${student.lastName}`,
                        email: student.email || `${finalRegNo}@institute.com`, 
                        username: username,
                        password: password,
                        role: 'Student',
                        branchId: student.branchId
                    });
                }
            } catch (userError) {
                if (userError.code === 11000) {
                    console.warn(`[DEBUG] User Duplicate Key in Attempt ${attempts}, Retrying...`);
                    continue; // Retry loop
                }
                console.error("[DEBUG] User Creation Failed:", userError);
                throw new Error('User account creation failed: ' + userError.message);
            }
            console.log(`[DEBUG] User Processed: ${newUser?._id || 'Existing'}`);
        
            if (!req.user?._id) {
                throw new Error('Authentication required');
            }

            if (feeDetails && Number(feeDetails.amount) > 0) {
                try {
                    // ALWAYS Generate Global Receipt No (Ignore frontend stale data)
                     const lastReceipt = await FeeReceipt.findOne({})
                        .sort({ receiptNo: -1 })
                        .collation({ locale: "en_US", numericOrdering: true });
        
                    let receiptNo = lastReceipt && !isNaN(lastReceipt.receiptNo) ? Number(lastReceipt.receiptNo) + 1 : 1;
        
                    const receiptData = {
                        receiptNo: String(receiptNo),
                        student: student._id,
                        course: student.course,
                        amountPaid: Number(feeDetails.amount),
                        date: feeDetails.date || new Date(),
                        paymentMode: feeDetails.paymentMode,
                        remarks: feeDetails.remarks || 'Registration Fee',
                        createdBy: req.user?._id, 
                        branch: student.branchId,
                        bankName: feeDetails.bankName,
                        chequeNumber: feeDetails.chequeNumber,
                        chequeDate: feeDetails.chequeDate,
                        transactionId: feeDetails.transactionId,
                        transactionDate: feeDetails.transactionDate
                    };
        
                    await FeeReceipt.create(receiptData);
                    console.log(`[DEBUG] Fee Receipt Created: ${receiptNo}`);
                    
                    student.pendingFees = Math.max(0, student.pendingFees - Number(feeDetails.amount));
                    student.isRegistrationFeesPaid = true;
                } catch (feeError) {
                     if (feeError.code === 11000) {
                         console.warn(`[DEBUG] Receipt Duplicate Key in Attempt ${attempts}, Retrying...`);
                         continue; // Retry loop
                     }
                     console.error("[DEBUG] Fee Receipt Creation Failed:", feeError);
                     throw new Error('Fee Receipt Creation Failed: ' + feeError.message);
                }
            }        
            student.regNo = finalRegNo;
            student.isRegistered = true;
            student.registrationDate = new Date();
            if (newUser) {
                student.userId = newUser._id;
            }
            await student.save();
        
            const contacts = [...new Set([student.mobileStudent, student.mobileParent, student.contactHome].filter(Boolean))];
        
            if (student.mobileStudent) {
                const regMessage = `Dear, ${student.firstName} ${student.lastName}. Your Registration process has been successfully completed. Reg.No. ${finalRegNo}, User ID-${username}, Password-${password}, smart institute.`;
                await sendSMS(student.mobileStudent, regMessage)
                    .catch(err => console.error('Registration SMS failed', err));
            }
        
            // Send Fee SMS (Registration Fee)
            if (feeDetails && Number(feeDetails.amount) > 0) {
                const feeSmsMessage = `Dear, ${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}. Your Course fees ${feeDetails.amount} has been deposited for Registration Fees, Reg.No. ${finalRegNo}. Thank you,\nSmart Institute`;
                await Promise.all(contacts.map(num => sendSMS(num, feeSmsMessage)))
                    .catch(err => console.error('Registration Fee SMS failed', err));
            }
        
            res.json({ message: 'Student Registration Completed', student });
            return; // Success, exit function
            
        } catch (error) {
            if (attempts === maxAttempts) {
                 res.status(400);
                 throw error; // Throw final error
            }
            // If not max attempts, loop will continue
             console.warn(`[DEBUG] Registration Error in Attempt ${attempts}: ${error.message}. Retrying...`);
        }
    }
});

const getNextRegNo = asyncHandler(async (req, res) => {
    const { branchId } = req.query;
    
    const lastStudent = await Student.aggregate([
        { 
           $match: { 
               regNo: { $exists: true, $ne: null, $ne: "" },
               isRegistered: true,
               isDeleted: { $ne: true } 
           } 
        },
        {
           $project: {
               regNo: 1,
               seq: {
                   $convert: {
                       input: { $arrayElemAt: [{ $split: ["$regNo", "-"] }, 0] },
                       to: "int",
                       onError: 0,
                       onNull: 0
                   }
               }
           }
        },
        { $sort: { seq: -1 } },
        { $limit: 1 }
    ]);

    let nextSequence = 1;
    if (lastStudent.length > 0 && lastStudent[0].seq > 0) {
        nextSequence = lastStudent[0].seq + 1;
    }

    let branchCode = 'MN'; 
    if (branchId) {
        const branch = await Branch.findById(branchId);
        if (branch && branch.shortCode) {
            branchCode = branch.shortCode;
        }
    }

    const previewRegNo = `${nextSequence}-${branchCode}`;
    res.json({ regNo: previewRegNo });
});

const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (student) {
        await FeeReceipt.deleteMany({ student: student._id });
        if(student.userId) {
            await User.findByIdAndDelete(student.userId);
        }
        await Student.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Student and all associated data (receipts, user login) removed permanently' });
    } else {
        res.status(404); throw new Error('Student not found');
    }
});

const toggleStudentStatus = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if(student) {
        student.isActive = !student.isActive;
        await student.save();
        res.json({ message: 'Status updated', isActive: student.isActive });
    } else {
        res.status(404); throw new Error('Student not found');
    }
});

const updateStudent = asyncHandler(async (req, res) => {
    console.log('=== UPDATE STUDENT REQUEST ===');
    console.log('Student ID:', req.params.id);
    console.log('Request body course:', req.body.course);
    
    const student = await Student.findById(req.params.id);

    if (student) {
        console.log('Current student course:', student.course);
        
        // Detect if course is being changed
        const isCourseChanged = req.body.course && req.body.course.toString() !== student.course.toString();
        
        console.log('Is course changed?', isCourseChanged);
        
        // If course is changed, calculate fee adjustment and update all receipts
        if (isCourseChanged && req.body.totalFees !== undefined) {
            console.log(`✅ Course changed from ${student.course} to ${req.body.course}`);
            
            // Fetch all receipts for this student
            const allReceipts = await FeeReceipt.find({ student: student._id });
            console.log(`Found ${allReceipts.length} receipts for this student`);
            
            // Calculate total paid amount EXCLUDING admission fees
            // Only count registration fees and installment payments
            const totalPaidAmount = allReceipts.reduce((sum, receipt) => {
                const remarks = (receipt.remarks || "").toLowerCase();
                // Exclude admission fee receipts from calculation
                if (remarks.includes("admission")) {
                    return sum; // Don't add admission fees
                }
                return sum + receipt.amountPaid;
            }, 0);
            
            console.log(`Total paid amount (excluding admission fees): ₹${totalPaidAmount}`);
            console.log(`New course fees: ₹${req.body.totalFees}`);
            
            // Adjust pending fees: new course fees - total paid amount
            const adjustedPendingFees = Math.max(0, req.body.totalFees - totalPaidAmount);
            
            console.log(`Adjusted pending fees: ₹${adjustedPendingFees}`);
            
            // Update pending fees
            student.pendingFees = adjustedPendingFees;
            
            // UPDATE ALL RECEIPTS WITH NEW COURSE ID
            const updateResult = await FeeReceipt.updateMany(
                { student: student._id },
                { $set: { course: req.body.course } }
            );
            console.log(`✅ Updated ${updateResult.modifiedCount} receipts with new course ID`);
            console.log('Update result:', updateResult);
        }

        // Handle EMI details update when payment plan changes
        if (req.body.emiDetails) {
            console.log('EMI details received:', req.body.emiDetails);
            // Parse if it's a string
            let emiDetails = req.body.emiDetails;
            if (typeof emiDetails === 'string') {
                try {
                    emiDetails = JSON.parse(emiDetails);
                } catch (e) {
                    console.error("Error parsing emiDetails:", e);
                    emiDetails = null;
                }
            }
            if (emiDetails) {
                student.emiDetails = emiDetails;
                console.log('EMI details updated');
            }
        }

        student.firstName = req.body.firstName || student.firstName;
        student.middleName = req.body.middleName || student.middleName;
        student.lastName = req.body.lastName || student.lastName;
        student.email = req.body.email || student.email;
        student.dob = req.body.dob || student.dob;
        student.gender = req.body.gender || student.gender;
        student.address = req.body.address || student.address;
        student.state = req.body.state || student.state;
        student.city = req.body.city || student.city;
        student.pincode = req.body.pincode || student.pincode;
        student.mobileStudent = req.body.mobileStudent || student.mobileStudent;
        student.mobileParent = req.body.mobileParent || student.mobileParent;
        student.contactHome = req.body.contactHome || student.contactHome;
        student.education = req.body.education || student.education;
        student.aadharCard = req.body.aadharCard || student.aadharCard;
        
        student.relationType = req.body.relationType || student.relationType;
        student.occupationType = req.body.occupationType || student.occupationType;
        student.occupationName = req.body.occupationName || student.occupationName;
        student.motherName = req.body.motherName || student.motherName;
        student.reference = req.body.reference || student.reference;
        
        if(req.body.course) {
            student.course = req.body.course;
            console.log('Student course updated to:', req.body.course);
        }
        if(req.body.batch) student.batch = req.body.batch;
        if(req.body.batchStartDate) student.batchStartDate = req.body.batchStartDate;
        if(req.body.paymentPlan) student.paymentPlan = req.body.paymentPlan;
        if(req.body.totalFees !== undefined) student.totalFees = req.body.totalFees;

        if(req.body.isPhotos !== undefined) student.isPhotos = req.body.isPhotos;
        if(req.body.isIDProof !== undefined) student.isIDProof = req.body.isIDProof;
        if(req.body.isMarksheetCertificate !== undefined) student.isMarksheetCertificate = req.body.isMarksheetCertificate;
        if(req.body.isAddressProof !== undefined) student.isAddressProof = req.body.isAddressProof;
        
        if(req.body.isActive !== undefined) student.isActive = req.body.isActive;

        if (req.file) student.studentPhoto = req.file.path.replace(/\\/g, "/");
        if(req.body.admissionDate) student.admissionDate = req.body.admissionDate;

        const updatedStudent = await student.save();
        console.log('✅ Student saved successfully');
        console.log('Updated student course:', updatedStudent.course);
        res.json(updatedStudent);
    } else {
        res.status(404); throw new Error('Student not found');
    }
});

const resetStudentLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
        res.status(404); throw new Error('Student not found');
    }

    if (!student.userId) {
        res.status(400); throw new Error('Student is not registered yet. Please confirm registration first.');
    }

    const user = await User.findById(student.userId);
    if (!user) {
        res.status(404); throw new Error('Associated User account not found');
    }

    user.username = username || user.username;
    if (password) {
        user.password = password; 
    }
    await user.save();

    if (student.mobileStudent) {
        const msg = `Dear ${student.firstName}, your login details have been updated. User ID: ${user.username}, Password: ${password || '(Unchanged)'}. Smart Institute.`;
        sendSMS(student.mobileStudent, msg).catch(err => console.error('Reset Login SMS failed', err));
    }

    res.json({ message: 'Login details updated successfully', username: user.username });
});
const cancelStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (student) {
        student.isCancelled = true;
        student.cancelledDate = new Date();
        student.isActive = false;
        await student.save();
        res.json({ message: 'Student Admission Cancelled Successfully', _id: student._id });
    } else {
        res.status(404); throw new Error('Student not found');
    }
});

const reactivateStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (student) {
        student.isCancelled = false;
        student.cancelledDate = null;
        student.isActive = true;
        await student.save();
        res.json({ message: 'Student Admission Reactivated Successfully', _id: student._id });
    } else {
        res.status(404); throw new Error('Student not found');
    }
});

const getExamPendingStudents = asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 10, branchId } = req.query;
    const limit = Number(pageSize) || 10;
    const skip = limit * (Number(page) - 1);

    let query = { isDeleted: false, isRegistered: true, isCancelled: false };

    if (req.user.role !== 'Super Admin' && req.user.branchId) {
        query.branchId = req.user.branchId;
    } else if (branchId) {
        query.branchId = branchId;
    }

    // Fetch all relevant students to filter in JS (for complex date logic)
    const allStudents = await Student.find(query)
        .populate('course', 'name duration durationType shortName')
        .lean();

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Filter students whose course ends within 30 days or has already ended
    let pendingStudents = allStudents.filter(student => {
        if (!student.course || !student.admissionDate) return false;

        const startDate = new Date(student.admissionDate);
        const duration = student.course.duration || 0;
        const type = student.course.durationType || 'Month';

        let endDate = new Date(startDate);
        if (type === 'Month') endDate.setMonth(endDate.getMonth() + duration);
        else if (type === 'Year') endDate.setFullYear(endDate.getFullYear() + duration);
        else if (type === 'Days') endDate.setDate(endDate.getDate() + duration);

        student.courseEndDate = endDate;
        
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Show only if ending in the next 30 days, but hasn't ended yet (before completion)
        return endDate >= now && endDate <= thirtyDaysFromNow;
    });

    // Check if exam already taken OR already requested
    const studentIds = pendingStudents.map(s => s._id);
    
    const [results, activeRequests, cancelledRequests] = await Promise.all([
        ExamResult.find({ student: { $in: studentIds }, isDeleted: false }).lean(),
        ExamRequest.find({ student: { $in: studentIds }, isDeleted: false, status: { $ne: 'Cancelled' } }).lean(),
        ExamRequest.find({ student: { $in: studentIds }, isDeleted: false, status: 'Cancelled' }).sort({ updatedAt: -1 }).lean()
    ]);

    const studentsWhoTookExam = new Set(results.map(r => r.student.toString()));
    const studentsWhoRequestedExam = new Set(activeRequests.map(r => r.student.toString()));
    
    // Map cancellation reasons (latest first)
    const cancellationMap = {};
    cancelledRequests.forEach(cr => {
        if (!cancellationMap[cr.student.toString()]) {
            cancellationMap[cr.student.toString()] = cr.cancellationReason;
        }
    });

    // Keep only those who haven't taken the exam AND haven't requested it yet
    pendingStudents = pendingStudents.filter(s => 
        !studentsWhoTookExam.has(s._id.toString()) && 
        !studentsWhoRequestedExam.has(s._id.toString())
    ).map(s => ({
        ...s,
        cancellationReason: cancellationMap[s._id.toString()] || ''
    }));

    // Sort by end date (closest first)
    pendingStudents.sort((a, b) => a.courseEndDate - b.courseEndDate);

    const count = pendingStudents.length;
    const paginatedStudents = pendingStudents.slice(skip, skip + limit);

    res.json({ 
        students: paginatedStudents, 
        page: Number(page), 
        pages: Math.ceil(count / limit), 
        count 
    });
});

module.exports = { 
    getStudents, 
    getStudentById, 
    createStudent, 
    updateStudent, 
    confirmStudentRegistration, 
    deleteStudent, 
    toggleStudentStatus, 
    resetStudentLogin, 
    getNextRegNo, 
    cancelStudent,
    reactivateStudent,
    getExamPendingStudents 
};
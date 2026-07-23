const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('../models/Student');
const Branch = require('../models/Branch');
const Course = require('../models/Course');
const generateEnrollmentNumber = require('../utils/enrollmentGenerator');

const sampleFirstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Diya', 'Saanvi', 'Aditi', 'Riya', 'Pari', 'Kavya', 'Avani', 'Khushi', 'Pooja'
];

const sampleLastNames = [
  'Patel', 'Shah', 'Sharma', 'Verma', 'Singh', 'Desai', 'Mehta', 'Joshi', 'Chaudhary', 'Solanki'
];

async function add20Admissions() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_erp');
    console.log('Connected to MongoDB successfully.');

    // 1. Find Branches
    const bhestanBranch = await Branch.findOne({ name: /Bhestan/i });
    const godadaraBranch = await Branch.findOne({ name: /Godadara/i });

    if (!bhestanBranch || !godadaraBranch) {
      throw new Error('Branches not found in database.');
    }

    console.log(`Bhestan Branch ID: ${bhestanBranch._id} (${bhestanBranch.name})`);
    console.log(`Godadara Branch ID: ${godadaraBranch._id} (${godadaraBranch.name})`);

    // 2. Find Course
    const course = await Course.findOne({ isDeleted: { $ne: true } });
    if (!course) {
      throw new Error('No course found in database.');
    }
    console.log(`Selected Course: ${course.name} (ID: ${course._id})`);

    const contactNo = '9054578057';
    const today = new Date(); // 2026-07-23

    const createdStudents = [];

    // Helper to generate 10 students for a branch
    async function createStudentsForBranch(branch, batchName, count) {
      console.log(`\n--- Creating ${count} admissions for ${branch.name} ---`);
      for (let i = 0; i < count; i++) {
        const firstName = sampleFirstNames[i % sampleFirstNames.length];
        const lastName = sampleLastNames[i % sampleLastNames.length];
        const enrollmentNo = await generateEnrollmentNumber(branch._id);

        const studentData = {
          enrollmentNo,
          firstName,
          middleName: 'Kumar',
          lastName,
          relationType: 'Father',
          gender: i % 2 === 0 ? 'Male' : 'Female',
          dob: new Date('2002-05-15'),
          admissionDate: today,
          registrationDate: today,

          // Contact Details
          mobileStudent: contactNo,
          mobileParent: contactNo,
          contactHome: contactNo,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Date.now().toString().slice(-4)}@gmail.com`,

          // Address
          address: `Plot No ${10 + i}, Near Station Road`,
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395002',

          // Academic
          course: course._id,
          batch: batchName,
          branchId: branch._id,
          branchName: branch.name,

          // Fees
          totalFees: course.totalFees || 5000,
          pendingFees: course.totalFees || 5000,
          paymentPlan: 'One Time',
          paymentMode: 'Cash',
          isAdmissionFeesPaid: false,
          admissionFeeAmount: 0,
          reference: 'Direct',
          isActive: true
        };

        const newStudent = await Student.create(studentData);
        createdStudents.push(newStudent);
        console.log(`[${createdStudents.length}/20] Added: ${newStudent.firstName} ${newStudent.lastName} | Branch: ${branch.name} | Enrollment: ${newStudent.enrollmentNo}`);
      }
    }

    // Create 10 for Bhestan
    await createStudentsForBranch(bhestanBranch, 'BATCH-B01', 10);

    // Create 10 for Godadara
    await createStudentsForBranch(godadaraBranch, 'BATCH-G01', 10);

    console.log('\n========================================');
    console.log(`SUCCESS: Created ${createdStudents.length} student admissions for today (${today.toISOString().split('T')[0]})!`);
    console.log('========================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

add20Admissions();

const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');

const branchId = 'bbdfec9f4c34795332f0d738';
const courseId = '290e1612ed1bd2b3ea38e054';
const createdBy = '6a295b34834aebd003979e0f';
const allocatedUsers = {
  direct: '6a295b34834aebd003979e0f',
  rehan: '6a295b34834aebd003979e0f',
  harshal: '6a1fb95fa046d8babb473cee',
  chandan: '6a27d36a499f2aa6c53fc922'
};

const date = new Date('2026-06-18T00:00:00.000Z');

const inquiries = [
  { firstName: 'Umar', middleName: 'Ansari', lastName: 'Rehan', referenceBy: 'Direct', allocatedTo: allocatedUsers.direct },
  { firstName: 'Aarav', middleName: 'Kumar', lastName: 'Shah', referenceBy: 'Ansari Rehanssss', allocatedTo: allocatedUsers.rehan },
  { firstName: 'Priya', middleName: 'Rajeshvari', lastName: 'Rajput', referenceBy: 'HARSHAL BOKADE', allocatedTo: allocatedUsers.harshal },
  { firstName: 'Neha', middleName: 'Kishor', lastName: 'Patel', referenceBy: 'CHANDAN CHAUBEY', allocatedTo: allocatedUsers.chandan },
  { firstName: 'Riya', middleName: 'Vijay', lastName: 'Panchal', referenceBy: 'Direct', allocatedTo: allocatedUsers.direct },
  { firstName: 'Sahil', middleName: 'Mukesh', lastName: 'Mishra', referenceBy: 'Ansari Rehanssss', allocatedTo: allocatedUsers.rehan },
  { firstName: 'Kavya', middleName: 'Amit', lastName: 'Soni', referenceBy: 'HARSHAL BOKADE', allocatedTo: allocatedUsers.harshal },
  { firstName: 'Tanish', middleName: 'Rajesh', lastName: 'Gupta', referenceBy: 'CHANDAN CHAUBEY', allocatedTo: allocatedUsers.chandan },
  { firstName: 'Mansi', middleName: 'Prakash', lastName: 'Sharma', referenceBy: 'Direct', allocatedTo: allocatedUsers.direct },
  { firstName: 'Dev', middleName: 'Suresh', lastName: 'Patel', referenceBy: 'Ansari Rehanssss', allocatedTo: allocatedUsers.rehan }
];

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/education_erp';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const docs = inquiries.map((item, index) => ({
    firstName: item.firstName,
    middleName: item.middleName,
    relationType: 'Father',
    lastName: item.lastName,
    gender: index % 2 === 0 ? 'Male' : 'Female',
    dob: new Date(`200${index % 10}-01-0${(index % 9) + 1}T00:00:00.000Z`),
    email: `${item.firstName.toLowerCase()}.${item.lastName.toLowerCase()}@example.com`,
    contactHome: `90545780${String(60 + index).padStart(2, '0')}`,
    contactStudent: `90545780${String(60 + index).padStart(2, '0')}`,
    contactParent: `90545780${String(60 + index).padStart(2, '0')}`,
    education: 'Ghh',
    address: `Test Address ${index + 1}`,
    state: 'Gujarat',
    city: 'Surat',
    interestedCourse: courseId,
    branchId,
    source: 'Walk-in',
    referenceBy: item.referenceBy,
    isExternalRef: false,
    inquiryDate: date,
    status: 'Open',
    followUpDate: null,
    followUpDetails: '',
    followUpCount: 0,
    allocatedTo: item.allocatedTo,
    createdBy,
    isDeleted: false,
    followUpHistory: [],
    remarks: ''
  }));

  const inserted = await Inquiry.insertMany(docs);
  console.log(`Inserted ${inserted.length} offline inquiries.`);
  inserted.forEach((doc) => {
    console.log(`${doc.firstName} ${doc.middleName} ${doc.lastName} | ${doc.referenceBy} | ${doc._id}`);
  });

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Seed offline inquiries failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exitCode = 1;
});

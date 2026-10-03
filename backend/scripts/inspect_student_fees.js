const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const names = ['Mahima', 'Gulnoor', 'Hasnain', 'Sarvesh'];
  for (const name of names) {
    console.log('\n======================================================');
    console.log('=== SEARCHING FOR:', name, '===');
    console.log('======================================================');
    const students = await db.collection('students').find({
      $or: [
        { fullName: { $regex: name, $options: 'i' } },
        { studentName: { $regex: name, $options: 'i' } },
        { firstName: { $regex: name, $options: 'i' } },
        { name: { $regex: name, $options: 'i' } }
      ]
    }).toArray();
    
    for (const s of students) {
      console.log('Student ID:', s._id);
      console.log('Name:', s.fullName || s.studentName || s.name, 'Surname:', s.surname, 'Father:', s.fatherName);
      console.log('Branch:', s.branch || s.branchName, 'branchId:', s.branchId);
      console.log('Enrollment:', s.enrollmentNo || s.enrollment);
      console.log('Student Object:', JSON.stringify(s, null, 2));
      
      const receipts = await db.collection('feereceipts').find({
        $or: [
          { studentId: s._id },
          { studentId: s._id.toString() },
          { student: s._id },
          { student_id: s._id }
        ]
      }).sort({ date: 1, createdAt: 1 }).toArray();
      
      console.log('FeeReceipts count:', receipts.length);
      for (const r of receipts) {
        console.log('Receipt:', JSON.stringify(r, null, 2));
      }
    }
  }
  await mongoose.disconnect();
}
check();

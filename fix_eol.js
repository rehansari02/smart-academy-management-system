const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/SyllabusManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

// Replace the block that has \n instead of \r\n
const oldBlock = `                <StudentDetailView \n                  studentId={activeDetailStudent}\n                  onClose={() => setActiveDetailStudent(null)}\n                  student={filteredStudents.find(s => s._id === activeDetailStudent)}\n                  selectedSubject={selectedSubject}\n                  subjectChapters={subjectChapters}\n                  subjectProjects={subjectProjects}\n                  batchId={batchId}\n                  courseId={courseId}\n                  branchId={branchId}\n                  getStudentStartDate={getStudentStartDate}\n                  getCourseEndDate={getCourseEndDate}\n                  getDaysRemainingText={getDaysRemainingText}\n                  holidays={holidays}\n                  user={user}\n                />`;

const newBlock = `                <StudentDetailView \r\n                  studentId={activeDetailStudent}\r\n                  onClose={() => setActiveDetailStudent(null)}\r\n                  student={filteredStudents.find(s => s._id === activeDetailStudent)}\r\n                  selectedSubject={selectedSubject}\r\n                  subjectChapters={subjectChapters}\r\n                  subjectProjects={subjectProjects}\r\n                  batchId={batchId}\r\n                  courseId={courseId}\r\n                  branchId={branchId}\r\n                  getStudentStartDate={getStudentStartDate}\r\n                  getCourseEndDate={getCourseEndDate}\r\n                  getDaysRemainingText={getDaysRemainingText}\r\n                  holidays={holidays}\r\n                  user={user}\r\n                />`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(p, c, 'utf-8');
  console.log('Line endings fixed!');
} else {
  console.log('Block with \\n not found, checking line endings...');
  // Check if the block with \r\n exists
  if (c.includes(newBlock)) {
    console.log('Block already has \\r\\n, no fix needed.');
  } else {
    console.log('Could not find the block at all.');
  }
}

const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/SyllabusManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

const startMarker = '<StudentDetailView ';
const endMarker = '/>';

// Find all instances
let idx = 0;
let found = false;
while ((idx = c.indexOf(startMarker, idx)) >= 0) {
  const endIdx = c.indexOf(endMarker, idx) + 2;
  const block = c.substring(idx, endIdx);
  
  if (block.includes('activeDetailStudent') && block.includes('filteredStudents.find')) {
    // This is our target
    const newBlock = `                <StudentDetailView 
                  studentId={activeDetailStudent}
                  onClose={() => setActiveDetailStudent(null)}
                  student={filteredStudents.find(s => s._id === activeDetailStudent)}
                  selectedSubject={selectedSubject}
                  subjectChapters={subjectChapters}
                  subjectProjects={subjectProjects}
                  batchId={batchId}
                  courseId={courseId}
                  branchId={branchId}
                  getStudentStartDate={getStudentStartDate}
                  getCourseEndDate={getCourseEndDate}
                  getDaysRemainingText={getDaysRemainingText}
                  holidays={holidays}
                  user={user}
                />`;
    
    c = c.substring(0, idx) + newBlock + c.substring(endIdx);
    console.log('Props updated successfully!');
    found = true;
    break;
  }
  idx = endIdx;
}

if (!found) {
  console.log('Could not find the StudentDetailView props block');
} else {
  fs.writeFileSync(p, c, 'utf-8');
}

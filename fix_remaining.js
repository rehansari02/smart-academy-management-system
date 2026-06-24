const fs = require('fs');

// ── Fix 1: Backend controller - remove duplicate exports ──────────
const ctrlPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/backend/controllers/syllabusLogController.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf-8');

// The script added new functions before module.exports, then replaced module.exports = { with a hardcoded list
// But the original exports (after module.exports = {) are still there inside the {}
// We need to remove the duplicate original exports but keep the hardcoded list

// Current structure:
// module.exports = {
//   createSyllabusLog,    <- hardcoded replacement
//   getLogsForStudentSubject,
//   ...,
//   approveChangeRequest, <- hardcoded replacement
//   createSyllabusLog,    <- original exports still here!
//   getLogsForStudentSubject,
//   ...,
// };

// Strategy: Find the pattern "module.exports = { ... };" and replace it completely
// with a clean version
const exportStart = ctrl.indexOf('module.exports = {');
const exportEnd = ctrl.indexOf('};', exportStart) + 2;

const cleanExports = `module.exports = {
  createSyllabusLog,
  getLogsForStudentSubject,
  getLogsForSubjectBatch,
  updateSyllabusLog,
  deleteSyllabusLog,
  startChapter,
  completeChapter,
  completeProjects,
  getChapterStatus,
  getActivityLog,
  stopChapter,
  undoProject,
  undoCompleteChapter,
  finalCompleteChapter,
  getChangeRequests,
  approveChangeRequest,
};`;

ctrl = ctrl.substring(0, exportStart) + cleanExports;
fs.writeFileSync(ctrlPath, ctrl, 'utf-8');
console.log('Fix 1: Cleaned up duplicate exports');

// ── Fix 2: Add changeRequestPending to getChapterStatus response ──
// Add ChapterChangeRequest import and query in getChapterStatus
if (ctrl.includes("const ChapterChangeRequest = require('../models/ChapterChangeRequest');")) {
  console.log('ChapterChangeRequest already imported');
} else {
  console.log('ChapterChangeRequest import missing - already added by previous script');
}

// Add changeRequestPending query logic to getChapterStatus
// Find where chapterStatuses are built and add pending check
const statusMapCode = `  // Build chapter status map`;
ctrl = ctrl.replace(
  statusMapCode,
  `  // Fetch pending change requests for this student+subject
  const pendingRequests = await ChapterChangeRequest.find({
    studentId,
    subjectId,
    status: 'pending',
  }).lean();
  const pendingChapterIds = new Set(pendingRequests.map(r => r.chapterId.toString()));

  // Build chapter status map`
);

// Add changeRequestPending flag to each chapter status
ctrl = ctrl.replace(
  `      activity,
    };`,
  `      activity,
      changeRequestPending: cid ? pendingChapterIds.has(cid) : false,
    };`
);

fs.writeFileSync(ctrlPath, ctrl, 'utf-8');
console.log('Fix 2: Added changeRequestPending to getChapterStatus');

// ── Fix 3: Frontend - Fix handleCompleteAllProjects (window.confirm -> Swal) ──
const frontPath = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';
let front = fs.readFileSync(frontPath, 'utf-8');

// Replace the window.confirm in handleCompleteAllProjects
const oldConfirm = `    if (!window.confirm(\`Mark all \${pendingProjects.length} pending projects as completed?\`)) return;`;
const newSwal = `    const confirmResult = await Swal.fire({
      title: 'All Projects Completed?',
      text: \`Mark all \${pendingProjects.length} pending projects as completed?\`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Complete All',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: { container: 'z-[9999]' },
    });
    if (!confirmResult.isConfirmed) return;`;

if (front.includes(oldConfirm)) {
  front = front.replace(oldConfirm, newSwal);
  console.log('Fix 3a: Replaced window.confirm in handleCompleteAllProjects with Swal');
} else {
  console.log('Fix 3a: Could not find handleCompleteAllProjects confirm');
}

// Fix Final Complete button condition - remove totalCount > 0 restriction
const oldFinalCondition = `{isRunning && completedCount === totalCount && totalCount > 0 && (`;
const newFinalCondition = `{isRunning && completedCount === totalCount && (completedCount > 0 || totalCount === 0) && (`;
if (front.includes(oldFinalCondition)) {
  front = front.replace(oldFinalCondition, newFinalCondition);
  console.log('Fix 3b: Fixed Final Complete button condition');
} else {
  console.log('Fix 3b: Could not find Final Complete condition');
}

fs.writeFileSync(frontPath, front, 'utf-8');
console.log('Fix 3: Frontend fixes applied');

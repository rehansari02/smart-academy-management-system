const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';
let c = fs.readFileSync(p, 'utf-8');

// Fix 1: Per-chapter activity - show project names instead of count
const oldActivity = `                            {act.projects?.length > 0 && \` (\${act.projects.length} projects)\`}`;
const newActivity = `                            {act.projects?.length > 0 && \` (\${act.projects.map(p => p.projectName || p.projectId).join(', ')})\`}`;

if (c.includes(oldActivity)) {
  c = c.replace(oldActivity, newActivity);
  console.log('Fixed per-chapter activity display!');
} else {
  console.log('Could not find per-chapter activity text');
}

// Fix 2: Activity log panel - show projectNames inline (already does, but add chapter name if missing)
// Check the activity panel display
const oldPanel = `                  {act.projectNames.length > 0 && (
                    <span className=\"text-emerald-600\"> (projects: {act.projectNames.join(', ')})</span>
                  )}`;
const newPanel = `                  {act.projectNames.length > 0 && (
                    <span className=\"text-emerald-600\"> — projects: {act.projectNames.join(', ')}</span>
                  )}`;

if (c.includes(oldPanel)) {
  c = c.replace(oldPanel, newPanel);
  console.log('Fixed activity panel display!');
} else {
  console.log('Could not find activity panel text - checking alternative...');
  // Try to find any variant
  const idx = c.indexOf('projectNames.length');
  if (idx >= 0) {
    console.log('Found projectNames at index', idx);
    console.log('Context:', c.substring(idx - 30, idx + 100));
  }
}

fs.writeFileSync(p, c, 'utf-8');
console.log('File saved!');

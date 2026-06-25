const fs = require('fs');
const path = 'd:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/reports/BatchWiseRegister.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix extra leading spaces on line 347 — "        const getCourseIdValue" -> "    const getCourseIdValue"
content = content.replace('        const getCourseIdValue = (value) => {', '    const getCourseIdValue = (value) => {');

fs.writeFileSync(path, content, 'utf8');
console.log('Done! Indentation fixed.');

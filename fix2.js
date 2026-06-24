const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/SyllabusManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

// Find the LEVEL 6 marker
const marker = '      {/* LEVEL 6: EDIT SUBJECT PARAMETERS */}';
const idx = c.indexOf(marker);

// Go back ~200 chars to see the closing structure
console.log('Context before LEVEL 6 marker:');
console.log(JSON.stringify(c.substring(idx - 200, idx)));

// Now fix the missing closing brace
// Current: '              )\r\n              </div>\r\n            )}'
// Should be: '              )}\r\n              </div>\r\n            )}'

const search = '              )\r\n              </div>\r\n            )}      {/* LEVEL 6:';
if (c.includes(search)) {
  const replace = '              )}\r\n              </div>\r\n            )}      {/* LEVEL 6:';
  c = c.replace(search, replace);
  fs.writeFileSync(p, c, 'utf-8');
  console.log('Fixed!');
  
  // Show fixed context
  const newIdx = c.indexOf(marker);
  console.log('After fix:');
  console.log(JSON.stringify(c.substring(newIdx - 200, newIdx)));
} else {
  console.log('Pattern not found');
  // Show what's actually there
  const before = c.substring(idx - 200, idx);
  // Find the solitary ')' 
  console.log('Looking for the ) patterns...');
}

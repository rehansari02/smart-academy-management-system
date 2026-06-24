const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';
let c = fs.readFileSync(p, 'utf-8');

// Fix the extra closing </div> in the super admin panel IIFE
// Current broken: "        </div>\n      )}\n        </div>\n        )}\n        {modRequests.length > 0 && ("
// Should be:      "        </div>\n      )}\n        {modRequests.length > 0 && ("

const broken = '        </div>\n      )}\n        </div>\n        )}\n        {modRequests.length > 0 && (\n';
const fixed = '        </div>\n      )}\n        {modRequests.length > 0 && (\n';

if (c.includes(broken)) {
  c = c.replace(broken, fixed);
  console.log('Fixed extra closing div!');
} else {
  // Try with \r\n
  const broken2 = '        </div>\r\n      )}\r\n        </div>\r\n        )}\r\n        {modRequests.length > 0 && (\r\n';
  const fixed2 = '        </div>\r\n      )}\r\n        {modRequests.length > 0 && (\r\n';
  if (c.includes(broken2)) {
    c = c.replace(broken2, fixed2);
    console.log('Fixed extra closing div (\\r\\n)!');
  } else {
    console.log('Could not find the broken pattern. Searching...');
    const idx = c.indexOf('modRequests.length > 0');
    if (idx >= 0) {
      console.log('Context before:', JSON.stringify(c.substring(Math.max(0, idx - 120), idx)));
    }
  }
}

fs.writeFileSync(p, c, 'utf-8');

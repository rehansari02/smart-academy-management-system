const fs = require('fs');
const path = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/StudentDetailView.jsx';
let c = fs.readFileSync(path, 'utf-8');

// Fix the closing structure: the modal and panel should be inside the main wrapper div
// Current broken structure:
//       </div>    <- closes main content div
//     </div>      <- closes wrapper div (WRONG - closes too early)
//       {/* Final Complete Modal */}
//       ...
//       {/* Super Admin Panel */}
//       ...
//     </div>      <- EXTRA unmatched div
//   );
// };

// Fix: remove the early closing </div> so modal/panel stay inside wrapper

// Find and fix: "    </div>\n\n      {/* Final Complete Modal */}"
// Should become: "    </div>\n\n      {/* Final Complete Modal */}"
// But without the early closing </div> before it

// The problematic sequence is: </div>\n    </div>\n\n      {/* Final Complete Modal */}
// The first </div> closes main content, second </div> closes wrapper too early
// Remove the second </div>

const wrongSequence = '    </div>\n    </div>\n\n      {/* Final Complete Modal */}';
const correctSequence = '    </div>\n\n      {/* Final Complete Modal */}';

if (c.includes(wrongSequence)) {
  c = c.replace(wrongSequence, correctSequence);
  console.log('Fixed closing structure!');
} else {
  // Try with \r\n
  const wrongSequence2 = '    </div>\r\n    </div>\r\n\r\n      {/* Final Complete Modal */}';
  const correctSequence2 = '    </div>\r\n\r\n      {/* Final Complete Modal */}';
  if (c.includes(wrongSequence2)) {
    c = c.replace(wrongSequence2, correctSequence2);
    console.log('Fixed closing structure (\\r\\n)!');
  } else {
    console.log('Could not find the pattern. Checking context around Final Complete Modal...');
    const idx = c.indexOf('Final Complete Modal');
    if (idx >= 0) {
      const before = c.substring(Math.max(0, idx - 80), idx);
      console.log('Context before:', JSON.stringify(before));
    }
  }
}

fs.writeFileSync(path, c, 'utf-8');
console.log('Saved!');

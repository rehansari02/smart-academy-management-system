const fs = require('fs');
const p = 'D:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/utility/SyllabusManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

// Current structure (lines 2038-2040):
//   </div>            // closes overflow-x-auto
//   </div>            // closes space-y-4 (added by previous fix)
//   )}                // closes {step === 5 && (...)} (added by previous fix)
//
// MISSING: )} to close the inner {studentsLoading ? ... : ...} ternary expression!
// The ) closes the ternary paren, } closes the inner expression.
//
// Fix: Add )} between the two </div> tags.
//
// From:
//                </div>
//              </div>
//            )}
//
// To:
//                </div>
//              )}
//              </div>
//            )}

const search = '                </div>\r\n              </div>\r\n            )}      {/* LEVEL 6: EDIT SUBJECT PARAMETERS */}';
const replace = '                </div>\r\n              )}\r\n              </div>\r\n            )}      {/* LEVEL 6: EDIT SUBJECT PARAMETERS */}';

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync(p, c, 'utf-8');
  console.log('Fix applied successfully!');
  const lines = c.split('\r\n');
  for (let i = 2035; i <= 2045; i++) {
    console.log(i + ': ' + JSON.stringify(lines[i-1]));
  }
} else {
  console.log('Pattern not found! Trying alternative search...');
  // Try without the full LEVEL 6 text
  const altSearch = '                </div>\r\n              </div>\r\n            )}      {/*';
  if (c.includes(altSearch)) {
    const altReplace = '                </div>\r\n              )}\r\n              </div>\r\n            )}      {/*';
    c = c.replace(altSearch, altReplace);
    fs.writeFileSync(p, c, 'utf-8');
    console.log('Fix applied with alt pattern!');
    const lines = c.split('\r\n');
    for (let i = 2035; i <= 2045; i++) {
      console.log(i + ': ' + JSON.stringify(lines[i-1]));
    }
  } else {
    console.log('Still not found. Debugging...');
    const idx = c.indexOf('LEVEL 6: EDIT SUBJECT PARAMETERS');
    if (idx >= 0) {
      const before = c.substring(idx - 30, idx);
      console.log('Exact string before LEVEL 6:');
      console.log(JSON.stringify(before));
    }
  }
}

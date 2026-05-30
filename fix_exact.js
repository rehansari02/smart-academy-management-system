const fs = require('fs');

const filePath = 'frontend/src/pages/admin/master/StudentAdmission.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = content.split('\n');

// We need to replace lines around 1704-1711
// Current state (1-indexed):
// 1703: '                            </div>'  (28 spaces) - closes radio indicator div
// 1704: '                          </div>'    (26 spaces) - closes card div
// 1705: '                        '             (24 spaces blank)
// 1706: '                                                );' (48 spaces)
// 1707: '                      )}' (22 spaces)
// 1708: '                    </div>'           (20 spaces) - closes mobile cards div
// 1709: '                  )}'                 (18 spaces) - closes ternary
// 1710: '                </div>'               (16 spaces) - closes max-h-60
// 1711: '              </div>'                 (14 spaces) - closes border

console.log('Current lines from 1702 to 1711:');
for (let i = 1702 - 1; i < 1711; i++) {
  console.log(`Line ${i+1}: "${lines[i].replace(/\r$/, '')}" (len=${lines[i].length})`);
}

// The correct structure after 1704 should be:
// 1705: '                        );'    (24 spaces) - closes return (
// 1706: '                      })'      (22 spaces) - closes map callback
// 1707: '                    </div>'     (20 spaces) - closes mobile cards div
// 1708: '                    </>'        (20 spaces) - closes fragment
// 1709: '                  )}'           (18 spaces) - closes ternary
// 1710: '                </div>'         (16 spaces) - closes max-h-60
// 1711: '              </div>'           (14 spaces) - closes border

// Lines 1702-1703 (within card) stay the same
// We keep 1703: card content
// We keep 1704: card close
// Replace 1705-1707 with proper structure

const indentMap = '                        ';  // 24 spaces for return close
const indentThen = '                      ';    // 22 spaces for map close
const indentCardsDiv = '                    ';  // 20 spaces for cards div
const indentFragment = '                    ';  // 20 spaces for fragment
const indentTernary = '                  ';     // 18 spaces for ternary close
const indentMaxh60 = '                ';        // 16 spaces for max-h-60
const indentBorder = '              ';          // 14 spaces for border

// Add CRLF line endings for consistency
const cr = '\r';

lines[1704 - 1] = indentMap + ');' + cr;       // line 5 = return close
lines[1705 - 1] = indentThen + '})' + cr;      // line 6 = map close
lines[1706 - 1] = indentCardsDiv + '</div>' + cr;  // line 7 = mobile cards div close
lines[1707 - 1] = indentFragment + '</>' + cr;     // line 8 = fragment close
lines[1708 - 1] = indentTernary + ')}' + cr;       // line 9 = ternary close
lines[1709 - 1] = indentMaxh60 + '</div>' + cr;    // line 10 = max-h-60 close  
lines[1710 - 1] = indentBorder + '</div>' + cr;    // line 11 = border close

// Remove line 1711 if it's an extra empty line
lines[1711 - 1] = '';  // empty line

content = lines.join('\n');

console.log('\nNew lines from 1702 to 1711:');
const newLines = content.split('\n');
for (let i = 1702 - 1; i < 1711; i++) {
  console.log(`Line ${i+1}: "${newLines[i].replace(/\r$/, '')}" (len=${newLines[i].length})`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nFile saved!');

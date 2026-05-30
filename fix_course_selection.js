const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// ============================
// Find and fix the Course Selection closing section
// ============================

// We need to find the exact closing of the course selection mobile cards
// and properly add </> fragment closing tag at the right place

// Strategy: Find the marker "Mobile cards" and work from there
const mobileCardMarker = '                    {/* Mobile cards */}';
const markerIdx = content.indexOf(mobileCardMarker);
if (markerIdx === -1) {
  console.error('ERROR: Mobile cards marker not found');
  process.exit(1);
}

// Find the closing </div> of the mobile cards div (the md:hidden div)
const searchStart = markerIdx + mobileCardMarker.length;
let closeDivIdx = searchStart;
let foundCount = 0;
const closingDivs = [];
while ((closeDivIdx = content.indexOf('</div>', closeDivIdx + 1)) !== -1 && foundCount < 20) {
  closingDivs.push(closeDivIdx);
  foundCount++;
}

console.log(`Found ${closingDivs.length} </div> tags after mobile cards marker`);
// Show context around each

// The mobile cards section's closing </div> should be the outermost of the md:hidden div
// Let's look at what's after the last </div> before the ternary close

// Find the area after mobile cards
const afterMobileCards = content.slice(searchStart, searchStart + 2000);
console.log('=== Content after mobile cards marker ===');
console.log(afterMobileCards);

// Find the pattern: the mobile cards </div> followed by the ) that closes the ternary
// Try different patterns
const patterns = [
  // Pattern 1: No fragment at all
  { search: '                    </div>\n                  )\n                </div>', replace: '                    </div>\n                    </>\n                  )\n                </div>' },
  // Pattern 2: Fragment at wrong place
  { search: '                    </>\n                  );\n                      })}\n                    </div>\n                  )}\n                </div>', replace: '                  );\n                      })}\n                    </div>\n                    </>\n                  )\n                </div>' },
  // Pattern 3: Different whitespace
  { search: '                    </>\n                  );\n                      })\n                    }\n                  </div>\n                )\n              }\n            </div>', replace: '                  );\n                      })\n                    }\n                  </div>\n                    </>\n                )\n              }\n            </div>' },
];

for (const pattern of patterns) {
  if (content.includes(pattern.search)) {
    console.log(`Found pattern: ${JSON.stringify(pattern.search.slice(0, 50))}...`);
    content = content.replace(pattern.search, pattern.replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed!');
    process.exit(0);
  }
}

console.log('ERROR: Could not find any known pattern');
// Let's search for </> 
const fragIdx = content.indexOf('</>', markerIdx);
console.log(`</> found at index ${fragIdx} (relative position: ${fragIdx - markerIdx})`);
if (fragIdx !== -1) {
  console.log('Context around </>:');
  console.log(JSON.stringify(content.slice(Math.max(0, fragIdx-50), fragIdx+100)));
}
process.exit(1);

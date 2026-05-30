const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// First, remove the incorrectly placed </> tag
// It's currently between a map's closing ) and the })}
// Pattern: after a closing </div> before ); 
// Let's find: </> followed by newline and spaces then );
const wrongFragment = content.indexOf('</>\n                  );\n                      })}');
if (wrongFragment === -1) {
  // Try with \r\n
  const wrongFragment2 = content.indexOf('</>\r\n                  );\r\n                      })}');
  if (wrongFragment2 === -1) {
    console.log('Could not find wrong fragment position, checking alternatives...');
    // Just find </> in the file to see how many there are
    const positions = [];
    let pos = -1;
    while ((pos = content.indexOf('</>', pos + 1)) !== -1) {
      positions.push(pos);
    }
    console.log(`Found ${positions.length} </> tags at positions: ${JSON.stringify(positions)}`);
    console.log('Content around each:');
    positions.forEach(p => {
      console.log(`--- Position ${p} ---`);
      console.log(JSON.stringify(content.slice(p-30, p+60)));
    });
    process.exit(1);
  }
  content = content.slice(0, wrongFragment2) + content.slice(wrongFragment2 + '</>\r\n                  );\r\n                      })}'.length);
  console.log('Removed wrong </> (\\r\\n version)');
} else {
  content = content.slice(0, wrongFragment) + content.slice(wrongFragment + '</>\n                  );\n                      })}'.length);
  console.log('Removed wrong </> (\\n version)');
}

// Now find the mobile cards section's closing </div> followed by ternary closing
const mobileCardsEnd = content.indexOf('                    </div>\n                  )\n                </div>\n              </div>\n\n              {watchCourseSelection &&');
if (mobileCardsEnd === -1) {
  const mobileCardsEnd2 = content.indexOf('                    </div>\r\n                  )\r\n                </div>\r\n              </div>\r\n\r\n              {watchCourseSelection &&');
  if (mobileCardsEnd2 === -1) {
    console.error('ERROR: Could not find mobile cards closing pattern');
    process.exit(1);
  }
  // Insert </> before the )
  const closeParen = content.indexOf(')', mobileCardsEnd2 + 10);
  if (closeParen === -1) {
    console.error('ERROR: Could not find ) after mobile cards');
    process.exit(1);
  }
  content = content.slice(0, closeParen) + '\r\n                    </>\r\n                  ' + content.slice(closeParen);
  console.log('✅ Fragment tag added at correct position (\\r\\n version)!');
} else {
  const closeParen = content.indexOf(')', mobileCardsEnd + 10);
  if (closeParen === -1) {
    console.error('ERROR: Could not find ) after mobile cards');
    process.exit(1);
  }
  content = content.slice(0, closeParen) + '\n                    </>\n                  ' + content.slice(closeParen);
  console.log('✅ Fragment tag added at correct position (\\n version)!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File saved!');

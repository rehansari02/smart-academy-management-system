const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the mobile cards closing div followed by the ternary close
// Search for the exact phrase
const marker = 'Mobile cards';
const markerIdx = content.indexOf(marker);
if (markerIdx === -1) {
  console.error('ERROR: Mobile cards marker not found!');
  process.exit(1);
}

// Find the closing </div> of course selection after the marker
const searchFrom = markerIdx + marker.length;
const closeDivIdx = content.indexOf('</div>', searchFrom);
if (closeDivIdx === -1) {
  console.error('ERROR: </div> not found after mobile cards');
  process.exit(1);
}

// Show 200 chars after the </div> to see the pattern
const afterContent = content.slice(closeDivIdx, closeDivIdx + 200);
console.log('Content after </div>:');
console.log(JSON.stringify(afterContent));
console.log('---');

// Find the ) that closes the ternary
const closeParenIdx = content.indexOf(')', closeDivIdx + 10);
if (closeParenIdx === -1) {
  console.error('ERROR: ) not found after </div>');
  process.exit(1);
}

const betweenContent = content.slice(closeDivIdx, closeParenIdx + 1);
console.log('Between </div> and ):');
console.log(JSON.stringify(betweenContent));

// Insert </> before the )
const beforeInsert = content.slice(0, closeParenIdx);
const afterInsert = content.slice(closeParenIdx);
const newContent = beforeInsert + '\n                    </>\n                  ' + afterInsert;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Fix applied!');

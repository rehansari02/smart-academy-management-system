const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The issue: in the Course Selection section, the ternary has two siblings (table + mobileCards div)
// but they're not wrapped in a fragment. Plus, the </> and ); are misplaced INSIDE the map callback.

// Step 1: Add <opening fragment> after ") : ("
// Search for: `) : (\n                    <table`
// Replace with: `) : (\n                    <>\n                    <table`

const pattern1 = /\)\s*:\s*\(\s*\n(\s*)<table className="hidden md:table w-full text-sm">/;
const match1 = content.match(pattern1);
if (match1) {
  console.log('Step 1: Found ternary start with table at indent:', match1[1].length);
  content = content.replace(pattern1, `) : (\n${match1[1]}<>\n${match1[1]}<table className="hidden md:table w-full text-sm">`);
  console.log('Step 1 done: Added opening fragment tag <>');
} else {
  console.log('Step 1: Pattern not found, trying alternative...');
  // Try alternative pattern
  const altPattern1 = /\) : \(\n\s*<table/;
  if (altPattern1.test(content)) {
    console.log('Found alternative match');
    content = content.replace(
      altPattern1,
      (match) => match.replace('<table', '<>\n                    <table')
    );
  }
}

// Step 2: Fix the misplaced </> and ); inside the map function
// Find: blank line followed by </> followed by );
// These are at 24 and 22 spaces indentation respectively
// Replace with properly indented );

const pattern2 = /\n\s*<\/>\s*\n\s*\)\s*;\s*\n(\s*)\}\)\s*\n\s*<\/div>/;
const match2 = content.match(pattern2);
if (match2) {
  console.log('Step 2: Found misplaced </> and ); at indent:', match2[1].length);
  // The ); should be at the same indent as the return ( statement
  // From the code, return ( is at 28 spaces inside the map
  content = content.replace(pattern2, '\n                            );\n$1})\n$1</div>');
  console.log('Step 2 done: Fixed misplaced fragment tags');
} else {
  console.log('Step 2: Pattern not found, trying alternative...');
  // Try a broader pattern
  const altPattern2 = /<\/>\s*\n\s*\);\s*\n(\s*)\}\)\s*/;
  if (altPattern2.test(content)) {
    content = content.replace(altPattern2, (match, p1) => {
      return `                            );\n${p1})}`;
    });
    console.log('Step 2 done (alternative): Fixed misplaced fragment tags');
  }
}

// Step 3: Add closing fragment before the final )} that closes the ternary
// The ternary closing is: `)}` at 22 spaces indentation followed by `</div>`
// We need to add </> before it

// Find the closing )} that comes after </div> and before the next section
// The pattern is: </div>\n                      )}
const pattern3 = /(<\/div>\s*\n\s*)\)\s*\n(\s*)<\/div>\s*\n\s*<\/div>/;
const match3 = content.match(pattern3);
if (match3) {
  console.log('Step 3: Found ternary closing pattern');
  // We need to add </> before )} that closes the ternary
  content = content.replace(
    pattern3,
    (match, afterDiv, indent) => {
      return `${afterDiv})\n${indent}</>\n${indent}</div>\n${indent}</div>`;
    }
  );
  console.log('Step 3 done: Added closing fragment tag');
} else {
  console.log('Step 3: Pattern not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nFile saved successfully!');

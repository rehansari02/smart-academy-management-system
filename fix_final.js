const fs = require('fs');

const filePath = 'frontend/src/pages/admin/master/StudentAdmission.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and fix the problematic area: 
// After the card's closing </div> inside the mobile cards map,
// there's an extra ); at 48 spaces indent and 
// an extra ) in )}} 

// The pattern to fix:
// The card div closes with `                          </div>`
// Then there's a misplaced `                                                );`
// Then there's `                      )}}` which should be `                      </>`
// Then `                    </div>` (closes mobile cards div)
// Then `                  )}` (closes ternary)

// Let's find the exact text to replace.
// Search for the line with 48 spaces + );
const regex = /(\s{28}<\/div>\s*\n)\s*\n\s{48}\);\s*\n(\s{22})\)\}\s*\n(\s{20}<\/div>\s*\n)(\s{18})\)\}/;
const match = content.match(regex);

if (match) {
  console.log('Found the pattern!');
  console.log('Indents:', {
    cardClose: match[0].match(/\n(\s+)<\/div>/)?.[1]?.length || '?',
  });
  
  // Replace with correct structure:
  // $1 - </div> (28 spaces) - card div close
  // then:                             ); (28 spaces) - return close
  // then:                           })  (26 spaces) - map callback close
  // $3 - </div> (20 spaces) - mobile cards div close  
  // then:                       </> (22 spaces) - fragment close
  // $4 - ) (18 spaces) - ternary close
  // then: } - expression close
  
  // Actually, let me not use capturing groups. Let me use the full match and reconstruct.
  const replacement = `${match[1]}                            );\n                          })}\n${match[3]}${'                      '}</>\n${'                    '})}`;
  // Hmm this is getting complicated. Let me just do a simpler string replacement.
} else {
  console.log('Regex did not match. Trying simpler approach...');
}

// Simpler approach: Find the exact string and replace it
const searchStr = `                          </div>
                        
                                                );
                      })}
                    </div>
                  )}
`;
const replaceStr = `                          </div>
                            );
                          })}
                        </div>
                      </>
                    )}`;

if (content.includes(searchStr)) {
  console.log('Found exact match!');
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('File saved successfully!');
} else {
  console.log('Exact string not found. Trying to find the part without whitespace issues...');
  
  // Let's look at the actual content around line 1700
  const lines = content.split('\n');
  console.log('Looking for clues in lines 1698-1712:');
  for (let i = Math.max(0, 1698-1); i < Math.min(lines.length, 1712); i++) {
    console.log(`Line ${i+1}: len=${lines[i].length} "${lines[i].substring(0,80)}"`);
  }
}

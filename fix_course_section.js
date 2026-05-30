const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is in the Course Selection section.
// Current broken state has the map function's return not properly closed,
// and the closing fragment </> is missing.
// Let's find and fix the problematic area.

// Strategy: Find the closing of the last </div> in the mobile cards map
// and replace everything from there through the closing of the ternary
// with the correct structure.

// The current closing area looks like:
//                           </div>
//                         
//                                                 );
//                       )}}
//                     </div>
//                   )}

// We need it to be:
//                           </div>
//                             );
//                           })}
//                         </div>
//                       </>
//                     )}

// Let's find the specific pattern. The mobile cards section ends with:
//   </div>  <- closes radio indicator
//   (blank) 
//   );      <- misplaced
//   )}}     <- missing </> and extra )
//   </div>  <- closes mobile cards div
//   )}      <- closes ternary + expression

// Pattern to find: ")}}" followed by </div> then )}

const marker = `
                                                );
                      )}}
                    </div>
                  )}`;

if (content.includes(marker)) {
  console.log('Found the broken closing pattern!');
  content = content.replace(marker, `
                            );
                          })}
                        </div>
                      </>
                    )}`);
  console.log('Replaced with correct fragment-closed structure');
} else {
  console.log('Pattern not found. Trying to find alternative pattern...');
  
  // Try without trailing `}`
  const altMarker1 = `
                                                );
                      )}}
                    </div>
                  )}`;
  if (content.includes(altMarker1)) {
    console.log('Found exact pattern match!');
    content = content.replace(altMarker1, `
                            );
                          })}
                        </div>
                      </>
                    )}`);
  } else {
    console.log('Trying broader search...');
    // Find a line with whitespace + )}} followed by </div>
    const regex = /\n(\s+)\)\}\s*\n(\s+)<\/div>\s*\n(\s+)\}\)\s*\n/;
    const match = content.match(regex);
    if (match) {
      console.log('Found pattern with regex:', JSON.stringify(match[0]));
      const indent2 = match[2]; // indent of </div>
      // We need to insert </> before )} with the same indent as )}
      const indent3 = match[3]; // indent of )}
      content = content.replace(
        regex, 
        `\n                            );\n                          })}\n${indent2}</div>\n${indent3}</>\n${indent3})}\n`
      );
      console.log('Fixed using regex pattern');
    } else {
      console.log('Could not find pattern. Trying line-based approach...');
      console.log('Searching for )}} in file...');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(')}}')) {
          console.log(`Line ${i+1}: ${lines[i]}`);
          console.log(`Line ${i+2}: ${lines[i+1]}`);
          console.log(`Line ${i+3}: ${lines[i+2]}`);
          console.log(`Line ${i+4}: ${lines[i+3]}`);
        }
      }
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved!');

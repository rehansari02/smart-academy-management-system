const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the pattern: after the mobile cards closing div, before the ) that closes the ternary
// The pattern is: </div>\n                  )\n                </div>
// We need to add </> before the )

const searchPattern = `                    </div>
                  )
                </div>
              </div>

              {watchCourseSelection && (`;

const replacement = `                    </div>
                    </>
                  )
                </div>
              </div>

              {watchCourseSelection && (`;

const idx = content.indexOf(searchPattern);
if (idx === -1) {
  console.error('ERROR: Pattern not found!');
  process.exit(1);
}

content = content.replace(searchPattern, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fragment closing tag added successfully!');

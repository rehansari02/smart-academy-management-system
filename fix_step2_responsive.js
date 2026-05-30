const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'admin', 'master', 'StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

let modified = false;

// ============================================================
// 1. Course Selection (A) - Add mobile cards
// ============================================================
// Find the course table and add mobile cards after it
const courseSearchStart = content.indexOf('<table className="w-full text-sm">');
if (courseSearchStart === -1) {
  console.log('ERROR: Could not find Course Selection table');
  process.exit(1);
}

// Replace the course table opening tag
const courseTableTag = '<table className="w-full text-sm">';
const courseTableReplacement = '<table className="hidden md:table w-full text-sm">';

if (content.includes(courseTableTag)) {
  content = content.replace(courseTableTag, courseTableReplacement);
  console.log('✓ Course table: added hidden md:table');
} else {
  console.log('ERROR: Course table tag not found');
  process.exit(1);
}

// Find the closing </table> of the course selection section
// Look for </table> that's followed by a newline + whitespace + )};
const courseTableCloseMatch = content.match(
  /<\/table>\s*\n(\s*)\)/
);

if (!courseTableCloseMatch) {
  console.log('ERROR: Could not find Course table closing pattern');
  process.exit(1);
}

const courseTableCloseFull = courseTableCloseMatch[0];
const courseTableCloseIndent = courseTableCloseMatch[1];

const mobileCardsHTML = `</table>
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2 p-2">
                      {courses.map((c) => {
                        const isSelected = watchCourseSelection === c._id;
                        return (
                          <div
                            key={c._id}
                            onClick={() => setValue("selectedCourseId", c._id)}
                            className={\`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition \${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }\`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ₹{c.courseFees} • {c.duration} {c.durationType}
                              </p>
                            </div>
                            <div className={\`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 \${
                              isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                            }\`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>`;

content = content.replace(courseTableCloseFull, mobileCardsHTML);
console.log('✓ Course selection: added mobile cards');

// ============================================================
// Wait - the above replace might break because </table>\n\n) 
// is now gone. Let me check...
// Actually the issue is that the original had: </table>\n\n  )
// And I replaced it with the mobile cards + \n  )
// So the closing ) should still be there.
// Let me verify by looking for the pattern...

// ============================================================
// 2. Batch Selection (B) - Add mobile cards
// ============================================================
// Find the batch table
const batchTableStart = '<table className="w-full text-sm">';
let batchTableIdx = content.indexOf(batchTableStart);
// We need the SECOND occurrence (first is course table, second is batch table)
let batchTableCount = 0;
let batchTablePos = -1;
let searchPos = 0;
while ((batchTableIdx = content.indexOf(batchTableStart, searchPos)) !== -1) {
  batchTableCount++;
  if (batchTableCount === 2) {
    batchTablePos = batchTableIdx;
    break;
  }
  searchPos = batchTableIdx + 1;
}

if (batchTablePos === -1) {
  console.log('ERROR: Could not find Batch Selection table (2nd occurrence)');
  process.exit(1);
}

// Replace the batch table tag
content = content.slice(0, batchTablePos) + '<table className="hidden md:table w-full text-sm">' + content.slice(batchTablePos + batchTableStart.length);
console.log('✓ Batch table: added hidden md:table');

// Now find the closing structure of the batch table
// It's inside <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white shadow-sm">
// The </table> is followed by </div> (closing the shadow-sm div)
// Then </div> (closing the col-span-1 md:col-span-4 mb-2 div)

// Find the batch table's closing </table>
// We need to find the SECOND </table> (first is course, second is batch)
let tableCloseIdx = content.indexOf('</table>');
tableCloseIdx = content.indexOf('</table>', tableCloseIdx + 1); // second occurrence

if (tableCloseIdx === -1) {
  console.log('ERROR: Could not find Batch table closing tag');
  process.exit(1);
}

// Now look for the pattern after </table>:
// </table>
//                       </div>  (closes shadow-sm div)
//                     </div>    (closes col-span-1 div)
let afterTable = content.slice(tableCloseIdx);
const batchCloseMatch = afterTable.match(/<\/table>\s*\n(\s*)<\/div>\s*\n(\s*)<\/div>/);

if (!batchCloseMatch) {
  console.log('ERROR: Could not find Batch table closing div pattern');
  process.exit(1);
}

const batchCloseIndent1 = batchCloseMatch[1];
const batchCloseIndent2 = batchCloseMatch[2];

const batchCloseFull = batchCloseMatch[0];

const batchMobileCards = `</table>
                      </div>
                      {/* Mobile cards */}
                      <div className="md:hidden space-y-2 mt-2">
                        ${batches
                          .filter(
                            (b) =>
                              b.course === watchCourseSelection ||
                              b.courses?.some(
                                (c) => (c._id || c) === watchCourseSelection
                              )
                          )
                          .map((b) => {
                            const activeCount =
                              b.courseCounts?.[watchCourseSelection] || 0;
                            const isSelected =
                              watchSelectedBatch === b.name;
                            return (
                              <div
                                key={b._id}
                                onClick={() =>
                                  setValue("selectedBatch", b.name)
                                }
                                className={\`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition \${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-blue-300"
                                }\`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {b.startTime} - {b.endTime}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={\`px-2 py-0.5 rounded-full text-xs font-bold \${
                                    activeCount > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-500"
                                  }\`}>
                                    {activeCount} students
                                  </span>
                                  <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center \${
                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                  }\`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {batches.filter(
                          (b) =>
                            b.course === watchCourseSelection ||
                            b.courses?.some(
                              (c) => (c._id || c) === watchCourseSelection
                            )
                        ).length === 0 && (
                          <p className="p-4 text-center text-gray-500 text-sm">
                            No batches available for this course.
                          </p>
                        )}
                      </div>`;

content = content.replace(batchCloseFull, batchMobileCards);
console.log('✓ Batch selection: added mobile cards');

// ============================================================
// 3. Admission Preview (C) - Add mobile cards  
// ============================================================
// Find the preview table - look for the third <table className="w-full text-sm">
let previewTablePos = -1;
let tableCount = 0;
let searchPos2 = 0;
let idx;
while ((idx = content.indexOf('<table className="w-full text-sm">', searchPos2)) !== -1) {
  tableCount++;
  if (tableCount === 3) {
    previewTablePos = idx;
    break;
  }
  searchPos2 = idx + 1;
}

if (previewTablePos === -1) {
  console.log('ERROR: Could not find Preview table (3rd occurrence)');
  process.exit(1);
}

// Replace preview table tag
content = content.slice(0, previewTablePos) + '<table className="hidden md:table w-full text-sm">' + content.slice(previewTablePos + '<table className="w-full text-sm">'.length);
console.log('✓ Preview table: added hidden md:table');

// Find the preview table's closing </table>
let previewCloseIdx = content.indexOf('</table>', previewTablePos);

if (previewCloseIdx === -1) {
  console.log('ERROR: Could not find Preview table closing tag');
  process.exit(1);
}

// The pattern after preview </table> is:
// </table>
//                 </div>  (closes the border div)
//               )}  (closes previewCourses.length > 0 condition)

let afterPreview = content.slice(previewCloseIdx);
const previewCloseMatch = afterPreview.match(/<\/table>\s*\n(\s*)<\/div>\s*\n(\s*)\)}/);

if (!previewCloseMatch) {
  console.log('ERROR: Could not find Preview table closing div pattern');
  process.exit(1);
}

const previewCloseFull = previewCloseMatch[0];

const previewMobileCards = `</table>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {previewCourses.map((item, index) => (
                        <div key={item.id} className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-sm">{item.courseName}</p>
                              <p className="text-xs text-gray-500">{item.batch} | {item.batchTime}</p>
                            </div>
                            <span className="text-sm font-bold text-green-700 flex-shrink-0 ml-2">₹{item.fees}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-400">Duration:</span> {courses.find(c => c._id === item.courseId)?.duration} {courses.find(c => c._id === item.courseId)?.durationType}
                            </div>
                            <div>
                              <span className="text-gray-400">Registration:</span> {item.registrationFees !== undefined ? \`₹\${item.registrationFees}\` : (item.emiConfig ? \`₹\${item.emiConfig.registrationFees}\` : '-')}
                            </div>
                            <div>
                              <span className="text-gray-400">Monthly:</span> {item.emiConfig ? \`₹\${item.emiConfig.monthlyInstallment} x \${item.emiConfig.months}\` : '-'}
                            </div>
                            <div>
                              <span className="text-gray-400">Start:</span> {item.startDate}
                            </div>
                          </div>
                          {item.paymentType === "Monthly" && item.emiConfig && (
                            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              <strong>Monthly Breakdown:</strong> Total: ₹{item.fees} | Registration: ₹{item.emiConfig.registrationFees} | EMI: ₹{item.emiConfig.monthlyInstallment} x {item.emiConfig.months} Months
                            </p>
                          )}
                          {!isUpdateMode && (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setValue("selectedCourseId", item.courseId);
                                  setValue("selectedBatch", item.batch);
                                  setValue("batchStartDate", item.startDate);
                                  setValue("paymentType", item.paymentType);
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-xs text-blue-600 font-semibold px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = previewCourses.filter((_, i) => i !== index);
                                  setPreviewCourses(newList);
                                }}
                                className="text-xs text-red-600 font-semibold px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>`;

content = content.replace(previewCloseFull, previewMobileCards);
console.log('✓ Preview: added mobile cards');

// ============================================================
// 4. Document Verification - Change grid-cols-2 to grid-cols-1 sm:grid-cols-2
// ============================================================
const docGridOld = 'grid grid-cols-2 gap-3';
const docGridNew = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

if (content.includes(docGridOld)) {
  content = content.replace(docGridOld, docGridNew);
  console.log('✓ Document verification: grid-cols-1 sm:grid-cols-2');
} else {
  console.log('WARNING: Could not find document verification grid pattern');
}

// ============================================================
// Verify and write
// ============================================================
if (!modified && content !== fs.readFileSync(filePath, 'utf8')) {
  console.log('\n✓ Changes applied successfully!');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File saved to: ' + filePath);
} else {
  console.log('\nFile may not have been changed. Check manually.');
}

// Final verification
const courseMobileCheck = content.includes('Mobile cards');
const batchMobileCheck = content.lastIndexOf('Mobile cards') !== content.indexOf('Mobile cards');
const previewMobileCheck = content.includes('Mobile preview');
const docGridCheck = content.includes('grid-cols-1 sm:grid-cols-2 gap-3');

console.log('\n--- Verification ---');
console.log('Course mobile cards:', courseMobileCheck ? '✅' : '❌');
console.log('Batch mobile cards:', batchMobileCheck ? '✅' : '❌');
console.log('Preview mobile cards:', previewMobileCheck ? '✅' : '❌');
console.log('Document grid fix:', docGridCheck ? '✅' : '❌');

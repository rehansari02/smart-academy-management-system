const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/pages/admin/master/StudentAdmission.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// =============================================
// 1. Fix Course Selection (A) - Add mobile cards
// =============================================
const courseTableRegex = /<table className="w-full text-sm">\s*\n\s*<thead className="bg-gray-50 text-left sticky top-0">\s*\n\s*<tr>\s*\n\s*<th className="p-2">Name<\/th>\s*\n\s*<th className="p-2">Fees<\/th>\s*\n\s*<th className="p-2">Duration<\/th>\s*\n\s*<th className="p-2">Select<\/th>/;

const courseTableMatch = content.match(courseTableRegex);
if (!courseTableMatch) {
  console.error('ERROR: Could not find Course Selection table!');
  process.exit(1);
}

// Find where this table ends
const afterMatch = content.indexOf('</table>', courseTableMatch.index);
if (afterMatch === -1) {
  console.error('ERROR: Could not find closing </table> for Course Selection!');
  process.exit(1);
}

const courseTableEnd = afterMatch + '</table>'.length;
const courseOldContent = content.slice(courseTableMatch.index, courseTableEnd);

// Replace table class to hide on mobile
const courseNewTable = courseOldContent.replace(
  '<table className="w-full text-sm">',
  '<table className="hidden md:table w-full text-sm">'
);

content = content.replace(courseOldContent, courseNewTable);

// Find the new table position and add mobile cards after it
const newTableEnd = content.indexOf('</table>', content.indexOf('hidden md:table'));
const mobileCardsInsert = newTableEnd + 8; // after </table>

const mobileCourseCards = `
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

content = content.slice(0, mobileCardsInsert) + mobileCourseCards + content.slice(mobileCardsInsert);
console.log('✓ Course Selection (A) fixed');

// =============================================
// 2. Fix Batch Selection (B) - Add mobile cards
// =============================================
const batchSectionPos = content.indexOf('B. Batch & Fee Config');
const batchTableStart = content.indexOf('<table className="w-full text-sm">', batchSectionPos);
if (batchTableStart === -1) {
  console.error('ERROR: Could not find Batch Selection table!');
  process.exit(1);
}

let batchTableEnd = content.indexOf('</table>', batchTableStart);
// This is the batch table's closing tag
batchTableEnd += 8;

const batchOldContent = content.slice(batchTableStart, batchTableEnd);

const batchNewTable = batchOldContent.replace(
  '<table className="w-full text-sm">',
  '<table className="hidden md:table w-full text-sm">'
);

content = content.replace(batchOldContent, batchNewTable);

// Now find the insert position for mobile batch cards
// Find the next </div> after the batch table (closing the table container div)
const newBatchTablePos = content.indexOf('hidden md:table', batchSectionPos);
const newBatchTableEnd = content.indexOf('</table>', newBatchTablePos);
const batchContainerEnd = content.indexOf('</div>', newBatchTableEnd + 8);

// There might be another </div> for the col-span-1 md:col-span-4 mb-2 div
// Let's insert after the closing </div> of the batch container
const batchInsertPos = batchContainerEnd + 6;

const mobileBatchCards = `
                      {/* Mobile batch cards */}
                      <div className="md:hidden space-y-2">
                        {batches
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
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={\`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center \${
                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                  }\`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{b.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {b.startTime} - {b.endTime}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={\`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 \${
                                    activeCount > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-500"
                                  }\`}
                                >
                                  {activeCount}
                                </span>
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

content = content.slice(0, batchInsertPos) + mobileBatchCards + content.slice(batchInsertPos);
console.log('✓ Batch Selection (B) fixed');

// =============================================
// 3. Fix Admission Preview (C) - Add mobile cards
// =============================================
const previewSectionPos = content.indexOf('C. Admission Preview');
const previewTableStart = content.indexOf('<table className="w-full text-sm">', previewSectionPos);
if (previewTableStart === -1) {
  console.error('ERROR: Could not find Admission Preview table!');
  process.exit(1);
}

// Find the closing </table> - the preview table can have tfoot, so find the LAST </table> before Payment Option
const paymentSectionPos = content.indexOf('{/* Payment Option', previewSectionPos);
let previewTableEnd = content.lastIndexOf('</table>', paymentSectionPos);
previewTableEnd += 8;

const previewOldContent = content.slice(previewTableStart, previewTableEnd);

const previewNewTable = previewOldContent.replace(
  '<table className="w-full text-sm">',
  '<table className="hidden md:table w-full text-sm">'
);

content = content.replace(previewOldContent, previewNewTable);

// Find where to insert mobile preview cards (right after the </table>)
const newPreviewTableEnd = content.indexOf('</table>', content.indexOf('hidden md:table w-full text-sm', previewSectionPos));
const previewInsertPos = newPreviewTableEnd + 8;

const mobilePreviewCards = `
                    {/* Mobile preview cards */}
                    <div className="md:hidden space-y-3 p-2">
                      {previewCourses.map((item, index) => (
                        <div key={item.id} className="border rounded-lg bg-white overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-sm">#{index + 1}</span>
                            {!isUpdateMode && (
                              <div className="flex gap-2">
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
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = previewCourses.filter((_, i) => i !== index);
                                    setPreviewCourses(newList);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Course</span>
                              <span className="font-medium text-gray-800">{item.courseName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Batch</span>
                              <span className="font-medium text-gray-800">{item.batch}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Time</span>
                              <span className="font-medium text-gray-800">{item.batchTime}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
                              <span className="text-gray-500">Fees</span>
                              <span className="font-semibold text-gray-800">₹{item.fees}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Duration</span>
                              <span className="font-medium text-gray-800">
                                {courses.find(c => c._id === item.courseId)?.duration} {courses.find(c => c._id === item.courseId)?.durationType}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Registration</span>
                              <span className="font-medium text-gray-800">
                                {item.registrationFees !== undefined ? \`₹\${item.registrationFees}\` : (item.emiConfig ? \`₹\${item.emiConfig.registrationFees}\` : '-')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Monthly</span>
                              <span className="font-medium text-gray-800">
                                {item.emiConfig ? \`₹\${item.emiConfig.monthlyInstallment} x \${item.emiConfig.months}\` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {previewCourses.length > 0 && previewCourses[0].paymentType === "Monthly" && previewCourses[0].emiConfig && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                          <strong>Monthly Breakdown:</strong> Total: ₹
                          {previewCourses[0].fees} | Registration: ₹{previewCourses[0].emiConfig.registrationFees} | EMI: ₹{previewCourses[0].emiConfig.monthlyInstallment} x{" "}
                          {previewCourses[0].emiConfig.months} Months
                        </div>
                      )}
                    </div>`;

content = content.slice(0, previewInsertPos) + mobilePreviewCards + content.slice(previewInsertPos);
console.log('✓ Admission Preview (C) fixed');

// =============================================
// 4. Fix Document Verification - single column on tiny screens
// =============================================
content = content.replace('grid grid-cols-2 gap-3', 'grid grid-cols-1 sm:grid-cols-2 gap-3');
console.log('✓ Document Verification grid fixed');

// Write the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ All responsive fixes applied successfully!');

import os, sys

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'pages', 'admin', 'master', 'StudentAdmission.jsx')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ============================================================
# 1. Course Selection (A) - Add hidden md:table + mobile cards + fragment wrapper
# ============================================================

# Find the course table opening tag
old_course_table = '<table className="w-full text-sm">\n                      <thead className="bg-gray-50 text-left sticky top-0">'
new_course_table = '<table className="hidden md:table w-full text-sm">\n                      <thead className="bg-gray-50 text-left sticky top-0">'
if old_course_table in content:
    content = content.replace(old_course_table, new_course_table, 1)
    changes.append("Course table: hidden md:table")
else:
    print("ERROR: Course table tag not found")
    sys.exit(1)

# Find the closing of course selection ternary: </table>\n                  )}
# And replace with: </table>\n                    <>\n  [mobile cards]  \n                  )}
# But wait - we need to first understand the exact pattern

# Let me find the exact content around the closing
# The pattern after the last course <tr> is:
#   </tbody>\n                    </table>\n                  )}
# But actually the indentation might be:
#   </tbody>\n                      </table>\n                  )}

# Let's find what's at the end of the course section
idx = content.find("</table>")
if idx == -1:
    print("ERROR: No </table> found")
    sys.exit(1)

# The first </table> is the course section one
# Let me see what's after it
after_first_table = content[idx:idx+100]
# print("After first </table>:", repr(after_first_table))

# Find the exact closing pattern
# It should be: </table>\n                  )}
course_close_old = '</table>\n                  )}'
course_close_new = '''</table>
                    <>
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2 p-2">
                      {courses.map((c) => {
                        const isSelected = watchCourseSelection === c._id;
                        return (
                          <div
                            key={c._id}
                            onClick={() => setValue("selectedCourseId", c._id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ₹{c.courseFees} • {c.duration} {c.durationType}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 ${
                              isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}'''

if course_close_old in content:
    content = content.replace(course_close_old, course_close_new, 1)
    changes.append("Course: mobile cards + fragment wrapper")
else:
    print("ERROR: Course close pattern not found")
    # Try alternate pattern
    alt = '</table>\n                  )}'
    print(f"Looking for: {repr(alt)}")
    sys.exit(1)

# ============================================================
# 2. Batch Selection (B) - Add hidden md:table + mobile cards
# ============================================================

# Find the 2nd table occurrence (batch table)
tbl_count = 0
search_start = 0
while True:
    pos = content.find('<table className="w-full text-sm">', search_start)
    if pos == -1:
        break
    tbl_count += 1
    if tbl_count == 2:
        before = content[:pos]
        after = content[pos + len('<table className="w-full text-sm">'):]
        content = before + '<table className="hidden md:table w-full text-sm">' + after
        changes.append("Batch table: hidden md:table")
        break
    search_start = pos + 1

if tbl_count < 2:
    print("ERROR: Batch table not found")
    sys.exit(1)

# Find the batch table closing - it's the 2nd </table>
tbl_close_count = 0
search_start = 0
batch_table_close = -1
while True:
    pos = content.find('</table>', search_start)
    if pos == -1:
        break
    tbl_close_count += 1
    if tbl_close_count == 2:
        batch_table_close = pos
        break
    search_start = pos + 1

if batch_table_close == -1:
    print("ERROR: Batch table closing not found")
    sys.exit(1)

# The pattern after batch </table>:
# </table>
#                       </div>    (closes shadow-sm border div)
#                     </div>      (closes col-span-1 div)
# Between these two div closes, we insert our mobile cards

after_batch = content[batch_table_close:]
# We need to replace: </table>\n                      </div>\n                    </div>
# With: </table>\n  </div>\n  <!-- mobile cards -->\n  </div>

import re
match = re.search(r'</table>\s*\n(\s*)</div>\s*\n(\s*)</div>', after_batch)
if not match:
    print("ERROR: Batch closing div pattern not found")
    sys.exit(1)

batch_close_full = match.group(0)
batch_indent1 = match.group(1)

# Build the replacement - insert mobile cards between the two closing divs
batch_new = '''</table>
                      </div>
                      {/* Mobile cards */}
                      <div className="md:hidden space-y-2 mt-2">
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
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-blue-300"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {b.startTime} - {b.endTime}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    activeCount > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-500"
                                  }`}>
                                    {activeCount} students
                                  </span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                  }`}>
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
                      </div>
                    </div>'''

content = content.replace(batch_close_full, batch_new, 1)
changes.append("Batch: mobile cards added")

# ============================================================
# 3. Admission Preview (C) - Add hidden md:table + mobile cards
# ============================================================

# Find the 3rd table occurrence (preview table)
tbl_count = 0
search_start = 0
while True:
    pos = content.find('<table className="w-full text-sm">', search_start)
    if pos == -1:
        break
    tbl_count += 1
    if tbl_count == 3:
        before = content[:pos]
        after = content[pos + len('<table className="w-full text-sm">'):]
        content = before + '<table className="hidden md:table w-full text-sm">' + after
        changes.append("Preview table: hidden md:table")
        break
    search_start = pos + 1

if tbl_count < 3:
    print("ERROR: Preview table not found")
    sys.exit(1)

# Find the 3rd </table> (preview closing)
tbl_close_count = 0
search_start = 0
preview_table_close = -1
while True:
    pos = content.find('</table>', search_start)
    if pos == -1:
        break
    tbl_close_count += 1
    if tbl_close_count == 3:
        preview_table_close = pos
        break
    search_start = pos + 1

if preview_table_close == -1:
    print("ERROR: Preview table closing not found")
    sys.exit(1)

# Pattern after preview </table>:
# </table>\n                  </div>\n                )}
after_preview = content[preview_table_close:]
match = re.search(r'</table>\s*\n(\s*)</div>\s*\n(\s*)\}\)', after_preview)
if not match:
    print("ERROR: Preview closing pattern not found")
    print(repr(after_preview[:150]))
    sys.exit(1)

preview_close_full = match.group(0)

preview_new = '''</table>
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
                              <span className="text-gray-400">Registration:</span> {item.registrationFees !== undefined ? `₹${item.registrationFees}` : (item.emiConfig ? `₹${item.emiConfig.registrationFees}` : '-')}
                            </div>
                            <div>
                              <span className="text-gray-400">Monthly:</span> {item.emiConfig ? `₹${item.emiConfig.monthlyInstallment} x ${item.emiConfig.months}` : '-'}
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
                    </div>
                  </div>
                )'''

content = content.replace(preview_close_full, preview_new, 1)
changes.append("Preview: mobile cards added")

# ============================================================
# 4. Document Verification - Fix grid-cols
# ============================================================
old_grid = 'grid grid-cols-2 gap-3'
new_grid = 'grid grid-cols-1 sm:grid-cols-2 gap-3'
count = content.count(old_grid)
if count > 0:
    content = content.replace(old_grid, new_grid)
    changes.append(f"Document grid: {new_grid}")
else:
    print("WARNING: Document grid not found")

# ============================================================
# Save & Report
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("All changes applied:")
for c in changes:
    print(f"  - {c}")
print(f"\nFile size: {len(content)} chars")

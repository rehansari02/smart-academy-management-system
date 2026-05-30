import os

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'pages', 'admin', 'master', 'StudentAdmission.jsx')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content)} chars")

# ============================================================
# 1. Course Selection (A) - Add mobile cards
# ============================================================
# Replace table class
content = content.replace(
    '<table className="w-full text-sm">\n'
    '                      <thead className="bg-gray-50 text-left sticky top-0">',
    '<table className="hidden md:table w-full text-sm">\n'
    '                      <thead className="bg-gray-50 text-left sticky top-0">'
)
print("1. Course table: added hidden md:table")

# Find the closing </table> + closing paren of the course selection
old_course_close = (
    '</table>\n'
    '                  )}'
)

new_course_close = (
    '</table>\n'
    '                    {/* Mobile cards */}\n'
    '                    <div className="md:hidden space-y-2 p-2">\n'
    '                      {courses.map((c) => {\n'
    '                        const isSelected = watchCourseSelection === c._id;\n'
    '                        return (\n'
    '                          <div\n'
    '                            key={c._id}\n'
    '                            onClick={() => setValue("selectedCourseId", c._id)}\n'
    '                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${\n'
    '                              isSelected\n'
    '                                ? "border-blue-500 bg-blue-50 shadow-sm"\n'
    '                                : "border-gray-200 bg-white hover:border-blue-300"\n'
    '                            }`}\n'
    '                          >\n'
    '                            <div className="flex-1 min-w-0">\n'
    '                              <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>\n'
    '                              <p className="text-xs text-gray-500 mt-0.5">\n'
    '                                ₹{c.courseFees} • {c.duration} {c.durationType}\n'
    '                              </p>\n'
    '                            </div>\n'
    '                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 ${\n'
    '                              isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"\n'
    '                            }`}>\n'
    '                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}\n'
    '                            </div>\n'
    '                          </div>\n'
    '                        );\n'
    '                      })}\n'
    '                    </div>\n'
    '                  )}'
)

if old_course_close in content:
    content = content.replace(old_course_close, new_course_close, 1)
    print("1b. Course selection: mobile cards added")
else:
    print("ERROR: Could not find course selection closing pattern")
    # Show what's around there
    idx = content.find('</table>')
    if idx != -1:
        print(f"Found </table> at position {idx}")
        print(repr(content[idx:idx+200]))

# ============================================================
# 2. Batch Selection (B) - Add mobile cards
# ============================================================
# Replace second table class for batch
tables_found = 0
pos = 0
while True:
    pos = content.find('<table className="w-full text-sm">', pos)
    if pos == -1:
        break
    tables_found += 1
    if tables_found == 2:
        # Replace this occurrence
        before = content[:pos]
        after = content[pos + len('<table className="w-full text-sm">'):]
        content = before + '<table className="hidden md:table w-full text-sm">' + after
        print("2. Batch table: added hidden md:table")
        break
    pos += 1

# Find the batch table closing (second </table>)
table_close_count = 0
table_close_pos = -1
pos = 0
while True:
    pos = content.find('</table>', pos)
    if pos == -1:
        break
    table_close_count += 1
    if table_close_count == 2:
        table_close_pos = pos
        break
    pos += 1

if table_close_pos == -1:
    print("ERROR: Could not find batch table closing tag")
else:
    # Look for the pattern: </table>\n                      </div>\n                    </div>
    after_close = content[table_close_pos:]
    # Import re for more flexible matching
    import re
    match = re.match(r'</table>\s*\n(\s*)</div>\s*\n(\s*)</div>', after_close)
    if match:
        indent1 = match.group(1)
        indent2 = match.group(2)
        close_full = match.group(0)
        
        batch_mobile = (
            '</table>\n'
            '                      </div>\n'
            '                      {/* Mobile cards */}\n'
            '                      <div className="md:hidden space-y-2 mt-2">\n'
            '                        {batches\n'
            '                          .filter(\n'
            '                            (b) =>\n'
            '                              b.course === watchCourseSelection ||\n'
            '                              b.courses?.some(\n'
            '                                (c) => (c._id || c) === watchCourseSelection\n'
            '                              )\n'
            '                          )\n'
            '                          .map((b) => {\n'
            '                            const activeCount =\n'
            '                              b.courseCounts?.[watchCourseSelection] || 0;\n'
            '                            const isSelected =\n'
            '                              watchSelectedBatch === b.name;\n'
            '                            return (\n'
            '                              <div\n'
            '                                key={b._id}\n'
            '                                onClick={() =>\n'
            '                                  setValue("selectedBatch", b.name)\n'
            '                                }\n'
            '                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${\n'
            '                                  isSelected\n'
            '                                    ? "border-blue-500 bg-blue-50 shadow-sm"\n'
            '                                    : "border-gray-200 bg-white hover:border-blue-300"\n'
            '                                }`}\n'
            '                              >\n'
            '                                <div className="flex-1 min-w-0">\n'
            '                                  <p className="font-semibold text-gray-800 text-sm">{b.name}</p>\n'
            '                                  <p className="text-xs text-gray-500 mt-0.5">\n'
            '                                    {b.startTime} - {b.endTime}\n'
            '                                  </p>\n'
            '                                </div>\n'
            '                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">\n'
            '                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${\n'
            '                                    activeCount > 0\n'
            '                                      ? "bg-green-100 text-green-800"\n'
            '                                      : "bg-gray-100 text-gray-500"\n'
            '                                  }`}>\n'
            '                                    {activeCount} students\n'
            '                                  </span>\n'
            '                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${\n'
            '                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"\n'
            '                                  }`}>\n'
            '                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}\n'
            '                                  </div>\n'
            '                                </div>\n'
            '                              </div>\n'
            '                            );\n'
            '                          })}\n'
            '                        {batches.filter(\n'
            '                          (b) =>\n'
            '                            b.course === watchCourseSelection ||\n'
            '                            b.courses?.some(\n'
            '                              (c) => (c._id || c) === watchCourseSelection\n'
            '                            )\n'
            '                        ).length === 0 && (\n'
            '                          <p className="p-4 text-center text-gray-500 text-sm">\n'
            '                            No batches available for this course.\n'
            '                          </p>\n'
            '                        )}\n'
            '                      </div>\n'
            '                    </div>'
        )
        
        content = content.replace(close_full, batch_mobile, 1)
        print("2b. Batch selection: mobile cards added")
    else:
        print("ERROR: Could not match batch closing div pattern")
        print(repr(after_close[:150]))

# ============================================================
# 3. Admission Preview (C) - Add mobile cards
# ============================================================
# Replace third table class
tables_found = 0
pos = 0
while True:
    pos = content.find('<table className="w-full text-sm">', pos)
    if pos == -1:
        break
    tables_found += 1
    if tables_found == 3:
        before = content[:pos]
        after = content[pos + len('<table className="w-full text-sm">'):]
        content = before + '<table className="hidden md:table w-full text-sm">' + after
        print("3. Preview table: added hidden md:table")
        break
    pos += 1

# Find preview table closing (third </table>)
table_close_count = 0
table_close_pos = -1
pos = 0
while True:
    pos = content.find('</table>', pos)
    if pos == -1:
        break
    table_close_count += 1
    if table_close_count == 3:
        table_close_pos = pos
        break
    pos += 1

if table_close_pos == -1:
    print("ERROR: Could not find preview table closing tag")
else:
    after_preview = content[table_close_pos:]
    preview_match = re.match(r'</table>\s*\n(\s*)</div>\s*\n(\s*)\)}', after_preview)
    if preview_match:
        close_full = preview_match.group(0)
        
        preview_mobile = (
            '</table>\n'
            '                    {/* Mobile cards */}\n'
            '                    <div className="md:hidden divide-y divide-gray-100">\n'
            '                      {previewCourses.map((item, index) => (\n'
            '                        <div key={item.id} className="p-3 space-y-2">\n'
            '                          <div className="flex justify-between items-start">\n'
            '                            <div className="flex-1 min-w-0">\n'
            '                              <p className="font-bold text-gray-800 text-sm">{item.courseName}</p>\n'
            '                              <p className="text-xs text-gray-500">{item.batch} | {item.batchTime}</p>\n'
            '                            </div>\n'
            '                            <span className="text-sm font-bold text-green-700 flex-shrink-0 ml-2">₹{item.fees}</span>\n'
            '                          </div>\n'
            '                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">\n'
            '                            <div>\n'
            '                              <span className="text-gray-400">Duration:</span> {courses.find(c => c._id === item.courseId)?.duration} {courses.find(c => c._id === item.courseId)?.durationType}\n'
            '                            </div>\n'
            '                            <div>\n'
            '                              <span className="text-gray-400">Registration:</span> {item.registrationFees !== undefined ? `₹${item.registrationFees}` : (item.emiConfig ? `₹${item.emiConfig.registrationFees}` : \'-\')}\n'
            '                            </div>\n'
            '                            <div>\n'
            '                              <span className="text-gray-400">Monthly:</span> {item.emiConfig ? `₹${item.emiConfig.monthlyInstallment} x ${item.emiConfig.months}` : \'-\'}\n'
            '                            </div>\n'
            '                            <div>\n'
            '                              <span className="text-gray-400">Start:</span> {item.startDate}\n'
            '                            </div>\n'
            '                          </div>\n'
            '                          {item.paymentType === "Monthly" && item.emiConfig && (\n'
            '                            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">\n'
            '                              <strong>Monthly Breakdown:</strong> Total: ₹{item.fees} | Registration: ₹{item.emiConfig.registrationFees} | EMI: ₹{item.emiConfig.monthlyInstallment} x {item.emiConfig.months} Months\n'
            '                            </p>\n'
            '                          )}\n'
            '                          {!isUpdateMode && (\n'
            '                            <div className="flex gap-2 pt-1">\n'
            '                              <button\n'
            '                                type="button"\n'
            '                                onClick={() => {\n'
            '                                  setValue("selectedCourseId", item.courseId);\n'
            '                                  setValue("selectedBatch", item.batch);\n'
            '                                  setValue("batchStartDate", item.startDate);\n'
            '                                  setValue("paymentType", item.paymentType);\n'
            '                                  const newList = previewCourses.filter((_, i) => i !== index);\n'
            '                                  setPreviewCourses(newList);\n'
            '                                }}\n'
            '                                className="text-xs text-blue-600 font-semibold px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 flex items-center gap-1"\n'
            '                              >\n'
            '                                <Edit2 size={12} /> Edit\n'
            '                              </button>\n'
            '                              <button\n'
            '                                type="button"\n'
            '                                onClick={() => {\n'
            '                                  const newList = previewCourses.filter((_, i) => i !== index);\n'
            '                                  setPreviewCourses(newList);\n'
            '                                }}\n'
            '                                className="text-xs text-red-600 font-semibold px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1"\n'
            '                              >\n'
            '                                <Trash2 size={12} /> Remove\n'
            '                              </button>\n'
            '                            </div>\n'
            '                          )}\n'
            '                        </div>\n'
            '                      ))}\n'
            '                    </div>\n'
            '                  )}'
        )
        
        content = content.replace(close_full, preview_mobile, 1)
        print("3b. Preview: mobile cards added")
    else:
        print("ERROR: Could not match preview closing pattern")
        print(repr(after_preview[:150]))

# ============================================================
# 4. Document Verification - Fix grid-cols
# ============================================================
old_grid = 'grid grid-cols-2 gap-3'
new_grid = 'grid grid-cols-1 sm:grid-cols-2 gap-3'

count = content.count(old_grid)
if count > 0:
    content = content.replace(old_grid, new_grid)
    print(f"4. Document verification: grid fix applied ({count} occurrence{'s' if count > 1 else ''})")
else:
    print("WARNING: Document verification grid not found")

# ============================================================
# Save
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ All changes saved!")

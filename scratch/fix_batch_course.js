const fs = require('fs');
const path = 'd:/Rehan/Smart Institute/smart-academy-management-system/frontend/src/pages/admin/reports/BatchWiseRegister.jsx';
let content = fs.readFileSync(path, 'utf8');

const cleanBlock = [
    '    const getCourseIdValue = (value) => {',
    '        if (!value) return \'\';',
    '        return String(typeof value === \'object\' ? value?._id : value);',
    '    };',
    '',
    '    const isNumericOnlyLabel = (value) => /^\\d+$/.test(String(value || \'\').trim());',
    '',
    '    const normalizeCourseText = (value) => String(value || \'\')',
    '        .trim()',
    '        .replace(/^[\\s\\-\u2013\u2014:|/\\\\()]+/, \'\')',
    '        .replace(/\\s+/g, \' \')',
    '        .trim();',
    '',
    '    const getReadableCourseLabel = (course) => {',
    '        const shortName = normalizeCourseText(course?.shortName);',
    '        const name = normalizeCourseText(course?.name);',
    '        const label = isNumericOnlyLabel(shortName) ? name : (shortName || name);',
    '        const normalizedLabel = normalizeCourseText(label);',
    '        return isNumericOnlyLabel(normalizedLabel) ? \'\' : normalizedLabel;',
    '    };',
    '',
    '    const getCourseLabel = (courseValue) => {',
    '        if (!courseValue) return \'\';',
    '        if (typeof courseValue === \'object\') {',
    '            return getReadableCourseLabel(courseValue);',
    '        }',
    '',
    '        const courseId = getCourseIdValue(courseValue);',
    '        const matchedCourse = (courses || []).find((course) => String(course._id) === courseId);',
    '        return getReadableCourseLabel(matchedCourse);',
    '    };',
    '',
    '    const getStudentCourseLabel = (student, group) => {',
    '        if (!student) return \'\';',
    '',
    '        const studentCourseLabel = getCourseLabel(student?.course);',
    '        if (studentCourseLabel) return studentCourseLabel;',
    '',
    '        const groupCourseLabel = (group?.courseNames || []).find((name) => name && !isNumericOnlyLabel(name));',
    '        if (groupCourseLabel) return groupCourseLabel;',
    '',
    '        return filters.courseFilter && selectedCourseName !== \'All Courses\' ? selectedCourseName : \'\';',
    '    };'
].join('\n');

// Match from first getCourseIdValue to closing }; of getStudentCourseLabel
const brokenPattern = /const getCourseIdValue[\s\S]*?return filters\.courseFilter[\s\S]*?selectedCourseName : '';\s*\};/;
const match = content.match(brokenPattern);
if (!match) {
    console.log('ERROR: Pattern not found');
    process.exit(1);
}
console.log('Replacing block of length:', match[0].length);
const fixed = content.replace(brokenPattern, cleanBlock);
fs.writeFileSync(path, fixed, 'utf8');
console.log('Done! File written successfully. New length:', fixed.length);

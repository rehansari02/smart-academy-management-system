import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { ArrowLeft, Download, FileQuestion, FileSpreadsheet, Loader, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import {
  createFinalExamQuestionPaper,
  fetchCourses,
  fetchFinalExamQuestionPapers,
  resetMasterStatus,
  updateFinalExamQuestionPaper
} from '../../../features/master/masterSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const emptyMcq = () => ({ question: '', options: ['', '', '', ''], correctAnswer: '', marks: 1 });
const emptyQuestionAnswer = () => ({ question: '', answer: '', marks: 1 });
const getConfiguredSectionMarks = (rows = [], sectionTotalMarks) => (Number(sectionTotalMarks) > 0 ? sumMarks(rows) : 0);
const syncTotalMarks = (formData) => {
  const total = getConfiguredSectionMarks(formData.mcqs, formData.mcqTotalMarks)
    + getConfiguredSectionMarks(formData.questionAnswers, formData.qaTotalMarks);
  return { ...formData, totalMarks: total || '' };
};
const getQuestionCount = (totalMarks, perQuestionMarks) => {
  const total = Number(totalMarks);
  const perQuestion = Number(perQuestionMarks);
  if (!total || !perQuestion || total <= 0 || perQuestion <= 0) return null;
  return Math.max(1, Math.min(200, Math.ceil(total / perQuestion)));
};
const sumMarks = (rows = []) => rows.reduce((total, row) => total + (Number(row.marks) || 0), 0);
const getCourseId = (course) => course?._id || course;
const getSubjectId = (item) => item?.subject?._id || item?.subject || item?._id || item;
const normalizeText = (value = '') => String(value || '').trim();
const normalizeKey = (value = '') => normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
const parseBooleanText = (value = '') => /^(1|true|yes|y|active|on)$/i.test(normalizeText(value));
const findSheetName = (workbook, candidates = []) => workbook.SheetNames.find((name) =>
  candidates.some((candidate) => {
    const current = normalizeKey(name);
    const target = normalizeKey(candidate);
    return current === target || current.includes(target) || target.includes(current);
  })
);
const getCellValue = (row = {}, aliases = []) => {
  const match = Object.entries(row).find(([key]) =>
    aliases.some((alias) => normalizeKey(key) === normalizeKey(alias))
  );
  return normalizeText(match?.[1]);
};
const parseExcelMetaSheet = (worksheet) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, blankrows: false });
  const metadata = {};
  rows.forEach((row) => {
    const key = normalizeText(row?.[0]);
    const value = normalizeText(row?.[1]);
    if (key) metadata[normalizeKey(key)] = value;
  });
  return metadata;
};
const parseExcelQuestionRows = (rows = [], type = 'mcq') => rows
  .map((row) => {
    const question = getCellValue(row, ['Question', 'Q']);
    if (!question) return null;

    if (type === 'mcq') {
      return {
        question,
        options: [
          getCellValue(row, ['Option A', 'A', 'Option 1']),
          getCellValue(row, ['Option B', 'B', 'Option 2']),
          getCellValue(row, ['Option C', 'C', 'Option 3']),
          getCellValue(row, ['Option D', 'D', 'Option 4'])
        ],
        correctAnswer: getCellValue(row, ['Correct Answer', 'Answer', 'Correct']),
        marks: Number(getCellValue(row, ['Marks'])) || 1
      };
    }

    return {
      question,
      answer: getCellValue(row, ['Answer', 'Solution']),
      marks: Number(getCellValue(row, ['Marks'])) || 1
    };
  })
  .filter(Boolean);
const parseFinalExamMarkdown = () => ({ mcqs: [], questionAnswers: [] });
const parseExcelUnifiedRows = (rows = []) => {
  const mcqs = [];

  rows.forEach((row) => {
    const question = getCellValue(row, ['Question', 'Q']);
    if (!question) return;

    mcqs.push({
      question,
      options: [
        getCellValue(row, ['Option A', 'A', 'Option 1']),
        getCellValue(row, ['Option B', 'B', 'Option 2']),
        getCellValue(row, ['Option C', 'C', 'Option 3']),
        getCellValue(row, ['Option D', 'D', 'Option 4'])
      ],
      correctAnswer: getCellValue(row, ['Correct Answer', 'Answer', 'Correct']),
      marks: Number(getCellValue(row, ['Marks'])) || 1
    });
  });

  return { mcqs };
};
const parseFinalExamExcel = (workbook) => {
  const metaSheetName = findSheetName(workbook, ['Meta', 'Metadata', 'Details']);
  const mcqSheetName = findSheetName(workbook, ['MCQ', 'MCQs', 'Multiple Choice']);

  let metadata = metaSheetName ? parseExcelMetaSheet(workbook.Sheets[metaSheetName]) : {};
  let mcqs = [];

  if (mcqSheetName) {
    mcqs = parseExcelQuestionRows(
      XLSX.utils.sheet_to_json(workbook.Sheets[mcqSheetName], { defval: '', raw: false, blankrows: false }),
      'mcq'
    );
  }

  if (!mcqSheetName && workbook.SheetNames.length) {
    const firstSheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      defval: '',
      raw: false,
      blankrows: false
    });
    const parsedRows = parseExcelUnifiedRows(firstSheetRows);
    mcqs = parsedRows.mcqs;
    if (!metaSheetName && firstSheetRows.length) {
      const maybeMeta = firstSheetRows.reduce((acc, row) => {
        const key = normalizeText(row?.Field || row?.field || row?.Key || row?.key);
        const value = normalizeText(row?.Value || row?.value);
        if (key && value) acc[normalizeKey(key)] = value;
        return acc;
      }, {});
      metadata = { ...maybeMeta, ...metadata };
    }
  }

  const parsedCourse = normalizeText(metadata.course || metadata['course name'] || metadata['course/class']);
  const parsedSubject = normalizeText(metadata.subject || metadata['subject name']);

  return {
    title: normalizeText(metadata.title || metadata['paper title']) || '',
    examName: normalizeText(metadata['exam name']) || 'Final Exam',
    courseName: parsedCourse,
    subjectName: parsedSubject,
    duration: normalizeText(metadata.duration || metadata['time duration']) || '',
    remarks: normalizeText(metadata.remarks || metadata.note) || '',
    isActive: metadata['is active'] ? parseBooleanText(metadata['is active']) : true,
    mcqTotalMarks: metadata['mcq total marks'] || metadata['mcq marks'] || '',
    mcqQuestionMarks: metadata['mcq each marks'] || metadata['mcq per question marks'] || 1,
    mcqs
  };
};

const AddFinalExamQuestionPaper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courses, finalExamQuestionPapers, isLoading } = useSelector((state) => state.master);
  const { add, edit } = useUserRights('Final Exam Question Paper');

  const [form, setForm] = useState({
    title: '',
    course: '',
    subject: '',
    duration: '',
    totalMarks: '',
    mcqTotalMarks: '',
    mcqQuestionMarks: 1,
    qaTotalMarks: '',
    qaQuestionMarks: 1,
    mcqs: [emptyMcq()],
    questionAnswers: [emptyQuestionAnswer()],
    remarks: '',
    isActive: true
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState('excel');
  const [importFile, setImportFile] = useState(null);
  const [importMarkdown, setImportMarkdown] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course._id) === String(form.course)),
    [courses, form.course]
  );

  const subjectOptions = useMemo(() => {
    return [...(selectedCourse?.subjects || [])]
      .filter((item) => item.subject)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => item.subject);
  }, [selectedCourse]);

  const selectedSubject = useMemo(
    () => subjectOptions.find((subject) => String(subject._id) === String(form.subject)),
    [subjectOptions, form.subject]
  );

  const canImportExcel = Boolean(form.course && form.subject);

  const existingCoursePaper = useMemo(
    () => finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(form.course)),
    [finalExamQuestionPapers, form.course]
  );

  const availableSubjectOptions = useMemo(() => {
    const savedSubjectIds = new Set(
      (existingCoursePaper?.subjects || []).map((row) => String(row.subject?._id || row.subject))
    );

    return subjectOptions.filter((subject) => !savedSubjectIds.has(String(subject._id)));
  }, [existingCoursePaper, subjectOptions]);

  const linkedSubjectCourses = useMemo(() => {
    if (!form.subject) return [];
    return courses.filter((course) =>
      (course.subjects || []).some((item) => String(getSubjectId(item)) === String(form.subject))
    );
  }, [courses, form.subject]);

  const existingSubjectRow = useMemo(() => {
    if (!existingCoursePaper || !form.subject) return null;
    return (existingCoursePaper.subjects || []).find((row) => String(row.subject?._id || row.subject) === String(form.subject)) || null;
  }, [existingCoursePaper, form.subject]);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchFinalExamQuestionPapers());
  }, [dispatch]);

  const handleCourseChange = (courseId) => {
    const course = courses.find((item) => String(item._id) === String(courseId));
    setForm((prev) => ({
      ...prev,
      course: courseId,
      subject: '',
      title: course ? `${course.name} Question Bank` : prev.title,
      duration: '',
      totalMarks: '',
      mcqTotalMarks: '',
      mcqQuestionMarks: 1,
      qaTotalMarks: '',
      qaQuestionMarks: 1,
      mcqs: [emptyMcq()],
      questionAnswers: [emptyQuestionAnswer()]
    }));
  };

  const handleSubjectChange = (subjectId) => {
    const subject = subjectOptions.find((item) => String(item._id) === String(subjectId));
    const coursePaper = finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(form.course));
    const savedSubject = (coursePaper?.subjects || []).find((row) => String(row.subject?._id || row.subject) === String(subjectId))
      || finalExamQuestionPapers
        .flatMap((paper) => (paper.subjects || []).map((row) => ({ row, paper })))
        .find(({ row }) => String(row.subject?._id || row.subject) === String(subjectId))?.row;
    const savedMcqs = savedSubject?.mcqs || [];
    const savedQuestionAnswers = savedSubject?.questionAnswers || [];
    const mcqTotalMarks = savedMcqs.length ? sumMarks(savedMcqs) : '';
    const qaTotalMarks = savedQuestionAnswers.length ? sumMarks(savedQuestionAnswers) : '';

    setForm((prev) => ({
      ...prev,
      subject: subjectId,
      title: coursePaper?.title || (selectedCourse && subject ? `${selectedCourse.name} - ${subject.name} Question Bank` : prev.title),
      duration: savedSubject?.duration || '',
      totalMarks: mcqTotalMarks || qaTotalMarks ? Number(mcqTotalMarks || 0) + Number(qaTotalMarks || 0) : '',
      mcqTotalMarks,
      mcqQuestionMarks: savedMcqs[0]?.marks || 1,
      qaTotalMarks,
      qaQuestionMarks: savedQuestionAnswers[0]?.marks || 1,
      mcqs: savedMcqs.length ? savedMcqs.map((mcq) => ({
        question: mcq.question || '',
        options: [...(mcq.options || []), '', '', '', ''].slice(0, 4),
        correctAnswer: mcq.correctAnswer || '',
        marks: mcq.marks || 1
      })) : [emptyMcq()],
      questionAnswers: savedQuestionAnswers.length ? savedQuestionAnswers.map((qa) => ({
        question: qa.question || '',
        answer: qa.answer || '',
        marks: qa.marks || 1
      })) : [emptyQuestionAnswer()],
      remarks: coursePaper?.remarks || prev.remarks,
      isActive: coursePaper ? coursePaper.isActive !== false : prev.isActive
    }));

    if (savedSubject) {
      toast.info('Existing question paper data loaded');
    }
  };

  const applyImportedPaper = (parsed) => {
    if (!parsed) return;

    const matchedCourse = courses.find((course) => {
      const names = [course.name, course.shortName, course.code].filter(Boolean).map(normalizeKey);
      return names.includes(normalizeKey(parsed.courseName));
    });

    const matchedSubject = matchedCourse
      ? (matchedCourse.subjects || [])
        .map((item) => item.subject)
        .filter(Boolean)
        .find((subject) => normalizeKey(subject.name) === normalizeKey(parsed.subjectName))
      : subjectOptions.find((subject) => normalizeKey(subject.name) === normalizeKey(parsed.subjectName));

    const importedMcqs = (parsed.mcqs || []).map((mcq) => ({
      question: mcq.question || '',
      options: [...(mcq.options || []), '', '', '', ''].slice(0, 4),
      correctAnswer: mcq.correctAnswer || '',
      marks: Number(mcq.marks) || 1
    }));
    setForm((prev) => syncTotalMarks({
      ...prev,
      title: parsed.title || prev.title,
      course: prev.course || matchedCourse?._id,
      subject: prev.subject || matchedSubject?._id,
      duration: parsed.duration || prev.duration,
      mcqTotalMarks: parsed.mcqTotalMarks || prev.mcqTotalMarks,
      mcqQuestionMarks: Number(parsed.mcqQuestionMarks) || prev.mcqQuestionMarks || 1,
      qaTotalMarks: parsed.qaTotalMarks || prev.qaTotalMarks,
      qaQuestionMarks: Number(parsed.qaQuestionMarks) || prev.qaQuestionMarks || 1,
      mcqs: importedMcqs.length ? importedMcqs : [emptyMcq()],
      questionAnswers: prev.questionAnswers,
      remarks: parsed.remarks || prev.remarks,
      isActive: typeof parsed.isActive === 'boolean' ? parsed.isActive : prev.isActive
    }));

    setShowImportModal(false);
    setImportFile(null);
    setImportFileName('');
    setImportMarkdown('');
    setImportError('');
    toast.success('Excel import applied');
    if (parsed.courseName && !matchedCourse) {
      toast.warn(`Course not matched: ${parsed.courseName}`);
    }
    if (parsed.subjectName && !matchedSubject) {
      toast.warn(`Subject not matched: ${parsed.subjectName}`);
    }
  };

  const handleImportMarkdownText = () => {
    try {
      const parsed = parseFinalExamMarkdown(importMarkdown);
      if (!parsed.mcqs.length) {
        setImportError('Kam se kam ek MCQ block required hai.');
        return;
      }
      applyImportedPaper(parsed);
    } catch (error) {
      setImportError(error.message || 'Markdown parse nahi hua');
    }
  };

  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!canImportExcel) {
      setImportError('Pehle course aur subject select karein.');
      setImportFile(null);
      setImportFileName('');
      return;
    }
    setImportFileName(file.name);
    setImportFile(file);
    setImportError('');
    if (importMode === 'markdown') {
      const reader = new FileReader();
      reader.onload = () => {
        setImportMarkdown(String(reader.result || ''));
        setImportError('');
      };
      reader.onerror = () => setImportError('File read nahi ho payi.');
      reader.readAsText(file);
    }
  };

  const handleImportExcel = async () => {
    if (!canImportExcel) {
      setImportError('Pehle course aur subject select karein.');
      return;
    }
    if (!importFile) {
      setImportError('Pehle Excel file select karein.');
      return;
    }

    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const parsed = parseFinalExamExcel(workbook);
      if (!parsed.mcqs.length) {
        setImportError('Excel me kam se kam ek MCQ row required hai.');
        return;
      }
      applyImportedPaper(parsed);
    } catch (error) {
      setImportError(error.message || 'Excel parse nahi hua');
    }
  };

  const updateMcq = (index, field, value, optionIndex = null) => {
    setForm((prev) => {
      const mcqs = [...prev.mcqs];
      const row = { ...mcqs[index] };
      if (field === 'options') {
        const options = [...row.options];
        options[optionIndex] = value;
        row.options = options;
      } else {
        row[field] = value;
      }
      mcqs[index] = row;
      return syncTotalMarks({ ...prev, mcqs });
    });
  };

  const updateQuestionAnswer = (index, field, value) => {
    setForm((prev) => {
      const questionAnswers = [...prev.questionAnswers];
      questionAnswers[index] = { ...questionAnswers[index], [field]: value };
      return syncTotalMarks({ ...prev, questionAnswers });
    });
  };

  const resizeRowsWithMarks = (rows, count, marks, emptyRow) => {
    const safeCount = count || rows.length || 1;
    return Array.from({ length: safeCount }, (_, index) => ({
      ...(rows[index] || emptyRow()),
      marks: Number(marks) || 1
    }));
  };

  const updateMarksSetup = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'mcqTotalMarks' || field === 'mcqQuestionMarks') {
        const total = field === 'mcqTotalMarks' ? value : next.mcqTotalMarks;
        const marks = field === 'mcqQuestionMarks' ? value : next.mcqQuestionMarks;
        const count = getQuestionCount(total, marks);
        next.mcqs = resizeRowsWithMarks(prev.mcqs, count, marks, emptyMcq);
      }

      if (field === 'qaTotalMarks' || field === 'qaQuestionMarks') {
        const total = field === 'qaTotalMarks' ? value : next.qaTotalMarks;
        const marks = field === 'qaQuestionMarks' ? value : next.qaQuestionMarks;
        const count = getQuestionCount(total, marks);
        next.questionAnswers = resizeRowsWithMarks(prev.questionAnswers, count, marks, emptyQuestionAnswer);
      }

      return syncTotalMarks(next);
    });
  };

  const addMcqRow = () => setForm((prev) => ({
    ...syncTotalMarks({
      ...prev,
      mcqs: [...prev.mcqs, { ...emptyMcq(), marks: Number(prev.mcqQuestionMarks) || 1 }]
    })
  }));
  const addQuestionAnswerRow = () => setForm((prev) => ({
    ...syncTotalMarks({
      ...prev,
      questionAnswers: [...prev.questionAnswers, { ...emptyQuestionAnswer(), marks: Number(prev.qaQuestionMarks) || 1 }]
    })
  }));

  const removeMcqRow = (index) => {
    setForm((prev) => {
      const mcqs = prev.mcqs.filter((_, rowIndex) => rowIndex !== index);
      return syncTotalMarks({ ...prev, mcqs: mcqs.length ? mcqs : [emptyMcq()] });
    });
  };

  const removeQuestionAnswerRow = (index) => {
    setForm((prev) => {
      const questionAnswers = prev.questionAnswers.filter((_, rowIndex) => rowIndex !== index);
      return syncTotalMarks({ ...prev, questionAnswers: questionAnswers.length ? questionAnswers : [emptyQuestionAnswer()] });
    });
  };

  const buildSubjectPayload = () => ({
    subject: form.subject,
    duration: form.duration.trim(),
    mcqs: form.mcqs
        .filter((mcq) => mcq.question.trim())
        .map((mcq) => ({
          question: mcq.question.trim(),
          options: mcq.options.map((option) => option.trim()).filter(Boolean),
          correctAnswer: mcq.correctAnswer.trim(),
          marks: Number(mcq.marks) || 1
        })),
    questionAnswers: []
  });

  const buildPayload = (course) => ({
    title: `${course?.name || selectedCourse?.name || 'Course'} Question Bank`,
    examName: 'Final Exam',
    course: getCourseId(course) || form.course,
    remarks: form.remarks.trim(),
    isActive: form.isActive,
    subjects: [buildSubjectPayload()]
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.course) {
      toast.error('Course select karein');
      return;
    }
    if (!form.subject) {
      toast.error('Subject select karein');
      return;
    }

    const targetCourses = linkedSubjectCourses.length ? linkedSubjectCourses : [selectedCourse].filter(Boolean);
    const targetCoursePapers = targetCourses.map((course) =>
      finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(getCourseId(course)))
    );
    const needsAdd = targetCoursePapers.some((paper) => !paper);
    const needsEdit = targetCoursePapers.some(Boolean);

    if ((needsAdd && !add) || (needsEdit && !edit)) {
      showPermissionDenied(`You don't have authority to ${needsAdd && needsEdit ? 'add/update' : needsAdd ? 'add' : 'update'} question papers.`);
      return;
    }

    const subjectPayload = buildSubjectPayload();
    const hasQuestions = subjectPayload.mcqs.length > 0;
    if (!hasQuestions) {
      toast.error('Kam se kam ek question add karein');
      return;
    }

    const resultActions = [];
    for (const course of targetCourses) {
      const courseId = getCourseId(course);
      const coursePaper = finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(courseId));
      const payload = buildPayload(course);

      if (coursePaper) {
        const otherSubjects = (coursePaper.subjects || [])
          .filter((row) => String(row.subject?._id || row.subject) !== String(form.subject))
          .map((row) => ({
            subject: row.subject?._id || row.subject,
            duration: row.duration || '',
            mcqs: row.mcqs || [],
            questionAnswers: []
          }));

        resultActions.push(await dispatch(updateFinalExamQuestionPaper({
          id: coursePaper._id,
          data: {
            ...payload,
            title: coursePaper.title || payload.title,
            examName: coursePaper.examName || 'Final Exam',
            remarks: form.remarks.trim() || coursePaper.remarks || '',
            isActive: coursePaper.isActive !== false,
            subjects: [...otherSubjects, subjectPayload]
          }
        })));
      } else {
        resultActions.push(await dispatch(createFinalExamQuestionPaper(payload)));
      }
    }

    const failedAction = resultActions.find((action) =>
      !createFinalExamQuestionPaper.fulfilled.match(action) && !updateFinalExamQuestionPaper.fulfilled.match(action)
    );

    if (failedAction) {
      toast.error(failedAction.payload || 'Question paper save nahi hua');
      return;
    }
      return;
    }
    if (!importFile) {
      setImportError('Pehle Excel file select karein.');
      return;
    }

    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const parsed = parseFinalExamExcel(workbook);
      if (!parsed.mcqs.length) {
        setImportError('Excel me kam se kam ek MCQ row required hai.');
        return;
      }
      applyImportedPaper(parsed);
    } catch (error) {
      setImportError(error.message || 'Excel parse nahi hua');
    }
  };

  const updateMcq = (index, field, value, optionIndex = null) => {
    setForm((prev) => {
      const mcqs = [...prev.mcqs];
      const row = { ...mcqs[index] };
      if (field === 'options') {
        const options = [...row.options];
        options[optionIndex] = value;
        row.options = options;
      } else {
        row[field] = value;
      }
      mcqs[index] = row;
      return syncTotalMarks({ ...prev, mcqs });
    });
  };

  const updateQuestionAnswer = (index, field, value) => {
    setForm((prev) => {
      const questionAnswers = [...prev.questionAnswers];
      questionAnswers[index] = { ...questionAnswers[index], [field]: value };
      return syncTotalMarks({ ...prev, questionAnswers });
    });
  };

  const resizeRowsWithMarks = (rows, count, marks, emptyRow) => {
    const safeCount = count || rows.length || 1;
    return Array.from({ length: safeCount }, (_, index) => ({
      ...(rows[index] || emptyRow()),
      marks: Number(marks) || 1
    }));
  };

  const updateMarksSetup = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'mcqTotalMarks' || field === 'mcqQuestionMarks') {
        const total = field === 'mcqTotalMarks' ? value : next.mcqTotalMarks;
        const marks = field === 'mcqQuestionMarks' ? value : next.mcqQuestionMarks;
        const count = getQuestionCount(total, marks);
        next.mcqs = resizeRowsWithMarks(prev.mcqs, count, marks, emptyMcq);
      }

      if (field === 'qaTotalMarks' || field === 'qaQuestionMarks') {
        const total = field === 'qaTotalMarks' ? value : next.qaTotalMarks;
        const marks = field === 'qaQuestionMarks' ? value : next.qaQuestionMarks;
        const count = getQuestionCount(total, marks);
        next.questionAnswers = resizeRowsWithMarks(prev.questionAnswers, count, marks, emptyQuestionAnswer);
      }

      return syncTotalMarks(next);
    });
  };

  const addMcqRow = () => setForm((prev) => ({
    ...syncTotalMarks({
      ...prev,
      mcqs: [...prev.mcqs, { ...emptyMcq(), marks: Number(prev.mcqQuestionMarks) || 1 }]
    })
  }));
  const addQuestionAnswerRow = () => setForm((prev) => ({
    ...syncTotalMarks({
      ...prev,
      questionAnswers: [...prev.questionAnswers, { ...emptyQuestionAnswer(), marks: Number(prev.qaQuestionMarks) || 1 }]
    })
  }));

  const removeMcqRow = (index) => {
    setForm((prev) => {
      const mcqs = prev.mcqs.filter((_, rowIndex) => rowIndex !== index);
      return syncTotalMarks({ ...prev, mcqs: mcqs.length ? mcqs : [emptyMcq()] });
    });
  };

  const removeQuestionAnswerRow = (index) => {
    setForm((prev) => {
      const questionAnswers = prev.questionAnswers.filter((_, rowIndex) => rowIndex !== index);
      return syncTotalMarks({ ...prev, questionAnswers: questionAnswers.length ? questionAnswers : [emptyQuestionAnswer()] });
    });
  };

  const buildSubjectPayload = () => ({
    subject: form.subject,
    duration: form.duration.trim(),
    mcqs: form.mcqs
        .filter((mcq) => mcq.question.trim())
        .map((mcq) => ({
          question: mcq.question.trim(),
          options: mcq.options.map((option) => option.trim()).filter(Boolean),
          correctAnswer: mcq.correctAnswer.trim(),
          marks: Number(mcq.marks) || 1
        })),
    questionAnswers: []
  });

  const buildPayload = (course) => ({
    title: `${course?.name || selectedCourse?.name || 'Course'} Question Bank`,
    examName: 'Final Exam',
    course: getCourseId(course) || form.course,
    remarks: form.remarks.trim(),
    isActive: form.isActive,
    subjects: [buildSubjectPayload()]
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.course) {
      toast.error('Course select karein');
      return;
    }
    if (!form.subject) {
      toast.error('Subject select karein');
      return;
    }

    const targetCourses = linkedSubjectCourses.length ? linkedSubjectCourses : [selectedCourse].filter(Boolean);
    const targetCoursePapers = targetCourses.map((course) =>
      finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(getCourseId(course)))
    );
    const needsAdd = targetCoursePapers.some((paper) => !paper);
    const needsEdit = targetCoursePapers.some(Boolean);

    if ((needsAdd && !add) || (needsEdit && !edit)) {
      showPermissionDenied(`You don't have authority to ${needsAdd && needsEdit ? 'add/update' : needsAdd ? 'add' : 'update'} question papers.`);
      return;
    }

    const subjectPayload = buildSubjectPayload();
    const hasQuestions = subjectPayload.mcqs.length > 0;
    if (!hasQuestions) {
      toast.error('Kam se kam ek question add karein');
      return;
    }

    const resultActions = [];
    for (const course of targetCourses) {
      const courseId = getCourseId(course);
      const coursePaper = finalExamQuestionPapers.find((paper) => String(paper.course?._id || paper.course) === String(courseId));
      const payload = buildPayload(course);

      if (coursePaper) {
        const otherSubjects = (coursePaper.subjects || [])
          .filter((row) => String(row.subject?._id || row.subject) !== String(form.subject))
          .map((row) => ({
            subject: row.subject?._id || row.subject,
            duration: row.duration || '',
            mcqs: row.mcqs || [],
            questionAnswers: []
          }));

        resultActions.push(await dispatch(updateFinalExamQuestionPaper({
          id: coursePaper._id,
          data: {
            ...payload,
            title: coursePaper.title || payload.title,
            examName: coursePaper.examName || 'Final Exam',
            remarks: form.remarks.trim() || coursePaper.remarks || '',
            isActive: coursePaper.isActive !== false,
            subjects: [...otherSubjects, subjectPayload]
          }
        })));
      } else {
        resultActions.push(await dispatch(createFinalExamQuestionPaper(payload)));
      }
    }

    const failedAction = resultActions.find((action) =>
      !createFinalExamQuestionPaper.fulfilled.match(action) && !updateFinalExamQuestionPaper.fulfilled.match(action)
    );

    if (failedAction) {
      toast.error(failedAction.payload || 'Question paper save nahi hua');
      return;
    }

    toast.success(`Question Bank ${needsEdit ? 'Updated' : 'Added'} Successfully for ${targetCourses.length} Course${targetCourses.length > 1 ? 's' : ''}`);
    dispatch(fetchFinalExamQuestionPapers());
    dispatch(resetMasterStatus());
    navigate('/master/final-exam-question-paper');
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Meta sheet
    const metaData = [
      ['Field', 'Value'],
      ['Title', 'Sample Course Question Bank'],
      ['Course', 'e.g. BCA / MCA (course name as in system)'],
      ['Subject', 'e.g. Mathematics (subject name as in system)'],
      ['Duration', '3 Hours'],
      ['Remarks', 'Optional remarks'],
      ['Is Active', 'Yes']
    ];
    const metaWs = XLSX.utils.aoa_to_sheet(metaData);
    metaWs['!cols'] = [{ wch: 20 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

    // MCQ sheet
    const mcqData = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks'],
      ['What is 2 + 2?', '3', '4', '5', '6', 'B', '1'],
      ['Capital of India?', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'B', '1'],
      ['Write your question here...', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'A', '1']
    ];
    const mcqWs = XLSX.utils.aoa_to_sheet(mcqData);
    mcqWs['!cols'] = [
      { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQ');

    XLSX.writeFile(wb, 'FinalExamQuestionPaper_Template.xlsx');
  };

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="add">
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Add Question Bank</h1>
          <p className="text-sm text-gray-500">Select a course first, then choose a subject to create the MCQ bank.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!canImportExcel) {
                toast.error('Pehle course aur subject select karein');
                return;
              }
              setImportMode('excel');
              setImportFile(null);
              setImportFileName('');
              setImportMarkdown('');
              setImportError('');
              setShowImportModal(true);
            }}
            disabled={!canImportExcel}
            title={!canImportExcel ? 'Pehle course aur subject select karein' : 'Import Excel'}
    </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default AddFinalExamQuestionPaper;

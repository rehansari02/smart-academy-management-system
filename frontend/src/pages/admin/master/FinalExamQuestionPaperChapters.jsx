import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Download,
  Edit,
  Eye,
  FileQuestion,
  FileSpreadsheet,
  Layers,
  Loader,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { fetchFinalExamQuestionPapers, updateFinalExamQuestionPaper } from '../../../features/master/masterSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const getSubjectId = (row) => row?.subject?._id || row?.subject;
const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || 'Subject';
const sumMarks = (rows = []) => rows.reduce((total, row) => total + (Number(row.marks) || 0), 0);

const emptyMcq = () => ({ question: '', options: ['', '', '', ''], correctAnswer: '', marks: 1 });

const normalizeText = (value = '') => String(value || '').trim();
const normalizeKey = (value = '') => normalizeText(value).toLowerCase().replace(/\s+/g, ' ');

const getCellValue = (row = {}, aliases = []) => {
  const match = Object.entries(row).find(([key]) =>
    aliases.some((alias) => normalizeKey(key) === normalizeKey(alias))
  );
  return normalizeText(match?.[1]);
};

const parseExcelMcqRows = (rows = []) => rows
  .map((row) => {
    const question = getCellValue(row, ['Question', 'Q']);
    if (!question) return null;

    return {
      question,
      options: [
        getCellValue(row, ['Option 1', 'Option A', 'Option1', '1', 'A']),
        getCellValue(row, ['Option 2', 'Option B', 'Option2', '2', 'B']),
        getCellValue(row, ['Option 3', 'Option C', 'Option3', '3', 'C']),
        getCellValue(row, ['Option 4', 'Option D', 'Option4', '4', 'D'])
      ],
      correctAnswer: getCellValue(row, ['Correct Answer', 'Answer', 'Correct']),
      marks: Number(getCellValue(row, ['Marks'])) || 1
    };
  })
  .filter(Boolean);

const FinalExamQuestionPaperChapters = () => {
  const { id, subjectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { finalExamQuestionPapers, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { add, edit, delete: canDelete } = useUserRights('Final Exam Question Paper');
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  // Chapter Modal state (Add / Edit Chapter Name & Number)
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapterForm, setChapterForm] = useState({ chapterNo: '', chapterName: '' });

  // MCQs Manage Modal state (for a specific chapter or Mix paper)
  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState(null); // null means Mix paper
  const [activeMcqs, setActiveMcqs] = useState([]);
  const [activeTargetTitle, setActiveTargetTitle] = useState('');

  // Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetChapterId, setImportTargetChapterId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (!finalExamQuestionPapers.length) {
      dispatch(fetchFinalExamQuestionPapers());
    }
  }, [dispatch, finalExamQuestionPapers.length]);

  const paper = useMemo(
    () => finalExamQuestionPapers.find((item) => String(item._id) === String(id)),
    [finalExamQuestionPapers, id]
  );

  const subjectRow = useMemo(() => {
    if (!paper) return null;
    return (paper.subjects || []).find((s) => String(getSubjectId(s)) === String(subjectId));
  }, [paper, subjectId]);

  const courseName = paper?.course?.name || 'Course';
  const subjectName = subjectRow ? getSubjectName(subjectRow) : 'Subject';

  const chapters = useMemo(() => subjectRow?.chapters || [], [subjectRow]);
  const mixMcqs = useMemo(() => subjectRow?.mcqs || [], [subjectRow]);
  const mixQa = useMemo(() => subjectRow?.questionAnswers || [], [subjectRow]);

  const totalSubjectMcqs = useMemo(() => {
    const chapterMcqs = chapters.reduce((acc, ch) => acc + (ch.mcqs?.length || 0), 0);
    return mixMcqs.length + chapterMcqs;
  }, [chapters, mixMcqs]);

  // Helper to persist paper updates to backend
  const saveUpdatedPaper = async (updatedSubjectRow, successMessage = 'Updated successfully') => {
    if (!paper) return false;
    const updatedSubjects = (paper.subjects || []).map((s) => {
      if (String(getSubjectId(s)) === String(subjectId)) {
        return updatedSubjectRow;
      }
      return {
        subject: getSubjectId(s),
        duration: s.duration || '',
        mcqs: s.mcqs || [],
        questionAnswers: s.questionAnswers || [],
        chapters: s.chapters || []
      };
    });

    const result = await dispatch(updateFinalExamQuestionPaper({
      id: paper._id,
      data: {
        title: paper.title,
        examName: paper.examName || 'Final Exam',
        course: paper.course?._id || paper.course,
        remarks: paper.remarks || '',
        isActive: paper.isActive !== false,
        subjects: updatedSubjects
      }
    }));

    if (updateFinalExamQuestionPaper.fulfilled.match(result)) {
      toast.success(successMessage);
      dispatch(fetchFinalExamQuestionPapers());
      return true;
    } else {
      toast.error(result.payload || 'Save failed');
      return false;
    }
  };

  // Chapter Management (Add/Edit/Delete)
  const openAddChapterModal = () => {
    if (!add) {
      showPermissionDenied("You don't have authority to add chapters.");
      return;
    }
    const nextChapterNo = String(chapters.length + 1);
    setEditingChapterId(null);
    setChapterForm({ chapterNo: nextChapterNo, chapterName: '' });
    setChapterModalOpen(true);
  };

  const openEditChapterModal = (chapter) => {
    if (!edit) {
      showPermissionDenied("You don't have authority to edit chapters.");
      return;
    }
    setEditingChapterId(chapter._id);
    setChapterForm({
      chapterNo: chapter.chapterNo || '1',
      chapterName: chapter.chapterName || ''
    });
    setChapterModalOpen(true);
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!chapterForm.chapterName.trim()) {
      toast.error('Chapter name enter karein');
      return;
    }

    let updatedChapters = [];
    if (editingChapterId) {
      updatedChapters = chapters.map((ch) => {
        if (String(ch._id) === String(editingChapterId)) {
          return {
            ...ch,
            chapterNo: chapterForm.chapterNo.trim() || '1',
            chapterName: chapterForm.chapterName.trim()
          };
        }
        return ch;
      });
    } else {
      const newChapter = {
        chapterNo: chapterForm.chapterNo.trim() || String(chapters.length + 1),
        chapterName: chapterForm.chapterName.trim(),
        mcqs: [],
        questionAnswers: []
      };
      updatedChapters = [...chapters, newChapter];
    }

    const updatedSubjectRow = {
      subject: getSubjectId(subjectRow),
      duration: subjectRow.duration || '',
      mcqs: subjectRow.mcqs || [],
      questionAnswers: subjectRow.questionAnswers || [],
      chapters: updatedChapters
    };

    const ok = await saveUpdatedPaper(
      updatedSubjectRow,
      editingChapterId ? 'Chapter updated successfully' : 'Chapter added successfully'
    );
    if (ok) {
      setChapterModalOpen(false);
    }
  };

  const handleDeleteChapter = async (chapter) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete chapters.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete "${chapter.chapterName}"? All MCQs inside this chapter will also be deleted.`);
    if (!confirmed) return;

    const updatedChapters = chapters.filter((ch) => String(ch._id) !== String(chapter._id));
    const updatedSubjectRow = {
      subject: getSubjectId(subjectRow),
      duration: subjectRow.duration || '',
      mcqs: subjectRow.mcqs || [],
      questionAnswers: subjectRow.questionAnswers || [],
      chapters: updatedChapters
    };

    await saveUpdatedPaper(updatedSubjectRow, `Chapter "${chapter.chapterName}" deleted`);
  };

  // MCQs Manage Modal (for Chapter or Mix paper)
  const openManageMcqsModal = (chapter = null) => {
    if (chapter) {
      setTargetChapterId(chapter._id);
      setActiveTargetTitle(`Chapter ${chapter.chapterNo}: ${chapter.chapterName}`);
      setActiveMcqs(chapter.mcqs?.length ? chapter.mcqs.map((m) => ({ ...m, options: [...(m.options || []), '', '', '', ''].slice(0, 4) })) : [emptyMcq()]);
    } else {
      setTargetChapterId(null);
      setActiveTargetTitle(`General / Mix Paper (${subjectName})`);
      setActiveMcqs(mixMcqs?.length ? mixMcqs.map((m) => ({ ...m, options: [...(m.options || []), '', '', '', ''].slice(0, 4) })) : [emptyMcq()]);
    }
    setMcqModalOpen(true);
  };

  const handleAddMcqRow = () => {
    setActiveMcqs((prev) => [...prev, emptyMcq()]);
  };

  const handleUpdateMcq = (index, field, value, optionIndex = null) => {
    setActiveMcqs((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      if (field === 'options') {
        const options = [...row.options];
        options[optionIndex] = value;
        row.options = options;
      } else {
        row[field] = value;
      }
      updated[index] = row;
      return updated;
    });
  };

  const handleRemoveMcqRow = (index) => {
    setActiveMcqs((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length ? updated : [emptyMcq()];
    });
  };

  const handleSaveActiveMcqs = async () => {
    if (!edit && !add) {
      showPermissionDenied("You don't have authority to edit questions.");
      return;
    }

    const cleanedMcqs = activeMcqs
      .filter((m) => m.question && m.question.trim())
      .map((m) => ({
        question: m.question.trim(),
        options: (m.options || []).map((opt) => String(opt || '').trim()).filter(Boolean),
        correctAnswer: String(m.correctAnswer || '').trim(),
        marks: Number(m.marks) || 1
      }));

    let updatedSubjectRow;
    if (targetChapterId) {
      const updatedChapters = chapters.map((ch) => {
        if (String(ch._id) === String(targetChapterId)) {
          return { ...ch, mcqs: cleanedMcqs };
        }
        return ch;
      });
      updatedSubjectRow = {
        subject: getSubjectId(subjectRow),
        duration: subjectRow.duration || '',
        mcqs: subjectRow.mcqs || [],
        questionAnswers: subjectRow.questionAnswers || [],
        chapters: updatedChapters
      };
    } else {
      updatedSubjectRow = {
        subject: getSubjectId(subjectRow),
        duration: subjectRow.duration || '',
        mcqs: cleanedMcqs,
        questionAnswers: subjectRow.questionAnswers || [],
        chapters: subjectRow.chapters || []
      };
    }

    const ok = await saveUpdatedPaper(updatedSubjectRow, 'Questions saved successfully');
    if (ok) {
      setMcqModalOpen(false);
    }
  };

  // Excel Download (Super Admin only)
  const handleDownloadExcel = (chapter = null) => {
    if (!isSuperAdmin) {
      showPermissionDenied("Only Super Admin can download question papers.");
      return;
    }

    const questionsToExport = chapter ? (chapter.mcqs || []) : mixMcqs;
    const targetName = chapter ? `Chapter_${chapter.chapterNo}_${chapter.chapterName}` : 'Mix_Paper';

    const wb = XLSX.utils.book_new();
    const mcqData = [
      ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Marks']
    ];

    questionsToExport.forEach((mcq) => {
      mcqData.push([
        mcq.question || '',
        mcq.options?.[0] || '',
        mcq.options?.[1] || '',
        mcq.options?.[2] || '',
        mcq.options?.[3] || '',
        mcq.correctAnswer || '',
        mcq.marks || 1
      ]);
    });

    const mcqWs = XLSX.utils.aoa_to_sheet(mcqData);
    mcqWs['!cols'] = [
      { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQs');

    const fileName = `${courseName}_${subjectName}_${targetName}_Questions.xlsx`.replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(wb, fileName);
    toast.success(`Downloaded ${targetName} questions`);
  };

  // Excel Import for Chapter or Mix Paper
  const openImportModal = (chapter = null) => {
    setImportTargetChapterId(chapter ? chapter._id : null);
    setImportFile(null);
    setImportFileName('');
    setImportError('');
    setImportModalOpen(true);
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFile(file);
    setImportFileName(file.name);
    setImportError('');
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      setImportError('Pehle Excel (.xlsx) file select karein');
      return;
    }

    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        defval: '',
        raw: false,
        blankrows: false
      });

      const parsedMcqs = parseExcelMcqRows(sheetRows);
      if (!parsedMcqs.length) {
        setImportError('Excel me valid MCQ rows nahi mili. Template check karein.');
        return;
      }

      let updatedSubjectRow;
      if (importTargetChapterId) {
        const updatedChapters = chapters.map((ch) => {
          if (String(ch._id) === String(importTargetChapterId)) {
            return {
              ...ch,
              mcqs: [...(ch.mcqs || []), ...parsedMcqs]
            };
          }
          return ch;
        });
        updatedSubjectRow = {
          subject: getSubjectId(subjectRow),
          duration: subjectRow.duration || '',
          mcqs: subjectRow.mcqs || [],
          questionAnswers: subjectRow.questionAnswers || [],
          chapters: updatedChapters
        };
      } else {
        updatedSubjectRow = {
          subject: getSubjectId(subjectRow),
          duration: subjectRow.duration || '',
          mcqs: [...(subjectRow.mcqs || []), ...parsedMcqs],
          questionAnswers: subjectRow.questionAnswers || [],
          chapters: subjectRow.chapters || []
        };
      }

      const ok = await saveUpdatedPaper(
        updatedSubjectRow,
        `Successfully imported ${parsedMcqs.length} MCQs`
      );
      if (ok) {
        setImportModalOpen(false);
      }
    } catch (err) {
      setImportError(err.message || 'Excel read error');
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const mcqData = [
      ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Marks'],
      ['What is computer hardware?', 'Physical components', 'Software', 'Internet', 'None of these', 'Physical components', '1'],
      ['CPU stands for?', 'Central Processing Unit', 'Central Power Unit', 'Core Process Unit', 'Control Processing Unit', 'Central Processing Unit', '1']
    ];
    const mcqWs = XLSX.utils.aoa_to_sheet(mcqData);
    mcqWs['!cols'] = [
      { wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQs');
    XLSX.writeFile(wb, 'Chapter_MCQ_Import_Template.xlsx');
  };

  if (isLoading && !paper) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        <Loader className="animate-spin mr-2" size={20} /> Loading chapters...
      </div>
    );
  }

  if (!paper || !subjectRow) {
    return (
      <div className="container mx-auto p-4">
        <button onClick={() => navigate(`/master/final-exam-question-paper/subjects/${id}`)} className="border border-gray-300 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-50 mb-4">
          <ArrowLeft size={16} /> Back To Subjects
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Subject details nahi mili.
        </div>
      </div>
    );
  }

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="view">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 bg-white p-5 rounded-xl border shadow-sm">
          <div>
            <button
              onClick={() => navigate(`/master/final-exam-question-paper/subjects/${id}`)}
              className="border border-gray-300 bg-gray-50 text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gray-100 mb-2 shadow-xs transition-colors"
            >
              <ArrowLeft size={14} /> Back To Subjects
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="text-primary" size={24} />
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{subjectName}</h1>
            </div>
            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-3">
              <span>Course: <strong className="text-blue-700">{courseName}</strong></span>
              <span>•</span>
              <span>Total Questions: <strong className="text-emerald-700">{totalSubjectMcqs} MCQs</strong></span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(`/master/final-exam-question-paper/view/${id}?subjectId=${subjectId}`)}
              className="border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="View / Print Combined Subject Paper"
            >
              <Printer size={16} /> View / Print Paper
            </button>
            {add && (
              <button
                onClick={openAddChapterModal}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1.5 shadow text-xs font-bold transition-all"
              >
                <Plus size={16} /> Add Chapter
              </button>
            )}
          </div>
        </div>

        {/* Chapters Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Chapter Wise Question Banks ({chapters.length} Chapters)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.length ? chapters.map((ch, index) => {
              const chMcqsCount = ch.mcqs?.length || 0;
              const chQaCount = ch.questionAnswers?.length || 0;
              const chMarks = sumMarks(ch.mcqs) + sumMarks(ch.questionAnswers);

              return (
                <div key={ch._id || index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-blue-200">
                        Chapter {ch.chapterNo || index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {edit && (
                          <button
                            onClick={() => openEditChapterModal(ch)}
                            className="p-1 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                            title="Edit Chapter Info"
                          >
                            <Edit size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteChapter(ch)}
                            className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                            title="Delete Chapter"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-3 line-clamp-2">
                      {ch.chapterName}
                    </h3>
                    <div className="flex items-center gap-2 mb-4 text-xs font-semibold">
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                        {chMcqsCount} MCQs
                      </span>
                      {chQaCount > 0 && (
                        <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200">
                          {chQaCount} Q&A
                        </span>
                      )}
                      <span className="text-gray-500 ml-auto font-bold">{chMarks} Marks</span>
                    </div>
                  </div>

                  {/* Chapter Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openManageMcqsModal(ch)}
                      className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      title="Manage Questions"
                    >
                      <Eye size={14} /> MCQs ({chMcqsCount})
                    </button>
                    {edit && (
                      <button
                        onClick={() => openImportModal(ch)}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        title="Import Excel to Chapter"
                      >
                        <Upload size={14} /> Import
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDownloadExcel(ch)}
                        className="bg-gray-50 text-gray-700 hover:bg-gray-200 border border-gray-200 p-1.5 rounded-lg text-xs font-bold transition-all"
                        title="Download Chapter Questions (Excel)"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                <Layers size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-gray-700">No chapters added yet.</p>
                <p className="text-xs text-gray-400 mt-1">Add Chapter 1, Chapter 2... to organize your MCQs chapter-wise.</p>
                {add && (
                  <button
                    onClick={openAddChapterModal}
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add First Chapter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mix Paper / General Questions Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-200 text-amber-900 font-black text-xs px-2 py-0.5 rounded uppercase tracking-wider">
                  Mix Paper / General
                </span>
                <h3 className="text-base font-bold text-gray-900">Unassigned & Legacy Mix Questions</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Jo questions kisi specific chapter ke nahi hain ya pehle se uploaded hain, wo yahan safely mix paper me rehte hain.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white border border-amber-300 text-amber-900 font-bold px-3 py-1 rounded-lg text-xs shadow-2xs">
                {mixMcqs.length} MCQs {mixQa.length > 0 ? `| ${mixQa.length} Q&A` : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-amber-200/60">
            {/* Eye button to open full paper with all chapters in separate page */}
            <button
              type="button"
              onClick={() => navigate(`/master/final-exam-question-paper/view/${id}?subjectId=${subjectId}&viewMode=mix`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="View Complete Paper with All Chapters"
            >
              <Eye size={15} /> View Full Mix Paper (All Chapters)
            </button>

            {/* Manage/Edit only the unassigned mix questions */}
            <button
              type="button"
              onClick={() => openManageMcqsModal(null)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Edit Unassigned Questions"
            >
              <Edit size={14} /> Edit Unassigned Mix MCQs ({mixMcqs.length})
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleDownloadExcel(null)}
                className="bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Download Mix Paper Excel"
              >
                <Download size={14} /> Download Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapter Add / Edit Modal */}
      {chapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-base">
                <Layers size={18} /> {editingChapterId ? 'Edit Chapter' : 'Add New Chapter'}
              </h3>
              <button onClick={() => setChapterModalOpen(false)} className="text-white hover:text-red-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveChapter} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chapter No *</label>
                <input
                  type="text"
                  value={chapterForm.chapterNo}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapterNo: e.target.value })}
                  placeholder="e.g. 1 or 2"
                  className="w-full border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chapter Name *</label>
                <input
                  type="text"
                  value={chapterForm.chapterName}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapterName: e.target.value })}
                  placeholder="e.g. Introduction to MS Word"
                  className="w-full border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setChapterModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 flex items-center gap-1.5 shadow"
                >
                  <Save size={16} /> {editingChapterId ? 'Update Chapter' : 'Add Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MCQs Manage Modal (Chapter or Mix Paper) */}
      {mcqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[90vh]">
            <div className="bg-primary text-white p-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileQuestion size={20} /> Manage MCQs: {activeTargetTitle}
                </h3>
                <p className="text-xs text-blue-100">Total MCQs: {activeMcqs.length}</p>
              </div>
              <button onClick={() => setMcqModalOpen(false)} className="text-white hover:text-red-200">
                <X size={22} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <span className="text-xs font-bold text-blue-900">
                  Har MCQ ka Sawal (Question), 4 Options aur Correct Answer enter karein.
                </span>
                <button
                  type="button"
                  onClick={handleAddMcqRow}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shadow-xs"
                >
                  <Plus size={14} /> Add MCQ
                </button>
              </div>

              <div className="space-y-3">
                {activeMcqs.map((mcq, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/70 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_34px] gap-2 items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-800 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <input
                          value={mcq.question}
                          onChange={(e) => handleUpdateMcq(index, 'question', e.target.value)}
                          className="w-full border p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary font-medium"
                          placeholder={`Enter Question ${index + 1}`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-500">Marks:</span>
                        <input
                          type="number"
                          min="1"
                          value={mcq.marks}
                          onChange={(e) => handleUpdateMcq(index, 'marks', e.target.value)}
                          className="w-14 border p-1.5 rounded text-sm bg-white text-center font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMcqRow(index)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                        title="Remove Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {mcq.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-600 w-4 shrink-0">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <input
                            value={opt}
                            onChange={(e) => handleUpdateMcq(index, 'options', e.target.value, optIndex)}
                            className="w-full border p-1.5 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-primary"
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-green-700 shrink-0">Correct Answer:</span>
                      <input
                        value={mcq.correctAnswer}
                        onChange={(e) => handleUpdateMcq(index, 'correctAnswer', e.target.value)}
                        className="border border-green-300 p-1.5 rounded text-xs bg-white text-green-800 font-semibold w-full sm:w-1/2 outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="Must match one of the options (e.g. Option A exact text)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between rounded-b-xl">
              <button
                type="button"
                onClick={handleAddMcqRow}
                className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold hover:bg-gray-100 flex items-center gap-1"
              >
                <Plus size={14} /> Add Another Question
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMcqModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveActiveMcqs}
                  className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 flex items-center gap-1.5 shadow"
                >
                  <Save size={16} /> Save Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-base">
                <FileSpreadsheet size={18} /> Import MCQs from Excel (.xlsx)
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-white hover:text-red-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900">
                <span>Standard Excel format required (Question, Option 1, Option 2, Option 3, Option 4, Correct Answer, Marks)</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 shrink-0 ml-2"
                >
                  <Download size={12} /> Template
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Excel File (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFileChange}
                  className="w-full border p-2 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {importFileName && (
                  <p className="text-xs text-emerald-700 font-bold mt-1">Selected: {importFileName}</p>
                )}
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs font-semibold">
                  {importError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!importFile}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  <Upload size={16} /> Import MCQs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FinalExamQuestionPaperAccessGate>
  );
};

export default FinalExamQuestionPaperChapters;

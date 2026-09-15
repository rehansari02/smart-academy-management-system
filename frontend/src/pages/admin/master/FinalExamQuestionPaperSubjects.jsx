import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Download, Edit, Eye, FileQuestion, Layers, Loader, Plus, Printer, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { fetchFinalExamQuestionPapers, updateFinalExamQuestionPaper } from '../../../features/master/masterSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const getSubjectId = (row) => row?.subject?._id || row?.subject;
const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || 'Subject';
const sumMarks = (rows = []) => rows.reduce((total, row) => total + (Number(row.marks) || 0), 0);

const FinalExamQuestionPaperSubjects = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { finalExamQuestionPapers, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const { add, delete: canDelete } = useUserRights('Final Exam Question Paper');
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  useEffect(() => {
    if (!finalExamQuestionPapers.length) {
      dispatch(fetchFinalExamQuestionPapers());
    }
  }, [dispatch, finalExamQuestionPapers.length]);

  const paper = useMemo(
    () => finalExamQuestionPapers.find((item) => String(item._id) === String(id)),
    [finalExamQuestionPapers, id]
  );

  const courseId = paper?.course?._id || paper?.course;
  const courseName = paper?.course?.name || 'Course';

  const downloadSubjectExcel = (subjectRow) => {
    if (!isSuperAdmin) {
      showPermissionDenied("Only Super Admin can download question papers.");
      return;
    }
    const subjectName = getSubjectName(subjectRow);
    const wb = XLSX.utils.book_new();

    // 1. Combine all MCQs across chapters & mix paper
    const allMcqs = [
      ...(subjectRow.mcqs || []).map((m) => ({ ...m, chapter: 'Mix / General' })),
      ...((subjectRow.chapters || []).flatMap((ch) =>
        (ch.mcqs || []).map((m) => ({ ...m, chapter: `Chapter ${ch.chapterNo}: ${ch.chapterName}` }))
      ))
    ];

    const mcqData = [
      ['Chapter', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Marks']
    ];
    allMcqs.forEach((mcq) => {
      mcqData.push([
        mcq.chapter || 'General',
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
      { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQs');

    const cleanFileName = `${courseName}_${subjectName}_All_Questions.xlsx`.replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(wb, cleanFileName);
    toast.success(`Downloaded questions for ${subjectName}`);
  };

  const handleDeleteSubject = async (subjectRow) => {
    if (!canDelete) {
      showPermissionDenied("You don't have authority to delete subject question paper.");
      return;
    }
    const subjectName = getSubjectName(subjectRow);
    const subjectId = getSubjectId(subjectRow);

    const isConfirmed = window.confirm(`Are you sure you want to delete question paper for "${subjectName}"?`);
    if (!isConfirmed) return;

    const remainingSubjects = (paper.subjects || []).filter(
      (s) => String(getSubjectId(s)) !== String(subjectId)
    );

    const result = await dispatch(updateFinalExamQuestionPaper({
      id: paper._id,
      data: {
        title: paper.title,
        examName: paper.examName || 'Final Exam',
        course: courseId,
        remarks: paper.remarks || '',
        isActive: paper.isActive !== false,
        subjects: remainingSubjects.map((s) => ({
          subject: getSubjectId(s),
          duration: s.duration || '',
          mcqs: s.mcqs || [],
          questionAnswers: s.questionAnswers || [],
          chapters: s.chapters || []
        }))
      }
    }));

    if (updateFinalExamQuestionPaper.fulfilled.match(result)) {
      toast.success(`Question paper for "${subjectName}" deleted successfully`);
      dispatch(fetchFinalExamQuestionPapers());
    } else {
      toast.error(result.payload || 'Failed to delete subject question paper');
    }
  };

  if (isLoading && !paper) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        <Loader className="animate-spin mr-2" size={20} /> Loading subjects...
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="container mx-auto p-4">
        <button onClick={() => navigate('/master/final-exam-question-paper')} className="border border-gray-300 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-50 mb-4">
          <ArrowLeft size={16} /> Back To Course List
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Question paper subjects nahi mile.
        </div>
      </div>
    );
  }

  const validSubjects = (paper.subjects || []).filter((subjectRow) => {
    const name = String(getSubjectName(subjectRow)).toLowerCase();
    return !name.includes('project') && !name.includes('discipline');
  });

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="view">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 bg-white p-5 rounded-xl border shadow-sm">
          <div>
            <button onClick={() => navigate('/master/final-exam-question-paper')} className="border border-gray-300 bg-white text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gray-50 mb-2 shadow-xs">
              <ArrowLeft size={14} /> Back To Course List
            </button>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Subject Question Papers</h1>
            <p className="text-sm font-semibold text-blue-700 flex items-center gap-2 mt-1">
              <FileQuestion size={16} /> {courseName}
              <span className="text-xs text-gray-400 font-normal">({validSubjects.length} subjects configured)</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {add && (
              <button
                onClick={() => navigate(`/master/final-exam-question-paper/add?courseId=${courseId}&paperId=${paper._id}`)}
                className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow text-sm font-bold"
              >
                <Plus size={18} /> Add Subject Paper
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-gray-200">
          <table className="w-full border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3 border w-16 text-center">Sr No</th>
                <th className="p-3 border">Subject Name</th>
                <th className="p-3 border text-center w-36">Chapters</th>
                <th className="p-3 border text-center w-40">Total Questions</th>
                <th className="p-3 border text-center w-28">Total Marks</th>
                <th className="p-3 border text-center w-52">Actions</th>
              </tr>
            </thead>
            <tbody>
              {validSubjects.length ? validSubjects.map((subjectRow, index) => {
                const subjectId = getSubjectId(subjectRow);
                const subjectName = getSubjectName(subjectRow);
                const chaptersCount = subjectRow.chapters?.length || 0;
                const chapterMcqs = (subjectRow.chapters || []).reduce((acc, ch) => acc + (ch.mcqs?.length || 0), 0);
                const mixMcqsCount = subjectRow.mcqs?.length || 0;
                const totalMcqs = chapterMcqs + mixMcqsCount;
                const qaCount = (subjectRow.questionAnswers?.length || 0) + (subjectRow.chapters || []).reduce((acc, ch) => acc + (ch.questionAnswers?.length || 0), 0);
                const totalMarks = sumMarks(subjectRow.mcqs) + sumMarks(subjectRow.questionAnswers)
                  + (subjectRow.chapters || []).reduce((acc, ch) => acc + sumMarks(ch.mcqs) + sumMarks(ch.questionAnswers), 0);

                return (
                  <tr key={subjectId || index} className="hover:bg-blue-50 text-sm border-b border-gray-100">
                    <td className="p-3 border text-center font-medium text-gray-600">{index + 1}</td>
                    <td className="p-3 border">
                      <button
                        type="button"
                        onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}/chapters/${subjectId}`)}
                        className="font-bold text-gray-900 hover:text-indigo-700 hover:underline text-left"
                        title="Manage Chapters & Questions"
                      >
                        {subjectName}
                      </button>
                    </td>
                    <td className="p-3 border text-center">
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-purple-200">
                        <Layers size={13} /> {chaptersCount} Chapters
                      </span>
                    </td>
                    <td className="p-3 border text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded text-xs border border-blue-200">
                        {totalMcqs} MCQs {qaCount > 0 ? `| ${qaCount} Q&A` : ''}
                      </span>
                    </td>
                    <td className="p-3 border text-center font-bold text-gray-800">
                      {totalMarks} Marks
                    </td>
                    <td className="p-3 border">
                      <div className="flex items-center justify-center gap-2">
                        {/* View / Manage Chapters & MCQs */}
                        <button
                          onClick={() => navigate(`/master/final-exam-question-paper/subjects/${paper._id}/chapters/${subjectId}`)}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                          title="Manage Chapters & MCQs"
                        >
                          <Eye size={14} /> Chapters
                        </button>

                        {/* View / Print Full Subject Paper */}
                        <button
                          onClick={() => navigate(`/master/final-exam-question-paper/view/${paper._id}?subjectId=${subjectId}`)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
                          title="View / Print Full Paper"
                        >
                          <Printer size={16} />
                        </button>

                        {/* Download Excel - Super Admin only */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => downloadSubjectExcel(subjectRow)}
                            className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                            title="Download All Questions (Excel)"
                          >
                            <Download size={16} />
                          </button>
                        )}

                        {/* Delete Subject Paper */}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSubject(subjectRow)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-800"
                            title="Delete Subject Paper"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    No subject question papers found in this course.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default FinalExamQuestionPaperSubjects;

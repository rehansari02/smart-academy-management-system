import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Download, Edit, Eye, FileQuestion, Loader, Plus, Trash2 } from 'lucide-react';
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
  const { add, edit, delete: canDelete } = useUserRights('Final Exam Question Paper');
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

    // 1. MCQs Sheet
    const mcqData = [
      ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Marks']
    ];
    (subjectRow.mcqs || []).forEach((mcq) => {
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
      { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, mcqWs, 'MCQs');

    // 2. Q&A Sheet (if any)
    if (subjectRow.questionAnswers?.length) {
      const qaData = [['Question', 'Answer', 'Marks']];
      subjectRow.questionAnswers.forEach((qa) => {
        qaData.push([qa.question || '', qa.answer || '', qa.marks || 1]);
      });
      const qaWs = XLSX.utils.aoa_to_sheet(qaData);
      qaWs['!cols'] = [{ wch: 45 }, { wch: 45 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, qaWs, 'Question Answers');
    }

    const cleanFileName = `${courseName}_${subjectName}_Questions.xlsx`.replace(/[/\\?%*:|"<>]/g, '_');
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
          questionAnswers: s.questionAnswers || []
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
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <button onClick={() => navigate('/master/final-exam-question-paper')} className="border border-gray-300 bg-white text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gray-50 mb-2 shadow-sm">
              <ArrowLeft size={14} /> Back To Course List
            </button>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Subject Question Papers</h1>
            <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
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

        <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
          <table className="w-full border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                <th className="p-3 border w-16 text-center">Sr No</th>
                <th className="p-3 border">Subject Name</th>
                <th className="p-3 border text-center">Duration</th>
                <th className="p-3 border text-center">MCQ Count</th>
                <th className="p-3 border text-center">Q&A Count</th>
                <th className="p-3 border text-center">Total Marks</th>
                <th className="p-3 border text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {validSubjects.length ? validSubjects.map((subjectRow, index) => {
                const subjectId = getSubjectId(subjectRow);
                const subjectName = getSubjectName(subjectRow);
                const mcqCount = subjectRow.mcqs?.length || 0;
                const qaCount = subjectRow.questionAnswers?.length || 0;
                const totalMarks = sumMarks(subjectRow.mcqs) + sumMarks(subjectRow.questionAnswers);

                return (
                  <tr key={subjectId || index} className="hover:bg-blue-50 text-sm border-b border-gray-100">
                    <td className="p-3 border text-center font-medium text-gray-600">{index + 1}</td>
                    <td className="p-3 border">
                      <div className="font-bold text-gray-900">{subjectName}</div>
                    </td>
                    <td className="p-3 border text-center text-gray-700 font-medium">
                      {subjectRow.duration || '-'}
                    </td>
                    <td className="p-3 border text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs border border-blue-200">
                        {mcqCount} MCQs
                      </span>
                    </td>
                    <td className="p-3 border text-center">
                      <span className="inline-block bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs border border-emerald-200">
                        {qaCount} Q&A
                      </span>
                    </td>
                    <td className="p-3 border text-center font-bold text-gray-800">
                      {totalMarks} Marks
                    </td>
                    <td className="p-3 border">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View / Print */}
                        <button
                          onClick={() => navigate(`/master/final-exam-question-paper/view/${paper._id}?subjectId=${subjectId}`)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
                          title="View / Print Subject Paper"
                        >
                          <Eye size={17} />
                        </button>

                        {/* Edit Subject Paper */}
                        {edit && (
                          <button
                            onClick={() => navigate(`/master/final-exam-question-paper/add?courseId=${courseId}&subjectId=${subjectId}&paperId=${paper._id}`)}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                            title="Edit Questions"
                          >
                            <Edit size={17} />
                          </button>
                        )}

                        {/* Download Excel - Super Admin only */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => downloadSubjectExcel(subjectRow)}
                            className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                            title="Download Questions (Excel)"
                          >
                            <Download size={17} />
                          </button>
                        )}

                        {/* Delete Subject Paper */}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSubject(subjectRow)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-800"
                            title="Delete Subject Paper"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">
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

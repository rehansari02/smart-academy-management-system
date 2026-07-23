import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Edit, Eye, Loader } from 'lucide-react';
import { fetchFinalExamQuestionPapers } from '../../../features/master/masterSlice';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const getSubjectId = (row) => row?.subject?._id || row?.subject;
const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || 'Subject';

const FinalExamQuestionPaperSubjects = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { finalExamQuestionPapers, isLoading } = useSelector((state) => state.master);

  useEffect(() => {
    if (!finalExamQuestionPapers.length) {
      dispatch(fetchFinalExamQuestionPapers());
    }
  }, [dispatch, finalExamQuestionPapers.length]);

  const paper = useMemo(
    () => finalExamQuestionPapers.find((item) => String(item._id) === String(id)),
    [finalExamQuestionPapers, id]
  );

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

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="view">
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <button onClick={() => navigate('/master/final-exam-question-paper')} className="border border-gray-300 px-4 py-2 rounded text-sm font-bold inline-flex items-center gap-2 hover:bg-gray-50 mb-3">
            <ArrowLeft size={16} /> Back To Course List
          </button>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Subject Question Papers</h1>
          <p className="text-sm text-gray-500">{paper.course?.name || '-'}</p>
        </div>
        <button onClick={() => navigate('/master/final-exam-question-paper')} className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 flex items-center gap-2 shadow text-sm font-bold">
          <Edit size={17} /> Manage Courses
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border">
        <table className="w-full border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
              <th className="p-3 border w-16 text-center">Sr No</th>
              <th className="p-3 border">Subject</th>
              <th className="p-3 border text-center">Duration</th>
              <th className="p-3 border text-center">Questions</th>
              <th className="p-3 border text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {paper.subjects?.length ? paper.subjects
              .filter((subjectRow) => {
                const name = String(getSubjectName(subjectRow)).toLowerCase();
                return !name.includes('project') && !name.includes('discipline');
              })
              .map((subjectRow, index) => {
              const subjectId = getSubjectId(subjectRow);
              return (
                <tr key={subjectId || index} className="hover:bg-blue-50 text-sm border-b border-gray-100">
                  <td className="p-3 border text-center">{index + 1}</td>
                  <td className="p-3 border font-semibold text-gray-900">{getSubjectName(subjectRow)}</td>
                  <td className="p-3 border text-center text-gray-700">{subjectRow.duration || '-'}</td>
                  <td className="p-3 border text-center text-gray-700">
                    MCQ: {subjectRow.mcqs?.length || 0} | Q&A: {subjectRow.questionAnswers?.length || 0}
                  </td>
                  <td className="p-3 border text-center">
                    <button
                      onClick={() => navigate(`/master/final-exam-question-paper/view/${paper._id}?subjectId=${subjectId}`)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="View / Print Subject Paper"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">No subjects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default FinalExamQuestionPaperSubjects;

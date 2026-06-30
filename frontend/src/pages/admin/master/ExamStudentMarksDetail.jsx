import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const getOptionText = (question, optionLetter) => {
  if (!optionLetter) return '-';
  const optionIndex = optionLetter.charCodeAt(0) - 65;
  return question.options?.[optionIndex] || '-';
};

const ExamStudentMarksDetail = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDetail = async () => {
    if (!attemptId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}exam-student-marks/${attemptId}`);
      setDetail(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load answer sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [attemptId]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button type="button" onClick={() => navigate('/master/exam-student-marks')} className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Answer Sheet</h2>
          {detail && <p className="mt-1 text-sm font-semibold text-gray-500">{detail.student?.name} | {detail.course?.name} | {detail.subject?.name || detail.subject?.printedName}</p>}
        </div>
        <button type="button" onClick={loadDetail} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-lg border-t-4 border-primary bg-white p-5 shadow">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-gray-500"><Loader className="mr-2 animate-spin" size={20} /> Loading answer sheet...</div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">Answered</div><div className="text-lg font-black">{detail.answeredCount || 0}/{detail.totalQuestions || 0}</div></div>
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">MCQ Correct</div><div className="text-lg font-black text-green-700">{detail.score?.mcqCorrectCount || 0}</div></div>
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">MCQ Wrong</div><div className="text-lg font-black text-red-700">{detail.score?.mcqWrongCount || 0}</div></div>
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">QA Answered</div><div className="text-lg font-black">{detail.score?.qaAnsweredCount || 0}</div></div>
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">Marks</div><div className="text-lg font-black text-blue-700">{detail.score?.totalMarksObtained || 0}/{detail.score?.totalMarksPossible || 0}</div></div>
            </div>

            <section>
              <h4 className="mb-3 text-sm font-black uppercase text-gray-700">MCQ Answers</h4>
              <div className="space-y-3">
                {detail.mcqs?.length ? detail.mcqs.map((q) => (
                  <div key={`mcq-${q.questionIndex}`} className="rounded-lg border p-4">
                    <div className="flex justify-between gap-3"><p className="font-bold text-gray-900">{q.questionIndex}. {q.question}</p><span className={`h-fit rounded-full px-2 py-1 text-[10px] font-black ${q.isCorrect ? 'bg-green-100 text-green-700' : q.selectedOption ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{q.isCorrect ? 'Correct' : q.selectedOption ? 'Wrong' : 'Not Answered'}</span></div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{(q.options || []).map((option, idx) => { const letter = String.fromCharCode(65 + idx); const isSelected = q.selectedOption === letter; const isCorrect = q.correctOption === letter; return <div key={letter} className={`rounded border px-3 py-2 text-sm ${isCorrect ? 'border-green-400 bg-green-50 font-bold text-green-800' : isSelected ? 'border-red-400 bg-red-50 font-bold text-red-800' : 'bg-gray-50'}`}><span>{letter}. {option}</span>{isSelected && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Selected</span>}{isCorrect && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-[10px] font-black uppercase text-green-700">Correct</span>}</div>; })}</div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div className={`rounded-lg border p-3 ${q.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="text-[10px] font-black uppercase text-gray-500">Student Selected</div>
                        <p className="mt-1 text-sm font-bold text-gray-800">{q.selectedOption || '-'}{q.selectedOption ? `. ${getOptionText(q, q.selectedOption)}` : ''}</p>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="text-[10px] font-black uppercase text-green-700">Correct Answer</div>
                        <p className="mt-1 text-sm font-bold text-green-800">{q.correctOption || '-'}{q.correctOption ? `. ${getOptionText(q, q.correctOption)}` : ''}</p>
                      </div>
                    </div>
                  </div>
                )) : <div className="rounded-lg border border-dashed p-5 text-center text-gray-400">No MCQ questions found.</div>}
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-black uppercase text-gray-700">Question Answers</h4>
              <div className="space-y-3">
                {detail.questionAnswers?.length ? detail.questionAnswers.map((q) => (
                  <div key={`qa-${q.questionIndex}`} className="rounded-lg border p-4">
                    <p className="font-bold text-gray-900">{q.questionIndex}. {q.question}</p>
                    <div className="mt-3 rounded-lg border bg-blue-50 p-3"><div className="text-[10px] font-black uppercase text-blue-700">Student Answer</div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{q.answerText || '-'}</p></div>
                    <div className="mt-3 rounded-lg border bg-green-50 p-3"><div className="text-[10px] font-black uppercase text-green-700">Expected Answer</div><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{q.expectedAnswer || '-'}</p></div>
                  </div>
                )) : <div className="rounded-lg border border-dashed p-5 text-center text-gray-400">No question answers found.</div>}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">Answer sheet not found.</div>
        )}
      </div>
    </div>
  );
};

export default ExamStudentMarksDetail;

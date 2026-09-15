import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader, Printer } from 'lucide-react';
import logo from '../../../assets/logo2.png';
import bannerImage from '../../../assets/18year.png';
import FinalExamQuestionPaperAccessGate from '../../../components/master/FinalExamQuestionPaperAccessGate';

const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || 'Subject';
const taglineStart = '\u0938\u092a\u0928\u0947 \u091c\u094b';
const taglineEnd = '\u092c\u0928\u093e \u0926\u0947';
const sumMarks = (rows = []) => rows.reduce((total, row) => total + (Number(row.marks) || 0), 0);
const getEachMarksText = (rows = []) => {
  const marks = [...new Set(rows.map((row) => Number(row.marks) || 1))];
  if (!marks.length) return '1 mark each';
  if (marks.length === 1) return `${marks[0]} mark${marks[0] > 1 ? 's' : ''} each`;
  return 'mixed marks';
};

const ViewFinalExamQuestionPaper = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subjectId');
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(searchParams.get('viewMode') || 'mix'); // 'mix' or 'chapters'

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/master/final-exam-question-paper/${id}`, {
          withCredentials: true
        });
        setPaper(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Question paper load nahi hua');
      } finally {
        setLoading(false);
      }
    };

    fetchPaper();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        <Loader className="animate-spin mr-2" size={20} /> Loading question paper...
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="container mx-auto p-4">
        <button onClick={() => navigate('/master/final-exam-question-paper')} className="print:hidden border px-4 py-2 rounded text-sm font-bold mb-4">
          <ArrowLeft size={16} className="inline mr-1" /> Back
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error || 'Question paper not found'}</div>
      </div>
    );
  }

  const visibleSubjects = subjectId
    ? (paper.subjects || []).filter((subjectRow) => String(subjectRow?.subject?._id || subjectRow?.subject) === String(subjectId))
    : (paper.subjects || []);
  const firstSubject = visibleSubjects[0] || paper.subjects?.[0];

  const returnPath = id && subjectId
    ? `/master/final-exam-question-paper/subjects/${id}/chapters/${subjectId}`
    : id
    ? `/master/final-exam-question-paper/subjects/${id}`
    : '/master/final-exam-question-paper';

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="view">
    <div className="bg-gray-100 min-h-screen print:bg-white">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 10mm !important; width: 210mm !important; min-height: 297mm !important; max-width: none !important; border: 0 !important; box-sizing: border-box !important; }
          .print-header { padding: 8px 0 12px !important; border-bottom: 2px solid #1d4ed8 !important; }
          .print-brand { min-height: 74px !important; align-items: flex-start !important; }
          .print-logo { height: 54px !important; }
          .print-tagline { gap: 8px !important; padding-left: 70px !important; padding-right: 72px !important; }
          .print-tagline h3 { font-size: 22px !important; line-height: 1.1 !important; }
          .print-banner { height: 58px !important; }
          .print-title { margin-top: 8px !important; }
          .print-title h1 { font-size: 18px !important; line-height: 1.1 !important; }
          .print-title p, .print-title span { font-size: 12px !important; }
          .print-content { padding: 14px 0 0 !important; }
          .print-subject-box { background: #f3f4f6 !important; padding: 6px 10px !important; margin-bottom: 10px !important; }
          .print-subject-box h3 { font-size: 14px !important; }
          .print-subject-box p { font-size: 11px !important; margin-top: 2px !important; }
          .print-section-title { font-size: 12px !important; margin-bottom: 8px !important; }
          .print-questions { font-size: 12px !important; margin-left: 18px !important; }
          .print-questions li { margin-bottom: 8px !important; }
          .print-options { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 2px 16px !important; margin-top: 4px !important; }
          .print-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="print:hidden sticky top-20 z-20 bg-white border-b shadow-sm">
        <div className="container mx-auto p-3 flex flex-wrap justify-between items-center gap-3">
          <button onClick={() => navigate(returnPath)} className="border border-gray-300 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
            <ArrowLeft size={16} /> Back
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('mix')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'mix'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Combined Mix Paper (All Chapters)
            </button>
            <button
              onClick={() => setViewMode('chapters')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'chapters'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chapter-Wise View
            </button>
          </div>

          <button onClick={() => window.print()} className="bg-primary text-white px-5 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-800 shadow-xs">
            <Printer size={17} /> Print
          </button>
        </div>
      </div>

      <main className="print-page max-w-5xl mx-auto my-6 bg-white shadow-lg border print:border-0">
        <header className="print-header border-b-4 border-blue-700 p-5">
          <div className="print-brand relative min-h-[118px] flex items-center justify-center">
            <img src={logo} alt="Smart Institute" className="print-logo absolute left-0 top-0 h-16 md:h-20 w-auto object-contain" />

            <div className="print-tagline flex-grow flex flex-col md:flex-row items-center justify-center gap-4 text-center space-y-1 px-20">
              <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                <span className="text-gray-800">{taglineStart}</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 font-extrabold mx-1 font-sans">SMART</span>{' '}
                <span className="text-gray-800">{taglineEnd}</span>
              </h3>
              <img
                src={bannerImage}
                alt="18 Years"
                className="print-banner h-20 sm:h-24 md:h-28 w-auto object-contain"
              />
            </div>
          </div>

          <div className="print-title text-center mt-4">
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Question Paper</h1>
            <p className="text-base font-bold text-gray-800 mt-2">Course: {paper.course?.name || '-'}</p>
            <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 text-sm text-gray-700">
              <span><strong>Subject:</strong> {getSubjectName(firstSubject)}</span>
              <span><strong>Time Duration:</strong> {firstSubject?.duration || '________________'}</span>
            </div>
          </div>
        </header>

        <section className="print-content p-6">
          {visibleSubjects.map((subjectRow, subjectIndex) => {
            const allMcqs = [
              ...((subjectRow.chapters || []).flatMap((ch) =>
                (ch.mcqs || []).map((m) => ({ ...m, chapterTag: `Ch ${ch.chapterNo}: ${ch.chapterName}` }))
              )),
              ...(subjectRow.mcqs || []).map((m) => ({ ...m, chapterTag: 'General / Mix' }))
            ];
            const allQa = [
              ...((subjectRow.chapters || []).flatMap((ch) =>
                (ch.questionAnswers || []).map((qa) => ({ ...qa, chapterTag: `Ch ${ch.chapterNo}: ${ch.chapterName}` }))
              )),
              ...(subjectRow.questionAnswers || []).map((qa) => ({ ...qa, chapterTag: 'General / Mix' }))
            ];
            const hasChapters = (subjectRow.chapters || []).some((ch) => (ch.mcqs?.length || 0) > 0);

            return (
              <div key={subjectIndex} className="print-break mb-8">
                <div className="print-subject-box bg-gray-100 border px-4 py-2 mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Subject: {getSubjectName(subjectRow)}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-bold">Time Duration:</span> {subjectRow.duration || '________________'}
                  </p>
                </div>

                {/* Combined Mix View (All Chapters Combined) */}
                {viewMode === 'mix' ? (
                  allMcqs.length > 0 ? (
                    <div className="mb-6">
                      <h4 className="print-section-title text-sm font-black uppercase text-blue-800 mb-3 flex items-center justify-between gap-3 border-b pb-2">
                        <span>A. Combined Multiple Choice Questions (All Chapters)</span>
                        <span className="text-black font-black normal-case">
                          {sumMarks(allMcqs)} marks, {allMcqs.length} questions ({getEachMarksText(allMcqs)})
                        </span>
                      </h4>
                      <ol className="print-questions list-decimal ml-6 space-y-4 text-sm text-gray-900">
                        {allMcqs.map((mcq, index) => (
                          <li key={index} className="pl-1">
                            <div className="font-semibold flex items-start justify-between gap-2">
                              <span>{mcq.question}</span>
                              {mcq.chapterTag && (
                                <span className="print:hidden text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                                  {mcq.chapterTag}
                                </span>
                              )}
                            </div>
                            <div className="print-options grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-gray-800">
                              {(mcq.options || []).map((option, optionIndex) => (
                                <div key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</div>
                              ))}
                            </div>
                            {mcq.correctAnswer && (
                              <div className="print:hidden text-xs text-green-700 mt-1 font-semibold">Answer: {mcq.correctAnswer}</div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-sm">No MCQs found.</div>
                  )
                ) : (
                  /* Chapter-wise View */
                  hasChapters ? (
                    <div className="space-y-6">
                      {(subjectRow.chapters || []).filter((ch) => (ch.mcqs?.length || 0) > 0).map((ch, chIdx) => (
                        <div key={ch._id || chIdx} className="border-b pb-4">
                          <h4 className="text-sm font-black uppercase text-blue-900 bg-blue-50 px-3 py-1.5 rounded mb-3">
                            Chapter {ch.chapterNo}: {ch.chapterName} ({ch.mcqs.length} MCQs)
                          </h4>
                          <ol className="print-questions list-decimal ml-6 space-y-4 text-sm text-gray-900">
                            {ch.mcqs.map((mcq, index) => (
                              <li key={index} className="pl-1">
                                <div className="font-semibold">{mcq.question}</div>
                                <div className="print-options grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-gray-800">
                                  {(mcq.options || []).map((option, optionIndex) => (
                                    <div key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</div>
                                  ))}
                                </div>
                                {mcq.correctAnswer && (
                                  <div className="print:hidden text-xs text-green-700 mt-1">Answer: {mcq.correctAnswer}</div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}

                      {/* Unassigned Mix questions if any */}
                      {(subjectRow.mcqs?.length || 0) > 0 && (
                        <div className="border-b pb-4">
                          <h4 className="text-sm font-black uppercase text-amber-900 bg-amber-50 px-3 py-1.5 rounded mb-3">
                            General / Mix Questions ({subjectRow.mcqs.length} MCQs)
                          </h4>
                          <ol className="print-questions list-decimal ml-6 space-y-4 text-sm text-gray-900">
                            {subjectRow.mcqs.map((mcq, index) => (
                              <li key={index} className="pl-1">
                                <div className="font-semibold">{mcq.question}</div>
                                <div className="print-options grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-gray-800">
                                  {(mcq.options || []).map((option, optionIndex) => (
                                    <div key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</div>
                                  ))}
                                </div>
                                {mcq.correctAnswer && (
                                  <div className="print:hidden text-xs text-green-700 mt-1">Answer: {mcq.correctAnswer}</div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  ) : (
                    allMcqs.length > 0 && (
                      <div className="mb-6">
                        <h4 className="print-section-title text-sm font-black uppercase text-blue-800 mb-3 flex items-center justify-between gap-3">
                          <span>A. MCQ Questions</span>
                          <span className="text-black font-black normal-case">
                            {sumMarks(allMcqs)} marks, {getEachMarksText(allMcqs)}
                          </span>
                        </h4>
                        <ol className="print-questions list-decimal ml-6 space-y-4 text-sm text-gray-900">
                          {allMcqs.map((mcq, index) => (
                            <li key={index} className="pl-1">
                              <div className="font-semibold">{mcq.question}</div>
                              <div className="print-options grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-gray-800">
                                {(mcq.options || []).map((option, optionIndex) => (
                                  <div key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</div>
                                ))}
                              </div>
                              {mcq.correctAnswer && (
                                <div className="print:hidden text-xs text-green-700 mt-1">Answer: {mcq.correctAnswer}</div>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  )
                )}

                {allQa.length > 0 && (
                  <div className="mt-6">
                    <h4 className="print-section-title text-sm font-black uppercase text-green-800 mb-3 flex items-center justify-between gap-3">
                      <span>B. Question Answer</span>
                      <span className="text-black font-black normal-case">
                        {sumMarks(allQa)} marks, {getEachMarksText(allQa)}
                      </span>
                    </h4>
                    <ol className="print-questions list-decimal ml-6 space-y-4 text-sm text-gray-900">
                      {allQa.map((qa, index) => (
                        <li key={index} className="pl-1">
                          <div className="font-semibold">{qa.question}</div>
                          {qa.answer && (
                            <div className="print:hidden text-gray-700 mt-1">Answer: {qa.answer}</div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}

          {paper.remarks && (
            <div className="mt-6 border-t pt-4 text-sm text-gray-700">
              <span className="font-bold">Remarks:</span> {paper.remarks}
            </div>
          )}
        </section>
      </main>
    </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default ViewFinalExamQuestionPaper;

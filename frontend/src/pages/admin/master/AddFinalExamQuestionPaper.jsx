import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, FileQuestion, Loader, Plus, Save, Trash2 } from 'lucide-react';
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
const sumMarks = (rows = []) => rows.reduce((total, row) => total + (Number(row.marks) || 0), 0);
const getCourseId = (course) => course?._id || course;
const getSubjectId = (item) => item?.subject?._id || item?.subject || item?._id || item;
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
      title: course ? `${course.name} Question Paper` : prev.title,
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
      title: coursePaper?.title || (selectedCourse && subject ? `${selectedCourse.name} - ${subject.name} Question Paper` : prev.title),
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
      questionAnswers: form.questionAnswers
        .filter((qa) => qa.question.trim())
        .map((qa) => ({
          question: qa.question.trim(),
          answer: qa.answer.trim(),
          marks: Number(qa.marks) || 1
        }))
  });

  const buildPayload = (course) => ({
    title: `${course?.name || selectedCourse?.name || 'Course'} Question Paper`,
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
    const hasQuestions = subjectPayload.mcqs.length > 0 || subjectPayload.questionAnswers.length > 0;
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
            questionAnswers: row.questionAnswers || []
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

    toast.success(`Question Paper ${needsEdit ? 'Updated' : 'Added'} Successfully for ${targetCourses.length} Course${targetCourses.length > 1 ? 's' : ''}`);
    dispatch(fetchFinalExamQuestionPapers());
    dispatch(resetMasterStatus());
    navigate('/master/final-exam-question-paper');
  };

  return (
    <FinalExamQuestionPaperAccessGate requiredAction="add">
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Add Question Paper</h1>
          <p className="text-sm text-gray-500">Pehle course select karein, phir subject select karke uska paper banayein.</p>
        </div>
        <button onClick={() => navigate('/master/final-exam-question-paper')} className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={17} /> Back To List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-primary text-white p-4 flex items-center gap-2 font-bold">
          <FileQuestion size={20} /> Question Paper Details
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Course *</label>
              <select value={form.course} onChange={(e) => handleCourseChange(e.target.value)} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select Course</option>
                {courses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject *</label>
              <select value={form.subject} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!form.course} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100">
                <option value="">{form.course ? 'Select Subject' : 'Select Course First'}</option>
                {availableSubjectOptions.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Time Duration</label>
              <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 2 Hours" />
            </div>
          </div>

          {form.course && availableSubjectOptions.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
              Is course ke sabhi subjects ke paper already ban chuke hain. Naya subject nahi bacha.
            </div>
          )}

          {selectedCourse && selectedSubject && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3">
                <h2 className="font-bold text-gray-800">{selectedCourse.name} - {selectedSubject.name}</h2>
                {/* {existingSubjectRow && (
                  <p className="text-xs text-green-700 font-bold mt-1">Existing question paper loaded. Save karne par update hoga.</p>
                )} */}
                {/* {linkedSubjectCourses.length > 1 && (
                  <p className="text-xs text-blue-700 font-bold mt-1">
                    Ye subject {linkedSubjectCourses.length} courses me linked hai. Save karne par sabhi courses me paper add/update hoga.
                  </p>
                )} */}
              </div>

              <div className="p-4 space-y-6">
                <section className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-blue-800 uppercase mb-3">Marks Setup</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total Marks</label>
                      <input
                        type="number"
                        min="0"
                        value={form.totalMarks}
                        readOnly
                        className="w-full border p-2 rounded text-sm bg-gray-100 outline-none"
                        placeholder="Total"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">MCQ Marks</label>
                      <input
                        type="number"
                        min="0"
                        value={form.mcqTotalMarks}
                        onChange={(e) => updateMarksSetup('mcqTotalMarks', e.target.value)}
                        className="w-full border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">MCQ Each Marks</label>
                      <input
                        type="number"
                        min="1"
                        value={form.mcqQuestionMarks}
                        onChange={(e) => updateMarksSetup('mcqQuestionMarks', e.target.value)}
                        className="w-full border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Marks per MCQ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Q&A Marks</label>
                      <input
                        type="number"
                        min="0"
                        value={form.qaTotalMarks}
                        onChange={(e) => updateMarksSetup('qaTotalMarks', e.target.value)}
                        className="w-full border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Q&A Each Marks</label>
                      <input
                        type="number"
                        min="1"
                        value={form.qaQuestionMarks}
                        onChange={(e) => updateMarksSetup('qaQuestionMarks', e.target.value)}
                        className="w-full border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Marks per question"
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-blue-900 font-semibold">
                    MCQ: {form.mcqs.length} questions x {Number(form.mcqQuestionMarks) || 1} marks each = {getConfiguredSectionMarks(form.mcqs, form.mcqTotalMarks)} marks
                    {Number(form.qaTotalMarks) > 0 ? ` | Q&A: ${form.questionAnswers.length} questions x ${Number(form.qaQuestionMarks) || 1} marks each = ${getConfiguredSectionMarks(form.questionAnswers, form.qaTotalMarks)} marks` : ''}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-blue-700 uppercase">MCQs</h3>
                    <button type="button" onClick={addMcqRow} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded font-bold hover:bg-blue-100">
                      <Plus size={13} className="inline" /> Add MCQ
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.mcqs.map((mcq, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_34px] gap-2">
                          <input value={mcq.question} onChange={(e) => updateMcq(index, 'question', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder={`MCQ Question ${index + 1}`} />
                          <input type="number" min="1" value={mcq.marks} onChange={(e) => updateMcq(index, 'marks', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder="Marks" />
                          <button type="button" onClick={() => removeMcqRow(index)} className="text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                          {mcq.options.map((option, optionIndex) => (
                            <input key={optionIndex} value={option} onChange={(e) => updateMcq(index, 'options', e.target.value, optionIndex)} className="border p-2 rounded text-xs bg-white" placeholder={`Option ${optionIndex + 1}`} />
                          ))}
                        </div>
                        <input value={mcq.correctAnswer} onChange={(e) => updateMcq(index, 'correctAnswer', e.target.value)} className="border p-2 rounded text-xs bg-white mt-2 w-full md:w-1/2" placeholder="Correct Answer" />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-green-700 uppercase">Question Answer</h3>
                    <button type="button" onClick={addQuestionAnswerRow} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded font-bold hover:bg-green-100">
                      <Plus size={13} className="inline" /> Add Q&A
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.questionAnswers.map((qa, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_34px] gap-2">
                          <input value={qa.question} onChange={(e) => updateQuestionAnswer(index, 'question', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder={`Question ${index + 1}`} />
                          <input type="number" min="1" value={qa.marks} onChange={(e) => updateQuestionAnswer(index, 'marks', e.target.value)} className="border p-2 rounded text-sm bg-white" placeholder="Marks" />
                          <button type="button" onClick={() => removeQuestionAnswerRow(index)} className="text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                        <textarea value={qa.answer} onChange={(e) => updateQuestionAnswer(index, 'answer', e.target.value)} rows="2" className="border p-2 rounded text-sm bg-white mt-2 w-full" placeholder="Answer / solution" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows="2" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-5 h-5" />
            Is Active?
          </label>
        </div>

        <div className="bg-gray-50 border-t p-4 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/master/final-exam-question-paper')} className="px-5 py-2 border rounded hover:bg-gray-100 text-sm font-bold">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="bg-primary text-white px-7 py-2 rounded hover:bg-blue-800 text-sm font-bold flex items-center gap-2 disabled:opacity-70">
            {isLoading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
            {linkedSubjectCourses.length > 1 ? 'Save For All Courses' : existingCoursePaper ? 'Update Paper' : 'Save Paper'}
          </button>
        </div>
      </form>
    </div>
    </FinalExamQuestionPaperAccessGate>
  );
};

export default AddFinalExamQuestionPaper;

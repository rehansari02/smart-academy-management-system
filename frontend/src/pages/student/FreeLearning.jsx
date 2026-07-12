import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFreeLearningQuestions, fetchQuizReport, submitQuiz, resetQuizResult, resetFreeLearningProgress } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import { Brain, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const FreeLearning = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { quizQuestions, quizResult, quizReports, isLoading, isError, message } = useSelector((state) => state.studentPortal);
    
    // answers state: { [questionId]: selectedOptionIndex }
    const [answers, setAnswers] = useState({});
    const [selectedSubjectId, setSelectedSubjectId] = useState('all');
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        dispatch(fetchFreeLearningQuestions());
        dispatch(fetchQuizReport());
        dispatch(resetQuizResult());
    }, [dispatch]);

    useEffect(() => {
        if (quizResult && quizResult.progressId) {
            toast.success(`Quiz Submitted! Score: ${quizResult.score}/${quizResult.totalQuestions}`);
            navigate('/student/study/free-learning-report');
        }
    }, [quizResult, navigate]);

    const handleOptionSelect = (questionId, optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    const handleResetProgress = async () => {
        const result = await Swal.fire({
            title: 'Reset free learning progress?',
            text: 'This will clear your previous answers and let you attempt the questions again.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reset',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            setIsResetting(true);
            const response = await dispatch(resetFreeLearningProgress()).unwrap();
            toast.success(response?.message || 'Free learning progress reset successfully');
            setAnswers({});
            setSelectedSubjectId('all');
            dispatch(resetQuizResult());
            await Promise.all([
                dispatch(fetchFreeLearningQuestions()),
                dispatch(fetchQuizReport())
            ]);
        } catch (error) {
            toast.error(error || 'Unable to reset free learning progress');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSubmit = async () => {
        const visibleQuestionIds = new Set(filteredQuestions.map((question) => question._id));
        const formattedAnswers = Object.keys(answers)
            .filter((qId) => visibleQuestionIds.has(qId))
            .map(qId => ({
            questionId: qId,
            selectedOption: answers[qId]
        }));

        if (formattedAnswers.length === 0) {
            toast.error("Please answer at least one question.");
            return;
        }

        const result = await Swal.fire({
            title: 'Submit answers?',
            text: 'Once submitted, your score will be saved in your learning report.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Submit',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
            dispatch(submitQuiz({ answers: formattedAnswers }));
        }
    };

    const subjects = Array.from(
        new Map(
            (quizQuestions || [])
                .filter((question) => question.subject?._id)
                .map((question) => [question.subject._id, question.subject])
        ).values()
    );

    const filteredQuestions = selectedSubjectId === 'all'
        ? (quizQuestions || [])
        : (quizQuestions || []).filter((question) => question.subject?._id === selectedSubjectId);

    const allAnsweredQuestions = (quizReports || []).flatMap((report) => report.questions || []);
    const filteredAnsweredQuestions = selectedSubjectId === 'all'
        ? allAnsweredQuestions
        : allAnsweredQuestions.filter((item) => item.questionId?.subject?._id === selectedSubjectId || item.questionId?.subject === selectedSubjectId);
    const correctCount = filteredAnsweredQuestions.filter((item) => item.isCorrect).length;
    const wrongCount = filteredAnsweredQuestions.filter((item) => !item.isCorrect).length;
    const answeredCount = filteredAnsweredQuestions.length;
    const pendingCount = filteredQuestions.length;
    const totalCount = answeredCount + pendingCount;

    if (isLoading) return <Loading />;

    return (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Brain className="text-primary" />
                        Free Learning
                    </h1>
                    <p className="text-gray-500 mt-1">Test your knowledge with these practice questions.</p>
                </div>
                <button
                    type="button"
                    onClick={handleResetProgress}
                    disabled={isLoading || isResetting}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isResetting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    ) : (
                        <RotateCcw size={16} />
                    )}
                    Reset Progress
                </button>
            </div>

            {quizQuestions && quizQuestions.length > 0 ? (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button
                                type="button"
                                onClick={() => setSelectedSubjectId('all')}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    selectedSubjectId === 'all'
                                        ? 'bg-primary text-white shadow'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Subjects
                            </button>
                            {subjects.map((subject) => (
                                <button
                                    key={subject._id}
                                    type="button"
                                    onClick={() => setSelectedSubjectId(subject._id)}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        selectedSubjectId === subject._id
                                            ? 'bg-primary text-white shadow'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {subject.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="text-xs font-bold uppercase text-blue-600">Total Questions</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-xs font-bold uppercase text-slate-500">Answered</div>
                            <div className="mt-1 text-2xl font-bold text-gray-900">{answeredCount}</div>
                        </div>
                        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                            <div className="text-xs font-bold uppercase text-green-700">Correct</div>
                            <div className="mt-1 text-2xl font-bold text-green-700">{correctCount}</div>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                            <div className="text-xs font-bold uppercase text-red-600">Wrong</div>
                            <div className="mt-1 text-2xl font-bold text-red-600">{wrongCount}</div>
                        </div>
                    </div>

                    {filteredQuestions.length > 0 ? filteredQuestions.map((q, qIndex) => (
                        <div key={q._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex gap-2">
                                <span className="text-primary">Q{qIndex + 1}.</span> 
                                <span>
                                    {q.question}
                                    {q.subject?.name && (
                                        <span className="ml-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                            {q.subject.name}
                                        </span>
                                    )}
                                </span>
                            </h3>
                            <div className="space-y-3 pl-4 sm:pl-8">
                                {q.options.map((option, optIndex) => (
                                    <label 
                                        key={optIndex} 
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all 
                                            ${answers[q._id] === optIndex 
                                                ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' 
                                                : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <input 
                                            type="radio" 
                                            name={`question-${q._id}`} 
                                            value={optIndex}
                                            checked={answers[q._id] === optIndex}
                                            onChange={() => handleOptionSelect(q._id, optIndex)}
                                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                        />
                                        <span className="text-gray-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-10 rounded-xl text-center text-gray-500 border border-gray-200">
                            <AlertCircle className="mx-auto w-10 h-10 text-gray-300 mb-3" />
                            <p>No pending questions in this subject.</p>
                        </div>
                    )}
                    
                    {filteredQuestions.length > 0 && (
                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSubmit} 
                            disabled={isLoading}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loading className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                            {isLoading ? 'Submitting...' : 'Submit Answers'}
                        </button>
                    </div>
                    )}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-xl text-center text-gray-500 border border-gray-200">
                    <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                    <p>No questions available right now.</p>
                </div>
            )}
        </div>
    );
};

export default FreeLearning;

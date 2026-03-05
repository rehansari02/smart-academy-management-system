import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFreeLearningQuestions, submitQuiz, resetQuizResult } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import { Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const FreeLearning = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { quizQuestions, quizResult, isLoading, isError, message } = useSelector((state) => state.studentPortal);
    
    // answers state: { [questionId]: selectedOptionIndex }
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        dispatch(fetchFreeLearningQuestions());
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

    const handleSubmit = () => {
        const formattedAnswers = Object.keys(answers).map(qId => ({
            questionId: qId,
            selectedOption: answers[qId]
        }));

        if (formattedAnswers.length === 0) {
            toast.error("Please answer at least one question.");
            return;
        }

        if (window.confirm("Are you sure you want to submit your answers?")) {
            dispatch(submitQuiz({ answers: formattedAnswers }));
        }
    };

    if (isLoading) return <Loading />;

    return (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Brain className="text-primary" />
                        Free Learning
                    </h1>
                    <p className="text-gray-500 mt-1">Test your knowledge with these practice questions.</p>
                </div>
            </div>

            {quizQuestions && quizQuestions.length > 0 ? (
                <div className="space-y-6">
                    {quizQuestions.map((q, qIndex) => (
                        <div key={q._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex gap-2">
                                <span className="text-primary">Q{qIndex + 1}.</span> 
                                {q.question}
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
                    ))}
                    
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

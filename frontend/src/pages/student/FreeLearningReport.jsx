import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuizReport } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import { TrendingUp, Check, X, ChevronDown, ChevronUp, Calendar, Hash, Award } from 'lucide-react';
import moment from 'moment';
import { motion, AnimatePresence } from 'framer-motion';

const FreeLearningReport = () => {
    const dispatch = useDispatch();
    const { quizReports, isLoading } = useSelector((state) => state.studentPortal);
    // Expand latest report by default or handle expansion
    const [expandedReportId, setExpandedReportId] = useState(null);

    useEffect(() => {
        dispatch(fetchQuizReport());
    }, [dispatch]);

    // Set first report expanded when data loads
    useEffect(() => {
        if (quizReports && quizReports.length > 0 && !expandedReportId) {
            setExpandedReportId(quizReports[0]._id);
        }
    }, [quizReports]);

    const toggleExpand = (id) => {
        setExpandedReportId(expandedReportId === id ? null : id);
    };

    if (isLoading) return <Loading />;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <TrendingUp className="text-primary w-8 h-8" />
                        </div>
                        Learning Progress
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1 text-lg">Track your performance and review your answers.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-blue-50 px-6 py-3 rounded-xl border border-blue-100">
                        <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Total Quizzes</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{quizReports ? quizReports.length : 0}</div>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-6">
                {quizReports && quizReports.length > 0 ? (
                    quizReports.map((report) => {
                        const scorePercentage = Math.round((report.totalScore / report.questions.length) * 100);
                        const isExpanded = expandedReportId === report._id;

                        return (
                            <motion.div 
                                layout
                                key={report._id} 
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    isExpanded ? 'shadow-lg border-blue-200 ring-1 ring-blue-100' : 'shadow-sm border-gray-200 hover:shadow-md'
                                }`}
                            >
                                {/* Report Header Card */}
                                <div 
                                    onClick={() => toggleExpand(report._id)}
                                    className="p-6 cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                                >
                                    {/* Date & Title */}
                                    <div className="md:col-span-5 flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-4 ${
                                            scorePercentage >= 70 ? 'bg-green-50 text-green-600 border-green-100' : 
                                            scorePercentage >= 40 ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 
                                            'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                            {scorePercentage}%
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                Quiz Attempt
                                                {scorePercentage === 100 && <Award className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                                            </h3>
                                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                <Calendar size={14} />
                                                {moment(report.date).format('MMMM Do YYYY, h:mm a')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Middle */}
                                    <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                                            <div className="text-xs font-semibold text-gray-500 uppercase">Score</div>
                                            <div className="font-bold text-gray-900">{report.totalScore}</div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                                            <div className="text-xs font-semibold text-gray-500 uppercase">Questions</div>
                                            <div className="font-bold text-gray-900">{report.questions.length}</div>
                                        </div>
                                    </div>

                                    {/* Action Right */}
                                    <div className="md:col-span-3 flex justify-end items-center gap-2 text-primary font-medium">
                                        <span className="text-sm">{isExpanded ? 'Hide Details' : 'View Report'}</span>
                                        <div className={`bg-blue-50 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-100' : ''}`}>
                                            <ChevronDown size={20} />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-gray-100 bg-gray-50/50"
                                        >
                                            <div className="p-6">
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold tracking-wider border-b border-gray-200">
                                                            <tr>
                                                                <th className="p-4 w-12 text-center">#</th>
                                                                <th className="p-4 w-5/12">Question</th>
                                                                <th className="p-4 w-3/12">Your Answer</th>
                                                                <th className="p-4 w-3/12">Correct Answer</th>
                                                                <th className="p-4 w-28 text-center">Result</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {report.questions.map((q, idx) => {
                                                                const questionText = q.questionId ? q.questionId.question : 'Question Deleted';
                                                                const options = q.questionId ? q.questionId.options : [];
                                                                const correctAnswerIdx = q.questionId ? q.questionId.correctOption : -1;
                                                                
                                                                const yourAnswerText = options[q.selectedOption] || 'N/A';
                                                                const correctAnswerText = options[correctAnswerIdx] || 'N/A';
                                                                const isCorrect = q.isCorrect;

                                                                return (
                                                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                                        <td className="p-4 text-center text-gray-400 font-medium text-sm group-hover:text-primary">
                                                                            {idx + 1}
                                                                        </td>
                                                                        <td className="p-4 font-medium text-gray-800 text-sm leading-relaxed">
                                                                            {questionText}
                                                                        </td>
                                                                        <td className={`p-4 text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                                                                            {yourAnswerText}
                                                                        </td>
                                                                        <td className="p-4 text-sm text-gray-600">
                                                                            {correctAnswerText}
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            {isCorrect ? (
                                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200 shadow-sm">
                                                                                    <Check size={12} strokeWidth={3} /> Correct
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 shadow-sm">
                                                                                    <X size={12} strokeWidth={3} /> Incorrect
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300"
                    >
                        <div className="bg-gray-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <Hash className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No Learning History Yet</h3>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Start taking quizzes in the Free Learning section to track your progress here.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default FreeLearningReport;

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, X, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchCourseDetails } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';

const CourseDetail = () => {
    const dispatch = useDispatch();
    const { courseDetails, isLoading } = useSelector((state) => state.studentPortal);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        dispatch(fetchCourseDetails());
    }, [dispatch]);

    if (isLoading || !courseDetails) {
        return <Loading />;
    }

    const { courseName: name, courseCode, subjects, description } = courseDetails;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <BookOpen className="text-primary" />
                    My Course: <span className="text-primary">{name}</span>
                </h1>
                <p className="text-gray-500 mt-1">Course Code: {courseCode}</p>
                 {description && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded border border-gray-100">
                        {description}
                    </p>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h2 className="font-bold text-gray-700">Subject List</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-blue-600 text-white uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Subject Name</th>
                                {/* <th className="p-4">Marks (Theory/Practical)</th> */}
                                <th className="p-4 text-center w-32">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subjects && subjects.length > 0 ? (
                                subjects.map((subject, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-700">
                                            {subject.name}
                                            {subject.printedName && subject.printedName !== subject.name && (
                                                <span className="block text-xs text-gray-400">({subject.printedName})</span>
                                            )}
                                        </td>
                                        {/* <td className="p-4 text-gray-600">
                                            {subject.theoryMarks} / {subject.practicalMarks} (Total: {subject.totalMarks})
                                        </td> */}
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => setSelectedSubject(subject)}
                                                className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
                                            >
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="p-4 text-center text-gray-500">No subjects found for this course.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSubject && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FileText size={20} className="text-primary"/> {selectedSubject.name}
                                </h3>
                                <button onClick={() => setSelectedSubject(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Topic Name</h4>
                                    <p className="text-gray-800 font-medium">
                                        {selectedSubject.topicName || 'N/A'}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Passing Marks</h4>
                                        <p className="text-gray-800 font-medium">{selectedSubject.passingMarks}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Duration</h4>
                                        <p className="text-gray-800 font-medium">{selectedSubject.duration} {selectedSubject.durationType}</p>
                                    </div>
                                </div>


                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Full Description</h4>
                                    <div className="text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                                        {selectedSubject.description || 'No description available.'}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 text-right">
                                <button onClick={() => setSelectedSubject(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CourseDetail;
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { AlertCircle, ArrowLeft, Eye, Loader2, RefreshCw, Search } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}/master`;

const ManageFreeLearning = () => {
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const loadSubjects = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await axios.get(`${API_URL}/free-learning-report/subjects`, { withCredentials: true });
            setSubjects(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const loadSubjectReport = async (subject) => {
        try {
            setSelectedSubject(subject);
            setReportLoading(true);
            setError('');
            const { data } = await axios.get(`${API_URL}/free-learning-report/subjects/${subject._id}`, { withCredentials: true });
            setReport(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load student report');
            setReport(null);
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        loadSubjects();
    }, []);

    const filteredStudents = (report?.students || []).filter((student) => {
        const value = search.trim().toLowerCase();
        if (!value) return true;
        return [
            student.name,
            student.enrollmentNo,
            student.mobile,
            student.course?.name,
            student.course?.shortName,
            student.batch
        ].some((item) => String(item || '').toLowerCase().includes(value));
    });

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manage Free Learning</h1>
                    <p className="text-sm text-gray-500">
                        Subject-wise student performance for free learning questions.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadSubjects}
                    className="inline-flex items-center justify-center gap-2 rounded bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {!selectedSubject ? (
                <div className="rounded-lg border bg-white shadow-sm">
                    <div className="border-b p-4">
                        <h2 className="font-bold text-gray-800">Subjects</h2>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
                            <Loader2 className="animate-spin" size={20} />
                            Loading subjects...
                        </div>
                    ) : subjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] border-collapse text-sm">
                                <thead>
                                    <tr className="bg-blue-600 text-left text-xs uppercase text-white">
                                        <th className="border p-3 text-center">#</th>
                                        <th className="border p-3">Subject</th>
                                        <th className="border p-3 text-center">Active Questions</th>
                                        <th className="border p-3 text-center">Total Questions</th>
                                        <th className="border p-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map((item, index) => (
                                        <tr key={item.subject._id} className="hover:bg-blue-50">
                                            <td className="border p-3 text-center text-gray-500">{index + 1}</td>
                                            <td className="border p-3 font-semibold text-gray-800">{item.subject.name}</td>
                                            <td className="border p-3 text-center">{item.activeQuestions}</td>
                                            <td className="border p-3 text-center">{item.totalQuestions}</td>
                                            <td className="border p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => loadSubjectReport(item.subject)}
                                                    className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-600 hover:text-white"
                                                    title="View student report"
                                                >
                                                    <Eye size={15} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-gray-500">
                            No subject-wise free learning questions found.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-lg border bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSubject(null);
                                        setReport(null);
                                        setSearch('');
                                    }}
                                    className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                                >
                                    <ArrowLeft size={16} />
                                    Back to subjects
                                </button>
                                <h2 className="text-xl font-bold text-gray-800">{selectedSubject.name}</h2>
                                <p className="text-sm text-gray-500">
                                    Total active questions: {report?.totalQuestions || 0}
                                </p>
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search student, course, batch..."
                                    className="w-full rounded border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-white shadow-sm">
                        {reportLoading ? (
                            <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
                                <Loader2 className="animate-spin" size={20} />
                                Loading student report...
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px] border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-blue-600 text-left text-xs uppercase text-white">
                                            <th className="border p-3 text-center">#</th>
                                            <th className="border p-3">Student</th>
                                            <th className="border p-3">Course</th>
                                            <th className="border p-3">Batch</th>
                                            <th className="border p-3 text-center">Attempted</th>
                                            <th className="border p-3 text-center">Correct</th>
                                            <th className="border p-3 text-center">Wrong</th>
                                            <th className="border p-3 text-center">Pending</th>
                                            <th className="border p-3">Last Attempt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student, index) => (
                                                <tr key={student._id} className="hover:bg-blue-50">
                                                    <td className="border p-3 text-center text-gray-500">{index + 1}</td>
                                                    <td className="border p-3">
                                                        <div className="font-semibold text-gray-800">{student.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {student.enrollmentNo || '-'} {student.mobile ? `| ${student.mobile}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="border p-3">
                                                        {student.course?.name || '-'}
                                                        {student.course?.shortName ? (
                                                            <span className="ml-1 text-xs text-gray-500">({student.course.shortName})</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="border p-3">{student.batch || '-'}</td>
                                                    <td className="border p-3 text-center font-semibold">{student.attempted}</td>
                                                    <td className="border p-3 text-center font-semibold text-green-700">{student.correct}</td>
                                                    <td className="border p-3 text-center font-semibold text-red-600">{student.wrong}</td>
                                                    <td className="border p-3 text-center font-semibold text-amber-600">{student.pending}</td>
                                                    <td className="border p-3 text-gray-600">
                                                        {student.lastAttemptAt ? moment(student.lastAttemptAt).format('DD/MM/YYYY hh:mm A') : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9" className="p-8 text-center text-gray-500">
                                                    No eligible students found for this subject.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageFreeLearning;

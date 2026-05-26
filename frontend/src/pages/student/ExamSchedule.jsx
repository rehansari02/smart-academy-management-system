import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentExamSchedules } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import { CalendarDays, Clock3, BookOpen, BadgeInfo } from 'lucide-react';
import moment from 'moment';

const formatDate = (value) => {
    if (!value) return '-';
    const date = moment(value);
    return date.isValid() ? date.format('DD/MM/YYYY') : '-';
};

const ExamSchedule = () => {
    const dispatch = useDispatch();
    const { examSchedules, examStudent, isLoading } = useSelector((state) => state.studentPortal);

    useEffect(() => {
        dispatch(fetchStudentExamSchedules());
    }, [dispatch]);

    if (isLoading && examSchedules.length === 0) {
        return <Loading />;
    }

    return (
        <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                            <CalendarDays size={16} />
                            Exam Time Table
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">My Exam Schedule</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {examStudent?.name || 'Student'}{examStudent?.courseName ? ` - ${examStudent.courseName}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                        <BadgeInfo size={14} className="text-blue-500" />
                        Only active schedules for your course are shown here.
                    </div>
                </div>
            </section>

            {examSchedules.length > 0 ? (
                examSchedules.map((schedule, scheduleIndex) => (
                    <section key={schedule._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="border-b border-gray-200 px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <BookOpen size={18} className="text-blue-600" />
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {schedule.examName}
                                    </h2>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {schedule.course?.name || 'Course'}{schedule.remarks ? ` - ${schedule.remarks}` : ''}
                                </p>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit ${schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {schedule.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] border-collapse">
                                <thead>
                                    <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                        <th className="p-3 border-r border-blue-500 font-semibold w-16 text-center">Sr. No.</th>
                                        <th className="p-3 border-r border-blue-500 font-semibold">Subject</th>
                                        <th className="p-3 border-r border-blue-500 font-semibold">Date</th>
                                        <th className="p-3 border-r border-blue-500 font-semibold">Time</th>
                                        <th className="p-3 border-r border-blue-500 font-semibold text-center">Theory</th>
                                        <th className="p-3 border-r border-blue-500 font-semibold text-center">Practical</th>
                                        <th className="p-3 font-semibold text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.timeTable?.length > 0 ? (
                                        schedule.timeTable.map((item, index) => (
                                            <tr key={`${schedule._id}-${index}`} className="border-b border-gray-100 hover:bg-blue-50/50 text-sm">
                                                <td className="p-3 text-center text-gray-500 font-medium">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3 font-semibold text-gray-900">
                                                    {item.subject?.name || 'Subject'}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {formatDate(item.date)}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    <div className="inline-flex items-center gap-1">
                                                        <Clock3 size={14} className="text-gray-400" />
                                                        {item.startTime && item.endTime ? `${item.startTime} To ${item.endTime}` : item.startTime || item.endTime || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center text-gray-700 font-medium">
                                                    {item.theory ?? 0}
                                                </td>
                                                <td className="p-3 text-center text-gray-700 font-medium">
                                                    {item.practical ?? 0}
                                                </td>
                                                <td className="p-3 text-center text-blue-700 font-bold">
                                                    {item.total ?? 0}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-6 text-center text-gray-400">
                                                No timetable has been published yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))
            ) : (
                <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 text-center">
                    <CalendarDays size={42} className="mx-auto text-gray-300 mb-3" />
                    <h2 className="text-lg font-bold text-gray-800">No exam timetable found</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        When an exam schedule is published for your course, it will appear here.
                    </p>
                </section>
            )}
        </div>
    );
};

export default ExamSchedule;

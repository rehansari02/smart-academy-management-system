import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentExamSchedules } from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import { CalendarDays, Clock3, BookOpen, BadgeInfo, RefreshCw, ShieldAlert } from 'lucide-react';
import moment from 'moment';

const formatDate = (value) => {
    if (!value) return '-';
    const date = moment(value);
    return date.isValid() ? date.format('DD/MM/YYYY') : '-';
};

const ExamSchedule = () => {
    const dispatch = useDispatch();
    const { examSchedules, examStudent, isLoading, isError, message } = useSelector((state) => state.studentPortal);

    useEffect(() => {
        dispatch(fetchStudentExamSchedules());
    }, [dispatch]);

    if (isLoading && examSchedules.length === 0) {
        return <Loading />;
    }

    const regularSchedules = examSchedules.filter((schedule) => !schedule.isReExam);
    const reExamSchedules = examSchedules.filter((schedule) => schedule.isReExam);

    const renderSchedule = (schedule, isReExam = false) => (
        <section key={schedule._id} className={`bg-white border rounded-lg shadow-sm overflow-hidden ${isReExam ? 'border-amber-300' : 'border-gray-200'}`}>
            <div className={`border-b px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between ${isReExam ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                <div>
                    <div className="flex items-center gap-2">
                        {isReExam ? <ShieldAlert size={18} className="text-amber-600" /> : <BookOpen size={18} className="text-blue-600" />}
                        <h2 className="text-lg font-bold text-gray-900">{schedule.examName}</h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {schedule.course?.name || 'Course'}{isReExam ? ' - Re-Exam Timetable, last warning to come exam center' : schedule.remarks ? ` - ${schedule.remarks}` : ''}
                    </p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit ${schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isReExam ? 'Re-Exam' : schedule.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                    <thead>
                        <tr className={`${isReExam ? 'bg-amber-600' : 'bg-blue-600'} text-white text-left text-xs uppercase tracking-wider`}>
                            <th className={`p-3 border-r font-semibold w-16 text-center ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Sr. No.</th>
                            <th className={`p-3 border-r font-semibold ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Subject</th>
                            <th className={`p-3 border-r font-semibold ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Date</th>
                            <th className={`p-3 border-r font-semibold ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Time</th>
                            <th className={`p-3 border-r font-semibold text-center ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Theory</th>
                            <th className={`p-3 border-r font-semibold text-center ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Practical</th>
                            <th className={`p-3 border-r font-semibold text-center ${isReExam ? 'border-amber-500' : 'border-blue-500'}`}>Total</th>
                            <th className="p-3 font-semibold text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.timeTable?.length > 0 ? (
                            schedule.timeTable.map((item, index) => (
                                <tr key={`${schedule._id}-${index}`} className="border-b border-gray-100 hover:bg-blue-50/50 text-sm">
                                    <td className="p-3 text-center text-gray-500 font-medium">{index + 1}</td>
                                    <td className="p-3 font-semibold text-gray-900">{item.subject?.name || 'Subject'}</td>
                                    <td className="p-3 text-gray-600">{formatDate(item.date)}</td>
                                    <td className="p-3 text-gray-600">
                                        <div className="inline-flex items-center gap-1">
                                            <Clock3 size={14} className="text-gray-400" />
                                            {item.startTime && item.endTime ? `${item.startTime} To ${item.endTime}` : item.startTime || item.endTime || '-'}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-gray-700 font-medium">{item.theory ?? 0}</td>
                                    <td className="p-3 text-center text-gray-700 font-medium">{item.practical ?? 0}</td>
                                    <td className="p-3 text-center text-blue-700 font-bold">{item.total ?? 0}</td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ${item.isSubmitted ? 'bg-green-100 text-green-700' : item.isAbsent ? 'bg-red-100 text-red-700' : item.attendanceStatus === 'Not Marked' ? 'bg-orange-100 text-orange-700' : item.isPresent && isReExam ? 'bg-emerald-100 text-emerald-700' : isReExam ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {item.isSubmitted ? 'Submitted' : item.isAbsent ? 'Absent' : item.attendanceStatus === 'Not Marked' ? 'Attendance Pending' : item.isPresent && isReExam ? 'Present / Ready' : isReExam ? 'Re-Exam' : item.status === 'upcoming' ? 'Upcoming' : item.status === 'live' ? 'Live' : 'Ended'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="8" className="p-6 text-center text-gray-400">No timetable has been published yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );

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

            {isError && (
                <section className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                    <span>{message || 'Exam timetable could not be loaded.'}</span>
                    <button
                        type="button"
                        onClick={() => dispatch(fetchStudentExamSchedules())}
                        className="inline-flex w-fit items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                    >
                        <RefreshCw size={14} /> Retry
                    </button>
                </section>
            )}

            {!isError && examSchedules.length > 0 ? (
                <>
                    {regularSchedules.map((schedule) => renderSchedule(schedule, false))}
                    {reExamSchedules.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                            Re-Exam Time Table — examiner ko is re-exam ke liye fresh attendance dobara save karni hogi. Present mark hone tak paper locked rahega.
                        </div>
                    )}
                    {reExamSchedules.map((schedule) => renderSchedule(schedule, true))}
                </>
            ) : !isError ? (
                <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 text-center">
                    <CalendarDays size={42} className="mx-auto text-gray-300 mb-3" />
                    <h2 className="text-lg font-bold text-gray-800">No exam timetable found</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        When an exam schedule is published for your course, it will appear here.
                    </p>
                </section>
            ) : null}
        </div>
    );
};

export default ExamSchedule;

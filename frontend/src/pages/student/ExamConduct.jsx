import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { CalendarDays, Clock3, Lock, PlayCircle, ShieldAlert, UserCheck } from 'lucide-react';
import Loading from '../../components/Loading';

const statusStyles = {
  live: 'bg-green-100 text-green-700 border-green-200',
  upcoming: 'bg-amber-100 text-amber-700 border-amber-200',
  ended: 'bg-gray-100 text-gray-600 border-gray-200'
};

const ExamConduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/student-portal/exam-conduct`, {
          withCredentials: true
        });
        setStudentInfo(data.student || null);
        setSchedules(data.schedules || []);
      } catch (error) {
        setMessage(error.response?.data?.message || 'Exam conduct data load nahi hua');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allRows = useMemo(
    () => schedules.flatMap((schedule) =>
      (schedule.timeTable || []).map((row) => ({
        schedule,
        row
      }))
    ),
    [schedules]
  );

  const liveRows = allRows.filter(({ row }) => row.status === 'live' && row.canOpen);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
              <PlayCircle size={16} />
              Exam Conduct
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
            <p className="text-sm text-gray-500 mt-1">
              {studentInfo?.name || 'Student'}{studentInfo?.courseName ? ` - ${studentInfo.courseName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <UserCheck size={14} className="text-blue-500" />
            Only assigned exam subjects are shown here.
          </div>
        </div>
      </section>

      {message && (
        <section className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {message}
        </section>
      )}

      {allRows.length === 0 ? (
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 text-center">
          <ShieldAlert size={42} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-800">Coming soon</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your exam will appear here when the schedule is published and the time window opens.
          </p>
        </section>
      ) : (
        <>
          {liveRows.length === 0 && (
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex items-center gap-3">
              <Lock size={20} className="text-gray-400" />
              <div>
                <h2 className="text-base font-bold text-gray-800">Coming soon</h2>
                <p className="text-sm text-gray-500">
                  No exam is currently live for your course.
                </p>
              </div>
            </section>
          )}

          {schedules.map((schedule) => (
            <section key={schedule._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">{schedule.examName}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {schedule.course?.name || 'Course'}{schedule.examiner?.name ? ` - Examiner: ${schedule.examiner.name}` : ''}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[schedule.currentStatus] || statusStyles.ended}`}>
                  {schedule.currentStatus === 'live' ? 'Live' : schedule.currentStatus === 'upcoming' ? 'Upcoming' : 'Ended'}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                      <th className="p-3 border-r border-blue-500 font-semibold w-16 text-center">Sr. No.</th>
                      <th className="p-3 border-r border-blue-500 font-semibold">Subject</th>
                      <th className="p-3 border-r border-blue-500 font-semibold">Date</th>
                      <th className="p-3 border-r border-blue-500 font-semibold">Time</th>
                      <th className="p-3 border-r border-blue-500 font-semibold text-center">Status</th>
                      <th className="p-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.timeTable?.length > 0 ? (
                      schedule.timeTable.map((item, index) => {
                        const isLive = item.status === 'live' && item.canOpen;
                        const isUpcoming = item.status === 'upcoming';
                        const isEnded = item.status === 'ended';
                        return (
                          <tr key={`${schedule._id}-${index}`} className="border-b border-gray-100 hover:bg-blue-50/50 text-sm">
                            <td className="p-3 text-center text-gray-500 font-medium">{index + 1}</td>
                            <td className="p-3 font-semibold text-gray-900">{item.subject?.name || item.subject?.printedName || 'Subject'}</td>
                            <td className="p-3 text-gray-600">
                              {item.date ? moment(item.date).format('DD/MM/YYYY') : '-'}
                            </td>
                            <td className="p-3 text-gray-600">
                              <div className="inline-flex items-center gap-1">
                                <Clock3 size={14} className="text-gray-400" />
                                {item.startTime && item.endTime ? `${item.startTime} To ${item.endTime}` : item.startTime || item.endTime || '-'}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border ${statusStyles[item.status] || statusStyles.ended}`}>
                                {isLive ? 'Live' : isUpcoming ? 'Coming Soon' : 'Closed'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={!isLive}
                                onClick={() => navigate(`/student/exam/${schedule._id}/${item.subject?._id || item.subject}`)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  isLive
                                    ? 'bg-primary text-white hover:bg-blue-800'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {isLive ? <PlayCircle size={14} /> : <Lock size={14} />}
                                {isLive ? 'Open Exam' : isUpcoming ? 'Coming Soon' : 'Closed'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-gray-400">
                          No subjects are mapped to this schedule.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

export default ExamConduct;

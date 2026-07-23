import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { CalendarDays, Clock3, Lock, PlayCircle, ShieldAlert, UserCheck } from 'lucide-react';
import Loading from '../../components/Loading';

const statusStyles = {
  live: 'bg-green-100 text-green-700 border-green-200',
  upcoming: 'bg-amber-100 text-amber-700 border-amber-200',
  ended: 'bg-gray-100 text-gray-600 border-gray-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  reExam: 'bg-amber-100 text-amber-700 border-amber-200'
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
  const upcomingRows = allRows.filter(({ row }) => row.status === 'upcoming');
  const submittedRows = allRows.filter(({ row }) => row.isSubmitted);
  const regularSchedules = useMemo(() => schedules.filter((schedule) => !schedule.isReExam), [schedules]);
  const reExamGroups = useMemo(() => {
    const groups = new Map();
    schedules.filter((schedule) => schedule.isReExam).forEach((schedule) => {
      const key = `${schedule.examName || 'Exam'}-${schedule.course?._id || schedule.course?.name || 'course'}`;
      const existing = groups.get(key) || {
        key,
        examName: schedule.examName,
        course: schedule.course,
        currentStatus: schedule.currentStatus,
        rows: []
      };
      existing.rows.push(...(schedule.timeTable || []).map((row) => ({ schedule, row })));
      if (schedule.currentStatus === 'live') existing.currentStatus = 'live';
      else if (schedule.currentStatus === 'upcoming' && existing.currentStatus !== 'live') existing.currentStatus = 'upcoming';
      groups.set(key, existing);
    });
    return [...groups.values()].map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => new Date(a.row.date || 0) - new Date(b.row.date || 0))
    }));
  }, [schedules]);

  const getRowState = (item, schedule) => {
    const isLive = item.status === 'live' && item.canOpen;
    const isUpcoming = item.status === 'upcoming';
    const isSubmitted = Boolean(item.isSubmitted);
    const isAbsent = Boolean(item.isAbsent);

    if (isAbsent) return { label: 'Absent', action: 'Absent', style: 'absent', disabled: true, icon: Lock };
    if (isSubmitted) return { label: 'Submitted', action: 'Submitted', style: 'live', disabled: true, icon: Lock };
    if (isLive) return { label: schedule.isReExam ? 'Re-Exam Live' : 'Live', action: 'Open Exam', style: 'live', disabled: false, icon: PlayCircle };
    if (isUpcoming) return { label: 'Coming Soon', action: 'Coming Soon', style: 'upcoming', disabled: true, icon: Lock };
    if (schedule.isReExam) return { label: 'Re-Exam Closed', action: 'Closed', style: 'ended', disabled: true, icon: Lock };
    return { label: 'Closed', action: 'Closed', style: 'ended', disabled: true, icon: Lock };
  };

  const renderRows = (rows) => (
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
          {rows.length > 0 ? (
            rows.map(({ schedule, row: item }, index) => {
              const state = getRowState(item, schedule);
              const Icon = state.icon;
              return (
                <tr
                  key={`${schedule._id}-${item.subject?._id || item.subject}-${index}`}
                  className={`border-b border-gray-100 text-sm ${state.disabled ? 'bg-gray-50/40' : 'hover:bg-blue-50/50'}`}
                >
                  <td className="p-3 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="p-3 font-semibold text-gray-900">
                    {item.subject?.name || item.subject?.printedName || 'Subject'}
                  </td>
                  <td className="p-3 text-gray-600">
                    {item.date ? moment(item.date).format('DD/MM/YYYY') : '-'}
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Clock3 size={14} className="text-gray-400" />
                      {item.startTime && item.endTime ? `${item.startTime} To ${item.endTime}` : item.startTime || item.endTime || '-'}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border ${statusStyles[state.style] || statusStyles.ended}`}>
                      {state.label}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={state.disabled}
                      onClick={() => {
                        if (state.disabled) return;
                        navigate(`/student/exam/${schedule._id}/${item.subject?._id || item.subject}`);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        state.disabled
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed pointer-events-none opacity-80'
                          : 'bg-primary text-white hover:bg-blue-800'
                      }`}
                    >
                      <Icon size={14} />
                      {state.action}
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
  );

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
                <h2 className="text-base font-bold text-gray-800">
                  {submittedRows.length > 0 ? 'Exam submitted' : upcomingRows.length > 0 ? 'Coming soon' : 'No exam live now'}
                </h2>
                <p className="text-sm text-gray-500">
                  {submittedRows.length > 0
                    ? 'Submitted subjects are locked. Check the timetable below for pending or re-exam subjects.'
                    : upcomingRows.length > 0
                    ? 'No exam is currently live for your course.'
                    : 'Please check the timetable below for subject status.'}
                </p>
              </div>
            </section>
          )}

          {reExamGroups.length > 0 && (
            <section className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert size={20} className="text-amber-600 mt-0.5" />
                <div>
                  <h2 className="text-sm font-black text-amber-900">Re-Exam Timetable</h2>
                  <p className="text-sm font-semibold text-amber-800">Attend the exam center on the new date and time shown below.</p>
                </div>
              </div>
            </section>
          )}

          {reExamGroups.map((group) => (
            <section key={group.key} className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">{group.examName}</h2>
                  </div>
                  <p className="text-sm text-amber-800 font-semibold mt-1">
                    {group.course?.name || 'Course'} - Re-Exam subjects
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-200">
                  Re-Exam
                </div>
              </div>
              {renderRows(group.rows)}
            </section>
          ))}

          {regularSchedules.map((schedule) => (
            <section key={schedule._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">{schedule.examName}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {schedule.course?.name || 'Course'}
                    {schedule.examiner?.name ? ` - Main Examiner: ${schedule.examiner.name}` : ''}
                    {schedule.alternateExaminer?.name ? ` | Alternate: ${schedule.alternateExaminer.name}` : ''}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[schedule.currentStatus] || statusStyles.ended}`}>
                  {schedule.currentStatus === 'live' ? 'Live' : schedule.currentStatus === 'upcoming' ? 'Upcoming' : 'Ended'}
                </div>
              </div>
              {renderRows((schedule.timeTable || []).map((row) => ({ schedule, row })))}
            </section>
          ))}
        </>
      )}
    </div>
  );
};

export default ExamConduct;

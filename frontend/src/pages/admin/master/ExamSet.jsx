import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BookOpenCheck, CalendarDays, CheckSquare, GraduationCap, Loader, Lock, RefreshCw, Save, Search, ShieldCheck, Users, X } from 'lucide-react';
import { fetchEmployees, fetchExamSchedules, fetchExams, updateExamSchedule } from '../../../features/master/masterSlice';

const getStudentName = (student) => [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Student';
const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || row?.name || 'Subject';
const getSubjectId = (row) => row?.subject?._id || row?.subject;
const getEmployeeName = (employee) => employee?.name || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || 'Employee';

const getDateKey = (date) => {
  if (!date) return 'no-date';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'no-date';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayKey = () => getDateKey(new Date());

const formatDateLabel = (dateKey) => {
  if (dateKey === 'no-date') return 'No date set';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const buildTimeTablePayload = (schedule, dateKey, current) => {
  const password = String(current.conductPassword || '').trim();
  const enabled = Boolean(current.conductPasswordEnabled);

  return (schedule.timeTable || []).map((row) => {
    const sameDate = getDateKey(row.date) === dateKey;
    const nextRow = {
      subject: getSubjectId(row),
      date: row.date || null,
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      theory: row.theory || 0,
      practical: row.practical || 0,
      total: row.total || 0
    };

    if (sameDate) {
      nextRow.conductPasswordEnabled = enabled;
      nextRow.conductPassword = password;
    } else {
      nextRow.conductPasswordEnabled = Boolean(row.conductPasswordEnabled);
    }

    return nextRow;
  });
};

const ExamSet = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exams, examSchedules, employees, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';
  const [selectedExamName, setSelectedExamName] = useState('');
  const [testingDate, setTestingDate] = useState('');
  const [dateSettings, setDateSettings] = useState({});
  const [savingDate, setSavingDate] = useState('');
  const [absentModalOpen, setAbsentModalOpen] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [absentRows, setAbsentRows] = useState([]);
  const [selectedAbsentRows, setSelectedAbsentRows] = useState({});
  const [creatingReExam, setCreatingReExam] = useState(false);
  const [reExamForm, setReExamForm] = useState({
    reExamName: '',
    date: '',
    startTime: '',
    endTime: '',
    examiner: '',
    conductPasswordEnabled: true,
    conductPassword: ''
  });

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchExamSchedules());
    dispatch(fetchEmployees());
  }, [dispatch]);

  const examOptions = useMemo(() => {
    const map = new Map();
    const setOption = (name, date) => {
      const key = name.toLowerCase();
      const time = date ? new Date(date).getTime() : 0;
      const existing = map.get(key);
      if (!existing || time > existing.time) {
        map.set(key, { name, time });
      }
    };

    (exams || []).forEach((exam) => {
      const name = exam?.name?.trim();
      if (name) setOption(name, exam?.createdAt || exam?.updatedAt);
    });
    (examSchedules || []).forEach((schedule) => {
      const name = schedule?.examName?.trim();
      if (name) setOption(name, schedule?.createdAt || schedule?.updatedAt);
    });
    return [...map.values()]
      .sort((a, b) => b.time - a.time || a.name.localeCompare(b.name))
      .map((option) => option.name);
  }, [exams, examSchedules]);

  const selectedSchedules = useMemo(() => {
    const key = selectedExamName.trim().toLowerCase();
    if (!key) return [];
    return (examSchedules || [])
      .filter((schedule) => (schedule?.examName || '').trim().toLowerCase() === key)
      .sort((a, b) => (a?.course?.name || '').localeCompare(b?.course?.name || ''));
  }, [examSchedules, selectedExamName]);

  const dateGroups = useMemo(() => {
    const groupMap = new Map();

    selectedSchedules.forEach((schedule) => {
      (schedule.timeTable || []).forEach((row, rowIndex) => {
        const dateKey = getDateKey(row.date);
        if (!groupMap.has(dateKey)) {
          groupMap.set(dateKey, {
            dateKey,
            rows: [],
            scheduleMap: new Map(),
            studentMap: new Map()
          });
        }

        const group = groupMap.get(dateKey);
        group.rows.push({ schedule, row, rowIndex });
        group.scheduleMap.set(schedule._id, schedule);
        (schedule.attendees || []).forEach((student) => {
          group.studentMap.set(student._id || `${schedule._id}-${student.regNo || student.mobile || student.name}`, student);
        });
      });
    });

    const todayKey = getTodayKey();
    return [...groupMap.values()].sort((a, b) => {
      if (a.dateKey === todayKey) return -1;
      if (b.dateKey === todayKey) return 1;
      if (a.dateKey === 'no-date') return 1;
      if (b.dateKey === 'no-date') return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [selectedSchedules]);

  useEffect(() => {
    setDateSettings((prev) => {
      const next = { ...prev };
      dateGroups.forEach((group) => {
        if (!next[group.dateKey]) {
          const schedules = [...group.scheduleMap.values()];
          const firstScheduleWithExaminer = schedules.find((schedule) => schedule.examiner);
          const firstExaminer = firstScheduleWithExaminer?.examiner?._id || firstScheduleWithExaminer?.examiner || '';
          const hasRowPassword = group.rows.some(({ row }) => row.conductPasswordEnabled || row.conductPasswordHash || row.conductPasswordText);
          next[group.dateKey] = {
            examiner: firstExaminer,
            conductPasswordEnabled: hasRowPassword || true,
            conductPassword: ''
          };
        }
      });
      return next;
    });
  }, [dateGroups]);

  const visibleDateGroups = useMemo(() => {
    if (!testingDate) return dateGroups;
    return dateGroups.filter((group) => group.dateKey === testingDate);
  }, [dateGroups, testingDate]);

  const visibleScheduleIds = useMemo(() => {
    if (!testingDate) return null;
    const ids = new Set();
    visibleDateGroups.forEach((group) => {
      group.scheduleMap.forEach((schedule) => ids.add(schedule._id));
    });
    return ids;
  }, [testingDate, visibleDateGroups]);

  const visibleSchedules = useMemo(() => {
    if (!visibleScheduleIds) return selectedSchedules;
    return selectedSchedules.filter((schedule) => visibleScheduleIds.has(schedule._id));
  }, [selectedSchedules, visibleScheduleIds]);

  const totalSubjects = visibleDateGroups.reduce((total, group) => total + group.rows.length, 0);
  const totalStudents = visibleDateGroups.reduce((total, group) => total + group.studentMap.size, 0);

  const handleRefresh = () => {
    dispatch(fetchExams());
    dispatch(fetchEmployees());
    dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
  };

  const loadAbsentStudents = async () => {
    if (!selectedExamName) {
      toast.error('Select exam name first.');
      return;
    }
    navigate(`/master/exam-set/absent?examName=${encodeURIComponent(selectedExamName)}`);
  };

  const toggleAbsentRow = (rowKey) => {
    setSelectedAbsentRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  const selectedAbsentList = absentRows.filter((row) => selectedAbsentRows[row.key]);

  const createAbsentReExam = async () => {
    if (selectedAbsentList.length === 0) {
      toast.error('Select at least one absent student.');
      return;
    }
    if (!reExamForm.date || !reExamForm.startTime || !reExamForm.endTime) {
      toast.error('Re-exam date and time are required.');
      return;
    }
    if (reExamForm.conductPasswordEnabled && !String(reExamForm.conductPassword || '').trim()) {
      toast.error('Password is required for re-exam.');
      return;
    }

    setCreatingReExam(true);
    try {
      const payload = {
        examName: selectedExamName,
        ...reExamForm,
        selectedRows: selectedAbsentList.map((row) => ({
          scheduleId: row.scheduleId,
          subjectId: row.subject?._id || row.subject,
          studentId: row.student?._id
        }))
      };
      const res = await axios.post(`${API_URL}exam-schedule/absent-reexam`, payload);
      toast.success(res.data?.message || 'Re-exam schedule created');
      setAbsentModalOpen(false);
      setAbsentRows([]);
      setSelectedAbsentRows({});
      setReExamForm((prev) => ({ ...prev, conductPassword: '' }));
      dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create re-exam schedule');
    } finally {
      setCreatingReExam(false);
    }
  };

  const updateDateSetting = (dateKey, field, value) => {
    setDateSettings((prev) => ({ ...prev, [dateKey]: { ...(prev[dateKey] || {}), [field]: value } }));
  };

  const handleSaveDateSettings = async (group) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can update exam set settings.');
      return;
    }

    const current = dateSettings[group.dateKey] || {};
    const password = String(current.conductPassword || '').trim();
    const hasExistingPassword = group.rows.every(({ row }) => row.conductPasswordHash || row.conductPasswordText);

    if (current.conductPasswordEnabled && !password && !hasExistingPassword) {
      toast.error('Day password is required for this date.');
      return;
    }

    setSavingDate(group.dateKey);
    const schedules = [...group.scheduleMap.values()];

    for (const schedule of schedules) {
      const result = await dispatch(updateExamSchedule({
        id: schedule._id,
        data: {
          examiner: current.examiner || '',
          timeTable: buildTimeTablePayload(schedule, group.dateKey, current)
        }
      }));

      if (!updateExamSchedule.fulfilled.match(result)) {
        setSavingDate('');
        toast.error(result.payload || `Failed to save ${schedule.course?.name || 'course'} settings`);
        return;
      }
    }

    setSavingDate('');
    toast.success('Date-wise exam set saved');
    updateDateSetting(group.dateKey, 'conductPassword', '');
    dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Exam Set</h2>
          <p className="mt-1 text-sm text-gray-500">Set one examiner and one day password for all subjects scheduled on the same date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadAbsentStudents} disabled={!selectedExamName} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Users size={16} /> Absent Student Exam
          </button>
          <button type="button" onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border-t-4 border-primary bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Select Exam Name</label>
              <select value={selectedExamName} onChange={(e) => { setSelectedExamName(e.target.value); setTestingDate(''); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">-- Select Exam --</option>
                {examOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Testing Date</label>
              <div className="flex gap-2">
                <input type="date" value={testingDate} onChange={(e) => setTestingDate(e.target.value)} disabled={!selectedExamName} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100" />
                {testingDate && <button type="button" onClick={() => setTestingDate('')} className="rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">All</button>}
              </div>
              {testingDate && <p className="mt-1 text-xs font-semibold text-indigo-700">Showing only {formatDateLabel(testingDate)} for testing.</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{visibleSchedules.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Courses</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{visibleDateGroups.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Dates</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{totalSubjects}</div><div className="text-[10px] font-bold uppercase text-gray-500">Subjects</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{totalStudents}</div><div className="text-[10px] font-bold uppercase text-gray-500">Students</div></div>
          </div>
        </div>
      </div>

      {!selectedExamName ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500 shadow-sm"><Search className="mx-auto mb-3 text-gray-400" size={32} /><p className="text-sm font-semibold">Select an exam name.</p></div>
      ) : isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm"><Loader className="mr-2 animate-spin" size={20} /> Loading exam set...</div>
      ) : selectedSchedules.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-700">No course schedule found for this exam name.</div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {visibleDateGroups.length === 0 && testingDate ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-700">No subjects scheduled on {formatDateLabel(testingDate)}.</div>
            ) : null}
            {visibleDateGroups.map((group) => {
              const current = dateSettings[group.dateKey] || {};
              const isToday = group.dateKey === getTodayKey();
              const courses = [...group.scheduleMap.values()];

              return (
                <section key={group.dateKey} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b bg-indigo-600 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 text-base font-black">
                        <CalendarDays size={18} /> {formatDateLabel(group.dateKey)}
                        {isToday && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">Today</span>}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-indigo-100">
                        <span className="inline-flex items-center gap-1"><BookOpenCheck size={13} /> {group.rows.length} Subjects</span>
                        <span className="inline-flex items-center gap-1"><Users size={13} /> {courses.length} Courses</span>
                        <span className="inline-flex items-center gap-1"><GraduationCap size={13} /> {group.studentMap.size} Students</span>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">Date-wise Settings</span>
                  </div>

                  <div className="border-b bg-slate-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-600"><ShieldCheck size={15} className="text-indigo-600" /> One-Day Examiner & Password</h4>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Examiner</label>
                        <select value={current.examiner || ''} onChange={(e) => updateDateSetting(group.dateKey, 'examiner', e.target.value)} disabled={!isSuperAdmin} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100">
                          <option value="">Select Examiner</option>
                          {(employees || []).map((employee) => <option key={employee._id} value={employee._id}>{getEmployeeName(employee)}</option>)}
                        </select>
                      </div>
                      <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-gray-700">
                        <input type="checkbox" checked={Boolean(current.conductPasswordEnabled)} onChange={(e) => updateDateSetting(group.dateKey, 'conductPasswordEnabled', e.target.checked)} disabled={!isSuperAdmin} className="h-4 w-4" />
                        <Lock size={14} /> Password
                      </label>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Day Password</label>
                        <input type="text" value={current.conductPassword || ''} onChange={(e) => updateDateSetting(group.dateKey, 'conductPassword', e.target.value)} disabled={!isSuperAdmin || !current.conductPasswordEnabled} placeholder={current.conductPasswordEnabled ? 'Enter password for this date' : 'Enable password first'} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100" />
                      </div>
                      <button type="button" onClick={() => handleSaveDateSettings(group)} disabled={!isSuperAdmin || savingDate === group.dateKey} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {savingDate === group.dateKey ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Save Date
                      </button>
                    </div>
                    {!isSuperAdmin && <p className="mt-2 text-xs font-semibold text-amber-700">Only Super Admin can update examiner and password settings.</p>}
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500">
                        <tr><th className="px-3 py-2 text-center">#</th><th className="px-3 py-2">Course</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Time</th><th className="px-3 py-2 text-center">Students</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.rows.map(({ schedule, row }, index) => (
                          <tr key={`${schedule._id}-${row._id || index}`} className="hover:bg-indigo-50/40">
                            <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{index + 1}</td>
                            <td className="px-3 py-2 font-bold text-gray-800">{schedule.course?.name || 'Course'}</td>
                            <td className="px-3 py-2 font-semibold text-gray-700">{getSubjectName(row)}</td>
                            <td className="px-3 py-2 text-gray-600">{row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : row.startTime || row.endTime || '-'}</td>
                            <td className="px-3 py-2 text-center font-bold text-gray-700">{schedule.attendees?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="space-y-5">
            {visibleSchedules.map((schedule) => (
              <section key={schedule._id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b bg-blue-600 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-black">{schedule.course?.name || 'Course'}</h3>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-blue-100">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {schedule.examName}</span>
                      <span className="inline-flex items-center gap-1"><BookOpenCheck size={13} /> {schedule.timeTable?.length || 0} Subjects</span>
                      <span className="inline-flex items-center gap-1"><Users size={13} /> {schedule.attendees?.length || 0} Students</span>
                    </div>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{schedule.isActive ? 'Active' : 'Inactive'}</span>
                </div>

                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                  <div className="border-b p-4 lg:border-b-0 lg:border-r">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-600"><BookOpenCheck size={15} className="text-blue-600" /> Subjects</h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500"><tr><th className="px-3 py-2 text-center">#</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Time</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {schedule.timeTable?.length ? schedule.timeTable.map((row, index) => (
                            <tr key={row._id || index} className="hover:bg-blue-50/40"><td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{index + 1}</td><td className="px-3 py-2 font-bold text-gray-800">{getSubjectName(row)}</td><td className="px-3 py-2 text-gray-600">{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}</td><td className="px-3 py-2 text-gray-600">{row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : row.startTime || row.endTime || '-'}</td></tr>
                          )) : <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-400">No subjects found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-600"><GraduationCap size={15} className="text-green-600" /> Students</h4>
                    <div className="max-h-[360px] overflow-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500"><tr><th className="px-3 py-2 text-center">#</th><th className="px-3 py-2">Reg No</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Branch</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {schedule.attendees?.length ? schedule.attendees.map((student, index) => (
                            <tr key={student._id || index} className="hover:bg-green-50/40"><td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{index + 1}</td><td className="px-3 py-2 font-mono text-gray-700">{student.regNo || '-'}</td><td className="px-3 py-2 font-bold text-primary">{getStudentName(student)}</td><td className="px-3 py-2 text-gray-600">{student.branchName || '-'}</td></tr>
                          )) : <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-400">No students found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {absentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-amber-600 px-5 py-4 text-white">
              <div>
                <h3 className="text-lg font-black">Absent Student Re-Exam</h3>
                <p className="text-xs font-semibold text-amber-100">{selectedExamName} | {absentRows.length} absent subject rows</p>
              </div>
              <button type="button" onClick={() => setAbsentModalOpen(false)} className="rounded-full bg-white/20 p-1 hover:bg-white/30"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-slate-50 p-4 lg:grid-cols-6">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Re-Exam Name</label>
                  <input type="text" value={reExamForm.reExamName} onChange={(e) => setReExamForm((prev) => ({ ...prev, reExamName: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Date</label>
                  <input type="date" value={reExamForm.date} onChange={(e) => setReExamForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Start Time</label>
                  <input type="text" value={reExamForm.startTime} onChange={(e) => setReExamForm((prev) => ({ ...prev, startTime: e.target.value }))} placeholder="10:00 AM" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">End Time</label>
                  <input type="text" value={reExamForm.endTime} onChange={(e) => setReExamForm((prev) => ({ ...prev, endTime: e.target.value }))} placeholder="12:00 PM" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Examiner</label>
                  <select value={reExamForm.examiner} onChange={(e) => setReExamForm((prev) => ({ ...prev, examiner: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="">Select</option>
                    {(employees || []).map((employee) => <option key={employee._id} value={employee._id}>{getEmployeeName(employee)}</option>)}
                  </select>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-gray-700 lg:col-span-1">
                  <input type="checkbox" checked={Boolean(reExamForm.conductPasswordEnabled)} onChange={(e) => setReExamForm((prev) => ({ ...prev, conductPasswordEnabled: e.target.checked }))} className="h-4 w-4" />
                  <Lock size={14} /> Password
                </label>
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Re-Exam Password</label>
                  <input type="text" value={reExamForm.conductPassword} onChange={(e) => setReExamForm((prev) => ({ ...prev, conductPassword: e.target.value }))} disabled={!reExamForm.conductPasswordEnabled} placeholder="Enter password" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100" />
                </div>
                <div className="flex items-end lg:col-span-3">
                  <button type="button" onClick={createAbsentReExam} disabled={creatingReExam || selectedAbsentList.length === 0} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {creatingReExam ? <RefreshCw className="animate-spin" size={16} /> : <CheckSquare size={16} />} Create Re-Exam For Selected ({selectedAbsentList.length})
                  </button>
                </div>
              </div>

              {absentLoading ? (
                <div className="flex min-h-[220px] items-center justify-center text-gray-500"><Loader className="mr-2 animate-spin" size={20} /> Loading absent students...</div>
              ) : absentRows.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">No absent students found for ended exam subjects.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500">
                      <tr><th className="px-3 py-2 text-center">Select</th><th className="px-3 py-2">Reg No</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Course</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Original Date</th><th className="px-3 py-2">Time</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {absentRows.map((row) => (
                        <tr key={row.key} className="hover:bg-amber-50/50">
                          <td className="px-3 py-2 text-center"><input type="checkbox" checked={Boolean(selectedAbsentRows[row.key])} onChange={() => toggleAbsentRow(row.key)} className="h-4 w-4" /></td>
                          <td className="px-3 py-2 font-mono text-gray-700">{row.student?.regNo || '-'}</td>
                          <td className="px-3 py-2 font-bold text-primary">{row.student?.name || 'Student'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800">{row.course?.name || 'Course'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800">{row.subject?.name || row.subject?.printedName || 'Subject'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.originalDate ? new Date(row.originalDate).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.originalStartTime && row.originalEndTime ? `${row.originalStartTime} - ${row.originalEndTime}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSet;


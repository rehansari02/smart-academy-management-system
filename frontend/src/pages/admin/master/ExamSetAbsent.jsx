import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarDays, CheckSquare, Loader, RefreshCw, Search, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchExamSchedules, fetchExams } from '../../../features/master/masterSlice';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
};

const formatTime12Hour = (value) => {
  if (!value) return '';
  if (/\b(AM|PM)\b/i.test(value)) return value;
  const [hourValue, minuteValue = '00'] = String(value).split(':');
  let hour = Number(hourValue);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')} ${period}`;
};

const DEFAULT_START_TIME = '10:00';
const DEFAULT_END_TIME = '13:00';

const ExamSetAbsent = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { exams, examSchedules } = useSelector((state) => state.master);
  const [selectedExamName, setSelectedExamName] = useState(searchParams.get('examName') || '');
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState({});
  const [rowTimes, setRowTimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(true);

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchExamSchedules());
  }, [dispatch]);

  const examOptions = useMemo(() => {
    const map = new Map();
    const setOption = (name, date) => {
      const key = name.toLowerCase();
      const time = date ? new Date(date).getTime() : 0;
      const existing = map.get(key);
      if (!existing || time > existing.time) map.set(key, { name, time });
    };
    (exams || []).forEach((exam) => {
      const name = exam?.name?.trim();
      if (name) setOption(name, exam?.createdAt || exam?.updatedAt);
    });
    (examSchedules || []).forEach((schedule) => {
      const name = schedule?.examName?.trim();
      if (name) setOption(name, schedule?.createdAt || schedule?.updatedAt);
    });
    return [...map.values()].sort((a, b) => b.time - a.time || a.name.localeCompare(b.name)).map((item) => item.name);
  }, [exams, examSchedules]);

  const loadAbsentRows = async (examName = selectedExamName) => {
    if (!examName) {
      setRows([]);
      return;
    }
    setLoading(true);
    setSelectedRows({});
    try {
      const res = await axios.get(`${API_URL}exam-schedule/absent-students`, { params: { examName } });
      const nextRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setRows(nextRows);
      setRowTimes((prev) => {
        const next = {};
        nextRows.forEach((row) => {
          next[row.key] = prev[row.key] || { date: '', startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };
        });
        return next;
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load absent students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamName) loadAbsentRows(selectedExamName);
  }, []);

  const selectedList = rows.filter((row) => selectedRows[row.key]);

  const updateExamName = (examName) => {
    setSelectedExamName(examName);
    setSearchParams(examName ? { examName } : {});
    loadAbsentRows(examName);
  };

  const toggleAll = (checked) => {
    const next = {};
    if (checked) rows.forEach((row) => { next[row.key] = true; });
    setSelectedRows(next);
  };

  const updateRowTime = (key, field, value) => {
    setRowTimes((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const createReExam = async () => {
    if (!selectedExamName) {
      toast.error('Select exam name first.');
      return;
    }
    if (selectedList.length === 0) {
      toast.error('Select absent students.');
      return;
    }
    if (passwordEnabled && !password.trim()) {
      toast.error('Password is required.');
      return;
    }

    const missingTime = selectedList.find((row) => {
      const time = rowTimes[row.key] || {};
      return !time.date || !time.startTime || !time.endTime;
    });
    if (missingTime) {
      toast.error('Set re-exam date and time for every selected row.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        examName: selectedExamName,
        conductPasswordEnabled: passwordEnabled,
        conductPassword: password,
        selectedRows: selectedList.map((row) => ({
          scheduleId: row.scheduleId,
          subjectId: row.subject?._id || row.subject,
          studentId: row.student?._id,
          date: rowTimes[row.key].date,
          startTime: formatTime12Hour(rowTimes[row.key].startTime),
          endTime: formatTime12Hour(rowTimes[row.key].endTime)
        }))
      };
      const res = await axios.post(`${API_URL}exam-schedule/absent-reexam`, payload);
      toast.success(res.data?.message || 'Re-exam timetable created');
      setPassword('');
      await loadAbsentRows(selectedExamName);
      dispatch(fetchExamSchedules({ examName: selectedExamName }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create re-exam timetable');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button type="button" onClick={() => navigate('/master/exam-set')} className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Absent Student Exam</h2>
          <p className="mt-1 text-sm text-gray-500">Same exam name me absent students ke pending subjects ka re-exam timetable banao.</p>
        </div>
        <button type="button" onClick={() => loadAbsentRows()} disabled={!selectedExamName || loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mb-6 rounded-lg border-t-4 border-amber-500 bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Select Exam Name</label>
            <select value={selectedExamName} onChange={(e) => updateExamName(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">-- Select Exam --</option>
              {examOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{rows.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Absent Rows</div></div>
            <div className="rounded-lg border bg-gray-50 px-4 py-2"><div className="text-lg font-black text-gray-900">{selectedList.length}</div><div className="text-[10px] font-bold uppercase text-gray-500">Selected</div></div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_auto] md:items-end">
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-gray-700">
            <input type="checkbox" checked={passwordEnabled} onChange={(e) => setPasswordEnabled(e.target.checked)} className="h-4 w-4" />
            Password
          </label>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-600">Re-Exam Password</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!passwordEnabled} placeholder="Enter password for re-exam" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100" />
          </div>
          <button type="button" onClick={createReExam} disabled={creating || selectedList.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
            {creating ? <RefreshCw className="animate-spin" size={16} /> : <CheckSquare size={16} />} Create Re-Exam Timetable
          </button>
        </div>
      </div>

      {!selectedExamName ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500 shadow-sm"><Search className="mx-auto mb-3 text-gray-400" size={32} /><p className="text-sm font-semibold">Select an exam name.</p></div>
      ) : loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm"><Loader className="mr-2 animate-spin" size={20} /> Loading absent students...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center text-green-700">No absent students found for pending re-exam.</div>
      ) : (
        <div className="overflow-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-[1320px] w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: 48 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 152 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 152 }} />
              <col style={{ width: 152 }} />
            </colgroup>
            <thead className="sticky top-0 bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-center"><input type="checkbox" checked={rows.length > 0 && selectedList.length === rows.length} onChange={(e) => toggleAll(e.target.checked)} className="h-4 w-4" /></th>
                <th className="px-3 py-2">Reg No</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Absent Subject</th>
                <th className="px-3 py-2">Original Date</th>
                <th className="px-3 py-2">Original Time</th>
                <th className="px-3 py-2">Re-Exam Date</th>
                <th className="px-3 py-2">Start Time</th>
                <th className="px-3 py-2">End Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const checked = Boolean(selectedRows[row.key]);
                const time = rowTimes[row.key] || {};
                return (
                  <tr key={row.key} className={checked ? 'bg-amber-50/60' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={checked} onChange={() => setSelectedRows((prev) => ({ ...prev, [row.key]: !prev[row.key] }))} className="h-4 w-4" /></td>
                    <td className="truncate px-3 py-2 font-mono text-gray-700" title={row.student?.regNo || '-'}>{row.student?.regNo || '-'}</td>
                    <td className="truncate px-3 py-2 font-bold text-primary" title={row.student?.name || 'Student'}>{row.student?.name || 'Student'}</td>
                    <td className="truncate px-3 py-2 font-semibold text-gray-800" title={row.course?.name || 'Course'}>{row.course?.name || 'Course'}</td>
                    <td className="truncate px-3 py-2 font-semibold text-gray-800" title={row.subject?.name || row.subject?.printedName || 'Subject'}>{row.subject?.name || row.subject?.printedName || 'Subject'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatDate(row.originalDate)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{row.originalStartTime && row.originalEndTime ? `${row.originalStartTime} - ${row.originalEndTime}` : '-'}</td>
                    <td className="px-3 py-2"><input type="date" value={time.date || ''} onChange={(e) => updateRowTime(row.key, 'date', e.target.value)} disabled={!checked} className="h-10 w-full rounded border border-gray-300 px-2 text-xs disabled:bg-gray-100" /></td>
                    <td className="px-2 py-2"><TimePicker12Hour value={time.startTime || DEFAULT_START_TIME} onChange={(value) => updateRowTime(row.key, 'startTime', value)} disabled={!checked} compact /></td>
                    <td className="px-2 py-2"><TimePicker12Hour value={time.endTime || DEFAULT_END_TIME} onChange={(value) => updateRowTime(row.key, 'endTime', value)} disabled={!checked} compact /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        <div className="flex items-start gap-2"><CalendarDays size={18} className="mt-0.5" /><span>The re-exam will be created under the same exam name. In the student panel, the original subject will show as `Absent`, and the re-exam timetable will appear in a separate section.</span></div>
      </div>
    </div>
  );
};

export default ExamSetAbsent;

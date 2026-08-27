import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Loader,
  RefreshCw,
  Search,
  Users,
  Building2,
  Lock,
  Clock,
  BookOpenCheck,
  ShieldCheck,
  Phone,
  Printer,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchExamSchedules, fetchExams } from '../../../features/master/masterSlice';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import logo from '../../../assets/logo2.png';

const API_URL = `${import.meta.env.VITE_API_URL}/master/`;

const formatDateLabel = (value) => {
  if (!value || value === 'no-date') return 'No Date Assigned';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getDateKey = (value) => {
  if (!value) return 'no-date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'no-date';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [branchPresets, setBranchPresets] = useState({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedExamDate, setSelectedExamDate] = useState('all');
  const [lastCreatedReExam, setLastCreatedReExam] = useState(null);

  const componentRef = useRef(null);

  const handleReactToPrint = useReactToPrint({
    contentRef: componentRef,
    content: () => componentRef.current,
    documentTitle: `Absent_Student_Report_${selectedExamName || 'Exam'}_${moment().format('DD-MM-YYYY')}`,
    onAfterPrint: () => toast.success('Report Sent to Printer')
  });

  const onPrintClick = () => {
    try {
      if (handleReactToPrint) {
        handleReactToPrint();
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Print trigger error:', error);
      window.print();
    }
  };

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

      const nextRowTimes = {};
      nextRows.forEach((row) => {
        nextRowTimes[row.key] = rowTimes[row.key] || {
          date: '',
          startTime: DEFAULT_START_TIME,
          endTime: DEFAULT_END_TIME
        };
      });
      setSelectedRows({});
      setRowTimes(nextRowTimes);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load absent students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamName) loadAbsentRows(selectedExamName);
  }, []);

  const availableBranches = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      set.add(r.student?.branchName || 'Main Branch');
    });
    return [...set].sort();
  }, [rows]);

  const availableExamDates = useMemo(() => {
    const dateMap = new Map();
    rows.forEach((row) => {
      const dateKey = getDateKey(row.originalDate);
      if (dateKey !== 'no-date' && !dateMap.has(dateKey)) {
        dateMap.set(dateKey, formatDateLabel(row.originalDate));
      }
    });
    return [...dateMap.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (selectedExamDate !== 'all') {
      result = result.filter((row) => getDateKey(row.originalDate) === selectedExamDate);
    }
    if (selectedBranch !== 'all') {
      result = result.filter((row) => (row.student?.branchName || 'Main Branch') === selectedBranch);
    }
    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase().trim();
    return result.filter((row) => {
      const name = String(row.student?.name || '').toLowerCase();
      const reg = String(row.student?.regNo || '').toLowerCase();
      const course = String(row.course?.name || '').toLowerCase();
      const subject = String(row.subject?.name || row.subject?.printedName || '').toLowerCase();
      const branch = String(row.student?.branchName || '').toLowerCase();
      return name.includes(term) || reg.includes(term) || course.includes(term) || subject.includes(term) || branch.includes(term);
    });
  }, [rows, selectedExamDate, selectedBranch, searchTerm]);

  // Course-wise Absent Summary
  const courseSummary = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const courseName = row.course?.name || 'Course';
      const dateLabel = formatDateLabel(row.originalDate);
      const key = `${courseName}__${dateLabel}`;
      if (!map.has(key)) {
        map.set(key, {
          courseName,
          dateLabel,
          count: 0,
          subjects: new Set()
        });
      }
      const item = map.get(key);
      item.count += 1;
      const subName = row.subject?.name || row.subject?.printedName;
      if (subName) item.subjects.add(subName);
    });
    return [...map.values()].sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [filteredRows]);

  // Group filtered rows by Date -> Branch (mirroring ExamSet.jsx layout)
  const dateGroups = useMemo(() => {
    const groupMap = new Map();

    filteredRows.forEach((row) => {
      const dateKey = getDateKey(row.originalDate);
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, {
          dateKey,
          originalDate: row.originalDate,
          rows: [],
          branchMap: new Map()
        });
      }

      const dateGroup = groupMap.get(dateKey);
      dateGroup.rows.push(row);

      const branchName = row.student?.branchName || 'Main Branch';
      if (!dateGroup.branchMap.has(branchName)) {
        dateGroup.branchMap.set(branchName, {
          branchName,
          rows: []
        });
      }
      dateGroup.branchMap.get(branchName).rows.push(row);
    });

    return [...groupMap.values()].sort((a, b) => {
      if (a.dateKey === 'no-date') return 1;
      if (b.dateKey === 'no-date') return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [filteredRows]);

  const selectedList = useMemo(() => filteredRows.filter((row) => selectedRows[row.key]), [filteredRows, selectedRows]);

  const uniqueCoursesCount = useMemo(() => {
    const set = new Set(filteredRows.map((r) => r.course?._id || r.course?.name).filter(Boolean));
    return set.size;
  }, [filteredRows]);

  const uniqueBranchesCount = useMemo(() => {
    const set = new Set(filteredRows.map((r) => r.student?.branchName || 'Main Branch'));
    return set.size;
  }, [filteredRows]);

  const updateExamName = (examName) => {
    setSelectedExamName(examName);
    setSelectedExamDate('all');
    setSelectedBranch('all');
    setSearchParams(examName ? { examName } : {});
    loadAbsentRows(examName);
  };

  const toggleAll = (checked) => {
    const next = {};
    if (checked) filteredRows.forEach((row) => { next[row.key] = true; });
    setSelectedRows(next);
  };

  const toggleBranchAll = (branchRows, checked) => {
    setSelectedRows((prev) => {
      const next = { ...prev };
      branchRows.forEach((r) => { next[r.key] = checked; });
      return next;
    });
  };

  const updateRowTime = (key, field, value) => {
    setRowTimes((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const updateBranchPreset = (presetKey, field, value) => {
    setBranchPresets((prev) => ({
      ...prev,
      [presetKey]: { ...(prev[presetKey] || {}), [field]: value }
    }));
  };

  const applyBranchPresetToRows = (presetKey, branchRows) => {
    const preset = branchPresets[presetKey] || {};
    if (!preset.date) {
      toast.error('Select Re-Exam Date first.');
      return;
    }

    setRowTimes((prev) => {
      const next = { ...prev };
      branchRows.forEach((r) => {
        next[r.key] = {
          date: preset.date,
          startTime: preset.startTime || DEFAULT_START_TIME,
          endTime: preset.endTime || DEFAULT_END_TIME
        };
      });
      return next;
    });
    toast.success(`Applied date & time to ${branchRows.length} student(s) in this branch`);
  };

  const createReExam = async () => {
    if (!selectedExamName) {
      toast.error('Select exam name first.');
      return;
    }
    if (selectedList.length === 0) {
      toast.error('Select at least one absent student.');
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
      toast.error(`Set re-exam date and time for student: ${missingTime.student?.name || 'selected student'}.`);
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
      toast.success(res.data?.message || 'Re-exam timetable created successfully!');
      const createdSchedules = Array.isArray(res.data?.schedules) ? res.data.schedules : [];
      setLastCreatedReExam({
        count: createdSchedules.length,
        dates: [...new Set(createdSchedules.map((schedule) => getDateKey(schedule.timeTable?.[0]?.date)).filter((value) => value !== 'no-date'))]
      });
      setPassword('');
      await loadAbsentRows(selectedExamName);
      dispatch(fetchExamSchedules({ examName: selectedExamName }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create re-exam timetable');
    } finally {
      setCreating(false);
    }
  };

  const createSingleReExam = async (row) => {
    if (!selectedExamName) {
      toast.error('Select exam name first.');
      return;
    }
    const time = rowTimes[row.key] || {};
    if (!time.date) {
      toast.error(`Select Re-Exam Date for ${row.student?.name || 'this student'}.`);
      return;
    }
    if (!time.startTime || !time.endTime) {
      toast.error(`Set Start Time and End Time for ${row.student?.name || 'this student'}.`);
      return;
    }
    if (passwordEnabled && !password.trim()) {
      toast.error('Re-Exam Password is required.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        examName: selectedExamName,
        conductPasswordEnabled: passwordEnabled,
        conductPassword: password,
        selectedRows: [
          {
            scheduleId: row.scheduleId,
            subjectId: row.subject?._id || row.subject,
            studentId: row.student?._id,
            date: time.date,
            startTime: formatTime12Hour(time.startTime),
            endTime: formatTime12Hour(time.endTime)
          }
        ]
      };
      const res = await axios.post(`${API_URL}exam-schedule/absent-reexam`, payload);
      toast.success(res.data?.message || `Re-exam scheduled for ${row.student?.name || 'student'} successfully!`);
      const createdSchedules = Array.isArray(res.data?.schedules) ? res.data.schedules : [];
      setLastCreatedReExam({
        count: createdSchedules.length,
        dates: [...new Set(createdSchedules.map((schedule) => getDateKey(schedule.timeTable?.[0]?.date)).filter((value) => value !== 'no-date'))]
      });
      await loadAbsentRows(selectedExamName);
      dispatch(fetchExamSchedules({ examName: selectedExamName }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create re-exam timetable');
    } finally {
      setCreating(false);
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/master/exam-set')}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Exam Set
          </button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-600" size={26} />
            Absent Student Re-Exam Schedule
          </h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-medium">
            Schedule re-exam date & time branch-wise for absent students under exam schedule: <span className="font-bold text-amber-700">{selectedExamName || 'Select Exam'}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrintClick}
            disabled={!selectedExamName || filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
          >
            <Printer size={15} /> Print Absent Report
          </button>
          <button
            type="button"
            onClick={() => loadAbsentRows()}
            disabled={!selectedExamName || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-60 transition cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {lastCreatedReExam && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <UserCheck className="mt-0.5 shrink-0 text-emerald-700" size={22} />
              <div>
                <h2 className="font-black text-emerald-900">Re-Exam timetable created — attendance ab dobara leni hai</h2>
                <p className="mt-1 text-xs font-semibold text-emerald-800">
                  {lastCreatedReExam.count} schedule(s) created. Exam Set mein re-exam date open karke student ko Present/Absent mark karein. Fresh attendance save hone tak paper locked rahega.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/master/exam-set?examName=${encodeURIComponent(selectedExamName)}${lastCreatedReExam.dates[0] ? `&examDate=${encodeURIComponent(lastCreatedReExam.dates[0])}` : ''}`)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-800"
            >
              <UserCheck size={16} /> Mark Re-Exam Attendance
            </button>
          </div>
        </div>
      )}

      {/* Filter & Metrics Card (Mirrors ExamSet.jsx) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Select Exam Schedule</label>
              <select
                value={selectedExamName}
                onChange={(e) => updateExamName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition"
              >
                <option value="">-- Select Exam Schedule --</option>
                {examOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Filter By Exam Date</label>
              <select
                value={selectedExamDate}
                onChange={(e) => setSelectedExamDate(e.target.value)}
                disabled={!selectedExamName || availableExamDates.length === 0}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50 transition"
              >
                <option value="all">All Exam Dates</option>
                {availableExamDates.map((date) => (
                  <option key={date.value} value={date.value}>{date.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Filter By Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={!selectedExamName}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50 transition"
              >
                <option value="all">All Branches ({rows.length})</option>
                {availableBranches.map((bName) => (
                  <option key={bName} value={bName}>{bName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Search Students / Subjects</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by student name, reg no, course..."
                  disabled={!selectedExamName}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-2 lg:pt-0">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
              <div className="text-base font-black text-amber-900">{filteredRows.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Absent Rows</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{uniqueCoursesCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Courses</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{uniqueBranchesCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Branches</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
              <div className="text-base font-black text-emerald-800">{selectedList.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Selected</div>
            </div>
          </div>
        </div>

        {/* Global Re-Exam Password Controls */}
        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-bold text-gray-700 shadow-xs cursor-pointer">
              <input
                type="checkbox"
                checked={passwordEnabled}
                onChange={(e) => setPasswordEnabled(e.target.checked)}
                className="h-4 w-4 text-amber-600 rounded cursor-pointer"
              />
              <Lock size={14} className="text-amber-600" /> Re-Exam Password
            </label>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Re-Exam Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!passwordEnabled}
                placeholder={passwordEnabled ? "Enter password required by students for this re-exam..." : "Password disabled"}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-100"
              />
            </div>

            <button
              type="button"
              onClick={createReExam}
              disabled={creating || selectedList.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              {creating ? <RefreshCw className="animate-spin" size={16} /> : <CheckSquare size={16} />}
              Create Re-Exam Timetable ({selectedList.length})
            </button>
          </div>
        </div>

        {/* Course-Wise Absent Summary Card (Screen View) */}
        {selectedExamName && courseSummary.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                <BookOpenCheck size={16} className="text-indigo-600" />
                Course-Wise Absent Summary ({courseSummary.length} Course Group(s))
              </h3>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Branch: {selectedBranch === 'all' ? 'All Branches' : selectedBranch}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-indigo-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100">
                  <tr>
                    <th className="px-3 py-2">Course Name</th>
                    <th className="px-3 py-2">Original Exam Date</th>
                    <th className="px-3 py-2 text-center">Absent Students</th>
                    <th className="px-3 py-2">Absent Subject(s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50 font-medium">
                  {courseSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30">
                      <td className="px-3 py-2 font-extrabold text-indigo-950">{item.courseName}</td>
                      <td className="px-3 py-2 font-semibold text-gray-700">{item.dateLabel}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-800 border border-rose-200">
                          {item.count} Absent
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px]">{[...item.subjects].join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      {!selectedExamName ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400 shadow-sm">
          <Search className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm font-semibold text-gray-600">Please select an exam name from the dropdown above.</p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
          <Loader className="mr-2 animate-spin text-amber-600" size={24} /> Loading absent students...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center text-sm font-semibold text-emerald-800">
          No absent students found for pending re-exam under this schedule.
        </div>
      ) : (
        <div className="space-y-8">
          {dateGroups.map((dateGroup) => {
            const branchGroups = [...dateGroup.branchMap.values()].sort((a, b) => a.branchName.localeCompare(b.branchName));

            return (
              <div key={dateGroup.dateKey} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition">
                {/* Original Date Banner Header (Matching ExamSet.jsx style) */}
                <div className="flex flex-col gap-3 bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                        Original Exam Date: {formatDateLabel(dateGroup.originalDate)}
                      </h2>
                      <p className="text-xs text-amber-200 font-medium">
                        {branchGroups.length} Branch(es) • {dateGroup.rows.length} Absent Subject Record(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleBranchAll(dateGroup.rows, true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25 transition cursor-pointer"
                    >
                      <CheckSquare size={14} /> Select All Date Rows ({dateGroup.rows.length})
                    </button>
                  </div>
                </div>

                {/* Branch Cards under this Date */}
                <div className="p-4 md:p-6 space-y-6 bg-slate-50/40">
                  {branchGroups.map((bGroup) => {
                    const presetKey = `${dateGroup.dateKey}_${bGroup.branchName}`;
                    const preset = branchPresets[presetKey] || { date: '', startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };
                    const allBranchSelected = bGroup.rows.every((r) => selectedRows[r.key]);

                    return (
                      <div key={bGroup.branchName} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-amber-200">
                        {/* Branch Bar */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <Building2 className="text-amber-600" size={18} />
                            <h3 className="text-base font-black text-gray-900">{bGroup.branchName}</h3>
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                              {bGroup.rows.length} Absent Row(s)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allBranchSelected}
                                onChange={(e) => toggleBranchAll(bGroup.rows, e.target.checked)}
                                className="h-3.5 w-3.5 text-amber-600 rounded cursor-pointer"
                              />
                              Select Branch Students
                            </label>
                          </div>
                        </div>

                        {/* Quick Branch Re-Exam Time Settings Bar */}
                        <div className="rounded-xl bg-amber-50/50 border border-amber-200/80 p-3.5 mb-4">
                          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Clock size={14} className="text-amber-700" />
                            Quick Branch Re-Exam Time Assigner ({bGroup.branchName})
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600 uppercase">Re-Exam Date</label>
                              <input
                                type="date"
                                value={preset.date || ''}
                                onChange={(e) => updateBranchPreset(presetKey, 'date', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600 uppercase">Start Time</label>
                              <TimePicker12Hour
                                value={preset.startTime || DEFAULT_START_TIME}
                                onChange={(val) => updateBranchPreset(presetKey, 'startTime', val)}
                                compact
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600 uppercase">End Time</label>
                              <TimePicker12Hour
                                value={preset.endTime || DEFAULT_END_TIME}
                                onChange={(val) => updateBranchPreset(presetKey, 'endTime', val)}
                                compact
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => applyBranchPresetToRows(presetKey, bGroup.rows)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-amber-800 transition cursor-pointer"
                            >
                              Apply to {bGroup.rows.length} Row(s)
                            </button>
                          </div>
                        </div>

                        {/* Branch Absent Students Table (Structured Roomy Table) */}
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-full text-xs">
                            <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                              <tr>
                                <th className="px-3 py-2.5 text-center w-10">
                                  <input
                                    type="checkbox"
                                    checked={allBranchSelected}
                                    onChange={(e) => toggleBranchAll(bGroup.rows, e.target.checked)}
                                    className="h-3.5 w-3.5 text-amber-600 rounded cursor-pointer"
                                  />
                                </th>
                                <th className="px-3 py-2.5">Reg No</th>
                                <th className="px-3 py-2.5">Student Name</th>
                                <th className="px-3 py-2.5">Course</th>
                                <th className="px-3 py-2.5">Absent Subject</th>
                                <th className="px-3 py-2.5">Original Time</th>
                                <th className="px-3 py-2.5">Re-Exam Date</th>
                                <th className="px-3 py-2.5">Start Time</th>
                                <th className="px-3 py-2.5">End Time</th>
                                <th className="px-3 py-2.5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {bGroup.rows.map((row) => {
                                const isChecked = Boolean(selectedRows[row.key]);
                                const time = rowTimes[row.key] || {};

                                return (
                                  <tr key={row.key} className={isChecked ? 'bg-amber-50/50 hover:bg-amber-50/80 transition' : 'hover:bg-slate-50 transition opacity-75'}>
                                    <td className="px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => setSelectedRows((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                                        className="h-4 w-4 text-amber-600 rounded cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-amber-800 font-mono">
                                      {row.student?.regNo || '-'}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-gray-900">
                                      {row.student?.name || 'Student'}
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                                      {row.course?.name || 'Course'}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold text-indigo-700">
                                      {row.subject?.name || row.subject?.printedName || 'Subject'}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                                      {row.originalStartTime && row.originalEndTime ? `${row.originalStartTime} - ${row.originalEndTime}` : '-'}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="date"
                                        value={time.date || ''}
                                        onChange={(e) => updateRowTime(row.key, 'date', e.target.value)}
                                        disabled={!isChecked}
                                        className="h-9 w-full min-w-[130px] rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-800 outline-none focus:border-amber-500 disabled:bg-gray-100"
                                      />
                                    </td>
                                    <td className="px-2 py-2.5">
                                      <TimePicker12Hour
                                        value={time.startTime || DEFAULT_START_TIME}
                                        onChange={(val) => updateRowTime(row.key, 'startTime', val)}
                                        disabled={!isChecked}
                                        compact
                                      />
                                    </td>
                                    <td className="px-2 py-2.5">
                                      <TimePicker12Hour
                                        value={time.endTime || DEFAULT_END_TIME}
                                        onChange={(val) => updateRowTime(row.key, 'endTime', val)}
                                        disabled={!isChecked}
                                        compact
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => createSingleReExam(row)}
                                        disabled={creating || !time.date}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer whitespace-nowrap"
                                        title="Schedule Re-Exam for this student only"
                                      >
                                        <CheckSquare size={13} />
                                        Schedule
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 shadow-xs print:hidden">
        <div className="flex items-start gap-2.5">
          <CalendarDays size={20} className="mt-0.5 text-amber-700 shrink-0" />
          <span>
            <strong>Re-Exam Timetable Note:</strong> Creating a re-exam timetable adds a new re-exam entry under the same exam name (<span className="font-bold">{selectedExamName || 'Exam'}</span>). In the student portal, the original exam subject displays status <span className="font-bold text-rose-700">Absent</span>, and the new re-exam schedule appears in a dedicated Re-Exam timetable section.
          </span>
        </div>
      </div>

      {/* Printable Report Area (Off-screen on webpage, 100% captured for printing) */}
      <div className="fixed -left-[9999px] top-0 print:static print:left-0 print:block">
        <div
          ref={componentRef}
          className="bg-white p-4 w-[210mm] print:w-full font-sans text-black"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-blue-600 pb-4">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Institute Logo" className="h-20 object-contain" />
            </div>
            <div className="text-right text-xs space-y-1">
              <h2 className="text-xl font-bold text-blue-600 mb-1">
                {selectedBranch === 'all' ? 'Smart Institute' : selectedBranch}
              </h2>
              <div className="text-gray-600 max-w-xs ml-auto">
                309-A, 309-B, 3rd Floor, Sai Square Building, Bhestan Circle, Bhestan Surat Gujarat-395023 (INDIA)
              </div>
              <p className="font-semibold text-blue-800">
                Ph. No. : 96017-49300, Mob. No. : 98988-30409
              </p>
              <p className="text-blue-500 underline">smartinstitutes@gmail.com</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-black uppercase underline decoration-2 underline-offset-4">
              Absent Student Re-Exam Schedule Report
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-semibold">
              Exam Schedule: <span className="text-black font-bold">{selectedExamName || 'N/A'}</span> | Branch Filter: <span className="text-black font-bold">{selectedBranch === 'all' ? 'All Branches' : selectedBranch}</span> | Date: {moment().format('DD-MM-YYYY')}
            </p>
          </div>

          {/* Section 1: Course-Wise Summary */}
          {courseSummary.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2">
                1. Course-Wise Absent Summary
              </h4>
              <table className="w-full border-collapse border border-gray-400 text-[10px]">
                <thead>
                  <tr className="bg-blue-600 text-white print:bg-gray-200 print:text-black">
                    <th className="border border-gray-400 p-1 w-8 text-center">Sr.</th>
                    <th className="border border-gray-400 p-1 text-left">Course Name</th>
                    <th className="border border-gray-400 p-1 text-left">Original Exam Date</th>
                    <th className="border border-gray-400 p-1 text-center w-28">Absent Students</th>
                    <th className="border border-gray-400 p-1 text-left">Absent Subject(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {courseSummary.map((item, idx) => (
                    <tr key={idx} className="text-center hover:bg-gray-50 break-inside-avoid">
                      <td className="border border-gray-400 p-1 font-bold">{idx + 1}</td>
                      <td className="border border-gray-400 p-1 text-left font-bold text-gray-900">{item.courseName}</td>
                      <td className="border border-gray-400 p-1 text-left">{item.dateLabel}</td>
                      <td className="border border-gray-400 p-1 font-bold text-red-600">{item.count}</td>
                      <td className="border border-gray-400 p-1 text-left">{[...item.subjects].join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2: Detailed Absent Student List */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2">
              2. Detailed Absent Student List ({filteredRows.length} Records)
            </h4>
            <table className="w-full border-collapse border border-gray-400 text-[10px]">
              <thead>
                <tr className="bg-blue-600 text-white print:bg-gray-200 print:text-black">
                  <th className="border border-gray-400 p-1 w-8 text-center">Sr.</th>
                  <th className="border border-gray-400 p-1 w-24">Reg. No</th>
                  <th className="border border-gray-400 p-1 text-left">Student Full Name</th>
                  <th className="border border-gray-400 p-1 text-left w-28">Branch</th>
                  <th className="border border-gray-400 p-1 text-left">Course</th>
                  <th className="border border-gray-400 p-1 text-left">Absent Subject</th>
                  <th className="border border-gray-400 p-1 text-left w-36">Original Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, idx) => (
                    <tr key={row.key} className="text-center hover:bg-gray-50 break-inside-avoid">
                      <td className="border border-gray-400 p-1">{idx + 1}</td>
                      <td className="border border-gray-400 p-1 font-semibold">{row.student?.regNo || '-'}</td>
                      <td className="border border-gray-400 p-1 text-left uppercase font-medium">{row.student?.name || '-'}</td>
                      <td className="border border-gray-400 p-1 text-left">{row.student?.branchName || 'Main Branch'}</td>
                      <td className="border border-gray-400 p-1 text-left">{row.course?.name || '-'}</td>
                      <td className="border border-gray-400 p-1 text-left font-semibold text-blue-900">{row.subject?.name || row.subject?.printedName || '-'}</td>
                      <td className="border border-gray-400 p-1 text-left">
                        {formatDateLabel(row.originalDate)} ({row.originalStartTime && row.originalEndTime ? `${row.originalStartTime} - ${row.originalEndTime}` : '-'})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-gray-500 border border-gray-400">
                      No absent records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-[10px] text-gray-500 flex justify-between print:mt-auto pt-4 border-t border-gray-300">
            <span>Printed On: {moment().format('DD-MM-YYYY hh:mm A')}</span>
            <span>Total Absent Records: {filteredRows.length}</span>
          </div>
        </div>

        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
          `}
        </style>
      </div>
    </div>
  );
};

export default ExamSetAbsent;

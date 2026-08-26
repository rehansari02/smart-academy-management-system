import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckSquare,
  Eye,
  GraduationCap,
  Loader,
  Lock,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import axios from 'axios';
import { fetchEmployees, fetchExamSchedules, fetchExams, updateExamSchedule } from '../../../features/master/masterSlice';

const getSubjectName = (row) => row?.subject?.name || row?.subject?.printedName || row?.name || 'Subject';
const getSubjectId = (row) => row?.subject?._id || row?.subject;
const getEmployeeName = (employee) => employee?.name || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || 'Employee';

const getEmployeesForBranch = (employeesList, branchId, branchName) => {
  if (!Array.isArray(employeesList)) return [];
  const targetId = String(branchId?._id || branchId || '');
  if (!targetId && !branchName) return [];

  const normalizeBranchName = (value) => String(value || '')
    .toLowerCase()
    .replace(/\bbranch\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const targetName = normalizeBranchName(branchName);

  return employeesList.filter((emp) => {
    const employeeBranchId = String(emp.branchId?._id || emp.branchId || '');
    if (targetId && employeeBranchId) return employeeBranchId === targetId;

    const employeeBranchName = normalizeBranchName(
      emp.branchId?.name || emp.branchName || emp.branch
    );
    return Boolean(targetName && employeeBranchName && employeeBranchName === targetName);
  });
};

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
  const [branchSettings, setBranchSettings] = useState({});
  const [savingKey, setSavingKey] = useState('');

  // Student List & Attendance Modal States
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDateLabel, setModalDateLabel] = useState('');
  const [modalDateKey, setModalDateKey] = useState('');
  const [modalScheduleIds, setModalScheduleIds] = useState([]);
  const [modalStudentList, setModalStudentList] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

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

  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return (employees || []).find(
      (e) => String(e.userAccount?._id || e.userAccount) === String(user._id) || String(e._id) === String(user.employeeId)
    );
  }, [employees, user]);

  // Group by Date -> Branch
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
          const studentObj = {
            ...student,
            courseName: schedule.course?.name || 'Course'
          };
          group.studentMap.set(student._id || `${schedule._id}-${student.regNo || student.mobile || student.name}`, studentObj);
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

  // Helper to extract Branch Groups for a specific date group (filtered per teacher assignment)
  const getBranchGroupsForDate = (dateGroup) => {
    const branchMap = new Map();
    const empIdStr = currentEmployee ? String(currentEmployee._id) : '';

    dateGroup.rows.forEach(({ schedule, row, rowIndex }) => {
      const branchConfigs = schedule.branchExaminers || [];

      const attendees = schedule.attendees || [];
      const branchBuckets = new Map();

      attendees.forEach((student) => {
        const bName = student.branchName || 'Main Branch';
        const bId = student.branchId || null;
        if (!branchBuckets.has(bName)) {
          branchBuckets.set(bName, { branchName: bName, branchId: bId, students: [] });
        }
        branchBuckets.get(bName).students.push(student);
      });

      if (branchBuckets.size === 0) {
        const defaultName = 'Main Branch';
        branchBuckets.set(defaultName, { branchName: defaultName, branchId: null, students: [] });
      }

      branchBuckets.forEach((bData, bName) => {
        const existingConfig = branchConfigs.find((b) => {
          const sameBranch = String(b.branchName || '').toLowerCase() === bName.toLowerCase();
          const sameDate = !b.examDate || b.examDate === dateGroup.dateKey;
          return sameBranch && sameDate;
        });

        const mainExp = existingConfig?.examiner?._id || existingConfig?.examiner || '';
        const altExp = existingConfig?.alternateExaminer?._id || existingConfig?.alternateExaminer || '';

        const isBranchMain = String(existingConfig?.examiner?._id || existingConfig?.examiner || '') === empIdStr;
        const isBranchAlt = String(existingConfig?.alternateExaminer?._id || existingConfig?.alternateExaminer || '') === empIdStr;

        // If user is not Super Admin, verify teacher is assigned to THIS course & branch on THIS specific date
        const isAssignedToThisCourseAndBranch = isSuperAdmin || isBranchMain || isBranchAlt;

        if (!isAssignedToThisCourseAndBranch) {
          return; // Skip courses/students not assigned to this teacher on THIS date
        }

        const pEnabled = existingConfig ? Boolean(existingConfig.conductPasswordEnabled) : Boolean(schedule.conductPasswordEnabled);

        if (!branchMap.has(bName)) {
          branchMap.set(bName, {
            branchName: bName,
            branchId: bData.branchId,
            studentMap: new Map(),
            scheduleMap: new Map(),
            rows: [],
            initialMain: mainExp,
            initialAlt: altExp,
            initialPasswordEnabled: pEnabled
          });
        }

        const bGroup = branchMap.get(bName);
        bData.students.forEach((s) => {
          const studentObj = {
            ...s,
            courseName: schedule.course?.name || 'Course'
          };
          bGroup.studentMap.set(s._id || s.regNo, studentObj);
        });
        bGroup.scheduleMap.set(schedule._id, schedule);
        bGroup.rows.push({ schedule, row, rowIndex });
      });
    });

    return [...branchMap.values()].sort((a, b) => a.branchName.localeCompare(b.branchName));
  };

  // Initialize branch settings
  useEffect(() => {
    setBranchSettings((prev) => {
      const next = { ...prev };
      dateGroups.forEach((dateGroup) => {
        const branches = getBranchGroupsForDate(dateGroup);
        branches.forEach((b) => {
          const settingKey = `${dateGroup.dateKey}_${b.branchName}`;
          if (!next[settingKey]) {
            next[settingKey] = {
              examiner: b.initialMain,
              alternateExaminer: b.initialAlt,
              conductPasswordEnabled: b.initialPasswordEnabled,
              conductPassword: ''
            };
          }
        });
      });
      return next;
    });
  }, [dateGroups]);

  const visibleDateGroups = useMemo(() => {
    let groups = dateGroups;
    if (testingDate) {
      groups = groups.filter((group) => group.dateKey === testingDate);
    }
    if (!isSuperAdmin) {
      groups = groups.filter((group) => getBranchGroupsForDate(group).length > 0);
    }
    return groups;
  }, [dateGroups, testingDate, isSuperAdmin, currentEmployee]);

  const totalSubjects = visibleDateGroups.reduce((total, group) => total + group.rows.length, 0);
  const totalStudents = visibleDateGroups.reduce((total, group) => total + group.studentMap.size, 0);

  const handleRefresh = () => {
    dispatch(fetchExams());
    dispatch(fetchEmployees());
    dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
  };

  const updateBranchSetting = (settingKey, field, value) => {
    setBranchSettings((prev) => ({
      ...prev,
      [settingKey]: { ...(prev[settingKey] || {}), [field]: value }
    }));
  };

  const openStudentModal = (title, studentMapOrArray, dateLabel, dateKey, scheduleMapOrList) => {
    const list = Array.isArray(studentMapOrArray)
      ? studentMapOrArray
      : [...studentMapOrArray.values()];

    const schedules = scheduleMapOrList
      ? (Array.isArray(scheduleMapOrList) ? scheduleMapOrList : [...scheduleMapOrList.values()])
      : [];

    const scheduleIds = schedules.map((s) => s._id);

    // Build initial attendance map with default preset = 'Present'
    const initialAtt = {};
    list.forEach((st) => {
      const sId = String(st._id);
      let existingStatus = 'Present'; // DEFAULT PRESET IS PRESENT

      for (const sched of schedules) {
        const att = (sched.attendance || []).find(
          (a) => String(a.student?._id || a.student) === sId && (!a.examDate || a.examDate === dateKey)
        );
        if (att) {
          existingStatus = att.status || 'Present';
          break;
        }
      }
      initialAtt[sId] = existingStatus;
    });

    setModalTitle(title);
    setModalDateLabel(dateLabel);
    setModalDateKey(dateKey);
    setModalScheduleIds(scheduleIds);
    setModalStudentList(list);
    setAttendanceMap(initialAtt);
    setModalSearchTerm('');
    setStudentModalOpen(true);
  };

  const handleToggleAttendance = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!modalDateKey || modalScheduleIds.length === 0) {
      toast.error('Unable to save attendance: missing schedule information.');
      return;
    }

    try {
      setIsSavingAttendance(true);
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status
      }));

      await axios.post(`${import.meta.env.VITE_API_URL}/master/exam-schedule/attendance`, {
        scheduleIds: modalScheduleIds,
        examDate: modalDateKey,
        attendanceRecords: records
      }, { withCredentials: true });

      toast.success('Exam Attendance saved successfully!');
      dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
      setStudentModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save exam attendance');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const filteredModalStudents = useMemo(() => {
    if (!modalSearchTerm.trim()) return modalStudentList;
    const term = modalSearchTerm.toLowerCase().trim();
    return modalStudentList.filter((s) => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const reg = String(s.regNo || s.enrollmentNo || '').toLowerCase();
      const mob = String(s.mobileStudent || s.mobileParent || '').toLowerCase();
      const branch = String(s.branchName || '').toLowerCase();
      const course = String(s.courseName || '').toLowerCase();
      return name.includes(term) || reg.includes(term) || mob.includes(term) || branch.includes(term) || course.includes(term);
    });
  }, [modalStudentList, modalSearchTerm]);

  const handleSaveBranchSettings = async (dateGroup, branchGroup) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can update examiner settings.');
      return;
    }

    const settingKey = `${dateGroup.dateKey}_${branchGroup.branchName}`;
    const current = branchSettings[settingKey] || {};
    const password = String(current.conductPassword || '').trim();

    if (current.conductPasswordEnabled && !password) {
      const hasSavedPass = [...branchGroup.scheduleMap.values()].some((s) => s.conductPasswordHash || s.conductPasswordText);
      if (!hasSavedPass) {
        toast.error(`Password is required for ${branchGroup.branchName}.`);
        return;
      }
    }

    setSavingKey(settingKey);
    const schedules = [...branchGroup.scheduleMap.values()];

    for (const schedule of schedules) {
      const existingBranchExaminers = Array.isArray(schedule.branchExaminers) ? [...schedule.branchExaminers] : [];
      const updatedBranchExaminers = existingBranchExaminers.filter((b) => {
        const sameBranch = String(b.branchName || '').toLowerCase() === branchGroup.branchName.toLowerCase();
        const sameDate = b.examDate === dateGroup.dateKey;
        return !(sameBranch && sameDate);
      });

      updatedBranchExaminers.push({
        examDate: dateGroup.dateKey,
        branchId: branchGroup.branchId || undefined,
        branchName: branchGroup.branchName,
        examiner: current.examiner || null,
        alternateExaminer: current.alternateExaminer || null,
        conductPasswordEnabled: Boolean(current.conductPasswordEnabled),
        conductPassword: current.conductPassword || ''
      });

      const result = await dispatch(updateExamSchedule({
        id: schedule._id,
        data: {
          branchExaminers: updatedBranchExaminers,
          timeTable: buildTimeTablePayload(schedule, dateGroup.dateKey, current)
        }
      }));

      if (!updateExamSchedule.fulfilled.match(result)) {
        setSavingKey('');
        toast.error(result.payload || `Failed to save ${branchGroup.branchName} settings`);
        return;
      }
    }

    setSavingKey('');
    toast.success(`Saved examiners & password for ${branchGroup.branchName}`);
    updateBranchSetting(settingKey, 'conductPassword', '');
    dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={26} />
            Exam Set & Branch Examiners
          </h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-medium">
            {isSuperAdmin
              ? 'Assign Main & Alternate Examiners branch-wise for each exam date.'
              : 'Showing only your assigned courses, branches, and student lists.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/master/exam-set/absent?examName=${encodeURIComponent(selectedExamName)}`)}
            disabled={!selectedExamName}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer"
          >
            <Users size={15} /> Absent Student Re-Exam
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Metrics Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Select Exam</label>
              <select
                value={selectedExamName}
                onChange={(e) => { setSelectedExamName(e.target.value); setTestingDate(''); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition"
              >
                <option value="">-- Select Exam Schedule --</option>
                {examOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Filter By Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={testingDate}
                  onChange={(e) => setTestingDate(e.target.value)}
                  disabled={!selectedExamName}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 transition"
                />
                {testingDate && (
                  <button
                    type="button"
                    onClick={() => setTestingDate('')}
                    className="rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-2 lg:pt-0">
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{selectedSchedules.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Courses</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{visibleDateGroups.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dates</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{totalSubjects}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Subjects</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2">
              <div className="text-base font-black text-gray-900">{totalStudents}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedExamName ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400 shadow-sm">
          <Search className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm font-semibold text-gray-600">Please select an exam name from the dropdown above.</p>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
          <Loader className="mr-2 animate-spin text-indigo-600" size={24} /> Loading exam schedules...
        </div>
      ) : selectedSchedules.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center text-sm font-semibold text-amber-700">
          No schedules found for this exam name.
        </div>
      ) : (
        <div className="space-y-8">
          {visibleDateGroups.map((dateGroup) => {
            const isToday = dateGroup.dateKey === getTodayKey();
            const branchGroups = getBranchGroupsForDate(dateGroup);

            return (
              <div key={dateGroup.dateKey} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition">
                {/* Date Header */}
                <div className="flex flex-col gap-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                        {formatDateLabel(dateGroup.dateKey)}
                        {isToday && (
                          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                            Today
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-indigo-200 font-medium">
                        {branchGroups.length} Branch(es) • {dateGroup.rows.length} Subject(s) • {dateGroup.studentMap.size} Student(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View All Date Students Button */}
                    <button
                      type="button"
                      onClick={() => openStudentModal(`Date: ${formatDateLabel(dateGroup.dateKey)}`, dateGroup.studentMap, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, dateGroup.scheduleMap)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/25 transition cursor-pointer"
                    >
                      <Users size={14} /> Student List & Attendance ({dateGroup.studentMap.size})
                    </button>
                  </div>
                </div>

                {/* Branch Cards under this Date */}
                <div className="p-4 md:p-6 space-y-6 bg-slate-50/40">
                  {branchGroups.map((bGroup) => {
                    const settingKey = `${dateGroup.dateKey}_${bGroup.branchName}`;
                    const current = branchSettings[settingKey] || {};
                    const isSavingThis = savingKey === settingKey;

                    return (
                      <div key={bGroup.branchName} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-indigo-200">
                        {/* Branch Title Bar */}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <Building2 className="text-indigo-600" size={18} />
                            <h3 className="text-base font-black text-gray-900">{bGroup.branchName}</h3>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                              {bGroup.studentMap.size} Student(s)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* View Branch Students Clickable Button */}
                            <button
                              type="button"
                              onClick={() => openStudentModal(`${bGroup.branchName}`, bGroup.studentMap, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, bGroup.scheduleMap)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                            >
                              <Users size={14} /> Student List & Attendance ({bGroup.studentMap.size})
                            </button>
                            <div className="flex items-center gap-1 text-xs font-bold text-gray-500 pl-2">
                              <BookOpenCheck size={14} className="text-gray-400" />
                              {bGroup.rows.length} Subjects
                            </div>
                          </div>
                        </div>

                        {/* Examiner Controls for this Branch */}
                        <div className="rounded-xl bg-slate-50/90 p-3.5 border border-slate-100 mb-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_1fr_auto] lg:items-end">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                Main Examiner (Primary Teacher)
                              </label>
                              <select
                                value={current.examiner || ''}
                                onChange={(e) => updateBranchSetting(settingKey, 'examiner', e.target.value)}
                                disabled={!isSuperAdmin}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-gray-100"
                              >
                                <option value="">-- Select Main Examiner --</option>
                                {getEmployeesForBranch(employees, bGroup.branchId, bGroup.branchName).map((emp) => (
                                  <option key={emp._id} value={emp._id}>
                                    {getEmployeeName(emp)} ({emp.branchId?.name || emp.branchName || 'Main'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                Alternate Examiner (Substitute)
                              </label>
                              <select
                                value={current.alternateExaminer || ''}
                                onChange={(e) => updateBranchSetting(settingKey, 'alternateExaminer', e.target.value)}
                                disabled={!isSuperAdmin}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-gray-100"
                              >
                                <option value="">-- Select Alternate (Optional) --</option>
                                {getEmployeesForBranch(employees, bGroup.branchId, bGroup.branchName)
                                  .filter((emp) => String(emp._id) !== String(current.examiner))
                                  .map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                      {getEmployeeName(emp)} ({emp.branchId?.name || emp.branchName || 'Main'})
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(current.conductPasswordEnabled)}
                                onChange={(e) => updateBranchSetting(settingKey, 'conductPasswordEnabled', e.target.checked)}
                                disabled={!isSuperAdmin}
                                className="h-3.5 w-3.5 text-indigo-600 rounded cursor-pointer"
                              />
                              <Lock size={13} className="text-gray-500" /> Password
                            </label>

                            <div>
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">Day Password</label>
                              <input
                                type="text"
                                value={current.conductPassword || ''}
                                onChange={(e) => updateBranchSetting(settingKey, 'conductPassword', e.target.value)}
                                disabled={!isSuperAdmin || !current.conductPasswordEnabled}
                                placeholder={current.conductPasswordEnabled ? 'Enter Password' : 'Password Disabled'}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-gray-100"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveBranchSettings(dateGroup, bGroup)}
                              disabled={!isSuperAdmin || isSavingThis}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                            >
                              {isSavingThis ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} Save Branch
                            </button>
                          </div>
                        </div>

                        {/* Subject Table */}
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50/80 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              <tr>
                                <th className="px-3 py-2 text-center w-10">#</th>
                                <th className="px-3 py-2">Course</th>
                                <th className="px-3 py-2">Subject</th>
                                <th className="px-3 py-2">Timing</th>
                                <th className="px-3 py-2 text-center">Students</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {bGroup.rows.map(({ schedule, row }, index) => (
                                <tr key={`${schedule._id}-${row._id || index}`} className="hover:bg-slate-50/80">
                                  <td className="px-3 py-2 text-center font-bold text-gray-400">{index + 1}</td>
                                  <td className="px-3 py-2 font-bold text-gray-900">{schedule.course?.name || 'Course'}</td>
                                  <td className="px-3 py-2 font-semibold text-gray-700">{getSubjectName(row)}</td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : row.startTime || row.endTime || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-indigo-600">
                                    {(schedule.attendees || []).filter((s) => (s.branchName || 'Main Branch') === bGroup.branchName).length}
                                  </td>
                                </tr>
                              ))}
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

      {/* Spacious Larger Student List & Attendance Modal */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-4 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Scheduled Students List & Attendance</h3>
                  <p className="text-xs text-indigo-200">
                    {modalTitle} • Exam Date: {modalDateLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="rounded-xl p-2 text-indigo-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Search by student name, reg no, course, or contact number..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition"
                  />
                </div>
                <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    Present: {Object.values(attendanceMap).filter(s => s === 'Present').length}
                  </span>
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl">
                    Absent: {Object.values(attendanceMap).filter(s => s === 'Absent').length}
                  </span>
                </div>
              </div>

              {/* Taller & Roomier Student Table */}
              <div className="rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Reg / Roll No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Contact No</th>
                      <th className="px-4 py-3 text-center w-48">Exam Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredModalStudents.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-gray-400 text-sm">
                          No scheduled students found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredModalStudents.map((student, index) => {
                        const sId = String(student._id);
                        const currentStatus = attendanceMap[sId] || 'Present';

                        return (
                          <tr key={sId || index} className="hover:bg-indigo-50/40 transition">
                            <td className="px-4 py-3 text-center font-bold text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-indigo-700 font-mono">
                              {student.regNo || student.enrollmentNo || '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {student.firstName || student.lastName
                                ? `${student.firstName || ''} ${student.lastName || ''}`
                                : student.studentName || 'Student'}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {student.courseName || student.course?.name || 'Course'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-semibold">
                              {student.branchName || 'Main Branch'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-medium">
                              <span className="inline-flex items-center gap-1.5">
                                <Phone size={13} className="text-gray-400" />
                                {student.mobileStudent || student.mobileParent || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(sId, 'Present')}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-emerald-700'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(sId, 'Absent')}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-rose-700'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-3.5 shrink-0">
              <div className="text-xs font-semibold text-gray-500">
                Default preset is <span className="font-bold text-emerald-700">Present</span>. Toggle to <span className="font-bold text-rose-600">Absent</span> for missing students.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-100 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition"
                >
                  {isSavingAttendance ? <RefreshCw className="animate-spin" size={14} /> : <CheckSquare size={15} />} Save Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSet;

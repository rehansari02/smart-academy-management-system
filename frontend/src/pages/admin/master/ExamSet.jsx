import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
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
  X,
  ChevronRight,
  Layers,
  RotateCcw,
  AlertCircle,
  Calendar,
  KeyRound
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

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
  : '-';

const parseTime12 = (val) => {
  if (!val) return { hour: '10', minute: '00', period: 'AM' };
  const str = String(val).trim();
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    let p = match12[3] ? match12[3].toUpperCase() : null;
    if (!p) {
      p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    } else {
      if (h === 0) h = 12;
      else if (h > 12) h = h % 12;
    }
    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      period: p
    };
  }
  return { hour: '10', minute: '00', period: 'AM' };
};

const TimeDropdownPicker = ({ label, value, onChange, required = true }) => {
  const { hour, minute, period } = parseTime12(value);

  const update = (newH, newM, newP) => {
    onChange(`${newH}:${newM} ${newP}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl px-1.5 h-9 shadow-xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500">
        <select
          value={hour}
          onChange={(e) => update(e.target.value, minute, period)}
          className="bg-transparent font-bold text-xs text-gray-800 text-center outline-none cursor-pointer py-1 flex-1"
        >
          {hours.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="font-black text-gray-400 text-xs">:</span>
        <select
          value={minute}
          onChange={(e) => update(hour, e.target.value, period)}
          className="bg-transparent font-bold text-xs text-gray-800 text-center outline-none cursor-pointer py-1 flex-1"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex rounded-lg bg-gray-100 p-0.5 shrink-0 border border-gray-200 ml-0.5">
          <button
            type="button"
            onClick={() => update(hour, minute, 'AM')}
            className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded transition cursor-pointer ${
              period === 'AM'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => update(hour, minute, 'PM')}
            className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded transition cursor-pointer ${
              period === 'PM'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
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
  const [searchParams] = useSearchParams();
  const { exams, examSchedules, employees, isLoading } = useSelector((state) => state.master);
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  const [selectedExamName, setSelectedExamName] = useState(searchParams.get('examName') || '');
  const [testingDate, setTestingDate] = useState(searchParams.get('examDate') || '');
  const [branchSettings, setBranchSettings] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [selectedBranchTabByDate, setSelectedBranchTabByDate] = useState({});

  // Student List & Attendance Modal States
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDateLabel, setModalDateLabel] = useState('');
  const [modalDateKey, setModalDateKey] = useState('');
  const [modalScheduleIds, setModalScheduleIds] = useState([]);
  const [modalSchedules, setModalSchedules] = useState([]);
  const [modalStudentList, setModalStudentList] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCourseTab, setModalCourseTab] = useState('all');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Reschedule / Re-Exam Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [lastRescheduledInfo, setLastRescheduledInfo] = useState(null);

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchExamSchedules());
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (!studentModalOpen || !selectedExamName) return undefined;
    const timer = setInterval(() => {
      dispatch(fetchExamSchedules({ examName: selectedExamName }));
    }, 10000);
    return () => clearInterval(timer);
  }, [dispatch, selectedExamName, studentModalOpen]);

  const [persistentExamOptions, setPersistentExamOptions] = useState([]);

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

  useEffect(() => {
    if (examOptions.length > 0) {
      setPersistentExamOptions((prev) => {
        const set = new Set([...prev, ...examOptions]);
        return Array.from(set);
      });
    }
  }, [examOptions]);

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

  // Group by Date -> Branch -> Course
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

  // Helper to extract Branch Groups for a specific date group with Course sub-groups
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

        // Verify teacher assignment
        const isAssignedToThisCourseAndBranch = isSuperAdmin || isBranchMain || isBranchAlt;

        if (!isAssignedToThisCourseAndBranch) {
          return;
        }

        const pEnabled = existingConfig ? Boolean(existingConfig.conductPasswordEnabled) : Boolean(schedule.conductPasswordEnabled);

        if (!branchMap.has(bName)) {
          branchMap.set(bName, {
            branchName: bName,
            branchId: bData.branchId,
            studentMap: new Map(),
            scheduleMap: new Map(),
            rows: [],
            courseGroupsMap: new Map(),
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

        // Course group under this branch
        const courseId = String(schedule.course?._id || schedule.course || 'no-course');
        const courseName = schedule.course?.name || 'Course';
        if (!bGroup.courseGroupsMap.has(courseId)) {
          bGroup.courseGroupsMap.set(courseId, {
            courseId,
            courseName,
            schedule,
            rows: [],
            students: []
          });
        }
        const cGroup = bGroup.courseGroupsMap.get(courseId);
        if (!cGroup.rows.some(r => r.row._id === row._id && r.schedule._id === schedule._id)) {
          cGroup.rows.push({ schedule, row, rowIndex });
        }
        bData.students.forEach((s) => {
          const sId = String(s._id || s.regNo);
          if (!cGroup.students.some(st => String(st._id || st.regNo) === sId)) {
            cGroup.students.push({
              ...s,
              courseName
            });
          }
        });
      });
    });

    return [...branchMap.values()].map(bg => ({
      ...bg,
      courses: [...bg.courseGroupsMap.values()].sort((a, b) => a.courseName.localeCompare(b.courseName))
    })).sort((a, b) => a.branchName.localeCompare(b.branchName));
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
    dispatch(fetchExamSchedules());
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

    // Keep unmarked students blocked until an examiner explicitly marks attendance.
    const initialAtt = {};
    list.forEach((st) => {
      const sId = String(st._id);
      let existingStatus = '';

      for (const sched of schedules) {
        const att = (sched.attendance || []).find(
          (a) => String(a.student?._id || a.student) === sId && (!a.examDate || a.examDate === dateKey)
        );
        if (att) {
          existingStatus = att.status || '';
          break;
        }
      }
      initialAtt[sId] = existingStatus;
    });

    setModalTitle(title);
    setModalDateLabel(dateLabel);
    setModalDateKey(dateKey);
    setModalScheduleIds(scheduleIds);
    setModalSchedules(schedules);
    setModalStudentList(list);
    setAttendanceMap(initialAtt);
    setModalSearchTerm('');
    setModalCourseTab('all');
    setStudentModalOpen(true);
  };

  const handleToggleAttendance = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleOpenReschedule = (student) => {
    const sId = String(student._id);
    const targetSched = (modalSchedules || []).find((s) => {
      const hasAttendee = (s.attendees || []).some(
        (a) => String(a.student?._id || a.student || a._id || a) === sId
      );
      const hasCourse = String(s.course?._id || s.course) === String(student.course?._id || student.course);
      return hasAttendee || hasCourse;
    }) || (modalSchedules && modalSchedules[0]) || (selectedSchedules || []).find((s) => {
      const hasAttendee = (s.attendees || []).some(
        (a) => String(a.student?._id || a.student || a._id || a) === sId
      );
      return hasAttendee;
    }) || (selectedSchedules && selectedSchedules[0]);

    if (!targetSched) {
      toast.error('Could not find active schedule for this student.');
      return;
    }

    const subjects = (targetSched.timeTable || []).map((t) => ({
      id: String(t.subject?._id || t.subject),
      name: getSubjectName(t),
      startTime: t.startTime || '10:00 AM',
      endTime: t.endTime || '11:00 AM'
    }));

    const defaultSub = subjects[0] || {};
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setRescheduleData({
      student,
      schedule: targetSched,
      subjects,
      selectedSubjectId: subjects.length === 1 ? subjects[0].id : '',
      newDate: tomorrowStr,
      startTime: defaultSub.startTime || '10:00 AM',
      endTime: defaultSub.endTime || '11:00 AM',
      conductPasswordEnabled: Boolean(targetSched.conductPasswordEnabled),
      conductPassword: targetSched.conductPasswordText || '',
      reason: 'Exam interrupted / retake scheduled'
    });
    // Close the previous attendance dialogue box so NO double/overlapping modal appears in background!
    setStudentModalOpen(false);
    setRescheduleModalOpen(true);
  };

  const handleCancelReschedule = () => {
    setRescheduleModalOpen(false);
    // Smoothly restore previous attendance dialogue box
    setStudentModalOpen(true);
  };

  const handleRescheduleSubjectSelect = (subjectId) => {
    if (!rescheduleData) return;
    const found = rescheduleData.subjects.find((s) => s.id === subjectId);
    setRescheduleData((prev) => ({
      ...prev,
      selectedSubjectId: subjectId,
      ...(found ? { startTime: found.startTime, endTime: found.endTime } : {})
    }));
  };

  const handleConfirmReschedule = async (e) => {
    if (e) e.preventDefault();
    if (!rescheduleData?.newDate) {
      toast.error('Please select a new exam date.');
      return;
    }
    if (!rescheduleData?.startTime || !rescheduleData?.endTime) {
      toast.error('Please specify start and end time.');
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/master/exam-schedule/reschedule-student`,
        {
          scheduleId: rescheduleData.schedule._id,
          studentId: rescheduleData.student._id,
          subjectId: rescheduleData.selectedSubjectId || undefined,
          newDate: rescheduleData.newDate,
          startTime: rescheduleData.startTime,
          endTime: rescheduleData.endTime,
          conductPasswordEnabled: rescheduleData.conductPasswordEnabled,
          conductPassword: rescheduleData.conductPassword,
          reason: rescheduleData.reason
        },
        { withCredentials: true }
      );

      const studentName = rescheduleData.student.firstName || rescheduleData.student.lastName
        ? `${rescheduleData.student.firstName || ''} ${rescheduleData.student.lastName || ''}`.trim()
        : rescheduleData.student.studentName || 'Student';
      const courseName = rescheduleData.student.courseName || rescheduleData.student.course?.name || 'Course';
      const formattedDate = formatDateLabel(rescheduleData.newDate);

      toast.success(res.data?.message || `Exam rescheduled to ${formattedDate}!`);

      // Store info to display helpful guide banner on screen
      setLastRescheduledInfo({
        studentName,
        courseName,
        newDate: rescheduleData.newDate,
        newDateFormatted: formattedDate
      });

      // Cleanly close both dialogs
      setRescheduleModalOpen(false);
      setStudentModalOpen(false);

      dispatch(fetchExamSchedules(selectedExamName ? { examName: selectedExamName } : undefined));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to reschedule exam');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!modalDateKey || modalScheduleIds.length === 0) {
      toast.error('Unable to save attendance: missing schedule information.');
      return;
    }

    try {
      setIsSavingAttendance(true);
      const records = Object.entries(attendanceMap)
        .filter(([, status]) => ['Present', 'Absent', 'Re-Exam'].includes(status))
        .map(([studentId, status]) => ({ studentId, status }));

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

  // Distinct courses for attendance modal filter tabs
  const modalCourses = useMemo(() => {
    const map = new Map();
    modalStudentList.forEach((s) => {
      const cName = s.courseName || s.course?.name || 'Course';
      if (!map.has(cName)) {
        map.set(cName, { name: cName, count: 0 });
      }
      map.get(cName).count += 1;
    });
    return [...map.values()];
  }, [modalStudentList]);

  const filteredModalStudents = useMemo(() => {
    let list = modalStudentList;

    if (modalCourseTab !== 'all') {
      list = list.filter((s) => (s.courseName || s.course?.name || '') === modalCourseTab);
    }

    if (!modalSearchTerm.trim()) return list;
    const term = modalSearchTerm.toLowerCase().trim();
    return list.filter((s) => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const reg = String(s.regNo || s.enrollmentNo || '').toLowerCase();
      const mob = String(s.mobileStudent || s.mobileParent || '').toLowerCase();
      const branch = String(s.branchName || '').toLowerCase();
      const course = String(s.courseName || '').toLowerCase();
      return name.includes(term) || reg.includes(term) || mob.includes(term) || branch.includes(term) || course.includes(term);
    });
  }, [modalStudentList, modalSearchTerm, modalCourseTab]);

  const getModalAttemptsForStudent = (studentId) => selectedSchedules.flatMap((schedule) => {
    if (!modalScheduleIds.includes(schedule._id)) return [];
    const subjectIdsForDate = new Set(
      (schedule.timeTable || [])
        .filter((row) => getDateKey(row.date) === modalDateKey)
        .map((row) => String(getSubjectId(row)))
    );
    return (schedule.attempts || []).filter((attempt) => (
      String(attempt.student?._id || attempt.student) === String(studentId)
      && subjectIdsForDate.has(String(attempt.subject?._id || attempt.subject))
    ));
  });

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
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-primary" size={28} />
            Exam Set & Branch Examiners
          </h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-medium">
            {isSuperAdmin
              ? 'Branch-wise and Course-wise grouped examination timetable, examiner allocation and student attendance.'
              : 'Showing your assigned branch and course examination schedules.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Metrics Card */}
      <div className="rounded-2xl border-t-4 border-primary bg-white p-5 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Select Exam</label>
              <select
                value={selectedExamName}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedExamName(val);
                  setTestingDate('');
                  if (val) {
                    dispatch(fetchExamSchedules({ examName: val }));
                  }
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-sm"
              >
                <option value="">-- Select Exam Schedule --</option>
                {(persistentExamOptions.length > 0 ? persistentExamOptions : examOptions).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Filter By Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={testingDate}
                  onChange={(e) => setTestingDate(e.target.value)}
                  disabled={!selectedExamName}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition shadow-sm"
                />
                {testingDate && (
                  <button
                    type="button"
                    onClick={() => setTestingDate('')}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-3 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 text-center pt-2 lg:pt-0">
            <div className="rounded-xl border bg-blue-50/60 px-3.5 py-2">
              <div className="text-lg font-black text-blue-700">{selectedSchedules.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Courses</div>
            </div>
            <div className="rounded-xl border bg-indigo-50/60 px-3.5 py-2">
              <div className="text-lg font-black text-indigo-700">{visibleDateGroups.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dates</div>
            </div>
            <div className="rounded-xl border bg-purple-50/60 px-3.5 py-2">
              <div className="text-lg font-black text-purple-700">{totalSubjects}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Subjects</div>
            </div>
            <div className="rounded-xl border bg-emerald-50/60 px-3.5 py-2">
              <div className="text-lg font-black text-emerald-700">{totalStudents}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedExamName ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400 shadow-sm">
          <Search className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-base font-bold text-gray-700">Please select an Exam from the dropdown above.</p>
          <p className="text-xs text-gray-400 mt-1">Branch and Course schedules will appear grouped here.</p>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm border">
          <Loader className="mr-2 animate-spin text-primary" size={24} /> Loading exam schedules...
        </div>
      ) : selectedSchedules.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-semibold text-amber-700">
          No schedules found for this exam name.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Re-Exam Rescheduled Guide Banner */}
          {lastRescheduledInfo && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/95 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-emerald-950">
                      Re-Exam Successfully Scheduled!
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900 border border-emerald-300">
                      Added to Timetable
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-semibold mt-0.5">
                    <b>{lastRescheduledInfo.studentName}</b> ({lastRescheduledInfo.courseName}) ka re-exam <b>{lastRescheduledInfo.newDateFormatted}</b> ke timetable me add ho gaya hai.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium mt-1">
                    📌 <b>Student List Kahan Milegi:</b> Niche <b>"{lastRescheduledInfo.newDateFormatted}"</b> wale Date Section me jayein aur <b>"All Students & Attendance"</b> par click karke student ko check karein.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`date-group-${lastRescheduledInfo.newDate}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-emerald-400');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-400'), 3000);
                    } else {
                      toast.info(`Date ${lastRescheduledInfo.newDateFormatted} par scroll karein.`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
                >
                  <CalendarDays size={14} /> View "{lastRescheduledInfo.newDateFormatted}"
                </button>
                <button
                  type="button"
                  onClick={() => setLastRescheduledInfo(null)}
                  className="rounded-xl border border-emerald-300 bg-white p-2 text-emerald-800 hover:bg-emerald-100/50 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {visibleDateGroups.map((dateGroup) => {
            const isToday = dateGroup.dateKey === getTodayKey();
            const branchGroups = getBranchGroupsForDate(dateGroup);
            const activeBranchTab = selectedBranchTabByDate[dateGroup.dateKey] || 'all';

            const filteredBranchGroups = activeBranchTab === 'all'
              ? branchGroups
              : branchGroups.filter(b => b.branchName === activeBranchTab);

            const hasReExams = dateGroup.rows.some(r => r.schedule?.isReExam || r.schedule?.scheduleType === 'reExam');

            return (
              <div key={dateGroup.dateKey} id={`date-group-${dateGroup.dateKey}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition">
                {/* Date Header Banner */}
                <div className="flex flex-col gap-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur shadow-sm">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 flex-wrap">
                        {formatDateLabel(dateGroup.dateKey)}
                        {isToday && (
                          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm animate-pulse">
                            Today
                          </span>
                        )}
                        {hasReExams && (
                          <span className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <RotateCcw size={10} /> Re-Exam Retake
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-blue-100 font-semibold mt-0.5">
                        {branchGroups.length} Branch(es) &bull; {dateGroup.rows.length} Total Papers &bull; {dateGroup.studentMap.size} Students Scheduled
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openStudentModal(`Date: ${formatDateLabel(dateGroup.dateKey)}`, dateGroup.studentMap, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, dateGroup.scheduleMap)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/30 transition cursor-pointer shadow-sm"
                    >
                      <Users size={15} /> All Students & Attendance ({dateGroup.studentMap.size})
                    </button>
                  </div>
                </div>

                {/* Branch Selection Tabs (if multiple branches) */}
                {branchGroups.length > 1 && (
                  <div className="flex items-center gap-1.5 px-6 py-3 bg-slate-100/70 border-b border-gray-200 overflow-x-auto">
                    <span className="text-[11px] font-bold uppercase text-gray-500 mr-1 flex items-center gap-1">
                      <Building2 size={13} /> Branches:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBranchTabByDate(prev => ({ ...prev, [dateGroup.dateKey]: 'all' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        activeBranchTab === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      All Branches ({branchGroups.length})
                    </button>
                    {branchGroups.map((b) => (
                      <button
                        key={b.branchName}
                        type="button"
                        onClick={() => setSelectedBranchTabByDate(prev => ({ ...prev, [dateGroup.dateKey]: b.branchName }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          activeBranchTab === b.branchName
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        <span>{b.branchName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          activeBranchTab === b.branchName ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {b.studentMap.size}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Branch Cards under this Date */}
                <div className="p-4 md:p-6 space-y-6 bg-slate-50/40">
                  {filteredBranchGroups.map((bGroup) => {
                    const settingKey = `${dateGroup.dateKey}_${bGroup.branchName}`;
                    const current = branchSettings[settingKey] || {};
                    const isSavingThis = savingKey === settingKey;

                    return (
                      <div key={bGroup.branchName} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
                        {/* Branch Title Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-gray-900">{bGroup.branchName}</h3>
                              <p className="text-xs text-gray-500 font-semibold">
                                {bGroup.courses.length} Course(s) &bull; {bGroup.rows.length} Papers
                              </p>
                            </div>
                            <span className="rounded-full bg-indigo-100 text-indigo-800 font-bold px-3 py-0.5 text-xs">
                              {bGroup.studentMap.size} Students
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openStudentModal(`${bGroup.branchName}`, bGroup.studentMap, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, bGroup.scheduleMap)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer shadow-xs"
                            >
                              <Users size={14} /> Branch Attendance ({bGroup.studentMap.size})
                            </button>
                          </div>
                        </div>

                        {/* Examiner Controls for this Branch */}
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-primary" /> Branch Examiner & Password Setup
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_1fr_auto] lg:items-end">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                Main Examiner (Primary Teacher)
                              </label>
                              <select
                                value={current.examiner || ''}
                                onChange={(e) => updateBranchSetting(settingKey, 'examiner', e.target.value)}
                                disabled={!isSuperAdmin}
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-100 shadow-xs"
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
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-100 shadow-xs"
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

                            <label className="flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-xs">
                              <input
                                type="checkbox"
                                checked={Boolean(current.conductPasswordEnabled)}
                                onChange={(e) => updateBranchSetting(settingKey, 'conductPasswordEnabled', e.target.checked)}
                                disabled={!isSuperAdmin}
                                className="h-3.5 w-3.5 text-primary rounded cursor-pointer"
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
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-100 shadow-xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveBranchSettings(dateGroup, bGroup)}
                              disabled={!isSuperAdmin || isSavingThis}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                            >
                              {isSavingThis ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} Save Settings
                            </button>
                          </div>
                        </div>

                        {/* Hierarchical Course-wise Groups */}
                        <div className="space-y-4">
                          <div className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={15} className="text-primary" /> Courses Scheduled in this Branch ({bGroup.courses.length})
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {bGroup.courses.map((cGroup) => (
                              <div key={cGroup.courseId} className="rounded-xl border border-blue-100 bg-white overflow-hidden shadow-xs">
                                {/* Course Header Box */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 px-4 py-3 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                                      <BookOpen size={16} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-black text-gray-900">{cGroup.courseName}</h4>
                                        {cGroup.rows.some(r => r.schedule?.isReExam || r.schedule?.scheduleType === 'reExam') && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                            <RotateCcw size={10} /> Re-Exam Schedule
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-500 font-semibold">
                                        {cGroup.rows.length} Subject Papers Scheduled
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {cGroup.students.length} Student(s)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openStudentModal(`${bGroup.branchName} &bull; ${cGroup.courseName}`, cGroup.students, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, cGroup.rows.map(r => r.schedule))}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition cursor-pointer shadow-xs"
                                    >
                                      <Users size={13} /> Course Attendance
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const schedules = cGroup.rows.map(r => r.schedule);
                                        setModalSchedules(schedules);
                                        if (cGroup.students.length === 1) {
                                          handleOpenReschedule(cGroup.students[0]);
                                        } else {
                                          openStudentModal(`${bGroup.branchName} &bull; ${cGroup.courseName}`, cGroup.students, formatDateLabel(dateGroup.dateKey), dateGroup.dateKey, schedules);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold transition cursor-pointer shadow-xs"
                                      title="Reschedule student exam for this course"
                                    >
                                      <RotateCcw size={12} /> Reschedule
                                    </button>
                                  </div>
                                </div>

                                {/* Course Subjects Table */}
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-100">
                                      <tr>
                                        <th className="px-4 py-2.5 text-center w-12">#</th>
                                        <th className="px-4 py-2.5">Subject / Paper Name</th>
                                        <th className="px-4 py-2.5">Exam Timing</th>
                                        <th className="px-4 py-2.5 text-center">Theory</th>
                                        <th className="px-4 py-2.5 text-center">Practical</th>
                                        <th className="px-4 py-2.5 text-center">Total Marks</th>
                                        <th className="px-4 py-2.5 text-center">Branch Students</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                      {cGroup.rows.map(({ schedule, row }, idx) => (
                                        <tr key={`${schedule._id}-${row._id || idx}`} className="hover:bg-blue-50/30 transition-colors">
                                          <td className="px-4 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                                          <td className="px-4 py-2.5 font-bold text-gray-900 text-xs">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span>{getSubjectName(row)}</span>
                                              {(schedule?.isReExam || schedule?.scheduleType === 'reExam') && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                  Re-Exam
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2.5 text-gray-600 font-medium">
                                            <span className="inline-flex items-center gap-1">
                                              <Clock size={12} className="text-gray-400" />
                                              {row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : row.startTime || row.endTime || '-'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-center text-gray-700 font-semibold">{row.theory || 0}</td>
                                          <td className="px-4 py-2.5 text-center text-gray-700 font-semibold">{row.practical || 0}</td>
                                          <td className="px-4 py-2.5 text-center font-bold text-blue-700">{row.total || 0}</td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700">
                                              {cGroup.students.length}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
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

      {/* Spacious Larger Student List & Attendance Modal with Course Tabs */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-6 py-4 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur shadow-sm">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Scheduled Students List & Attendance</h3>
                  <p className="text-xs text-blue-100 font-medium">
                    {modalTitle} &bull; Exam Date: {modalDateLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="rounded-xl p-2 text-blue-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Course filter tabs inside modal */}
              {modalCourses.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Courses:</span>
                  <button
                    type="button"
                    onClick={() => setModalCourseTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      modalCourseTab === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Courses ({modalStudentList.length})
                  </button>
                  {modalCourses.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setModalCourseTab(c.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        modalCourseTab === c.name
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        modalCourseTab === c.name ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Search by student name, reg no, course, or contact number..."
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-xs"
                  />
                </div>
                <div className="flex items-center gap-2.5 text-xs font-bold shrink-0 flex-wrap">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    Present: {Object.values(attendanceMap).filter(s => s === 'Present').length}
                  </span>
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl">
                    Absent: {Object.values(attendanceMap).filter(s => s === 'Absent').length}
                  </span>
                  <span className="bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-xl">
                    Re-Exam: {Object.values(attendanceMap).filter(s => s === 'Re-Exam').length}
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl">
                    Not Marked: {Object.values(attendanceMap).filter(s => !s).length}
                  </span>
                </div>
              </div>

              {/* Student Table */}
              <div className="rounded-xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3">Reg / Roll No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Contact No</th>
                      <th className="px-4 py-3">Exam Timings</th>
                      <th className="px-4 py-3 text-center min-w-[240px]">Exam Attendance</th>
                      <th className="px-4 py-3 text-center w-28 sticky right-0 bg-slate-100 shadow-xs z-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredModalStudents.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-12 text-center text-gray-400 text-sm">
                          No scheduled students found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredModalStudents.map((student, index) => {
                        const sId = String(student._id);
                        const currentStatus = attendanceMap[sId] || '';
                        const studentAttempts = getModalAttemptsForStudent(sId);

                        return (
                          <tr key={sId || index} className="hover:bg-blue-50/40 transition">
                            <td className="px-4 py-3 text-center font-bold text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-primary font-mono">
                              {student.regNo || student.enrollmentNo || '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {student.firstName || student.lastName
                                    ? `${student.firstName || ''} ${student.lastName || ''}`
                                    : student.studentName || 'Student'}
                                </span>
                                {(student.isReExam || currentStatus === 'Re-Exam' || modalSchedules.some(s => s.isReExam)) && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                    Re-Exam
                                  </span>
                                )}
                              </div>
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
                            <td className="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                              {studentAttempts.length > 0 ? studentAttempts.map((examAttempt) => (
                                <div key={examAttempt._id} className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-emerald-700">Start:</span> {formatDateTime(examAttempt.startedAt)}
                                    {examAttempt.isSubmitted ? (
                                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">Submitted</span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">Left / Interrupted</span>
                                    )}
                                  </div>
                                  <div><span className="font-bold text-blue-700">End:</span> {formatDateTime(examAttempt.expiresAt)}</div>
                                </div>
                              )) : <span className="text-gray-400">Not started</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex rounded-xl border border-gray-300 bg-gray-50 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(sId, 'Present')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
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
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-rose-700'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(sId, 'Re-Exam')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                                    currentStatus === 'Re-Exam'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-amber-700'
                                  }`}
                                >
                                  Re-Exam
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-xs z-10">
                              <button
                                type="button"
                                onClick={() => handleOpenReschedule(student)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-xs cursor-pointer whitespace-nowrap"
                                title="Reschedule / Retake Exam with new Date and Time"
                              >
                                <RotateCcw size={12} /> Reschedule
                              </button>
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
                Paper tab tak locked rahega jab tak student ko explicitly <span className="font-bold text-emerald-700">Present</span> mark karke attendance save nahi hoti. Agar student exam chhod ke chala gaya hai to <span className="font-bold text-amber-700">Reschedule</span> se new date/time set karein.
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

      {/* Reschedule / Re-Exam Modal */}
      {rescheduleModalOpen && rescheduleData && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
          <div className="fixed inset-0" onClick={() => !isSubmittingReschedule && handleCancelReschedule()} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 z-10 flex flex-col overflow-hidden my-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/70 px-5 py-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Reschedule Student Exam</h3>
                  <p className="text-[11px] font-medium text-gray-500">
                    Set a new exam date & time schedule for this student
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingReschedule && handleCancelReschedule()}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="flex flex-col overflow-hidden flex-1">
              <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
                {/* Student Info Card (Compact) */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-xs truncate">
                      {rescheduleData.student.firstName || rescheduleData.student.lastName
                        ? `${rescheduleData.student.firstName || ''} ${rescheduleData.student.lastName || ''}`.trim()
                        : rescheduleData.student.studentName || 'Student'}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      Course: <b className="text-gray-700">{rescheduleData.student.courseName || rescheduleData.student.course?.name || 'Course'}</b> &bull; Branch: <b className="text-gray-700">{rescheduleData.student.branchName || 'Main Branch'}</b>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-primary text-xs shrink-0 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {rescheduleData.student.regNo || rescheduleData.student.enrollmentNo || '-'}
                  </span>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Subject / Paper to Reschedule
                  </label>
                  <select
                    value={rescheduleData.selectedSubjectId}
                    onChange={(e) => handleRescheduleSubjectSelect(e.target.value)}
                    className="w-full h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">All Subjects in Exam</option>
                    {rescheduleData.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.startTime} - {sub.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                {/* New Exam Date & Timings in a clean responsive 3-column row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        Exam Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRescheduleData((prev) => ({ ...prev, newDate: new Date().toISOString().split('T')[0] }))}
                          className="text-[10px] font-extrabold text-amber-700 hover:underline cursor-pointer"
                        >
                          Today
                        </button>
                        <span className="text-gray-300 text-[10px]">&bull;</span>
                        <button
                          type="button"
                          onClick={() => {
                            const t = new Date();
                            t.setDate(t.getDate() + 1);
                            setRescheduleData((prev) => ({ ...prev, newDate: t.toISOString().split('T')[0] }));
                          }}
                          className="text-[10px] font-extrabold text-amber-700 hover:underline cursor-pointer"
                        >
                          Tomorrow
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleData.newDate}
                      onChange={(e) => setRescheduleData((prev) => ({ ...prev, newDate: e.target.value }))}
                      className="w-full h-9 rounded-xl border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
                    />
                  </div>

                  <TimeDropdownPicker
                    label="Start Time"
                    value={rescheduleData.startTime}
                    onChange={(val) => setRescheduleData((prev) => ({ ...prev, startTime: val }))}
                  />

                  <TimeDropdownPicker
                    label="End Time"
                    value={rescheduleData.endTime}
                    onChange={(val) => setRescheduleData((prev) => ({ ...prev, endTime: val }))}
                  />
                </div>

                {/* Password Option */}
                <div className="space-y-1.5 rounded-xl border border-gray-200 bg-slate-50 p-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={rescheduleData.conductPasswordEnabled}
                      onChange={(e) => setRescheduleData((prev) => ({ ...prev, conductPasswordEnabled: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded text-amber-600 cursor-pointer"
                    />
                    <span>Conduct Password Protection</span>
                  </label>
                  {rescheduleData.conductPasswordEnabled && (
                    <input
                      type="text"
                      placeholder="Enter password for exam..."
                      value={rescheduleData.conductPassword}
                      onChange={(e) => setRescheduleData((prev) => ({ ...prev, conductPassword: e.target.value }))}
                      className="w-full h-8 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-amber-500"
                    />
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Reason / Note
                  </label>
                  <input
                    type="text"
                    value={rescheduleData.reason}
                    onChange={(e) => setRescheduleData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Student had to leave / System issue"
                    className="w-full h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  disabled={isSubmittingReschedule}
                  onClick={() => handleCancelReschedule()}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-xs transition"
                >
                  {isSubmittingReschedule ? <RefreshCw className="animate-spin" size={13} /> : <RotateCcw size={13} />}
                  Confirm & Schedule Re-Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSet;

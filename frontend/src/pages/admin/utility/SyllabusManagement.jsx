import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, 
  Layers, 
  GraduationCap, 
  BookOpen, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  FileText, 
  RefreshCw,
  FolderKanban,
  Edit3,
  Plus,
  Trash2,
  X,
  Check,
  BookOpenCheck,
  Award,
  UserCheck,
  UserPlus,
  UserMinus,
  AlertCircle,
  ListTodo,
  Sparkles,
  CalendarDays,
  BookMarked,
  FolderCheck,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Save,
  PenLine,
  BarChart3,
  CheckCircle2,
  Circle,
  Eye,
  Printer,
  Play,
  Trophy
} from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import moment from 'moment';
import { getBranches } from '../../../features/master/branchSlice';
import { fetchBatches, fetchCourses } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import StudentDetailView from './StudentDetailView';
import logo from '../../../assets/logo2.png';

// Helper to shorten 24-char hex MongoDB ObjectID to a 16-char base64url string
const encodeId = (hexId) => {
  if (!hexId || hexId.length !== 24) return hexId || '';
  try {
    const bytes = [];
    for (let i = 0; i < 24; i += 2) {
      bytes.push(parseInt(hexId.substr(i, 2), 16));
    }
    const binString = String.fromCharCode(...bytes);
    return btoa(binString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    return hexId || '';
  }
};

// Helper to expand 16-char base64url string back to 24-char hex ObjectID
const decodeId = (b64Id) => {
  if (!b64Id) return b64Id || '';
  if (b64Id.length === 24 && /^[0-9a-fA-F]{24}$/.test(b64Id)) return b64Id;
  try {
    let base64 = b64Id.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binString = atob(base64);
    let hex = '';
    for (let i = 0; i < binString.length; i++) {
      const code = binString.charCodeAt(i);
      hex += code.toString(16).padStart(2, '0');
    }
    return hex;
  } catch (e) {
    return b64Id || '';
  }
};

const truncateText = (value = '', maxLength = 12) => {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const getProjectColumnKey = (project = {}) => (
  String(project.name || project.projectName || project._id || '').trim().toLowerCase()
);

const confirmActionDialog = async ({
  title = 'Are you sure?',
  text = '',
  confirmButtonText = 'Yes, delete it',
  icon = 'warning',
  confirmButtonColor = '#dc2626'
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor,
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true
  });

  return result.isConfirmed;
};

const isSunday = (date) => {
  return moment(date).day() === 0;
};

const isHoliday = (date, holidaysList, studentBranchId) => {
  const mDate = moment(date).startOf('day');
  return holidaysList.some(h => {
    if (h.isActive === false) return false;
    
    // Check if the holiday is branch-scoped.
    if (h.branch) {
      const hBranchId = typeof h.branch === 'object' ? h.branch?._id : h.branch;
      if (String(hBranchId) !== String(studentBranchId)) return false;
    }

    const start = moment(h.startDate).startOf('day');
    const end = moment(h.endDate).endOf('day');
    return mDate.isBetween(start, end, null, '[]');
  });
};

const isClosedDay = (date, holidaysList, studentBranchId) => {
  return isSunday(date) || isHoliday(date, holidaysList, studentBranchId);
};

const normalizeBatchName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const mapSyllabusStudent = (student) => ({
  _id: student._id,
  enrollmentNo: student.enrollmentNo || student.regNo || '',
  name: `${student.firstName || ''} ${student.middleName ? `${student.middleName} ` : ''}${student.lastName || ''}`.trim(),
  firstName: student.firstName,
  middleName: student.middleName,
  lastName: student.lastName,
  courseName: student.course ? student.course.name : '',
  batchName: student.batch || '',
  contactStudent: student.mobileStudent,
  contactParent: student.mobileParent,
  registrationDate: student.registrationDate,
  admissionDate: student.admissionDate,
  batchStartDate: student.batchStartDate,
  courseDuration: student.course?.duration,
  courseDurationType: student.course?.durationType,
});

const fetchSyllabusStudents = async ({ branchId, courseId, batchName }) => {
  const baseParams = {
    branchId: branchId || undefined,
    courseFilter: courseId || undefined,
    isActive: 'true',
    registrationPaidOrRegistered: 'true',
    pageSize: 3000
  };

  const fetchWithParams = async (params) => {
    const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/students`, {
      params,
      withCredentials: true
    });
    return data?.students || [];
  };

  const exactStudents = await fetchWithParams({
    ...baseParams,
    batch: batchName
  });

  if (exactStudents.length > 0 || !batchName) {
    return exactStudents.map(mapSyllabusStudent);
  }

  const normalizedSelectedBatch = normalizeBatchName(batchName);
  const fallbackStudents = await fetchWithParams(baseParams);
  return fallbackStudents
    .filter(student => normalizeBatchName(student.batch) === normalizedSelectedBatch)
    .map(mapSyllabusStudent);
};

const getStudentStartDate = (student) => {
  const date = moment(student?.registrationDate || student?.admissionDate || student?.batchStartDate);
  return date.isValid() ? date.startOf('day') : null;
};

const getCourseEndDate = (student) => {
  const duration = Number(student?.courseDuration || 0);
  const startDate = getStudentStartDate(student);
  if (!startDate) return null;
  if (!duration) return startDate;

  const durationType = String(student?.courseDurationType || 'Month').toLowerCase();
  if (durationType.startsWith('year')) return startDate.clone().add(duration, 'years');
  if (durationType.startsWith('day')) return startDate.clone().add(duration, 'days');
  return startDate.clone().add(duration, 'months');
};

const addTeachingDays = (startDate, teachingDays = 0, holidaysList = [], studentBranchId = null) => {
  if (!startDate) return null;
  const totalDays = Number(teachingDays || 0);
  if (!totalDays) return moment(startDate).startOf('day');

  let currentDate = moment(startDate).startOf('day');
  let countedDays = 0;

  while (countedDays < totalDays) {
    if (!isClosedDay(currentDate, holidaysList, studentBranchId)) {
      countedDays++;
    }
    if (countedDays < totalDays) {
      currentDate.add(1, 'day');
    }
  }

  return currentDate;
};

const getSubjectTargetEndDate = (student, summary, selectedSubject, holidaysList = [], studentBranchId = null) => {
  const startDate = summary?.firstSessionDate
    ? moment(summary.firstSessionDate)
    : getStudentStartDate(student);
  const daysToComplete = Number(summary?.daysToComplete || selectedSubject?.daysToComplete || 0);
  return addTeachingDays(startDate, daysToComplete, holidaysList, studentBranchId);
};

const getDaysRemainingText = (student, holidaysList = [], studentBranchId = null) => {
  const startDate = getStudentStartDate(student);
  const endDate = getCourseEndDate(student, holidaysList, studentBranchId);
  if (!startDate || !endDate) return { text: '-', colorClass: 'bg-slate-100 text-slate-500' };

  const today = moment().startOf('day');
  const start = startDate.clone();
  const end = endDate.clone();

  if (today.isAfter(end)) {
    return { text: 'Completed', colorClass: 'bg-rose-50 text-rose-700' };
  }

  const countFrom = today.isAfter(start) ? today : start;
  const remainingCount = end.diff(countFrom, 'days');

  if (today.isSame(end, 'day')) {
    return { text: 'Ends Today', colorClass: 'bg-amber-50 text-amber-700' };
  }
  return { text: `${remainingCount} calendar day(s) remaining`, colorClass: 'bg-blue-50 text-blue-700' };
};

const parseTimeToMinutes = (timeString) => {
  if (!timeString) return null;
  const time = timeString.toString().trim().toUpperCase();
  const match = time.match(/^(\d+):(\d+)(?:\s*(AM|PM))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
};

const getBatchStartMinutes = (batchItem) => {
  if (!batchItem) return null;
  return parseTimeToMinutes(batchItem.startTime);
};

const getBatchEndMinutes = (batchItem) => {
  if (!batchItem) return null;
  return parseTimeToMinutes(batchItem.endTime);
};

const getBatchSequenceNumber = (batchItem) => {
  if (!batchItem?.name) return null;
  const matches = String(batchItem.name).match(/\d+/g);
  if (!matches?.length) return null;
  const sequence = Number(matches[matches.length - 1]);
  return Number.isFinite(sequence) ? sequence : null;
};

const compareBatchOrder = (a, b) => {
  const aSequence = getBatchSequenceNumber(a);
  const bSequence = getBatchSequenceNumber(b);
  if (aSequence !== null && bSequence !== null && aSequence !== bSequence) {
    return aSequence - bSequence;
  }
  if (aSequence !== null && bSequence === null) return -1;
  if (aSequence === null && bSequence !== null) return 1;

  const aTime = getBatchStartMinutes(a) ?? 9999;
  const bTime = getBatchStartMinutes(b) ?? 9999;
  if (aTime !== bTime) return aTime - bTime;

  const aEndTime = getBatchEndMinutes(a) ?? 9999;
  const bEndTime = getBatchEndMinutes(b) ?? 9999;
  if (aEndTime !== bEndTime) return aEndTime - bEndTime;

  return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true });
};

const SyllabusManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const params = useParams();
  const isQuickStudentReportRoute = Boolean(params.reportStudentId);
  const reportBranchId = decodeId(params.reportBranchId);
  const reportBatchId = decodeId(params.reportBatchId);
  const reportCourseId = decodeId(params.reportCourseId);
  const reportSubjectId = decodeId(params.reportSubjectId);
  const reportStudentId = decodeId(params.reportStudentId);
  const isShortStudentReportRoute = isQuickStudentReportRoute && !params.reportBatchId;
  const branchId = decodeId(params.branchId);
  const batchId = decodeId(params.batchId);
  const courseId = decodeId(params.courseId);
  const subjectId = decodeId(params.subjectId);
  const studentId = decodeId(params.studentId);

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { branches, isLoading: branchesLoading } = useSelector((state) => state.branch);
  const { batches, courses, isLoading: masterLoading } = useSelector((state) => state.master);
  const { employees } = useSelector((state) => state.employees);

  // User Rights Permissions
  const { view, edit } = useUserRights('Syllabus Management');
  const { view: canManageTeachers } = useUserRights('Teacher Subject Management');

  const isSuperAdmin = !user || user.role === 'Super Admin' || user.type === 'Super Admin';
  const showEdit = isSuperAdmin || edit;
  const showTeacher = isSuperAdmin || canManageTeachers;

  // Teacher Subject Assignments (if logged-in user is not Super Admin)
  const [assignedCombos, setAssignedCombos] = useState([]);
  const [combosLoading, setCombosLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'Super Admin' && user.type !== 'Super Admin') {
      setCombosLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL}/master/teacher-subject/employee/me`, { withCredentials: true })
        .then(res => {
          setAssignedCombos(res.data?.assignments || []);
        })
        .catch(err => {
          console.error('Failed to load teacher assignments', err);
        })
        .finally(() => {
          setCombosLoading(false);
        });
    }
  }, [user]);

  // Assigned Teachers List for current batch/course (shown in the subject table columns)
  const [assignedTeachersList, setAssignedTeachersList] = useState([]);
  const [teachersListLoading, setTeachersListLoading] = useState(false);

  const fetchAssignedTeachersList = useCallback(async () => {
    if (!batchId || !courseId) {
      setAssignedTeachersList([]);
      return;
    }
    setTeachersListLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/master/teacher-subject/batch/${batchId}/course/${courseId}`, { withCredentials: true });
      setAssignedTeachersList(data || []);
    } catch (err) {
      console.error('Failed to load assigned teachers for subjects', err);
    } finally {
      setTeachersListLoading(false);
    }
  }, [batchId, courseId]);

  useEffect(() => {
    fetchAssignedTeachersList();
  }, [fetchAssignedTeachersList]);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Project list accordions (expanded subject IDs)
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // Chapter list accordions (expanded subject IDs)
  const [expandedChapters, setExpandedChapters] = useState({});

  // Editing subject modal state
  const [editingSubject, setEditingSubject] = useState(null);
  const [editDays, setEditDays] = useState(0);
  const [editPages, setEditPages] = useState(0);
  const [editProjects, setEditProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [editChapters, setEditChapters] = useState([]);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterStartPage, setNewChapterStartPage] = useState('');
  const [newChapterEndPage, setNewChapterEndPage] = useState('');
  const [selectedProjectChapterId, setSelectedProjectChapterId] = useState('');
  const [loadedSubjectId, setLoadedSubjectId] = useState(null);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingChapterName, setEditingChapterName] = useState('');
  const [editingChapterStartPage, setEditingChapterStartPage] = useState('');
  const [editingChapterEndPage, setEditingChapterEndPage] = useState('');
  const [editingProjectIndex, setEditingProjectIndex] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectChapterId, setEditingProjectChapterId] = useState('');
  const [newProjectNames, setNewProjectNames] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // â”€â”€ Teacher Management Modal state (per-subject, from subject list row) â”€â”€â”€â”€â”€
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherModalSubject, setTeacherModalSubject] = useState(null);
  const [assignedTeachers, setAssignedTeachers] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSaving, setTeacherSaving] = useState(false);

  // â”€â”€ STANDALONE Teacher Access Modal state (from header button) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [saOpen, setSaOpen] = useState(false);               // standalone modal open
  const [saTeacherId, setSaTeacherId] = useState('');        // selected teacher
  const [saBatchId, setSaBatchId] = useState('');            // selected batch
  const [saCourseId, setSaCourseId] = useState('');          // selected course
  const [saSubjectId, setSaSubjectId] = useState('');        // selected subject
  const [saAssignments, setSaAssignments] = useState([]);    // existing assignments shown
  const [saLoading, setSaLoading] = useState(false);
  const [saSaving, setSaSaving] = useState(false);

  // Batches available for standalone modal (all batches across branches)
  const [allBatches, setAllBatches] = useState([]);

  // Student list state (Level 5)
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearchQuery, setStudentsSearchQuery] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [quickFilters, setQuickFilters] = useState({
    branchId: user?.branchId || '',
    batchId: '',
    courseId: '',
    subjectId: '',
    studentSearch: ''
  });
  const [quickStudents, setQuickStudents] = useState([]);
  const [quickSummaries, setQuickSummaries] = useState({});
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickReportShown, setQuickReportShown] = useState(false);
  const [quickDetailStudentId, setQuickDetailStudentId] = useState(null);
  const [quickChapterStatuses, setQuickChapterStatuses] = useState({});
  const [quickChapterSelections, setQuickChapterSelections] = useState({});
  const [quickActionLoading, setQuickActionLoading] = useState(null);

  // â”€â”€ Syllabus Log state (Level 5 â€“ per student panel) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [expandedLogStudent, setExpandedLogStudent] = useState(null); // studentId whose log panel is open
  const [logsByStudent, setLogsByStudent] = useState({}); // { [studentId]: { logs, analytics, subject } }
  const [logLoadingFor, setLogLoadingFor] = useState(null); // studentId currently loading
  const [batchSummaries, setBatchSummaries] = useState({}); // { [studentId]: summary }

  // Add-log form state
  const [addLogFor, setAddLogFor] = useState(null); // studentId for whom form is open
  const [logFormDate, setLogFormDate] = useState('');
  const [logFormChapterId, setLogFormChapterId] = useState('');
  const [logFormProjectIds, setLogFormProjectIds] = useState([]);
  const [logFormNotes, setLogFormNotes] = useState('');
  const [logFormSaving, setLogFormSaving] = useState(false);

  // View progress modal state
  const [viewProgressStudent, setViewProgressStudent] = useState(null);

  // Completion modal for theory/project
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalData, setCompletionModalData] = useState(null); // { student, chapter, type: 'theory' | 'project', projectObj: null, startDate: null }
  const [completionStartDateInput, setCompletionStartDateInput] = useState('');
  const [completionEndDate, setCompletionEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionSaving, setCompletionSaving] = useState(false);

  // Detailed student progress view
  const [activeDetailStudent, setActiveDetailStudent] = useState(null);

  useEffect(() => {
    if (studentId) {
      setActiveDetailStudent(studentId);
    } else {
      setActiveDetailStudent(null);
    }
  }, [studentId]);

  useEffect(() => {
    if (user?.branchId && user?.role !== 'Super Admin' && user?.type !== 'Super Admin') {
      setQuickFilters(prev => ({ ...prev, branchId: user.branchId }));
    }
  }, [user]);

  const [actionDate, setActionDate] = useState(moment().format('YYYY-MM-DD'));
  const [actionNotes, setActionNotes] = useState('');

  // Edit-log form state
  const [editLogId, setEditLogId] = useState(null);
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogChapterId, setEditLogChapterId] = useState('');
  const [editLogProjectIds, setEditLogProjectIds] = useState([]);
  const [editLogNotes, setEditLogNotes] = useState('');
  const [editLogSaving, setEditLogSaving] = useState(false);

  // Determine current step based on route parameters
  const step = useMemo(() => {
    if (window.location.pathname.endsWith('/edit') || window.location.pathname.includes('/edit')) {
      return 6; // Edit Subject page, supports both full and short URLs
    }
    if (!branchId) return 1; // Level 1: Branch list
    if (!batchId) return 2;  // Level 2: Batch list
    if (!courseId) return 3; // Level 3: Course list
    if (!subjectId) return 4; // Level 4: Subject list
    return 5;                // Level 5: Student list for selected Subject
  }, [branchId, batchId, courseId, subjectId]);

  // Selected object lookups
  const selectedBranch = useMemo(() => {
    return branches.find(b => b._id === branchId) || null;
  }, [branches, branchId]);

  const selectedBatch = useMemo(() => {
    return batches.find(b => b._id === batchId) || null;
  }, [batches, batchId]);

  const selectedCourse = useMemo(() => {
    if (courseId) return courses.find(c => c._id === courseId) || null;
    if (subjectId) {
      return courses.find(c => (c.subjects || []).some(s => String(s.subject?._id) === String(subjectId))) || null;
    }
    return null;
  }, [courses, courseId, subjectId]);

  const selectedSubject = useMemo(() => {
    const sourceCourse = selectedCourse || courses.find(c => (c.subjects || []).some(s => String(s.subject?._id) === String(subjectId)));
    if (!sourceCourse) return null;
    const subObj = (sourceCourse.subjects || []).find(s => String(s.subject?._id) === String(subjectId));
    return subObj?.subject || null;
  }, [courses, selectedCourse, subjectId]);

  // Fetch branches, courses & employees on mount
  useEffect(() => {
    dispatch(getBranches());
    dispatch(fetchCourses());
    dispatch(fetchEmployees({ isActive: true }));
  }, [dispatch]);

  // Fetch ALL batches for standalone modal (no branch filter)
  useEffect(() => {
    const fetchAllBatches = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/master/batch`, {
          withCredentials: true
        });
        setAllBatches(Array.isArray(data) ? data : data.batches || []);
      } catch (e) {
        console.error('Failed to load batches for teacher modal', e);
      }
    };
    fetchAllBatches();
  }, []);

  // Fetch batches when branchId parameter changes
  useEffect(() => {
    if (branchId) {
      dispatch(fetchBatches({ branchId }));
    }
  }, [branchId, dispatch]);

  // Initialize edit fields when step is 6 (Edit Subject Page)
  useEffect(() => {
    if (step === 6 && selectedSubject) {
      if (loadedSubjectId !== selectedSubject._id) {
        setEditDays(selectedSubject.daysToComplete || 0);
        setEditPages(selectedSubject.totalPages || 0);
        
        // Normalize chapters to objects
        const normalizedChapters = (selectedSubject.chapters || []).map((c, idx) => {
          if (typeof c === 'string') {
            return { _id: `legacy_${idx}`, name: c, startPage: 0, endPage: 0 };
          }
          return c;
        });
        setEditChapters(normalizedChapters);
        
        // Normalize projects to objects
        const normalizedProjects = (selectedSubject.projects || []).map(p => {
          if (typeof p === 'string') {
            return { name: p, chapterId: null };
          }
          return p;
        });
        setEditProjects(normalizedProjects);

        setNewProjectName('');
        setNewChapterName('');
        
        // Find the highest end page among existing chapters to suggest the next start page
        let maxEndPage = 0;
        normalizedChapters.forEach(c => {
          if (Number(c.endPage) > maxEndPage) {
            maxEndPage = Number(c.endPage);
          }
        });
        setNewChapterStartPage(maxEndPage > 0 ? String(maxEndPage + 1) : '1');
        
        setNewChapterEndPage('');
        setSelectedProjectChapterId('');
        setLoadedSubjectId(selectedSubject._id);
      }
    } else if (step !== 6 && loadedSubjectId !== null) {
      setLoadedSubjectId(null);
    }
  }, [step, selectedSubject, loadedSubjectId]);

  // Fetch student list when step is 5 (Student list page)
  useEffect(() => {
    const fetchStudentsForActiveSubject = async () => {
      if (step === 5 && batchId && selectedBatch?.name) {
        setStudentsLoading(true);
        setStudentsSearchQuery('');
        setStudentsList([]);
        setExpandedLogStudent(null);
        setLogsByStudent({});
        setBatchSummaries({});
        try {
          const holidaysRes = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/attendance/manage`, {
            params: { limit: 1000 },
            withCredentials: true
          });
          const holidaysList = holidaysRes.data?.items || [];

          const mapped = await fetchSyllabusStudents({
            branchId,
            courseId,
            batchName: selectedBatch.name
          });

          setStudentsList(mapped);
          setHolidays(holidaysList);

          // Also fetch batch-level summaries for all students at once
          if (subjectId) {
            try {
              const sumRes = await axios.get(
                `${import.meta.env.VITE_API_URL}/syllabus-logs/subject/${subjectId}/batch/${batchId}`,
                { withCredentials: true }
              );
              const summaryMap = {};
              (sumRes.data?.summaries || []).forEach(s => {
                summaryMap[s.studentId] = s;
              });
              setBatchSummaries(summaryMap);
            } catch (e) {
              console.error('Failed to load batch summaries', e);
            }
          }
        } catch (error) {
          console.error('Failed to load students', error);
          toast.error('Failed to load students');
        } finally {
          setStudentsLoading(false);
        }
      }
    };
    fetchStudentsForActiveSubject();
  }, [step, batchId, courseId, branchId, selectedBatch?.name, subjectId]);

  // Fetch detailed logs for a specific student
  const fetchStudentLogs = useCallback(async (studentId) => {
    if (!subjectId) return;
    setLogLoadingFor(studentId);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/student/${studentId}/subject/${subjectId}`,
        { withCredentials: true }
      );
      setLogsByStudent(prev => ({ ...prev, [studentId]: data }));
      // Update batch summary for this student
      if (data.analytics) {
        setBatchSummaries(prev => ({
          ...prev,
          [studentId]: {
            ...data.analytics,
            studentId,
          }
        }));
      }
    } catch (e) {
      console.error('Failed to load student logs', e);
      toast.error('Failed to load logs');
    } finally {
      setLogLoadingFor(null);
    }
  }, [subjectId]);

  // Toggle log panel for a student
  const handleToggleLogPanel = useCallback((studentId) => {
    setAddLogFor(null);
    setEditLogId(null);
    if (expandedLogStudent === studentId) {
      setExpandedLogStudent(null);
    } else {
      setExpandedLogStudent(studentId);
      if (!logsByStudent[studentId]) {
        fetchStudentLogs(studentId);
      }
    }
  }, [expandedLogStudent, logsByStudent, fetchStudentLogs]);

  // Open progress modal for a student
  const handleOpenProgressModal = useCallback((student) => {
    setViewProgressStudent(student);
    if (student && !logsByStudent[student._id]) {
      fetchStudentLogs(student._id);
    }
  }, [logsByStudent, fetchStudentLogs]);

  // Open add-log form for a student
  const handleOpenAddLog = useCallback((studentId) => {
    setEditLogId(null);
    setAddLogFor(studentId);
    setLogFormDate(moment().format('YYYY-MM-DD'));
    setLogFormChapterId('');
    setLogFormProjectIds([]);
    setLogFormNotes('');
  }, []);

  // Submit new log
  const handleSubmitAddLog = useCallback(async (student) => {
    if (!logFormDate) { toast.error('Please select a session date.'); return; }
    if (!logFormChapterId) { toast.error('Please select the chapter covered.'); return; }
    setLogFormSaving(true);
    try {
      const chapterObj = (selectedSubject?.chapters || []).find(c => c._id === logFormChapterId || String(c._id) === logFormChapterId);
      const projectObjs = (selectedSubject?.projects || [])
        .filter(p => logFormProjectIds.includes(String(p._id)))
        .map(p => ({ projectId: p._id, projectName: p.name }));

      await axios.post(`${import.meta.env.VITE_API_URL}/syllabus-logs`, {
        studentId: student._id,
        subjectId,
        batchId,
        courseId,
        branchId,
        sessionDate: logFormDate,
        chapterId: logFormChapterId,
        chapterName: chapterObj?.name || '',
        projects: projectObjs,
        notes: logFormNotes,
      }, { withCredentials: true });

      toast.success('Session log added!');
      setAddLogFor(null);
      fetchStudentLogs(student._id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save log.');
    } finally {
      setLogFormSaving(false);
    }
  }, [logFormDate, logFormChapterId, logFormProjectIds, logFormNotes, selectedSubject, subjectId, batchId, courseId, branchId, fetchStudentLogs]);

  // Open edit-log form
  const handleOpenEditLog = useCallback((log) => {
    setAddLogFor(null);
    setEditLogId(log._id);
    setEditLogDate(moment(log.sessionDate).format('YYYY-MM-DD'));
    setEditLogChapterId(log.chapterId ? String(log.chapterId) : '');
    setEditLogProjectIds((log.projects || []).map(p => String(p.projectId)).filter(Boolean));
    setEditLogNotes(log.notes || '');
  }, []);

  // Submit edited log
  const handleSubmitEditLog = useCallback(async (studentId) => {
    if (!editLogDate) { toast.error('Please select a session date.'); return; }
    setEditLogSaving(true);
    try {
      const chapterObj = (selectedSubject?.chapters || []).find(c => String(c._id) === editLogChapterId);
      const projectObjs = (selectedSubject?.projects || [])
        .filter(p => editLogProjectIds.includes(String(p._id)))
        .map(p => ({ projectId: p._id, projectName: p.name }));

      await axios.put(`${import.meta.env.VITE_API_URL}/syllabus-logs/${editLogId}`, {
        sessionDate: editLogDate,
        chapterId: editLogChapterId || null,
        chapterName: chapterObj?.name || '',
        projects: projectObjs,
        notes: editLogNotes,
      }, { withCredentials: true });

      toast.success('Log updated!');
      setEditLogId(null);
      fetchStudentLogs(studentId);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update log.');
    } finally {
      setEditLogSaving(false);
    }
  }, [editLogDate, editLogChapterId, editLogProjectIds, editLogNotes, selectedSubject, editLogId, fetchStudentLogs]);

  // Delete log
  const handleDeleteLog = useCallback(async (logId, studentId) => {
    const confirmed = await confirmActionDialog({
      title: 'Delete log entry?',
      text: 'This student progress log will be removed.',
      confirmButtonText: 'Yes, delete log'
    });
    if (!confirmed) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/syllabus-logs/${logId}`, { withCredentials: true });
      toast.success('Log deleted.');
      fetchStudentLogs(studentId);
    } catch (e) {
      toast.error('Failed to delete log.');
    }
  }, [fetchStudentLogs]);

  // Toggle project in form
  const toggleProjectInForm = (pid, setter) => {
    setter(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  };

  const loading = branchesLoading || masterLoading || studentsLoading;

  // Permitted branch, batch, course, and subject ID sets for non-Super Admin users

  const allowedBranchIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(assignedCombos.map(a => a.batchId?.branchId?.toString()).filter(Boolean));
  }, [assignedCombos, isSuperAdmin]);

  const allowedBatchIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(assignedCombos.map(a => a.batchId?._id?.toString()).filter(Boolean));
  }, [assignedCombos, isSuperAdmin]);

  const allowedCourseIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(assignedCombos.map(a => a.courseId?._id?.toString()).filter(Boolean));
  }, [assignedCombos, isSuperAdmin]);

  const allowedSubjectIds = useMemo(() => {
    if (isSuperAdmin) return null;
    return new Set(assignedCombos.map(a => a.subjectId?._id?.toString()).filter(Boolean));
  }, [assignedCombos, isSuperAdmin]);

  // Filtered lists based on search query and teacher assignments
  const filteredBranches = useMemo(() => {
    if (step !== 1) return [];
    let list = branches;
    if (allowedBranchIds) {
      list = list.filter(b => allowedBranchIds.has(b._id.toString()));
    }
    return list
      .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [branches, searchQuery, step, allowedBranchIds]);

  const filteredBatches = useMemo(() => {
    if (step !== 2) return [];
    let list = batches;
    if (allowedBatchIds) {
      list = list.filter(b => allowedBatchIds.has(b._id.toString()));
    }
    return list
      .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [batches, searchQuery, step, allowedBatchIds]);

  const filteredCourses = useMemo(() => {
    if (step !== 3 || !selectedBatch) return [];
    
    // Only show courses that have at least 1 active enrolled student in this batch.
    // courseCounts is keyed by courseId and comes from real student data aggregated on the backend.
    const activeCourseIds = new Set(
      Object.keys(selectedBatch.courseCounts || {}).filter(
        cId => (selectedBatch.courseCounts[cId] || 0) > 0
      )
    );

    let list = courses.filter(c => activeCourseIds.has(c._id.toString()));
    if (allowedCourseIds) {
      list = list.filter(c => allowedCourseIds.has(c._id.toString()));
    }

    return list
      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [courses, selectedBatch, searchQuery, step, allowedCourseIds]);

  const filteredSubjects = useMemo(() => {
    if (step !== 4 || !selectedCourse) return [];
    let subList = selectedCourse.subjects || [];
    if (allowedSubjectIds) {
      subList = subList.filter(s => s.subject && allowedSubjectIds.has(s.subject._id.toString()));
    }
    return subList
      .filter(s => s.subject && s.subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [selectedCourse, searchQuery, step, allowedSubjectIds]);

  // Filter students based on search string. Course and batch are already filtered by the API.
  const filteredStudents = useMemo(() => {
    if (step !== 5) return [];
    let list = studentsList;

    if (studentsSearchQuery.trim()) {
      const q = studentsSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.enrollmentNo || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [studentsList, studentsSearchQuery, step]);

  const quickSelectedBranch = useMemo(() => (
    branches.find(b => String(b._id) === String(quickFilters.branchId)) || null
  ), [branches, quickFilters.branchId]);

  const quickBatchOptions = useMemo(() => {
    let list = allBatches;
    if (quickFilters.branchId) {
      list = list.filter(batch => String(batch.branchId?._id || batch.branchId || '') === String(quickFilters.branchId));
    }
    if (allowedBatchIds) {
      list = list.filter(batch => allowedBatchIds.has(String(batch._id)));
    }
    return [...list].sort(compareBatchOrder);
  }, [allBatches, quickFilters.branchId, allowedBatchIds]);

  const quickSelectedBatch = useMemo(() => (
    quickBatchOptions.find(b => String(b._id) === String(quickFilters.batchId)) || null
  ), [quickBatchOptions, quickFilters.batchId]);

  const quickCourseOptions = useMemo(() => {
    if (!quickSelectedBatch) return [];
    const activeCourseIds = new Set(
      Object.keys(quickSelectedBatch.courseCounts || {}).filter(
        cId => (quickSelectedBatch.courseCounts[cId] || 0) > 0
      )
    );
    let list = courses.filter(course => activeCourseIds.has(String(course._id)));
    if (allowedCourseIds) {
      list = list.filter(course => allowedCourseIds.has(String(course._id)));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [courses, quickSelectedBatch, allowedCourseIds]);

  const quickSelectedCourse = useMemo(() => (
    quickCourseOptions.find(c => String(c._id) === String(quickFilters.courseId)) || null
  ), [quickCourseOptions, quickFilters.courseId]);

  const quickSubjectOptions = useMemo(() => {
    if (!quickSelectedCourse) return [];
    let list = quickSelectedCourse.subjects || [];
    if (allowedSubjectIds) {
      list = list.filter(item => item.subject && allowedSubjectIds.has(String(item.subject._id)));
    }
    return list
      .filter(item => item.subject)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [quickSelectedCourse, allowedSubjectIds]);

  const quickSelectedSubject = useMemo(() => {
    const item = quickSubjectOptions.find(sub => String(sub.subject?._id) === String(quickFilters.subjectId));
    return item?.subject || null;
  }, [quickSubjectOptions, quickFilters.subjectId]);

  const quickFilteredStudents = useMemo(() => {
    let list = quickStudents;
    const q = quickFilters.studentSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(student =>
        student.name.toLowerCase().includes(q) ||
        (student.enrollmentNo || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [quickStudents, quickFilters.studentSearch]);

  const updateQuickFilter = (name, value) => {
    setQuickFilters(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'branchId') {
        next.batchId = '';
        next.courseId = '';
        next.subjectId = '';
      }
      if (name === 'batchId') {
        next.courseId = '';
        next.subjectId = '';
      }
      if (name === 'courseId') {
        next.subjectId = '';
      }
      return next;
    });
    setQuickReportShown(false);
    setQuickDetailStudentId(null);
    setQuickChapterStatuses({});
    setQuickChapterSelections({});
  };

  const handleQuickReset = () => {
    setQuickFilters({
      branchId: user?.role === 'Super Admin' || user?.type === 'Super Admin' ? '' : user?.branchId || '',
      batchId: '',
      courseId: '',
      subjectId: '',
      studentSearch: ''
    });
    setQuickStudents([]);
    setQuickSummaries({});
    setQuickReportShown(false);
    setQuickDetailStudentId(null);
    setQuickChapterStatuses({});
    setQuickChapterSelections({});
  };

  const getDefaultQuickChapterId = (statuses = []) => {
    const running = statuses.find(item => item.status === 'Running');
    if (running?.chapter?._id) return String(running.chapter._id);
    const firstOpen = statuses.find(item => !item.isLocked && item.status !== 'Completed');
    if (firstOpen?.chapter?._id) return String(firstOpen.chapter._id);
    return statuses[0]?.chapter?._id ? String(statuses[0].chapter._id) : '';
  };

  const fetchQuickChapterStatus = useCallback(async (studentIdToLoad) => {
    if (!studentIdToLoad || !quickFilters.subjectId) return [];
    const { data } = await axios.get(
      `${import.meta.env.VITE_API_URL}/syllabus-logs/student/${studentIdToLoad}/subject/${quickFilters.subjectId}/status`,
      { withCredentials: true }
    );
    const statuses = data?.chapterStatuses || [];
    setQuickChapterStatuses(prev => ({ ...prev, [studentIdToLoad]: statuses }));
    setQuickChapterSelections(prev => ({
      ...prev,
      [studentIdToLoad]: prev[studentIdToLoad] || getDefaultQuickChapterId(statuses)
    }));
    return statuses;
  }, [quickFilters.subjectId]);

  const loadQuickChapterStatuses = useCallback(async (students = []) => {
    if (!quickFilters.subjectId || students.length === 0) {
      setQuickChapterStatuses({});
      setQuickChapterSelections({});
      return;
    }

    const results = await Promise.allSettled(students.map(student => (
      axios.get(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/student/${student._id}/subject/${quickFilters.subjectId}/status`,
        { withCredentials: true }
      ).then(res => ({ studentId: student._id, statuses: res.data?.chapterStatuses || [] }))
    )));

    const statusMap = {};
    const selectionMap = {};
    results.forEach(result => {
      if (result.status !== 'fulfilled') return;
      statusMap[result.value.studentId] = result.value.statuses;
      selectionMap[result.value.studentId] = getDefaultQuickChapterId(result.value.statuses);
    });
    setQuickChapterStatuses(statusMap);
    setQuickChapterSelections(selectionMap);
  }, [quickFilters.subjectId]);

  const getQuickSelectedChapterStatus = (studentIdToRead) => {
    const statuses = quickChapterStatuses[studentIdToRead] || [];
    const selectedChapterId = quickChapterSelections[studentIdToRead] || getDefaultQuickChapterId(statuses);
    return statuses.find(item => String(item.chapter?._id) === String(selectedChapterId)) || statuses[0] || null;
  };

  const getQuickRunningChapterStatus = (studentIdToRead) => {
    const statuses = quickChapterStatuses[studentIdToRead] || [];
    return statuses.find(item => item.status === 'Running' && !item.isLocked) || null;
  };

  const getQuickActionBranchId = () => (
    quickFilters.branchId || quickSelectedBatch?.branchId?._id || quickSelectedBatch?.branchId || user?.branchId || ''
  );

  const handleQuickChapterSelect = (studentIdToSet, chapterIdToSet) => {
    setQuickChapterSelections(prev => ({ ...prev, [studentIdToSet]: chapterIdToSet }));
  };

  const handleQuickStartChapter = async (student, chapterStatus) => {
    const chapter = chapterStatus?.chapter;
    if (!student || !chapter || !quickSelectedSubject) return;
    const runningChapter = getQuickRunningChapterStatus(student._id);
    if (runningChapter?.chapter?._id && String(runningChapter.chapter._id) !== String(chapter._id)) {
      toast.warn(`${runningChapter.chapter?.name || 'Running chapter'} complete karo, fir next chapter start hoga.`);
      return;
    }
    const actionKey = `start_${student._id}_${chapter._id}`;
    setQuickActionLoading(actionKey);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/start`,
        {
          studentId: student._id,
          subjectId: quickFilters.subjectId,
          batchId: quickFilters.batchId,
          courseId: quickFilters.courseId,
          branchId: getQuickActionBranchId(),
          chapterId: chapter._id,
          chapterName: chapter.name || '',
          sessionDate: moment().format('YYYY-MM-DD'),
        },
        { withCredentials: true }
      );
      toast.success(`${student.name}: ${chapter.name} started.`);
      await fetchQuickChapterStatus(student._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chapter.');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleQuickTheoryComplete = async (student, chapterStatus) => {
    const chapter = chapterStatus?.chapter;
    if (!student || !chapter) return;
    const confirmed = await confirmActionDialog({
      title: 'Theory complete?',
      text: `${student.name} - ${chapter.name} theory complete mark karna hai?`,
      confirmButtonText: 'Yes, complete theory',
      icon: 'question',
      confirmButtonColor: '#059669'
    });
    if (!confirmed) return;
    const actionKey = `theory_${student._id}_${chapter._id}`;
    setQuickActionLoading(actionKey);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/complete`,
        {
          studentId: student._id,
          subjectId: quickFilters.subjectId,
          batchId: quickFilters.batchId,
          courseId: quickFilters.courseId,
          branchId: getQuickActionBranchId(),
          chapterId: chapter._id,
          chapterName: chapter.name || '',
        },
        { withCredentials: true }
      );
      toast.success(`${student.name}: theory completed.`);
      await fetchQuickChapterStatus(student._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete theory.');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleQuickProjectComplete = async (student, chapterStatus, project) => {
    const chapter = chapterStatus?.chapter;
    if (!student || !chapter || !project) return;
    const key = `${student._id}_${chapter._id}_${project._id}`;
    const actionKey = `project_${key}`;
    setQuickActionLoading(actionKey);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/project/complete`,
        {
          studentId: student._id,
          subjectId: quickFilters.subjectId,
          batchId: quickFilters.batchId,
          courseId: quickFilters.courseId,
          branchId: getQuickActionBranchId(),
          chapterId: chapter._id,
          chapterName: chapter.name || '',
          projects: [{ projectId: project._id, projectName: project.name }],
          sessionDate: new Date().toISOString(),
        },
        { withCredentials: true }
      );
      toast.success(`${student.name}: ${project.name} done.`);
      await fetchQuickChapterStatus(student._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete practical.');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleQuickAllProjectsComplete = async (student, chapterStatus) => {
    const pendingProjects = (chapterStatus?.projects || []).filter(project => !project.completed);
    if (!student || !chapterStatus?.chapter || pendingProjects.length === 0) return;
    const actionKey = `all_projects_${student._id}_${chapterStatus.chapter._id}`;
    setQuickActionLoading(actionKey);
    try {
      await Promise.all(pendingProjects.map(project => (
        axios.post(
          `${import.meta.env.VITE_API_URL}/syllabus-logs/project/complete`,
          {
            studentId: student._id,
            subjectId: quickFilters.subjectId,
            batchId: quickFilters.batchId,
            courseId: quickFilters.courseId,
            branchId: getQuickActionBranchId(),
            chapterId: chapterStatus.chapter._id,
            chapterName: chapterStatus.chapter.name || '',
            projects: [{ projectId: project._id, projectName: project.name }],
            sessionDate: moment().format('YYYY-MM-DD'),
          },
          { withCredentials: true }
        )
      )));
      toast.success(`${student.name}: all practical completed.`);
      await fetchQuickChapterStatus(student._id);
    } catch (error) {
      toast.error('Failed to complete all practical.');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleQuickFinalChapterComplete = async (student, chapterStatus) => {
    const chapter = chapterStatus?.chapter;
    if (!student || !chapter) return;
    const result = await Swal.fire({
      title: 'Chapter completed?',
      text: `${student.name} - ${chapter.name} ko final completed mark karna hai?`,
      icon: 'success',
      input: 'textarea',
      inputLabel: 'Reason / note',
      inputValue: 'Theory and practical completed from main report.',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, chapter completed',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      inputValidator: value => (!value?.trim() ? 'Please enter note.' : undefined),
      customClass: { container: 'z-[9999]' }
    });
    if (!result.isConfirmed) return;
    const actionKey = `final_${student._id}_${chapter._id}`;
    setQuickActionLoading(actionKey);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/chapter/final-complete`,
        {
          studentId: student._id,
          subjectId: quickFilters.subjectId,
          batchId: quickFilters.batchId,
          courseId: quickFilters.courseId,
          branchId: getQuickActionBranchId(),
          chapterId: chapter._id,
          chapterName: chapter.name || '',
          reason: result.value || '',
        },
        { withCredentials: true }
      );
      toast.success(`${student.name}: chapter completed.`);
      await fetchQuickChapterStatus(student._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete chapter.');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleQuickShowReport = async (detailStudentId = null) => {
    if (!quickFilters.batchId || !quickFilters.courseId || !quickFilters.subjectId || !quickSelectedBatch?.name) {
      toast.warn('Please select Batch, Course and Subject.');
      return;
    }

    setQuickLoading(true);
    setQuickDetailStudentId(detailStudentId);
    try {
      const holidaysRes = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/attendance/manage`, {
        params: { limit: 1000 },
        withCredentials: true
      });

      const mapped = await fetchSyllabusStudents({
        branchId: quickFilters.branchId,
        courseId: quickFilters.courseId,
        batchName: quickSelectedBatch.name
      });

      const summaryRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/syllabus-logs/subject/${quickFilters.subjectId}/batch/${quickFilters.batchId}`,
        { withCredentials: true }
      );
      const summaryMap = {};
      (summaryRes.data?.summaries || []).forEach(summary => {
        summaryMap[summary.studentId] = summary;
      });

      setHolidays(holidaysRes.data?.items || []);
      setQuickStudents(mapped);
      setQuickSummaries(summaryMap);
      setQuickReportShown(true);
      loadQuickChapterStatuses(mapped);
      if (detailStudentId && !mapped.some(student => String(student._id) === String(detailStudentId))) {
        toast.warn('Student not found in selected batch/course.');
      }
    } catch (error) {
      console.error('Failed to load syllabus report', error);
      toast.error('Failed to load syllabus report.');
    } finally {
      setQuickLoading(false);
    }
  };

  useEffect(() => {
    if (!isQuickStudentReportRoute || !reportBatchId || !reportSubjectId || !reportStudentId) return;
    navigate(`/master/syllabus-management/report/${encodeId(reportSubjectId)}/${encodeId(reportStudentId)}`, { replace: true });
  }, [isQuickStudentReportRoute, reportBatchId, reportSubjectId, reportStudentId, navigate]);

  useEffect(() => {
    if (!isShortStudentReportRoute) return;
    if (!reportSubjectId || !reportStudentId || allBatches.length === 0) return;

    let cancelled = false;
    const resolveShortReportRoute = async () => {
      try {
        const { data: student } = await axios.get(
          `${import.meta.env.VITE_API_URL}/students/${reportStudentId}`,
          { withCredentials: true }
        );
        if (cancelled) return;

        const studentCourseId = student?.course?._id || student?.course || '';
        const studentBranchId = student?.branchId?._id || student?.branchId || user?.branchId || '';
        const normalizedStudentBatch = normalizeBatchName(student?.batch || '');
        const matchedBatch = allBatches.find(batch => (
          normalizeBatchName(batch.name) === normalizedStudentBatch &&
          (!studentBranchId || String(batch.branchId?._id || batch.branchId || '') === String(studentBranchId))
        )) || allBatches.find(batch => normalizeBatchName(batch.name) === normalizedStudentBatch);

        if (!studentCourseId || !matchedBatch?._id) {
          toast.error('Could not open student report. Batch or course was not found for this student.');
          return;
        }

        setQuickFilters({
          branchId: studentBranchId || '',
          batchId: matchedBatch._id,
          courseId: studentCourseId,
          subjectId: reportSubjectId,
          studentSearch: ''
        });
        setQuickReportShown(false);
        setQuickStudents([]);
        setQuickSummaries({});
        setQuickDetailStudentId(reportStudentId);
      } catch (error) {
        console.error('Failed to resolve student report route', error);
        toast.error('Failed to open student report.');
      }
    };

    resolveShortReportRoute();
    return () => {
      cancelled = true;
    };
  }, [isShortStudentReportRoute, reportSubjectId, reportStudentId, allBatches, user?.branchId]);

  useEffect(() => {
    if (!isQuickStudentReportRoute) return;
    if (!reportSubjectId || !reportStudentId) return;

    if (!reportBatchId) {
      if (!quickFilters.batchId || !quickFilters.courseId || !quickFilters.subjectId || !quickSelectedBatch?.name) return;
      if (!quickReportShown || String(quickDetailStudentId || '') !== String(reportStudentId)) {
        handleQuickShowReport(reportStudentId);
      }
      return;
    }

    if (!reportCourseId) return;

    const routeFilters = {
      branchId: reportBranchId || '',
      batchId: reportBatchId,
      courseId: reportCourseId,
      subjectId: reportSubjectId,
      studentSearch: ''
    };

    const filtersMatch =
      String(quickFilters.branchId || '') === String(routeFilters.branchId || '') &&
      String(quickFilters.batchId || '') === String(routeFilters.batchId || '') &&
      String(quickFilters.courseId || '') === String(routeFilters.courseId || '') &&
      String(quickFilters.subjectId || '') === String(routeFilters.subjectId || '');

    if (!filtersMatch) {
      setQuickFilters(routeFilters);
      setQuickReportShown(false);
      setQuickStudents([]);
      setQuickSummaries({});
      setQuickDetailStudentId(reportStudentId);
      return;
    }

    if (!quickSelectedBatch?.name) return;

    if (!quickReportShown || String(quickDetailStudentId || '') !== String(reportStudentId)) {
      handleQuickShowReport(reportStudentId);
    }
  }, [
    isQuickStudentReportRoute,
    isShortStudentReportRoute,
    reportBranchId,
    reportBatchId,
    reportCourseId,
    reportSubjectId,
    reportStudentId,
    quickFilters.branchId,
    quickFilters.batchId,
    quickFilters.courseId,
    quickFilters.subjectId,
    quickSelectedBatch?.name,
    quickReportShown,
    quickDetailStudentId
  ]);

  const handleQuickEditSubjectSetup = () => {
    if (!quickFilters.subjectId) {
      toast.warn('Please select Subject first.');
      return;
    }

    navigate(`/master/syllabus-management/${encodeId(quickFilters.subjectId)}/edit`);
  };

  const handleQuickStudentReportClick = (studentId) => {
    if (!quickFilters.subjectId || !studentId) {
      toast.warn('Please select Subject first.');
      return;
    }

    navigate(`/master/syllabus-management/report/${encodeId(quickFilters.subjectId)}/${encodeId(studentId)}`);
  };

  const progressLogData = useMemo(() => {
    return viewProgressStudent ? logsByStudent[viewProgressStudent._id] : null;
  }, [viewProgressStudent, logsByStudent]);

  const isModalLoading = logLoadingFor && viewProgressStudent && logLoadingFor === viewProgressStudent._id;
  const completedChIds = useMemo(() => {
    return progressLogData?.analytics?.completedChapterIds || [];
  }, [progressLogData]);

  const completedProjIds = useMemo(() => {
    return progressLogData?.analytics?.completedProjectIds || [];
  }, [progressLogData]);

  const subjectChapters = selectedSubject?.chapters || [];
  const subjectProjects = selectedSubject?.projects || [];
  const chaptersLogged = progressLogData?.analytics?.chaptersLogged || 0;
  const projectsLogged = progressLogData?.analytics?.projectsLogged || 0;

  // Handle drill-down clicks (navigating via URL parameters)
  const handleBranchClick = (branch) => {
    setSearchQuery('');
    navigate(`/master/syllabus-management/${encodeId(branch._id)}`);
  };

  const handleBatchClick = (batch) => {
    setSearchQuery('');
    navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batch._id)}`);
  };

  const handleCourseClick = (course) => {
    setSearchQuery('');
    navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(course._id)}`);
  };

  const handleStudentsPageClick = (sub) => {
    setSearchQuery('');
    navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(sub.subject._id)}/students`);
  };

  const handleEditPageClick = (sub) => {
    setSearchQuery('');
    navigate(`/master/syllabus-management/${encodeId(sub.subject._id)}/edit`);
  };

  const handleViewStudentLog = (studentId) => {
    setActiveDetailStudent(studentId);
    navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(subjectId)}/students/${encodeId(studentId)}`);
  };

  // Back button navigation using Router
  const handleBack = () => {
    setSearchQuery('');
    if (step === 6) {
      if (branchId && batchId && courseId) {
        navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
      } else {
        navigate('/master/syllabus-management');
      }
    } else if (step === 5 && studentId) {
      // If in student detail view, go back to students list
      navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(subjectId)}/students`);
    } else if (step === 5) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
    } else if (step === 4) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}`);
    } else if (step === 3) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}`);
    } else if (step === 2) {
      navigate('/master/syllabus-management');
    } else {
      navigate('/home');
    }
  };

  // Breadcrumbs jump helper
  const navigateToStep = (targetStep) => {
    setSearchQuery('');
    if (targetStep === 1) {
      navigate('/master/syllabus-management');
    } else if (targetStep === 2) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}`);
    } else if (targetStep === 3) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}`);
    } else if (targetStep === 4) {
      navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
    }
  };

  // Toggle projects accordion view
  const toggleSubjectExpanded = (subId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  // Toggle chapters accordion view
  const toggleChaptersExpanded = (subId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  // Open Edit Subject modal
  const handleEditSubjectClick = (sub) => {
    setEditingSubject(sub.subject);
    setEditDays(sub.subject.daysToComplete || 0);
    setEditPages(sub.subject.totalPages || 0);
    setEditProjects(sub.subject.projects || []);
    setNewProjectName('');
    setEditChapters(sub.subject.chapters || []);
    setNewChapterName('');
  };

  // Auto-save updated Subject details to database
  const autoSaveSubjectDetails = async (updatedChapters, updatedProjects, days = editDays, pages = editPages) => {
    const subjectToSave = step === 6 ? selectedSubject : editingSubject;
    if (!subjectToSave) return;
    try {
      const payload = {
        daysToComplete: Number(days) || 0,
        totalPages: Number(pages) || 0,
        projectsCount: updatedProjects.length,
        projects: updatedProjects,
        chaptersCount: updatedChapters.length,
        chapters: updatedChapters
      };

      await axios.put(`${import.meta.env.VITE_API_URL}/master/subject/${subjectToSave._id}`, payload, {
        withCredentials: true
      });

      // Reload courses to update state
      dispatch(fetchCourses());
    } catch (error) {
      console.error('Auto-save failed', error);
    }
  };

  // Add project to subject edit list
  const handleAddProject = () => {
    if (newProjectName.trim() && selectedProjectChapterId) {
      const nextProjects = [...editProjects, {
        name: newProjectName.trim(),
        chapterId: selectedProjectChapterId
      }];
      setEditProjects(nextProjects);
      setNewProjectName('');
      autoSaveSubjectDetails(editChapters, nextProjects);
    }
  };

  // Delete project from subject edit list
  const handleRemoveProject = async (index) => {
    const project = editProjects[index];
    const projectName = project?.name || project || 'this project';
    const confirmed = await confirmActionDialog({
      title: 'Delete practical project?',
      text: `"${projectName}" will be removed from this chapter.`,
      confirmButtonText: 'Yes, delete project'
    });
    if (!confirmed) return;

    const nextProjects = editProjects.filter((_, idx) => idx !== index);
    setEditProjects(nextProjects);
    autoSaveSubjectDetails(editChapters, nextProjects);
  };

  // Add chapter to subject edit list
  const handleAddChapter = () => {
    if (newChapterName.trim()) {
      const start = Number(newChapterStartPage) || 0;
      const end = Number(newChapterEndPage) || 0;

      // Validation 1: start and end page must be greater than 0
      if (start <= 0 || end <= 0) {
        toast.error('Start page and End page must be greater than 0');
        return;
      }

      // Validation 2: end page must be >= start page
      if (end < start) {
        toast.error('End page cannot be less than Start page');
        return;
      }

      // Validation 3: Check for overlaps with existing chapters
      for (const chap of editChapters) {
        const existingStart = Number(chap.startPage) || 0;
        const existingEnd = Number(chap.endPage) || 0;
        if (start <= existingEnd && end >= existingStart) {
          toast.error(`Page range overlaps with existing chapter: "${chap.name || chap}" (Pages: ${existingStart} - ${existingEnd})`);
          return;
        }
      }

      // Generate a valid 24-character hex string for MongoDB ObjectId
      const chars = '0123456789abcdef';
      let uniqueId = '';
      for (let i = 0; i < 24; i++) {
        uniqueId += chars[Math.floor(Math.random() * 16)];
      }
      const nextChapters = [...editChapters, {
        _id: uniqueId,
        name: newChapterName.trim(),
        startPage: start,
        endPage: end
      }];
      setEditChapters(nextChapters);
      setNewChapterName('');
      setNewChapterStartPage(String(end + 1));
      setNewChapterEndPage('');
      autoSaveSubjectDetails(nextChapters, editProjects);
    }
  };

  // Delete chapter from subject edit list and remove associated projects
  const handleRemoveChapter = async (index) => {
    const chapterToRemove = editChapters[index];
    const chapterName = chapterToRemove?.name || chapterToRemove || 'this chapter';
    const chapterIdToRemove = chapterToRemove?._id;
    const linkedProjectsCount = chapterIdToRemove
      ? editProjects.filter(p => String(p.chapterId) === String(chapterIdToRemove)).length
      : 0;
    const confirmed = await confirmActionDialog({
      title: 'Delete chapter?',
      text: linkedProjectsCount > 0
        ? `This will delete "${chapterName}" and ${linkedProjectsCount} practical project(s).`
        : `This will delete "${chapterName}".`,
      confirmButtonText: 'Yes, delete chapter'
    });
    if (!confirmed) return;

    const nextChapters = editChapters.filter((_, idx) => idx !== index);
    setEditChapters(nextChapters);
    
    let nextProjects = editProjects;
    if (chapterToRemove?._id) {
      nextProjects = editProjects.filter(p => String(p.chapterId) !== String(chapterToRemove._id));
      setEditProjects(nextProjects);
    }

    // Auto-suggest next start page based on remaining chapters
    let maxEndPage = 0;
    nextChapters.forEach(c => {
      if (Number(c.endPage) > maxEndPage) {
        maxEndPage = Number(c.endPage);
      }
    });
    setNewChapterStartPage(maxEndPage > 0 ? String(maxEndPage + 1) : '1');

    autoSaveSubjectDetails(nextChapters, nextProjects);
  };

  // Start inline editing of a chapter
  const handleStartEditChapter = (chap) => {
    setEditingChapterId(chap._id);
    setEditingChapterName(chap.name || chap);
    setEditingChapterStartPage(String(chap.startPage || 0));
    setEditingChapterEndPage(String(chap.endPage || 0));
  };

  // Save inline editing of a chapter
  const handleSaveEditChapter = () => {
    if (editingChapterName.trim() && editingChapterId) {
      const start = Number(editingChapterStartPage) || 0;
      const end = Number(editingChapterEndPage) || 0;

      // Validation 1: start and end page must be greater than 0
      if (start <= 0 || end <= 0) {
        toast.error('Start page and End page must be greater than 0');
        return;
      }

      // Validation 2: end page must be >= start page
      if (end < start) {
        toast.error('End page cannot be less than Start page');
        return;
      }

      // Validation 3: Check for overlaps with other chapters
      for (const chap of editChapters) {
        if (chap._id === editingChapterId) continue; // Skip self
        const existingStart = Number(chap.startPage) || 0;
        const existingEnd = Number(chap.endPage) || 0;
        if (start <= existingEnd && end >= existingStart) {
          toast.error(`Page range overlaps with existing chapter: "${chap.name || chap}" (Pages: ${existingStart} - ${existingEnd})`);
          return;
        }
      }

      const nextChapters = editChapters.map(chap => {
        if (chap._id === editingChapterId) {
          return {
            ...chap,
            name: editingChapterName.trim(),
            startPage: start,
            endPage: end
          };
        }
        return chap;
      });

      setEditChapters(nextChapters);
      setEditingChapterId(null);
      setEditingChapterName('');
      setEditingChapterStartPage('');
      setEditingChapterEndPage('');

      autoSaveSubjectDetails(nextChapters, editProjects);
    }
  };

  // Cancel inline editing of a chapter
  const handleCancelEditChapter = () => {
    setEditingChapterId(null);
    setEditingChapterName('');
    setEditingChapterStartPage('');
    setEditingChapterEndPage('');
  };

  // Start inline editing of a project
  const handleStartEditProject = (proj, index) => {
    setEditingProjectIndex(index);
    setEditingProjectName(proj.name || proj);
    setEditingProjectChapterId(proj.chapterId || '');
  };

  // Save inline editing of a project
  const handleSaveEditProject = () => {
    if (editingProjectName.trim() && editingProjectIndex !== null && editingProjectChapterId) {
      const nextProjects = editProjects.map((proj, idx) => {
        if (idx === editingProjectIndex) {
          return {
            ...proj,
            name: editingProjectName.trim(),
            chapterId: editingProjectChapterId
          };
        }
        return proj;
      });

      setEditProjects(nextProjects);
      setEditingProjectIndex(null);
      setEditingProjectName('');
      setEditingProjectChapterId('');

      autoSaveSubjectDetails(editChapters, nextProjects);
    }
  };

  // Cancel inline editing of a project
  const handleCancelEditProject = () => {
    setEditingProjectIndex(null);
    setEditingProjectName('');
    setEditingProjectChapterId('');
  };

  // Add project to specific chapter card directly
  const handleAddProjectForChapter = (chapterId) => {
    const text = newProjectNames[chapterId] || '';
    if (text.trim() && chapterId) {
      const nextProjects = [...editProjects, {
        name: text.trim(),
        chapterId: chapterId
      }];
      setEditProjects(nextProjects);
      setNewProjectNames(prev => ({
        ...prev,
        [chapterId]: ''
      }));
      autoSaveSubjectDetails(editChapters, nextProjects);
    }
  };

  // Save updated Subject details to database
  const handleSaveSubjectDetails = async () => {
    // For step 6 (edit page), use selectedSubject; otherwise use editingSubject (legacy modal)
    const subjectToSave = step === 6 ? selectedSubject : editingSubject;
    if (!subjectToSave) return;
    setSaveLoading(true);
    try {
      const payload = {
        daysToComplete: Number(editDays) || 0,
        totalPages: Number(editPages) || 0,
        projectsCount: editProjects.length,
        projects: editProjects,
        chaptersCount: editChapters.length,
        chapters: editChapters
      };

      await axios.put(`${import.meta.env.VITE_API_URL}/master/subject/${subjectToSave._id}`, payload, {
        withCredentials: true
      });

      toast.success('Subject details saved successfully');
      // Reload courses to update state
      dispatch(fetchCourses());

      if (step === 6) {
        // Navigate back to the subject list (Level 4)
        if (branchId && batchId && courseId) {
          navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
        } else {
          navigate('/master/syllabus-management');
        }
      } else {
        setEditingSubject(null);
      }
    } catch (error) {
      console.error('Failed to update subject', error);
      toast.error(error.response?.data?.message || 'Failed to update subject');
    } finally {
      setSaveLoading(false);
    }
  };

  // â”€â”€ Active teachers: filter employees who are Teachers / Faculty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const activeTeachers = useMemo(() => {
    return employees.filter(
      e => e.isActive && !e.isDeleted &&
      (e.type === 'Teacher' || e.type === 'Faculty' ||
       (e.role && (e.role.toLowerCase().includes('teacher') || e.role.toLowerCase().includes('faculty'))))
    );
  }, [employees]);

  // â”€â”€ Open the Teacher Management modal for a subject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleOpenTeacherModal = useCallback(async (sub) => {
    const subjectObj = sub.subject;
    if (!subjectObj) return;
    setTeacherModalSubject(subjectObj);
    setSelectedTeacherId('');
    setAssignedTeachers([]);
    setTeacherModalOpen(true);
    setTeacherLoading(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/subject/${subjectObj._id}`,
        { withCredentials: true }
      );
      setAssignedTeachers(data || []);
    } catch (err) {
      toast.error('Could not load teacher assignments.');
    } finally {
      setTeacherLoading(false);
    }
  }, []);

  // â”€â”€ Assign selected teacher to this subject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) { toast.warn('Please select a teacher first.'); return; }
    if (!teacherModalSubject || !batchId || !courseId) {
      toast.error('Missing context (batch/course/subject).');
      return;
    }
    setTeacherSaving(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/assign`,
        { employeeId: selectedTeacherId, batchId, courseId, subjectId: teacherModalSubject._id },
        { withCredentials: true }
      );
      toast.success('Teacher assigned successfully!');
      // Refresh list
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/subject/${teacherModalSubject._id}`,
        { withCredentials: true }
      );
      setAssignedTeachers(data || []);
      setSelectedTeacherId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign teacher.');
    } finally {
      setTeacherSaving(false);
    }
  };

  // â”€â”€ Remove a teacher's assignment from this subject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRemoveTeacherAssignment = async (teacherAssignment) => {
    const confirmed = await confirmActionDialog({
      title: 'Remove teacher?',
      text: `${teacherAssignment.employeeName} will be removed from this subject.`,
      confirmButtonText: 'Yes, remove teacher'
    });
    if (!confirmed) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/remove`,
        {
          data: {
            employeeId: teacherAssignment.employeeId,
            batchId,
            courseId,
            subjectId: teacherModalSubject._id
          },
          withCredentials: true
        }
      );
      toast.success('Assignment removed.');
      setAssignedTeachers(prev => prev.filter(t => String(t.employeeId) !== String(teacherAssignment.employeeId)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove assignment.');
    }
  };

  // â”€â”€ Standalone modal: courses filtered by selected batch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saFilteredCourses = useMemo(() => {
    if (!saBatchId) return [];
    const batch = allBatches.find(b => b._id === saBatchId);
    if (!batch) return [];
    const activeCourseIds = new Set(
      Object.keys(batch.courseCounts || {}).filter(cId => (batch.courseCounts[cId] || 0) > 0)
    );
    return courses.filter(c => activeCourseIds.has(c._id.toString()));
  }, [saBatchId, allBatches, courses]);

  // â”€â”€ Standalone modal: subjects filtered by selected course â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saFilteredSubjects = useMemo(() => {
    if (!saCourseId) return [];
    const course = courses.find(c => c._id === saCourseId);
    if (!course) return [];
    return (course.subjects || []).filter(s => s.subject).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [saCourseId, courses]);

  // â”€â”€ Standalone modal: load existing assignments when subject changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!saSubjectId) { setSaAssignments([]); return; }
    setSaLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/master/teacher-subject/subject/${saSubjectId}`, { withCredentials: true })
      .then(res => setSaAssignments(res.data || []))
      .catch(() => toast.error('Could not load assignments.'))
      .finally(() => setSaLoading(false));
  }, [saSubjectId]);

  // â”€â”€ Standalone modal: assign teacher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaAssign = async () => {
    if (!saTeacherId || !saBatchId || !saCourseId || !saSubjectId) {
      toast.warn('Please select Teacher, Batch, Course and Subject.');
      return;
    }
    setSaSaving(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/assign`,
        { employeeId: saTeacherId, batchId: saBatchId, courseId: saCourseId, subjectId: saSubjectId },
        { withCredentials: true }
      );
      toast.success('Teacher assigned successfully!');
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/subject/${saSubjectId}`,
        { withCredentials: true }
      );
      setSaAssignments(data || []);
      setSaTeacherId('');
      fetchAssignedTeachersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign teacher.');
    } finally {
      setSaSaving(false);
    }
  };

  // â”€â”€ Standalone modal: remove assignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaRemove = async (t) => {
    const confirmed = await confirmActionDialog({
      title: 'Remove teacher?',
      text: `${t.employeeName} will be removed from this subject.`,
      confirmButtonText: 'Yes, remove teacher'
    });
    if (!confirmed) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/master/teacher-subject/remove`,
        { data: { employeeId: t.employeeId, batchId: saBatchId, courseId: saCourseId, subjectId: saSubjectId }, withCredentials: true }
      );
      toast.success('Assignment removed.');
      setSaAssignments(prev => prev.filter(x => String(x.employeeId) !== String(t.employeeId)));
      fetchAssignedTeachersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove assignment.');
    }
  };

  const hasBranchAccess = !branchId || !allowedBranchIds || allowedBranchIds.has(branchId);
  const hasBatchAccess = !batchId || !allowedBatchIds || allowedBatchIds.has(batchId);
  const hasCourseAccess = !courseId || !allowedCourseIds || allowedCourseIds.has(courseId);
  const hasSubjectAccess = !subjectId || !allowedSubjectIds || allowedSubjectIds.has(subjectId);
  const hasScopedAccess = isQuickStudentReportRoute ? true : (hasBranchAccess && hasBatchAccess && hasCourseAccess && hasSubjectAccess);

  if (!view || !hasScopedAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to view this syllabus page.</p>
      </div>
    );
  }

  if (step === 1) {
    const quickDetailStudent = quickFilteredStudents.find(student => student._id === quickDetailStudentId);
    const reportBranch = quickSelectedBranch || user?.branchDetails || {};
    const reportBranchName = reportBranch?.name || user?.branchName || 'Smart Institute';
    const reportBranchAddress = reportBranch?.address || '';
    const reportBranchPhone = reportBranch?.phone || reportBranch?.mobile || '';
    const reportBranchMobile = reportBranch?.mobile || '';
    const reportBranchEmail = reportBranch?.email || '';
    const quickProjectColumns = quickFilteredStudents.reduce((columns, student) => {
      const chapterStatus = getQuickSelectedChapterStatus(student._id);
      (chapterStatus?.projects || []).forEach(project => {
        const projectKey = getProjectColumnKey(project);
        if (projectKey && !columns.some(item => item.columnKey === projectKey)) {
          columns.push({ ...project, columnKey: projectKey });
        }
      });
      return columns;
    }, []);
    const quickProjectColumnCount = Math.max(quickProjectColumns.length, 1);
    const quickTableColSpan = 13 + quickProjectColumnCount;
    const quickProjectColumnWidth = `${Math.max(3, Math.min(8, 24 / quickProjectColumnCount))}%`;

    return (
      <div className="mx-auto w-full max-w-none p-2 lg:p-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <BookOpenCheck className="text-blue-600" size={28} />
              {isQuickStudentReportRoute ? 'Student Syllabus Report' : 'Syllabus Management'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isQuickStudentReportRoute
                ? 'Student wise syllabus progress and chapter report.'
                : 'Select filters once and view the student syllabus report directly.'}
            </p>
          </div>
          {isQuickStudentReportRoute ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/master/syllabus-management')}
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          ) : showTeacher && (
            <button
              onClick={() => navigate('/master/teacher-subject-management')}
              className="inline-flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
            >
              <UserCheck size={16} />
              Manage Teacher Access
            </button>
          )}
        </div>

        <div className={`${isQuickStudentReportRoute ? 'hidden' : 'mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md print:hidden'}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {isSuperAdmin && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">Branch</label>
                <select
                  value={quickFilters.branchId}
                  onChange={e => updateQuickFilter('branchId', e.target.value)}
                  className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">Batch</label>
              <select
                value={quickFilters.batchId}
                onChange={e => updateQuickFilter('batchId', e.target.value)}
                className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Batch</option>
                {quickBatchOptions.map(batch => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name} {batch.startTime && batch.endTime ? `(${batch.startTime} - ${batch.endTime})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">Course</label>
              <select
                value={quickFilters.courseId}
                onChange={e => updateQuickFilter('courseId', e.target.value)}
                disabled={!quickFilters.batchId}
                className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select Course</option>
                {quickCourseOptions.map(course => (
                  <option key={course._id} value={course._id}>{course.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">Subject</label>
              <select
                value={quickFilters.subjectId}
                onChange={e => updateQuickFilter('subjectId', e.target.value)}
                disabled={!quickFilters.courseId}
                className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">Select Subject</option>
                {quickSubjectOptions.map(item => (
                  <option key={item.subject._id} value={item.subject._id}>{item.subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">Student</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={quickFilters.studentSearch}
                  onChange={e => setQuickFilters(prev => ({ ...prev, studentSearch: e.target.value }))}
                  placeholder="Search student..."
                  className="w-full rounded border py-2 pl-9 pr-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleQuickReset}
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-200"
            >
              <RefreshCw size={16} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleQuickShowReport()}
              disabled={quickLoading}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-6 py-2 font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-60"
            >
              {quickLoading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
              Show Report
            </button>
          </div>

          {quickSelectedSubject && (
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-500">Subject Setup</p>
                  <h3 className="mt-1 text-base font-bold text-gray-900">{quickSelectedSubject.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded bg-white px-3 py-1 text-blue-700">
                      Days to Complete: {quickSelectedSubject.daysToComplete || 0}
                    </span>
                    <span className="rounded bg-white px-3 py-1 text-indigo-700">
                      Chapters: {(quickSelectedSubject.chapters || []).length}
                    </span>
                    <span className="rounded bg-white px-3 py-1 text-emerald-700">
                      Projects / Practical: {(quickSelectedSubject.projects || []).length}
                    </span>
                    <span className="rounded bg-white px-3 py-1 text-slate-700">
                      Pages: {quickSelectedSubject.totalPages || 0}
                    </span>
                  </div>
                </div>
                {showEdit && (
                  <button
                    type="button"
                    onClick={handleQuickEditSubjectSetup}
                    className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700"
                  >
                    <Edit3 size={16} />
                    Add / Edit Chapter, Project, Practical
                  </button>
                )}
              </div>
              {/* <p className="mt-3 text-xs font-semibold text-blue-700">
                Is button se Days to Complete, Subject Chapters, Project/Practical aur page range add/edit kar sakte ho.
              </p> */}
            </div>
          )}
        </div>

        <div className="overflow-hidden bg-gray-50 p-2 print:bg-white print:p-0">
          <div className="mx-auto w-full min-h-[297mm] bg-white p-3 shadow-lg print:w-full print:p-0 print:shadow-none lg:p-5">
            {isQuickStudentReportRoute ? (
              <>
                <div className="mb-6 flex items-start justify-between border-b-2 border-primary pb-4">
                  <div className="flex items-center gap-4">
                    <img src={logo} alt="Institute Logo" className="h-20 object-contain" />
                  </div>
                  <div className="max-w-md text-right text-xs text-gray-600">
                    <h2 className="mb-1 text-xl font-bold text-blue-600">{reportBranchName}</h2>
                    {reportBranchAddress && <p>{reportBranchAddress}</p>}
                    {(reportBranchPhone || reportBranchMobile) && (
                      <p className="font-semibold text-blue-800">
                        Ph. No. : {reportBranchPhone || '-'}{reportBranchMobile ? `, Mob. No. : ${reportBranchMobile}` : ''}
                      </p>
                    )}
                    {reportBranchEmail && <p className="text-blue-500 underline">{reportBranchEmail}</p>}
                  </div>
                </div>

                <div className="mb-5 text-center">
                  <h3 className="text-lg font-bold uppercase text-black underline decoration-2 underline-offset-4">
                    Student Syllabus Progress Report
                  </h3>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-semibold text-gray-600">
                    <span>Student: <span className="font-bold text-gray-900">{quickDetailStudent?.name || '-'}</span></span>
                    <span>Enrollment: <span className="font-bold text-gray-900">{quickDetailStudent?.enrollmentNo || '-'}</span></span>
                    <span>Batch: <span className="font-bold text-gray-900">{quickSelectedBatch?.name || '-'}</span></span>
                    <span>Course: <span className="font-bold text-gray-900">{quickSelectedCourse?.name || '-'}</span></span>
                    <span>Subject: <span className="font-bold text-gray-900">{quickSelectedSubject?.name || '-'}</span></span>
                    <span>Date: <span className="font-bold text-gray-900">{moment().format('DD-MM-YYYY')}</span></span>
                  </div>
                </div>
              </>
            ) : (
            <div className="mb-5 border-b-2 border-primary pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-600">
                    {quickSelectedBranch?.name || user?.branchDetails?.name || 'Smart Institute'}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-gray-600">Syllabus Progress Report</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p><span className="font-bold text-gray-700">Batch:</span> {quickSelectedBatch?.name || '-'}</p>
                  <p><span className="font-bold text-gray-700">Course:</span> {quickSelectedCourse?.name || '-'}</p>
                  <p><span className="font-bold text-gray-700">Subject:</span> {quickSelectedSubject?.name || '-'}</p>
                  <p><span className="font-bold text-gray-700">Date:</span> {moment().format('DD-MM-YYYY')}</p>
                </div>
              </div>
            </div>
            )}

            {quickDetailStudentId && quickDetailStudent && quickSelectedSubject ? (
              <StudentDetailView
                studentId={quickDetailStudentId}
                onClose={() => {
                  if (isQuickStudentReportRoute) {
                    navigate('/master/syllabus-management');
                  } else {
                    setQuickDetailStudentId(null);
                  }
                }}
                student={quickDetailStudent}
                selectedSubject={quickSelectedSubject}
                subjectChapters={quickSelectedSubject.chapters || []}
                subjectProjects={quickSelectedSubject.projects || []}
                batchId={quickFilters.batchId}
                courseId={quickFilters.courseId}
                branchId={quickFilters.branchId}
                getStudentStartDate={getStudentStartDate}
                getCourseEndDate={getCourseEndDate}
                getDaysRemainingText={getDaysRemainingText}
                holidays={holidays}
                user={user}
              />
            ) : (
              <>
                <table className="w-full table-fixed border-collapse border border-gray-400 text-[10px] leading-tight">
                  <colgroup>
                    <col style={{ width: '2.5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '5%' }} />
                    {quickProjectColumns.length > 0 ? (
                      quickProjectColumns.map(project => (
                        <col key={project.columnKey || project._id} style={{ width: quickProjectColumnWidth }} />
                      ))
                    ) : (
                      <col style={{ width: quickProjectColumnWidth }} />
                    )}
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '3%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-blue-600 text-left text-white print:bg-gray-200 print:text-black">
                      <th className="border border-gray-400 p-1 text-center">Sr.</th>
                      <th className="border border-gray-400 p-1">Student</th>
                      <th className="border border-gray-400 p-1">Course</th>
                      <th className="border border-gray-400 p-1">Status</th>
                      <th className="border border-gray-400 p-1">Current</th>
                      <th className="border border-gray-400 p-1">Teacher</th>
                      <th className="border border-gray-400 p-1">Done On</th>
                      <th className="border border-gray-400 p-1">Days</th>
                      <th className="border border-gray-400 p-1">Target</th>
                      <th className="border border-gray-400 p-1 print:hidden">Chapter</th>
                      <th className="border border-gray-400 p-1 print:hidden">Theory</th>
                      {quickProjectColumns.length > 0 ? (
                        quickProjectColumns.map(project => (
                          <th key={project.columnKey || project._id} className="border border-gray-400 p-1 text-center print:hidden">
                            <div className="min-w-0">
                              <p className="truncate font-bold" title={project.name || 'Project'}>{truncateText(project.name || 'Project')}</p>
                              <p className="truncate text-[9px] font-semibold opacity-80">Practical</p>
                            </div>
                          </th>
                        ))
                      ) : (
                        <th className="border border-gray-400 p-1 text-center print:hidden">Practical</th>
                      )}
                      <th className="border border-gray-400 p-1 print:hidden">Final</th>
                      <th className="border border-gray-400 p-1 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickLoading ? (
                      <tr>
                        <td colSpan={quickTableColSpan} className="border border-gray-400 p-6 text-center font-semibold text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : quickReportShown && quickFilteredStudents.length > 0 ? (
                      quickFilteredStudents.map((student, index) => {
                        const summary = quickSummaries[student._id];
                        const startDate = getStudentStartDate(student);
                        const endDate = getCourseEndDate(student, holidays, quickFilters.branchId);
                        const remaining = getDaysRemainingText(student, holidays, quickFilters.branchId);
                        const chapterStatus = getQuickSelectedChapterStatus(student._id);
                        const chapterStatuses = quickChapterStatuses[student._id] || [];
                        const selectedChapter = chapterStatus?.chapter || null;
                        const chapterActionKey = selectedChapter ? `${student._id}_${selectedChapter._id}` : '';
                        const projects = chapterStatus?.projects || [];
                        const pendingProjects = projects.filter(project => !project.completed);
                        const allProjectsCompleted = projects.length === 0 || pendingProjects.length === 0;
                        const theoryCompleted = chapterStatus?.status === 'Completed' || chapterStatus?.isLocked;
                        const chapterStarted = Boolean(chapterStatus?.startedAt || chapterStatus?.status);
                        const runningChapterStatus = getQuickRunningChapterStatus(student._id);
                        const runningOtherChapter = runningChapterStatus?.chapter?._id &&
                          selectedChapter?._id &&
                          String(runningChapterStatus.chapter._id) !== String(selectedChapter._id)
                          ? runningChapterStatus
                          : null;
                        return (
                          <tr key={student._id} className="break-inside-avoid hover:bg-gray-50">
                            <td className="border border-gray-400 p-1 text-center">{index + 1}</td>
                            <td className="border border-gray-400 p-1">
                              <p className="truncate font-bold uppercase text-gray-800" title={student.name}>{student.name}</p>
                              <p className="truncate text-[9px] font-semibold text-gray-500">{student.enrollmentNo || '-'}</p>
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold text-gray-700">
                              {startDate ? startDate.format('DD-MM-YYYY') : '-'} to {endDate ? endDate.format('DD-MM-YYYY') : '-'}
                            </td>
                            <td className="border border-gray-400 p-1">
                              <span className={`block truncate rounded px-1 py-0.5 text-[9px] font-bold ${remaining.colorClass}`} title={remaining.text}>
                                {remaining.text}
                              </span>
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold text-gray-700">
                              <span className="block truncate" title={summary?.currentChapterName || '-'}>{summary?.currentChapterName || '-'}</span>
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold text-gray-700">
                              <span className="block truncate" title={summary?.currentTeacherName || '-'}>{summary?.currentTeacherName || '-'}</span>
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold text-gray-700">
                              {summary?.subjectCompletedAt ? moment(summary.subjectCompletedAt).format('DD-MM-YYYY') : 'In progress'}
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold text-gray-700">
                              {summary ? `${summary.actualDaysTaken ?? summary.elapsedDays ?? 0} day(s)` : '-'}
                            </td>
                            <td className="border border-gray-400 p-1 font-semibold">
                              {summary
                                ? summary.daysOverTarget > 0
                                  ? <span className="block truncate text-red-600">{summary.daysOverTarget} extra</span>
                                  : <span className="block truncate text-green-700">{summary.daysRemainingToTarget ?? summary.daysToComplete ?? quickSelectedSubject?.daysToComplete ?? 0} left</span>
                                : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="border border-gray-400 p-1 print:hidden">
                              <div className="min-w-0 space-y-1">
                                <select
                                  value={selectedChapter?._id || ''}
                                  onChange={e => handleQuickChapterSelect(student._id, e.target.value)}
                                  className="w-full rounded border border-gray-300 px-1 py-0.5 text-[9px] font-semibold outline-none focus:border-blue-500"
                                >
                                  {chapterStatuses.length === 0 && <option value="">Loading chapters...</option>}
                                  {chapterStatuses.map(item => (
                                    <option key={item.chapter?._id} value={item.chapter?._id}>
                                      {item.chapter?.name || 'Chapter'}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-[9px] font-semibold text-gray-500">
                                  <p className="truncate">Status: <span className="font-bold text-gray-800">{chapterStatus?.isLocked ? 'Completed' : chapterStatus?.status || 'Not started'}</span></p>
                                  {chapterStatus?.startedAt && (
                                    <p className="truncate">Start: {moment(chapterStatus.startedAt).format('DD-MM-YYYY')} {chapterStatus.startedBy ? `by ${chapterStatus.startedBy}` : ''}</p>
                                  )}
                                </div>
                                {!chapterStarted && selectedChapter && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStartChapter(student, chapterStatus)}
                                      disabled={quickActionLoading !== null || Boolean(runningOtherChapter)}
                                      className="inline-flex w-full items-center justify-center gap-1 rounded bg-indigo-600 px-1 py-0.5 text-[9px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {quickActionLoading === `start_${chapterActionKey}` ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                                      Start Chapter
                                    </button>
                                    {runningOtherChapter && (
                                      <p className="truncate text-[9px] font-bold text-amber-600" title={`${runningOtherChapter.chapter?.name || 'Running chapter'} complete first`}>
                                        First complete: {runningOtherChapter.chapter?.name || 'Running chapter'}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-400 p-1 print:hidden">
                              <div className="min-w-0 space-y-1 text-[9px]">
                                {theoryCompleted ? (
                                  <div className="rounded bg-emerald-50 px-1 py-0.5 font-bold text-emerald-700">
                                    Theory Done
                                    {chapterStatus?.completedAt && (
                                      <p className="truncate text-[9px] font-semibold text-emerald-600">
                                        {moment(chapterStatus.completedAt).format('DD-MM-YYYY')}
                                      </p>
                                    )}
                                  </div>
                                ) : chapterStatus?.status === 'Running' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTheoryComplete(student, chapterStatus)}
                                    disabled={quickActionLoading !== null}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {quickActionLoading === `theory_${chapterActionKey}` ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                    Theory Complete
                                  </button>
                                ) : (
                                  <span className="font-semibold text-gray-400">Start first</span>
                                )}
                              </div>
                            </td>
                            {quickProjectColumns.length > 0 ? (
                              quickProjectColumns.map(columnProject => {
                                const project = projects.find(item => getProjectColumnKey(item) === columnProject.columnKey);
                                const projectKey = `${student._id}_${selectedChapter?._id}_${columnProject.columnKey || columnProject._id}`;

                                if (!project) {
                                  return (
                                    <td key={columnProject.columnKey || columnProject._id} className="border border-gray-400 p-1 text-center print:hidden">
                                      <span className="text-[9px] font-bold text-gray-300">-</span>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={columnProject.columnKey || columnProject._id} className="border border-gray-400 p-1 print:hidden">
                                    <div className="min-w-0 space-y-1 text-center">
                                      {project.completed ? (
                                        <>
                                          <span className="inline-flex items-center justify-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                            Done
                                          </span>
                                          <p className="truncate text-[9px] font-semibold text-gray-500" title={project.completedAt ? moment(project.completedAt).format('DD-MM-YYYY hh:mm A') : 'Completed'}>
                                            {project.completedAt ? moment(project.completedAt).format('DD-MM hh:mm A') : 'Completed'}
                                          </p>
                                          {project.completedBy && (
                                            <p className="truncate text-[9px] font-semibold text-gray-400" title={project.completedBy}>by {project.completedBy}</p>
                                          )}
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickProjectComplete(student, chapterStatus, project)}
                                          disabled={!chapterStarted || quickActionLoading !== null}
                                          className="w-full rounded bg-blue-600 px-1 py-0.5 text-[9px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                          {quickActionLoading === `project_${projectKey}` ? 'Saving...' : 'Done'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                );
                              })
                            ) : (
                              <td className="border border-gray-400 p-1 text-center print:hidden">
                                <span className="text-[9px] font-bold text-gray-400">No practical</span>
                              </td>
                            )}
                            <td className="border border-gray-400 p-1 print:hidden">
                              <div className="min-w-0">
                                {chapterStatus?.isLocked ? (
                                  <span className="block truncate rounded bg-violet-50 px-1 py-0.5 text-[9px] font-bold text-violet-700">Completed</span>
                                ) : theoryCompleted && allProjectsCompleted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickFinalChapterComplete(student, chapterStatus)}
                                    disabled={quickActionLoading !== null}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded bg-violet-600 px-1 py-0.5 text-[9px] font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                                  >
                                    {quickActionLoading === `final_${chapterActionKey}` ? <RefreshCw size={11} className="animate-spin" /> : <Trophy size={11} />}
                                    Complete
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-semibold text-gray-400">Pending</span>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-400 p-1 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => handleQuickStudentReportClick(student._id)}
                                className="inline-flex items-center justify-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 hover:bg-blue-200"
                              >
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={quickTableColSpan} className="border border-gray-400 p-6 text-center font-semibold text-gray-500">
                          {quickReportShown ? 'No records found.' : 'Select filters and click Show Report.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-between text-[10px] text-gray-500">
                  <span>Printed On: {moment().format('DD-MM-YYYY hh:mm A')}</span>
                  <span>Total Records: {quickReportShown ? quickFilteredStudents.length : 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#f3f6fb] text-slate-800">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
        
        {/* Header Title section */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-[#111827] shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                onClick={handleBack}
                className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition-all"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-200">Academy Structure</p>
                <h1 className="flex min-w-0 items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                  <FolderKanban className="shrink-0 text-blue-300" />
                  <span className="truncate">Syllabus Management</span>
                </h1>
                <p className="mt-1 text-sm text-slate-300">Browse branches, batches, courses, and syllabus details</p>
              </div>
            </div>
            {/* â”€â”€ Manage Teacher Access button â”€ only visible if permitted â”€â”€ */}
            {showTeacher && (
              <button
                onClick={() => navigate('/master/teacher-subject-management')}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-white shadow-lg hover:bg-emerald-400 active:scale-95 transition-all"
              >
                <UserCheck size={16} />
                Manage Teacher Access
              </button>
            )}
          </div>
        </div>

        {/* Navigation Breadcrumbs */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-sm font-semibold text-slate-500">
          <button 
            onClick={() => navigateToStep(1)}
            className={`hover:text-primary transition-all ${step === 1 ? 'text-primary font-black' : ''}`}
          >
            Branches
          </button>
          
          {selectedBranch && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <button 
                onClick={() => navigateToStep(2)}
                className={`hover:text-primary transition-all truncate max-w-[150px] ${step === 2 ? 'text-primary font-black' : ''}`}
              >
                {selectedBranch.name}
              </button>
            </>
          )}

          {selectedBatch && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <button 
                onClick={() => navigateToStep(3)}
                className={`hover:text-primary transition-all truncate max-w-[150px] ${step === 3 ? 'text-primary font-black' : ''}`}
              >
                {selectedBatch.name}
              </button>
            </>
          )}

          {selectedCourse && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <button 
                onClick={() => navigateToStep(4)}
                className={`hover:text-primary transition-all truncate max-w-[150px] ${step === 4 ? 'text-primary font-black' : ''}`}
              >
                {selectedCourse.name}
              </button>
            </>
          )}

          {selectedSubject && step === 5 && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              {activeDetailStudent ? (
                <button
                  onClick={() => navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(subjectId)}/students`)}
                  className="hover:text-primary transition-all truncate max-w-[150px]"
                >
                  {selectedSubject.name} Students
                </button>
              ) : (
                <span className="text-primary font-black truncate max-w-[150px]">
                  {selectedSubject.name} Enrolled Students
                </span>
              )}
            </>
          )}

          {selectedSubject && step === 5 && activeDetailStudent && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-primary font-black truncate max-w-[150px]">
                {filteredStudents.find(s => s._id === activeDetailStudent)?.name || 'View Log'}
              </span>
            </>
          )}

          {selectedSubject && step === 6 && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-primary font-black truncate max-w-[150px]">
                Edit {selectedSubject.name}
              </span>
            </>
          )}
        </div>

        {/* Toolbar (Search & Status indicator) */}
        {step !== 6 && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  step === 5 
                    ? 'Search students by name or enrollment...'
                    : `Search ${step === 1 ? 'branches' : step === 2 ? 'batches' : step === 3 ? 'courses' : 'subjects'}...`
                }
                value={step === 5 ? studentsSearchQuery : searchQuery}
                onChange={(e) => step === 5 ? setStudentsSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-primary/50 focus:bg-white transition-all"
              />
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <RefreshCw className="animate-spin text-primary" size={16} />
                <span>Loading data...</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div>
          {/* LEVEL 1: BRANCH LIST */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBranches.length > 0 ? (
                filteredBranches.map(branch => (
                  <div
                    key={branch._id}
                    onClick={() => handleBranchClick(branch)}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <Building2 size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-primary truncate transition-colors">
                          {branch.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">Code: {branch.shortCode}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>{branch.city}, {branch.state}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Active</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Building2 size={48} className="text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No branches found</p>
                </div>
              )}
            </div>
          )}

          {/* LEVEL 2: BATCH LIST */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBatches.length > 0 ? (
                filteredBatches.map(batch => (
                  <div
                    key={batch._id}
                    onClick={() => handleBatchClick(batch)}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                          <Layers size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-slate-900 group-hover:text-primary truncate transition-colors">
                            {batch.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">Faculty: {batch.faculty?.name || 'Unassigned'}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="mt-1 text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <span>{batch.startTime} - {batch.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        <span>Cap: {batch.batchSize}</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Courses linked:</span>
                      <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700 font-extrabold">
                        {batch.courses?.length || 0}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Layers size={48} className="text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No batches found in this branch</p>
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: COURSE LIST */}
          {step === 3 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <div
                    key={course._id}
                    onClick={() => handleCourseClick(course)}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          <GraduationCap size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-slate-900 group-hover:text-primary truncate transition-colors">
                            {course.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">Short name: {course.shortName}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="mt-1 text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Duration</p>
                        <p className="mt-0.5 text-slate-800">{course.duration} {course.durationType || 'Month'}(s)</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Total Fees</p>
                        <p className="mt-0.5 text-emerald-600 font-extrabold">â‚¹{course.courseFees}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs font-bold text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>Total Subjects:</span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700 font-extrabold">
                          {course.subjects?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                        <span>Active Students in Batch:</span>
                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-blue-700 font-extrabold">
                          {selectedBatch?.courseCounts?.[course._id] || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <GraduationCap size={48} className="text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No active courses in this batch</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1 text-center max-w-xs">No students are currently actively enrolled in any course for this batch.</p>
                </div>
              )}
            </div>
          )}

          {/* LEVEL 4: SUBJECT LIST */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Syllabus / Subjects list</h3>
                    <p className="text-xs font-semibold text-slate-400">Manage syllabus progression and parameters for {selectedCourse?.name}</p>
                  </div>
                  <span className="self-start rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                    {filteredSubjects.length} Subject(s)
                  </span>
                </div>

                {filteredSubjects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-50/70">
                          <th className="py-3 px-4">Order</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4 text-center">Assigned Teacher</th>
                          <th className="py-3 px-4 text-center">Days to Complete</th>
                          <th className="py-3 px-4 text-center">Pages</th>
                          <th className="py-3 px-4 text-center">Projects Count</th>
                          <th className="py-3 px-4 text-center">Chapters Count</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                        {filteredSubjects.map((sub, idx) => {
                          const subId = sub.subject?._id;
                          const isExpanded = !!expandedSubjects[subId];
                          const isChaptersExpanded = !!expandedChapters[subId];
                          const projectList = sub.subject?.projects || [];
                          const chapterList = sub.subject?.chapters || [];

                          const matchingTeachers = assignedTeachersList
                            .filter(t => String(t.subjectId) === String(subId))
                            .map(t => t.employeeName);

                          return (
                            <React.Fragment key={subId || idx}>
                              <tr className="hover:bg-slate-50/50 transition">
                                <td className="py-4 px-4 font-bold text-slate-400">
                                  {sub.sortOrder || idx + 1}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <BookOpenCheck size={16} className="text-indigo-500 shrink-0" />
                                      <span className="font-black text-slate-900">{sub.subject?.name || 'Unnamed Subject'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      {(projectList.length > 0 || chapterList.length > 0) && (
                                        <button 
                                          onClick={() => toggleSubjectExpanded(subId)}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                        >
                                          {isExpanded ? 'Hide Syllabus' : `Show Syllabus (${chapterList.length} Ch, ${projectList.length} Proj)`}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {matchingTeachers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {matchingTeachers.map((tName, tIdx) => (
                                        <span key={tIdx} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                          {tName}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">Not Assigned</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                                  {sub.subject?.daysToComplete || 0} days
                                </td>
                                <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                                  {sub.subject?.totalPages || 0} pages
                                </td>
                                <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                                  {projectList.length || sub.subject?.projectsCount || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                                  {chapterList.length || sub.subject?.chaptersCount || 0}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                    {showEdit && (
                                      <button
                                        onClick={() => handleEditPageClick(sub)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shrink-0"
                                        title="Edit Subject parameters"
                                      >
                                        <Edit3 size={12} /> Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleStudentsPageClick(sub)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition shrink-0"
                                      title="View enrolled students"
                                    >
                                      <Users size={12} /> Students
                                    </button>
                                    {showTeacher && (
                                      <button
                                        onClick={() => {
                                          setSaSubjectId(sub.subject?._id);
                                          setSaBatchId(batchId);
                                          setSaCourseId(courseId);
                                          setSaOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition shrink-0"
                                        title="Manage Teacher Access"
                                      >
                                        <UserCheck size={12} /> Teacher
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Accordion dropdown row for grouped syllabus */}
                              {isExpanded && (projectList.length > 0 || chapterList.length > 0) && (
                                <tr className="bg-slate-50/50">
                                  <td />
                                  <td colSpan={7} className="py-4 px-5 border-l-2 border-primary">
                                    <div className="space-y-3">
                                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Syllabus Details (Chapters & Projects)</p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {chapterList.map((chap, chapIdx) => {
                                          const chapId = chap._id || `idx_${chapIdx}`;
                                          const chapProjects = projectList.filter(p => {
                                            if (typeof p === 'string') return false;
                                            return String(p.chapterId) === String(chapId);
                                          });

                                          return (
                                            <div key={chapId} className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow transition duration-200">
                                              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
                                                <div className="min-w-0">
                                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
                                                    Chapter {chapIdx + 1}
                                                  </span>
                                                  <h5 className="font-extrabold text-slate-800 text-sm truncate" title={chap.name || chap}>
                                                    {chap.name || chap}
                                                  </h5>
                                                </div>
                                                <div className="text-right shrink-0">
                                                  <span className="block text-[10px] font-black text-slate-400 uppercase">Pages</span>
                                                  <span className="font-mono text-xs font-bold text-slate-600">
                                                    {chap.startPage !== undefined ? `${chap.startPage} - ${chap.endPage}` : '0 - 0'}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              <div className="space-y-1.5 flex-1">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Associated Projects ({chapProjects.length})</p>
                                                {chapProjects.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {chapProjects.map((proj, projIdx) => (
                                                      <div key={projIdx} className="flex items-center gap-2 rounded bg-slate-50 border border-slate-100/70 px-2 py-1.5 text-xs text-slate-700 font-semibold">
                                                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[9px] font-bold text-slate-500">{projIdx + 1}</span>
                                                        <span className="truncate">{proj.name || proj}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <p className="text-[10px] text-slate-400 italic font-medium py-1">No projects assigned.</p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                        
                                        {/* Legacy / Unassigned Projects */}
                                        {(() => {
                                          const unassignedProjects = projectList.filter(p => {
                                            if (typeof p === 'string') return true;
                                            return !p.chapterId || !chapterList.some(c => String(c._id || '') === String(p.chapterId));
                                          });

                                          if (unassignedProjects.length > 0) {
                                            return (
                                              <div className="flex flex-col rounded-xl border border-rose-100 bg-rose-50/10 p-3.5 shadow-sm">
                                                <div className="flex items-start justify-between gap-2 border-b border-rose-100/50 pb-2 mb-2.5">
                                                  <div className="min-w-0">
                                                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 uppercase tracking-wider mb-1">
                                                      Unassigned
                                                    </span>
                                                    <h5 className="font-extrabold text-rose-800 text-sm truncate">
                                                      Legacy / Unassigned Projects
                                                    </h5>
                                                  </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Projects ({unassignedProjects.length})</p>
                                                  <div className="space-y-1">
                                                    {unassignedProjects.map((proj, projIdx) => (
                                                      <div key={projIdx} className="flex items-center gap-2 rounded bg-white border border-rose-100/50 px-2 py-1.5 text-xs text-rose-700 font-semibold shadow-sm">
                                                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[9px] font-bold text-rose-500">{projIdx + 1}</span>
                                                        <span className="truncate">{typeof proj === 'string' ? proj : (proj.name || proj)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 rounded-xl">
                    <FileText size={48} className="text-slate-300 mb-2" />
                    <p className="font-bold text-sm">No subjects found in this course</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEVEL 5: ENROLLED STUDENTS + TEACHING LOG DASHBOARD */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Header card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <BarChart3 className="text-indigo-600" size={22} /> Teaching Progression Log
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="font-bold text-slate-600">
                        Course: <span className="text-emerald-700 font-extrabold">{selectedCourse?.name || 'â€”'}</span>
                      </span>
                      <span className="font-bold text-slate-600">
                        Subject: <span className="text-indigo-700 font-extrabold">{selectedSubject?.name || 'â€”'}</span>
                      </span>
                      <span className="font-semibold text-slate-400">
                        Batch: {selectedBatch?.name || 'â€”'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Subject quick stats */}
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                        <BookMarked size={13} /> {(selectedSubject?.chapters || []).length} Chapters
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                        <FolderCheck size={13} /> {(selectedSubject?.projects || []).length} Projects
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                        <Timer size={13} /> {selectedSubject?.daysToComplete || 0}d Target
                      </span>
                    </div>
                    <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                      {filteredStudents.length} Student(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search student name or enrollment noâ€¦"
                  value={studentsSearchQuery}
                  onChange={e => setStudentsSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {studentsLoading || (step === 5 && !selectedBatch) ? (
                <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center">
                  <RefreshCw className="mx-auto mb-3 animate-spin text-indigo-500" size={28} />
                  <p className="font-bold text-slate-500">Loading studentsâ€¦</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center">
                  <Users size={48} className="mx-auto mb-2 text-slate-200" />
                  <p className="font-bold text-slate-400">No active students found.</p>
                </div>
              ) : activeDetailStudent ? (
                                <StudentDetailView 
                  studentId={activeDetailStudent}
                  onClose={() => navigate(`/master/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(subjectId)}/students`)}
                  student={filteredStudents.find(s => s._id === activeDetailStudent)}
                  selectedSubject={selectedSubject}
                  subjectChapters={subjectChapters}
                  subjectProjects={subjectProjects}
                  batchId={batchId}
                  courseId={courseId}
                  branchId={branchId}
                  getStudentStartDate={getStudentStartDate}
                  getCourseEndDate={getCourseEndDate}
                  getDaysRemainingText={getDaysRemainingText}
                  holidays={holidays}
                  user={user}
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-4">#</th>
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3.5 px-4">Course Period</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Completed On</th>
                        <th className="py-3.5 px-4">Teacher</th>
                        <th className="py-3.5 px-4">Current Chapter</th>
                        <th className="py-3.5 px-4">Days Taken</th>
                        <th className="py-3.5 px-4">Days Left / Extra</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student, index) => {
                        const startDate = getStudentStartDate(student);
                        const endDate = getCourseEndDate(student, holidays, branchId);
                        const remaining = getDaysRemainingText(student, holidays, branchId);
                        const summary = batchSummaries[student._id];
                        return (
                          <tr key={student._id} className="hover:bg-indigo-50/30 transition-all cursor-pointer" onClick={() => handleViewStudentLog(student._id)}>
                            <td className="py-3.5 px-4">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 font-black text-indigo-700 text-xs">{index + 1}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-slate-900">{student.name}</div>
                              <div className="text-[11px] font-semibold text-slate-400">{student.enrollmentNo || 'â€”'}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
                                {startDate ? startDate.format('DD-MM-YY') : 'â€”'}
                                {' '}to{' '}
                                {endDate ? endDate.format('DD-MM-YY') : 'â€”'}
                              </span>
                              <div className="mt-1 text-[11px] font-bold text-slate-400">
                                Course window
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={"inline-block rounded-lg px-2.5 py-1 text-xs font-extrabold " + remaining.colorClass}>
                                {remaining.text}
                              </span>
                            </td>
                                                        <td className="py-3.5 px-4 align-top">
                              {summary?.subjectCompletedAt ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-extrabold text-emerald-700">
                                    {moment(summary.subjectCompletedAt).format('DD MMM YYYY')}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Subject completed
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">In progress</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              {summary ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-extrabold text-slate-900">
                                    {summary.currentTeacherName || '—'}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Latest syllabus activity
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">No logs yet</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              {summary ? (
                                <div className="flex flex-col gap-1">
                                  <span className="max-w-[220px] truncate text-sm font-extrabold text-slate-900" title={summary.currentChapterName || '—'}>
                                    {summary.currentChapterName || '—'}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Current running chapter
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">No chapter yet</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              {summary ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-extrabold text-sky-700">
                                    {summary.actualDaysTaken ?? summary.elapsedDays ?? 0} day(s)
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Started to completion
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              {summary ? (
                                <div className="flex flex-col gap-1">
                                  <span className={"text-sm font-extrabold " + (summary.daysOverTarget > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                                    {summary.daysOverTarget > 0
                                      ? `${summary.daysOverTarget} extra day(s)`
                                      : `${summary.daysRemainingToTarget ?? summary.daysToComplete ?? selectedSubject?.daysToComplete ?? 0} day(s) left`}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    Target {summary.daysToComplete || selectedSubject?.daysToComplete || 0} days
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleViewStudentLog(student._id); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                              >
                                <Eye size={13} /> View Log
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            )}      {/* LEVEL 6: EDIT SUBJECT PARAMETERS */}
      {step === 6 && selectedSubject && (
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* â”€â”€ Header Section â”€â”€ */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-indigo-300 border border-white/10">
                    <BookOpenCheck size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                      Syllabus Designer
                    </p>
                    <h3 className="text-xl font-black text-white">
                      {selectedSubject.name}
                    </h3>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-slate-350 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap size={12} className="text-emerald-400" />
                        <span className="text-slate-300 font-bold">{selectedCourse?.name}</span>
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="inline-flex items-center gap-1">
                        <Layers size={12} className="text-indigo-400" />
                        <span className="text-slate-300 font-bold">{selectedBatch?.name}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-slate-300 hover:bg-white/10 transition active:scale-95"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveSubjectDetails}
                    disabled={saveLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-60 shadow-md active:scale-95"
                  >
                    {saveLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Stats Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Chapters</p>
                  <p className="text-lg font-black text-slate-800">{editChapters.length}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ListTodo size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Practical Projects</p>
                  <p className="text-lg font-black text-slate-800">{editProjects.length}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Teaching Days</p>
                  <p className="text-lg font-black text-slate-800">{editDays || 0} Days</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Pages</p>
                  <p className="text-lg font-black text-slate-800">{editPages || 0} Pages</p>
                </div>
              </div>
            </div>

            {/* â”€â”€ Main Content Grid â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-slate-50/20">
              
              {/* â•â•â• Left Column: Parameters, Index & Unassigned â•â•â• */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Syllabus Parameters Card */}
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                      <FileText size={14} className="text-slate-400" />
                      Subject Configuration
                    </h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                        <Clock size={12} className="text-amber-500" />
                        Days to Complete
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-150">
                        <input
                          type="number"
                          min="0"
                          value={editDays}
                          onChange={(e) => setEditDays(e.target.value)}
                          onBlur={(e) => autoSaveSubjectDetails(editChapters, editProjects, e.target.value, editPages)}
                          className="h-10 w-full bg-transparent px-3 text-sm font-bold text-slate-800 outline-none"
                          placeholder="e.g. 30"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Suggested calendar teaching days for this subject.</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                        <BookOpen size={12} className="text-blue-500" />
                        Total Curriculum Pages
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-150">
                        <input
                          type="number"
                          min="0"
                          value={editPages}
                          onChange={(e) => setEditPages(e.target.value)}
                          onBlur={(e) => autoSaveSubjectDetails(editChapters, editProjects, editDays, e.target.value)}
                          className="h-10 w-full bg-transparent px-3 text-sm font-bold text-slate-800 outline-none"
                          placeholder="e.g. 150"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">Total course book or digital textbook pages.</p>
                    </div>
                  </div>
                </div>

                {/* Table of Contents Index Card */}
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-4">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                      <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                      Curriculum Outline
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quickly navigate the syllabus sections.</p>
                  </div>
                  
                  {editChapters.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2 text-center">No chapters created yet.</p>
                  ) : (
                    <div className="relative pl-3 space-y-4 border-l border-slate-100 max-h-[350px] overflow-y-auto pr-1">
                      {editChapters.map((c, cIdx) => {
                        const chapId = c._id || `idx_${cIdx}`;
                        const chapProjects = editProjects.filter(p => String(p.chapterId) === String(chapId));
                        return (
                          <div 
                            key={chapId}
                            onClick={() => {
                              const targetElement = document.getElementById(`chapter-card-${chapId}`);
                              if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                targetElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
                                setTimeout(() => {
                                  targetElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
                                }, 1500);
                              }
                            }}
                            className="group relative cursor-pointer hover:translate-x-1 transition-all duration-200"
                          >
                            {/* Marker dot */}
                            <span className="absolute -left-[17.5px] top-1 flex h-2 w-2 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors" />
                            
                            <div className="min-w-0">
                              <h5 className="text-xs font-extrabold text-slate-700 group-hover:text-indigo-600 truncate transition-colors leading-snug">
                                Chapter {cIdx + 1}: {c.name || c}
                              </h5>
                              <div className="flex gap-2 text-[9px] font-bold text-slate-400 mt-0.5">
                                <span className="bg-slate-100 text-slate-500 rounded px-1">Pages {c.startPage}-{c.endPage}</span>
                                <span className="bg-indigo-50/70 text-indigo-750 rounded px-1">{chapProjects.length} Project(s)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Legacy / Unassigned Projects Drawer Card */}
                {(() => {
                  const unassignedProjects = editProjects.filter(p => !p.chapterId || !editChapters.some(c => String(c._id || '') === String(p.chapterId)));
                  if (unassignedProjects.length > 0) {
                    return (
                      <div className="rounded-2xl border border-rose-250 bg-rose-50/10 p-4 shadow-sm space-y-3 border-l-4 border-l-rose-500">
                        <div className="flex items-center gap-2 border-b border-rose-100 pb-2">
                          <AlertCircle size={16} className="text-rose-600 animate-pulse" />
                          <h5 className="font-extrabold text-rose-800 text-xs uppercase tracking-wider">Unassigned Projects ({unassignedProjects.length})</h5>
                        </div>
                        <p className="text-[10px] text-rose-600 font-semibold leading-tight">These legacy projects are not mapped to any chapter. Assign them to a chapter below:</p>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {unassignedProjects.map((proj, projIdx) => {
                            const originalIdx = editProjects.findIndex(p => p === proj);
                            const isEditingProject = editingProjectIndex === originalIdx;

                            if (isEditingProject) {
                              return (
                                <div key={projIdx} className="flex flex-col gap-2 rounded-lg border border-indigo-400 bg-white p-2.5 shadow-sm">
                                  <select
                                    value={editingProjectChapterId}
                                    onChange={(e) => setEditingProjectChapterId(e.target.value)}
                                    className="h-8 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-755 outline-none focus:border-indigo-500 transition"
                                  >
                                    <option value="">-- Assign Chapter --</option>
                                    {editChapters.map((c, cIdx) => (
                                      <option key={c._id || cIdx} value={c._id || `idx_${cIdx}`}>
                                        Chapter {cIdx + 1}: {c.name || c}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingProjectName}
                                      onChange={(e) => setEditingProjectName(e.target.value)}
                                      onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEditProject(); }}
                                      className="h-8 flex-1 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
                                      placeholder="Project name..."
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={handleSaveEditProject}
                                        disabled={!editingProjectName.trim() || !editingProjectChapterId}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        onClick={handleCancelEditProject}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-655 hover:bg-slate-200 transition"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={projIdx} className="flex flex-col gap-2 rounded-lg bg-white border border-rose-100 p-2.5 shadow-sm hover:border-rose-350 transition">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-800 truncate">{proj.name || proj}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleStartEditProject(proj, originalIdx)}
                                      className="text-slate-400 hover:text-indigo-650 p-1 hover:bg-slate-50 rounded transition"
                                      title="Edit project"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveProject(originalIdx)}
                                      className="text-red-400 hover:text-red-655 p-1 hover:bg-red-50 rounded transition"
                                      title="Remove project"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Quick assign dropdown */}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase shrink-0">Assign to:</span>
                                  <select
                                    onChange={(e) => {
                                      const chapterId = e.target.value;
                                      if (chapterId) {
                                        const nextProjects = editProjects.map((p, idx) => {
                                          if (idx === originalIdx) {
                                            return { ...p, chapterId };
                                          }
                                          return p;
                                        });
                                        setEditProjects(nextProjects);
                                        autoSaveSubjectDetails(editChapters, nextProjects);
                                        toast.success(`Project assigned successfully`);
                                      }
                                    }}
                                    defaultValue=""
                                    className="h-6 flex-1 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-semibold text-slate-600 outline-none focus:border-indigo-500 transition"
                                  >
                                    <option value="" disabled>-- Select Chapter --</option>
                                    {editChapters.map((c, cIdx) => (
                                      <option key={c._id || cIdx} value={c._id || `idx_${cIdx}`}>
                                        Chapter {cIdx + 1}: {c.name || c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>

              {/* â•â•â• Right Column: Syllabus Workspace Builder â•â•â• */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Add New Chapter Form Card */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-white p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                      <Plus size={16} className="stroke-[3]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-wider text-emerald-800">Add New Chapter</h5>
                      <p className="text-[10px] text-emerald-600/80 font-medium">Every chapter creates Theory automatically; add Practical projects inside the chapter card.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Chapter Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Chapter 1: Introduction to Web Design"
                        value={newChapterName}
                        onChange={(e) => setNewChapterName(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleAddChapter(); }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-inner"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Start Page</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={newChapterStartPage}
                        onChange={(e) => setNewChapterStartPage(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleAddChapter(); }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-inner"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">End Page</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="20"
                        value={newChapterEndPage}
                        onChange={(e) => setNewChapterEndPage(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleAddChapter(); }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-inner"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleAddChapter}
                      disabled={!newChapterName.trim() || !newChapterStartPage || !newChapterEndPage}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-md active:scale-95 hover:shadow-lg"
                    >
                      <Plus size={14} className="stroke-[3]" /> Create Chapter
                    </button>
                  </div>
                </div>

                {/* Chapters list container */}
                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
                  {editChapters.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center p-6">
                      <FolderKanban size={40} className="text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-400">No chapters created yet.</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Fill in the form above and click "Create Chapter" to begin structuring your syllabus.</p>
                    </div>
                  ) : (
                    editChapters.map((chap, idx) => {
                      const isEditingChapter = editingChapterId === chap._id;
                      const chapId = chap._id || `idx_${idx}`;
                      const chapProjects = editProjects.filter(p => String(p.chapterId) === String(chapId));

                      // Calculate percentage placement for the visual page range track
                      const totalPages = Number(editPages) || 1;
                      const start = Number(chap.startPage) || 0;
                      const end = Number(chap.endPage) || 0;
                      const leftPercent = Math.max(0, Math.min(100, ((start - 1) / totalPages) * 100));
                      const widthPercent = Math.max(0, Math.min(100, ((end - start + 1) / totalPages) * 100));

                      return (
                        <div 
                          key={chapId} 
                          id={`chapter-card-${chapId}`}
                          className="bg-white rounded-2xl border border-slate-200/85 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden"
                        >
                          
                          {/* Chapter Card Header */}
                          {isEditingChapter ? (
                            <div className="bg-slate-50 p-4 border-b border-slate-100 space-y-3 border-l-4 border-l-indigo-600">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Editing Chapter {idx + 1}</span>
                              <input
                                type="text"
                                value={editingChapterName}
                                onChange={(e) => setEditingChapterName(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEditChapter(); }}
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition"
                                placeholder="Chapter title..."
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={editingChapterStartPage}
                                  onChange={(e) => setEditingChapterStartPage(e.target.value)}
                                  onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEditChapter(); }}
                                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition"
                                  placeholder="Start Page"
                                />
                                <input
                                  type="number"
                                  value={editingChapterEndPage}
                                  onChange={(e) => setEditingChapterEndPage(e.target.value)}
                                  onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEditChapter(); }}
                                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition"
                                  placeholder="End Page"
                                />
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={handleSaveEditChapter}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                                    title="Save Changes"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancelEditChapter}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 transition shadow-sm"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4 bg-slate-50/80 border-b border-slate-100 px-4 py-3.5 border-l-4 border-l-indigo-600">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 shadow-sm">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate" title={chap.name || chap}>
                                    {chap.name || chap}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-indigo-50/70 text-indigo-755 rounded px-1.5 py-0.5">
                                      <BookOpen size={9} /> Pages {chap.startPage !== undefined ? `${chap.startPage} â€“ ${chap.endPage}` : '0 â€“ 0'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-100/60 text-emerald-800 rounded px-1.5 py-0.5">
                                      <ListTodo size={9} /> {chapProjects.length} Practical{chapProjects.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleStartEditChapter(chap)}
                                  className="text-slate-400 hover:text-indigo-650 p-1.5 hover:bg-slate-200/50 rounded-md transition"
                                  title="Edit chapter details"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleRemoveChapter(idx)}
                                  className="text-red-400 hover:text-red-655 p-1.5 hover:bg-red-50 rounded-md transition"
                                  title="Delete chapter"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Visual Page Range Progress Bar */}
                          {Number(editPages) > 0 && !isEditingChapter && (
                            <div className="px-4 py-2 bg-slate-50/30 border-b border-slate-100">
                              <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
                                <div 
                                  className="absolute h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold uppercase mt-1">
                                <span>Page {start}</span>
                                <span className="text-indigo-600 font-black">{end - start + 1} pages total ({Math.round(widthPercent)}%)</span>
                                <span>Page {end}</span>
                              </div>
                            </div>
                          )}

                          {/* Theory + Practical layout inside Chapter Card */}
                          <div className="p-4 bg-white space-y-4">
                            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="block text-[9px] font-black uppercase tracking-wider text-sky-600">
                                    Theory
                                  </span>
                                  <p className="mt-1 truncate text-xs font-bold text-slate-800">
                                    {chap.name || chap}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-sky-700">
                                  Display only
                                </span>
                              </div>
                            </div>

                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-700">
                                  Practical Projects ({chapProjects.length})
                                </span>
                                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black text-emerald-700">
                                  Add projects here
                                </span>
                              </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {chapProjects.length > 0 ? (
                                chapProjects.map((proj, projIdx) => {
                                  const originalIdx = editProjects.findIndex(p => p === proj);
                                  const isEditingProject = editingProjectIndex === originalIdx;

                                  if (isEditingProject) {
                                    return (
                                      <div key={projIdx} className="col-span-full flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/30 p-3 shadow-inner">
                                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Move to Chapter</span>
                                        <select
                                          value={editingProjectChapterId}
                                          onChange={(e) => setEditingProjectChapterId(e.target.value)}
                                          className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition"
                                        >
                                          {editChapters.map((c, cIdx) => (
                                            <option key={c._id || cIdx} value={c._id || `idx_${cIdx}`}>
                                              Chapter {cIdx + 1}: {c.name || c}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={editingProjectName}
                                            onChange={(e) => setEditingProjectName(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEditProject(); }}
                                            className="h-8 flex-1 rounded border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition"
                                            placeholder="Project name..."
                                          />
                                          <div className="flex gap-1">
                                            <button
                                              onClick={handleSaveEditProject}
                                              disabled={!editingProjectName.trim() || !editingProjectChapterId}
                                              className="inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                              title="Save Changes"
                                            >
                                              <Check size={14} />
                                            </button>
                                            <button
                                              onClick={handleCancelEditProject}
                                              className="inline-flex h-8 w-8 items-center justify-center rounded bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 transition"
                                              title="Cancel"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div 
                                      key={projIdx} 
                                      className="group/item flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-200 transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 group-hover/item:bg-indigo-500 group-hover/item:text-white transition-all">
                                          <FolderKanban size={10} />
                                        </div>
                                        <span className="truncate text-slate-800 font-bold">{proj.name || proj}</span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-all duration-200">
                                        <button
                                          onClick={() => handleStartEditProject(proj, originalIdx)}
                                          className="text-slate-400 hover:text-indigo-655 p-1 hover:bg-white rounded transition shadow-sm border border-transparent hover:border-slate-200"
                                          title="Edit project"
                                        >
                                          <Edit3 size={11} />
                                        </button>
                                        <button
                                          onClick={() => handleRemoveProject(originalIdx)}
                                          className="text-red-400 hover:text-red-655 p-1 hover:bg-red-50 rounded transition shadow-sm border border-transparent hover:border-red-100"
                                          title="Remove project"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[10px] text-slate-400 italic px-1.5 py-0.5 col-span-full">No practical projects added under this chapter.</p>
                              )}
                            </div>

                            {/* Direct Project Addition Form under Chapter Card */}
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                              <input
                                type="text"
                                placeholder={`New project name...`}
                                value={newProjectNames[chapId] || ''}
                                onChange={(e) => setNewProjectNames(prev => ({ ...prev, [chapId]: e.target.value }))}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleAddProjectForChapter(chapId); }}
                                className="h-8 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition shadow-inner"
                              />
                              <button
                                onClick={() => handleAddProjectForChapter(chapId)}
                                disabled={!(newProjectNames[chapId] || '').trim()}
                                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-900 transition disabled:opacity-50 shrink-0 shadow-sm active:scale-95"
                              >
                                <Plus size={12} className="stroke-[2.5]" /> Add Practical
                              </button>
                            </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                onClick={handleBack}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-655 hover:bg-slate-100 transition shadow-sm active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubjectDetails}
                disabled={saveLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-70 shadow-md active:scale-95"
              >
                {saveLoading && <RefreshCw size={12} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        TEACHER MANAGEMENT MODAL
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
    {teacherModalOpen && teacherModalSubject && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(15,23,42,0.65)'}}>
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

          {/* Modal Header */}
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
                <UserCheck size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100">Teacher Management</p>
                <h3 className="text-base font-black text-white truncate">{teacherModalSubject.name}</h3>
              </div>
            </div>
            <button
              onClick={() => { setTeacherModalOpen(false); setTeacherModalSubject(null); }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-white hover:bg-white/30 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Context info bar */}
          <div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Layers size={12} className="text-indigo-400" />
              Batch: <span className="text-slate-800">{selectedBatch?.name || 'â€”'}</span>
            </span>
            <span className="text-slate-200">|</span>
            <span className="flex items-center gap-1.5">
              <GraduationCap size={12} className="text-emerald-500" />
              Course: <span className="text-slate-800">{selectedCourse?.name || 'â€”'}</span>
            </span>
            <span className="text-slate-200">|</span>
            <span className="flex items-center gap-1.5">
              <BookOpenCheck size={12} className="text-indigo-500" />
              Subject: <span className="text-indigo-700">{teacherModalSubject.name}</span>
            </span>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* â”€â”€ Assign New Teacher â”€â”€ */}
            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Assign Teacher</h4>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition"
                  >
                    <option value="">â€” Select Active Teacher â€”</option>
                    {activeTeachers.length === 0 && (
                      <option disabled>No teachers found (check employee type)</option>
                    )}
                    {activeTeachers.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.name} {t.type ? `(${t.type})` : ''}
                      </option>
                    ))}
                  </select>
                  <UserPlus size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  onClick={handleAssignTeacher}
                  disabled={teacherSaving || !selectedTeacherId}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60 shrink-0"
                >
                  {teacherSaving ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Assign
                </button>
              </div>
            </div>

            {/* â”€â”€ Current Assignments â”€â”€ */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Assigned Teachers</h4>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                  {assignedTeachers.length} Teacher{assignedTeachers.length !== 1 ? 's' : ''}
                </span>
              </div>

              {teacherLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" /> Loading assignments...
                </div>
              ) : assignedTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <UserCheck size={36} className="text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-400">No teachers assigned yet</p>
                  <p className="text-xs font-semibold text-slate-300 mt-1">Use the dropdown above to assign a teacher</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedTeachers.map((t, idx) => (
                    <div
                      key={t.employeeId || idx}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-emerald-100 hover:shadow transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 font-black text-sm">
                          {t.employeeName?.charAt(0)?.toUpperCase() || 'T'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-800">{t.employeeName}</p>
                          <p className="text-xs font-semibold text-slate-400">{t.employeeType || 'Teacher'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveTeacherAssignment(t)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition"
                        title="Remove assignment"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              onClick={() => { setTeacherModalOpen(false); setTeacherModalSubject(null); }}
              className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* STANDALONE TEACHER ACCESS MODAL (header button) */}
    {saOpen && (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" style={{background: 'rgba(15,23,42,0.70)'}}>
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col mb-10">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 to-teal-500 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
                <UserCheck size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100">Super Admin</p>
                <h3 className="text-base font-black text-white">Manage Teacher Access</h3>
              </div>
            </div>
            <button onClick={() => setSaOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-white hover:bg-white/30 transition">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">

            {/* Teacher */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">1. Select Active Teacher</label>
              <select value={saTeacherId} onChange={e => setSaTeacherId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition">
                <option value="">â€” Select Teacher â€”</option>
                {activeTeachers.length === 0 && <option disabled>No Faculty employees found (check employee type = Faculty)</option>}
                {activeTeachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">2. Select Batch</label>
              <select value={saBatchId} onChange={e => { setSaBatchId(e.target.value); setSaCourseId(''); setSaSubjectId(''); setSaAssignments([]); }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition">
                <option value="">â€” Select Batch â€”</option>
                {allBatches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${!saBatchId ? 'text-slate-300' : 'text-slate-500'}`}>3. Select Course</label>
              <select value={saCourseId} onChange={e => { setSaCourseId(e.target.value); setSaSubjectId(''); setSaAssignments([]); }} disabled={!saBatchId}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">â€” Select Course â€”</option>
                {saFilteredCourses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {saBatchId && saFilteredCourses.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-amber-600">No active courses found in this batch.</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${!saCourseId ? 'text-slate-300' : 'text-slate-500'}`}>4. Select Subject</label>
              <select value={saSubjectId} onChange={e => setSaSubjectId(e.target.value)} disabled={!saCourseId}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">â€” Select Subject â€”</option>
                {saFilteredSubjects.map(s => <option key={s.subject._id} value={s.subject._id}>{s.subject.name}</option>)}
              </select>
            </div>

            {/* Assign Button */}
            <button onClick={handleSaAssign} disabled={saSaving || !saTeacherId || !saBatchId || !saCourseId || !saSubjectId}
              className="inline-flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saSaving ? <RefreshCw size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Assign Teacher to Subject
            </button>

            {/* Current Assignments */}
            {saSubjectId && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Assigned Teachers for this Subject</h4>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">{saAssignments.length} Teacher{saAssignments.length !== 1 ? 's' : ''}</span>
                </div>
                {saLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 text-sm font-semibold"><RefreshCw size={16} className="animate-spin mr-2" /> Loading...</div>
                ) : saAssignments.length === 0 ? (
                  <div className="py-6 text-center text-sm font-bold text-slate-400">No teachers assigned yet.</div>
                ) : (
                  <div className="space-y-2">
                    {saAssignments.map((t, idx) => (
                      <div key={t.employeeId || idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 font-black text-sm">
                            {t.employeeName?.charAt(0)?.toUpperCase() || 'T'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">{t.employeeName}</p>
                            <p className="text-xs font-semibold text-slate-400">{t.employeeType || 'Faculty'}</p>
                          </div>
                        </div>
                        <button onClick={() => handleSaRemove(t)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition" title="Remove">
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
            <button onClick={() => setSaOpen(false)} className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* STUDENT SYLLABUS PROGRESS MODAL */}
    {viewProgressStudent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-start justify-between">
            <div>
              <span className="inline-block rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-300">
                Student Syllabus Progress
              </span>
              <h3 className="text-xl font-black mt-1 text-white">
                {viewProgressStudent.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>Enrollment No: <strong className="text-white">{viewProgressStudent.enrollmentNo || 'â€”'}</strong></span>
                <span>Course: <strong className="text-white">{selectedCourse?.name || 'â€”'}</strong></span>
                <span>Subject: <strong className="text-white">{selectedSubject?.name || 'â€”'}</strong></span>
              </p>
            </div>
            <button
              onClick={() => setViewProgressStudent(null)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {isModalLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-indigo-600 font-bold gap-3">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <span>Fetching progress data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quick summary stats card */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-white border border-slate-200 p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-indigo-700">
                      {chaptersLogged}
                      <span className="text-base font-semibold text-slate-400">/{subjectChapters.length}</span>
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Chapters Completed</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-violet-700">
                      {projectsLogged}
                      <span className="text-base font-semibold text-slate-400">/{subjectProjects.length}</span>
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Projects Completed</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-4 text-center shadow-sm col-span-2 sm:col-span-2">
                    <p className="text-xs font-bold text-slate-500 mb-2">Overall Progress Completion</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                          style={{ 
                            width: `${
                              subjectChapters.length > 0 
                                ? Math.round((chaptersLogged / subjectChapters.length) * 100) 
                                : 0
                            }%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-extrabold text-slate-700">
                        {subjectChapters.length > 0 
                          ? Math.round((chaptersLogged / subjectChapters.length) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Split layout: Chapters on left, Projects on right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chapters Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
                    <h4 className="font-black text-slate-900 text-base mb-4 flex items-center gap-2">
                      <BookMarked className="text-indigo-600" size={18} /> Chapters Syllabus
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Chapter Name</th>
                            <th className="px-3 py-2">Pages</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subjectChapters.map((ch, idx) => {
                            const isDone = completedChIds.includes(String(ch._id));
                            return (
                              <tr 
                                key={ch._id} 
                                className={`transition-colors ${
                                  isDone ? 'bg-emerald-50/40 text-emerald-950 font-semibold' : 'text-slate-600'
                                }`}
                              >
                                <td className="px-3 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-3 font-bold">{ch.name}</td>
                                <td className="px-3 py-3 text-slate-500">
                                  {ch.startPage || ch.endPage ? `p. ${ch.startPage || 0} - ${ch.endPage || 0}` : 'â€”'}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 size={10} /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-500 border border-slate-200">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {subjectChapters.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 font-bold">No chapters defined.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Projects Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
                    <h4 className="font-black text-slate-900 text-base mb-4 flex items-center gap-2">
                      <FolderCheck className="text-violet-600" size={18} /> Projects Tracker
                    </h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Project Name</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subjectProjects.map((proj, idx) => {
                            const isDone = completedProjIds.includes(String(proj._id));
                            return (
                              <tr 
                                key={proj._id} 
                                className={`transition-colors ${
                                  isDone ? 'bg-emerald-50/40 text-emerald-950 font-semibold' : 'text-slate-600'
                                }`}
                              >
                                <td className="px-3 py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-3 font-bold">{proj.name}</td>
                                <td className="px-3 py-3 text-center">
                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                                      <CheckCircle2 size={16} /> Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                                      <Circle size={16} className="text-slate-350" /> Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {subjectProjects.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-slate-400 font-bold">No projects defined.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end">
            <button
              onClick={() => setViewProgressStudent(null)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              Close View
            </button>
          </div>
        </div>
      </div>
    )}
        </div>
      </div>
    </div>
    </>
  );
};

export default SyllabusManagement;


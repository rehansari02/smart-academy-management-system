import React, { useEffect, useState, useMemo } from 'react';
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
  BookOpenCheck,
  Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { getBranches } from '../../../features/master/branchSlice';
import { fetchBatches, fetchCourses } from '../../../features/master/masterSlice';

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

const getStudentStartDate = (student) => {
  const date = moment(student?.batchStartDate || student?.admissionDate);
  return date.isValid() ? date.startOf('day') : null;
};

const getCourseEndDate = (student, holidaysList = [], studentBranchId = null) => {
  const duration = Number(student?.courseDuration || 0);
  const startDate = getStudentStartDate(student);
  if (!startDate) return null;
  if (!duration) return startDate;

  const durationType = String(student?.courseDurationType || 'Month').toLowerCase();
  
  // Calculate total class days based on duration type
  let durationDays = 0;
  if (durationType.startsWith('year')) {
    durationDays = duration * 365;
  } else if (durationType.startsWith('day')) {
    durationDays = duration;
  } else {
    // Default to month -> 30 class days per month
    durationDays = duration * 30;
  }

  let currentDate = startDate.clone();
  let classDaysCount = 0;

  // Count exactly durationDays open days
  while (classDaysCount < durationDays) {
    if (!isClosedDay(currentDate, holidaysList, studentBranchId)) {
      classDaysCount++;
    }
    if (classDaysCount < durationDays) {
      currentDate.add(1, 'day');
    }
  }

  return currentDate;
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

  // Count open class days from max(today, start) to end
  let currentDate = today.isAfter(start) ? today.clone() : start.clone();
  let remainingCount = 0;

  while (currentDate.isSameOrBefore(end, 'day')) {
    if (!isClosedDay(currentDate, holidaysList, studentBranchId)) {
      remainingCount++;
    }
    currentDate.add(1, 'day');
  }

  if (remainingCount === 0) {
    return { text: 'Completed', colorClass: 'bg-rose-50 text-rose-700' };
  } else if (remainingCount === 1 && today.isSame(end, 'day')) {
    return { text: 'Ends Today', colorClass: 'bg-amber-50 text-amber-700' };
  } else {
    return { text: `${remainingCount} day(s) remaining`, colorClass: 'bg-blue-50 text-blue-700' };
  }
};

const SyllabusManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const params = useParams();
  const branchId = decodeId(params.branchId);
  const batchId = decodeId(params.batchId);
  const courseId = decodeId(params.courseId);
  const subjectId = decodeId(params.subjectId);

  // Redux state
  const { branches, isLoading: branchesLoading } = useSelector((state) => state.branch);
  const { batches, courses, isLoading: masterLoading } = useSelector((state) => state.master);

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
  const [saveLoading, setSaveLoading] = useState(false);

  // Student list state (Level 5)
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearchQuery, setStudentsSearchQuery] = useState('');
  const [holidays, setHolidays] = useState([]);

  // Determine current step based on route parameters
  const step = useMemo(() => {
    if (!branchId) return 1; // Level 1: Branch list
    if (!batchId) return 2;  // Level 2: Batch list
    if (!courseId) return 3; // Level 3: Course list
    if (window.location.pathname.endsWith('/edit') || window.location.pathname.includes('/edit')) {
      return 6; // Level 6: Edit Subject page
    }
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
    return courses.find(c => c._id === courseId) || null;
  }, [courses, courseId]);

  const selectedSubject = useMemo(() => {
    if (!selectedCourse) return null;
    const subObj = (selectedCourse.subjects || []).find(s => s.subject?._id === subjectId);
    return subObj?.subject || null;
  }, [selectedCourse, subjectId]);

  // Fetch branches and all courses on mount
  useEffect(() => {
    dispatch(getBranches());
    dispatch(fetchCourses());
  }, [dispatch]);

  // Fetch batches when branchId parameter changes
  useEffect(() => {
    if (branchId) {
      dispatch(fetchBatches({ branchId }));
    }
  }, [branchId, dispatch]);

  // Initialize edit fields when step is 6 (Edit Subject Page)
  useEffect(() => {
    if (step === 6 && selectedSubject) {
      setEditDays(selectedSubject.daysToComplete || 0);
      setEditPages(selectedSubject.totalPages || 0);
      setEditProjects(selectedSubject.projects || []);
      setNewProjectName('');
      setEditChapters(selectedSubject.chapters || []);
      setNewChapterName('');
    }
  }, [step, selectedSubject]);

  // Fetch student list when step is 5 (Student list page)
  useEffect(() => {
    const fetchStudentsForActiveSubject = async () => {
      // Wait until selectedBatch is resolved. On hard refresh, batches load async from Redux.
      // If selectedBatch is still null/undefined, the batch filter would be missing,
      // causing ALL students to be returned instead of only those in this batch.
      if (step === 5 && batchId && selectedBatch?.name) {
        setStudentsLoading(true);
        setStudentsSearchQuery('');
        setStudentsList([]);
        try {
          // 1. Fetch holidays/closed dates
          const holidaysRes = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/attendance/manage`, {
            params: { limit: 1000 },
            withCredentials: true
          });
          const holidaysList = holidaysRes.data?.items || [];

          // 2. Fetch students of the current batch and course using the general students API
          // to match the count and visibility seen in the register reports.
          const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/students`, {
            params: {
              branchId: branchId || undefined,
              courseFilter: courseId || undefined,
              batch: selectedBatch.name,
              isActive: 'true',
              registrationPaidOrRegistered: 'true',
              pageSize: 1000
            },
            withCredentials: true
          });

          const studentsData = data?.students || [];
          const mapped = studentsData.map(s => ({
            _id: s._id,
            enrollmentNo: s.enrollmentNo || s.regNo || '',
            name: `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`,
            firstName: s.firstName,
            middleName: s.middleName,
            lastName: s.lastName,
            courseName: s.course ? s.course.name : '',
            contactStudent: s.mobileStudent,
            contactParent: s.mobileParent,
            admissionDate: s.admissionDate,
            batchStartDate: s.batchStartDate,
            courseDuration: s.course?.duration,
            courseDurationType: s.course?.durationType,
          }));

          setStudentsList(mapped);
          setHolidays(holidaysList);
        } catch (error) {
          console.error("Failed to load students", error);
          toast.error("Failed to load students");
        } finally {
          setStudentsLoading(false);
        }
      }
    };

    fetchStudentsForActiveSubject();
  }, [step, batchId, courseId, branchId, selectedBatch?.name]);

  const loading = branchesLoading || masterLoading || studentsLoading;

  // (Selected object lookups moved above to prevent initialization reference error)

  // Filtered lists based on search query
  const filteredBranches = useMemo(() => {
    if (step !== 1) return [];
    return branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [branches, searchQuery, step]);

  const filteredBatches = useMemo(() => {
    if (step !== 2) return [];
    return batches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [batches, searchQuery, step]);

  const filteredCourses = useMemo(() => {
    if (step !== 3 || !selectedBatch) return [];
    
    // Only show courses that have at least 1 active enrolled student in this batch.
    // courseCounts is keyed by courseId and comes from real student data aggregated on the backend.
    const activeCourseIds = new Set(
      Object.keys(selectedBatch.courseCounts || {}).filter(
        cId => (selectedBatch.courseCounts[cId] || 0) > 0
      )
    );

    return courses.filter(c => 
      activeCourseIds.has(c._id.toString()) && 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, selectedBatch, searchQuery, step]);

  const filteredSubjects = useMemo(() => {
    if (step !== 4 || !selectedCourse) return [];
    const subList = selectedCourse.subjects || [];
    return subList
      .filter(s => s.subject && s.subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [selectedCourse, searchQuery, step]);

  // Filter students based on search string and selected course name
  const filteredStudents = useMemo(() => {
    if (step !== 5 || !selectedCourse) return [];
    
    // Filter students by matching the active course name (case-insensitive & trimmed)
    let list = studentsList.filter(s => 
      s.courseName?.toLowerCase().trim() === selectedCourse.name?.toLowerCase().trim()
    );

    if (studentsSearchQuery.trim()) {
      const q = studentsSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.enrollmentNo || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [studentsList, selectedCourse, studentsSearchQuery, step]);

  // Handle drill-down clicks (navigating via URL parameters)
  const handleBranchClick = (branch) => {
    setSearchQuery('');
    navigate(`/utility/syllabus-management/${encodeId(branch._id)}`);
  };

  const handleBatchClick = (batch) => {
    setSearchQuery('');
    navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batch._id)}`);
  };

  const handleCourseClick = (course) => {
    setSearchQuery('');
    navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(course._id)}`);
  };

  const handleStudentsPageClick = (sub) => {
    setSearchQuery('');
    navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(sub.subject._id)}/students`);
  };

  const handleEditPageClick = (sub) => {
    setSearchQuery('');
    navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}/${encodeId(sub.subject._id)}/edit`);
  };

  // Back button navigation using Router
  const handleBack = () => {
    setSearchQuery('');
    if (step === 6) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
    } else if (step === 5) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
    } else if (step === 4) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}`);
    } else if (step === 3) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}`);
    } else if (step === 2) {
      navigate('/utility/syllabus-management');
    } else {
      navigate('/home');
    }
  };

  // Breadcrumbs jump helper
  const navigateToStep = (targetStep) => {
    setSearchQuery('');
    if (targetStep === 1) {
      navigate('/utility/syllabus-management');
    } else if (targetStep === 2) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}`);
    } else if (targetStep === 3) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}`);
    } else if (targetStep === 4) {
      navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
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

  // Add project to subject edit list
  const handleAddProject = () => {
    if (newProjectName.trim()) {
      setEditProjects(prev => [...prev, newProjectName.trim()]);
      setNewProjectName('');
    }
  };

  // Delete project from subject edit list
  const handleRemoveProject = (index) => {
    setEditProjects(prev => prev.filter((_, idx) => idx !== index));
  };

  // Add chapter to subject edit list
  const handleAddChapter = () => {
    if (newChapterName.trim()) {
      setEditChapters(prev => [...prev, newChapterName.trim()]);
      setNewChapterName('');
    }
  };

  // Delete chapter from subject edit list
  const handleRemoveChapter = (index) => {
    setEditChapters(prev => prev.filter((_, idx) => idx !== index));
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
        navigate(`/utility/syllabus-management/${encodeId(branchId)}/${encodeId(batchId)}/${encodeId(courseId)}`);
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

  return (
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
              <span className="text-primary font-black truncate max-w-[150px]">
                {selectedSubject.name} Enrolled Students
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
                        <p className="mt-0.5 text-emerald-600 font-extrabold">₹{course.courseFees}</p>
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
                                      {projectList.length > 0 && (
                                        <button 
                                          onClick={() => toggleSubjectExpanded(subId)}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                        >
                                          {isExpanded ? 'Hide Projects' : `Show Projects (${projectList.length})`}
                                        </button>
                                      )}
                                      {chapterList.length > 0 && (
                                        <button 
                                          onClick={() => toggleChaptersExpanded(subId)}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-650 hover:underline"
                                        >
                                          {isChaptersExpanded ? 'Hide Chapters' : `Show Chapters (${chapterList.length})`}
                                        </button>
                                      )}
                                    </div>
                                  </div>
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
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditPageClick(sub)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                      title="Edit Subject parameters"
                                    >
                                      <Edit3 size={12} /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleStudentsPageClick(sub)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition"
                                      title="View enrolled students"
                                    >
                                      <Users size={12} /> Students
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Accordion dropdown row for projects */}
                              {isExpanded && projectList.length > 0 && (
                                <tr className="bg-slate-50/50">
                                  <td />
                                  <td colSpan={6} className="py-3 px-4 border-l-2 border-primary">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Project List</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {projectList.map((pName, pIdx) => (
                                          <div key={pIdx} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 text-xs font-bold text-slate-700 shadow-sm">
                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-500">{pIdx + 1}</span>
                                            <span className="truncate">{pName}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* Accordion dropdown row for chapters */}
                              {isChaptersExpanded && chapterList.length > 0 && (
                                <tr className="bg-slate-50/50">
                                  <td />
                                  <td colSpan={6} className="py-3 px-4 border-l-2 border-emerald-500">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Chapter List (Theory)</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {chapterList.map((cName, cIdx) => (
                                          <div key={cIdx} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 text-xs font-bold text-slate-700 shadow-sm">
                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-50 text-[10px] font-black text-emerald-600">{cIdx + 1}</span>
                                            <span className="truncate">{cName}</span>
                                          </div>
                                        ))}
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

          {/* LEVEL 5: ENROLLED STUDENTS LIST (DEDICATED PAGE) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Users className="text-indigo-600" /> Active Enrolled Students
                    </h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="font-black text-slate-800">
                        Course: <span className="text-emerald-700 font-extrabold">{selectedCourse?.name || 'Unassigned Course'}</span>
                      </p>
                      <p className="font-bold text-slate-600">
                        Subject: <span className="text-indigo-700">"{selectedSubject?.name || 'Unnamed Subject'}"</span>
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        Batch: {selectedBatch?.name || 'Unassigned Batch'}
                      </p>
                    </div>
                  </div>
                  <span className="self-start rounded-xl bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    {filteredStudents.length} Active Student(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {studentsLoading || (step === 5 && !selectedBatch) ? (
                    <div className="py-12 text-center font-bold text-slate-500">
                      <RefreshCw className="mr-2 inline-block animate-spin" size={18} /> Loading students...
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-50/70">
                          <th className="py-3.5 px-4 w-16">Sr No</th>
                          <th className="py-3.5 px-4">Student Name</th>
                          <th className="py-3.5 px-4">Course Duration</th>
                          <th className="py-3.5 px-4">Days Remaining</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                        {filteredStudents.map((student, index) => {
                          const startDate = getStudentStartDate(student);
                          const endDate = getCourseEndDate(student, holidays, branchId);
                          const remaining = getDaysRemainingText(student, holidays, branchId);

                          return (
                            <tr key={student._id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-mono font-bold text-slate-500">
                                {index + 1}
                              </td>
                              <td className="py-3 px-4 font-black text-slate-900">
                                {student.name}
                              </td>
                              <td className="py-3 px-4 text-xs font-bold text-slate-600">
                                {startDate ? startDate.format('DD-MM-YYYY') : '-'} to {endDate ? endDate.format('DD-MM-YYYY') : '-'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${remaining.colorClass}`}>
                                  {remaining.text}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block rounded px-2.5 py-0.5 text-xs font-black bg-emerald-100 text-emerald-800">
                                  Active
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-16 text-center text-sm font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      <Users size={48} className="text-slate-300 mx-auto mb-2" />
                      No active students found matching the attendance criteria.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* LEVEL 6: EDIT SUBJECT PARAMETERS */}
      {step === 6 && selectedSubject && (
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Header Section */}
            <div className="border-b border-slate-100 pb-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Editing Subject Parameters</span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">{selectedSubject.name}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Course: <span className="text-slate-600 font-bold">{selectedCourse?.name}</span> | Batch: <span className="text-slate-600 font-bold">{selectedBatch?.name}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSubjectDetails}
                    disabled={saveLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/95 transition disabled:opacity-70 shadow-sm"
                  >
                    {saveLoading && <RefreshCw size={12} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Subject Info & Main Stats */}
              <div className="space-y-6 lg:border-r lg:border-slate-100 lg:pr-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Syllabus Parameters</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Days to Complete</label>
                      <div className="relative rounded-lg border border-slate-200 bg-slate-50 focus-within:border-primary/50 focus-within:bg-white transition-all duration-200">
                        <input
                          type="number"
                          min="0"
                          value={editDays}
                          onChange={(e) => setEditDays(e.target.value)}
                          className="h-10 w-full bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Number of calendar days recommended to teach this subject.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Total Pages</label>
                      <div className="relative rounded-lg border border-slate-200 bg-slate-50 focus-within:border-primary/50 focus-within:bg-white transition-all duration-200">
                        <input
                          type="number"
                          min="0"
                          value={editPages}
                          onChange={(e) => setEditPages(e.target.value)}
                          className="h-10 w-full bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Total textbook or curriculum pages.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-3">
                  <h5 className="text-[11px] font-black uppercase tracking-wide text-slate-500">Summary statistics</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-200/50">
                      <p className="text-[10px] font-bold text-slate-400">Total Projects</p>
                      <p className="text-xl font-black text-primary mt-0.5">{editProjects.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200/50">
                      <p className="text-[10px] font-bold text-slate-400">Total Chapters</p>
                      <p className="text-xl font-black text-emerald-605 mt-0.5">{editChapters.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Projects List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Projects List ({editProjects.length})</h4>
                </div>

                {/* Add new project */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddProject(); }}
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 outline-none focus:border-primary/50 focus:bg-white transition"
                  />
                  <button
                    onClick={handleAddProject}
                    className="inline-flex h-10 items-center gap-1 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Project items list */}
                <div className="max-h-[350px] overflow-y-auto rounded-lg border border-slate-150 p-2.5 bg-slate-50 space-y-1.5">
                  {editProjects.length > 0 ? (
                    editProjects.map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 p-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-200 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-500">{idx + 1}</span>
                          <span className="truncate font-bold">{proj}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveProject(idx)}
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="Remove project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-xs font-semibold text-slate-400 bg-white rounded-lg border border-slate-150/50">
                      No projects added yet. Use input above.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Chapters List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Chapters List (Theory) ({editChapters.length})</h4>
                </div>

                {/* Add new chapter */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter chapter name..."
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddChapter(); }}
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 outline-none focus:border-primary/50 focus:bg-white transition"
                  />
                  <button
                    onClick={handleAddChapter}
                    className="inline-flex h-10 items-center gap-1 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Chapter items list */}
                <div className="max-h-[350px] overflow-y-auto rounded-lg border border-slate-150 p-2.5 bg-slate-50 space-y-1.5">
                  {editChapters.length > 0 ? (
                    editChapters.map((chap, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 p-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-200 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-50 text-[10px] font-black text-emerald-600">{idx + 1}</span>
                          <span className="truncate font-bold">{chap}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveChapter(idx)}
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="Remove chapter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-xs font-semibold text-slate-400 bg-white rounded-lg border border-slate-150/50">
                      No chapters added yet. Use input above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={handleBack}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubjectDetails}
                disabled={saveLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-xs font-bold text-white hover:bg-primary/95 transition disabled:opacity-70 shadow-sm"
              >
                {saveLoading && <RefreshCw size={12} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusManagement;

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import { fetchStudents } from '../../../features/student/studentSlice';
import { fetchBatches, fetchBranches, fetchCourses, fetchExamSchedules } from '../../../features/master/masterSlice';
import { fetchEmployees } from '../../../features/employee/employeeSlice';
import { Printer, Search, Loader2, RefreshCw, Users, CalendarDays, Clock3, Building2 } from 'lucide-react';
import StudentSearch from '../../../components/StudentSearch';
import logo from '../../../assets/logo2.png';

const getStudentStartDate = (student) => {
    const date = moment(student?.registrationDate || student?.admissionDate || student?.batchStartDate);
    return date.isValid() ? date.startOf('day') : null;
};

const getCourseEndDate = (student) => {
    const duration = Number(student?.course?.duration || 0);
    const startDate = getStudentStartDate(student);
    if (!duration || !startDate) return null;

    const durationType = String(student?.course?.durationType || 'Month').toLowerCase();
    const endDate = startDate.clone();

    if (durationType.startsWith('year')) {
        endDate.add(duration, 'years');
    } else if (durationType.startsWith('day')) {
        endDate.add(duration, 'days');
    } else {
        endDate.add(duration, 'months');
    }

    return endDate.endOf('day');
};

const BatchWiseRegister = () => {
    const dispatch = useDispatch();
    const componentRef = useRef();
    
    const { students, isLoading: studentsLoading } = useSelector((state) => state.students);
    const { batches, branches, courses, examSchedules, isLoading: batchesLoading } = useSelector((state) => state.master);
    const { employees } = useSelector((state) => state.employees);
    const { user } = useSelector((state) => state.auth);
    const userBranchId = typeof user?.branchId === 'object' ? user?.branchId?._id : user?.branchId;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        courseFilter: '',
        branchId: userBranchId || '',
        studentName: '',
        batch: 'All',
        reference: '',
        isRegistered: 'true'
    });

    const [showReport, setShowReport] = useState(true);

    const reportPeriod = useMemo(() => ({
        start: moment(filters.startDate || new Date()).startOf(filters.startDate ? 'day' : 'month'),
        end: moment(filters.endDate || new Date()).endOf(filters.endDate ? 'day' : 'month')
    }), [filters.startDate, filters.endDate]);

    const firstExamDateByStudentId = useMemo(() => {
        const map = {};

        (examSchedules || []).forEach((schedule) => {
            if (schedule?.isDeleted || schedule?.isActive === false) return;

            const dates = (schedule.timeTable || [])
                .map((item) => moment(item?.date).startOf('day'))
                .filter((date) => date.isValid());

            if (dates.length === 0) return;

            const firstDate = moment.min(dates);
            (schedule.attendees || []).forEach((attendee) => {
                const studentId = typeof attendee === 'object' ? attendee?._id : attendee;
                if (!studentId) return;

                if (!map[studentId] || firstDate.isBefore(map[studentId], 'day')) {
                    map[studentId] = firstDate.clone();
                }
            });
        });

        return map;
    }, [examSchedules]);

    const eligibleStudents = useMemo(() => {
        if (!students?.length) return [];

        return students.filter((student) => {
            const studentStartDate = getStudentStartDate(student);
            if (studentStartDate && studentStartDate.isAfter(reportPeriod.end, 'day')) return false;

            const courseEndDate = getCourseEndDate(student);
            const examDate = firstExamDateByStudentId[student._id];
            const examCutoffDate = examDate ? examDate.clone().subtract(1, 'day').endOf('day') : null;
            const eligibilityEndDate = [courseEndDate, examCutoffDate]
                .filter(Boolean)
                .reduce((earliest, date) => (!earliest || date.isBefore(earliest) ? date : earliest), null);

            return !eligibilityEndDate || !eligibilityEndDate.isBefore(reportPeriod.start, 'day');
        });
    }, [students, firstExamDateByStudentId, reportPeriod]);

    const groupedData = useMemo(() => {
        if (!eligibleStudents?.length) return {};

        const groups = {};
        eligibleStudents.forEach(student => {
            const bName = student.batch || 'Unassigned';
            if (!groups[bName]) groups[bName] = [];
            groups[bName].push(student);
        });

        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => {
            if (a.toLowerCase().includes('general')) return 1;
            if (b.toLowerCase().includes('general')) return -1;
            return a.localeCompare(b);
        }).forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [eligibleStudents]);

    const getScheduleParams = useCallback((sourceFilters) => {
        const normalizedBranchId = typeof sourceFilters.branchId === 'object'
            ? sourceFilters.branchId?._id
            : sourceFilters.branchId;

        return {
            branchId: normalizedBranchId || undefined
        };
    }, []);

    const getReportParams = useCallback((sourceFilters) => {
        const params = {
            isActive: 'true',
            registrationPaidOrRegistered: 'true',
            pageSize: 3000,
            sortBy: 'batch'
        };

        if (sourceFilters.startDate && sourceFilters.endDate) {
            params.startDate = sourceFilters.startDate;
            params.endDate = sourceFilters.endDate;
        }
        if (sourceFilters.courseFilter) params.courseFilter = sourceFilters.courseFilter;
        if (sourceFilters.studentName) params.studentName = sourceFilters.studentName;
        if (sourceFilters.reference) params.reference = sourceFilters.reference;
        if (sourceFilters.batch && sourceFilters.batch !== 'All') params.batch = sourceFilters.batch;

        const normalizedBranchId = typeof sourceFilters.branchId === 'object'
            ? sourceFilters.branchId?._id
            : sourceFilters.branchId;
        if (normalizedBranchId) params.branchId = normalizedBranchId;

        return params;
    }, []);

    useEffect(() => {
        dispatch(fetchBatches());
        dispatch(fetchCourses());
        dispatch(fetchEmployees({ pageSize: 1000 }));
        if (user?.role === 'Super Admin') {
            dispatch(fetchBranches());
        }
        const initialFilters = {
            startDate: '',
            endDate: '',
            courseFilter: '',
            branchId: user?.role === 'Super Admin' ? '' : userBranchId || '',
            studentName: '',
            batch: 'All',
            reference: '',
            isRegistered: 'true'
        };
        dispatch(fetchStudents(getReportParams(initialFilters)));
        dispatch(fetchExamSchedules(getScheduleParams(initialFilters)));
    }, [dispatch, getReportParams, getScheduleParams, user?.role, userBranchId]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleStudentSelect = (id, student) => {
        setFilters(prev => ({ ...prev, studentName: student ? `${student.firstName} ${student.lastName}` : '' }));
    };

    const handleReset = () => {
        const resetFilters = {
            startDate: '',
            endDate: '',
            courseFilter: '',
            branchId: userBranchId || '',
            studentName: '',
            batch: 'All',
            reference: '',
            isRegistered: 'true'
        };
        setFilters(resetFilters);
        dispatch(fetchStudents(getReportParams(resetFilters)));
        dispatch(fetchExamSchedules(getScheduleParams(resetFilters)));
        setShowReport(true);
    };

    const handleSearch = () => {
        dispatch(fetchStudents(getReportParams(filters)));
        dispatch(fetchExamSchedules(getScheduleParams(filters)));
        setShowReport(true);
    };

    const printReport = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'Batch_Wise_Register_Report',
    });

    const handlePrint = () => {
        if (!componentRef.current) return;
        printReport();
    };

    const getBranchIdValue = (value) => {
        if (!value) return '';
        if (typeof value === 'object') {
            return String(value?._id || value?.name || value?.shortCode || '');
        }
        return String(value);
    };

    const normalizeBranchText = (value = '') => normalizeTimeText(String(value || '')
        .replace(/\s*branch$/i, '')
        .replace(/\s+/g, ' '));

    const getBranchInfo = (branchId) => {
        const normalizedBranchId = getBranchIdValue(branchId);

        if (user?.role === 'Super Admin') {
            if (!normalizedBranchId) {
                return {
                    name: 'All Branches',
                    address: '',
                    phone: '',
                    mobile: '',
                    email: ''
                };
            }

            const found = (branches || []).find((branch) => String(branch._id) === normalizedBranchId);
            if (found) return found;
        }

        if (user && user.branchDetails && user.branchDetails.address) {
            return user.branchDetails;
        }

        if (normalizedBranchId && branches && branches.length > 0) {
            const found = branches.find((branch) => String(branch._id) === normalizedBranchId);
            if (found) return found;
        }

        return {
            name: user?.branchName || 'All Branches',
            address: '',
            phone: '',
            mobile: '',
            email: ''
        };
    };

    const headerBranch = getBranchInfo(filters.branchId || userBranchId);

    const normalizeTimeText = (value = '') => value
        .toString()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, ':')
        .trim();

    const parseTimeToMinutes = (timeValue) => {
        if (!timeValue) return null;
        const cleaned = normalizeTimeText(timeValue);
        const timeMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!timeMatch) return null;

        let hour = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2] || '0', 10);
        const meridian = timeMatch[3]?.toLowerCase();
        if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;

        if (meridian === 'pm' && hour < 12) hour += 12;
        if (meridian === 'am' && hour === 12) hour = 0;

        // Most batches are stored as 8, 10, 12, 2, 4, 6 without AM/PM.
        // Treat 1-6 as afternoon/evening so morning batches stay first.
        if (!meridian && hour >= 1 && hour <= 6) hour += 12;

        return (hour * 60) + minutes;
    };

    const getBatchStartMinutes = (batchItem) => {
        if (!batchItem) return null;
        return parseTimeToMinutes(batchItem.startTime) ?? parseTimeToMinutes(batchItem.name);
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

    const getStudentBranchId = (student) => getBranchIdValue(student?.branchId || student?.branch || student?.branchName);

    const getBatchBranchId = (batchItem) => getBranchIdValue(batchItem?.branchId || batchItem?.branch || batchItem?.branchName);

    const getCourseIdValue = (value) => {
        if (!value) return '';
        return String(typeof value === 'object' ? value?._id : value);
    };

    const isNumericOnlyLabel = (value) => /^\d+$/.test(String(value || '').trim());

    const normalizeCourseText = (value) => String(value || '')
        .trim()
        .replace(/^[\s\-–—:|/\\()]+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    const getReadableCourseLabel = (course) => {
        const shortName = normalizeCourseText(course?.shortName);
        const name = normalizeCourseText(course?.name);
        const label = isNumericOnlyLabel(shortName) ? name : (shortName || name);
        const normalizedLabel = normalizeCourseText(label);
        return isNumericOnlyLabel(normalizedLabel) ? '' : normalizedLabel;
    };

    const getCourseLabel = (courseValue) => {
        if (!courseValue) return '';
        if (typeof courseValue === 'object') {
            return getReadableCourseLabel(courseValue);
        }

        const courseId = getCourseIdValue(courseValue);
        const matchedCourse = (courses || []).find((course) => String(course._id) === courseId);
        return getReadableCourseLabel(matchedCourse);
    };

    const getStudentCourseLabel = (student, group) => {
        if (!student) return '';

        const studentCourseLabel = getCourseLabel(student?.course);
        if (studentCourseLabel) return studentCourseLabel;

        const groupCourseLabel = (group?.courseNames || []).find((name) => name && !isNumericOnlyLabel(name));
        if (groupCourseLabel) return groupCourseLabel;

        return filters.courseFilter && selectedCourseName !== 'All Courses' ? selectedCourseName : '';
    };

    const getBranchNameById = (branchId) => {
        const normalizedBranchId = getBranchIdValue(branchId);
        if (!normalizedBranchId) return 'Unassigned Branch';

        const foundBranch = (branches || []).find((branch) => (
            String(branch._id) === normalizedBranchId
            || normalizeBranchText(branch.name) === normalizeBranchText(normalizedBranchId)
            || normalizeBranchText(branch.shortCode) === normalizeBranchText(normalizedBranchId)
        ));
        return foundBranch?.name || normalizedBranchId || 'Unassigned Branch';
    };

    const branchMatchesSelection = (batchItem, selectedBranchId) => {
        const normalizedSelectedBranchId = getBranchIdValue(selectedBranchId);
        if (!normalizedSelectedBranchId) return true;

        const selectedBranch = (branches || []).find((branch) => String(branch._id) === normalizedSelectedBranchId);
        const batchBranchValue = batchItem?.branchId || batchItem?.branch || batchItem?.branchName;
        const normalizedBatchBranchValue = getBranchIdValue(batchBranchValue);
        const normalizedBatchBranchName = normalizeBranchText(batchItem?.branchName || batchItem?.branch?.name || batchItem?.branchId?.name);

        if (selectedBranch) {
            if (normalizedBatchBranchValue && String(selectedBranch._id) === normalizedBatchBranchValue) return true;
            if (normalizedBatchBranchName && normalizeBranchText(selectedBranch.name) === normalizedBatchBranchName) return true;
            if (normalizedBatchBranchName && normalizeBranchText(selectedBranch.shortCode) === normalizedBatchBranchName) return true;
        }

        return false;
    };

    const compareBranchNames = (branchIdA, branchIdB) => {
        const nameA = getBranchNameById(branchIdA);
        const nameB = getBranchNameById(branchIdB);
        return nameA.localeCompare(nameB, undefined, { numeric: true });
    };

    const getStudentBatchObject = (student, preferredBranchId = '') => {
        if (!student?.batch || !batches?.length) return null;
        const studentBatch = normalizeTimeText(student.batch);
        const studentBranchId = getStudentBranchId(student);
        const activeBranchId = getBranchIdValue(preferredBranchId);

        const batchSource = activeBranchId
            ? batches.filter((batchItem) => branchMatchesSelection(batchItem, activeBranchId))
            : batches;

        return batchSource.find((batchItem) => {
            const batchBranchId = getBatchBranchId(batchItem);
            if (!activeBranchId && studentBranchId && batchBranchId && studentBranchId !== batchBranchId) return false;

            const batchName = normalizeTimeText(batchItem.name);
            const batchTime = normalizeTimeText(`${batchItem.startTime} to ${batchItem.endTime}`);
            const batchDashTime = normalizeTimeText(`${batchItem.startTime} - ${batchItem.endTime}`);

            return batchName === studentBatch
                || batchTime === studentBatch
                || batchDashTime === studentBatch
                || studentBatch.includes(batchName)
                || studentBatch.includes(normalizeTimeText(batchItem.startTime));
        });
    };

    const visibleBatches = useMemo(() => {
        const normalizedBranchId = typeof filters.branchId === 'object' ? filters.branchId?._id : filters.branchId;
        const selectedBatchName = filters.batch && filters.batch !== 'All' ? normalizeTimeText(filters.batch) : '';

        return (batches || [])
            .filter((batchItem) => batchItem.isActive !== false && !batchItem.isDeleted)
            .filter((batchItem) => {
                if (normalizedBranchId && !branchMatchesSelection(batchItem, normalizedBranchId)) return false;

                if (selectedBatchName) {
                    const batchName = normalizeTimeText(batchItem.name);
                    const batchTime = normalizeTimeText(`${batchItem.startTime} ${batchItem.endTime}`);
                    const batchDashTime = normalizeTimeText(`${batchItem.startTime} - ${batchItem.endTime}`);
                    if (
                        batchName !== selectedBatchName &&
                        batchTime !== selectedBatchName &&
                        batchDashTime !== selectedBatchName
                    ) {
                        return false;
                    }
                }

                if (filters.courseFilter) {
                    const mappedCourses = Array.isArray(batchItem.courses) ? batchItem.courses : [];
                    return mappedCourses.some((course) => {
                        const courseId = typeof course === 'object' ? course?._id : course;
                        return String(courseId) === String(filters.courseFilter);
                    });
                }

                return true;
            })
            .sort((a, b) => {
                const branchCompare = compareBranchNames(getBatchBranchId(a), getBatchBranchId(b));
                if (branchCompare !== 0) return branchCompare;

                return compareBatchOrder(a, b);
            });
    }, [batches, filters.branchId, filters.batch, filters.courseFilter]);

    const sortedBatchesForFilter = useMemo(() => {
        return [...(batches || [])].sort((a, b) => {
            const branchCompare = compareBranchNames(getBatchBranchId(a), getBatchBranchId(b));
            if (branchCompare !== 0) return branchCompare;

            return compareBatchOrder(a, b);
        });
    }, [batches]);

    const batchGroups = useMemo(() => {
        if (!eligibleStudents?.length) return [];

        const byKey = new Map();
        const activeBranchId = getBranchIdValue(filters.branchId) || (user?.role === 'Super Admin' ? '' : userBranchId || '');

        eligibleStudents.forEach((student) => {
            const batchObj = getStudentBatchObject(student, activeBranchId);
            const studentBranchId = activeBranchId || getStudentBranchId(student);
            const key = batchObj?._id || `${studentBranchId || 'unassigned-branch'}::${normalizeTimeText(student.batch || 'unassigned')}`;
            if (!byKey.has(key)) {
                byKey.set(key, {
                    id: key,
                    batch: batchObj,
                    branchId: getBatchBranchId(batchObj) || studentBranchId,
                    name: batchObj?.name || student.batch || 'Unassigned',
                    students: [],
                    courseIds: new Set(),
                    matchCount: 0,
                });
            }

            const group = byKey.get(key);
            group.students.push(student);
            group.matchCount += 1;
            const studentCourseId = typeof student.course === 'object' ? student.course?._id : student.course;
            if (studentCourseId) group.courseIds.add(String(studentCourseId));
        });

        const batchMap = new Map(visibleBatches.map((batchItem) => [String(batchItem._id), batchItem]));

        visibleBatches.forEach((batchItem) => {
            const key = String(batchItem._id);
            if (!byKey.has(key)) {
                byKey.set(key, {
                    id: key,
                    batch: batchItem,
                    branchId: getBatchBranchId(batchItem),
                    name: batchItem.name,
                    students: [],
                    courseIds: new Set((batchItem.courses || []).map((course) => String(typeof course === 'object' ? course?._id : course)).filter(Boolean)),
                    matchCount: 0,
                });
            }
        });

        return Array.from(byKey.values())
            .map((group) => {
                const batchItem = group.batch || batchMap.get(String(group.id));
                const courseList = batchItem?.courses || [];
                const courseNames = courseList
                    .map((course) => getCourseLabel(course))
                    .filter(Boolean);

                return {
                    ...group,
                    batch: batchItem || group.batch,
                    branchId: getBatchBranchId(batchItem) || group.branchId,
                    branchName: getBranchNameById(getBatchBranchId(batchItem) || group.branchId),
                    courseCount: courseList.length,
                    courseNames,
                    capacity: Number(batchItem?.batchSize || 0),
                    timeText: batchItem ? `${batchItem.startTime || '-'} - ${batchItem.endTime || '-'}` : '-',
                    students: [...group.students].sort((a, b) => {
                        const regA = a.regNo || '';
                        const regB = b.regNo || '';
                        return regA.localeCompare(regB, undefined, { numeric: true }) || `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`);
                    })
                };
            })
            .sort((a, b) => {
                const branchCompare = compareBranchNames(a.branchId, b.branchId);
                if (branchCompare !== 0) return branchCompare;

                if (a.batch && b.batch) {
                    const batchCompare = compareBatchOrder(a.batch, b.batch);
                    if (batchCompare !== 0) return batchCompare;
                }
                if (a.batch && !b.batch) return -1;
                if (!a.batch && b.batch) return 1;
                if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
                return a.name.localeCompare(b.name);
            });
    }, [eligibleStudents, visibleBatches, filters.branchId, user?.role, userBranchId]);

    const getHeaderDateString = () => {
        const dateVal = filters.startDate || filters.endDate || new Date();
        return moment(dateVal).format('MMMM - YYYY');
    };

    const totalCount = batchGroups.reduce((acc, group) => acc + group.students.length, 0);
    const visibleBatchCount = batchGroups.length;
    const selectedCourseName = courses?.find(c => c._id === filters.courseFilter)?.name || 'All Courses';
    const selectedBranchName = user?.role === 'Super Admin' && !getBranchIdValue(filters.branchId)
        ? 'All Branches'
        : branches?.find((b) => String(b._id) === String(getBranchIdValue(filters.branchId)))?.name
            || headerBranch.name
            || 'Current Branch';
    const activeDateLabel = filters.startDate && filters.endDate
        ? `${moment(filters.startDate).format('DD-MMM-YYYY')} to ${moment(filters.endDate).format('DD-MMM-YYYY')}`
        : 'All admission dates';

    const batchSections = useMemo(() => {
        const allBranchesMode = user?.role === 'Super Admin' && !getBranchIdValue(filters.branchId);
        if (!allBranchesMode) {
            return [{ id: 'selected-branch', name: selectedBranchName, groups: batchGroups }];
        }

        const sectionMap = new Map();
        batchGroups.forEach((group) => {
            const branchId = getBranchIdValue(group.branchId) || 'unassigned-branch';
            if (!sectionMap.has(branchId)) {
                sectionMap.set(branchId, {
                    id: branchId,
                    name: group.branchName || getBranchNameById(branchId),
                    groups: []
                });
            }
            sectionMap.get(branchId).groups.push(group);
        });

        return Array.from(sectionMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }, [batchGroups, filters.branchId, selectedBranchName, user?.role]);

    const summaryGroups = batchSections.flatMap((section) => section.groups);

    const renderBatchTable = (group) => {
        const rows = [];
        const rowCount = Math.max(group.capacity || 0, group.students.length);
        for (let i = 0; i < rowCount; i++) {
            rows.push(group.students[i] || null);
        }
        
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', fontSize: '7.5px', fontFamily: 'Arial, sans-serif', color: '#000', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ backgroundColor: '#d2543e', color: '#fff', height: '6mm', borderBottom: '1.2px solid #000' }}>
                        <th style={{ width: '8%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>Sr</th>
                        <th style={{ width: '12%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>Reg</th>
                        <th style={{ width: '40%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1, padding: 0 }}>
                                <span>{group.name}</span>
                                <span style={{ fontSize: '6px', fontWeight: '700', opacity: 0.95, textTransform: 'none' }}>
                                    {group.batch ? `${group.timeText}` : '-'}
                                </span>
                            </div>
                        </th>
                        <th style={{ width: '23%', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>MOBILE</th>
                        <th style={{ width: '17%', fontWeight: 'bold', fontSize: '7.5px', textAlign: 'center', padding: 0 }}>COURSES</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((student, idx) => {
                        const parentMobile = student?.mobileParent || student?.contactParent || '';
                        const homeMobile = student?.contactHome || '';
                        const studentMobile = student?.mobileStudent || student?.contactStudent || '';
                        const mobileRows = [
                            { label: parentMobile ? 'G' : '', value: parentMobile },
                            { label: homeMobile ? 'H' : '', value: homeMobile },
                            { label: studentMobile ? 'S' : '', value: studentMobile }
                        ];
                        
                        return (
                            <tr key={idx} style={{ height: '8.8mm', borderBottom: idx < rows.length - 1 ? '1px solid #000' : 'none' }}>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: 0 }}>{idx + 1}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold', padding: 0 }}>
                                    {student?.regNo || ''}
                                </td>
                                <td style={{ borderRight: '1px solid #000', paddingLeft: '4px', fontWeight: 'bold', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                    {student ? `${student.firstName} ${student.lastName}`.substring(0, 18) : ''}
                                </td>
                                <td style={{ borderRight: '1px solid #000', padding: 0 }}>
                                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, padding: 0 }}>
                                        <tbody>
                                            {mobileRows.map((row, mobileIdx) => (
                                                <tr key={row.label || mobileIdx} style={{ height: '2.9mm' }}>
                                                    <td style={{ width: '20%', borderRight: '1px solid #000', borderBottom: mobileIdx < mobileRows.length - 1 ? '1px solid #000' : 'none', textAlign: 'center', fontWeight: 'bold', fontSize: '6px', padding: 0 }}>{row.label}</td>
                                                    <td style={{ borderBottom: mobileIdx < mobileRows.length - 1 ? '1px solid #000' : 'none', paddingLeft: '2px', fontSize: '6.5px', fontWeight: '600', padding: 0, textAlign: 'left' }}>{row.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </td>
                                <td style={{ paddingLeft: '4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '7px', textAlign: 'left' }}>
                                    {getStudentCourseLabel(student, group)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    if (studentsLoading || batchesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Generating Report Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-7xl">
            <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">General Report</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">Batch Wise Register</h1>
                        <p className="mt-1 text-sm text-slate-500">Batch master ke time, course count, aur us batch me registered students ka printable register.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users size={14} /> Students</div>
                            <p className="mt-1 text-xl font-bold text-slate-900">{totalCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={14} /> Batches</div>
                            <p className="mt-1 text-xl font-bold text-slate-900">{visibleBatchCount}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays size={14} /> Date</div>
                            <p className="mt-1 truncate text-sm font-bold text-slate-900">{activeDateLabel}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Building2 size={14} /> Branch</div>
                            <p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedBranchName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">From Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">To Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Course</label>
                        <select name="courseFilter" value={filters.courseFilter} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="">All Courses</option>
                            {courses && courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    {user?.role === 'Super Admin' && (
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Branch</label>
                            <select name="branchId" value={filters.branchId} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                                <option value="">All Branches</option>
                                {branches && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <StudentSearch 
                            label="Student Name"
                            placeholder="Search by name..."
                            onSelect={handleStudentSelect}
                            displayField="name"
                            additionalFilters={{
                                ...(filters.isRegistered !== 'all' ? { isRegistered: filters.isRegistered } : {}),
                                branchId: filters.branchId,
                                courseFilter: filters.courseFilter || undefined
                            }}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Batch</label>
                        <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="All">All Batches</option>
                            {sortedBatchesForFilter.map(b => <option key={b._id} value={b.name}>{b.name} ({b.startTime} - {b.endTime})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Reference By</label>
                        <select name="reference" value={filters.reference} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="">All Employees</option>
                            {employees && employees.map(emp => (
                                <option key={emp._id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-semibold text-slate-800">{selectedCourseName}</span> students in printable batch format.
                    </p>
                    <div className="flex flex-wrap gap-2">
                    <button onClick={handleReset} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <RefreshCw size={16} /> Reset
                    </button>
                    <button onClick={handleSearch} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
                        {studentsLoading ? 'Loading...' : <><Search size={18} /> Show Report</>}
                    </button>
                    <button onClick={handlePrint} disabled={!totalCount} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        <Printer size={18} /> Print Report
                    </button>
                    </div>
                </div>
            </div>

            {showReport && totalCount === 0 && !studentsLoading && (
                <div className="mb-8 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center print:hidden">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Users size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">No students found for this register</h2>
                    <p className="mt-1 text-sm text-slate-500">Try All Batches, clear the student name, or remove the admission date range.</p>
                </div>
            )}

            {showReport && totalCount > 0 && (
                <div className="preview-scroll-wrapper border border-slate-200 rounded-xl p-4 bg-slate-50 overflow-x-auto overflow-y-visible flex justify-start lg:justify-center mb-8 print:border-0 print:p-0 print:bg-white print:overflow-visible">
                    <div 
                        ref={componentRef} 
                        className="print-container bg-white shrink-0"
                        style={{ 
                            width: '210mm', 
                            height: '297mm', 
                            padding: '4mm 6mm', 
                            boxSizing: 'border-box', 
                            position: 'relative', 
                            backgroundColor: '#fff',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                    >
                        {/* Top Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2mm' }}>
                            {/* Logo */}
                            <div style={{ width: '22%' }}>
                                <img src={logo} alt="Smart Institute Logo" style={{ height: '14mm', width: 'auto', objectFit: 'contain' }} />
                            </div>

                            {/* Month and Year */}
                            {/* <div style={{ width: '40%', textAlign: 'center' }}>
                                <div style={{ fontSize: '6mm', fontWeight: '900', color: '#1e3a8a', fontFamily: 'Arial, sans-serif' }}>
                                    {getHeaderDateString()}
                                </div>
                            </div> */}

                            {/* Branch Address & Contacts */}
                            <div style={{ width: '38%', textAlign: 'right', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '7px', lineHeight: '1.2' }}>
                                <div style={{ fontWeight: '900', fontSize: '9px', color: '#1e3a8a' }}>{selectedBranchName}</div>
                                {filters.branchId || user?.role !== 'Super Admin' ? (
                                    <>
                                        <div>{headerBranch.address || 'Smart Institute'}</div>
                                        <div>Opp. Haba baijnath Mandir, Aas-pass Circle, Godadra,</div>
                                        <div>Surat, Gujarat (INDIA)</div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            Ph. No.: {headerBranch.phone || '96017-49300'} Mob.: {headerBranch.mobile || '98988-30409'}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontWeight: '600', color: '#334155' }}>
                                        Branch-wise combined register
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Green & Orange Banner */}
                        <div style={{ display: 'flex', width: '100%', marginBottom: '3mm', height: '8mm', boxSizing: 'border-box' }}>
                            <div style={{ 
                                width: '85%', 
                                backgroundColor: '#2b8258', 
                                color: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '4.5mm', 
                                fontWeight: '900', 
                                fontFamily: 'Arial, sans-serif',
                                letterSpacing: '1px',
                                border: '1.5px solid #000',
                                borderRight: 'none'
                            }}>
                                BATCH WISE REGISTER
                            </div>
                            <div style={{ 
                                width: '15%', 
                                backgroundColor: '#ec9b1c', 
                                color: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '5mm', 
                                fontWeight: '900', 
                                fontFamily: 'Arial, sans-serif',
                                border: '1.5px solid #000'
                            }}>
                                {totalCount}
                            </div>
                        </div>

                        {/* Branch-wise sections, each branch starts its own batch sequence */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm', width: '100%', boxSizing: 'border-box' }}>
                            {batchSections.map((section) => (
                                <div key={section.id} style={{ width: '100%', breakInside: 'avoid' }}>
                                    {batchSections.length > 1 && (
                                        <div style={{
                                            backgroundColor: '#1e3a8a',
                                            color: '#fff',
                                            border: '1.2px solid #000',
                                            fontSize: '9px',
                                            fontWeight: '900',
                                            fontFamily: 'Arial, sans-serif',
                                            padding: '2px 6px',
                                            marginBottom: '2mm',
                                            textTransform: 'uppercase'
                                        }}>
                                            {section.name}
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', width: '100%', boxSizing: 'border-box', alignItems: 'start' }}>
                                        {section.groups.map((group) => (
                                            <React.Fragment key={group.id}>{renderBatchTable(group)}</React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginTop: '5mm', boxSizing: 'border-box' }}>
                            {/* Summary Table */}
                            <div style={{ width: '45%', border: '1.5px solid #000', borderCollapse: 'collapse' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>
                                    {summaryGroups.map((group, summaryIdx) => (
                                        <div
                                            key={group.id}
                                            style={{
                                                display: 'flex',
                                                height: '6.5mm',
                                                borderBottom: summaryIdx < summaryGroups.length - 2 ? '1px solid #000' : 'none',
                                                borderRight: summaryIdx % 2 === 0 ? '1px solid #000' : 'none'
                                            }}
                                        >
                                            <div style={{ width: '65%', backgroundColor: '#ec9b1c', color: '#000', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '4px', borderRight: '1px solid #000' }}>
                                                {group.batch ? `${group.batch.startTime} - ${group.batch.endTime}` : '-'}
                                            </div>
                                            <div style={{ width: '35%', backgroundColor: '#e5e7eb', color: '#000', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {group.students.length}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Signature Area */}
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '45mm' }}>
                                <div style={{ width: '40mm', height: '20mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Placeholder for Signature/Stamp */}
                                    <div style={{ fontFamily: 'Dancing Script, cursive', fontSize: '18px', opacity: 0.6, transform: 'rotate(-10deg)' }}>
                                        {/* Signature could go here */}
                                    </div>
                                </div>
                                <div style={{ width: '100%', borderTop: '1px solid #000', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', paddingTop: '2mm' }}>
                                    Authorized Signature
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print, .print\\:hidden { display: none !important; }
                    .preview-scroll-wrapper {
                        padding: 0 !important;
                        border: 0 !important;
                        background: none !important;
                        overflow: visible !important;
                    }
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 4mm 6mm !important;
                        margin: 0 !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        height: auto !important;
                        page-break-after: always;
                    }
                    body { background: white !important; }
                    @page { 
                        size: A4 portrait;
                        margin: 0; 
                    }
                }
            `}} />
            </div>
        </div>
    );
};

export default BatchWiseRegister;

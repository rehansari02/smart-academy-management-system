import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  TrendingUp,
  GraduationCap,
  DollarSign,
  ChevronRight,
  Users,
  UserPlus,
  Trophy,
  Star,
  Menu,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getBranches } from '../../../features/master/branchSlice';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';

const API = `${import.meta.env.VITE_API_URL}/admin-dashboard/reference-incentive`;

const periodOptions = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' }
];
const incentiveStatusOptions = [
  { value: '', label: 'All Status' },
  // { value: 'Pending', label: 'Pending' },
  // { value: 'Paid', label: 'Paid' }
];
const STUDENTS_PAGE_LIMIT = 10;

const ReferenceIncentive = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { branches } = useSelector((state) => state.branch);

  const [loading, setLoading] = useState(false);
  const [refData, setRefData] = useState(null);
  const [activeReference, setActiveReference] = useState(null);
  const [refSearch, setRefSearch] = useState('');
  const [filters, setFilters] = useState({ period: 'month', branchId: '', fromDate: '', toDate: '' });
  const [studentFilters, setStudentFilters] = useState({ period: 'month', fromDate: '', toDate: '', incentiveStatus: '' });
  const [studentPage, setStudentPage] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    dispatch(getBranches());
  }, [dispatch]);

  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';
  const formatMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const getCommissionType = (course) => {
    const raw = String(course?.commissionType || '').trim().toLowerCase();
    if (raw === 'percentage' || raw === '%') return 'Percentage';
    if (raw === 'amount' || raw === 'rupee' || raw === 'rs') return 'Amount';
    const value = Number(course?.commission || 0);
    return value > 0 && value <= 100 ? 'Percentage' : 'Amount';
  };
  const formatCommissionValue = (course) => {
    const type = getCommissionType(course);
    const value = Number(course?.commission || 0);
    return type === 'Percentage' ? `${value}%` : formatMoney(value);
  };
  const getCommissionNote = (course) => {
    const type = getCommissionType(course);
    const value = Number(course?.commission || 0);
    return type === 'Percentage' ? `${value}% of total fees` : `${formatMoney(value)} per student`;
  };

  const fetchData = async (reference, options = {}) => {
    setLoading(true);
    try {
      const detailFilters = options.studentFilters || studentFilters;
      const detailPage = options.studentPage || studentPage;
      const params = {
        period: filters.period,
        page: detailPage,
        limit: STUDENTS_PAGE_LIMIT,
        ...(reference && { reference }),
        ...(filters.branchId && { branchId: filters.branchId }),
        ...(filters.period === 'custom' && filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.period === 'custom' && filters.toDate && { toDate: filters.toDate }),
        ...(reference && { studentPeriod: detailFilters.period }),
        ...(reference && detailFilters.period === 'custom' && detailFilters.fromDate && { studentFromDate: detailFilters.fromDate }),
        ...(reference && detailFilters.period === 'custom' && detailFilters.toDate && { studentToDate: detailFilters.toDate }),
        ...(reference && detailFilters.incentiveStatus && { incentiveStatus: detailFilters.incentiveStatus }),
        ...(!reference && detailFilters.incentiveStatus && { incentiveStatus: detailFilters.incentiveStatus })
      };
      const { data } = await axios.get(API, { params, withCredentials: true });
      setRefData(data);
      
      // Auto-select for non-super admins to show their own data immediately
      if (!isSuperAdmin && data.selectedReference && !activeReference) {
        // Use the actual reference name from data if available, or the user's name
        const refName = data.filters?.reference || user?.name || 'My Referrals';
        setActiveReference(refName);
      }

      if (!reference && isSuperAdmin) {
        setActiveReference(null);
      }
    } catch (error) {
      console.error('Failed to load reference data', error);
      toast.error('Failed to load reference data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(activeReference), 300);
    return () => clearTimeout(timer);
  }, [filters, studentFilters.incentiveStatus]);

  useEffect(() => {
    if (!activeReference) return undefined;
    const timer = setTimeout(() => fetchData(activeReference), 300);
    return () => clearTimeout(timer);
  }, [studentFilters.period, studentFilters.fromDate, studentFilters.toDate, studentPage]);

  const handleReferenceClick = (refName) => {
    setActiveReference(refName);
    setStudentPage(1);
    fetchData(refName, { studentPage: 1 });
  };

  const handleBack = () => {
    setActiveReference(null);
    fetchData();
  };

  const handleReset = () => {
    setFilters({ period: 'month', branchId: '', fromDate: '', toDate: '' });
    setStudentFilters({ period: 'month', fromDate: '', toDate: '', incentiveStatus: '' });
    setStudentPage(1);
    setActiveReference(null);
  };

  const filteredRefs = useMemo(() => {
    const refs = refData?.references || [];
    if (!refSearch.trim()) return refs;
    const q = refSearch.toLowerCase();
    return refs.filter(r => r._id.toLowerCase().includes(q));
  }, [refData, refSearch]);

  const selectedData = refData?.selectedReference || null;

  // Global summary data
  const globalSummary = useMemo(() => {
    const refs = refData?.references || [];
    if (!refs.length) return null;
    return {
      totalStudents: refs.reduce((s, r) => s + r.studentCount, 0),
      totalAdmissions: refs.reduce((s, r) => s + r.admissionCount, 0),
      totalFees: refs.reduce((s, r) => s + r.totalFees, 0),
      totalIncentive: refs.reduce((s, r) => s + r.totalIncentive, 0)
    };
  }, [refData]);

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">

        {/* Header */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-[#111827] shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                onClick={() => navigate('/home')}
                className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-200">Smart Academy</p>
                <h1 className="flex min-w-0 items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                  <TrendingUp className="shrink-0 text-blue-300" />
                  <span className="truncate">Teacher Incentives</span>
                </h1>
                <p className="mt-1 text-sm text-slate-300">Track and manage commissions for student referrals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <HeaderStat label="Period" value={periodOptions.find(o => o.value === filters.period)?.label || 'Month'} />
              <HeaderStat
                label="Branch"
                value={
                  filters.branchId
                    ? branches.find(b => b._id === filters.branchId)?.name || 'Selected'
                    : isSuperAdmin ? 'All Branches' : user?.branchName || 'My Branch'
                }
              />
              <HeaderStat
                label="References"
                value={`${refData?.references?.length || 0} sources`}
              />
            </div>
          </div>
        </div>

        {/* Super Admin employee/sidebar filters */}
        {isSuperAdmin && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">Date Filter</label>
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      showSidebar
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <Menu size={14} />
                    {showSidebar ? 'Hide Teachers' : 'Show Teachers'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
                  {periodOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        period: option.value,
                        ...(option.value !== 'custom' ? { fromDate: '', toDate: '' } : {})
                      }))}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        filters.period === option.value
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Branch</label>
                    <select
                      value={filters.branchId}
                      onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="">All Branches</option>
                      {branches.map(branch => (
                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>

                  {filters.period === 'custom' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">From</label>
                        <input
                          type="date"
                          value={filters.fromDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">To</label>
                        <input
                          type="date"
                          value={filters.toDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button onClick={handleReset} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200">
                <RefreshCw size={16} /> Reset
              </button>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar */}
          {isSuperAdmin && showSidebar && (
            <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-72">
              <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-black">
                    <Users size={16} />
                    Teachers
                  </h3>
                  <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-black text-white/80">
                    {refData?.references?.length || 0}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/70">Ranked by total earnings</p>
              </div>

              <div className="border-b border-slate-100 p-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search teacher..."
                    value={refSearch}
                    onChange={(e) => setRefSearch(e.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary/50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {loading && !refData ? (
                  <div className="flex items-center justify-center p-8 text-xs font-semibold text-slate-400">
                    <RefreshCw size={14} className="mr-2 animate-spin" /> Loading...
                  </div>
                ) : filteredRefs.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400">No teachers found</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredRefs.map((ref) => (
                      <button
                        key={ref._id}
                        onClick={() => handleReferenceClick(ref._id)}
                        className={`group flex w-full items-start gap-3 p-3 text-left transition hover:bg-indigo-50/60 ${
                          activeReference === ref._id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${
                          activeReference === ref._id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'
                        }`}>
                          {ref._id.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${
                            activeReference === ref._id ? 'text-indigo-700' : 'text-slate-800'
                          }`}>
                            {ref._id}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-500">
                            <span>{ref.studentCount} students</span>
                            <span className="text-emerald-600">{ref.admissionCount} admitted</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-indigo-600">
                            {formatMoney(ref.totalIncentive)}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`mt-2 shrink-0 ${
                          activeReference === ref._id ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredRefs.length > 0 && !activeReference && refData?.references && (
                <div className="border-t border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-black">
                    <div className="rounded-lg bg-white p-2">
                      <p className="text-slate-500">Total Students</p>
                      <p className="text-slate-900">{globalSummary?.totalStudents || 0}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2">
                      <p className="text-slate-500">Total Incentive</p>
                      <p className="text-indigo-600">{formatMoney(globalSummary?.totalIncentive || 0)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Content Area */}
          <div className="min-w-0 flex-1">
            {activeReference ? (
              loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-500 shadow-sm">
                  <RefreshCw className="mr-2 inline-block animate-spin" size={18} /> Loading reference data...
                </div>
              ) : selectedData ? (
                <TeacherPerformanceDetail
                  teacherName={activeReference}
                  data={selectedData}
                  formatMoney={formatMoney}
                  formatDate={formatDate}
                  onBack={handleBack}
                  onRefresh={() => fetchData(activeReference)}
                  studentFilters={studentFilters}
                  onStudentFiltersChange={(nextFilters) => {
                    setStudentFilters(nextFilters);
                    setStudentPage(1);
                  }}
                  studentPage={studentPage}
                  onStudentPageChange={setStudentPage}
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-500">No data available for this reference</p>
                  <button
                    onClick={handleBack}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                </div>
              )
            ) : (
              /* Default / Welcome View */
              <div className="space-y-5">
                {/* Global Summary Cards */}
                {globalSummary && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      icon={<Star size={20} className="text-amber-500" />}
                      label="Total Referrals"
                      value={globalSummary.totalStudents}
                      color="amber"
                    />
                    <SummaryCard
                      icon={<UserPlus size={20} className="text-emerald-500" />}
                      label="Admissions"
                      value={globalSummary.totalAdmissions}
                      color="emerald"
                    />
                    <SummaryCard
                      icon={<TrendingUp size={20} className="text-blue-500" />}
                      label="Total Incentive"
                      value={formatMoney(globalSummary.totalIncentive)}
                      color="blue"
                    />
                    <SummaryCard
                      icon={<Trophy size={20} className="text-purple-500" />}
                      label="Incentives Accrued"
                      value={formatMoney(globalSummary.totalIncentive)}
                      color="purple"
                      highlight
                    />
                  </div>
                )}

                {/* Welcome message */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-lg">
                    <TrendingUp size={40} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Teacher <span className="text-indigo-600">Incentive</span> Dashboard
                  </h2>
                  <p className="mt-3 max-w-md text-sm font-semibold text-slate-500">
                    {isSuperAdmin 
                      ? "Select a teacher from the sidebar to view their referral metrics, earned commissions, and student enrollment history."
                      : "You don't have any referrals recorded for the selected period."}
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5">{refData?.references?.length || 0} reference sources</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5">{globalSummary?.totalStudents || 0} total students</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Incentive Status Badge ===== */
function IncentiveStatusBadge({ status, paidAt, paidBy, formatDate }) {
  const isPaid = status === 'Paid';
  return (
    <div className={`group relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
      {isPaid ? <CheckCircle size={12} /> : <span className="h-2 w-2 rounded-full bg-amber-500" />}
      {isPaid ? 'Paid' : 'Pending'}
      {isPaid && paidAt && (
        <div className="pointer-events-none absolute -bottom-1 left-1/2 z-10 hidden -translate-x-1/2 translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block whitespace-nowrap">
          Paid by {paidBy || 'Unknown'} on {formatDate(paidAt)}
        </div>
      )}
    </div>
  );
}

/* ===== Teacher Performance Detail View ===== */
function TeacherPerformanceDetail({
  teacherName,
  data,
  formatMoney,
  formatDate,
  onBack,
  onRefresh,
  studentFilters,
  onStudentFiltersChange,
  studentPage,
  onStudentPageChange
}) {
  const summary = data.summary || {};
  const students = data.students || [];
  const pagination = data.pagination || { page: studentPage || 1, limit: STUDENTS_PAGE_LIMIT, total: students.length, pages: 1 };
  const recentReceipts = data.recentReceipts || [];
  const monthlyTrend = data.monthlyTrend || [];
  const { edit } = useUserRights('Reference Incentive');

  const getCommissionType = (course) => {
    const raw = String(course?.commissionType || '').trim().toLowerCase();
    if (raw === 'percentage' || raw === '%') return 'Percentage';
    if (raw === 'amount' || raw === 'rupee' || raw === 'rs') return 'Amount';
    const value = Number(course?.commission || 0);
    return value > 0 && value <= 100 ? 'Percentage' : 'Amount';
  };
  const formatCommissionValue = (course) => {
    const type = getCommissionType(course);
    const value = Number(course?.commission || 0);
    return type === 'Percentage' ? `${value}%` : formatMoney(value);
  };
  const getCommissionNote = (course) => {
    const type = getCommissionType(course);
    const value = Number(course?.commission || 0);
    return type === 'Percentage' ? `${value}% of total fees` : `${formatMoney(value)} per student`;
  };

  // --- Incentive Status Management ---
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [updatingStudent, setUpdatingStudent] = useState(null);

  useEffect(() => {
    setSelectedStudents(new Set());
  }, [students]);

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s._id)));
    }
  };

  const handleBulkUpdate = async (status) => {
    if (!edit) {
      showPermissionDenied("You don't have authority to update incentive status.");
      return;
    }
    if (selectedStudents.size === 0) return;
    setBulkUpdating(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin-dashboard/reference-incentive/update-status`,
        { studentIds: [...selectedStudents], status },
        { withCredentials: true }
      );
      toast.success(`Incentive marked as ${status} for ${selectedStudents.size} student(s)`);
      setSelectedStudents(new Set());
      // Refresh by calling onRefresh if provided
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update incentive status');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleIndividualUpdate = async (studentId, currentStatus) => {
    if (!edit) {
      showPermissionDenied("You don't have authority to update incentive status.");
      return;
    }
    const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
    setUpdatingStudent(studentId);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin-dashboard/reference-incentive/update-status`,
        { studentIds: [studentId], status: newStatus },
        { withCredentials: true }
      );
      toast.success(`Incentive marked as ${newStatus}`);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update incentive status');
    } finally {
      setUpdatingStudent(null);
    }
  };

  // Prepare chart data for Recharts
  const trendChartData = useMemo(() =>
    monthlyTrend.map(t => ({
      month: t.label,
      admissions: t.count,
      fees: t.fees
    })),
    [monthlyTrend]
  );

  const incentiveChartData = useMemo(() => [
    { name: 'Paid', value: summary.paidIncentive || 0 },
    { name: 'Pending', value: summary.pendingIncentive || 0 }
  ], [summary]);
  const firstStudentNo = pagination.total ? ((pagination.page - 1) * pagination.limit) + 1 : 0;
  const lastStudentNo = Math.min(pagination.page * pagination.limit, pagination.total || 0);

  return (
    <div className="space-y-5">

      {/* Teacher Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 p-5 shadow-sm">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
        >
          <ArrowLeft size={14} /> Back to Overview
        </button>
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl font-black text-white">
            {teacherName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-white">{teacherName}</h2>
            <p className="text-sm font-semibold text-white/70">Referral Performance</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Students" value={summary.studentCount} />
          <StatBox label="Admitted" value={summary.admissionCount} className="text-emerald-300" />
          <StatBox label="Total Rev." value={formatMoney(summary.totalFees)} />
          <StatBox label="Incentive" value={formatMoney(summary.totalIncentive)} className="text-amber-300" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Referred Student Filter</h3>
            <p className="text-xs font-semibold text-slate-500">Filter this teacher's students by admission date</p>
          </div>
          <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
            {pagination.total || 0} student(s)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
          {periodOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStudentFiltersChange({
                ...studentFilters,
                period: option.value,
                ...(option.value !== 'custom' ? { fromDate: '', toDate: '' } : {})
              })}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                studentFilters.period === option.value
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {incentiveStatusOptions.map(option => (
            <button
              key={option.value || 'all-status'}
              type="button"
              onClick={() => onStudentFiltersChange({
                ...studentFilters,
                incentiveStatus: option.value
              })}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                studentFilters.incentiveStatus === option.value
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {studentFilters.period === 'custom' && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">From</label>
              <input
                type="date"
                value={studentFilters.fromDate}
                onChange={(e) => onStudentFiltersChange({ ...studentFilters, fromDate: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">To</label>
              <input
                type="date"
                value={studentFilters.toDate}
                onChange={(e) => onStudentFiltersChange({ ...studentFilters, toDate: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel title="Admission Trend" subtitle="Monthly admissions via this reference">
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value) => [value, 'Admissions']}
                />
                <Bar dataKey="admissions" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-400">
              No trend data available
            </div>
          )}
        </ChartPanel>

        <ChartPanel title="Incentive Breakdown" subtitle="Paid vs Pending incentives">
          {incentiveChartData[0].value > 0 || incentiveChartData[1].value > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={incentiveChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {incentiveChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value) => [formatMoney(value), 'Amount']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-3 text-center text-xs font-black">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  Paid: {formatMoney(summary.paidIncentive)}
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                  Pending: {formatMoney(summary.pendingIncentive)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-400">
              No incentive data available
            </div>
          )}
        </ChartPanel>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Bulk Action Bar */}
        {selectedStudents.size > 0 && (
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-indigo-50/80 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2.5 py-0.5 text-xs font-black text-white">{selectedStudents.size}</span>
              <span className="text-xs font-bold text-indigo-700">student(s) selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkUpdate('Paid')}
                disabled={bulkUpdating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {bulkUpdating ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Mark All Paid
              </button>
              <button
                onClick={() => handleBulkUpdate('Pending')}
                disabled={bulkUpdating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {bulkUpdating ? <Loader size={14} className="animate-spin" /> : <XCircle size={14} />}
                Mark All Pending
              </button>
              <button
                onClick={() => setSelectedStudents(new Set())}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="flex items-center gap-2 font-black text-slate-900">
              <GraduationCap size={16} />
              Students Referred
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Showing {firstStudentNo}-{lastStudentNo} of {pagination.total || 0} student(s)
            </p>
          </div>
          <div className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
            Incentive: {formatMoney(summary.totalIncentive)}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-white text-xs uppercase text-slate-500">
              <tr>
                <th className="w-10 p-3 text-center font-black">
                  <button onClick={handleSelectAll} className="hover:text-indigo-600 transition-colors" title={selectedStudents.size === students.length && students.length > 0 ? 'Deselect all' : 'Select all'}>
                    {selectedStudents.size === students.length && students.length > 0 ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                  </button>
                </th>
                <th className="w-10 p-3 text-center font-black">#</th>
                <th className="p-3 text-left font-black">Student</th>
                <th className="p-3 text-left font-black">Course</th>
                <th className="p-3 text-left font-black">Commission</th>
                <th className="p-3 text-right font-black">Incentive</th>
                <th className="p-3 text-center font-black">Status</th>
                <th className="w-24 p-3 text-center font-black">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length ? students.map((s, idx) => (
                <tr key={s._id} className={`transition ${selectedStudents.has(s._id) ? 'bg-indigo-50/60' : 'hover:bg-indigo-50/40'}`}>
                  <td className="w-10 p-3 text-center">
                    <button onClick={() => handleSelectStudent(s._id)} className="hover:text-indigo-600 transition-colors" title={selectedStudents.has(s._id) ? 'Deselect' : 'Select'}>
                      {selectedStudents.has(s._id) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} className="text-slate-400" />}
                    </button>
                  </td>
                  <td className="w-10 p-3 text-center text-xs font-bold text-slate-400">{((pagination.page - 1) * pagination.limit) + idx + 1}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{s.firstName} {s.lastName}</div>
                    <div className="text-[10px] font-semibold text-slate-400">ID: {s.regNo || s.enrollmentNo || 'N/A'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{s.course?.name || '-'}</div>
                    {s.course?.duration && (
                      <div className="text-[10px] font-semibold text-slate-400">{s.course.duration} {s.course.durationType}</div>
                    )}
                  </td>
                  <td className="p-3">
                    {getCommissionType(s.course) === 'Percentage' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                        {formatCommissionValue(s.course)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                        {formatCommissionValue(s.course)}
                      </span>
                    )}
                    <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      {getCommissionNote(s.course)}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-black text-indigo-600">{formatMoney(s.incentive)}</div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {getCommissionNote(s.course)}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <IncentiveStatusBadge status={s.incentiveStatus} paidAt={s.incentivePaidAt} paidBy={s.incentivePaidBy} formatDate={formatDate} />
                  </td>
                  <td className="w-24 p-3 text-center">
                    <button
                      onClick={() => handleIndividualUpdate(s._id, s.incentiveStatus)}
                      disabled={updatingStudent === s._id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                        s.incentiveStatus === 'Paid'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      } disabled:opacity-50`}
                      title={`Click to mark as ${s.incentiveStatus === 'Paid' ? 'Pending' : 'Paid'}`}
                    >
                      {updatingStudent === s._id ? <Loader size={12} className="animate-spin" /> : s.incentiveStatus === 'Paid' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      {s.incentiveStatus === 'Paid' ? 'Pending' : 'Paid'}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="p-8 text-center font-semibold text-slate-400">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="divide-y divide-slate-100 md:hidden">
          {students.length ? students.map((s, idx) => (
            <div key={s._id} className={`space-y-2 p-4 transition ${selectedStudents.has(s._id) ? 'bg-indigo-50/60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSelectStudent(s._id)} className="hover:text-indigo-600 transition-colors">
                    {selectedStudents.has(s._id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-400" />}
                  </button>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">{((pagination.page - 1) * pagination.limit) + idx + 1}</span>
                  <span className="text-sm font-bold text-slate-800">{s.firstName} {s.lastName}</span>
                </div>
                <IncentiveStatusBadge status={s.incentiveStatus} paidAt={s.incentivePaidAt} paidBy={s.incentivePaidBy} formatDate={formatDate} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="font-semibold text-slate-500">Course:</span> <span className="text-slate-700">{s.course?.name || '-'}</span></div>
                <div><span className="font-semibold text-slate-500">Incentive:</span> <span className="font-black text-indigo-600">{formatMoney(s.incentive)}</span></div>
                <div className="text-right">
                  <button
                    onClick={() => handleIndividualUpdate(s._id, s.incentiveStatus)}
                    disabled={updatingStudent === s._id}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black transition ${
                      s.incentiveStatus === 'Paid'
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    } disabled:opacity-50`}
                  >
                    {updatingStudent === s._id ? <Loader size={10} className="animate-spin" /> : s.incentiveStatus === 'Paid' ? <XCircle size={10} /> : <CheckCircle size={10} />}
                    {s.incentiveStatus === 'Paid' ? 'Pending' : 'Paid'}
                  </button>
                </div>
              </div>
            </div>
          )) : <div className="p-8 text-center font-semibold text-slate-400">No students found.</div>}
        </div>

        {pagination.pages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStudentPageChange(Math.max((pagination.page || 1) - 1, 1))}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => onStudentPageChange(Math.min((pagination.page || 1) + 1, pagination.pages || 1))}
                disabled={pagination.page >= pagination.pages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {recentReceipts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="flex items-center gap-2 font-black text-slate-900">
                <DollarSign size={16} />
                Recent Payments
              </h3>
              <p className="text-xs font-semibold text-slate-500">Latest receipts</p>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-12 p-3 text-center font-black">#</th>
                  <th className="p-3 text-left font-black">Date</th>
                  <th className="p-3 text-left font-black">Receipt</th>
                  <th className="p-3 text-left font-black">Student</th>
                  <th className="p-3 text-left font-black">Mode</th>
                  <th className="p-3 text-right font-black">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReceipts.map((r, idx) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="w-12 p-3 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 text-slate-700">{formatDate(r.date)}</td>
                    <td className="p-3 font-mono font-semibold text-slate-800">{r.receiptNo}</td>
                    <td className="p-3 text-slate-700">
                      {r.student ? `${r.student.firstName || ''} ${r.student.lastName || ''}` : '-'}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{r.paymentMode}</span>
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">{formatMoney(r.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {recentReceipts.map((r, idx) => (
              <div key={r._id} className="space-y-1.5 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">{idx + 1}</span>
                    <span className="font-bold text-slate-800">{r.receiptNo}</span>
                  </div>
                  <span className="font-black text-emerald-700">{formatMoney(r.amountPaid)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {r.student ? `${r.student.firstName || ''} ${r.student.lastName || ''}` : '-'} &middot; {r.paymentMode} &middot; {formatDate(r.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== Reusable Sub-Components ===== */

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-300">{label}</p>
    <p className="mt-1 max-w-[190px] truncate text-sm font-black text-white" title={value}>{value}</p>
  </div>
);

const StatBox = ({ label, value, className = 'text-white' }) => (
  <div className="rounded-xl bg-white/15 p-3">
    <p className="text-[10px] font-black uppercase tracking-wide text-white/70">{label}</p>
    <p className={`text-xl font-black ${className}`}>{value}</p>
  </div>
);

const SummaryCard = ({ icon, label, value, color, highlight }) => {
  const borderColors = {
    amber: 'border-l-amber-500',
    emerald: 'border-l-emerald-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500'
  };
  const bgColors = {
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderColors[color]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-black ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bgColors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const ChartPanel = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Chart</span>
      </div>
    </div>
    <div className="h-[280px] sm:h-[320px] xl:h-[300px]">
      {children}
    </div>
  </div>
);

export default ReferenceIncentive;


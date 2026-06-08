import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle,
  Globe,
  RefreshCw,
  UserPlus,
  Users,
  Wallet,
  Receipt
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getBranches } from '../../features/master/branchSlice';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const API = `${import.meta.env.VITE_API_URL}/admin-dashboard/overview`;

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' }
];

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { branches } = useSelector((state) => state.branch);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [filters, setFilters] = useState({ period: 'today', branchId: '', fromDate: '', toDate: '' });
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  const formatAmount = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';

  const fetchDashboard = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        period: nextFilters.period,
        ...(nextFilters.branchId && { branchId: nextFilters.branchId }),
        ...(nextFilters.period === 'custom' && nextFilters.fromDate && { fromDate: nextFilters.fromDate }),
        ...(nextFilters.period === 'custom' && nextFilters.toDate && { toDate: nextFilters.toDate })
      };
      const { data } = await axios.get(API, { params, withCredentials: true });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getBranches());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboard(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const cards = dashboardData?.cards || {};
  const listData = dashboardData?.lists || {};

  const normalizeInquirySource = (source) => {
    const value = String(source || '').trim().toLowerCase();
    if (!value) return 'Other';
    if (value.includes('dsr')) return 'DSR';
    if (value.includes('walk') || value.includes('offline') || value === 'direct') return 'Offline';
    if (value.includes('online') || value.includes('quickcontact')) return 'Online';
    return 'Other';
  };

  const inquirySourceStats = useMemo(() => {
    const rows = dashboardData?.charts?.sourceCounts || [];
    const stats = { online: 0, offline: 0, dsr: 0, other: 0 };
    rows.forEach((row) => {
      const count = Number(row?.count || 0);
      const bucket = normalizeInquirySource(row?._id);
      if (bucket === 'Online') stats.online += count;
      else if (bucket === 'Offline') stats.offline += count;
      else if (bucket === 'DSR') stats.dsr += count;
      else stats.other += count;
    });
    return stats;
  }, [dashboardData]);

  const sourceChart = useMemo(() => {
    const rows = dashboardData?.charts?.sourceCounts || [];
    const normalized = rows.reduce((acc, row) => {
      const bucket = normalizeInquirySource(row?._id);
      const count = Number(row?.count || 0);
      acc[bucket] = (acc[bucket] || 0) + count;
      return acc;
    }, { Online: 0, Offline: 0, DSR: 0, Other: 0 });
    const labels = ['Online', 'Offline', 'DSR', 'Other'].filter(label => label !== 'Other' || normalized[label] > 0);
    const colors = {
      Online: '#2563eb',
      Offline: '#16a34a',
      DSR: '#f97316',
      Other: '#9333ea'
    };
    return {
      labels,
      datasets: [{
        label: 'Inquiries',
        data: labels.map(label => normalized[label]),
        backgroundColor: labels.map(label => colors[label]),
        borderWidth: 0
      }]
    };
  }, [dashboardData]);

  const paymentChart = useMemo(() => {
    const rows = dashboardData?.charts?.paymentModeCounts || [];
    return {
      labels: rows.map(row => row._id || 'Unknown'),
      datasets: [{
        label: 'Collection',
        data: rows.map(row => row.amount),
        backgroundColor: '#2563eb',
        borderRadius: 8,
        maxBarThickness: 42
      }]
    };
  }, [dashboardData]);

  const overviewChart = useMemo(() => ({
    labels: ['Inquiries', 'Admissions', 'Registrations', 'Visitors', 'Receipts'],
    datasets: [{
      label: 'Count',
      data: [cards.inquiries || 0, cards.admissions || 0, cards.registrations || 0, cards.visitors || 0, cards.receipts || 0],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.14)',
      pointBackgroundColor: '#2563eb',
      pointRadius: 4,
      tension: 0.35,
      fill: true
    }]
  }), [cards]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
      tooltip: { padding: 10 }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef2f7' } },
      x: { grid: { display: false } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }
    }
  };

  const resetFilters = () => {
    const reset = { period: 'today', branchId: '', fromDate: '', toDate: '' };
    setFilters(reset);
  };

  const selectedPeriodLabel = periodOptions.find(option => option.value === filters.period)?.label || 'Today';
  const effectiveBranchId = dashboardData?.filters?.branchId || filters.branchId || '';
  const selectedBranchName = effectiveBranchId
    ? branches.find(branch => branch._id === effectiveBranchId)?.name || user?.branchName || 'Selected Branch'
    : isSuperAdmin
      ? 'All Branches'
      : user?.branchName || 'My Branch';

  const recentListLimit = dashboardData?.filters?.recentListLimit || 5;
  const totalActivity = ['inquiries', 'admissions', 'registrations', 'visitors', 'receipts']
    .reduce((sum, key) => sum + Number(cards[key] || 0), 0);
  const pendingWork = Number(cards.pendingAdmissionFees || 0) + Number(cards.pendingRegistrationFees || 0);

  const summaryCards = [
    { label: 'Inquiries', value: cards.inquiries, icon: <Users size={22} />, tone: 'border-l-blue-500', helper: 'New leads', iconTone: 'bg-blue-50 text-blue-700' },
    { label: 'Admissions', value: cards.admissions, icon: <UserPlus size={22} />, tone: 'border-l-emerald-500', helper: 'Students joined', iconTone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Registrations', value: cards.registrations, icon: <CheckCircle size={22} />, tone: 'border-l-violet-500', helper: 'Registered students', iconTone: 'bg-violet-50 text-violet-700' },
    { label: 'Visitors', value: cards.visitors, icon: <CalendarDays size={22} />, tone: 'border-l-orange-500', helper: 'Campus visits', iconTone: 'bg-orange-50 text-orange-700' },
    { label: 'Receipts', value: cards.receipts, icon: <Wallet size={22} />, tone: 'border-l-cyan-500', helper: 'Payments taken', iconTone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Total Collection', value: formatAmount(cards.collection), icon: <Wallet size={22} />, tone: 'border-l-green-500', helper: 'All fee receipts', iconTone: 'bg-green-50 text-green-700' },
    { label: 'Admission Fees', value: formatAmount(cards.admissionFees), icon: <Building2 size={22} />, tone: 'border-l-indigo-500', helper: 'Admission collection', iconTone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Registration Fees', value: formatAmount(cards.registrationFees), icon: <Building2 size={22} />, tone: 'border-l-pink-500', helper: 'Registration collection', iconTone: 'bg-pink-50 text-pink-700' },
    { label: 'Total Expenses', value: formatAmount(cards.totalExpenses), icon: <Receipt size={22} />, tone: 'border-l-red-500', helper: `${cards.expenseCount || 0} expense entries`, iconTone: 'bg-red-50 text-red-700' }
  ];

  const inquirySourceCards = [
    { label: 'Online Inquiries', value: inquirySourceStats.online, icon: <Globe size={22} />, tone: 'border-l-sky-500', helper: 'Online lead source', iconTone: 'bg-sky-50 text-sky-700' },
    { label: 'Offline Inquiries', value: inquirySourceStats.offline, icon: <Building2 size={22} />, tone: 'border-l-amber-500', helper: 'Walk-in / offline leads', iconTone: 'bg-amber-50 text-amber-700' },
    { label: 'DSR Inquiries', value: inquirySourceStats.dsr, icon: <BarChart3 size={22} />, tone: 'border-l-orange-500', helper: 'Field / DSR leads', iconTone: 'bg-orange-50 text-orange-700' },
    { label: 'Other Sources', value: inquirySourceStats.other, icon: <Users size={22} />, tone: 'border-l-slate-400', helper: 'Unmapped sources', iconTone: 'bg-slate-100 text-slate-600' }
  ];

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
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
                <h1 className="flex min-w-0 items-center gap-2 text-2xl font-black text-slate-900 sm:text-3xl">
                  <BarChart3 className="shrink-0 text-blue-300" />
                  <span className="truncate text-white">Overall Dashboard</span>
                </h1>
                <p className="mt-1 text-sm text-slate-300">Readable operating view for inquiries, admissions, visitors, and fee collection.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <HeaderStat label="Period" value={selectedPeriodLabel} />
              <HeaderStat label="Branch" value={selectedBranchName} />
              <HeaderStat
                label="Range"
                value={`${dashboardData?.filters?.start ? formatDate(dashboardData.filters.start) : '-'} to ${dashboardData?.filters?.end ? formatDate(dashboardData.filters.end) : '-'}`}
              />
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="space-y-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Date Filter</label>
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
                {isSuperAdmin ? (
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Branch</label>
                    <select
                      value={filters.branchId}
                      onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="">All Branches</option>
                      {branches.map(branch => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Branch</label>
                    <select
                      value={user?.branchId?._id || user?.branchId || ''}
                      disabled
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500 outline-none"
                    >
                      <option value={user?.branchId?._id || user?.branchId || ''}>{user?.branchName || 'My Branch'}</option>
                    </select>
                  </div>
                )}

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

            <div className="grid grid-cols-1 gap-2 sm:flex">
              <button onClick={resetFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200">
                <RefreshCw size={16} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div>
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-500 shadow-sm">
              <RefreshCw className="mr-2 inline-block animate-spin" size={18} /> Loading dashboard...
            </div>
          ) : dashboardData && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Collection Snapshot</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{formatAmount(cards.collection)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric label="Admission" value={formatAmount(cards.admissionFees)} />
                    <MiniMetric label="Registration" value={formatAmount(cards.registrationFees)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Activity Volume</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{totalActivity.toLocaleString('en-IN')}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniMetric label="Leads" value={cards.inquiries || 0} />
                    <MiniMetric label="Visits" value={cards.visitors || 0} />
                    <MiniMetric label="Receipts" value={cards.receipts || 0} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pending Work</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{pendingWork.toLocaleString('en-IN')}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric label="Admission Fees" value={cards.pendingAdmissionFees || 0} />
                    <MiniMetric label="Registration" value={cards.pendingRegistrationFees || 0} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Expenses</p>
                  <p className="mt-2 text-3xl font-black text-red-600">{formatAmount(cards.totalExpenses)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric label="Entries" value={cards.expenseCount || 0} />
                    <MiniMetric label="Net Income" value={formatAmount((cards.collection || 0) - (cards.totalExpenses || 0))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {inquirySourceCards.map(card => (
                  <div key={card.label} className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-slate-500">{card.label}</p>
                        <p className="mt-2 break-words text-2xl font-black text-slate-900">{card.value ?? 0}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{card.helper}</p>
                      </div>
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${card.iconTone}`}>{card.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(card => (
                  <div key={card.label} className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-slate-500">{card.label}</p>
                        <p className="mt-2 break-words text-2xl font-black text-slate-900">{card.value ?? 0}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{card.helper}</p>
                      </div>
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${card.iconTone}`}>{card.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <ChartPanel title="Overall Activity" subtitle="Counts by workflow">
                  <Line data={overviewChart} options={chartOptions} />
                </ChartPanel>
                <ChartPanel title="Inquiry Source" subtitle="Source wise inquiries">
                  <div className="flex h-full flex-col">
                    <div className="min-h-0 flex-1">
                      <Doughnut data={sourceChart} options={doughnutOptions} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <SourceLegendItem label="Online" value={inquirySourceStats.online} color="#2563eb" />
                      <SourceLegendItem label="Offline" value={inquirySourceStats.offline} color="#16a34a" />
                      <SourceLegendItem label="DSR" value={inquirySourceStats.dsr} color="#f97316" />
                      {inquirySourceStats.other > 0 && (
                        <SourceLegendItem label="Other" value={inquirySourceStats.other} color="#9333ea" />
                      )}
                    </div>
                  </div>
                </ChartPanel>
                <ChartPanel title="Payment Collection" subtitle="Payment mode wise amount">
                  <Bar data={paymentChart} options={chartOptions} />
                </ChartPanel>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <DataTable title="Recent Inquiries" rows={listData.inquiries} limit={recentListLimit} columns={[
                  ['Date', row => formatDate(row.createdAt)],
                  ['Name', row => `${row.firstName || ''} ${row.lastName || ''}`],
                  ['Source', row => row.source || '-'],
                  ['Branch', row => row.branchId?.name || '-']
                ]} />
                <DataTable title="Recent Admissions" rows={listData.admissions} limit={recentListLimit} columns={[
                  ['Date', row => formatDate(row.admissionDate)],
                  ['Student', row => `${row.firstName || ''} ${row.lastName || ''}`],
                  ['Course', row => row.course?.name || '-'],
                  ['Branch', row => row.branchId?.name || '-']
                ]} />
                <DataTable title="Recent Fee Receipts" rows={listData.receipts} limit={recentListLimit} columns={[
                  ['Date', row => formatDate(row.date)],
                  ['Receipt', row => row.receiptNo],
                  ['Student', row => row.student ? `${row.student.firstName || ''} ${row.student.lastName || ''}` : '-'],
                  ['Branch', row => row.branch?.name || '-'],
                  ['Amount', row => formatAmount(row.amountPaid), 'text-right font-black']
                ]} />
                <DataTable title="Recent Visitors" rows={listData.visitors} limit={recentListLimit} columns={[
                  ['Date', row => formatDate(row.visitingDate)],
                  ['Student', row => row.studentName || '-'],
                  ['Contact', row => row.mobileNumber || row.contactParent || '-'],
                  ['Branch', row => row.branchId?.name || '-'],
                  ['Status', row => row.status || 'Open']
                ]} />
                <DataTable title="Recent Expenses" rows={listData.expenses} limit={recentListLimit} columns={[
                  ['Date', row => formatDate(row.date)],
                  ['Category', row => row.category?.name || '-'],
                  ['Reason', row => row.reason || '-'],
                  ['Branch', row => row.branch?.name || '-'],
                  ['Amount', row => formatAmount(row.amount), 'text-right font-black text-red-600']
                ]} />
              </div>
            </div>
          )}
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
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Live</span>
      </div>
    </div>
    <div className="h-[280px] sm:h-[320px] xl:h-[300px]">
      {children}
    </div>
  </div>
);

const DataTable = ({ title, rows = [], columns, limit = 5 }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="text-xs font-semibold text-slate-500">Latest {limit} records from selected range</p>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">{rows.length} shown</span>
    </div>

    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-white text-xs uppercase text-slate-500">
          <tr>{columns.map(([label]) => <th key={label} className="p-3 text-left font-black">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map(row => (
            <tr key={row._id} className="hover:bg-slate-50">
              {columns.map(([label, render, className = '']) => (
                <td key={label} className={`p-3 text-slate-700 ${className}`}>{render(row)}</td>
              ))}
            </tr>
          )) : <tr><td colSpan={columns.length} className="p-8 text-center font-semibold text-slate-400">No data found.</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="divide-y divide-slate-100 md:hidden">
      {rows.length ? rows.map(row => (
        <div key={row._id} className="space-y-2 p-4">
          {columns.map(([label, render]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
              <span className="min-w-0 text-right text-sm font-semibold text-slate-800">{render(row)}</span>
            </div>
          ))}
        </div>
      )) : <div className="p-8 text-center font-semibold text-slate-400">No data found.</div>}
    </div>
  </div>
);

const HeaderStat = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-300">{label}</p>
    <p className="mt-1 max-w-[190px] truncate text-sm font-black text-white" title={value}>{value}</p>
  </div>
);

const SourceLegendItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="flex min-w-0 items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-black text-slate-900">{value ?? 0}</span>
  </div>
);

const MiniMetric = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-900" title={String(value)}>{value}</p>
  </div>
);


export default AdminDashboard;

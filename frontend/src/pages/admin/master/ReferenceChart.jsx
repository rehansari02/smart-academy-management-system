import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  TrendingUp,
  Users,
  Award,
  ChevronRight,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getBranches } from '../../../features/master/branchSlice';

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

const ReferenceChart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { branches } = useSelector((state) => state.branch);

  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState([]);
  const [filters, setFilters] = useState({ period: 'month', branchId: '', fromDate: '', toDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';

  useEffect(() => {
    dispatch(getBranches());
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        period: filters.period,
        ...(isSuperAdmin && filters.branchId && { branchId: filters.branchId }),
        ...(filters.period === 'custom' && filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.period === 'custom' && filters.toDate && { toDate: filters.toDate })
      };
      const { data } = await axios.get(API, { params, withCredentials: true });
      setReferences(data.references || []);
    } catch (error) {
      console.error('Failed to load chart data', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  // Check if a reference is external by looking at the separate external references list
  // We identify external refs by checking against isExternal flag (set by backend)
  const internalRefs = useMemo(() => {
    return references.filter(r => !r.isExternal);
  }, [references]);

  const externalRefs = useMemo(() => {
    return references.filter(r => r.isExternal);
  }, [references]);

  // Combined external reference entry
  const externalCombined = useMemo(() => {
    if (externalRefs.length === 0) return null;
    return {
      _id: 'External Reference',
      isExternal: true,
      studentCount: externalRefs.reduce((acc, r) => acc + (r.studentCount || 0), 0),
      admissionCount: externalRefs.reduce((acc, r) => acc + (r.admissionCount || 0), 0),
      totalIncentive: externalRefs.reduce((acc, r) => acc + (r.totalIncentive || 0), 0),
      totalFees: externalRefs.reduce((acc, r) => acc + (r.totalFees || 0), 0),
    };
  }, [externalRefs]);

  const filteredRefs = useMemo(() => {
    // Only show internal references individually + one combined external reference
    let list = [...internalRefs];
    if (externalCombined) {
      list.push(externalCombined);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r._id.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.studentCount - a.studentCount);
  }, [internalRefs, externalCombined, searchQuery]);

  const topChartData = useMemo(() => {
    return filteredRefs.filter(r => r.studentCount > 0).slice(0, 15);
  }, [filteredRefs]);

  const stats = useMemo(() => {
    return {
      totalReferrals: references.reduce((acc, r) => acc + (r.studentCount || 0), 0),
      totalIncentive: references.reduce((acc, r) => acc + (r.totalIncentive || 0), 0)
    };
  }, [references]);

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-800">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
        
        {/* Header */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-[#111827] shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                onClick={() => navigate('/reference-incentive')}
                className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition-all"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-200">Smart Academy</p>
                <h1 className="flex min-w-0 items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                  <TrendingUp className="shrink-0 text-blue-300" />
                  <span className="truncate">Teacher Referral Chart</span>
                </h1>
                <p className="mt-1 text-sm text-slate-300">View leaderboards and statistics for teacher and staff references</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 min-w-[150px]">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-200">Total Referrals</p>
                <p className="mt-1 text-xl font-black text-white">{stats.totalReferrals} Students</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 min-w-[150px]">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-200">Total Incentive Accrued</p>
                <p className="mt-1 text-xl font-black text-emerald-400">{formatMoney(stats.totalIncentive)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">Period Filter</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
                {periodOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      period: option.value,
                      ...(option.value !== 'custom' ? { fromDate: '', toDate: '' } : {})
                    }))}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all duration-200 ${
                      filters.period === option.value
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
              {isSuperAdmin && (
                <div className="min-w-[180px]">
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
              )}

              {filters.period === 'custom' && (
                <div className="flex flex-col gap-3 sm:flex-row">
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          
          {/* Bar Chart Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">References Statistics</h3>
                <p className="text-xs font-semibold text-slate-400">Frequency of student registrations by referrer (Top 15)</p>
              </div>
              {loading && <RefreshCw className="animate-spin text-primary" size={18} />}
            </div>

            <div className="h-[420px] w-full">
              {topChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChartData} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="_id" 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                      labelClassName="font-black text-slate-800"
                      formatter={(value) => [`${value} Students`, 'Total Referrals']}
                    />
                    <Bar 
                      dataKey="studentCount" 
                      fill="#3b82f6" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 text-slate-400 text-center p-6">
                  <Users size={48} className="text-slate-300" />
                  <p className="text-sm font-black">No referral data found for this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Ranking List */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="text-amber-500" /> Leaderboard
              </h3>
              <p className="text-xs font-semibold text-slate-400">Referrers ranked by student count</p>
            </div>

            <div className="mb-4 relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search referrer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary/50 focus:bg-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] rounded-xl border border-slate-100 divide-y divide-slate-100 pr-1">
              {filteredRefs.length > 0 ? (
                filteredRefs.map((ref, idx) => (
                  <div 
                    key={ref._id} 
                    onClick={() => {
                      if (ref.isExternal) {
                        // For external combined entry, navigate to incentive page with a note
                        toast.info('Showing all external references in incentive page');
                        navigate(`/reference-incentive`);
                      } else {
                        navigate(`/reference-incentive`, { state: { autoSelectReference: ref._id } });
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between p-3 transition group ${
                      ref.isExternal ? 'hover:bg-amber-50/60' : 'hover:bg-indigo-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        ref.isExternal ? 'bg-amber-100 text-amber-700' :
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {ref.isExternal ? 'E' : (idx + 1)}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate transition-colors ${
                          ref.isExternal ? 'text-amber-700 group-hover:text-amber-800' : 'text-slate-800 group-hover:text-primary'
                        }`}>{ref._id || 'Direct'}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{ref.studentCount} student(s) referred</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        ref.isExternal ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {formatMoney(ref.totalIncentive)}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs font-semibold text-slate-400">
                  No referrers matched search
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ReferenceChart;

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import moment from 'moment';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend, LabelList,
} from 'recharts';
import {
  BookOpenCheck, CalendarDays, CheckCircle, Clock, MessageSquare,
  RefreshCw, Target, Users,
} from 'lucide-react';
import { toast } from 'react-toastify';

const API = `${import.meta.env.VITE_API_URL}/admin-dashboard/teacher-dashboard`;

const periodLabels = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom',
};

const percent = (value, total) => (!total ? 0 : Math.round((Number(value || 0) / Number(total || 0)) * 100));

const KpiCard = ({ title, value, helper, icon, tone }) => (
  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-wider text-gray-400">{title}</p>
        <p className="mt-1 text-xl font-black text-gray-900">{value}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-gray-500">{helper}</p>
      </div>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>{icon}</div>
    </div>
  </div>
);

const EmptyChart = () => (
  <div className="grid h-full place-items-center text-xs font-bold text-gray-400">No data</div>
);

const ProgressBar = ({ value, color = 'bg-emerald-500' }) => (
  <div className="h-2 rounded-full bg-gray-100">
    <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
  </div>
);

const ChartNote = ({ color, title, text }) => (
  <div className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <p className="text-xs font-black text-gray-900">{title}</p>
    </div>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{text}</p>
  </div>
);

const TeacherTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-black text-gray-900">{label}</p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center justify-between gap-6 text-xs font-bold">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="text-gray-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const TeacherDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';
  const [filters, setFilters] = useState({ period: 'today', fromDate: '', toDate: '', teacherId: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (override = {}) => {
    const nextFilters = { ...filters, ...override };
    setLoading(true);
    try {
      const params = {
        period: nextFilters.period,
        ...(nextFilters.teacherId ? { teacherId: nextFilters.teacherId } : {}),
        ...(nextFilters.period === 'custom' && nextFilters.fromDate ? { fromDate: nextFilters.fromDate } : {}),
        ...(nextFilters.period === 'custom' && nextFilters.toDate ? { toDate: nextFilters.toDate } : {}),
      };
      const res = await axios.get(API, { params, withCredentials: true });
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load teacher dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isSuperAdmin && data?.teachers?.length && !filters.teacherId) {
      const firstTeacherId = data.teachers[0]._id;
      setFilters(prev => ({ ...prev, teacherId: firstTeacherId }));
      fetchData({ teacherId: firstTeacherId });
    }
  }, [data?.teachers?.length, isSuperAdmin]);

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const lists = data?.lists || {};
  const syllabusPercent = percent(cards.completedChapters, cards.totalChapters);
  const projectPercent = percent(cards.completedProjects, cards.totalProjects);

  const rangeLabel = useMemo(() => {
    if (!data?.filters?.start || !data?.filters?.end) return periodLabels[filters.period] || 'Range';
    return `${moment(data.filters.start).format('DD MMM YYYY')} - ${moment(data.filters.end).format('DD MMM YYYY')}`;
  }, [data?.filters?.start, data?.filters?.end, filters.period]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => fetchData();

  const resetFilters = () => {
    const reset = { period: 'today', fromDate: '', toDate: '', teacherId: filters.teacherId };
    setFilters(reset);
    fetchData(reset);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Teacher Dashboard</p>
            <h2 className="mt-0.5 truncate text-2xl font-black text-gray-900">
              {data?.teacher?.name || 'Select Teacher'}
            </h2>
            <p className="mt-1 text-xs font-bold text-gray-500">{rangeLabel}</p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {isSuperAdmin && (
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-400">Employee</label>
                <select
                  value={filters.teacherId}
                  onChange={(e) => {
                    updateFilter('teacherId', e.target.value);
                    fetchData({ teacherId: e.target.value });
                  }}
                  className="h-10 min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select employee</option>
                  {(data?.teachers || []).map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} - {teacher.type || teacher.role || 'Active Teacher'} ({teacher.assignmentCount} subjects)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-400">Range</label>
              <select
                value={filters.period}
                onChange={(e) => updateFilter('period', e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {filters.period === 'custom' && (
              <>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => updateFilter('fromDate', e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => updateFilter('toDate', e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                />
              </>
            )}

            <button
              onClick={resetFilters}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-black text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw size={15} /> Reset
            </button>
            <button
              onClick={applyFilters}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <CalendarDays size={15} />} Apply
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiCard title="Sessions" value={cards.sessions || 0} helper={`${cards.studentsTaught || 0} students taught`} icon={<Clock size={18} />} tone="bg-blue-50 text-blue-700" />
        <KpiCard title="Syllabus" value={`${syllabusPercent}%`} helper={`${cards.completedChapters || 0}/${cards.totalChapters || 0} chapters`} icon={<BookOpenCheck size={18} />} tone="bg-emerald-50 text-emerald-700" />
        <KpiCard title="Projects" value={`${projectPercent}%`} helper={`${cards.completedProjects || 0}/${cards.totalProjects || 0} projects`} icon={<Target size={18} />} tone="bg-amber-50 text-amber-700" />
        <KpiCard title="Responses" value={cards.understoodCount || 0} helper={`${cards.commentCount || 0} comments, ${cards.pendingResponseCount || 0} pending`} icon={<MessageSquare size={18} />} tone="bg-violet-50 text-violet-700" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900">Activity Trend</h3>
              <p className="text-xs font-semibold text-gray-500">Day wise teaching activity in selected date range</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {cards.sessions || 0} total sessions
            </span>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="h-[300px] min-w-0 sm:h-80 lg:h-[352px]">
            {(charts.activityTrend || []).length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.activityTrend} margin={{ top: 18, right: 16, left: -4, bottom: 6 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
                  <Tooltip content={<TeacherTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="Sessions" name="Teaching Sessions" fill="#2563eb" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="Sessions" position="top" fontSize={11} fontWeight={800} fill="#1e3a8a" />
                  </Bar>
                  <Bar dataKey="Students" name="Students Taught" fill="#10b981" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="Students" position="top" fontSize={11} fontWeight={800} fill="#065f46" />
                  </Bar>
                  <Bar dataKey="Completed" name="Chapters Completed" fill="#f59e0b" radius={[5, 5, 0, 0]}>
                    <LabelList dataKey="Completed" position="top" fontSize={11} fontWeight={800} fill="#92400e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
            </div>
            <div className="grid gap-2 self-start">
              <ChartNote color="bg-blue-600" title="Teaching Sessions" text="Teacher ne kitni baar syllabus log/session add kiya." />
              <ChartNote color="bg-emerald-500" title="Students Taught" text="Us date par unique students jinke syllabus logs bane." />
              <ChartNote color="bg-amber-500" title="Chapters Completed" text="Us date par completed mark kiye gaye chapters." />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-gray-900">Subject Workload</h3>
              <p className="text-xs font-semibold text-gray-500">Subject wise sessions, students and completion</p>
            </div>
          </div>
          <div className="mt-3 h-[340px] sm:h-96">
            {(charts.subjectWorkload || []).length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.subjectWorkload} layout="vertical" margin={{ top: 8, right: 34, left: 28, bottom: 0 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} />
                  <Tooltip content={<TeacherTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="Sessions" name="Sessions" fill="#6366f1" radius={[0, 5, 5, 0]}>
                    <LabelList dataKey="Sessions" position="right" fontSize={11} fontWeight={800} fill="#3730a3" />
                  </Bar>
                  <Bar dataKey="Students" name="Students" fill="#10b981" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="Completed" name="Completed" fill="#f59e0b" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ChartNote color="bg-indigo-500" title="Sessions" text="Subject par total teaching logs." />
            <ChartNote color="bg-emerald-500" title="Students" text="Subject me unique students." />
            <ChartNote color="bg-amber-500" title="Completed" text="Subject ke completed chapters." />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Syllabus Status</h3>
            <div className="mt-3 h-48">
              {(charts.syllabusStatus || []).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.syllabusStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2}>
                      {charts.syllabusStatus.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-center text-emerald-700"><p className="text-[10px] font-black">Done</p><p className="text-lg font-black">{cards.completedChapters || 0}</p></div>
              <div className="rounded-lg bg-blue-50 p-2 text-center text-blue-700"><p className="text-[10px] font-black">Run</p><p className="text-lg font-black">{cards.runningChapters || 0}</p></div>
              <div className="rounded-lg bg-gray-50 p-2 text-center text-gray-700"><p className="text-[10px] font-black">Total</p><p className="text-lg font-black">{cards.totalChapters || 0}</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Student Response</h3>
            <div className="mt-3 h-48">
              {(charts.responseStatus || []).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.responseStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2}>
                      {charts.responseStatus.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
            <div className="mt-2 space-y-2">
              {(lists.recentResponses || []).slice(0, 2).map(item => (
                <div key={item._id} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="truncate text-xs font-black text-gray-900">{item.studentName}</p>
                  <p className="truncate text-[11px] font-semibold text-gray-500">{item.type} - {moment(item.respondedAt).format('DD MMM, hh:mm A')}</p>
                </div>
              ))}
              {!(lists.recentResponses || []).length && <p className="rounded-lg bg-gray-50 p-3 text-xs font-bold text-gray-400">No responses yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-gray-900">
                <BookOpenCheck size={18} className="text-emerald-600" /> Syllabus Structure
              </h3>
              <p className="text-xs font-semibold text-gray-500">Branch wise batch, course and subject progress</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              {cards.assignedSubjects || 0} subjects assigned
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {(lists.assignmentTree || []).map((branch) => (
              <div key={branch.name} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">{branch.name}</p>
                <div className="mt-3 grid gap-3 2xl:grid-cols-2">
                  {branch.batches.map((batch) => (
                    <div key={`${branch.name}-${batch.name}`} className="rounded-lg border border-gray-100 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-gray-900">{batch.name}</p>
                          <p className="text-[11px] font-bold text-gray-500">{batch.time || 'Batch time not set'}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {batch.courses.map((course) => (
                          <div key={`${batch.name}-${course.name}`} className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-black text-slate-800">{course.name}</p>
                            <div className="mt-2 grid gap-2">
                              {course.subjects.map((subject) => (
                                <div key={`${course.name}-${subject.subjectName}`} className="rounded-lg bg-white p-3 ring-1 ring-gray-100">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-black text-gray-900">{subject.subjectName}</p>
                                      <p className="text-[11px] font-semibold text-gray-500">
                                        {subject.completedChapters}/{subject.chapters} chapters, {subject.completedProjects}/{subject.projects} projects
                                      </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                                      {subject.progress}%
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <ProgressBar value={subject.progress} />
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-black">
                                    <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Done {subject.completedChapters}</span>
                                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">Run {subject.runningChapters}</span>
                                    <span className="rounded bg-gray-50 px-2 py-1 text-gray-600">Left {subject.pendingChapters}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!(lists.assignmentTree || []).length && (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm font-bold text-gray-400">
                No syllabus assignment found for this teacher.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900"><Users size={16} className="text-blue-600" /> Subject Progress</h3>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {(lists.assignments || []).map((item, index) => (
                <div key={`${item.subjectName}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-gray-900">{item.subjectName}</p>
                      <p className="truncate text-[11px] font-semibold text-gray-500">{item.branchName} / {item.batchName}</p>
                      <p className="truncate text-[11px] font-semibold text-gray-500">{item.courseName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{item.progress}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={item.progress} />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">
                    {item.completedChapters}/{item.chapters} chapters, {item.completedProjects}/{item.projects} projects
                  </p>
                </div>
              ))}
              {!(lists.assignments || []).length && <p className="rounded-lg border border-dashed p-4 text-xs font-bold text-gray-400">No subject assigned.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900"><Clock size={16} className="text-amber-600" /> Running Chapters</h3>
            <div className="mt-3 space-y-2">
              {(lists.runningChapters || []).slice(0, 4).map((item, index) => (
                <div key={`${item.chapterName}-${index}`} className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="truncate text-xs font-black text-gray-900">{item.chapterName}</p>
                  <p className="truncate text-[11px] font-semibold text-blue-700">{item.subjectName} - {item.batchName}</p>
                </div>
              ))}
              {!(lists.runningChapters || []).length && <p className="rounded-lg bg-emerald-50 p-3 text-xs font-bold text-emerald-700">No running chapter.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-black text-gray-900"><CheckCircle size={16} className="text-emerald-600" /> Recent Teaching Logs</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Student', 'Subject', 'Chapter', 'Status', 'Projects'].map(head => (
                  <th key={head} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(lists.recentLogs || []).map(item => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs font-bold text-gray-500">{moment(item.sessionDate).format('DD MMM, hh:mm A')}</td>
                  <td className="px-3 py-2 text-xs font-black text-gray-900">{item.studentName}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-gray-600">{item.subjectName}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-gray-600">{item.chapterName}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{item.status}</span></td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-500">{item.projectCount}</td>
                </tr>
              ))}
              {!(lists.recentLogs || []).length && (
                <tr><td colSpan="6" className="px-3 py-8 text-center text-xs font-bold text-gray-400">No teaching logs in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

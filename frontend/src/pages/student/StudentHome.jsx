import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    Play,
    Target,
    TrendingUp,
} from 'lucide-react';
import moment from 'moment';
import {
    fetchDashboardStats,
    fetchFreeLearningQuestions,
    fetchQuizReport,
    fetchStudentSyllabus,
} from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const percent = (value, total) => (!total ? 0 : Math.round((value / total) * 100));
const clampPercent = (value) => Math.max(0, Math.min(100, value || 0));

const reportQuestionCount = (report) => {
    if (Array.isArray(report?.questions)) return report.questions.length;
    return Number(report?.totalQuestions || report?.questionCount || 0);
};

const reportScore = (report) => {
    if (Number.isFinite(Number(report?.totalScore))) return Number(report.totalScore);
    if (Number.isFinite(Number(report?.score))) return Number(report.score);
    return Array.isArray(report?.questions) ? report.questions.filter((item) => item.isCorrect).length : 0;
};

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

const MiniStat = ({ label, value, tone }) => (
    <div className={`rounded-lg px-3 py-2 ${tone}`}>
        <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{label}</p>
        <p className="mt-0.5 text-lg font-black">{value}</p>
    </div>
);

const StudentHome = () => {
    const { user } = useSelector((state) => state.auth);
    const { stats, syllabus, quizReports, quizQuestions, isLoading } = useSelector((state) => state.studentPortal);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchDashboardStats());
        dispatch(fetchStudentSyllabus());
        dispatch(fetchQuizReport());
        dispatch(fetchFreeLearningQuestions());
    }, [dispatch]);

    const dashboard = useMemo(() => {
        const subjects = syllabus?.subjects || [];
        const chapters = subjects.flatMap((subject) =>
            (subject.chapters || []).map((chapterData) => ({
                ...chapterData,
                subjectName: subject.name,
                subjectId: subject._id,
            }))
        );

        const completedChapters = chapters.filter((item) => item.status === 'Completed');
        const runningChapters = chapters.filter((item) => item.status === 'Running');
        const pendingChapters = chapters.filter((item) => !item.status);

        const projectRows = chapters.flatMap((chapterData) =>
            (chapterData.projects || []).map((project) => ({
                ...project,
                chapterName: chapterData.chapter?.name || 'Chapter',
                chapterId: chapterData.chapter?._id,
                subjectName: chapterData.subjectName,
            }))
        );
        const completedProjects = projectRows.filter((project) => project.completed);

        const pendingUnderstood = [];
        completedChapters.forEach((chapterData) => {
            const chapterName = chapterData.chapter?.name || 'Chapter';
            if (!chapterData.theoryResponse?.understood) {
                pendingUnderstood.push({
                    key: `theory:${chapterData.chapter?._id}`,
                    title: 'Theory pending',
                    label: chapterName,
                    subjectName: chapterData.subjectName,
                    date: chapterData.completedAt,
                    tone: 'bg-indigo-50 text-indigo-700',
                });
            }

            const allProjectsDone = (chapterData.projects || []).length > 0
                && chapterData.projects.every((project) => project.completed);
            if (allProjectsDone && !chapterData.chapterResponse?.understood) {
                pendingUnderstood.push({
                    key: `chapter:${chapterData.chapter?._id}`,
                    title: 'Chapter pending',
                    label: chapterName,
                    subjectName: chapterData.subjectName,
                    date: chapterData.completedAt,
                    tone: 'bg-violet-50 text-violet-700',
                });
            }
        });

        completedProjects.forEach((project) => {
            if (!project.studentResponse?.understood) {
                pendingUnderstood.push({
                    key: `project:${project._id}`,
                    title: 'Project pending',
                    label: project.name,
                    subjectName: `${project.subjectName} - ${project.chapterName}`,
                    date: project.completedAt,
                    tone: 'bg-emerald-50 text-emerald-700',
                });
            }
        });

        const subjectChart = subjects.map((subject) => {
            const subjectChapters = subject.chapters || [];
            return {
                name: subject.name,
                Done: subjectChapters.filter((item) => item.status === 'Completed').length,
                Run: subjectChapters.filter((item) => item.status === 'Running').length,
                Left: subjectChapters.filter((item) => !item.status).length,
            };
        });

        const answeredQuestions = (quizReports || []).reduce((total, report) => total + reportQuestionCount(report), 0);
        const correctQuestions = (quizReports || []).reduce((total, report) => total + reportScore(report), 0);
        const wrongQuestions = Math.max(answeredQuestions - correctQuestions, 0);
        const recentQuiz = (quizReports || [])[0] || null;

        return {
            totalChapters: chapters.length,
            completedChapters: completedChapters.length,
            runningChapters,
            pendingChapters: pendingChapters.length,
            totalProjects: projectRows.length,
            completedProjects: completedProjects.length,
            pendingUnderstood: pendingUnderstood
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 4),
            subjectChart,
            syllabusPie: [
                { name: 'Done', value: completedChapters.length, color: '#10b981' },
                { name: 'Running', value: runningChapters.length, color: '#3b82f6' },
                { name: 'Left', value: pendingChapters.length, color: '#e5e7eb' },
            ].filter((item) => item.value > 0),
            learningPie: [
                { name: 'Correct', value: correctQuestions, color: '#10b981' },
                { name: 'Wrong', value: wrongQuestions, color: '#ef4444' },
                { name: 'Pending', value: (quizQuestions || []).length, color: '#f59e0b' },
            ].filter((item) => item.value > 0),
            answeredQuestions,
            correctQuestions,
            wrongQuestions,
            pendingQuestions: (quizQuestions || []).length,
            recentQuiz,
        };
    }, [syllabus, quizReports, quizQuestions]);

    if (isLoading && !stats && !syllabus) return <Loading />;

    const studentName = stats?.studentName || user?.name || 'Student';
    const attendancePresent = stats?.presentDays || 0;
    const daysPassed = stats?.daysSinceJoining || 0;
    const attendanceMissed = Math.max(daysPassed - attendancePresent, 0);
    const monthPresent = stats?.currentMonthPresent || 0;
    const monthTotal = stats?.currentMonthTotal || 0;
    const monthAbsent = Math.max(monthTotal - monthPresent, 0);

    const attendancePercent = percent(attendancePresent, daysPassed);
    const monthAttendancePercent = percent(monthPresent, monthTotal);
    const courseDaysPercent = percent(daysPassed, stats?.totalCourseDays || 0);
    const syllabusPercent = percent(dashboard.completedChapters, dashboard.totalChapters);
    const projectPercent = percent(dashboard.completedProjects, dashboard.totalProjects);
    const learningPercent = percent(dashboard.correctQuestions, dashboard.answeredQuestions);

    const attendancePie = [
        { name: 'Present', value: attendancePresent, color: '#2563eb' },
        { name: 'Missed', value: attendanceMissed, color: '#e5e7eb' },
    ].filter((item) => item.value > 0);

    const attendanceBars = [
        { name: 'Overall', Present: attendancePresent, Missed: attendanceMissed },
        { name: moment().format('MMM'), Present: monthPresent, Missed: monthAbsent },
    ];

    return (
        <div className="space-y-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-primary">Student Dashboard</p>
                        <h1 className="mt-0.5 truncate text-xl font-black text-gray-900">Welcome back, {studentName}</h1>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                {syllabus?.course?.name || stats?.courseName || 'Course'}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                                Running: {dashboard.runningChapters[0]?.chapter?.name || 'None'}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                {dashboard.pendingUnderstood.length} actions pending
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:w-[470px]">
                        <Link to="/student/syllabus" className="inline-flex items-center justify-center gap-1 rounded-lg bg-gray-900 px-2 py-2 text-xs font-bold text-white hover:bg-gray-800">
                            <BookOpenCheck size={14} /> Syllabus
                        </Link>
                        <Link to="/student/study/free-learning" className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100">
                            <Brain size={14} /> Practice
                        </Link>
                        <Link to="/student/study/free-learning-report" className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100">
                            <TrendingUp size={14} /> Report
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <KpiCard
                    title="Syllabus"
                    value={`${syllabusPercent}%`}
                    helper={`${dashboard.completedChapters}/${dashboard.totalChapters} chapters`}
                    icon={<BookOpenCheck size={18} />}
                    tone="bg-emerald-50 text-emerald-700"
                />
                <KpiCard
                    title="Attendance"
                    value={`${attendancePercent}%`}
                    helper={`${attendancePresent}/${daysPassed} days`}
                    icon={<Calendar size={18} />}
                    tone="bg-blue-50 text-blue-700"
                />
                <KpiCard
                    title="Free Learning"
                    value={`${learningPercent}%`}
                    helper={`${dashboard.correctQuestions}/${dashboard.answeredQuestions || 0} correct`}
                    icon={<Brain size={18} />}
                    tone="bg-violet-50 text-violet-700"
                />
                <KpiCard
                    title="Projects"
                    value={`${projectPercent}%`}
                    helper={`${dashboard.completedProjects}/${dashboard.totalProjects} done`}
                    icon={<Target size={18} />}
                    tone="bg-amber-50 text-amber-700"
                />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                                    <Calendar size={16} className="text-blue-600" /> Attendance
                                </h2>
                                <p className="text-[11px] font-semibold text-gray-500">Overall and this month</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                                {moment().format('MMM YYYY')}
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-[118px_minmax(0,1fr)] gap-3">
                            <div className="h-28">
                                {attendancePie.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={attendancePie} dataKey="value" nameKey="name" innerRadius={32} outerRadius={48} paddingAngle={2}>
                                                {attendancePie.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="grid h-full place-items-center text-[11px] font-bold text-gray-400">No data</div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <MiniStat label="Overall" value={`${attendancePercent}%`} tone="bg-blue-50 text-blue-700" />
                                <MiniStat label={moment().format('MMM')} value={`${monthAttendancePercent}%`} tone="bg-emerald-50 text-emerald-700" />
                                <MiniStat label="Present" value={attendancePresent} tone="bg-gray-50 text-gray-800" />
                                <MiniStat label="Course" value={`${clampPercent(courseDaysPercent)}%`} tone="bg-amber-50 text-amber-700" />
                            </div>
                        </div>
                        <div className="mt-3 h-24">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceBars} margin={{ top: 4, right: 6, left: -26, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip />
                                    <Bar dataKey="Present" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Missed" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                                    <BarChart3 size={16} className="text-primary" /> Subject Progress
                                </h2>
                                <p className="text-[11px] font-semibold text-gray-500">Done, running, left</p>
                            </div>
                            <span className="text-[11px] font-black text-emerald-700">{dashboard.completedChapters}/{dashboard.totalChapters}</span>
                        </div>
                        <div className="mt-3 h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dashboard.subjectChart} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} height={36} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip />
                                    <Bar dataKey="Done" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Run" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="Left" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                                    <TrendingUp size={16} className="text-violet-600" /> Free Learning
                                </h2>
                                <p className="text-[11px] font-semibold text-gray-500">Practice score and pending questions</p>
                            </div>
                            <Link to="/student/study/free-learning-report" className="text-[11px] font-black text-primary hover:underline">Report</Link>
                        </div>
                        <div className="mt-3 grid grid-cols-[118px_minmax(0,1fr)] gap-3">
                            <div className="h-28">
                                {dashboard.learningPie.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dashboard.learningPie} dataKey="value" nameKey="name" innerRadius={30} outerRadius={46} paddingAngle={2}>
                                                {dashboard.learningPie.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="grid h-full place-items-center text-[11px] font-bold text-gray-400">No data</div>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <MiniStat label="Answered" value={dashboard.answeredQuestions} tone="bg-violet-50 text-violet-700" />
                                <MiniStat label="Correct" value={dashboard.correctQuestions} tone="bg-emerald-50 text-emerald-700" />
                                <MiniStat label="Pending" value={dashboard.pendingQuestions} tone="bg-amber-50 text-amber-700" />
                            </div>
                        </div>
                        {dashboard.recentQuiz && (
                            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
                                Recent quiz: {reportScore(dashboard.recentQuiz)}/{reportQuestionCount(dashboard.recentQuiz)}
                                <span className="ml-2 text-gray-400">{moment(dashboard.recentQuiz.date).format('DD MMM, hh:mm A')}</span>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                                    <Target size={16} className="text-emerald-600" /> Syllabus Mix
                                </h2>
                                <p className="text-[11px] font-semibold text-gray-500">Chapter status distribution</p>
                            </div>
                            <span className="text-[11px] font-black text-gray-500">{dashboard.pendingChapters} left</span>
                        </div>
                        <div className="mt-3 grid grid-cols-[118px_minmax(0,1fr)] gap-3">
                            <div className="h-28">
                                {dashboard.syllabusPie.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dashboard.syllabusPie} dataKey="value" nameKey="name" innerRadius={30} outerRadius={46} paddingAngle={2}>
                                                {dashboard.syllabusPie.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="grid h-full place-items-center text-[11px] font-bold text-gray-400">No data</div>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <MiniStat label="Done" value={dashboard.completedChapters} tone="bg-emerald-50 text-emerald-700" />
                                <MiniStat label="Run" value={dashboard.runningChapters.length} tone="bg-blue-50 text-blue-700" />
                                <MiniStat label="Left" value={dashboard.pendingChapters} tone="bg-gray-50 text-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                                <Clock size={16} className="text-rose-600" /> Pending Understand
                            </h2>
                            <Link to="/student/syllabus" className="text-[11px] font-black text-primary hover:underline">Open</Link>
                        </div>
                        <div className="mt-3 space-y-2">
                            {dashboard.pendingUnderstood.length ? dashboard.pendingUnderstood.map((item) => (
                                <div key={item.key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${item.tone}`}>
                                                {item.title}
                                            </span>
                                            <p className="mt-1 truncate text-xs font-black text-gray-900">{item.label}</p>
                                            <p className="truncate text-[11px] font-semibold text-gray-500">{item.subjectName}</p>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold text-gray-400">
                                            {item.date ? moment(item.date).format('DD MMM') : 'Now'}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4 text-center">
                                    <CheckCircle className="mx-auto text-emerald-600" size={24} />
                                    <p className="mt-1 text-xs font-bold text-emerald-700">No pending response</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                            <Play size={16} className="text-blue-600" /> Running Chapters
                        </h2>
                        <div className="mt-3 space-y-2">
                            {dashboard.runningChapters.length ? dashboard.runningChapters.slice(0, 3).map((item) => (
                                <div key={item.chapter?._id} className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="truncate text-[11px] font-black uppercase tracking-wider text-blue-600">{item.subjectName}</p>
                                    <p className="truncate text-xs font-black text-gray-900">{item.chapter?.name || 'Chapter'}</p>
                                    <p className="text-[11px] font-semibold text-gray-500">
                                        {item.startedAt ? moment(item.startedAt).format('DD MMM YYYY') : 'Started recently'}
                                    </p>
                                </div>
                            )) : (
                                <div className="rounded-lg border border-dashed border-gray-200 p-4 text-xs font-semibold text-gray-400">
                                    No chapter running right now.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-black text-gray-900">Course Progress</h2>
                        <div className="mt-3 space-y-3">
                            <div>
                                <div className="mb-1 flex justify-between text-[11px] font-bold text-gray-500">
                                    <span>Course days</span>
                                    <span>{daysPassed}/{stats?.totalCourseDays || 0}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100">
                                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${clampPercent(courseDaysPercent)}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="mb-1 flex justify-between text-[11px] font-bold text-gray-500">
                                    <span>Projects</span>
                                    <span>{dashboard.completedProjects}/{dashboard.totalProjects}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100">
                                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${clampPercent(projectPercent)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentHome;

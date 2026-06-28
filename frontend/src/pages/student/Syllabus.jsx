import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpenCheck, CheckCircle2, Circle, Lock, MessageSquare, Play, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
    fetchStudentSyllabus,
    submitSyllabusAck,
    submitSyllabusComment,
} from '../../features/student/studentPortalSlice';
import Loading from '../../components/Loading';

const responseText = (response) => response?.understood ? 'Understood' : 'Mark understood';

const Syllabus = () => {
    const dispatch = useDispatch();
    const { syllabus, isLoading } = useSelector((state) => state.studentPortal);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [comments, setComments] = useState({});
    const [savingKey, setSavingKey] = useState('');

    useEffect(() => {
        dispatch(fetchStudentSyllabus());
    }, [dispatch]);

    useEffect(() => {
        if (!selectedSubjectId && syllabus?.subjects?.length) {
            setSelectedSubjectId(syllabus.subjects[0]._id);
        }
    }, [selectedSubjectId, syllabus]);

    const selectedSubject = useMemo(
        () => syllabus?.subjects?.find((subject) => subject._id === selectedSubjectId),
        [selectedSubjectId, syllabus]
    );

    useEffect(() => {
        if (!selectedSubject) return;
        const next = {};
        selectedSubject.chapters?.forEach((chapterData) => {
            next[chapterData.chapter._id] = chapterData.commentResponse?.comment || '';
        });
        setComments(next);
    }, [selectedSubjectId, selectedSubject]);

    const refresh = () => dispatch(fetchStudentSyllabus());

    const handleAck = async ({ subjectId, chapterId, projectId = null, type, message }) => {
        if (!window.confirm(message)) return;
        const key = [type, chapterId, projectId || ''].join(':');
        setSavingKey(key);
        try {
            await dispatch(submitSyllabusAck({ subjectId, chapterId, projectId, type })).unwrap();
            toast.success('Response saved');
            refresh();
        } catch (error) {
            toast.error(error || 'Failed to save response');
        } finally {
            setSavingKey('');
        }
    };

    const handleSaveComment = async (chapterId) => {
        const comment = (comments[chapterId] || '').trim();
        setSavingKey(`comment:${chapterId}`);
        try {
            await dispatch(submitSyllabusComment({
                subjectId: selectedSubject._id,
                chapterId,
                comment,
            })).unwrap();
            toast.success('Comment saved');
            refresh();
        } catch (error) {
            toast.error(error || 'Failed to save comment');
        } finally {
            setSavingKey('');
        }
    };

    if (isLoading && !syllabus) return <Loading />;

    const subjects = syllabus?.subjects || [];

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
                            <BookOpenCheck className="text-primary" size={26} />
                            Syllabus
                        </h1>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            {syllabus?.course?.name || 'Your course syllabus'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center font-semibold text-gray-400">
                    No subjects found for your course.
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm lg:self-start">
                        <p className="px-2 pb-2 text-xs font-black uppercase tracking-wider text-gray-400">Subjects</p>
                        <div className="space-y-2">
                            {subjects.map((subject) => (
                                <button
                                    key={subject._id}
                                    type="button"
                                    onClick={() => setSelectedSubjectId(subject._id)}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
                                        selectedSubjectId === subject._id
                                            ? 'bg-blue-50 text-primary ring-1 ring-blue-100'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {subject.name}
                                </button>
                            ))}
                        </div>
                    </aside>

                    <section className="space-y-4">
                        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                            <h2 className="text-xl font-black text-gray-900">{selectedSubject?.name}</h2>
                            <p className="mt-1 text-sm font-semibold text-gray-500">
                                {(selectedSubject?.chapters || []).length} chapter(s)
                            </p>
                        </div>

                        {(selectedSubject?.chapters || []).map((chapterData, index) => {
                            const chapter = chapterData.chapter || {};
                            const isRunning = chapterData.status === 'Running';
                            const isCompleted = chapterData.status === 'Completed';
                            const isVisible = isRunning || isCompleted;
                            const allProjectsDone = (chapterData.projects || []).length > 0
                                && chapterData.projects.every((project) => project.completed);

                            return (
                                <div key={chapter._id || index} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-gray-500 ring-1 ring-gray-200">
                                                    {index + 1}
                                                </span>
                                                <h3 className="truncate text-base font-black text-gray-900">{chapter.name}</h3>
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-gray-500">
                                                {isRunning ? 'Running chapter' : isCompleted ? 'Completed chapter' : 'Coming soon'}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                                            isRunning
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : isCompleted
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {isRunning ? <Play size={13} /> : isCompleted ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                                            {isRunning ? 'Running' : isCompleted ? 'Completed' : 'Coming soon'}
                                        </span>
                                    </div>

                                    {!isVisible ? (
                                        <div className="p-5 text-sm font-semibold text-gray-400">
                                            This chapter is not started yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 p-4">
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <div className="rounded-lg bg-blue-50 p-3">
                                                    <p className="text-[11px] font-black uppercase text-blue-500">Started</p>
                                                    <p className="mt-1 text-sm font-extrabold text-gray-800">
                                                        {chapterData.startedAt ? moment(chapterData.startedAt).format('DD MMM YYYY') : '-'}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg bg-emerald-50 p-3">
                                                    <p className="text-[11px] font-black uppercase text-emerald-500">Completed</p>
                                                    <p className="mt-1 text-sm font-extrabold text-gray-800">
                                                        {chapterData.completedAt ? moment(chapterData.completedAt).format('DD MMM YYYY') : 'Pending'}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg bg-amber-50 p-3">
                                                    <p className="text-[11px] font-black uppercase text-amber-500">Teacher</p>
                                                    <p className="mt-1 text-sm font-extrabold text-gray-800">
                                                        {chapterData.completedBy || chapterData.startedBy || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-gray-100">
                                                <div className="border-b border-gray-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-gray-500">
                                                    Projects
                                                </div>
                                                <div className="divide-y divide-gray-100">
                                                    {(chapterData.projects || []).length === 0 ? (
                                                        <div className="px-3 py-4 text-sm font-semibold text-gray-400">No projects in this chapter.</div>
                                                    ) : chapterData.projects.map((project, projectIndex) => {
                                                        const projectKey = ['project', chapter._id, project._id].join(':');
                                                        return (
                                                            <div key={project._id || projectIndex} className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between">
                                                                <div>
                                                                    <p className="font-bold text-gray-800">{projectIndex + 1}. {project.name}</p>
                                                                    <p className="mt-0.5 text-xs font-semibold text-gray-400">
                                                                        {project.completed ? `Done ${project.completedAt ? moment(project.completedAt).format('DD MMM YYYY') : ''}` : 'Pending from teacher'}
                                                                    </p>
                                                                </div>
                                                                {project.completed ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={project.studentResponse?.understood || savingKey === projectKey}
                                                                        onClick={() => handleAck({
                                                                            subjectId: selectedSubject._id,
                                                                            chapterId: chapter._id,
                                                                            projectId: project._id,
                                                                            type: 'project',
                                                                            message: `Are you sure you understand project ${project.name}?`,
                                                                        })}
                                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-700"
                                                                    >
                                                                        <CheckCircle2 size={14} />
                                                                        {responseText(project.studentResponse)}
                                                                    </button>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500">
                                                                        <Circle size={13} /> Coming soon
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {isCompleted && (
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        disabled={chapterData.theoryResponse?.understood || savingKey === `theory:${chapter._id}:`}
                                                        onClick={() => handleAck({
                                                            subjectId: selectedSubject._id,
                                                            chapterId: chapter._id,
                                                            type: 'theory',
                                                            message: 'Are you sure you understand the theory?',
                                                        })}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-indigo-100 disabled:text-indigo-700"
                                                    >
                                                        <CheckCircle2 size={16} /> {responseText(chapterData.theoryResponse)}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!allProjectsDone || chapterData.chapterResponse?.understood || savingKey === `chapter:${chapter._id}:`}
                                                        onClick={() => handleAck({
                                                            subjectId: selectedSubject._id,
                                                            chapterId: chapter._id,
                                                            type: 'chapter',
                                                            message: `Are you sure you understand ${chapter.name}?`,
                                                        })}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-violet-100 disabled:text-violet-700"
                                                    >
                                                        <CheckCircle2 size={16} /> {responseText(chapterData.chapterResponse)}
                                                    </button>
                                                </div>
                                            )}

                                            {isCompleted && (
                                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                    <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
                                                        <MessageSquare size={14} /> Chapter Comment
                                                    </label>
                                                    <textarea
                                                        value={comments[chapter._id] || ''}
                                                        onChange={(event) => setComments((prev) => ({ ...prev, [chapter._id]: event.target.value }))}
                                                        rows={3}
                                                        maxLength={1000}
                                                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-primary"
                                                        placeholder="Write your review or doubt for this chapter..."
                                                    />
                                                    <div className="mt-2 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveComment(chapter._id)}
                                                            disabled={savingKey === `comment:${chapter._id}`}
                                                            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                                                        >
                                                            Save Comment
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                </div>
            )}
        </div>
    );
};

export default Syllabus;

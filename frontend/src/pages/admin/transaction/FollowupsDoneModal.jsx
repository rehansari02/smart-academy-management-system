import React, { useState, useMemo } from 'react';
import { X, Printer, Search, Phone, Calendar, User, Eye, CheckCircle2, Building, RefreshCw } from 'lucide-react';

const formatDate = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

const formatDateTime = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusBadgeClass = (status = '') => {
    const s = String(status).toLowerCase();
    if (s.includes('admit') || s.includes('admitted') || s.includes('completed') || s.includes('converted')) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('visit') || s.includes('visited')) {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('open') || s.includes('pending')) {
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('recall') || s.includes('call')) {
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s.includes('cancel') || s.includes('drop')) {
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

const FollowupsDoneModal = ({
    isOpen,
    onClose,
    title = 'Followups Done List',
    subtitle = '',
    employeeName = '',
    dateRange = '',
    totalCount = 0,
    rows = [],
    sections = null, // Optional multi-section support for "6 Print / 6 View"
    onPrint = null,
    showVisitorDate = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

    // Normalize single row data
    const normalizeRow = (item, index) => {
        const isVisitorFollowUp = item.recordType === 'visitor';
        const visitor = item.visitorId && typeof item.visitorId === 'object' ? item.visitorId : (isVisitorFollowUp ? item : {});
        const inquiry = visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : null;
        const student = inquiry || visitor || {};

        const studentName = item.studentName || 
            ([student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')) ||
            student.studentName ||
            item.name ||
            '-';

        const inquiryDate = item.inquiryDate || inquiry?.inquiryDate || visitor.visitingDate || item.scheduledDate || item.followUpDate;
        const visitorDate = item.visitorDate || visitor.visitingDate || (isVisitorFollowUp ? item.scheduledDate : null);
        const branchName = item.branchName || item.branchId?.name || visitor.branchId?.name || '-';
        const filledBy = item.filledBy || visitor.createdBy?.name || visitor.createdBy?.username || visitor.allocatedTo?.name || visitor.allocatedTo?.username || '-';
        const referenceBy = item.referenceBy || visitor.reference || inquiry?.reference || '-';
        const contactHome = item.contactHome || visitor.contactHome || '-';
        const contactStudent = item.contactStudent || visitor.mobileNumber || item.mobileNumber || '-';
        const contactParent = item.contactParent || visitor.contactParent || '-';
        const status = item.status || visitor.status || 'Open';
        const followUpDate = item.followUpDate || item.scheduledDate || null;
        const followUpDetails = item.followUpDetails || item.remark || item.remarks || '-';
        const followUpBy = typeof item.followUpBy === 'object' ? (item.followUpBy?.name || item.followUpBy?.username || '-') : (item.followUpBy || '-');
        const callingDate = item.callingDate || item.followUpAt || null;

        return {
            rawIndex: index + 1,
            inquiryDate,
            visitorDate,
            branchName,
            filledBy,
            referenceBy,
            studentName,
            contactHome,
            contactStudent,
            contactParent,
            status,
            followUpDate,
            followUpDetails,
            followUpBy,
            callingDate
        };
    };

    // Active rows depends on whether sections are used
    const activeRawRows = useMemo(() => {
        if (Array.isArray(sections) && sections.length > 0) {
            const sec = sections[selectedSectionIdx] || sections[0];
            return sec?.data || [];
        }
        return rows || [];
    }, [sections, selectedSectionIdx, rows]);

    // Normalized rows
    const normalizedList = useMemo(() => {
        return activeRawRows.map((r, i) => normalizeRow(r, i));
    }, [activeRawRows]);

    // Check if any row has a distinct visitorDate
    const hasVisitorDate = useMemo(() => {
        if (showVisitorDate) return true;
        return normalizedList.some(r => r.visitorDate && r.visitorDate !== r.inquiryDate);
    }, [showVisitorDate, normalizedList]);

    // Filtered by search query
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return normalizedList;
        const q = searchQuery.toLowerCase().trim();
        return normalizedList.filter(r => 
            String(r.studentName || '').toLowerCase().includes(q) ||
            String(r.contactStudent || '').toLowerCase().includes(q) ||
            String(r.contactParent || '').toLowerCase().includes(q) ||
            String(r.contactHome || '').toLowerCase().includes(q) ||
            String(r.branchName || '').toLowerCase().includes(q) ||
            String(r.filledBy || '').toLowerCase().includes(q) ||
            String(r.referenceBy || '').toLowerCase().includes(q) ||
            String(r.status || '').toLowerCase().includes(q) ||
            String(r.followUpDetails || '').toLowerCase().includes(q) ||
            String(r.followUpBy || '').toLowerCase().includes(q)
        );
    }, [normalizedList, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn">
            <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* --- Header --- */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-blue-50/40 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                            <Eye size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                                    {totalCount || normalizedList.length} Records
                                </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                                {employeeName && <span>Employee: <strong className="text-slate-700 font-bold">{employeeName}</strong></span>}
                                {dateRange && <span>Period: <strong className="text-slate-700 font-bold">{dateRange}</strong></span>}
                                {subtitle && <span>{subtitle}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onPrint && (
                            <button
                                type="button"
                                onClick={onPrint}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
                                title="Print this followups list"
                            >
                                <Printer size={14} /> Print
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* --- Section Tabs (if multi-section like 6 Print / 6 View) --- */}
                {Array.isArray(sections) && sections.length > 0 && (
                    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/70 p-2 overflow-x-auto text-xs font-bold scrollbar-thin">
                        {sections.map((sec, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedSectionIdx(idx)}
                                className={`rounded-lg px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                    selectedSectionIdx === idx
                                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                }`}
                            >
                                {sec.title} ({sec.data?.length || 0})
                            </button>
                        ))}
                    </div>
                )}

                {/* --- Filter / Search Bar --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-2.5">
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by student, mobile, branch, remark, status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                        Showing <strong className="text-slate-800">{filteredRows.length}</strong> of {normalizedList.length} followups
                    </div>
                </div>

                {/* --- Scrollable Table Body --- */}
                <div className="flex-1 overflow-auto p-4 max-h-[60vh] scrollbar-thin">
                    {filteredRows.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-3 text-center w-12 border-r border-slate-200">#</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Inquiry Date</th>
                                        {hasVisitorDate && <th className="px-3 py-3 border-r border-slate-200">Visitor Date</th>}
                                        <th className="px-3 py-3 border-r border-slate-200">Branch</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Student Name</th>
                                        <th className="px-3 py-3 border-r border-slate-200 w-36">Contact (H/S/P)</th>
                                        <th className="px-3 py-3 text-center border-r border-slate-200 w-24">Status</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Filled By</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Reference By</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Followup Date</th>
                                        <th className="px-3 py-3 border-r border-slate-200 min-w-44">Followup Details</th>
                                        <th className="px-3 py-3 border-r border-slate-200">Followup By</th>
                                        <th className="px-3 py-3">Calling Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredRows.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="px-3 py-2.5 text-center font-bold text-slate-400 border-r border-slate-100">
                                                {item.rawIndex}
                                            </td>
                                            <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-100">
                                                {formatDate(item.inquiryDate)}
                                            </td>
                                            {hasVisitorDate && (
                                                <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-100">
                                                    {formatDate(item.visitorDate)}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 font-semibold text-slate-600 border-r border-slate-100">
                                                {item.branchName}
                                            </td>
                                            <td className="px-3 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                                                {item.studentName}
                                            </td>
                                            <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-[11px]">
                                                <div className="space-y-0.5">
                                                    {item.contactStudent && item.contactStudent !== '-' && (
                                                        <div className="flex items-center gap-1 text-blue-700 font-bold">
                                                            <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-800 font-sans">S</span>
                                                            <span>{item.contactStudent}</span>
                                                        </div>
                                                    )}
                                                    {item.contactParent && item.contactParent !== '-' && (
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-700 font-sans">P</span>
                                                            <span>{item.contactParent}</span>
                                                        </div>
                                                    )}
                                                    {item.contactHome && item.contactHome !== '-' && (
                                                        <div className="flex items-center gap-1 text-slate-500">
                                                            <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-700 font-sans">H</span>
                                                            <span>{item.contactHome}</span>
                                                        </div>
                                                    )}
                                                    {(!item.contactStudent || item.contactStudent === '-') && (!item.contactParent || item.contactParent === '-') && (!item.contactHome || item.contactHome === '-') && (
                                                        <span className="text-slate-400 font-sans">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-center border-r border-slate-100">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadgeClass(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">
                                                {item.filledBy}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 border-r border-slate-100">
                                                {item.referenceBy}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap border-r border-slate-100 font-medium">
                                                {formatDateTime(item.followUpDate)}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700 border-r border-slate-100 max-w-xs break-words">
                                                {item.followUpDetails}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700 font-semibold border-r border-slate-100">
                                                {item.followUpBy}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                                                {item.callingDate ? (
                                                    <div>
                                                        <div className="font-bold text-emerald-700">{formatDateTime(item.callingDate)}</div>
                                                        {item.followUpBy && item.followUpBy !== '-' && (
                                                            <div className="text-[10px] text-slate-400">by {item.followUpBy}</div>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <Search size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700">No followups found</h4>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                {searchQuery ? `No records matched your search query "${searchQuery}".` : 'There are no completed followups recorded in this date range.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* --- Footer --- */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <div className="text-xs font-semibold text-slate-500">
                        Total Records: <strong className="text-slate-800 font-bold">{filteredRows.length}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                        {onPrint && (
                            <button
                                type="button"
                                onClick={onPrint}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                <Printer size={13} /> Print List
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FollowupsDoneModal;

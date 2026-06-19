import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Edit, Trash2, X, Printer, Eye, GraduationCap, PhoneCall, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import visitorService from '../../../services/visitorService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import VisitorForm from '../../../components/transaction/VisitorForm';
import VisitorViewModal from '../../../components/transaction/VisitorViewModal';
import VisitorFollowUpModal from '../../../components/transaction/VisitorFollowUpModal';
import SearchableDropdown from '../../../components/common/SearchableDropdown';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import { formatDate, getTodayDateISO } from '../../../utils/dateUtils';
import { getEmployeeFilterOptions, getScopedEmployeeId } from '../../../utils/employeeFilterUtils';

const TodaysVisitorsList = () => {
    const navigate = useNavigate();
    const { add, edit, delete: canDelete } = useUserRights('Visitors - Todays Visitors List');

    const getPrintStatusClass = (status = 'Open') => {
        if (status === 'Open') return 'status-open';
        if (status === 'Recall') return 'status-recall';
        if (status === 'Complete') return 'status-complete';
        if (status === 'Close') return 'status-close';
        return 'status-default';
    };

    const renderPrintStatus = (status) => {
        const value = status || 'Open';
        return `<span class="status-badge ${getPrintStatusClass(value)}">${value}</span>`;
    };

    const renderPrintContact = (items) => `
        <div class="contact-grid">
            ${items.map((item) => `
                <div class="contact-row">
                    <div class="contact-label">${item.label}</div>
                    <div class="contact-value ${item.highlight ? 'contact-highlight' : ''}">${item.value || '-'}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    const printHtml = (title, bodyHtml) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(`
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>${title}</title>
                    <style>
                        @page { size: landscape; margin: 10mm; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
                        .header { margin-bottom: 12px; }
                        .header h1 { margin: 0; font-size: 18px; }
                        .header p { margin: 4px 0 0; font-size: 11px; color: #6b7280; }
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
                        th { background: #2563eb; color: #fff; text-align: left; }
                        tbody tr { border-bottom: 1px solid #f3f4f6; }
                        .text-center { text-align: center; }
                        .muted { color: #6b7280; }
                        .sr { color: #9ca3af; font-weight: 600; }
                        .name { color: #1f2937; font-weight: 700; }
                        .muted-cell { color: #4b5563; }
                        .time-in { color: #15803d; font-weight: 700; }
                        .time-out { color: #ef4444; font-weight: 700; }
                        .date-stack { display: flex; flex-direction: column; gap: 2px; }
                        .byline { color: #2563eb; font-size: 9px; font-weight: 700; }
                        .subtle { color: #6b7280; font-size: 9px; }
                        .contact-cell { padding: 0; width: 110px; }
                        .contact-grid { display: table; width: 100%; border-collapse: collapse; }
                        .contact-row { display: table-row; }
                        .contact-label,
                        .contact-value {
                            display: table-cell;
                            border-bottom: 1px solid #e5e7eb;
                            padding: 4px;
                        }
                        .contact-row:last-child .contact-label,
                        .contact-row:last-child .contact-value { border-bottom: 0; }
                        .contact-label {
                            width: 18px;
                            background: #f9fafb;
                            color: #6b7280;
                            border-right: 1px solid #e5e7eb;
                            text-align: center;
                            font-weight: 700;
                        }
                        .contact-value { color: #374151; font-weight: 600; }
                        .contact-highlight { color: #2563eb; }
                        .status-badge {
                            display: inline-block;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 9px;
                            line-height: 1.2;
                            text-transform: uppercase;
                            letter-spacing: .04em;
                            font-weight: 700;
                            border: 1px solid transparent;
                        }
                        .status-open { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
                        .status-recall { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
                        .status-complete { background: #f3e8ff; color: #7e22ce; border-color: #e9d5ff; }
                        .status-close { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
                        .status-default { background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${title}</h1>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    ${bodyHtml}
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 250);
    };

    const handlePrintList = () => {
        const headers = `
            <tr>
                <th>Sr No</th>
                <th>Visiting Date</th>
                ${user?.role === 'Super Admin' ? '<th>Branch</th>' : ''}
                <th>Student Name</th>
                <th>Contact</th>
                <th>Reference</th>
                <th>Attend By</th>
                <th>Status</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Remarks</th>
                <th>Create Date</th>
            </tr>
        `;
        const rows = visitors.map((visitor, index) => `
            <tr>
                <td class="text-center sr">${index + 1}</td>
                <td>${visitor.latestFollowup?.scheduledDate ? formatDate(visitor.latestFollowup.scheduledDate) : (visitor.visitingDate ? formatDate(visitor.visitingDate) : '-')}</td>
                ${user?.role === 'Super Admin' ? `<td class="muted-cell">${visitor.branchId?.name || '-'}</td>` : ''}
                <td class="name">${visitor.studentName || '-'}</td>
                <td class="contact-cell">${renderPrintContact([
                    { label: 'G', value: visitor.contactParent },
                    { label: 'H', value: visitor.contactHome },
                    { label: 'S', value: visitor.mobileNumber, highlight: true }
                ])}</td>
                <td>${visitor.reference || '-'}</td>
                <td>${visitor.attendedBy?.name || visitor.attendedBy?.username || '-'}</td>
                <td class="text-center">${renderPrintStatus(visitor.status)}</td>
                <td><span class="time-in">${visitor.inTime || '-'}</span></td>
                <td>${visitor.outTime ? `<span class="time-out">${visitor.outTime}</span>` : '-'}</td>
                <td>${visitor.remarks || '-'}</td>
                <td>${visitor.createdAt ? `<div class="date-stack"><span>${formatDate(visitor.createdAt)}</span><span class="subtle">${new Date(visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span class="byline">by ${getCreatedByName(visitor)}</span></div>` : '-'}</td>
            </tr>
        `).join('');

        printHtml('Visitors List', `
            <table>
                <thead>${headers}</thead>
                <tbody>${rows || `<tr><td colspan="${user?.role === 'Super Admin' ? 12 : 11}" class="text-center muted">No visitors found for this range.</td></tr>`}</tbody>
            </table>
        `);
    };
    const handlePrintFollowupsList = async () => {
        try {
            const followups = Array.isArray(stats?.followupDetails) && stats.followupDetails.length
                ? stats.followupDetails
                : await visitorService.getVisitorFollowUps({
                    fromDate,
                    toDate,
                    branchId: filterBranch,
                    employeeId: activeEmployeeId,
                    studentName,
                    referenceBy,
                    dateFilterType: 'callingDate',
                    excludeVisitorReportActivity: 'true'
                });

            const headers = `
                <tr>
                    <th>Sr No</th>
                    <th>Inquiry Date</th>
                    <th>Visitor Date</th>
                    ${user?.role === 'Super Admin' ? '<th>Branch</th>' : ''}
                    <th>Filled By</th>
                    <th>Reference By</th>
                    <th>Student Name</th>
                    <th>Contact (H/S/P)</th>
                    <th>Status</th>
                    <th>Followup</th>
                    <th>Followup Details</th>
                    <th>Followup By</th>
                    <th>Calling Date</th>
                </tr>
            `;

            const rows = followups.map((item, index) => {
                const visitor = item.visitorId || item;
                const followUpBy = item.followUpBy;
                const inquiry = visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : null;
                const student = inquiry || visitor;
                const inquiryDate = item.inquiryDate || inquiry?.inquiryDate || visitor.visitingDate || item.scheduledDate || item.followUpDate;
                const visitorDate = item.scheduledDate || item.followUpDate || visitor.visitingDate || inquiryDate;
                const branchName = item.branchName || item.branchId?.name || visitor.branchId?.name || '-';
                const filledBy = item.filledBy || visitor.createdBy?.name || visitor.createdBy?.username || visitor.allocatedTo?.name || visitor.allocatedTo?.username || '-';
                const referenceByValue = item.referenceBy || visitor.reference || inquiry?.reference || '-';
                const contactHome = item.contactHome || visitor.contactHome || '-';
                const contactStudent = item.contactStudent || visitor.mobileNumber || '-';
                const contactParent = item.contactParent || visitor.contactParent || '-';
                const status = item.status || visitor.status || 'Open';
                const followUpDetails = item.followUpDetails || item.remark || '-';
                const followUpByValue = followUpBy?.name || followUpBy?.username || item.followUpBy || '-';
                const callingDate = item.callingDate || null;
                return `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${inquiryDate ? formatDate(inquiryDate) : '-'}</td>
                        <td>${visitorDate ? formatDate(visitorDate) : '-'}</td>
                        ${user?.role === 'Super Admin' ? `<td>${branchName}</td>` : ''}
                        <td>${filledBy}</td>
                        <td>${referenceByValue}</td>
                        <td>${(student.firstName || student.middleName || student.lastName) ? `${[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')}` : (student.studentName || '-') }</td>
                        <td class="contact-cell">${renderPrintContact([
                            { label: 'H', value: contactHome },
                            { label: 'S', value: contactStudent, highlight: true },
                            { label: 'P', value: contactParent }
                        ])}</td>
                        <td class="text-center">${renderPrintStatus(status)}</td>
                        <td>${(item.scheduledDate || item.followUpDate) ? `${formatDate(item.scheduledDate || item.followUpDate)} ${new Date(item.scheduledDate || item.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}</td>
                        <td>${followUpDetails}</td>
                        <td>${followUpByValue}</td>
                        <td>${callingDate ? `${formatDate(callingDate)} ${new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}</td>
                    </tr>
                `;
            }).join('');

            printHtml('Visitor Followups List', `
                <table>
                    <thead>${headers}</thead>
                    <tbody>${rows || `<tr><td colspan="${user?.role === 'Super Admin' ? 13 : 12}" class="text-center muted">No followups found for this range.</td></tr>`}</tbody>
                </table>
            `);
        } catch (error) {
            console.error("Error printing followups list:", error);
        }
    };
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    
    // Range filters
    const today = getTodayDateISO();
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [employeeId, setEmployeeId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [referenceBy, setReferenceBy] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [inquirySource, setInquirySource] = useState('');
    const { user } = useSelector((state) => state.auth);
    
    const [showModal, setShowModal] = useState(false);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [branches, setBranches] = useState([]);
    const [showPendingBreakup, setShowPendingBreakup] = useState(false);
    
    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingVisitor, setViewingVisitor] = useState(null);
    const [followUpVisitor, setFollowUpVisitor] = useState(null);
    const [showRemainingVisitors, setShowRemainingVisitors] = useState(false);
    const employeeOptions = getEmployeeFilterOptions(employees, user);
    const activeEmployeeId = getScopedEmployeeId(user, employeeId);
    const activeStudentNames = [...new Set(visitors.map(v => v.studentName).filter(Boolean))].sort();
    const activeReferences = [...new Set(visitors.map(v => v.reference).filter(Boolean))].sort();
    const pendingBreakup = stats?.pendingByDate || [];
    const remainingVisitors = stats?.remainingVisitors || [];

    useEffect(() => {
        fetchVisitors();
        fetchStats();
    }, [fromDate, toDate, filterBranch, studentName, referenceBy, inquirySource, employeeId]);

    useEffect(() => {
        if (user?.role === 'Super Admin') {
            fetchBranches();
        }
        fetchEmployees();
    }, [user]);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/employees`, { withCredentials: true });
            setEmployees(res.data?.employees || res.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const fetchStats = async (override = {}) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/visitors/followup-stats`, {
                params: {
                    fromDate: override.fromDate || fromDate,
                    toDate: override.toDate || toDate,
                    branchId: override.branchId ?? filterBranch,
                    employeeId: override.employeeId ?? employeeId,
                    excludeVisitorReportActivity: 'true'
                },
                withCredentials: true,
            });
            setStats(res.data);
        } catch (error) {
            setStats(null);
        }
    };

    const fetchVisitors = async (override = {}) => {
        setLoading(true);
        const nextStudentName = override.studentName ?? studentName;
        const nextReferenceBy = override.referenceBy ?? referenceBy;
        const nextBranch = override.branchId ?? filterBranch;
        const nextInquirySource = override.inquirySource ?? inquirySource;
        const nextEmployee = override.employeeId ?? employeeId;
        const nextFromDate = override.fromDate ?? fromDate;
        const nextToDate = override.toDate ?? toDate;
        try {
            const data = await visitorService.getAllVisitors({
                fromDate: nextFromDate,
                toDate: nextToDate,
                studentName: nextStudentName,
                referenceBy: nextReferenceBy,
                branchId: nextBranch,
                inquirySource: nextInquirySource,
                employeeId: nextEmployee,
                excludeFollowedVisitors: 'true'
            });
            setVisitors(data);
        } catch (error) {
            console.error("Error fetching visitors:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const handleSearch = () => {
        fetchVisitors();
        fetchStats();
    };

    const handleResetSearch = () => {
        setFromDate(today);
        setToDate(today);
        setEmployeeId('');
        setStudentName('');
        setReferenceBy('');
        setFilterBranch('');
        setInquirySource('');
        setShowPendingBreakup(false);
        fetchVisitors({ fromDate: today, toDate: today, studentName: '', referenceBy: '', branchId: '', inquirySource: '', employeeId: '' });
        fetchStats({ fromDate: today, toDate: today, branchId: '', employeeId: '' });
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete visitors.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this visitor?')) {
            try {
                await visitorService.deleteVisitor(id);
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting visitor:", error);
            }
        }
    };

    const handleAddNew = () => {
        if (!add) {
            showPermissionDenied("You don't have authority to add visitors.");
            return;
        }
        setSelectedVisitor(null);
        setShowModal(true);
    };

    const handleView = (visitor) => {
        setViewingVisitor(visitor);
        setShowViewModal(true);
    };

    const handleOpenFollowUp = (visitor) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update visitor follow-ups.");
            return;
        }
        setFollowUpVisitor(visitor);
    };

    const handleTakeAdmission = (visitor) => {
        if (!add) {
            showPermissionDenied("You don't have authority to take admission from visitors.");
            return;
        }
        navigate('/master/student-admission', { state: { visitorData: visitor } });
    };

    const handleEdit = (visitor) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to edit visitors.");
            return;
        }
        setSelectedVisitor(visitor);
        setShowModal(true);
    };

    const handleFormSuccess = () => {
        setShowModal(false);
        fetchVisitors();
    };

    const handleSaveFollowUp = async (id, data) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update visitor follow-ups.");
            return;
        }
        try {
            await visitorService.createVisitorFollowUp({
                ...data,
                completeCurrentVisit: true
            });
            setFollowUpVisitor(null);
            fetchVisitors();
            fetchStats();
        } catch (error) {
            console.error("Error saving visitor follow-up:", error);
        }
    };

    const getCreatedByName = (visitor) => {
        return visitor.createdBy?.name || visitor.createdBy?.username || visitor.allocatedTo?.name || visitor.allocatedTo?.username || '-';
    };

    const summary = stats?.summary || {};
    const employeeSummary = stats?.employees || [];
    const totalRangeVisitors = Number(stats?.totalInquiries ?? summary.total ?? visitors.length ?? 0);
    const followUpsDoneToday = Number(stats?.totalFollowUps ?? stats?.followUpsDoneToday ?? summary.followUpsToday ?? 0);
    const statsRemainingCount = Number(stats?.remainingVisitors?.length ?? Math.max(totalRangeVisitors - followUpsDoneToday, 0));
    const tableVisitors = visitors.length ? visitors : (stats?.remainingVisitors || []);
    const tableColSpan = user?.role === 'Super Admin' ? 13 : 12;
    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return (
            <div className="flex flex-col">
                <span className="font-bold">{formatDate(value)}</span>
                <span className="text-[10px] text-blue-600">
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        );
    };

    return (
        <div className="w-full p-2 animate-fadeIn">
            <style>{`
                .print-only-header {
                    display: none !important;
                }
                @media print {
                    body {
                        visibility: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .printable-table-container,
                    .printable-table-container * {
                        visibility: visible !important;
                    }
                    .printable-table-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    .print-only-header {
                        display: block !important;
                    }
                    /* Hide the Actions column (last th and td) */
                    .printable-table-container th:last-child,
                    .printable-table-container td:last-child {
                        display: none !important;
                    }
                    /* Clean up page breaks */
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
                <div className="bg-white rounded-lg shadow-lg p-2">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-blue-500" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Visitors</h2>
                                <p className="text-xs text-gray-500">Range: {formatDate(fromDate)} to {formatDate(toDate)}</p>
                            </div>
                        </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrintList}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 shadow-sm font-bold transition-all transform hover:scale-105"
                        >
                            <Printer size={16} /> Print List
                        </button>
                        <button 
                            onClick={handleAddNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 shadow-sm"
                        >
                            <Plus size={16} /> Add New
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                        <p className="text-sm font-black text-gray-700">{summary.total || visitors.length}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-orange-400 uppercase">Open</p>
                        <p className="text-sm font-black text-orange-600">{summary.open ?? '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-green-400 uppercase">Completed</p>
                        <p className="text-sm font-black text-green-600">{summary.completed ?? '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-blue-400 uppercase">Followups Done</p>
                        <p className="text-sm font-black text-blue-600">{followUpsDoneToday}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3">
                        <p className="text-[10px] font-bold text-purple-400 uppercase">Remaining</p>
                        <p className="text-sm font-black text-purple-600">{statsRemainingCount}</p>
                    </div>
                </div>

                {stats && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow mb-4 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">Range Visitors</div>
                                <div className="text-2xl font-black text-blue-700">
                                    {statsRemainingCount}<span className="text-lg font-bold text-gray-400">/{totalRangeVisitors}</span>
                                </div>
                                {/* <button
                                    type="button"
                                    onClick={() => setShowRemainingVisitors(true)}
                                    className="mt-2 rounded bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-200"
                                >
                                    View Remaining List
                                </button> */}
                                {stats.pendingFromBefore > 0 && (
                                    <div className="mt-1 text-[10px]">
                                        <span className="text-orange-500 font-bold">Prev Pending: {stats.pendingFromBefore}</span>
                                        <span className="text-gray-400 mx-1">|</span>
                                        <span className="text-green-600">New: {stats.totalInquiries || 0}</span>
                                    </div>
                                )}
                                {activeEmployeeId && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPendingBreakup(true)}
                                        className="mt-2 rounded bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-200"
                                    >
                                        View Pending
                                    </button>
                                )}
                            </div>
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">Followups Done</div>
                                <div className="text-2xl font-black text-purple-700">
                                    {followUpsDoneToday}<span className="text-lg font-bold text-gray-400">/{totalRangeVisitors}</span>
                                </div>
                                <div className="mt-1 text-[10px] text-gray-400">
                                    {statsRemainingCount} remaining
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePrintFollowupsList}
                                    className="mt-2 inline-flex items-center gap-1 rounded bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200"
                                >
                                    <Printer size={12} /> Print Followups List
                                </button>
                            </div>
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">Top Followup</div>
                                <div className="text-sm font-bold text-gray-800">{employeeSummary[0]?.employeeName || '-'}</div>
                                <div className="text-xs text-gray-500">{employeeSummary[0]?.latestFollowUpAt ? new Date(employeeSummary[0].latestFollowUpAt).toLocaleString() : '-'}</div>
                            </div>
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase mb-2">Employee Followups</div>
                                <div className="flex flex-wrap gap-2">
                                    {employeeSummary.length ? employeeSummary.map((item) => (
                                        <span key={item.employeeId} className="inline-flex items-center gap-1 text-[10px] border rounded-full px-3 py-1 bg-gray-50 font-bold">
                                            <span className="text-blue-700">{item.employeeName}</span>: {item.followUpCount} followups
                                        </span>
                                    )) : <span className="text-xs text-gray-400">No followups in this range.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showPendingBreakup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div>
                                    <h3 className="font-bold text-gray-800">Pending Visitor Dates</h3>
                                    <p className="text-xs text-gray-500">Total pending: {stats?.pendingFromBefore || 0}</p>
                                </div>
                                <button onClick={() => setShowPendingBreakup(false)} className="p-1 rounded hover:bg-gray-100">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[65vh]">
                                {pendingBreakup.length ? (
                                    <table className="w-full text-sm border">
                                        <thead className="bg-gray-100 text-gray-700">
                                            <tr>
                                                <th className="p-2 border text-left">Follow-up Date</th>
                                                <th className="p-2 border text-right">Pending</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingBreakup.map((item) => (
                                                <tr key={item.date} className="hover:bg-blue-50">
                                                    <td className="p-2 border font-medium">{formatDate(item.date)}</td>
                                                    <td className="p-2 border text-right font-bold text-orange-600">{item.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center text-gray-400 py-8">No previous pending visitors.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showRemainingVisitors && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div>
                                    <h3 className="font-bold text-gray-800">Remaining Visitors</h3>
                                    <p className="text-xs text-gray-500">Total remaining: {remainingVisitors.length || 0}</p>
                                </div>
                                <button onClick={() => setShowRemainingVisitors(false)} className="p-1 rounded hover:bg-gray-100">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[65vh]">
                                {remainingVisitors.length ? (
                                    <div className="space-y-2">
                                        {remainingVisitors.map((visitor, index) => (
                                            <div key={visitor._id} className="rounded border border-gray-200 p-3 bg-gray-50">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{index + 1}. {visitor.studentName || '-'}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {visitor.mobileNumber || visitor.contactParent || visitor.contactHome || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-[10px] text-gray-500">
                                                        <div>{visitor.branchName || '-'}</div>
                                                        <div>{visitor.status || 'Open'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-8">No remaining visitors in this range.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Section */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                        <Search size={16} /> Search Visitor Activity
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div className={`grid grid-cols-1 ${user?.role === 'Super Admin' ? 'md:grid-cols-4 lg:grid-cols-7' : 'md:grid-cols-3 lg:grid-cols-6'} gap-4`}>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">From Date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            {user?.role === 'Super Admin' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                    <select
                                        value={filterBranch}
                                        onChange={(e) => setFilterBranch(e.target.value)}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Employee</label>
                                <select
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">All Employees</option>
                                    {employeeOptions.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <SearchableDropdown
                                    options={activeStudentNames}
                                    value={studentName}
                                    onSelect={setStudentName}
                                    label="Search Student"
                                    placeholder="Search or type student name/mobile..."
                                    clearLabel="All Students"
                                />
                            </div>
                            <div>
                                <SearchableDropdown
                                    options={activeReferences}
                                    value={referenceBy}
                                    onSelect={setReferenceBy}
                                    label="Reference By"
                                    placeholder="Search or type Reference..."
                                    clearLabel="All References"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Inquiry List</label>
                                <select
                                    value={inquirySource}
                                    onChange={(e) => setInquirySource(e.target.value)}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">All Inquiry Lists</option>
                                    <option value="Online">Online</option>
                                    <option value="Walk-in">Offline</option>
                                    <option value="DSR">DSR</option>
                                    </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                onClick={handleResetSearch}
                                className="bg-red-100 text-red-700 px-6 py-2.5 rounded hover:bg-red-200 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Reset
                            </button>
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 font-medium transition text-sm flex items-center justify-center gap-2"
                            >
                                <Search size={16} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto printable-table-container">
                    <div className="print-only-header mb-6 text-center">
                        <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">Visitors List</h1>
                        <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleDateString('en-GB')} | Total Visitors: {visitors?.length || 0}</p>
                    </div>
                    <table className="w-full border-collapse min-w-[1350px]">
                        <thead>
                            <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                                <th className="p-2 border font-semibold">Inquiry Date</th>
                                {user?.role === 'Super Admin' && <th className="p-2 border font-semibold">Branch</th>}
                                <th className="p-2 border font-semibold">Filled By</th>
                                <th className="p-2 border font-semibold">Reference By</th>
                                <th className="p-2 border font-semibold">Student Name</th>
                                <th className="p-2 border font-semibold text-center w-36">Contact (H/S/P)</th>
                                <th className="p-2 border font-semibold text-center">Status</th>
                                <th className="p-2 border font-semibold">Followup</th>
                                <th className="p-2 border font-semibold w-36">Followup Details</th>
                                <th className="p-2 border font-semibold">Followup By</th>
                                <th className="p-2 border font-semibold">Calling Date</th>
                                <th className="p-2 border font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={tableColSpan} className="text-center p-4">Loading...</td></tr>
                            ) : tableVisitors.length === 0 ? (
                                <tr><td colSpan={tableColSpan} className="text-center p-4 text-gray-500">No visitors found for this range.</td></tr>
                            ) : (
                                tableVisitors.map((visitor, index) => {
                                    const latestFollowup = visitor.latestFollowup || {};
                                    const inquiryDate = visitor.inquiryId?.inquiryDate || visitor.visitingDate;
                                    const followupDate = latestFollowup.scheduledDate || latestFollowup.followUpDate;
                                    const callingDate = latestFollowup.isDone ? (latestFollowup.callingDate || null) : null;
                                    const followupBy = latestFollowup.followUpBy?.name || latestFollowup.followUpBy?.username || '-';
                                    const status = latestFollowup.status || visitor.status || 'Open';
                                    return (
                                    <tr key={visitor._id} className="hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                        <td className="p-2 text-center">{index + 1}</td>
                                        <td className="p-2">{inquiryDate ? formatDate(inquiryDate) : '-'}</td>
                                        {user?.role === 'Super Admin' && <td className="p-2 text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                        <td className="p-2 text-gray-700 font-medium">{getCreatedByName(visitor)}</td>
                                        <td className="p-2">{visitor.reference || '-'}</td>
                                        <td className="p-2 font-bold text-gray-800">{visitor.studentName || '-'}</td>
                                        <td className="p-0 border align-top w-36">
                                            <div className="flex border-b border-gray-200 last:border-b-0">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                    {visitor.contactHome || '-'}
                                                </div>
                                            </div>
                                            <div className="flex border-b border-gray-200 last:border-b-0">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start text-blue-600">
                                                    {visitor.mobileNumber || '-'}
                                                </div>
                                            </div>
                                            <div className="flex">
                                                <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">P</div>
                                                <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                    {visitor.contactParent || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="p-2 text-gray-700 font-medium">{formatDateTime(followupDate)}</td>
                                        <td className="p-2 text-gray-600 truncate max-w-xs" title={latestFollowup.remark || visitor.remarks || ''}>{latestFollowup.remark || visitor.remarks || '-'}</td>
                                        <td className="p-2 text-gray-700">{followupBy}</td>
                                        <td className="p-2 text-center">{formatDateTime(callingDate)}</td>
                                        <td className="p-2 text-center print:hidden">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => handleOpenFollowUp(visitor)} className="bg-purple-50 text-purple-600 hover:bg-purple-100 p-1.5 rounded border border-purple-200 transition" title="Visitor Follow-up">
                                                    <PhoneCall size={14} />
                                                </button>
                                                <button onClick={() => handleTakeAdmission(visitor)} className="bg-green-50 text-green-600 hover:bg-green-100 p-1.5 rounded border border-green-200 transition" title="Take Admission">
                                                    <GraduationCap size={14} />
                                                </button>
                        <button onClick={() => handleView(visitor)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-1.5 rounded border border-indigo-200 transition" title="View Profile">
                            <Eye size={14} />
                        </button>
                                                <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded border border-blue-200 transition" title="Edit">
                                                    <Edit size={14} />
                                                </button>
                        <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded border border-red-200 transition" title="Delete">
                            <Trash2 size={14} />
                        </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Visitor Form Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto animate-zoomIn">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <Plus className="text-blue-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {selectedVisitor ? 'Edit Visitor Details' : 'New Visitor Registration'}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <VisitorForm 
                                    initialData={selectedVisitor}
                                    onSuccess={handleFormSuccess}
                                    onCancel={() => setShowModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Visitor View Modal */}
                {showViewModal && (
                    <VisitorViewModal 
                        visitor={viewingVisitor}
                        onClose={() => {
                            setShowViewModal(false);
                            setViewingVisitor(null);
                        }}
                    />
                )}

                {followUpVisitor && (
                    <VisitorFollowUpModal
                        visitor={followUpVisitor}
                        onClose={() => setFollowUpVisitor(null)}
                        onSave={handleSaveFollowUp}
                    />
                )}
            </div>
        </div>
    );
};

export default TodaysVisitorsList;

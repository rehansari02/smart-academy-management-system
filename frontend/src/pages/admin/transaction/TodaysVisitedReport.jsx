import React, { useState, useEffect } from 'react';
import { FileText, Search, Edit, Trash2, ArrowRightCircle, Printer, Eye, GraduationCap, CalendarClock, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getTodayDateISO } from '../../../utils/dateUtils';
import visitorService from '../../../services/visitorService';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import axios from 'axios';
import VisitorViewModal from '../../../components/transaction/VisitorViewModal';
import VisitorFollowUpModal from '../../../components/transaction/VisitorFollowUpModal';
import InquiryForm from '../../../components/transaction/InquiryForm';
import InquiryViewModal from '../../../components/transaction/InquiryViewModal';
import { useForm } from 'react-hook-form';
import TimePicker12Hour from '../../../components/common/TimePicker12Hour';
import SearchableDropdown from '../../../components/common/SearchableDropdown';
import { useUserRights } from '../../../hooks/useUserRights';
import { showPermissionDenied } from '../../../utils/permissionAlert';
import Swal from 'sweetalert2';
import { getEmployeeFilterOptions, getEmployeeNameById, getScopedEmployeeId } from '../../../utils/employeeFilterUtils';

// --- SUB-COMPONENT: Follow Up Form ---
const FollowUpForm = ({ inquiry, onClose, onSave }) => {
    const navigate = useNavigate();

    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    const { register, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            status: inquiry.status || 'Open',
            newRemarks: '',
            fDate: inquiry.followUpDate ? new Date(inquiry.followUpDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            fTime: inquiry.followUpDate ? new Date(inquiry.followUpDate).toTimeString().slice(0, 5) : getCurrentTime(),
        }
    });

    const onSubmit = async (data) => {
        let fDate = null;
        if (data.fDate) {
            const time = data.fTime || '00:00';
            fDate = new Date(`${data.fDate}T${time}`);
        }

        const finalDetails = data.newRemarks ? (inquiry.followUpDetails ? `${inquiry.followUpDetails}\n[${formatDate(fDate)}]: ${data.newRemarks}` : `[${formatDate(fDate)}]: ${data.newRemarks}`) : inquiry.followUpDetails;

        const updateData = {
            status: data.status,
            followUpDetails: finalDetails,
            followUpDate: fDate,
            newRemarks: data.newRemarks,
            recordFollowUpActivity: true,
            followUpOrigin: 'visitorReport',
        };

        await onSave({ id: inquiry._id, data: updateData });

        // If status is newly changed to Complete, ask for admission redirect
        if (data.status === 'Complete' && inquiry.status !== 'Complete') {
            Swal.fire({
                title: 'Inquiry Completed!',
                text: "Do you want to go to the Student Admission page now?",
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#aaa',
                confirmButtonText: 'Yes, Admission',
                cancelButtonText: 'No, stay here',
                customClass: {
                    container: 'z-[9999]'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/master/student/new', { state: { inquiryData: inquiry } });
                } else {
                    onClose();
                }
            });
        } else {
            onClose();
        }
    };

    const { loading } = useSelector((state) => state.transaction || { loading: false });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between mb-4 border-b pb-2"><h3 className="font-bold text-blue-800">Follow Up</h3><button onClick={onClose}><X /></button></div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold block mb-1">Inquiry Status</label>
                        <select {...register('status')} className="border p-2 rounded w-full text-sm">
                            <option value="Open">Open</option>
                            <option value="InProgress">InProgress</option>
                            <option value="Recall">Recall</option>
                            <option value="Close">Close</option>
                            <option value="Complete">Complete</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Follow-Up Date</label><input type="date" {...register('fDate')} required className="border p-2 rounded w-full text-sm" /></div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Time (12h)</label>
                            <TimePicker12Hour value={watch('fTime')} onChange={(val) => setValue('fTime', val)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">Previous Remarks</label>
                        <div className="border p-2 rounded w-full text-sm h-24 overflow-y-auto bg-gray-50 text-gray-700 font-mono whitespace-pre-wrap">
                            {inquiry.followUpDetails || 'No previous remarks'}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1 mt-2">New Discussion / Remarks</label>
                        <textarea {...register('newRemarks')} className="border p-2 rounded w-full text-sm" rows="2" placeholder="Enter new remarks..."></textarea>
                    </div>

                    <button disabled={loading} type="submit" className="bg-blue-600 text-white w-full py-2 rounded mt-2 hover:bg-blue-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : 'Update Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const TodaysVisitedReport = () => {
    const navigate = useNavigate();
    const visitorReportRights = useUserRights('Visitors - Activity Visitor Report');
    const onlineInquiryRights = useUserRights('Inquiry - Online');
    const offlineInquiryRights = useUserRights('Inquiry - Offline');
    const dsrInquiryRights = useUserRights('Inquiry - DSR');
    const { add, edit, delete: canDelete } = visitorReportRights;
    
    const getFilledBy = (visitor) => visitor.createdBy?.name || visitor.createdBy?.username || visitor.attendedBy?.name || visitor.attendedBy?.username || visitor.allocatedTo?.name || visitor.allocatedTo?.username || '-';
    const getReferenceBy = (record) => record?.referenceBy || record?.reference || record?.inquiryId?.referenceBy || record?.source || 'Direct';
    const getInquiryRights = (source) => {
        if (source === 'DSR') return dsrInquiryRights;
        if (source === 'Walk-in') return offlineInquiryRights;
        return onlineInquiryRights;
    };

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

    const escapePrintHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const getLastFollowUpInfo = (visitor) => {
        const last = visitor.latestFollowup;
        if (!last) return '-';
        const followupDate = last.callingDate || last.createdAt || last.scheduledDate;
        const dateStr = followupDate
            ? `${formatDate(followupDate)} ${new Date(followupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : '';
        const by = last.followUpBy?.name || last.followUpBy?.username || '-';
        if (!dateStr) return by;
        return (
            <div className="text-xs">
                <div className="font-semibold text-gray-800">{dateStr}</div>
                <div className="text-gray-500">by {by}</div>
            </div>
        );
    };

    const isVisibleVisitorFollowup = (visitor) => {
        if (!visitor.latestFollowup?.scheduledDate) return false;
        const date = new Date(visitor.latestFollowup.scheduledDate);
        const from = new Date(filters.fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);
        return date >= from && date <= to;
    };

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
                        tr.handled-row { background: #fef2f2; }
                        .text-center { text-align: center; }
                        .muted { color: #6b7280; }
                        .sr { color: #9ca3af; font-weight: 600; }
                        .name { color: #1f2937; font-weight: 700; }
                        .muted-cell { color: #4b5563; font-weight: 600; }
                        .time-in { color: #15803d; font-weight: 700; }
                        .time-out { color: #ef4444; font-weight: 700; }
                        .date-stack { display: flex; flex-direction: column; gap: 2px; }
                        .date-main { color: #1f2937; font-weight: 700; }
                        .date-time { color: #2563eb; font-size: 9px; }
                        .byline { color: #6b7280; font-size: 9px; }
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
        if (filters.reportType === 'visited') {
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
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Remarks</th>
                    <th>Create Date</th>
                </tr>
            `;
            const rows = visitors.map((visitor, index) => `
                <tr class="${isVisitorHandled(visitor) ? 'handled-row' : ''}">
                    <td class="text-center sr">${index + 1}</td>
                    <td class="date-main">${formatDate(visitor.inquiryId?.inquiryDate || visitor.visitingDate)}</td>
                    <td class="date-main">${visitor.latestFollowup?.scheduledDate ? formatDate(visitor.latestFollowup.scheduledDate) : formatDate(visitor.visitingDate)}</td>
                    ${user?.role === 'Super Admin' ? `<td class="muted-cell">${visitor.branchId?.name || '-'}</td>` : ''}
                    <td class="muted-cell">${getFilledBy(visitor)}</td>
                    <td class="muted-cell">${getReferenceBy(visitor)}</td>
                    <td class="name">${getFullName(visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : visitor)}</td>
                    <td class="contact-cell">${renderPrintContact([
                        { label: 'H', value: visitor.contactHome },
                        { label: 'S', value: visitor.mobileNumber, highlight: true },
                        { label: 'P', value: visitor.contactParent }
                    ])}</td>
                    <td class="text-center">${renderPrintStatus(visitor.status)}</td>
                    <td><span class="time-in">${visitor.inTime || '-'}</span></td>
                    <td>${visitor.outTime ? `<span class="time-out">${visitor.outTime}</span>` : '-'}</td>
                    <td>${visitor.remarks || '-'}</td>
                    <td>${visitor.createdAt ? `<div class="date-stack"><span class="date-main">${formatDate(visitor.createdAt)}</span><span class="date-time">${new Date(visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>` : '-'}</td>
                </tr>
            `).join('');
            printHtml('Visitors List', `<table><thead>${headers}</thead><tbody>${rows || `<tr><td colspan="${user?.role === 'Super Admin' ? 13 : 12}" class="text-center muted">No visitors found for this period.</td></tr>`}</tbody></table>`);
            return;
        }

        const headers = `
            <tr>
                <th>Sr No</th>
                <th>Inquiry Date</th>
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
            const isVisitorFollowUp = item.recordType === 'visitor';
            const visitor = isVisitorFollowUp ? (item.visitorId || {}) : {};
            const inquiry = isVisitorFollowUp ? {} : item;
            const visitorInquiry = visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : null;
            const personName = getFullName(isVisitorFollowUp ? (visitorInquiry || visitor) : inquiry);
            const originalDate = isVisitorFollowUp ? (item.scheduledDate || visitor.visitingDate) : inquiry.inquiryDate;
            const status = isVisitorFollowUp ? (item.status || visitor.status) : inquiry.status;
            const branchName = isVisitorFollowUp ? item.branchId?.name : inquiry.branchId?.name;
            const followupActivities = Array.isArray(inquiry.followUpHistory)
                ? inquiry.followUpHistory.filter(history => history.activityType === 'followup')
                : [];
            const lastHistoryItem = inquiry.latestFollowupActivity || (followupActivities.length ? followupActivities[followupActivities.length - 1] : null);
            const followUpDate = isVisitorFollowUp ? item.scheduledDate : (item.followUpDate || lastHistoryItem?.date || inquiry.followUpDate);
            const details = isVisitorFollowUp ? item.remark : (lastHistoryItem?.remarks || inquiry.followUpDetails);
            const followUpBy = isVisitorFollowUp ? item.followUpBy : (item.followUpBy || lastHistoryItem?.followUpBy || inquiry.followUpBy);
            const callingDate = isVisitorFollowUp
                ? (item.isDone ? (item.callingDate || null) : null)
                : (item.callingDate || lastHistoryItem?.callingDate || lastHistoryItem?.createdAt || lastHistoryItem?.date || inquiry.updatedAt);
            return `
                <tr>
                    <td class="text-center sr">${index + 1}</td>
                    <td class="date-main">${originalDate ? formatDate(originalDate) : '-'}</td>
                    ${user?.role === 'Super Admin' ? `<td class="muted-cell">${branchName || '-'}</td>` : ''}
                    <td class="muted-cell">${isVisitorFollowUp ? getFilledBy(visitor) : (inquiry.createdBy?.name || inquiry.createdBy?.username || inquiry.followUpBy?.name || inquiry.followUpBy?.username || '-')}</td>
                    <td class="muted-cell">${isVisitorFollowUp ? getReferenceBy(visitor) : getReferenceBy(inquiry)}</td>
                    <td class="name">${personName}</td>
                    <td class="contact-cell">${renderPrintContact([
                        { label: 'H', value: isVisitorFollowUp ? visitor.contactHome : inquiry.contactHome },
                        { label: 'S', value: isVisitorFollowUp ? visitor.mobileNumber : inquiry.contactStudent, highlight: true },
                        { label: 'P', value: isVisitorFollowUp ? visitor.contactParent : inquiry.contactParent }
                    ])}</td>
                    <td class="text-center">${renderPrintStatus(status)}</td>
                    <td>${followUpDate ? `<div class="date-stack"><span class="date-main">${formatDate(followUpDate)}</span><span class="date-time">${new Date(followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>` : '-'}</td>
                    <td>${details || '-'}</td>
                    <td>${followUpBy?.name || followUpBy?.username || '-'}</td>
                    <td>${callingDate ? `<div class="date-stack"><span class="date-main">${formatDate(callingDate)} ${new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span class="byline">by ${followUpBy?.name || followUpBy?.username || '-'}</span></div>` : '-'}</td>
                </tr>
            `;
        }).join('');
        printHtml('Followups List', `<table><thead>${headers}</thead><tbody>${rows || `<tr><td colspan="${user?.role === 'Super Admin' ? 12 : 11}" class="text-center muted">No followups found for this period.</td></tr>`}</tbody></table>`);
    };
    const handlePrintFollowupsList = () => {
        handlePrintDoneActivity();
    };

    const fetchDoneActivityData = async (activeFilters = filters) => {
        const activeEmployeeId = getScopedEmployeeId(user, activeFilters.employeeId);
        const listType = activeFilters.listType || 'all';
        const sourceByListType = {
            online: 'Online',
            offline: 'Walk-in',
            dsr: 'DSR'
        };
        const commonParams = {
            fromDate: activeFilters.fromDate,
            toDate: activeFilters.toDate,
            branchId: activeFilters.branchId,
            employeeId: activeEmployeeId,
            studentName: activeFilters.studentName,
            referenceBy: activeFilters.referenceBy
        };

        const shouldFetchVisitorDone = visitorReportRights.view;
        const visitorFollowups = shouldFetchVisitorDone
            ? await visitorService.getVisitorFollowUps({
                ...commonParams,
                dateFilterType: 'callingDate',
            })
            : [];

        const fetchInquiryFollowupStats = async (source) => {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry/followup-stats`, {
                params: {
                    source,
                    startDate: activeFilters.fromDate,
                    endDate: activeFilters.toDate,
                    branchId: activeFilters.branchId,
                    employeeId: activeEmployeeId,
                },
                withCredentials: true
            });
            return Array.isArray(data?.followupDetails) ? data.followupDetails : [];
        };

        const requestedSource = sourceByListType[listType];
        const inquiryRequests = requestedSource
            ? [getInquiryRights(requestedSource).view ? fetchInquiryFollowupStats(requestedSource) : Promise.resolve([])]
            : [
                onlineInquiryRights.view ? fetchInquiryFollowupStats('Online') : Promise.resolve([]),
                offlineInquiryRights.view ? fetchInquiryFollowupStats('Walk-in') : Promise.resolve([]),
                dsrInquiryRights.view ? fetchInquiryFollowupStats('DSR') : Promise.resolve([]),
            ];
        const inquiryFollowups = (activeFilters.reportType === 'visited' && !activeFilters.isPrintAll)
            ? []
            : (await Promise.all(inquiryRequests)).flat();

        const doneVisitorFollowups = visitorFollowups.filter((item) => {
            if (!item?.callingDate) return false;
            const schedDate = item.scheduledDate;
            const isToday = schedDate && isWithinSelectedRange(schedDate);
            const isOpen = ['Open', 'Recall'].includes(item.status || 'Open');
            if (isToday && isOpen) return false;
            return true;
        });
        const doneInquiryFollowups = inquiryFollowups.filter((item) => {
            if (item?.origin !== 'visitorReport') return false;
            const followupDate = item?.callingDate || item?.followUpAt || item?.followUpDate;
            if (!followupDate) return false;
            const nextSchedDate = item.followUpDate;
            const isToday = nextSchedDate && isWithinSelectedRange(nextSchedDate);
            const isOpen = ['Open', 'Recall'].includes(item.status || 'Open');
            if (isToday && isOpen) return false;
            return true;
        });

        const activityVisitorMap = new Map();
        doneVisitorFollowups.forEach((item) => {
            const visitor = item.visitorId && typeof item.visitorId === 'object' ? item.visitorId : null;
            if (!visitor?._id) return;
            const existing = activityVisitorMap.get(String(visitor._id));
            const currentDate = item.callingDate || item.updatedAt || item.createdAt;
            const existingDate = existing?.latestFollowup?.callingDate || existing?.latestFollowup?.updatedAt || existing?.latestFollowup?.createdAt;
            if (!existing || new Date(currentDate || 0) > new Date(existingDate || 0)) {
                activityVisitorMap.set(String(visitor._id), {
                    ...visitor,
                    status: item.status || visitor.status,
                    latestFollowup: item,
                });
            }
        });

        return {
            activeEmployeeId,
            visitorFollowups: doneVisitorFollowups,
            inquiryFollowups: doneInquiryFollowups,
            activityVisitors: [...activityVisitorMap.values()],
            doneVisitorRows: doneVisitorFollowups.map((item) => ({ ...item, recordType: 'visitor', sortDate: item.callingDate || item.updatedAt || item.createdAt })),
            todayVisitorRows: doneVisitorFollowups
                .filter((item) => item.origin !== 'visitorReport')
                .map((item) => ({ ...item, recordType: 'visitor', sortDate: item.callingDate || item.updatedAt || item.createdAt })),
            reportVisitorRows: doneVisitorFollowups
                .filter((item) => item.origin === 'visitorReport')
                .map((item) => ({ ...item, recordType: 'visitor', sortDate: item.callingDate || item.updatedAt || item.createdAt })),
            doneInquiryRows: doneInquiryFollowups.map((item) => ({ ...item, recordType: 'inquiry', sortDate: item.callingDate || item.followUpAt || item.followUpDate })),
            doneFollowupRows: [
                ...doneVisitorFollowups.map((item) => ({ ...item, recordType: 'visitor', sortDate: item.callingDate || item.updatedAt || item.createdAt })),
                ...doneInquiryFollowups.map((item) => ({ ...item, recordType: 'inquiry', sortDate: item.callingDate || item.followUpAt || item.followUpDate }))
            ].sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
        };
    };

    const renderDoneFollowupRows = (rows, escapeHtml = escapePrintHtml) => rows.map((item, idx) => {
        const isVisitorFollowUp = item.recordType === 'visitor';
        const visitor = isVisitorFollowUp ? (item.visitorId || {}) : {};
        const followUpBy = isVisitorFollowUp
            ? (item.followUpBy?.name || item.followUpBy?.username || '-')
            : (item.followUpBy || '-');
        const callingDate = item.callingDate || item.followUpAt;
        return `<tr>
            <td class="text-center">${idx + 1}</td>
            <td>${escapeHtml(formatDate(isVisitorFollowUp ? (visitor.visitingDate || item.scheduledDate) : item.inquiryDate))}</td>
            <td>${escapeHtml(isVisitorFollowUp ? (item.branchId?.name || visitor.branchId?.name || '-') : (item.branchName || '-'))}</td>
            <td>${escapeHtml(isVisitorFollowUp ? getFilledBy(visitor) : (item.filledBy || '-'))}</td>
            <td>${escapeHtml(isVisitorFollowUp ? getReferenceBy(visitor) : (item.referenceBy || '-'))}</td>
            <td class="name">${escapeHtml(isVisitorFollowUp ? (visitor.studentName || '-') : (item.studentName || '-'))}</td>
            <td class="contact-cell">${renderPrintContact([
                { label: 'H', value: escapeHtml(isVisitorFollowUp ? visitor.contactHome : item.contactHome) },
                { label: 'S', value: escapeHtml(isVisitorFollowUp ? visitor.mobileNumber : item.contactStudent), highlight: true },
                { label: 'P', value: escapeHtml(isVisitorFollowUp ? visitor.contactParent : item.contactParent) }
            ])}</td>
            <td class="text-center">${renderPrintStatus(escapeHtml(item.status || 'Open'))}</td>
            <td>${escapeHtml(item.followUpDate || item.scheduledDate ? `${formatDate(item.followUpDate || item.scheduledDate)} ${new Date(item.followUpDate || item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-')}</td>
            <td>${escapeHtml(isVisitorFollowUp ? (item.remark || '-') : (item.followUpDetails || '-'))}</td>
            <td>${escapeHtml(followUpBy)}</td>
            <td>${callingDate ? `<div class="date-stack"><span class="date-main">${escapeHtml(`${formatDate(callingDate)} ${new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}</span><span class="byline">by ${escapeHtml(followUpBy)}</span></div>` : '-'}</td>
        </tr>`;
    }).join('');

    const renderActivityVisitorHeaders = () => `
        <tr>
            <th>Sr. No.</th>
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

    const renderActivityVisitorRows = (rows, escapeHtml = escapePrintHtml) => rows.map((item, idx) => {
        const latestFollowup = item.latestFollowup || {};
        const followUpBy = latestFollowup.followUpBy?.name || latestFollowup.followUpBy?.username || '-';
        const callingDate = latestFollowup.callingDate || latestFollowup.createdAt || latestFollowup.scheduledDate;
        return `<tr>
            <td class="text-center">${idx + 1}</td>
            <td class="date-main">${escapeHtml(formatDate(item.inquiryId?.inquiryDate || item.visitingDate))}</td>
            <td class="date-main">${escapeHtml(formatDate(item.visitingDate))}</td>
            ${user?.role === 'Super Admin' ? `<td class="muted-cell">${escapeHtml(item.branchId?.name || latestFollowup.branchId?.name || '-')}</td>` : ''}
            <td class="muted-cell">${escapeHtml(getFilledBy(item))}</td>
            <td class="muted-cell">${escapeHtml(getReferenceBy(item))}</td>
            <td class="name">${escapeHtml(getFullName(item.inquiryId && typeof item.inquiryId === 'object' ? item.inquiryId : item))}</td>
            <td class="contact-cell">${renderPrintContact([
                { label: 'H', value: escapeHtml(item.contactHome || '-') },
                { label: 'S', value: escapeHtml(item.mobileNumber || '-'), highlight: true },
                { label: 'P', value: escapeHtml(item.contactParent || '-') }
            ])}</td>
            <td class="text-center">${renderPrintStatus(escapeHtml(item.status || 'Open'))}</td>
            <td>${latestFollowup.scheduledDate ? `<div class="date-stack"><span class="date-main">${escapeHtml(formatDate(latestFollowup.scheduledDate))}</span><span class="date-time">${escapeHtml(new Date(latestFollowup.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span></div>` : '-'}</td>
            <td>${escapeHtml(latestFollowup.remark || item.remarks || '-')}</td>
            <td>${escapeHtml(followUpBy)}</td>
            <td>${callingDate ? `<div class="date-stack"><span class="date-main">${escapeHtml(`${formatDate(callingDate)} ${new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}</span><span class="byline">by ${escapeHtml(followUpBy)}</span></div>` : '-'}</td>
        </tr>`;
    }).join('');

    const handlePrintDoneActivity = async () => {
        setLoading(true);
        const toastId = toast.loading('Preparing followups done print...');
        try {
            const doneData = await fetchDoneActivityData(filters);
            if (filters.reportType === 'visited') {
                const headers = renderActivityVisitorHeaders();
                const rows = renderActivityVisitorRows(doneData.activityVisitors);
                printHtml('Activity Report Visitors', `<table><thead>${headers}</thead><tbody>${rows || `<tr><td colspan="${user?.role === 'Super Admin' ? 13 : 12}" class="text-center muted">No done visitors found.</td></tr>`}</tbody></table>`);
            } else {
                const headers = `<tr><th>Sr. No.</th><th>Date</th><th>Branch</th><th>Filled By</th><th>Reference By</th><th>Student Name</th><th>Contact (H/S/P)</th><th>Status</th><th>Followup</th><th>Followup Details</th><th>Followup By</th><th>Calling Date</th></tr>`;
                const rows = renderDoneFollowupRows(doneData.doneFollowupRows || []);
                printHtml('Activity Today Followups', `<table><thead>${headers}</thead><tbody>${rows || '<tr><td colspan="12" class="text-center muted">No done followups found.</td></tr>'}</tbody></table>`);
            }
            toast.update(toastId, { render: 'Print ready', type: 'success', isLoading: false, autoClose: 1500 });
        } catch (error) {
            console.error('Followups done print error:', error);
            toast.error('Failed to print followups done');
            toast.dismiss(toastId);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePrintFollowupsAll = async () => {
        setLoading(true);
        const toastId = toast.loading("Preparing today's followup print report...");
        
        try {
            const activeEmployeeId = getScopedEmployeeId(user, filters.employeeId);
            const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
            const formatDateTime = (value) => value
                ? `${formatDate(value)} ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : '-';
            const doneActivity = await fetchDoneActivityData({ ...filters, isPrintAll: true });
            const doneInquiryRows = doneActivity.doneInquiryRows || [];
            const doneVisitorRows = doneActivity.todayVisitorRows || [];
            const reportVisitorRows = doneActivity.reportVisitorRows || [];
            const allVisitorRows = [...doneVisitorRows, ...reportVisitorRows];
            const uniqueDoneKeys = new Set([
                ...doneInquiryRows.map((item) => `inquiry:${item._id || item.inquiryId || item.studentName}:${item.callingDate || item.followUpAt || item.followUpDate}`),
                ...allVisitorRows.map((item) => `visitor:${item._id || item.visitorId?._id || item.visitorId}:${item.callingDate || item.createdAt || item.updatedAt}`),
            ]);

            toast.update(toastId, { render: "Data fetched, generating report...", type: "success", isLoading: false, autoClose: 2000 });

            const sections = [
                { title: '1. Online Inquiry Done Followups', data: doneInquiryRows.filter(f => f.source === 'Online'), type: 'done-followup' },
                { title: '2. Offline Inquiry Done Followups', data: doneInquiryRows.filter(f => f.source === 'Walk-in'), type: 'done-followup' },
                { title: '3. DSR Inquiry Done Followups', data: doneInquiryRows.filter(f => f.source === 'DSR'), type: 'done-followup' },
                { title: '4. Today Visitors Done Followups', data: doneVisitorRows, type: 'done-followup' },
                { title: '5. Today Report Follow-up Section', data: doneActivity.doneFollowupRows || [], type: 'done-followup' },
                { title: '6. Today Report Visitor Section', data: reportVisitorRows, type: 'done-followup' },
            ];

            const employeeName = getEmployeeNameById(employeeOptions, activeEmployeeId, 'All Employees');
            let finalHtml = `<div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                <h2 style="margin:0; color:#2563eb;">All Followups Done Summary: ${escapeHtml(employeeName)}</h2>
                <p style="margin:5px 0; font-size:12px;">Period: ${escapeHtml(formatDate(filters.fromDate))} to ${escapeHtml(formatDate(filters.toDate))}</p>
                <p style="margin:5px 0; font-size:12px;font-weight:bold;">Unique followups done: ${uniqueDoneKeys.size} | Inquiry: ${doneInquiryRows.length} | Visitor: ${allVisitorRows.length}</p>
            </div>`;

            sections.forEach(section => {
                const headers = section.type === 'inquiry' || section.type === 'done-followup' ? `
                    <tr>
                        <th style="width:4%">Sr. No.</th>
                        <th style="width:8%">${section.type === 'done-followup' ? 'Date' : 'Inquiry Date'}</th>
                        <th style="width:9%">Branch</th>
                        <th style="width:9%">Filled By</th>
                        <th style="width:9%">Reference By</th>
                        <th>Student Name</th>
                        <th style="width:10%">Contact (H/S/P)</th>
                        <th style="width:6%">Status</th>
                        <th style="width:9%">Followup</th>
                        <th style="width:11%">Followup Details</th>
                        <th style="width:7%">Followup By</th>
                        <th style="width:9%">Calling Date</th>
                    </tr>
                ` : section.type === 'visitor-followup' ? `
                    <tr>
                        <th style="width:4%">Sr. No.</th>
                        <th style="width:8%">Visitor Date</th>
                        <th style="width:9%">Branch</th>
                        <th style="width:9%">Filled By</th>
                        <th style="width:9%">Reference By</th>
                        <th>Student Name</th>
                        <th style="width:10%">Contact (H/S/P)</th>
                        <th style="width:6%">Status</th>
                        <th style="width:9%">Followup</th>
                        <th style="width:11%">Followup Details</th>
                        <th style="width:7%">Followup By</th>
                        <th style="width:9%">Calling Date</th>
                    </tr>
                ` : renderActivityVisitorHeaders();

                const rows = section.data.length > 0 ? (
                    section.type === 'done-followup'
                        ? renderDoneFollowupRows(section.data, escapeHtml)
                        : section.type === 'activity-visitor'
                            ? renderActivityVisitorRows(section.data, escapeHtml)
                            : section.data.map((item, idx) => {
                    if (section.type === 'inquiry') {
                        return `<tr>
                            <td class="text-center">${idx + 1}</td>
                            <td>${escapeHtml(item.inquiryDate ? formatDate(item.inquiryDate) : '-')}</td>
                            <td>${escapeHtml(item.branchName || '-')}</td>
                            <td>${escapeHtml(item.filledBy || '-')}</td>
                            <td>${escapeHtml(item.referenceBy || '-')}</td>
                            <td class="name">${escapeHtml(item.studentName || '-')}</td>
                            <td class="contact-cell">${renderPrintContact([
                                { label: 'H', value: escapeHtml(item.contactHome || '-') },
                                { label: 'S', value: escapeHtml(item.contactStudent || '-'), highlight: true },
                                { label: 'P', value: escapeHtml(item.contactParent || '-') }
                            ])}</td>
                            <td class="text-center">${renderPrintStatus(escapeHtml(item.status || '-'))}</td>
                            <td>${escapeHtml(formatDateTime(item.followUpDate))}</td>
                            <td>${escapeHtml(item.followUpDetails || '-')}</td>
                            <td>${escapeHtml(item.followUpBy || '-')}</td>
                            <td>${escapeHtml(formatDateTime(item.callingDate))}</td>
                        </tr>`;
                    } else if (section.type === 'visitor-followup') {
                        const visitor = item.visitorId || {};
                        const followUpBy = item.followUpBy?.name || item.followUpBy?.username || '-';
                        const callingDate = item.isDone ? (item.callingDate || null) : null;
                        return `<tr>
                            <td class="text-center">${idx + 1}</td>
                            <td>${escapeHtml(formatDate(visitor.visitingDate || item.scheduledDate))}</td>
                            <td>${escapeHtml(item.branchId?.name || visitor.branchId?.name || '-')}</td>
                            <td>${escapeHtml(getFilledBy(visitor))}</td>
                            <td>${escapeHtml(getReferenceBy(visitor))}</td>
                            <td class="name">${escapeHtml(visitor.studentName || '-')}</td>
                            <td class="contact-cell">${renderPrintContact([
                                { label: 'H', value: escapeHtml(visitor.contactHome || '-') },
                                { label: 'S', value: escapeHtml(visitor.mobileNumber || '-'), highlight: true },
                                { label: 'P', value: escapeHtml(visitor.contactParent || '-') }
                            ])}</td>
                            <td class="text-center">${renderPrintStatus(escapeHtml(item.status || '-'))}</td>
                            <td>${escapeHtml(formatDateTime(item.scheduledDate))}</td>
                            <td>${escapeHtml(item.remark || '-')}</td>
                            <td>${escapeHtml(followUpBy)}</td>
                            <td>${callingDate ? `<div class="date-stack"><span class="date-main">${escapeHtml(formatDateTime(callingDate))}</span><span class="byline">by ${escapeHtml(followUpBy)}</span></div>` : '-'}</td>
                        </tr>`;
                    }
                }).join('')) : `<tr><td colspan="${section.type === 'activity-visitor' ? (user?.role === 'Super Admin' ? 13 : 12) : 12}" class="text-center muted">No records found</td></tr>`;

                finalHtml += `
                    <div style="margin-top: 25px; page-break-inside: avoid;">
                        <h3 style="background:#f3f4f6; padding:8px; border-left:4px solid #2563eb; margin-bottom:10px;">${escapeHtml(section.title)} (${section.data.length})</h3>
                        <table><thead>${headers}</thead><tbody>${rows}</tbody></table>
                    </div>
                `;
            });

            printHtml('6-Category Employee Activity Report', finalHtml);

        } catch (error) {
            console.error("6 Print Error:", error);
            toast.error("Failed to generate 6-category report");
            toast.dismiss(toastId);
        } finally {
            setLoading(false);
        }
    };
    
    // State
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [doneActivityStats, setDoneActivityStats] = useState({ followupsDone: 0, visitorsDone: 0 });
    const { user } = useSelector((state) => state.auth);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingVisitor, setViewingVisitor] = useState(null);
    const [followUpVisitor, setFollowUpVisitor] = useState(null);
    const [showPendingBreakup, setShowPendingBreakup] = useState(false);
    
    // Inquiry Modals State for Follow-ups
    const [editInquiryData, setEditInquiryData] = useState(null);
    const [viewInquiry, setViewInquiry] = useState(null);
    const [showFollowUpModal, setShowFollowUpModal] = useState(null);
    
    const [filters, setFilters] = useState({
        fromDate: getTodayDateISO(),
        toDate: getTodayDateISO(),
        studentName: '',
        referenceBy: '',
        employeeId: '',
        limit: 50,
        branchId: '',
        listType: 'all',
        reportType: 'followup' // Default to follow-up as requested
    });

    const [followups, setFollowups] = useState([]);
    const [selectedVisitorIds, setSelectedVisitorIds] = useState(new Set());
    const [visitorBulkAssignee, setVisitorBulkAssignee] = useState('');
    const [visitorTransferMode, setVisitorTransferMode] = useState(false);
    const [selectedFollowupKeys, setSelectedFollowupKeys] = useState(new Set());
    const [followupBulkAssignee, setFollowupBulkAssignee] = useState('');
    const [followupTransferMode, setFollowupTransferMode] = useState(false);
    const canTransferRecords = ['Super Admin', 'Branch Director'].includes(user?.role);
    const employeeOptions = getEmployeeFilterOptions(employees, user);
    const getDateKey = (value) => {
        if (!value) return '';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.slice(0, 10);
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const formatDateKey = (value) => {
        const key = getDateKey(value);
        if (!key) return '-';
        const [year, month, day] = key.split('-');
        return `${day}/${month}/${year}`;
    };
    const pendingBreakup = (stats?.pendingByDate || [])
        .filter((item) => {
            const key = getDateKey(item?.date);
            return key && (!filters.fromDate || key < filters.fromDate);
        })
        .map((item) => ({ ...item, date: getDateKey(item.date) }));
    const pendingFromBeforeTotal = pendingBreakup.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const getFullName = (record = {}) => {
        const fullName = `${record.firstName || ''} ${record.middleName || ''} ${record.lastName || ''}`.trim().replace(/\s+/g, ' ');
        return fullName || record.studentName || '-';
    };

    const getRecordName = (item) => {
        const record = item?.recordType === 'visitor' ? item.visitorId : item;
        if (!record) return '';
        const linkedInquiry = record.inquiryId && typeof record.inquiryId === 'object' ? record.inquiryId : null;
        return getFullName(linkedInquiry || record);
    };
    const getRecordReference = (item) => {
        const record = item?.recordType === 'visitor' ? item.visitorId : item;
        return record?.reference || record?.referenceBy || '';
    };
    const filterOptionRows = filters.reportType === 'visited' ? visitors : followups;
    const activeStudentNames = [...new Set(filterOptionRows.map(getRecordName).filter(Boolean))].sort();
    const activeReferences = [...new Set(filterOptionRows.map(getRecordReference).filter(Boolean))].sort();

    useEffect(() => {
        if (user && user.role === 'Super Admin') {
            fetchBranches();
        }
        fetchEmployees();
    }, [user]);

    useEffect(() => {
        fetchVisitors();
    }, [
        filters.reportType,
        filters.fromDate,
        filters.toDate,
        filters.branchId,
        filters.listType,
        filters.employeeId,
        visitorReportRights.view,
        onlineInquiryRights.view,
        offlineInquiryRights.view,
        dsrInquiryRights.view,
    ]);

    const fetchBranches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/branches`, { withCredentials: true });
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/employees`, { withCredentials: true });
            setEmployees(res.data?.employees || res.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const fetchStats = async (nextFilters = filters) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/visitors/followup-stats`, {
                params: {
                    fromDate: nextFilters.fromDate,
                    toDate: nextFilters.toDate,
                    branchId: nextFilters.branchId,
                    employeeId: nextFilters.employeeId,
                    dateFilterType: 'followUpDate',
                },
                withCredentials: true,
            });
            setStats(res.data);
        } catch {
            setStats(null);
        }
    };

    // Fetch data based on report type
    const fetchVisitors = async (overrideFilters = filters) => {
        const activeFilters = overrideFilters;
        setLoading(true);
        try {
            fetchStats(activeFilters);
            const doneActivityForStats = await fetchDoneActivityData(activeFilters).catch(() => ({
                doneFollowupRows: [],
                activityVisitors: [],
                doneVisitorRows: [],
                doneInquiryRows: []
            }));
            const doneVisitorFollowupCount = Array.isArray(doneActivityForStats.doneVisitorRows)
                ? doneActivityForStats.doneVisitorRows.length
                : Array.isArray(doneActivityForStats.doneFollowupRows)
                    ? doneActivityForStats.doneFollowupRows.filter((item) => item?.recordType === 'visitor').length
                    : 0;
            const doneTotalFollowupCount = Array.isArray(doneActivityForStats.doneFollowupRows)
                ? doneActivityForStats.doneFollowupRows.length
                : 0;
            setDoneActivityStats({
                followupsDone: doneTotalFollowupCount,
                visitorsDone: doneVisitorFollowupCount
            });
            if (activeFilters.reportType === 'visited') {
                const data = await visitorService.getAllVisitors({
                    ...activeFilters,
                    employeeId: activeFilters.employeeId,
                    dateFilterType: 'visitingOrFollowUpDate',
                    excludeFollowedVisitors: 'true'
                });
                setVisitors(data);
                setFollowups([]);
                setSelectedVisitorIds(new Set());
                setVisitorBulkAssignee('');
                setSelectedFollowupKeys(new Set());
                setFollowupBulkAssignee('');
            } else {
                const listType = activeFilters.listType || 'all';
                const sourceByListType = {
                    online: 'Online',
                    offline: 'Walk-in',
                    dsr: 'DSR'
                };
                const canViewInquirySource = (source) => getInquiryRights(source).view;
                const shouldFetchVisitorFollowups = (listType === 'all' || listType === 'visitor') && visitorReportRights.view;
                const shouldFetchInquiryFollowups = (listType === 'all' || ['online', 'offline', 'dsr'].includes(listType)) &&
                    (sourceByListType[listType] ? canViewInquirySource(sourceByListType[listType]) : [onlineInquiryRights, offlineInquiryRights, dsrInquiryRights].some(rights => rights.view));
                const inquiryParams = {
                    startDate: activeFilters.fromDate,
                    endDate: activeFilters.toDate,
                    branchId: activeFilters.branchId,
                    studentName: activeFilters.studentName,
                    referenceBy: activeFilters.referenceBy,
                    dateFilterType: 'followUpDate',
                    onlyFollowupActivity: 'true',
                    employeeId: activeFilters.employeeId,
                    includeClosed: 'true',
                    ...(sourceByListType[listType] ? { source: sourceByListType[listType] } : {})
                };

                const [visitorFollowups, inquiryRes] = await Promise.all([
                    shouldFetchVisitorFollowups ? visitorService.getVisitorFollowUps({
                        ...activeFilters,
                        employeeId: activeFilters.employeeId,
                        dateFilterType: 'followUpDate',
                        isDone: false
                    }) : Promise.resolve([]),
                    shouldFetchInquiryFollowups
                        ? axios.get(`${import.meta.env.VITE_API_URL}/transaction/inquiry`, {
                            params: inquiryParams,
                            withCredentials: true
                        })
                        : Promise.resolve({ data: [] })
                ]);

                const visitorRows = visitorFollowups.map(item => ({
                    ...item,
                    callingDate: item.isDone ? (item.callingDate || null) : null,
                    recordType: 'visitor',
                    sortDate: item.scheduledDate || item.createdAt || item.updatedAt || null
                }));
                const inquiryRows = (Array.isArray(inquiryRes.data) ? inquiryRes.data : [])
                    .filter(item => canViewInquirySource(item.source))
                    .map(item => {
                        const followupActivities = (item.followUpHistory || []).filter(history => history.activityType === 'followup');
                        const latestFollowupActivity = followupActivities[followupActivities.length - 1];
                        return latestFollowupActivity ? {
                            ...item,
                            latestFollowupActivity,
                            followUpDate: latestFollowupActivity.date || item.followUpDate || latestFollowupActivity.createdAt,
                            followUpDetails: latestFollowupActivity.remarks || latestFollowupActivity.remark || item.followUpDetails,
                            followUpBy: latestFollowupActivity.followUpBy || item.followUpBy,
                            callingDate: latestFollowupActivity.createdAt || latestFollowupActivity.date || item.updatedAt,
                            recordType: 'inquiry',
                            sortDate: latestFollowupActivity.date || item.followUpDate || latestFollowupActivity.createdAt || item.updatedAt
                        } : null;
                    })
                    .filter(Boolean);
                const mergedRows = [...visitorRows, ...inquiryRows];
                const uniqueRows = [...new Map(mergedRows.map((item) => {
                    const visitorId = item.recordType === 'visitor'
                        ? (item.visitorId && typeof item.visitorId === 'object' ? item.visitorId._id : item.visitorId)
                        : null;
                    const key = item.recordType === 'visitor'
                        ? `visitor:${visitorId || item._id || item.sortDate}`
                        : `inquiry:${item.inquiryId || item._id || item.sortDate}`;
                    return [key, item];
                })).values()];

                setFollowups(uniqueRows.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate)));
                setVisitors([]);
                setSelectedVisitorIds(new Set());
                setVisitorBulkAssignee('');
                setSelectedFollowupKeys(new Set());
                setFollowupBulkAssignee('');
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        fetchVisitors();
    };

    const handleReset = () => {
        const resetState = {
            fromDate: getTodayDateISO(),
            toDate: getTodayDateISO(),
            studentName: '',
            referenceBy: '',
            employeeId: '',
            limit: 50,
            branchId: '',
            listType: 'all',
            reportType: 'followup'
        };
        setFilters(resetState);
        setVisitors([]);
        setFollowups([]);
        setSelectedVisitorIds(new Set());
        setSelectedFollowupKeys(new Set());
        setVisitorBulkAssignee('');
        setFollowupBulkAssignee('');
        setDoneActivityStats({ followupsDone: 0, visitorsDone: 0 });
        setVisitorTransferMode(false);
        setFollowupTransferMode(false);
        fetchVisitors(resetState);
        toast.info('Filters reset');
    };

    const handleView = (visitor) => {
        setViewingVisitor(visitor);
        setShowViewModal(true);
    };

    const handleOpenVisitorFollowUp = (visitor) => {
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
        // Navigate to Visitors page with pre-filled data
        navigate('/transaction/visitors', { state: { visitorData: visitor } });
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete visitors.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this visitor?')) {
            try {
                await visitorService.deleteVisitor(id);
                toast.success('Visitor deleted successfully');
                fetchVisitors(); // Refresh the list
            } catch (error) {
                console.error("Error deleting visitor:", error);
                toast.error("Failed to delete visitor");
            }
        }
    };

    const handleSaveVisitorFollowUp = async (id, data) => {
        if (!edit) {
            showPermissionDenied("You don't have authority to update visitor follow-ups.");
            return;
        }
        try {
            await visitorService.createVisitorFollowUp({
                ...data,
                followUpOrigin: 'visitorReport'
            });
            toast.success("Visitor follow-up saved");
            setFollowUpVisitor(null);
            fetchVisitors();
        } catch (error) {
            console.error("Error saving visitor follow-up:", error);
            toast.error("Failed to save visitor follow-up");
        }
    };

    const handleDeleteVisitorFollowUp = async (id) => {
        if (!canDelete) {
            showPermissionDenied("You don't have authority to delete visitor follow-ups.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this visitor follow-up?')) {
            try {
                await visitorService.deleteVisitorFollowUp(id);
                toast.success('Visitor follow-up deleted successfully');
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting visitor follow-up:", error);
                toast.error("Failed to delete visitor follow-up");
            }
        }
    };

    const handleDeleteInquiry = async (id, allowed = canDelete) => {
        if (!allowed) {
            showPermissionDenied("You don't have authority to delete inquiries.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this inquiry?')) {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, { withCredentials: true });
                toast.success('Inquiry deleted successfully');
                fetchVisitors();
            } catch (error) {
                console.error("Error deleting inquiry:", error);
                toast.error("Failed to delete inquiry");
            }
        }
    };

    const handleSaveInquiry = async ({ id, data }) => {
        const source = data?.source || editInquiryData?.source;
        if (!getInquiryRights(source).edit) {
            showPermissionDenied("You don't have authority to edit inquiries.");
            return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, data, { withCredentials: true });
            toast.success("Inquiry Updated Successfully");
            setEditInquiryData(null);
            fetchVisitors();
        } catch {
            toast.error("Failed to update inquiry");
        }
    };

    const handleSaveFollowUp = async ({ id, data }) => {
        const source = showFollowUpModal?.source || data?.source;
        if (!getInquiryRights(source).edit) {
            showPermissionDenied("You don't have authority to update inquiry follow-ups.");
            return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/transaction/inquiry/${id}`, data, { withCredentials: true });
            toast.success("Follow-up Updated");
            setShowFollowUpModal(null);
            fetchVisitors();
        } catch {
            toast.error("Failed to update follow-up");
        }
    };

    const completedStatuses = ["Complete", "Completed", "Converted"];
    const isCompletedStatus = (status) => completedStatuses.includes(status || '');
    const isVisitorHandled = (visitor) => Boolean(
        visitor?.latestFollowup ||
        (visitor?.status && visitor.status !== 'Open')
    );
    const canSelectVisitor = (visitor) => {
        if (!visitorTransferMode) return true;
        if (!filters.employeeId) return false;
        return isVisitorHandled(visitor);
    };
    const currentVisitorIds = (visitors || []).filter(canSelectVisitor).map((item) => item._id).filter(Boolean);
    const currentVisitorSelectedCount = currentVisitorIds.filter((id) => selectedVisitorIds.has(id)).length;
    const getFollowupKey = (item) => {
        if (!item) return '';
        if (item.recordType === 'visitor') {
            const visitorId = item.visitorId && typeof item.visitorId === 'object' ? item.visitorId._id : item.visitorId;
            return visitorId ? `visitor:${visitorId}` : '';
        }
        return item._id || item.inquiryId ? `inquiry:${item._id || item.inquiryId}` : '';
    };
    const getFollowupRowRights = (item) => {
        if (!item) return { edit: false };
        return item.recordType === 'visitor' ? visitorReportRights : getInquiryRights(item.source);
    };
    const currentFollowupKeys = (followups || [])
        .filter((item) => getFollowupRowRights(item).edit)
        .map(getFollowupKey)
        .filter(Boolean);
    const currentFollowupSelectedCount = currentFollowupKeys.filter((key) => selectedFollowupKeys.has(key)).length;

    const toggleVisitorSelection = (visitor) => {
        if (!visitor || !visitor._id || !canSelectVisitor(visitor)) return;
        setSelectedVisitorIds((prev) => {
            const next = new Set(prev);
            if (next.has(visitor._id)) next.delete(visitor._id);
            else next.add(visitor._id);
            return next;
        });
    };

    const toggleFollowupSelection = (item) => {
        const key = getFollowupKey(item);
        if (!key || !getFollowupRowRights(item).edit) return;
        setSelectedFollowupKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectAllVisitors = () => {
        setSelectedVisitorIds((prev) => {
            const next = new Set(prev);
            const allSelected = currentVisitorIds.length > 0 && currentVisitorIds.every((id) => next.has(id));
            if (allSelected) {
                currentVisitorIds.forEach((id) => next.delete(id));
            } else {
                currentVisitorIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const toggleSelectAllFollowups = () => {
        setSelectedFollowupKeys((prev) => {
            const next = new Set(prev);
            const allSelected = currentFollowupKeys.length > 0 && currentFollowupKeys.every((key) => next.has(key));
            if (allSelected) {
                currentFollowupKeys.forEach((key) => next.delete(key));
            } else {
                currentFollowupKeys.forEach((key) => next.add(key));
            }
            return next;
        });
    };

    const handleBulkVisitorAssignment = async () => {
        if (!visitorBulkAssignee || selectedVisitorIds.size === 0) return;
        if (visitorTransferMode && !filters.employeeId) {
            toast.error('Please select employee filter before transfer');
            return;
        }

        try {
            await Promise.all(
                [...selectedVisitorIds].map((id) => visitorService.updateVisitor(id, { allocatedTo: visitorBulkAssignee }))
            );
            toast.success(`${selectedVisitorIds.size} visitor ${visitorTransferMode ? 'transferred' : 'assigned'} successfully`);
            setSelectedVisitorIds(new Set());
            setVisitorBulkAssignee('');
            fetchVisitors();
        } catch (error) {
            console.error('Error updating visitor assignments:', error);
            toast.error('Failed to update visitor assignment');
        }
    };

    const handleBulkFollowupAssignment = async () => {
        if (!followupBulkAssignee || selectedFollowupKeys.size === 0) return;
        if (followupTransferMode && !filters.employeeId) {
            toast.error('Please select employee filter before transfer');
            return;
        }

        const selectedItems = (followups || []).filter((item) => selectedFollowupKeys.has(getFollowupKey(item)));
        try {
            await Promise.all(selectedItems.map((item) => {
                if (item.recordType === 'visitor') {
                    const visitorId = item.visitorId && typeof item.visitorId === 'object' ? item.visitorId._id : item.visitorId;
                    if (!visitorId) return Promise.resolve();
                    return visitorService.updateVisitor(visitorId, { allocatedTo: followupBulkAssignee });
                }
                return axios.put(
                    `${import.meta.env.VITE_API_URL}/transaction/inquiry/${item._id}`,
                    { allocatedTo: followupBulkAssignee },
                    { withCredentials: true }
                );
            }));
            toast.success(`${selectedItems.length} record ${followupTransferMode ? 'transferred' : 'assigned'} successfully`);
            setSelectedFollowupKeys(new Set());
            setFollowupBulkAssignee('');
            fetchVisitors();
        } catch (error) {
            console.error('Error updating follow-up assignments:', error);
            toast.error('Failed to update follow-up assignment');
        }
    };

    const isWithinSelectedRange = (value) => {
        if (!value) return false;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        const start = new Date(filters.fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.toDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
    };

    const activeReportStats = (() => {
        if (filters.reportType === 'visited') {
            const visibleVisitorCount = Number(visitors.length || 0);
            const followUpsDone = Number(doneActivityStats.visitorsDone ?? stats?.totalFollowUps ?? stats?.followUpsDoneToday ?? stats?.summary?.followUpsDoneToday ?? 0);
            const totalRangeVisitors = Math.max(visibleVisitorCount + followUpsDone, visibleVisitorCount);
            const remaining = visibleVisitorCount;
            const completed = Number(stats?.completedCount ?? stats?.summary?.completed ?? visitors.filter((visitor) => isCompletedStatus(visitor.status)).length);
            const employeeSummary = Array.isArray(stats?.employees) ? stats.employees : [];
            return {
                total: totalRangeVisitors,
                open: remaining,
                rangeCount: remaining,
                completed,
                followUpsToday: followUpsDone,
                totalFollowUps: followUpsDone,
                remaining,
                rangeLabel: 'Range Visitors',
                topLabel: 'Top Followup',
                employees: employeeSummary,
                pendingFromBefore: pendingFromBeforeTotal,
                newCount: totalRangeVisitors
            };
        }

        const remaining = Number(followups.length || 0);
        const followUpsDone = Number(doneActivityStats.followupsDone || 0);
        const totalRangeFollowups = remaining + followUpsDone;
        const employeeMap = Array.isArray(stats?.employees) ? stats.employees : [];
        return {
            total: totalRangeFollowups,
            open: remaining,
            rangeCount: remaining,
            completed: followUpsDone,
            followUpsToday: followUpsDone,
            totalFollowUps: followUpsDone,
            doneTotal: totalRangeFollowups,
            remaining,
            rangeLabel: 'Range Followups',
            topLabel: 'Top Followup',
            employees: employeeMap,
            pendingFromBefore: pendingFromBeforeTotal,
            newCount: totalRangeFollowups
        };
    })();

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
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Activity Visitor Report</h2>
                            <p className="text-xs text-gray-500">Track visitors and follow-ups for {formatDate(filters.fromDate)}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 items-center w-full md:w-auto">
                        <button 
                            onClick={handlePrintList}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shadow-sm font-bold transition-all transform hover:scale-105"
                        >
                            <Printer size={16} /> Print List
                        </button>
                        <button 
                            onClick={handlePrintFollowupsAll}
                            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shadow-sm font-bold transition-all transform hover:scale-105"
                        >
                            <Printer size={16} /> 6 Print
                        </button>
                        <div className="flex bg-gray-100 p-1 rounded-xl flex-grow md:flex-none">
                            <button 
                                onClick={() => setFilters({...filters, reportType: 'followup'})}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'followup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Follow-ups
                            </button>
                            <button 
                                onClick={() => setFilters({...filters, reportType: 'visited'})}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${filters.reportType === 'visited' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Visitors
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top Summary Row (Small Cards) */}
                <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-3 rounded-lg border border-gray-100 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                        <p className="text-sm font-black text-gray-700">{activeReportStats.total}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-orange-400 uppercase">Open</p>
                        <p className="text-sm font-black text-orange-600">{activeReportStats.open}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <p className="text-[10px] font-bold text-green-400 uppercase">Completed</p>
                        <p className="text-sm font-black text-green-600">{activeReportStats.completed}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3">
                        <p className="text-[10px] font-bold text-blue-400 uppercase">Follow-ups Today</p>
                        <p className="text-sm font-black text-blue-600">{activeReportStats.followUpsToday}</p>
                    </div>
                </div>

                {showPendingBreakup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div>
                                    <h3 className="font-bold text-gray-800">Previous Pending Followups</h3>
                                    <p className="text-xs text-gray-500">Total pending: {pendingFromBeforeTotal}</p>
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
                                                    <td className="p-2 border font-medium">{formatDateKey(item.date)}</td>
                                                    <td className="p-2 border text-right font-bold text-orange-600">{item.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center text-gray-400 py-8">No previous pending followups.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Section (Super Admin only, similar to Inquiry) */}
                {activeReportStats && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow mb-6 p-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">{activeReportStats.rangeLabel}</div>
                                <div className="text-2xl font-black text-blue-700">
                                    {activeReportStats.rangeCount ?? activeReportStats.open}<span className="text-lg font-bold text-gray-400">/{activeReportStats.total}</span>
                                </div>
                                {activeReportStats.pendingFromBefore > 0 && (
                                    <div className="mt-1 text-[10px]">
                                        <span className="text-orange-500 font-bold">Prev Pending: {activeReportStats.pendingFromBefore}</span>
                                        <span className="text-gray-400 mx-1">|</span>
                                        <span className="text-green-600">New: {activeReportStats.newCount}</span>
                                    </div>
                                )}
                                {activeReportStats.pendingFromBefore > 0 && (
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
                                    {activeReportStats.totalFollowUps}<span className="text-lg font-bold text-gray-400">/{activeReportStats.doneTotal ?? activeReportStats.total}</span>
                                </div>
                                <div className="mt-1 text-[10px] text-gray-400">
                                    {activeReportStats.remaining} remaining
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePrintFollowupsList}
                                    className="mt-2 inline-flex items-center gap-1 rounded bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 hover:bg-purple-200"
                                >
                                    <Printer size={12} /> {filters.reportType === 'visited' ? 'Print Done Visitors' : 'Print Done Followups'}
                                </button>
                            </div>
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">{activeReportStats.topLabel}</div>
                                <div className="text-sm font-bold text-gray-800">{activeReportStats.employees?.[0]?.employeeName || '-'}</div>
                                <div className="text-xs text-gray-500">{activeReportStats.employees?.[0]?.latestFollowUpAt ? new Date(activeReportStats.employees[0].latestFollowUpAt).toLocaleString() : '-'}</div>
                            </div>
                            <div className="border rounded p-3">
                                <div className="text-xs text-gray-500 font-bold uppercase">Completed</div>
                                <div className="text-2xl font-black text-green-700">{activeReportStats.completed}</div>
                            </div>
                        </div>
                        {activeReportStats.employees?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {activeReportStats.employees.map((item) => (
                                    <span key={item.employeeId} className="inline-flex items-center gap-1 text-[10px] border rounded-full px-3 py-1 bg-gray-50 font-bold">
                                        <span className="text-blue-700">{item.employeeName}</span>: {item.followUpCount} followups
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {filters.reportType === 'visited' && edit && canTransferRecords && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow mb-6 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm font-bold text-gray-700">
                            {currentVisitorSelectedCount} on this page | {selectedVisitorIds.size} total selected
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <select
                                value={visitorBulkAssignee}
                                onChange={(e) => setVisitorBulkAssignee(e.target.value)}
                                className="border rounded px-3 py-2 text-sm min-w-[220px]"
                            >
                                <option value="">Select employee</option>
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedVisitorIds(new Set());
                                    setVisitorTransferMode((prev) => !prev);
                                }}
                                className={`px-4 py-2 rounded text-sm font-bold border ${visitorTransferMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300'}`}
                            >
                                {visitorTransferMode ? 'Transfer On' : 'Transfer'}
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkVisitorAssignment}
                                disabled={!visitorBulkAssignee || selectedVisitorIds.size === 0 || (visitorTransferMode && !filters.employeeId)}
                                className="px-4 py-2 rounded text-sm font-bold bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {visitorTransferMode ? 'Transfer Selected' : 'Assign Selected'}
                            </button>
                        </div>
                    </div>
                )}

                {filters.reportType === 'followup' && edit && canTransferRecords && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow mb-6 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm font-bold text-gray-700">
                            {currentFollowupSelectedCount} on this page | {selectedFollowupKeys.size} total selected
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <select
                                value={followupBulkAssignee}
                                onChange={(e) => setFollowupBulkAssignee(e.target.value)}
                                className="border rounded px-3 py-2 text-sm min-w-[220px]"
                            >
                                <option value="">Select employee</option>
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFollowupKeys(new Set());
                                    setFollowupTransferMode((prev) => !prev);
                                }}
                                className={`px-4 py-2 rounded text-sm font-bold border ${followupTransferMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300'}`}
                            >
                                {followupTransferMode ? 'Transfer On' : 'Transfer'}
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkFollowupAssignment}
                                disabled={!followupBulkAssignee || selectedFollowupKeys.size === 0 || (followupTransferMode && !filters.employeeId)}
                                className="px-4 py-2 rounded text-sm font-bold bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {followupTransferMode ? 'Transfer Selected' : 'Assign Selected'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Section */}
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
                                    name="fromDate"
                                    value={filters.fromDate}
                                    onChange={handleFilterChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">To Date</label>
                                <input
                                    type="date"
                                    name="toDate"
                                    value={filters.toDate}
                                    onChange={handleFilterChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            {user?.role === 'Super Admin' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Branch</label>
                                    <select
                                        name="branchId"
                                        value={filters.branchId}
                                        onChange={handleFilterChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {filters.reportType === 'followup' && (
                                <div>
                                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Follow-up Source</label>
                                    <select
                                        name="listType"
                                        value={filters.listType}
                                        onChange={handleFilterChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="all">All Follow-ups</option>
                                        <option value="visitor">Visitor Follow-ups</option>
                                        <option value="online">Online Inquiry</option>
                                        <option value="offline">Offline Inquiry</option>
                                        <option value="dsr">DSR Inquiry</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Employee (Handled By)</label>
                                <select
                                    name="employeeId"
                                    value={filters.employeeId}
                                    onChange={handleFilterChange}
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
                                    value={filters.studentName}
                                    onSelect={(val) => setFilters({ ...filters, studentName: val })}
                                    label="Search Student"
                                    placeholder="Search or type student name/mobile..."
                                    clearLabel="All Students"
                                />
                            </div>
                            <div>
                                <SearchableDropdown
                                    options={activeReferences}
                                    value={filters.referenceBy}
                                    onSelect={(val) => setFilters({ ...filters, referenceBy: val })}
                                    label="Reference By"
                                    placeholder="Search or type Reference..."
                                    clearLabel="All References"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                onClick={handleReset}
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
                        <h1 className="text-2xl font-bold text-blue-800 uppercase tracking-wide">
                            {filters.reportType === 'visited' ? 'Visitor Report' : 'Follow-up Report'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Report Period: {formatDate(filters.fromDate)} to {formatDate(filters.toDate)} | Generated on {new Date().toLocaleDateString('en-GB')} | Total Records: {filters.reportType === 'visited' ? visitors?.length || 0 : followups?.length || 0}
                        </p>
                    </div>
                    <div className="mb-4 flex justify-between items-center print:hidden">
                        <div className="text-sm font-bold text-gray-700">
                            Showing {filters.reportType === 'visited' ? visitors.length : followups.length} {filters.reportType} records
                        </div>
                        <select 
                            name="limit" 
                            value={filters.limit}
                            onChange={(e) => {
                                handleFilterChange(e); 
                                setTimeout(fetchVisitors, 100); 
                            }}
                            className="border rounded-lg p-2 text-xs text-gray-600 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="50">50 Records</option>
                            <option value="100">100 Records</option>
                            <option value="200">200 Records</option>
                        </select>
                    </div>
                    <table className="w-full border-collapse min-w-[1100px]">
                        {filters.reportType === 'visited' ? (
                            <thead>
                                <tr className="bg-orange-700 text-white text-left text-xs uppercase tracking-wider">
                                    {canTransferRecords && (
                                        <th className="p-2 border font-semibold w-10 text-center print:hidden">
                                            <input
                                                type="checkbox"
                                                checked={currentVisitorIds.length > 0 && currentVisitorSelectedCount === currentVisitorIds.length}
                                                onChange={toggleSelectAllVisitors}
                                                className="h-4 w-4"
                                            />
                                        </th>
                                    )}
                                    <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                                    <th className="p-2 border font-semibold">Inquiry Date</th>
                                    <th className="p-2 border font-semibold">Visitor Date</th>
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
                                    <th className="p-2 border font-semibold text-center sticky right-0 bg-orange-700 z-10 w-32">Actions</th>
                                </tr>
                            </thead>
                        ) : (
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    {canTransferRecords && (
                                        <th className="p-2 border font-semibold w-10 text-center print:hidden">
                                            <input
                                                type="checkbox"
                                                checked={currentFollowupKeys.length > 0 && currentFollowupSelectedCount === currentFollowupKeys.length}
                                                onChange={toggleSelectAllFollowups}
                                                className="h-4 w-4"
                                            />
                                        </th>
                                    )}
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
                                    <th className="p-2 border font-semibold text-center sticky right-0 bg-blue-600 z-10 w-32 print:hidden">Actions</th>
                                </tr>
                            </thead>
                        )
                    }
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={filters.reportType === 'visited' ? (user?.role === 'Super Admin' ? (canTransferRecords ? 15 : 14) : (canTransferRecords ? 14 : 13)) : (user?.role === 'Super Admin' ? (canTransferRecords ? 14 : 13) : (canTransferRecords ? 13 : 12))} className="text-center p-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-gray-400 font-medium">Fetching records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filters.reportType === 'visited' ? (
                                visitors.length === 0 ? (
                                    <tr>
                                        <td colSpan={user?.role === 'Super Admin' ? (canTransferRecords ? 15 : 14) : (canTransferRecords ? 14 : 13)} className="text-center py-8 text-gray-400 italic">
                                            No visitor records found for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    visitors.map((visitor, index) => (
                                        <tr key={visitor._id} className={`${isVisitorHandled(visitor) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'} text-xs border-b border-gray-100 transition-colors`}>
                                            {canTransferRecords && (
                                                <td className="p-2 border text-center text-gray-400 font-medium print:hidden">
                                                    <input
                                                        type="checkbox"
                                                        disabled={!canSelectVisitor(visitor)}
                                                        checked={selectedVisitorIds.has(visitor._id)}
                                                        onChange={() => toggleVisitorSelection(visitor)}
                                                        className="h-4 w-4 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-2 border text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-2 border font-semibold text-gray-700">{formatDate(visitor.inquiryId?.inquiryDate || visitor.visitingDate)}</td>
                                            <td className="p-2 border font-semibold text-gray-700">
                                                {formatDate(visitor.visitingDate)}
                                            </td>
                                            {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{visitor.branchId?.name || '-'}</td>}
                                            <td className="p-2 border text-gray-600 font-medium">{getFilledBy(visitor)}</td>
                                            <td className="p-2 border text-gray-600 font-medium">{getReferenceBy(visitor)}</td>
                                            <td className="p-2 border font-bold text-gray-800">{getFullName(visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : visitor)}</td>
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
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                    visitor.status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    visitor.status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    visitor.status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                    visitor.status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {visitor.status || 'Open'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-gray-700 font-medium">
                                                {isVisibleVisitorFollowup(visitor) ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{formatDate(visitor.latestFollowup.scheduledDate)}</span>
                                                        <span className="text-[10px] text-blue-600">
                                                            {new Date(visitor.latestFollowup.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 border text-gray-600 truncate max-w-xs" title={isVisibleVisitorFollowup(visitor) ? (visitor.latestFollowup?.remark || visitor.remarks) : visitor.remarks}>
                                                {isVisibleVisitorFollowup(visitor) ? (
                                                    visitor.latestFollowup?.remark ? (visitor.latestFollowup.remark.length > 20 ? `${visitor.latestFollowup.remark.substring(0, 20)}...` : visitor.latestFollowup.remark) : (visitor.remarks ? (visitor.remarks.length > 20 ? `${visitor.remarks.substring(0, 20)}...` : visitor.remarks) : '-')
                                                ) : (
                                                    visitor.remarks ? (visitor.remarks.length > 20 ? `${visitor.remarks.substring(0, 20)}...` : visitor.remarks) : '-'
                                                )}
                                            </td>
                                            <td className="p-2 border text-gray-700 font-medium">
                                                {isVisibleVisitorFollowup(visitor) ? (visitor.latestFollowup?.followUpBy?.name || '-') : '-'}
                                            </td>
                                            <td className="p-2 border text-center">
                                                {isVisibleVisitorFollowup(visitor) ? getLastFollowUpInfo(visitor) : '-'}
                                            </td>
                                            <td className="p-2 border text-center sticky right-0 bg-white print:hidden">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => handleOpenVisitorFollowUp(visitor)} className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100 transition" title="Visitor Follow-up">
                                                        <CalendarClock size={14} />
                                                    </button>
                                                    <button onClick={() => handleTakeAdmission(visitor)} className="bg-green-50 text-green-600 border border-green-200 p-1.5 rounded hover:bg-green-100 transition" title="Take Admission">
                                                        <GraduationCap size={14} />
                                                    </button>
                                                    <button onClick={() => handleView(visitor)} className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-1.5 rounded hover:bg-indigo-100 transition" title="View Details">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => handleEdit(visitor)} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition" title="Edit">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(visitor._id)} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                followups.length === 0 ? (
                                    <tr>
                                        <td colSpan={user?.role === 'Super Admin' ? (canTransferRecords ? 14 : 13) : (canTransferRecords ? 13 : 12)} className="text-center py-8 text-gray-400 italic">
                                            No visitor or inquiry follow-ups scheduled for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    followups.map((hist, index) => {
                                        const isVisitorFollowUp = hist.recordType === 'visitor';
                                        const visitor = isVisitorFollowUp ? (hist.visitorId || {}) : {};
                                        const inquiry = isVisitorFollowUp ? {} : hist;
                                        const visitorInquiry = visitor.inquiryId && typeof visitor.inquiryId === 'object' ? visitor.inquiryId : null;
                                        const personName = getFullName(isVisitorFollowUp ? (visitorInquiry || visitor) : inquiry);
                                        const originalDate = isVisitorFollowUp ? (hist.scheduledDate || visitor.visitingDate) : inquiry.inquiryDate;
                                        const status = isVisitorFollowUp ? (hist.status || visitor.status) : inquiry.status;
                                        const branchName = isVisitorFollowUp ? hist.branchId?.name : (inquiry.branchId?.name || inquiry.branchName);
                                        const followupActivities = Array.isArray(inquiry.followUpHistory)
                                            ? inquiry.followUpHistory.filter(item => item.activityType === 'followup')
                                            : [];
                                        const lastHistoryItem = inquiry.latestFollowupActivity || (followupActivities.length ? followupActivities[followupActivities.length - 1] : null);
                                        const followUpDate = isVisitorFollowUp ? hist.scheduledDate : (hist.followUpDate || lastHistoryItem?.date || inquiry.followUpDate);
                                        const details = isVisitorFollowUp ? hist.remark : (lastHistoryItem?.remarks || inquiry.followUpDetails);
                                        const followUpBy = isVisitorFollowUp ? hist.followUpBy : (hist.followUpBy || lastHistoryItem?.followUpBy || inquiry.followUpBy);
                                        const followUpByLabel = typeof followUpBy === 'string' ? followUpBy : (followUpBy?.name || followUpBy?.username || '-');
                                        const callingDate = isVisitorFollowUp
                                            ? (hist.isDone ? (hist.callingDate || null) : null)
                                            : (hist.callingDate || lastHistoryItem?.callingDate || lastHistoryItem?.createdAt || lastHistoryItem?.date || inquiry.updatedAt);
                                        const callingBy = isVisitorFollowUp
                                            ? hist.followUpBy
                                            : (lastHistoryItem?.followUpBy || inquiry.followUpBy);
                                        const callingByLabel = typeof callingBy === 'string' ? callingBy : (callingBy?.name || callingBy?.username || followUpByLabel);
                                        const filledBy = isVisitorFollowUp
                                            ? getFilledBy(visitor)
                                            : (inquiry.createdBy?.name || inquiry.createdBy?.username || inquiry.filledBy || inquiry.followUpBy?.name || inquiry.followUpBy?.username || '-');
                                        const referenceBy = isVisitorFollowUp
                                            ? getReferenceBy(visitor)
                                            : getReferenceBy(inquiry);
                                        const rowRights = getFollowupRowRights(hist);
                                        const followupKey = getFollowupKey(hist);
                                        const rowSelectable = rowRights.edit && Boolean(followupKey);
                                        return (
                                        <tr key={hist._id} className={`${followupKey && selectedFollowupKeys.has(followupKey) ? 'bg-blue-50' : 'hover:bg-blue-50'} text-xs border-b border-gray-100 transition-colors`}>
                                            {canTransferRecords && (
                                                <td className="p-2 border text-center text-gray-400 font-medium print:hidden">
                                                    <input
                                                        type="checkbox"
                                                        disabled={!rowSelectable}
                                                        checked={Boolean(followupKey && selectedFollowupKeys.has(followupKey))}
                                                        onChange={() => toggleFollowupSelection(hist)}
                                                        className="h-4 w-4 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-2 border text-center text-gray-400 font-medium">{index + 1}</td>
                                            <td className="p-2 border font-semibold text-gray-700">{originalDate ? formatDate(originalDate) : '-'}</td>
                                            {user?.role === 'Super Admin' && <td className="p-2 border text-gray-600">{branchName || '-'}</td>}
                                            <td className="p-2 border text-gray-600 font-medium">{filledBy}</td>
                                            <td className="p-2 border text-gray-600 font-medium">{referenceBy}</td>
                                            <td className="p-2 border font-bold text-gray-800">{personName}</td>
                                            <td className="p-0 border align-top w-36">
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">H</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {(isVisitorFollowUp ? visitor.contactHome : inquiry.contactHome) || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex border-b border-gray-200 last:border-b-0">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">S</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start text-blue-600">
                                                        {(isVisitorFollowUp ? visitor.mobileNumber : inquiry.contactStudent) || '-'}
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    <div className="w-6 border-r border-gray-200 p-1 font-bold text-gray-500 bg-gray-50 flex items-center justify-center">P</div>
                                                    <div className="p-1 flex-1 text-gray-700 font-medium text-left px-2 flex items-center justify-start">
                                                        {(isVisitorFollowUp ? visitor.contactParent : inquiry.contactParent) || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                    status === 'Open' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    status === 'Recall' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                    status === 'Complete' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                    status === 'Close' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {status || 'Open'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-gray-700 font-medium">
                                                {followUpDate ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{formatDate(followUpDate)}</span>
                                                        <span className="text-[10px] text-blue-600">
                                                            {new Date(followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 border text-gray-600 truncate max-w-xs" title={details}>
                                                {details ? (details.length > 14 ? `${details.substring(0, 14)}...` : details) : '-'}
                                            </td>
                                            <td className="p-2 border text-gray-700">{followUpByLabel}</td>
                                            <td className="p-2 border text-center">
                                                {callingDate ? (
                                                    <div className="text-xs">
                                                        <div className="font-semibold text-gray-800">
                                                            {formatDate(callingDate)} {new Date(callingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-gray-500">
                                                            by {callingByLabel}
                                                        </div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="p-2 border text-center sticky right-0 bg-white print:hidden">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            if (!rowRights.edit) {
                                                                showPermissionDenied("You don't have authority to update follow-ups.");
                                                                return;
                                                            }
                                                            return isVisitorFollowUp
                                                                ? setFollowUpVisitor({ ...visitor, latestVisitorFollowUp: hist, followUpDetails: hist.remark })
                                                                : setShowFollowUpModal(inquiry);
                                                        }}
                                                        className="bg-purple-50 text-purple-600 border border-purple-200 p-1.5 rounded hover:bg-purple-100 transition"
                                                        title="Follow Up"
                                                    >
                                                        <CalendarClock size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!rowRights.view) {
                                                                showPermissionDenied("You don't have authority to view this record.");
                                                                return;
                                                            }
                                                            return isVisitorFollowUp ? handleView(visitor) : setViewInquiry(inquiry);
                                                        }}
                                                        className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-1.5 rounded hover:bg-indigo-100 transition"
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!rowRights.edit) {
                                                                showPermissionDenied("You don't have authority to edit this record.");
                                                                return;
                                                            }
                                                            return isVisitorFollowUp ? handleEdit(visitor) : setEditInquiryData(inquiry);
                                                        }}
                                                        className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => isVisitorFollowUp ? handleDeleteVisitorFollowUp(hist._id) : handleDeleteInquiry(inquiry._id, rowRights.delete)}
                                                        className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition"
                                                        title={isVisitorFollowUp ? 'Delete Follow-up' : 'Delete Inquiry'}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>

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
                        onSave={handleSaveVisitorFollowUp}
                    />
                )}
                
                {/* Inquiry Modals */}
                {viewInquiry && <InquiryViewModal inquiry={viewInquiry} onClose={() => setViewInquiry(null)} />}
                
                {editInquiryData && (
                    <InquiryForm
                        mode="Edit"
                        initialData={editInquiryData}
                        onClose={() => setEditInquiryData(null)}
                        onSave={handleSaveInquiry}
                    />
                )}
                
                {showFollowUpModal && (
                    <FollowUpForm
                        inquiry={showFollowUpModal}
                        onClose={() => setShowFollowUpModal(null)}
                        onSave={handleSaveFollowUp}
                    />
                )}
            </div>
        </div>
    );
};

export default TodaysVisitedReport;

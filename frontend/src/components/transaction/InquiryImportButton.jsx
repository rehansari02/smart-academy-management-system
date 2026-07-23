import React, { useRef, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { CheckSquare, Download, FileSpreadsheet, Square, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { showPermissionDenied } from '../../utils/permissionAlert';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const InquiryImportButton = ({ source, onImported, canImport = true, permissionMessage }) => {
    const inputRef = useRef(null);
    const { employees = [] } = useSelector((state) => state.employees || {});
    const [isUploading, setIsUploading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [parseError, setParseError] = useState('');
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [rowAssignments, setRowAssignments] = useState({});
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [history, setHistory] = useState([]);

    const resetDialog = () => {
        setSelectedFile(null);
        setPreviewRows([]);
        setPreviewColumns([]);
        setTotalRows(0);
        setParseError('');
        setSelectedRows(new Set());
        setRowAssignments({});
        setSelectedAssignee('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const closeDialog = () => {
        if (isUploading) return;
        resetDialog();
        setIsOpen(false);
    };

    const openDialog = () => {
        if (!canImport) {
            showPermissionDenied(permissionMessage || "You don't have authority to add inquiries.");
            return;
        }
        resetDialog();
        fetchHistory();
        setIsOpen(true);
    };

    const downloadTemplate = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const nextDateStr = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

        const sampleData = [
            {
                "First Name": "Rahul",
                "Last Name": "Sharma",
                "Father/Husband Name": "Rajesh Sharma",
                "Relation Type": "Father",
                "S - Student Contact": "9876543210",
                "P - Parent Contact": "9876543211",
                "H - Home Contact": "0261234567",
                "Gender": "Male",
                "Date of Birth": "2002-05-15",
                "Email": "rahul.sharma@example.com",
                "Education": "12th Pass",
                "Address": "102, Shanti Nagar, Bhestan",
                "City": "Surat",
                "State": "Gujarat",
                "Interested Course": "A.D.C.A",
                "Branch": "Bhestan",
                "Reference": "Social Media",
                "Inquiry Date": todayStr,
                "Status": "Open",
                "Follow-up Date": nextDateStr,
                "Follow-up Time": "11:00 AM",
                "Remark": "Interested in morning batch"
            },
            {
                "First Name": "Priya",
                "Last Name": "Patel",
                "Father/Husband Name": "Karan Patel",
                "Relation Type": "Husband",
                "S - Student Contact": "9123456780",
                "P - Parent Contact": "9123456789",
                "H - Home Contact": "",
                "Gender": "Female",
                "Date of Birth": "2000-08-20",
                "Email": "priya.patel@example.com",
                "Education": "Graduate",
                "Address": "B-45, Nilgiri Road, Godadara",
                "City": "Surat",
                "State": "Gujarat",
                "Interested Course": "Tally Prime",
                "Branch": "Godadara",
                "Reference": "Friend",
                "Inquiry Date": todayStr,
                "Status": "Open",
                "Follow-up Date": nextDateStr,
                "Follow-up Time": "02:30 PM",
                "Remark": "Wants weekend batch"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const columnWidths = Object.keys(sampleData[0]).map((key) => ({
            wch: Math.max(key.length + 3, 16)
        }));
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        const sheetName = `${source || 'Inquiry'} Template`.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        const filename = `${(source || 'inquiry').toLowerCase().replace(/\s+/g, '_')}_import_template.xlsx`;
        XLSX.writeFile(workbook, filename);
        toast.info(`Sample template "${filename}" downloaded`);
    };

    const fetchHistory = async () => {
        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_URL}/transaction/inquiry/import-history`,
                { params: { source }, withCredentials: true }
            );
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            setHistory([]);
        }
    };

    const parsePreview = async (file) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const columns = rows.length ? Object.keys(rows[0]) : [];

        setTotalRows(rows.length);
        setPreviewColumns(columns);
        setPreviewRows(rows);

        if (!rows.length) {
            setParseError('Selected file has no inquiry rows.');
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            resetDialog();
            setParseError('Only .xlsx, .xls, or .csv files are allowed.');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            resetDialog();
            setParseError(`File size must be 10 MB or less. Selected file is ${formatFileSize(file.size)}.`);
            return;
        }

        setSelectedFile(file);
        setParseError('');
        try {
            await parsePreview(file);
        } catch (error) {
            setPreviewRows([]);
            setPreviewColumns([]);
            setTotalRows(0);
            setParseError('Could not read this file. Please upload a valid Excel or CSV file.');
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setParseError('Please choose an Excel or CSV file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('source', source);
        formData.append('assignmentsByRow', JSON.stringify(rowAssignments));

        try {
            setIsUploading(true);
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/transaction/inquiry/import`,
                formData,
                { withCredentials: true }
            );

            toast.success(data.message || 'Inquiries imported successfully');
            if (data.errors?.length) {
                Swal.fire({
                    title: 'Import completed with skipped rows',
                    html: `<div class="text-left text-xs">${data.errors.map(e => `<div>${e}</div>`).join('')}</div>`,
                    icon: 'warning',
                    confirmButtonColor: '#2563eb'
                });
            }
            onImported?.();
            fetchHistory();
            resetDialog();
            setIsOpen(false);
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Inquiry import failed';
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    };

    const toggleRow = (rowNo) => {
        setSelectedRows((current) => {
            const next = new Set(current);
            if (next.has(rowNo)) next.delete(rowNo);
            else next.add(rowNo);
            return next;
        });
    };

    const toggleAllRows = () => {
        const rowNos = previewRows.map((_, index) => index + 2);
        setSelectedRows((current) => current.size === rowNos.length ? new Set() : new Set(rowNos));
    };

    const assignSelectedRows = () => {
        if (!selectedAssignee || selectedRows.size === 0) return;
        setRowAssignments((current) => {
            const next = { ...current };
            selectedRows.forEach((rowNo) => {
                next[rowNo] = selectedAssignee;
            });
            return next;
        });
        setSelectedRows(new Set());
    };

    const getEmployeeAssignmentId = (employee) => {
        if (!employee) return '';
        if (typeof employee.userAccount === 'object') {
            return employee.userAccount?._id || employee._id;
        }
        return employee.userAccount || employee._id;
    };

    const assignRow = (rowNo, assignmentId) => {
        setRowAssignments((current) => {
            const next = { ...current };
            if (assignmentId) next[rowNo] = assignmentId;
            else delete next[rowNo];
            return next;
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={openDialog}
                disabled={isUploading}
                className="bg-indigo-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-indigo-700 font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                title="Import inquiry Excel file"
            >
                <Upload size={18} /> {isUploading ? 'Importing...' : 'Import Inquiry'}
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 text-indigo-700 p-2 rounded">
                                    <FileSpreadsheet size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Import {source} Inquiries</h3>
                                    <p className="text-xs text-gray-500">Upload Excel/CSV file. Maximum file size: 10 MB.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDialog}
                                disabled={isUploading}
                                className="text-gray-500 hover:text-gray-800 disabled:opacity-50"
                                title="Close"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-4">
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <div className="border border-dashed border-indigo-300 rounded-lg bg-indigo-50/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <div className="font-semibold text-sm text-gray-800">
                                        {selectedFile ? selectedFile.name : 'No file selected'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {selectedFile
                                            ? `${formatFileSize(selectedFile.size)} selected | ${totalRows} rows found`
                                            : 'Allowed formats: .xlsx, .xls, .csv'}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="bg-emerald-600 text-white px-3.5 py-2 rounded text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                                        title="Download sample Excel template with all formatted inquiry columns"
                                    >
                                        <Download size={16} /> Download Template
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => inputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded text-sm font-bold hover:bg-indigo-100 disabled:opacity-60"
                                    >
                                        Choose File
                                    </button>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                                <span className="font-bold shrink-0 text-amber-700">💡 Template Tip:</span>
                                <div>
                                    Click <strong className="text-emerald-700">Download Template</strong> to get a pre-formatted Excel file with ready-to-fill sample columns (<i>First Name, Last Name, S - Student Contact, Interested Course, Branch, Reference, etc.</i>).
                                </div>
                            </div>

                            {parseError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                                    {parseError}
                                </div>
                            )}

                            {previewRows.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <span className="text-sm font-bold text-gray-700">Preview & Assignment</span>
                                            <div className="text-xs text-gray-500">Select rows, choose employee, then assign before import.</div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            Showing {totalRows} rows
                                        </span>
                                    </div>
                                    <div className="border-b bg-white p-3 flex flex-col gap-2 md:flex-row md:items-center">
                                        <select
                                            value={selectedAssignee}
                                            onChange={(e) => setSelectedAssignee(e.target.value)}
                                            className="border rounded px-3 py-2 text-sm min-w-[220px]"
                                        >
                                            <option value="">Select employee</option>
                                            {employees.map((employee) => (
                                                <option key={employee._id} value={getEmployeeAssignmentId(employee)}>{employee.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={assignSelectedRows}
                                            disabled={!selectedAssignee || selectedRows.size === 0}
                                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                                        >
                                            Assign Selected ({selectedRows.size})
                                        </button>
                                    </div>
                                    <div className="overflow-auto max-h-[360px]">
                                        <table className="w-full min-w-[900px] text-xs border-collapse">
                                            <thead className="bg-indigo-600 text-white sticky top-0">
                                                <tr>
                                                    <th className="p-2 border text-center w-10">
                                                        <button type="button" onClick={toggleAllRows} title="Select all rows">
                                                            {selectedRows.size === previewRows.length && previewRows.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                                                        </button>
                                                    </th>
                                                    <th className="p-2 border text-left w-12">Sr</th>
                                                    <th className="p-2 border text-left whitespace-nowrap">Assigned To</th>
                                                    {previewColumns.map((column) => (
                                                        <th key={column} className="p-2 border text-left whitespace-nowrap">
                                                            {column}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewRows.map((row, index) => (
                                                    <tr key={index} className="odd:bg-white even:bg-gray-50">
                                                        <td className="p-2 border text-center">
                                                            <button type="button" onClick={() => toggleRow(index + 2)} title="Select row">
                                                                {selectedRows.has(index + 2) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} className="text-gray-400" />}
                                                            </button>
                                                        </td>
                                                        <td className="p-2 border text-gray-500">{index + 1}</td>
                                                        <td className="p-2 border text-gray-700 font-semibold whitespace-nowrap">
                                                            <select
                                                                value={rowAssignments[index + 2] || ''}
                                                                onChange={(event) => assignRow(index + 2, event.target.value)}
                                                                className="border rounded px-2 py-1.5 text-xs min-w-[170px] bg-white"
                                                                title={`Assign row ${index + 1}`}
                                                            >
                                                                <option value="">Not assigned</option>
                                                                {employees.map((employee) => (
                                                                    <option key={employee._id} value={getEmployeeAssignmentId(employee)}>
                                                                        {employee.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        {previewColumns.map((column) => (
                                                            <td key={column} className="p-2 border text-gray-700 whitespace-nowrap max-w-[220px] truncate" title={String(row[column] || '')}>
                                                                {String(row[column] || '-')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {history.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b text-sm font-bold text-gray-700">Recent Import History</div>
                                    <div className="divide-y max-h-48 overflow-auto">
                                        {history.slice(0, 5).map((item) => (
                                            <div key={item._id} className="p-3 text-xs text-gray-700">
                                                <div className="font-bold">{item.fileName || 'Import'} | {new Date(item.createdAt).toLocaleString()}</div>
                                                <div>{item.importedCount} imported, {item.skippedCount} skipped</div>
                                                <div className="mt-1 text-gray-500">
                                                    {(item.assignmentSummary || []).map((assign) => `${assign.assignedToName || assign.assignedTo?.name || 'Unassigned'}: ${assign.count}`).join(' | ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t px-5 py-4 flex justify-end gap-3 bg-gray-50">
                            <button
                                type="button"
                                onClick={closeDialog}
                                disabled={isUploading}
                                className="px-4 py-2 rounded border text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={isUploading || !selectedFile || !!parseError}
                                className="px-5 py-2 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Upload size={17} /> {isUploading ? 'Importing...' : 'Import Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InquiryImportButton;

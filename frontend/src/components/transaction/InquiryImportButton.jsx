import React, { useRef, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { showPermissionDenied } from '../../utils/permissionAlert';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const PREVIEW_LIMIT = 10;

const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const InquiryImportButton = ({ source, onImported, canImport = true, permissionMessage }) => {
    const inputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [parseError, setParseError] = useState('');

    const resetDialog = () => {
        setSelectedFile(null);
        setPreviewRows([]);
        setPreviewColumns([]);
        setTotalRows(0);
        setParseError('');
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
        setIsOpen(true);
    };

    const parsePreview = async (file) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const columns = rows.length ? Object.keys(rows[0]) : [];

        setTotalRows(rows.length);
        setPreviewColumns(columns);
        setPreviewRows(rows.slice(0, PREVIEW_LIMIT));

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
            resetDialog();
            setIsOpen(false);
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Inquiry import failed';
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
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
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    disabled={isUploading}
                                    className="bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded text-sm font-bold hover:bg-indigo-100 disabled:opacity-60"
                                >
                                    Choose File
                                </button>
                            </div>

                            {parseError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                                    {parseError}
                                </div>
                            )}

                            {previewRows.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-700">Preview</span>
                                        <span className="text-xs text-gray-500">
                                            Showing first {Math.min(PREVIEW_LIMIT, totalRows)} of {totalRows} rows
                                        </span>
                                    </div>
                                    <div className="overflow-auto max-h-[360px]">
                                        <table className="w-full min-w-[900px] text-xs border-collapse">
                                            <thead className="bg-indigo-600 text-white sticky top-0">
                                                <tr>
                                                    <th className="p-2 border text-left w-12">#</th>
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
                                                        <td className="p-2 border text-gray-500">{index + 1}</td>
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

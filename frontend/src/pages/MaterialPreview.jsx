import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ExternalLink, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { renderAsync as renderDocxAsync } from 'docx-preview';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MaterialPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    const [material, setMaterial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [docxLoading, setDocxLoading] = useState(false);
    const [docxError, setDocxError] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [privacyCovered, setPrivacyCovered] = useState(false);
    const privacyTimerRef = useRef(null);
    const pdfContainerRef = useRef(null);
    const docxContainerRef = useRef(null);
    const docxStyleRef = useRef(null);

    useEffect(() => {
        const coverPreview = () => {
            setPrivacyCovered(true);
            if (privacyTimerRef.current) {
                window.clearTimeout(privacyTimerRef.current);
            }
            privacyTimerRef.current = window.setTimeout(() => {
                setPrivacyCovered(false);
                privacyTimerRef.current = null;
            }, 3500);
        };

        const stopDefault = (event) => {
            event.preventDefault();
            event.stopPropagation();
            return false;
        };

        const handleKeyDown = (event) => {
            const key = String(event.key || '').toLowerCase();
            const blocked =
                key === 'printscreen' ||
                key === 'f12' ||
                ((event.metaKey || event.getModifierState?.('OS')) && event.shiftKey && key === 's') ||
                ((event.ctrlKey || event.metaKey) && ['p', 's', 'u', 'c'].includes(key)) ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(key));

            if (!blocked) return;

            stopDefault(event);
            coverPreview();
            if (key === 'printscreen' && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText('').catch(() => {});
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('contextmenu', stopDefault, true);
        window.addEventListener('copy', stopDefault, true);
        window.addEventListener('cut', stopDefault, true);
        window.addEventListener('dragstart', stopDefault, true);
        window.addEventListener('selectstart', stopDefault, true);
        window.addEventListener('blur', coverPreview, true);

        return () => {
            if (privacyTimerRef.current) {
                window.clearTimeout(privacyTimerRef.current);
            }
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('contextmenu', stopDefault, true);
            window.removeEventListener('copy', stopDefault, true);
            window.removeEventListener('cut', stopDefault, true);
            window.removeEventListener('dragstart', stopDefault, true);
            window.removeEventListener('selectstart', stopDefault, true);
            window.removeEventListener('blur', coverPreview, true);
        };
    }, []);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`${apiBase}/materials/preview-meta/${id}`);
                if (!active) return;
                setMaterial(data);
                setError('');
            } catch (err) {
                if (!active) return;
                setError(err.response?.data?.message || 'Preview not available');
                setMaterial(null);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [apiBase, id]);

    const documentUrl = material?.documentUrl || '';
    const rawUrl = `${apiBase}/materials/raw/${id}`;
    const sourceUrl = rawUrl;
    const extension = String(material?.extension || '').toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(extension);
    const isPdf = extension === '.pdf';
    const isDocx = extension === '.docx';
    const isOffice = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(extension);
    const hasDocumentSource = material?.hasDocumentSource !== false;
    const allowOpenSource = material?.showDownloadButton !== false;

    const previewTitle = material?.title || 'Material Preview';

    const openTarget = useMemo(() => {
        return rawUrl;
    }, [rawUrl]);

    useEffect(() => {
        let cancelled = false;

        const renderDocx = async () => {
            const container = docxContainerRef.current;
            const styleContainer = docxStyleRef.current;
            if (!isDocx || !container) {
                setDocxError('');
                setDocxLoading(false);
                return;
            }

            try {
                setDocxLoading(true);
                setDocxError('');
                container.innerHTML = '';
                if (styleContainer) styleContainer.innerHTML = '';
                const response = await axios.get(sourceUrl, {
                    responseType: 'arraybuffer',
                    withCredentials: false
                });
                if (cancelled) return;

                await renderDocxAsync(response.data, container, styleContainer || container, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    ignoreFonts: false,
                    ignoreLastRenderedPageBreak: false,
                    experimental: true,
                    useBase64URL: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true
                });
                if (cancelled) return;
            } catch (err) {
                if (cancelled) return;
                setDocxError(err?.message || 'Unable to render DOCX');
            } finally {
                if (!cancelled) setDocxLoading(false);
            }
        };

        renderDocx();
        return () => {
            cancelled = true;
        };
    }, [isDocx, sourceUrl]);

    useEffect(() => {
        let cancelled = false;
        let pdfDocument = null;

        const renderPdf = async () => {
            const container = pdfContainerRef.current;
            if (!isPdf || !container) {
                setPdfError('');
                setPdfLoading(false);
                return;
            }

            try {
                setPdfLoading(true);
                setPdfError('');
                container.innerHTML = '';

                const response = await axios.get(sourceUrl, {
                    responseType: 'arraybuffer',
                    withCredentials: false
                });
                if (cancelled) return;

                pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(response.data) }).promise;

                for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                    if (cancelled) return;

                    const page = await pdfDocument.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const containerWidth = Math.max((container.clientWidth || 900) - 32, 320);
                    const scale = Math.min(containerWidth / baseViewport.width, 1.6);
                    const viewport = page.getViewport({ scale });
                    const outputScale = window.devicePixelRatio || 1;

                    const wrapper = document.createElement('div');
                    wrapper.className = 'mx-auto mb-4 w-fit overflow-hidden rounded bg-white shadow-sm';

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;

                    wrapper.appendChild(canvas);
                    container.appendChild(wrapper);

                    const context = canvas.getContext('2d');
                    await page.render({
                        canvasContext: context,
                        viewport,
                        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
                    }).promise;
                }
            } catch (err) {
                if (cancelled) return;
                setPdfError(err?.message || 'Unable to render PDF');
            } finally {
                if (!cancelled) setPdfLoading(false);
            }
        };

        renderPdf();
        return () => {
            cancelled = true;
            if (pdfDocument) {
                pdfDocument.destroy();
            }
        };
    }, [isPdf, sourceUrl]);

    return (
        <div className="min-h-screen select-none bg-white text-slate-900">
            <style>
                {`
                    @media print {
                        body * { visibility: hidden !important; }
                        .material-print-block, .material-print-block * { visibility: visible !important; }
                        .material-print-block {
                            position: fixed !important;
                            inset: 0 !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            background: #ffffff !important;
                            color: #111827 !important;
                            font: 700 18px Arial, sans-serif !important;
                        }
                    }
                `}
            </style>
            <div className="material-print-block hidden">Printing and screenshots are blocked for this material.</div>
            {privacyCovered && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white text-center text-lg font-semibold text-gray-800">
                    Screenshot blocked for this material.
                </div>
            )}
            <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{previewTitle}</div>
                            <div className="truncate text-xs text-gray-500">
                                {material?.subject?.name ? `${material.subject.name} - ` : ''}
                                {extension || 'file'}
                            </div>
                        </div>
                    </div>

                    {documentUrl && allowOpenSource && (
                        <a
                            href={openTarget}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                            <ExternalLink size={16} />
                            Open in new tab
                        </a>
                    )}
                </div>
            </div>

            <div className="h-[calc(100vh-57px)] w-full bg-gray-100 p-3">
                <div className="h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-gray-500">
                            <div className="text-center">
                                <Loader2 className="mx-auto mb-3 animate-spin text-primary" size={28} />
                                Loading preview...
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex h-full items-center justify-center p-8 text-center text-gray-600">
                            <div>
                                <AlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
                                <p className="mb-3 text-lg font-semibold">{error}</p>
                                {documentUrl && allowOpenSource && (
                                    <a
                                        href={openTarget}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                                    >
                                        <ExternalLink size={16} />
                                        Open source file
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : !hasDocumentSource ? (
                        <div className="flex h-full items-center justify-center p-8 text-center text-gray-600">
                            <div className="max-w-xl">
                                <AlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
                                <p className="mb-3 text-lg font-semibold">This material has no valid file attached.</p>
                                <p className="text-sm text-gray-500">
                                    The record was saved with an invalid document reference, so the browser has nothing to preview.
                                    Re-upload the PDF or DOCX from Material master.
                                </p>
                            </div>
                        </div>
                    ) : isImage ? (
                        <div className="relative flex h-full items-center justify-center bg-gray-50 p-4">
                            <img
                                src={sourceUrl}
                                alt={previewTitle}
                                draggable="false"
                                className="max-h-full max-w-full object-contain"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-35deg,transparent_0,transparent_120px,rgba(15,23,42,0.06)_120px,rgba(15,23,42,0.06)_122px)]" />
                        </div>
                    ) : isPdf ? (
                        <div className="relative h-full overflow-auto bg-gray-100 p-4">
                            {pdfLoading && (
                                <div className="flex items-center justify-center py-10 text-gray-500">
                                    <Loader2 className="mr-2 animate-spin text-primary" size={20} />
                                    Rendering PDF...
                                </div>
                            )}
                            {pdfError && (
                                <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {pdfError}
                                </div>
                            )}
                            <div ref={pdfContainerRef} className="mx-auto max-w-[1100px]" />
                            <div className="pointer-events-none fixed inset-0 z-10 bg-[repeating-linear-gradient(-35deg,transparent_0,transparent_120px,rgba(15,23,42,0.06)_120px,rgba(15,23,42,0.06)_122px)]" />
                        </div>
                    ) : isDocx ? (
                        <div className="relative h-full overflow-auto bg-gray-50 p-4">
                            {docxLoading && (
                                <div className="flex items-center justify-center py-10 text-gray-500">
                                    <Loader2 className="mr-2 animate-spin text-primary" size={20} />
                                    Rendering document...
                                </div>
                            )}
                            {docxError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {docxError}
                                </div>
                            )}
                            <div ref={docxStyleRef} className="hidden" />
                            <div
                                ref={docxContainerRef}
                                className="docx-render mx-auto w-fit min-w-full max-w-[1100px] bg-white shadow-sm"
                            />
                            <div className="pointer-events-none fixed inset-0 z-10 bg-[repeating-linear-gradient(-35deg,transparent_0,transparent_120px,rgba(15,23,42,0.06)_120px,rgba(15,23,42,0.06)_122px)]" />
                        </div>
                    ) : isOffice ? (
                        <div className="flex h-full items-center justify-center p-8 text-center text-gray-600">
                            <div>
                                <FileText className="mx-auto mb-3 text-primary" size={28} />
                                <p className="mb-3 text-lg font-semibold">
                                    This file type is not supported for inline preview.
                                </p>
                                {documentUrl && allowOpenSource && (
                                    <a
                                        href={openTarget}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                                    >
                                        <ExternalLink size={16} />
                                        Open source file
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                        <iframe
                            title="Material Preview"
                            src={openTarget}
                            className="h-full w-full bg-white"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MaterialPreview;

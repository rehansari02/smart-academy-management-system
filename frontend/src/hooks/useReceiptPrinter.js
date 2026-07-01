import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export const receiptPrintPageStyle = `
  @media screen {
    .receipt-print-host {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 210mm;
      min-height: 297mm;
      overflow: hidden;
      pointer-events: none;
      background: #fff;
    }
  }

  @media print {
    @page {
      margin: 0;
      size: A4 portrait;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.receipt-printing .receipt-page-shell {
      visibility: visible !important;
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: none !important;
      background: #fff !important;
    }

    body.receipt-printing .receipt-page-shell > :not(.receipt-print-host):not(style) {
      display: none !important;
    }

    body.receipt-printing .receipt-print-host {
      visibility: visible !important;
      display: block !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 210mm !important;
      min-height: 297mm !important;
      overflow: visible !important;
      pointer-events: auto !important;
      background: #fff !important;
    }

    body.receipt-printing .print-only-container {
      visibility: visible !important;
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
    }

    body.receipt-printing * {
      visibility: hidden !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body.receipt-printing .receipt-print-host,
    body.receipt-printing .receipt-print-host * {
      visibility: visible !important;
    }
  }
`;

export const useReceiptPrinter = () => {
  const [printingReceipt, setPrintingReceipt] = useState(null);
  const cleanupTimerRef = useRef(null);
  const printTimerRef = useRef(null);

  const cleanupPrint = useCallback(() => {
    document.body.classList.remove('receipt-printing');
    setPrintingReceipt(null);

    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    if (printTimerRef.current) {
      window.clearTimeout(printTimerRef.current);
      printTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('afterprint', cleanupPrint);

    return () => {
      window.removeEventListener('afterprint', cleanupPrint);
      cleanupPrint();
    };
  }, [cleanupPrint]);

  const triggerPrintReceipt = useCallback((receipt) => {
    if (!receipt) return;

    flushSync(() => {
      setPrintingReceipt(receipt);
    });
    document.body.classList.add('receipt-printing');

    if (printTimerRef.current) {
      window.clearTimeout(printTimerRef.current);
    }

    printTimerRef.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });

      if (cleanupTimerRef.current) {
        window.clearTimeout(cleanupTimerRef.current);
      }

      cleanupTimerRef.current = window.setTimeout(cleanupPrint, 12000);
    }, 300);
  }, [cleanupPrint]);

  return { printingReceipt, triggerPrintReceipt };
};

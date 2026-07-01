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
  }
`;

export const useReceiptPrinter = () => {
  const [printingReceipt, setPrintingReceipt] = useState(null);
  const printRef = useRef(null);
  const printFrameRef = useRef(null);
  const cleanupTimerRef = useRef(null);
  const printTimerRef = useRef(null);

  const cleanupPrint = useCallback(() => {
    document.body.classList.remove('receipt-printing');
    setPrintingReceipt(null);

    if (printFrameRef.current) {
      try {
        printFrameRef.current.remove();
      } catch {
        // Ignore window close failures.
      }
    }
    printFrameRef.current = null;

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

  const openReceiptPrintFrame = useCallback(() => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);
    printFrameRef.current = iframe;
    return iframe;
  }, []);

  const triggerPrintReceipt = useCallback((receipt) => {
    if (!receipt) return;

    const printFrame = openReceiptPrintFrame();
    if (!printFrame) {
      return;
    }

    flushSync(() => {
      setPrintingReceipt(receipt);
    });
    document.body.classList.add('receipt-printing');

    if (printTimerRef.current) {
      window.clearTimeout(printTimerRef.current);
    }

    printTimerRef.current = window.setTimeout(() => {
      const receiptMarkup = printRef.current?.outerHTML;
      if (!receiptMarkup) {
        cleanupPrint();
        return;
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      const frameWin = printFrame.contentWindow;
      if (!frameDoc || !frameWin) {
        cleanupPrint();
        return;
      }

      frameDoc.open();
      frameDoc.write(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Receipt</title>
            <base href="${window.location.origin}/" />
            <style>${receiptPrintPageStyle}</style>
            <style>
              .receipt-print-host {
                position: static !important;
                left: auto !important;
                top: auto !important;
                width: 210mm !important;
                min-height: 297mm !important;
                overflow: visible !important;
                pointer-events: auto !important;
                background: #fff !important;
              }
              .print-only-container {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 !important;
              }
            </style>
          </head>
          <body style="margin:0;background:#fff;">
            ${receiptMarkup}
          </body>
        </html>`);
      frameDoc.close();

      window.requestAnimationFrame(() => {
        try {
          frameWin.focus();
          frameWin.print();
        } catch {
          cleanupPrint();
        }
      });

      if (cleanupTimerRef.current) {
        window.clearTimeout(cleanupTimerRef.current);
      }

      cleanupTimerRef.current = window.setTimeout(cleanupPrint, 12000);
    }, 300);
  }, [cleanupPrint, openReceiptPrintFrame, printRef]);

  return { printingReceipt, triggerPrintReceipt, printRef };
};

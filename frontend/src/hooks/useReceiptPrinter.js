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

const waitForImages = (container, maxWaitMs = 2500) => {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  const promises = images.map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === 'function') {
        return img.decode().catch(() => {});
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          if (typeof img.decode === 'function') {
            img.decode().catch(() => {}).finally(resolve);
          } else {
            resolve();
          }
        }
      };

      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      setTimeout(finish, maxWaitMs);
    });
  });

  return Promise.race([
    Promise.all(promises),
    new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);
};

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
    if (printFrameRef.current) {
      try {
        printFrameRef.current.remove();
      } catch {}
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1000px';
    iframe.style.height = '1400px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
    printFrameRef.current = iframe;
    return iframe;
  }, []);

  const triggerPrintReceipt = useCallback(async (receipt) => {
    if (!receipt) return;

    if (printTimerRef.current) {
      window.clearTimeout(printTimerRef.current);
      printTimerRef.current = null;
    }

    const printFrame = openReceiptPrintFrame();
    if (!printFrame) {
      return;
    }

    flushSync(() => {
      setPrintingReceipt(receipt);
    });
    document.body.classList.add('receipt-printing');

    // 1. Wait for images in the host component (DOM) to load and decode
    if (printRef.current) {
      await waitForImages(printRef.current, 2500);
    }

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

    // 2. Wait for images inside the iframe to load and decode
    await waitForImages(frameDoc.body, 2500);

    // 3. Wait for fonts if available
    try {
      if (frameDoc.fonts && frameDoc.fonts.ready) {
        await frameDoc.fonts.ready;
      }
    } catch {
      // Ignore font errors
    }

    // 4. Short breathing buffer for browser compositor rasterization before print modal
    await new Promise((resolve) => setTimeout(resolve, 80));

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

    cleanupTimerRef.current = window.setTimeout(cleanupPrint, 15000);
  }, [cleanupPrint, openReceiptPrintFrame, printRef]);

  return { printingReceipt, triggerPrintReceipt, printRef };
};

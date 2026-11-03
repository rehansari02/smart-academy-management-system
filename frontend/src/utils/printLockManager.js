const STORAGE_KEY = 'smart_sys_print_disabled';
const STYLE_ID = 'smart-media-print-suppress';

let isLockedState = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
let isInitialized = false;
let originalWindowPrint = null;

// Apply or remove @media print blocker style
const applyMediaPrintBlocker = (locked) => {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById(STYLE_ID);
    if (locked) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            styleEl.innerHTML = `
                @media print {
                    html, body, #root, .receipt-print-host, iframe {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        height: 0 !important;
                        width: 0 !important;
                    }
                }
            `;
            document.head.appendChild(styleEl);
        }
    } else {
        if (styleEl) {
            styleEl.remove();
        }
    }
};

// Check if a target element represents a print action
const isPrintElement = (target) => {
    if (!target) return false;

    // Do not block controls on the smart control page itself
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/smart')) {
        if (target.getAttribute('data-test-print') === 'true' || target.closest('[data-test-print="true"]')) {
            return true;
        }
        return false;
    }

    const btn = target.closest('button, a, [role="button"], input[type="button"], input[type="submit"]');
    if (!btn) return false;

    const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const className = String(btn.className || '').toLowerCase();
    const dataAction = (btn.getAttribute('data-action') || '').toLowerCase();

    // Check for printer icon inside
    const hasPrinterIcon = !!btn.querySelector('svg.lucide-printer, [data-icon="printer"]');

    if (
        hasPrinterIcon ||
        text.includes('print') ||
        title.includes('print') ||
        aria.includes('print') ||
        dataAction.includes('print') ||
        (className.includes('print') && !className.includes('fingerprint') && !className.includes('blueprint'))
    ) {
        return true;
    }

    return false;
};

// Global click capture interceptor - completely silent, no toast
const handleCaptureClick = (e) => {
    if (!isLockedState) return;

    if (isPrintElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
};

// Global keyboard shortcut interceptor (Ctrl+P / Cmd+P) - completely silent, no toast
const handleCaptureKeyDown = (e) => {
    if (!isLockedState) return;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
};

// Update active state in-memory and in localStorage (syncs across tabs)
export const updatePrintLockState = (locked) => {
    isLockedState = Boolean(locked);
    try {
        if (isLockedState) {
            localStorage.setItem(STORAGE_KEY, '1');
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {}

    applyMediaPrintBlocker(isLockedState);

    // Notify listeners in same window
    window.dispatchEvent(new CustomEvent('smart-print-lock-change', { detail: { isLocked: isLockedState } }));
};

// Query whether print is currently locked
export const isPrintLocked = () => {
    if (typeof window !== 'undefined') {
        isLockedState = localStorage.getItem(STORAGE_KEY) === '1';
    }
    return isLockedState;
};

// Toggle or set state directly without any API or network calls
export const setPrintLock = (locked) => {
    updatePrintLockState(locked);
    return isLockedState;
};

// Initialize listeners once on app startup (pure internal, zero network requests)
export const initPrintLockManager = () => {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // Check localStorage initial value
    isLockedState = localStorage.getItem(STORAGE_KEY) === '1';
    applyMediaPrintBlocker(isLockedState);

    // Override window.print silently - no toast
    if (!originalWindowPrint) {
        originalWindowPrint = window.print;
        window.print = function () {
            if (isLockedState) {
                return;
            }
            return originalWindowPrint.apply(this, arguments);
        };
    }

    // Attach capture listeners
    window.addEventListener('click', handleCaptureClick, true);
    window.addEventListener('keydown', handleCaptureKeyDown, true);

    // Sync across browser tabs automatically via storage event
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            isLockedState = e.newValue === '1';
            applyMediaPrintBlocker(isLockedState);
            window.dispatchEvent(new CustomEvent('smart-print-lock-change', { detail: { isLocked: isLockedState } }));
        }
    });

    return () => {
        window.removeEventListener('click', handleCaptureClick, true);
        window.removeEventListener('keydown', handleCaptureKeyDown, true);
    };
};

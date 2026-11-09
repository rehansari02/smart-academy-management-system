import axios from 'axios';
import { updatePrintLockState } from './printLockManager';

const API_BASE = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/system-security` 
    : '/api/system-security';

const STORAGE_KEY = 'smart_system_security_cache';

let currentState = {
    loginBlocked: false,
    printBlocked: false,
    maintenance403: false,
    updatedAt: null
};

// Try loading cached state from localStorage for fast initial render
try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        currentState = { ...currentState, ...JSON.parse(cached) };
    }
} catch {}

let isInitialized = false;
let pollTimer = null;
let interceptorsAttached = false;

// Apply local side effects based on security state
const applyStateSideEffects = (state) => {
    // 1. Handle Print Lock
    if (typeof state.printBlocked === 'boolean') {
        updatePrintLockState(state.printBlocked);
    }

    // 2. Handle Login Block / Force Logout
    if (state.loginBlocked) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            console.warn('[SystemSecurity] Force logout triggered by administrator lock');
            localStorage.removeItem('user');
            
            // Dispatch force logout event
            window.dispatchEvent(new CustomEvent('system-logout-forced'));

            // Call logout endpoint in background
            const logoutUrl = import.meta.env.VITE_API_URL 
                ? `${import.meta.env.VITE_API_URL}/auth/logout` 
                : '/api/auth/logout';
            axios.post(logoutUrl).catch(() => {});

            // If on a private route, redirect to login
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/admin/secure') && !currentPath.startsWith('/login') && currentPath !== '/') {
                window.location.href = '/login';
            }
        }
    }

    // Save cache
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}

    // Dispatch global event for React components
    window.dispatchEvent(new CustomEvent('system-security-change', { detail: state }));
};

// Fetch current status from backend
export const fetchSystemSecurityStatus = async () => {
    try {
        const res = await axios.get(`${API_BASE}/status`, { 
            withCredentials: true,
            timeout: 5000 
        });
        if (res.data && res.data.success && res.data.data) {
            const data = res.data.data;
            currentState = {
                loginBlocked: Boolean(data.loginBlocked),
                printBlocked: Boolean(data.printBlocked),
                maintenance403: Boolean(data.maintenance403),
                updatedAt: data.updatedAt
            };
            applyStateSideEffects(currentState);
            return currentState;
        }
    } catch (err) {
        // If 403 response received, maintenance 403 might be on
        if (err.response && err.response.status === 403) {
            currentState.maintenance403 = true;
            applyStateSideEffects(currentState);
        }
    }
    return currentState;
};

// Update security status on backend (called by /admin/secure/ppp)
export const updateSystemSecurityStatus = async (updates) => {
    try {
        const res = await axios.post(`${API_BASE}/update`, updates, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.data && res.data.success && res.data.data) {
            const data = res.data.data;
            currentState = {
                loginBlocked: Boolean(data.loginBlocked),
                printBlocked: Boolean(data.printBlocked),
                maintenance403: Boolean(data.maintenance403),
                updatedAt: data.updatedAt
            };
            applyStateSideEffects(currentState);
            return currentState;
        }
    } catch (err) {
        console.error('[SystemSecurity] Failed to update security settings:', err);
        throw err;
    }
};

// Synchronous getter
export const getSystemSecurityState = () => currentState;

// Initialize manager & background polling
export const initSystemSecurityManager = () => {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // Attach Axios interceptor once
    if (!interceptorsAttached) {
        interceptorsAttached = true;

        // Request interceptor: When loginBlocked is active, reject login requests with genuine Network Error
        axios.interceptors.request.use((config) => {
            if (currentState.loginBlocked && config.url && config.url.includes('/auth/login')) {
                const networkError = new Error('Network Error');
                networkError.name = 'AxiosError';
                networkError.code = 'ERR_NETWORK';
                networkError.isAxiosError = true;
                return Promise.reject(networkError);
            }
            return config;
        }, (error) => Promise.reject(error));

        // Response interceptor: Detect 403 lockdown
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 403) {
                    if (window.location.pathname.startsWith('/admin/secure')) {
                        // Do not block secure admin control route
                        return Promise.reject(error);
                    }
                    if (!currentState.maintenance403) {
                        currentState.maintenance403 = true;
                        applyStateSideEffects(currentState);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // Initial fetch
    fetchSystemSecurityStatus();

    // Fast 3-second multi-device sync poll
    if (!pollTimer) {
        pollTimer = setInterval(fetchSystemSecurityStatus, 3000);
    }

    // Window events for immediate multi-tab / device sync
    window.addEventListener('focus', fetchSystemSecurityStatus);
    window.addEventListener('online', fetchSystemSecurityStatus);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) fetchSystemSecurityStatus();
    });

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
            try {
                currentState = JSON.parse(e.newValue);
                applyStateSideEffects(currentState);
            } catch {}
        }
    });
};

import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldAlert,
    ShieldCheck,
    Lock,
    Unlock,
    Printer,
    LogOut,
    AlertOctagon,
    RefreshCw,
    Radio,
    Database,
    Zap,
    WifiOff,
    CheckCircle2
} from 'lucide-react';
import {
    getSystemSecurityState,
    fetchSystemSecurityStatus,
    updateSystemSecurityStatus
} from '../../../utils/systemSecurityManager';

const SecureAdminControl = () => {
    const [securityState, setSecurityState] = useState(getSystemSecurityState());
    const [loadingToggle, setLoadingToggle] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date().toLocaleTimeString());
    const [actionMessage, setActionMessage] = useState(null);

    // Sync state from manager and global events
    const syncState = useCallback(async () => {
        const state = await fetchSystemSecurityStatus();
        setSecurityState(state);
        setLastUpdatedTime(new Date().toLocaleTimeString());
    }, []);

    useEffect(() => {
        syncState();

        const handleSecurityChange = (e) => {
            if (e.detail) {
                setSecurityState(e.detail);
                setLastUpdatedTime(new Date().toLocaleTimeString());
            }
        };

        window.addEventListener('system-security-change', handleSecurityChange);
        return () => window.removeEventListener('system-security-change', handleSecurityChange);
    }, [syncState]);

    const handleToggle = async (key) => {
        if (loadingToggle) return;
        setLoadingToggle(key);
        setActionMessage(null);

        try {
            const nextVal = !securityState[key];
            const updated = await updateSystemSecurityStatus({ [key]: nextVal });
            setSecurityState(updated);
            setLastUpdatedTime(new Date().toLocaleTimeString());
            setActionMessage({
                type: 'success',
                text: `Successfully synced ${key} to MongoDB. Active across ALL devices!`
            });
        } catch (err) {
            console.error('Toggle error:', err);
            setActionMessage({
                type: 'error',
                text: 'Failed to update database. Please check backend connection.'
            });
        } finally {
            setLoadingToggle(null);
        }
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await syncState();
        setTimeout(() => setRefreshing(false), 400);
    };

    const anyLockActive = securityState.loginBlocked || securityState.printBlocked || securityState.maintenance403;

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-start py-8 px-4 sm:px-6 relative select-none">
            
            {/* Ambient Cyber Light Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${
                    securityState.maintenance403 ? 'bg-red-600/15' : 'bg-cyan-600/10'
                }`} />
                <div className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${
                    securityState.loginBlocked ? 'bg-amber-600/15' : 'bg-indigo-600/10'
                }`} />
            </div>

            <div className="w-full max-w-4xl space-y-6">

                {/* Top Header Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors duration-300 ${
                            anyLockActive 
                                ? 'bg-linear-to-br from-red-600 to-rose-700 shadow-red-500/20' 
                                : 'bg-linear-to-br from-indigo-600 to-cyan-600 shadow-indigo-500/20'
                        }`}>
                            <ShieldAlert size={26} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-white tracking-tight">System Master Security Gateway</h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    /ppp
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>Multi-Device Database Control</span>
                                <span>&bull;</span>
                                <span className="text-emerald-400 font-mono flex items-center gap-1">
                                    <Database size={11} /> MongoDB Connected
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Force Sync with Server"
                        >
                            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                            Sync Status
                        </button>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
                            <Radio size={12} className="text-emerald-400 animate-pulse" />
                            <span>Synced: {lastUpdatedTime}</span>
                        </div>
                    </div>
                </div>

                {/* Feedback Banner */}
                {actionMessage && (
                    <div className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border animate-in fade-in duration-200 ${
                        actionMessage.type === 'success' 
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
                            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}>
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>{actionMessage.text}</span>
                    </div>
                )}

                {/* Global Status Overview Bar */}
                <div className={`rounded-xl border p-4 text-xs font-medium flex flex-wrap items-center justify-between gap-3 transition-colors ${
                    anyLockActive 
                        ? 'bg-red-950/40 border-red-500/30 text-red-200' 
                        : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${anyLockActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                        <span className="font-bold">
                            {anyLockActive ? 'SECURITY RESTRICTIONS ACTIVATED' : 'ALL SYSTEMS OPERATIONAL (NORMAL)'}
                        </span>
                    </div>
                    <span className="text-[11px] opacity-80">
                        Changes apply instantly to ALL connected devices, phones, and computers via cloud sync.
                    </span>
                </div>

                {/* 3 Master Controls Grid */}
                <div className="space-y-4">

                    {/* TOGGLE 1: FORCE LOGOUT & LOGIN NETWORK ERROR */}
                    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 backdrop-blur-xl ${
                        securityState.loginBlocked 
                            ? 'bg-amber-950/30 border-amber-500/50 shadow-xl shadow-amber-950/30' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                            <div className="flex items-start gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    securityState.loginBlocked 
                                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30' 
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    {securityState.loginBlocked ? <WifiOff size={24} /> : <LogOut size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-base font-bold text-white tracking-tight">
                                            1. Force Logout & Login Network Error Block
                                        </h2>
                                        {securityState.loginBlocked ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 animate-pulse">
                                                Active &bull; Logins Blocked
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                                Inactive &bull; Normal Login
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                                        When enabled, <strong className="text-amber-200">all currently logged-in users are immediately logged out</strong> across all devices, and anyone attempting to log in will be stopped with a genuine <strong className="text-amber-200">Network Error</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => handleToggle('loginBlocked')}
                                    disabled={loadingToggle === 'loginBlocked'}
                                    className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        securityState.loginBlocked ? 'bg-amber-500' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                            securityState.loginBlocked ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TOGGLE 2: GLOBAL PRINT LOCK */}
                    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 backdrop-blur-xl ${
                        securityState.printBlocked 
                            ? 'bg-rose-950/30 border-rose-500/50 shadow-xl shadow-rose-950/30' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                            <div className="flex items-start gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    securityState.printBlocked 
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' 
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    <Printer size={24} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-base font-bold text-white tracking-tight">
                                            2. Global Print Button Block
                                        </h2>
                                        {securityState.printBlocked ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                                                Active &bull; All Prints Blocked
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                                Inactive &bull; Printing Allowed
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                                        When enabled, <strong className="text-rose-200">all print buttons, receipts, shortcuts (Ctrl+P), and print dialogs are silently blocked</strong> across every page on all connected systems.
                                    </p>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => handleToggle('printBlocked')}
                                    disabled={loadingToggle === 'printBlocked'}
                                    className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        securityState.printBlocked ? 'bg-rose-500' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                            securityState.printBlocked ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TOGGLE 3: 403 FORBIDDEN LOCK */}
                    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 backdrop-blur-xl ${
                        securityState.maintenance403 
                            ? 'bg-red-950/40 border-red-500/60 shadow-2xl shadow-red-950/40' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                            <div className="flex items-start gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    securityState.maintenance403 
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    <AlertOctagon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-base font-bold text-white tracking-tight">
                                            3. 403 Forbidden Access Lock
                                        </h2>
                                        {securityState.maintenance403 ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                                                Active &bull; 403 Forbidden Triggered
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                                Inactive &bull; Public Access Open
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                                        When enabled, <strong className="text-red-300">every single page and API endpoint on the site displays a 403 Forbidden Access Denied error</strong>. This control page (<code className="text-red-200">/admin/secure/ppp</code>) always remains open so you can toggle it back off anytime.
                                    </p>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => handleToggle('maintenance403')}
                                    disabled={loadingToggle === 'maintenance403'}
                                    className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        securityState.maintenance403 ? 'bg-red-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                            securityState.maintenance403 ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Notice */}
                <div className="text-center text-[11px] text-slate-500 pt-2 font-mono">
                    Direct Gateway Route &bull; Secret Access: <span className="text-slate-400">/admin/secure/ppp</span> &bull; Synchronized via MongoDB Cloud
                </div>

            </div>
        </div>
    );
};

export default SecureAdminControl;

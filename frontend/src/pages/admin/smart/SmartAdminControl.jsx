import React, { useState, useEffect } from 'react';
import { 
    Printer, 
    ShieldAlert, 
    ShieldCheck, 
    Zap, 
    CheckCircle2, 
    Lock, 
    Unlock, 
    Receipt
} from 'lucide-react';
import { 
    isPrintLocked, 
    setPrintLock
} from '../../../utils/printLockManager';

const SmartAdminControl = () => {
    const [isPrintDisabled, setIsPrintDisabled] = useState(isPrintLocked());
    const [testClickFeedback, setTestClickFeedback] = useState(null);

    useEffect(() => {
        setIsPrintDisabled(isPrintLocked());

        const handleLockChange = (e) => {
            if (e.detail && typeof e.detail.isLocked === 'boolean') {
                setIsPrintDisabled(e.detail.isLocked);
            }
        };

        window.addEventListener('smart-print-lock-change', handleLockChange);
        return () => window.removeEventListener('smart-print-lock-change', handleLockChange);
    }, []);

    const handleToggle = () => {
        const nextState = !isPrintDisabled;
        setPrintLock(nextState);
        setIsPrintDisabled(nextState);
        setTestClickFeedback(null);
    };

    const handleTestPrint = () => {
        if (isPrintDisabled) {
            setTestClickFeedback({
                blocked: true,
                message: 'Click silently blocked (No print dialog opened, no toast shown).'
            });
        } else {
            setTestClickFeedback({
                blocked: false,
                message: 'Click allowed (Print dialog would open normally).'
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start py-8 px-4 sm:px-6">
            
            {/* Background Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-4xl space-y-6">

                {/* Top Header Card */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-white tracking-tight">Smart Control</h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Internal
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Hidden System Route &bull; Pure Internal Operation (No Network Calls &bull; No Toasters)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isPrintDisabled ? (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse">
                                <ShieldAlert size={14} /> Locked (Prints Disabled)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck size={14} /> Unlocked (Prints Enabled)
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Feature Toggle Card */}
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-2xl p-6 sm:p-8 backdrop-blur-md ${
                    isPrintDisabled
                        ? 'bg-rose-950/30 border-rose-500/40 shadow-rose-950/20'
                        : 'bg-slate-800/80 border-slate-700/80 shadow-slate-950/30'
                }`}>
                    
                    {/* Header Details */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-700/60">
                        <div className="flex items-center gap-2.5">
                            {isPrintDisabled ? (
                                <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center animate-pulse">
                                    <Lock size={18} />
                                </div>
                            ) : (
                                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                    <Unlock size={18} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-black text-white">Project-Wide Print Switch</h2>
                                <p className="text-xs text-slate-400">
                                    Turn ON to silently stop every print button across the entire application without any toaster popup.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Toggle Switch Component */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-900/60 rounded-2xl p-6 border border-slate-700/50">
                        <div>
                            <div className="text-sm font-black text-white flex items-center gap-2">
                                <Printer size={18} className={isPrintDisabled ? 'text-rose-400' : 'text-slate-400'} />
                                Disable All Print Buttons
                            </div>
                            <p className="text-xs text-slate-400 mt-1 max-w-md">
                                When turned <strong className="text-slate-200">ON</strong>, all print buttons, receipts, reports, admission forms, and Ctrl+P shortcuts will silently do nothing.
                            </p>
                        </div>

                        {/* Interactive Toggle */}
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-black uppercase ${!isPrintDisabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                                OFF
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isPrintDisabled}
                                onClick={handleToggle}
                                className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-hidden ${
                                    isPrintDisabled ? 'bg-rose-600' : 'bg-slate-700'
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                                        isPrintDisabled ? 'translate-x-9 text-rose-600' : 'translate-x-0 text-slate-400'
                                    }`}
                                >
                                    {isPrintDisabled ? <Lock size={14} /> : <Unlock size={14} />}
                                </span>
                            </button>
                            <span className={`text-xs font-black uppercase ${isPrintDisabled ? 'text-rose-400' : 'text-slate-500'}`}>
                                ON
                            </span>
                        </div>
                    </div>

                    {/* Coverage & Info Checklist */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3.5 space-y-2">
                            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Receipt size={14} className="text-indigo-400" /> What Gets Silently Blocked When ON:
                            </h4>
                            <ul className="space-y-1.5 text-slate-400">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>All Receipt & Fee Collection Print Buttons</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Inquiry (Online, Offline, DSR) Print Lists</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Visitor Reports & Todays Followup Print Lists</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Admission Form & Student Joining Prints</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Exam Result, Exam Set & Question Paper Prints</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Keyboard Shortcuts (<code className="text-indigo-300 font-bold">Ctrl + P</code>, <code className="text-indigo-300 font-bold">Cmd + P</code>)</span>
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3.5 space-y-3">
                            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Printer size={14} className="text-indigo-400" /> Verification Test (No Toaster):
                            </h4>
                            <p className="text-slate-400 leading-relaxed">
                                Click the button below to verify. If toggle is ON, clicking it is silently blocked without showing any toaster popup.
                            </p>
                            <button
                                type="button"
                                data-test-print="true"
                                onClick={handleTestPrint}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
                                    isPrintDisabled
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                }`}
                            >
                                <Printer size={14} /> Test Print Button
                            </button>
                            {testClickFeedback && (
                                <div className={`text-[11px] font-semibold p-2 rounded-lg border ${
                                    testClickFeedback.blocked
                                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                }`}>
                                    {testClickFeedback.message}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default SmartAdminControl;

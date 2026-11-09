import React from 'react';
import { ShieldX, AlertTriangle, Lock } from 'lucide-react';

const Forbidden403 = () => {
    return (
        <div className="fixed inset-0 z-99999 bg-[#0b0f19] text-white flex items-center justify-center p-4 font-mono select-none">
            <div className="max-w-xl w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-red-950/40 relative overflow-hidden backdrop-blur-md">
                
                {/* Background red hazard glow */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
                        <ShieldX size={44} strokeWidth={2.2} />
                    </div>

                    {/* Big 403 */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 mb-3">
                            <Lock size={12} /> HTTP 403 Forbidden
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                            Access Denied
                        </h1>
                        <p className="text-sm text-slate-400 mt-2 max-w-md">
                            Access to this server or resource is strictly forbidden by administrator policy.
                        </p>
                    </div>

                    {/* Diagnostic Box */}
                    <div className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-1.5 text-slate-400 font-mono">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Error Code:</span>
                            <span className="text-red-400 font-bold">403_FORBIDDEN_LOCK</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Server Status:</span>
                            <span className="text-amber-400">Locked / Maintenance Restriction</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Timestamp:</span>
                            <span className="text-slate-300">{new Date().toISOString()}</span>
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                        Please contact the system administrator if you believe this is an error.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forbidden403;

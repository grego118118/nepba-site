"use client";

import { useState } from "react";
import Link from "next/link";
import { ForensicAuditTool } from "./ForensicAuditTool";
import { PaycheckVerifier } from "./PaycheckVerifier";
import { AuditIcon } from "./AuditIcon";

interface AuditShellProps {
    userEmail: string;
}

export function AuditShell({ userEmail }: AuditShellProps) {
    const [mode, setMode] = useState<"audit" | "verify">("verify");

    return (
        <div className="flex h-screen flex-col bg-slate-900">
            {/* Navigation Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                <div className="flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="text-xs font-medium text-slate-400 hover:text-slate-200"
                    >
                        ← Dashboard
                    </Link>

                    <div className="h-4 w-px bg-slate-700" />

                    {/* Mode Switcher */}
                    <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                        <button
                            onClick={() => setMode("audit")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "audit"
                                    ? "bg-slate-700 text-slate-50 shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                        >
                            <AuditIcon name="gavel" size={14} />
                            Audit Tool
                        </button>
                        <button
                            onClick={() => setMode("verify")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "verify"
                                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                        >
                            <AuditIcon name="calculator" size={14} />
                            Paycheck Verifier
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="hidden md:inline-block text-[10px] uppercase tracking-wider text-slate-500">
                        NEPBA Local 190
                    </span>
                    <div className="h-4 w-px bg-slate-800 hidden md:block" />
                    <p className="text-xs text-slate-400">
                        <span className="font-medium text-slate-100">{userEmail}</span>
                    </p>
                </div>
            </header>

            {/* Main Content Area */}
            {mode === "audit" ? <ForensicAuditTool /> : <PaycheckVerifier />}
        </div>
    );
}

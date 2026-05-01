"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, AlertTriangle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { parsePaystubPdf, type ParsedPaystub, type ParsedEarningsRow } from "./paystubParser";
import { CATEGORY_LABELS, CATEGORY_COLORS, type PaystubCategory } from "./paystubCodes";

const ASSIGNABLE_CATEGORIES: PaystubCategory[] = [
    "regular",
    "overtime",
    "detail",
    "shiftDiff",
    "leave",
    "compUsed",
    "compEarned",
    "lumpSum",
    "other",
    "unknown",
];

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface PaystubUploadDialogProps {
    onClose: () => void;
    onApply: (paystub: ParsedPaystub) => void;
}

export function PaystubUploadDialog({ onClose, onApply }: PaystubUploadDialogProps) {
    const [stage, setStage] = useState<"intro" | "loading" | "review" | "error">("intro");
    const [parsed, setParsed] = useState<ParsedPaystub | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            setError("Please upload a PDF file.");
            setStage("error");
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
            setStage("error");
            return;
        }
        setStage("loading");
        try {
            const result = await parsePaystubPdf(file);
            setParsed(result);
            setStage("review");
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Failed to parse PDF.");
            setStage("error");
        }
    };

    const handleApply = () => {
        if (!parsed) return;
        onApply(parsed);
        onClose();
    };

    const updateRowCategory = (idx: number, category: PaystubCategory) => {
        if (!parsed) return;
        const next = [...parsed.earnings];
        next[idx] = { ...next[idx], category };
        setParsed({ ...parsed, earnings: next });
    };

    const sumCurrent = parsed?.earnings.reduce((s, e) => s + (e.currentEarnings ?? 0), 0) ?? 0;
    const grossMatch = parsed?.totalGross != null ? Math.abs(sumCurrent - parsed.totalGross) < 0.5 : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded bg-blue-500 p-1.5 text-white">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Upload Paystub</h2>
                            <p className="text-xs text-slate-500">
                                {stage === "intro" && "Privacy: parsing happens in your browser. Nothing is uploaded."}
                                {stage === "loading" && "Reading PDF..."}
                                {stage === "review" && `${parsed?.earnings.length ?? 0} line items extracted — review and apply`}
                                {stage === "error" && "Upload failed"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {stage === "intro" && (
                        <div className="p-5">
                            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4 flex gap-2 text-xs text-blue-800">
                                <Lock size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    <strong>What we extract:</strong> earnings descriptions, hours, rate, amounts, pay period dates, base rate.{" "}
                                    <strong>What we discard:</strong> employee ID, address, bank account numbers, SSN-like fields. Parsing is fully client-side; the file never leaves your device.
                                </div>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFile(file);
                                }}
                                onClick={() => inputRef.current?.click()}
                                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                            >
                                <Upload size={36} className="text-slate-400 mb-3" />
                                <p className="text-sm font-medium text-slate-700">Drop PDF here or click to browse</p>
                                <p className="text-xs text-slate-500 mt-1">Max 5 MB · PDF only · UMass / PeopleSoft format</p>
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFile(file);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {stage === "loading" && (
                        <div className="flex flex-col items-center justify-center p-12 gap-3">
                            <Loader2 size={28} className="animate-spin text-blue-500" />
                            <p className="text-sm text-slate-600">Parsing paystub...</p>
                        </div>
                    )}

                    {stage === "error" && (
                        <div className="p-5">
                            <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
                                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-bold text-red-800">Could not parse paystub</h3>
                                    <p className="text-xs text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStage("intro")}
                                className="mt-4 text-xs font-medium text-blue-600 hover:underline"
                            >
                                ← Try a different file
                            </button>
                        </div>
                    )}

                    {stage === "review" && parsed && (
                        <div className="p-5 space-y-4">
                            {/* Metadata strip */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <Stat label="Employer" value={parsed.employer ?? "—"} />
                                <Stat label="Pay Period" value={parsed.payBeginDate && parsed.payEndDate ? `${parsed.payBeginDate} → ${parsed.payEndDate}` : "—"} />
                                <Stat label="Base Rate" value={parsed.baseRate != null ? `$${parsed.baseRate.toFixed(4)}/hr` : "—"} />
                                <Stat label="Total Gross" value={parsed.totalGross != null ? `$${parsed.totalGross.toFixed(2)}` : "—"} highlight={grossMatch === false ? "warn" : grossMatch === true ? "ok" : undefined} />
                            </div>

                            {/* Warnings */}
                            {parsed.warnings.length > 0 && (
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                                    {parsed.warnings.map((w, i) => (
                                        <div key={i} className="flex gap-2 text-xs text-amber-800">
                                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                            <span>{w}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Per-week split notice */}
                            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                                <strong>Heads up:</strong> the PDF contains pay-period totals only, not per-workweek hours. We&apos;ll load all of these into Week 1; you&apos;ll need to manually split between weeks for accurate FLSA. (If you have a per-row earnings export from your HR portal, paste it on the calculator instead.)
                            </div>

                            {/* Rows table */}
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Description</th>
                                            <th className="px-3 py-2 text-left">Category</th>
                                            <th className="px-3 py-2 text-right">Rate</th>
                                            <th className="px-3 py-2 text-right">Hrs</th>
                                            <th className="px-3 py-2 text-right">Earnings</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsed.earnings.map((row, idx) => (
                                            <RowEditor
                                                key={idx}
                                                row={row}
                                                onCategoryChange={(c) => updateRowCategory(idx, c)}
                                            />
                                        ))}
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="px-3 py-2 text-slate-700" colSpan={4}>Sum of current earnings</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-700">${sumCurrent.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {stage === "review" && parsed && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-slate-50">
                        <div className="text-xs text-slate-500">
                            {grossMatch === true && (
                                <span className="flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 size={12} /> Earnings reconcile to Total Gross
                                </span>
                            )}
                            {grossMatch === false && (
                                <span className="flex items-center gap-1 text-amber-700">
                                    <AlertTriangle size={12} /> Earnings don&apos;t match Total Gross — review categories
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={parsed.earnings.length === 0}
                                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                Apply to Calculator
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" }) {
    const color = highlight === "ok" ? "text-emerald-700" : highlight === "warn" ? "text-amber-700" : "text-slate-700";
    return (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
            <div className={`text-xs font-mono font-semibold mt-0.5 ${color}`}>{value}</div>
        </div>
    );
}

function RowEditor({ row, onCategoryChange }: { row: ParsedEarningsRow; onCategoryChange: (c: PaystubCategory) => void }) {
    const isUnknown = row.category === "unknown";
    return (
        <tr className={isUnknown ? "bg-amber-50" : undefined}>
            <td className="px-3 py-2 text-slate-700">{row.description}</td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[row.category]}`} />
                    <select
                        value={row.category}
                        onChange={(e) => onCategoryChange(e.target.value as PaystubCategory)}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                        {ASSIGNABLE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {CATEGORY_LABELS[cat]}
                            </option>
                        ))}
                    </select>
                </div>
            </td>
            <td className="px-3 py-2 text-right font-mono text-slate-500">
                {row.rate != null ? `$${row.rate.toFixed(2)}` : "—"}
            </td>
            <td className="px-3 py-2 text-right font-mono text-slate-700">
                {row.currentHours != null ? row.currentHours.toFixed(2) : "—"}
            </td>
            <td className="px-3 py-2 text-right font-mono text-slate-700">
                {row.currentEarnings != null ? `$${row.currentEarnings.toFixed(2)}` : "—"}
            </td>
        </tr>
    );
}

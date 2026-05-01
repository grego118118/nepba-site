"use client";

import { useState, useMemo } from "react";
import {
    Calculator,
    CheckCircle2,
    AlertTriangle,
    FileText,
    DollarSign,
    Info,
    Plus,
    X,
    Calendar,
    Upload,
} from "lucide-react";
import { PaystubUploadDialog } from "./PaystubUploadDialog";
import type { ParsedPaystub } from "./paystubParser";

const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
};

const round2 = (v: number) => Number(v.toFixed(2));

interface WorkweekInputs {
    weekStart: string;
    weekEnd: string;

    regularHours: number;
    regularEarnings: number;

    otHours: number;
    otEarnings: number;

    detailHours: number;
    detailEarnings: number;

    shiftDiffHours: number;
    shiftDiffRate: number;
    shiftDiffEarnings: number;

    leaveHours: number;
    leaveEarnings: number;

    lumpSumEarnings: number;
    otherEarnings: number;
}

interface PaycheckInputs {
    payPeriodStart: string;
    payPeriodEnd: string;
    weeks: WorkweekInputs[];
}

interface PotConfig {
    wellness: number;
    incident: number;
    onCallAnnual: number;
    includeDetailInPot: boolean;
    includeShiftDiffInPot: boolean;
    includeLumpSumInPot: boolean;
    includeOtherInPot: boolean;
}

interface WeekResult {
    hoursWorked: number;
    hoursPaid: number;
    pot: number;
    flsaRate: number;
    expectedOtPremium: number;
    expectedGross: number;
    actualGross: number;
    variance: number;
    employerOtRate: number;
}

interface PeriodResult {
    weeks: WeekResult[];
    totalHoursWorked: number;
    totalHoursPaid: number;
    totalActualGross: number;
    totalExpectedGross: number;
    totalVariance: number;
    totalExpectedOtPremium: number;
}

const DEFAULT_RATE = 41.03;
const DEFAULT_CONFIG: PotConfig = {
    wellness: 0,
    incident: 0,
    onCallAnnual: 0,
    includeDetailInPot: true,
    includeShiftDiffInPot: true,
    includeLumpSumInPot: true,
    includeOtherInPot: false,
};

const EMPTY_WEEK: WorkweekInputs = {
    weekStart: "",
    weekEnd: "",
    regularHours: 0,
    regularEarnings: 0,
    otHours: 0,
    otEarnings: 0,
    detailHours: 0,
    detailEarnings: 0,
    shiftDiffHours: 0,
    shiftDiffRate: 0,
    shiftDiffEarnings: 0,
    leaveHours: 0,
    leaveEarnings: 0,
    lumpSumEarnings: 0,
    otherEarnings: 0,
};

const DEFAULT_INPUTS: PaycheckInputs = {
    payPeriodStart: "",
    payPeriodEnd: "",
    weeks: [{ ...EMPTY_WEEK }, { ...EMPTY_WEEK }],
};

function calcWeek(week: WorkweekInputs, baseRate: number, config: PotConfig): WeekResult {
    const reg = num(week.regularHours);
    const ot = num(week.otHours);
    const detail = num(week.detailHours);
    const leave = num(week.leaveHours);

    const inDetail = config.includeDetailInPot;
    const inShiftDiff = config.includeShiftDiffInPot;
    const inLump = config.includeLumpSumInPot;
    const inOther = config.includeOtherInPot;

    const hoursWorked = reg + ot + (inDetail ? detail : 0);
    const hoursPaid = hoursWorked + leave;

    const potBase = (reg + ot) * baseRate;
    const potDetail = inDetail ? num(week.detailEarnings) : 0;
    const potShiftDiff = inShiftDiff ? num(week.shiftDiffEarnings) : 0;
    const potLumpSum = inLump ? num(week.lumpSumEarnings) : 0;
    const potOther = inOther ? num(week.otherEarnings) : 0;
    const stipendHourly = num(config.wellness) + num(config.incident) + num(config.onCallAnnual) / 2080;
    const potStipends = hoursWorked * stipendHourly;

    const pot = potBase + potDetail + potShiftDiff + potLumpSum + potOther + potStipends;
    const flsaRate = hoursWorked > 0 ? pot / hoursWorked : 0;

    const expectedOtPremium = ot * flsaRate * 0.5;

    const expectedGross =
        pot +
        expectedOtPremium +
        num(week.leaveEarnings) +
        (inDetail ? 0 : num(week.detailEarnings)) +
        (inShiftDiff ? 0 : num(week.shiftDiffEarnings)) +
        (inLump ? 0 : num(week.lumpSumEarnings)) +
        (inOther ? 0 : num(week.otherEarnings));

    const actualGross =
        num(week.regularEarnings) +
        num(week.otEarnings) +
        num(week.detailEarnings) +
        num(week.shiftDiffEarnings) +
        num(week.leaveEarnings) +
        num(week.lumpSumEarnings) +
        num(week.otherEarnings);

    const employerOtRate = ot > 0 ? num(week.otEarnings) / (ot * 1.5) : 0;

    return {
        hoursWorked,
        hoursPaid,
        pot,
        flsaRate,
        expectedOtPremium,
        expectedGross,
        actualGross,
        variance: expectedGross - actualGross,
        employerOtRate,
    };
}

function addDaysISO(iso: string, days: number): string {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function paystubToInputs(paystub: ParsedPaystub): PaycheckInputs {
    const w1: WorkweekInputs = { ...EMPTY_WEEK };
    const w2: WorkweekInputs = { ...EMPTY_WEEK };

    if (paystub.payBeginDate) {
        w1.weekStart = paystub.payBeginDate;
        w1.weekEnd = addDaysISO(paystub.payBeginDate, 6);
        w2.weekStart = addDaysISO(paystub.payBeginDate, 7);
        w2.weekEnd = paystub.payEndDate || addDaysISO(paystub.payBeginDate, 13);
    }

    // Aggregate totals into Week 1; user redistributes manually.
    for (const e of paystub.earnings) {
        const h = e.currentHours ?? 0;
        const $$ = e.currentEarnings ?? 0;
        switch (e.category) {
            case "regular":
                w1.regularHours += h;
                w1.regularEarnings += $$;
                break;
            case "overtime":
                w1.otHours += h;
                w1.otEarnings += $$;
                break;
            case "detail":
                w1.detailHours += h;
                w1.detailEarnings += $$;
                break;
            case "shiftDiff":
                w1.shiftDiffHours += h;
                w1.shiftDiffEarnings += $$;
                if (e.rate && !w1.shiftDiffRate) w1.shiftDiffRate = e.rate;
                break;
            case "leave":
            case "compUsed":
                w1.leaveHours += h;
                w1.leaveEarnings += $$;
                break;
            case "lumpSum":
                w1.lumpSumEarnings += $$;
                break;
            case "compEarned":
                // Banked, no cash this period — skip
                break;
            case "other":
            case "unknown":
            default:
                w1.otherEarnings += $$;
                break;
        }
    }

    return {
        payPeriodStart: paystub.payBeginDate ?? "",
        payPeriodEnd: paystub.payEndDate ?? "",
        weeks: [w1, w2],
    };
}

function calcPeriod(inputs: PaycheckInputs, baseRate: number, config: PotConfig): PeriodResult {
    const weeks = inputs.weeks.map(w => calcWeek(w, baseRate, config));
    const sum = (sel: (r: WeekResult) => number) => weeks.reduce((s, r) => s + sel(r), 0);
    return {
        weeks,
        totalHoursWorked: sum(r => r.hoursWorked),
        totalHoursPaid: sum(r => r.hoursPaid),
        totalActualGross: sum(r => r.actualGross),
        totalExpectedGross: sum(r => r.expectedGross),
        totalVariance: sum(r => r.variance),
        totalExpectedOtPremium: sum(r => r.expectedOtPremium),
    };
}

export function PaycheckVerifier() {
    const [baseRate, setBaseRate] = useState(DEFAULT_RATE);
    const [inputs, setInputs] = useState<PaycheckInputs>(DEFAULT_INPUTS);
    const [config, setConfig] = useState<PotConfig>(DEFAULT_CONFIG);
    const [showConfig, setShowConfig] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [importNotice, setImportNotice] = useState<string | null>(null);

    const result = useMemo(() => calcPeriod(inputs, baseRate, config), [inputs, baseRate, config]);

    const applyParsedPaystub = (paystub: ParsedPaystub) => {
        const newInputs = paystubToInputs(paystub);
        setInputs(newInputs);
        if (paystub.baseRate) setBaseRate(paystub.baseRate);
        const otHrs = newInputs.weeks[0].otHours;
        const note = otHrs > 0
            ? `Imported pay-period totals into Week 1 (${otHrs.toFixed(2)} OT hrs). FLSA is per-workweek — split the hours into Week 1 and Week 2 before trusting the variance.`
            : "Imported pay-period totals into Week 1. Split between weeks for accurate FLSA.";
        setImportNotice(note);
    };

    const updateWeek = (idx: number, patch: Partial<WorkweekInputs>) => {
        setInputs(prev => {
            const next = [...prev.weeks];
            const updated = { ...next[idx], ...patch };
            // Auto-fill shift diff earnings when both hours and rate are entered
            if ("shiftDiffHours" in patch || "shiftDiffRate" in patch) {
                const h = num(updated.shiftDiffHours);
                const r = num(updated.shiftDiffRate);
                if (h > 0 && r > 0) {
                    updated.shiftDiffEarnings = round2(h * r);
                }
            }
            next[idx] = updated;
            return { ...prev, weeks: next };
        });
    };

    const addWeek = () => {
        setInputs(prev => ({ ...prev, weeks: [...prev.weeks, { ...EMPTY_WEEK }] }));
    };

    const removeWeek = (idx: number) => {
        setInputs(prev => ({
            ...prev,
            weeks: prev.weeks.length > 1 ? prev.weeks.filter((_, i) => i !== idx) : prev.weeks,
        }));
    };

    const currency = (val: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

    const isUnderpayment = result.totalVariance > 0.05;

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {showUpload && (
                <PaystubUploadDialog
                    onClose={() => setShowUpload(false)}
                    onApply={applyParsedPaystub}
                />
            )}

            {importNotice && (
                <div className="shrink-0 flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <div className="flex-1">{importNotice}</div>
                    <button
                        onClick={() => setImportNotice(null)}
                        className="text-amber-600 hover:text-amber-900"
                        aria-label="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded bg-emerald-500 p-2 text-white">
                        <ChecksIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight text-slate-800">Paycheck Verifier</h2>
                        <div className="flex gap-2 text-xs text-slate-500">
                            <span>Per-workweek FLSA</span>
                            <span>•</span>
                            <span>{inputs.weeks.length} {inputs.weeks.length === 1 ? "week" : "weeks"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        <Upload size={13} /> Upload Paystub
                    </button>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Hours Worked</div>
                        <div className="font-mono text-sm font-bold text-slate-700">{result.totalHoursWorked.toFixed(2)}</div>
                    </div>
                    <div className="text-right border-l pl-6 border-slate-100">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Variance</div>
                        <div className={`font-mono text-xl font-bold ${isUnderpayment ? "text-red-500" : "text-emerald-600"}`}>
                            {result.totalVariance > 0 ? "+" : ""}{currency(result.totalVariance)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* INPUT COLUMN */}
                <div className="w-[460px] min-w-[420px] overflow-y-auto border-r border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <FileText size={16} /> 1. Paycheck Details
                    </h3>

                    {/* PAY PERIOD */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pay Period Start</label>
                            <input
                                type="date"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                value={inputs.payPeriodStart}
                                onChange={e => setInputs(prev => ({ ...prev, payPeriodStart: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Pay Period End</label>
                            <input
                                type="date"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                value={inputs.payPeriodEnd}
                                onChange={e => setInputs(prev => ({ ...prev, payPeriodEnd: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* BASE RATE + CONFIG */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700">Base Hourly Rate</label>
                            <button onClick={() => setShowConfig(!showConfig)} className="text-[10px] text-blue-500 hover:underline">
                                {showConfig ? "Hide Advanced" : "Advanced Config"}
                            </button>
                        </div>
                        <div className="relative">
                            <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400" />
                            <input
                                type="number"
                                step="0.001"
                                className="w-full rounded border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                                value={baseRate || ""}
                                onChange={(e) => setBaseRate(num(e.target.value))}
                            />
                        </div>

                        {showConfig && (
                            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Per-Worked-Hour Stipends
                                    </div>
                                    <div className="space-y-1.5">
                                        <ConfigRow label="Wellness ($/hr)" value={config.wellness} onChange={v => setConfig({ ...config, wellness: v })} />
                                        <ConfigRow label="Incident ($/hr)" value={config.incident} onChange={v => setConfig({ ...config, incident: v })} />
                                        <ConfigRow label="On-Call (annual $)" value={config.onCallAnnual} onChange={v => setConfig({ ...config, onCallAnnual: v })} step={1} />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Include in FLSA Pot
                                    </div>
                                    <div className="space-y-1">
                                        <ConfigCheck label="Detail Pay" checked={config.includeDetailInPot} onChange={v => setConfig({ ...config, includeDetailInPot: v })} />
                                        <ConfigCheck label="Shift Differential" checked={config.includeShiftDiffInPot} onChange={v => setConfig({ ...config, includeShiftDiffInPot: v })} />
                                        <ConfigCheck label="Lump Sum / Settlement" checked={config.includeLumpSumInPot} onChange={v => setConfig({ ...config, includeLumpSumInPot: v })} />
                                        <ConfigCheck label="Other Earnings" checked={config.includeOtherInPot} onChange={v => setConfig({ ...config, includeOtherInPot: v })} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* WORKWEEKS */}
                    <div className="space-y-3">
                        {inputs.weeks.map((week, idx) => (
                            <WorkweekCard
                                key={idx}
                                idx={idx}
                                week={week}
                                weekResult={result.weeks[idx]}
                                onChange={(patch) => updateWeek(idx, patch)}
                                onRemove={inputs.weeks.length > 1 ? () => removeWeek(idx) : undefined}
                                currency={currency}
                            />
                        ))}

                        <button
                            onClick={addWeek}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-2 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        >
                            <Plus size={14} /> Add Workweek
                        </button>
                    </div>

                    {/* TOTAL */}
                    <div className="rounded bg-slate-100 p-3 mt-4 space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                            <span>Hours Worked (FLSA)</span>
                            <span className="font-mono">{result.totalHoursWorked.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-600">
                            <span>Hours Paid</span>
                            <span className="font-mono">{result.totalHoursPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-200">
                            <span className="font-bold text-slate-700">Total Check Gross</span>
                            <span className="font-mono font-bold text-slate-900">{currency(result.totalActualGross)}</span>
                        </div>
                    </div>
                </div>

                {/* RESULTS COLUMN */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Calculator size={16} /> 2. Forensic Analysis
                    </h3>

                    <div className="space-y-6 max-w-3xl">
                        {/* TOP CARD */}
                        <div className={`rounded-xl border p-6 shadow-sm ${isUnderpayment ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className={`text-lg font-bold ${isUnderpayment ? "text-red-800" : "text-slate-800"}`}>
                                        {isUnderpayment ? "Underpayment Detected" : "Paycheck Looks Accurate"}
                                    </h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {isUnderpayment
                                            ? `FLSA expects ${currency(result.totalExpectedGross)} for this period; check shows ${currency(result.totalActualGross)}.`
                                            : "Discrepancy is within a negligible range."}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-full ${isUnderpayment ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                                    {isUnderpayment ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                                </div>
                            </div>
                        </div>

                        {/* PER-WEEK BREAKDOWN */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="border-b border-slate-200 px-4 py-2 bg-slate-50">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                                    <Calendar size={12} /> Per-Workweek Breakdown
                                </h4>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                                    <tr>
                                        <th className="px-3 py-2">Week</th>
                                        <th className="px-3 py-2 text-right">Hrs Worked</th>
                                        <th className="px-3 py-2 text-right">FLSA Rate</th>
                                        <th className="px-3 py-2 text-right">OT Premium Owed</th>
                                        <th className="px-3 py-2 text-right">Paid</th>
                                        <th className="px-3 py-2 text-right">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {result.weeks.map((wr, idx) => {
                                        const w = inputs.weeks[idx];
                                        const range = w.weekStart && w.weekEnd
                                            ? `${w.weekStart} – ${w.weekEnd}`
                                            : `Week ${idx + 1}`;
                                        const v = wr.variance;
                                        const showVar = Math.abs(v) > 0.01;
                                        return (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 text-xs font-medium text-slate-700">{range}</td>
                                                <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">{wr.hoursWorked.toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-xs text-slate-800">
                                                    {wr.hoursWorked > 0 ? currency(wr.flsaRate) : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">
                                                    {wr.expectedOtPremium > 0 ? currency(wr.expectedOtPremium) : "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                                                    {currency(wr.actualGross)}
                                                </td>
                                                <td className={`px-3 py-2 text-right font-mono text-xs ${showVar ? (v > 0 ? "text-red-500 font-semibold" : "text-emerald-600") : "text-slate-300"}`}>
                                                    {showVar ? `${v > 0 ? "+" : ""}${currency(v)}` : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-50 font-bold">
                                        <td className="px-3 py-2 text-xs text-slate-800">TOTAL</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-700">{result.totalHoursWorked.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">—</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-700">{currency(result.totalExpectedOtPremium)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-700">{currency(result.totalActualGross)}</td>
                                        <td className={`px-3 py-2 text-right font-mono text-xs ${isUnderpayment ? "text-red-500" : "text-slate-400"}`}>
                                            {result.totalVariance > 0 ? "+" : ""}{currency(result.totalVariance)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* EXPLAINER */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h5 className="font-bold text-blue-800 text-xs mb-2 flex items-center gap-1">
                                    <Info size={12} /> HOW IT WORKS
                                </h5>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    FLSA is a per-workweek statute. For each week we sum the &ldquo;pot&rdquo; (regular pay + detail + shift diff + stipends),
                                    divide by hours actually worked, and apply 0.5× that rate as the OT premium for hours over 40.
                                    Aggregating across the pay period would smooth out weeks with higher detail/stipend density and understate the true rate.
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h5 className="font-bold text-slate-700 text-xs mb-2">CONFIG SUMMARY</h5>
                                <ul className="text-xs text-slate-600 space-y-1">
                                    <li className="flex justify-between"><span>Base Rate:</span> <span className="font-mono">{currency(baseRate)}</span></li>
                                    <li className="flex justify-between"><span>Detail in pot:</span> <span>{config.includeDetailInPot ? "yes" : "no"}</span></li>
                                    <li className="flex justify-between"><span>Shift diff in pot:</span> <span>{config.includeShiftDiffInPot ? "yes" : "no"}</span></li>
                                    <li className="flex justify-between"><span>Lump sum in pot:</span> <span>{config.includeLumpSumInPot ? "yes" : "no"}</span></li>
                                    <li className="flex justify-between"><span>Stipend $/hr:</span> <span className="font-mono">{currency(config.wellness + config.incident + config.onCallAnnual / 2080)}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ───────────── workweek card ─────────────

function WorkweekCard({
    idx,
    week,
    weekResult,
    onChange,
    onRemove,
    currency,
}: {
    idx: number;
    week: WorkweekInputs;
    weekResult: WeekResult | undefined;
    onChange: (patch: Partial<WorkweekInputs>) => void;
    onRemove?: () => void;
    currency: (v: number) => string;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-slate-700 shrink-0">Week {idx + 1}</span>
                    <input
                        type="date"
                        className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] flex-1 min-w-0"
                        value={week.weekStart}
                        onChange={e => onChange({ weekStart: e.target.value })}
                    />
                    <span className="text-[10px] text-slate-400">→</span>
                    <input
                        type="date"
                        className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] flex-1 min-w-0"
                        value={week.weekEnd}
                        onChange={e => onChange({ weekEnd: e.target.value })}
                    />
                </div>
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="ml-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove week ${idx + 1}`}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="space-y-1.5">
                <CompactRow
                    color="bg-slate-400"
                    label="Regular"
                    hours={week.regularHours}
                    earnings={week.regularEarnings}
                    onHoursChange={v => onChange({ regularHours: v })}
                    onEarningsChange={v => onChange({ regularEarnings: v })}
                />
                <CompactRow
                    color="bg-blue-500"
                    label="OT"
                    hours={week.otHours}
                    earnings={week.otEarnings}
                    onHoursChange={v => onChange({ otHours: v })}
                    onEarningsChange={v => onChange({ otEarnings: v })}
                />
                <CompactRow
                    color="bg-yellow-500"
                    label="Detail"
                    hours={week.detailHours}
                    earnings={week.detailEarnings}
                    onHoursChange={v => onChange({ detailHours: v })}
                    onEarningsChange={v => onChange({ detailEarnings: v })}
                />
                <ShiftDiffCompactRow
                    hours={week.shiftDiffHours}
                    rate={week.shiftDiffRate}
                    earnings={week.shiftDiffEarnings}
                    onHoursChange={v => onChange({ shiftDiffHours: v })}
                    onRateChange={v => onChange({ shiftDiffRate: v })}
                    onEarningsChange={v => onChange({ shiftDiffEarnings: v })}
                />
                <CompactRow
                    color="bg-purple-400"
                    label="Leave"
                    hours={week.leaveHours}
                    earnings={week.leaveEarnings}
                    onHoursChange={v => onChange({ leaveHours: v })}
                    onEarningsChange={v => onChange({ leaveEarnings: v })}
                />
                <CompactRow
                    color="bg-pink-400"
                    label="Lump"
                    earnings={week.lumpSumEarnings}
                    onEarningsChange={v => onChange({ lumpSumEarnings: v })}
                />
                <CompactRow
                    color="bg-slate-300"
                    label="Other"
                    earnings={week.otherEarnings}
                    onEarningsChange={v => onChange({ otherEarnings: v })}
                />
            </div>

            {weekResult && (weekResult.actualGross > 0 || weekResult.hoursWorked > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px]">
                    <span className="text-slate-500">
                        {weekResult.hoursWorked.toFixed(2)} hrs · FLSA {weekResult.hoursWorked > 0 ? currency(weekResult.flsaRate) : "—"}
                    </span>
                    <span className={`font-mono ${weekResult.variance > 0.01 ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                        {weekResult.variance > 0.01 ? `+${currency(weekResult.variance)} owed` : currency(weekResult.actualGross)}
                    </span>
                </div>
            )}
        </div>
    );
}

// ───────────── compact input rows ─────────────

function CompactRow({
    color,
    label,
    hours,
    earnings,
    onHoursChange,
    onEarningsChange,
}: {
    color: string;
    label: string;
    hours?: number;
    earnings: number;
    onHoursChange?: (v: number) => void;
    onEarningsChange: (v: number) => void;
}) {
    return (
        <div className="grid grid-cols-[1fr,68px,90px] gap-1.5 items-center">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <div className={`h-1.5 w-1.5 rounded-full ${color}`} /> {label}
            </div>
            {onHoursChange ? (
                <input
                    type="number"
                    step="0.01"
                    className="rounded border border-slate-200 px-1.5 py-1 text-center text-xs"
                    placeholder="hrs"
                    value={hours || ""}
                    onChange={e => onHoursChange(num(e.target.value))}
                />
            ) : (
                <div className="text-center text-[10px] text-slate-300 py-1">—</div>
            )}
            <input
                type="number"
                step="0.01"
                className="rounded border border-slate-200 px-1.5 py-1 text-right text-xs font-mono"
                placeholder="$0.00"
                value={earnings || ""}
                onChange={e => onEarningsChange(num(e.target.value))}
            />
        </div>
    );
}

function ShiftDiffCompactRow({
    hours,
    rate,
    earnings,
    onHoursChange,
    onRateChange,
    onEarningsChange,
}: {
    hours: number;
    rate: number;
    earnings: number;
    onHoursChange: (v: number) => void;
    onRateChange: (v: number) => void;
    onEarningsChange: (v: number) => void;
}) {
    return (
        <div>
            <div className="grid grid-cols-[1fr,68px,90px] gap-1.5 items-center">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Shift Δ
                </div>
                <input
                    type="number"
                    step="0.01"
                    className="rounded border border-slate-200 px-1.5 py-1 text-center text-xs"
                    placeholder="hrs"
                    value={hours || ""}
                    onChange={e => onHoursChange(num(e.target.value))}
                />
                <input
                    type="number"
                    step="0.01"
                    className="rounded border border-slate-200 px-1.5 py-1 text-right text-xs font-mono"
                    placeholder="$0.00"
                    value={earnings || ""}
                    onChange={e => onEarningsChange(num(e.target.value))}
                />
            </div>
            <div className="grid grid-cols-[1fr,68px,90px] gap-1.5 items-center mt-0.5">
                <div className="text-[9px] text-slate-400 ml-3">rate × hrs auto-fills $</div>
                <input
                    type="number"
                    step="0.01"
                    className="rounded border border-slate-200 px-1.5 py-0.5 text-center text-[10px] text-slate-500"
                    placeholder="$/hr"
                    value={rate || ""}
                    onChange={e => onRateChange(num(e.target.value))}
                />
                <div />
            </div>
        </div>
    );
}

function ConfigRow({
    label,
    value,
    onChange,
    step = 0.01,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
}) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{label}</span>
            <input
                type="number"
                step={step}
                className="w-20 rounded border bg-white px-1 py-0.5 text-right"
                value={value || ""}
                onChange={e => onChange(num(e.target.value))}
            />
        </div>
    );
}

function ConfigCheck({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
            />
            {label}
        </label>
    );
}

function ChecksIcon({ size, className }: { size?: number; className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <path d="M7 7h10" />
            <path d="M7 11h10" />
            <path d="M7 15h10" />
        </svg>
    );
}

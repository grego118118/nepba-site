"use client";

import { useState, useEffect } from "react";
import { AuditIcon } from "./AuditIcon";
import {
    Calculator,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    FileText,
    DollarSign,
    Info,
    ChevronDown,
    ChevronUp
} from "lucide-react";

// Types for Paycheck Inputs
interface PaycheckInputs {
    payPeriodStart: string;
    payPeriodEnd: string;
    regularHours: number;
    regularEarnings: number;
    otHours: number;
    otEarnings: number; // "Overtime Premium Pay" on check often is just the 0.5 portion, or 1.5? 
    // On UMass check: "Overtime Premium Pay" is usually the 1.5 rate? Or just premium? 
    // screenshot shows: "Overtime Premium Pay" Rate: 41.246304 (which is ~Base), Hours: 6.00, Earn: 369.91.
    // Wait, 41.24 * 6 = 247.47.  369.91 / 6 = 61.65.
    // 61.65 is approx 1.5 * 41.03 (61.545).
    // So "Overtime Premium Pay" line acts as the full 1.5x OT line for Dept OT.

    detailHours: number;
    detailEarnings: number;

    stipendHours: number; // e.g. "Shift Retirement Elig" or similar placeholders
    stipendEarnings: number;

    grossPay: number;
    netPay: number;
}

// Default Configuration (matching Forensic Tool defaults)
const DEFAULT_RATE = 41.03;
const DEFAULT_CONFIG = {
    wellness: 0.38,
    incident: 0.50,
    onCallAnnual: 2080, // ~$1.00/hr
};

export function PaycheckVerifier() {
    // --- STATE ---
    const [baseRate, setBaseRate] = useState(DEFAULT_RATE);

    // Paycheck Manual Inputs
    const [inputs, setInputs] = useState<PaycheckInputs>({
        payPeriodStart: "",
        payPeriodEnd: "",
        regularHours: 80,
        regularEarnings: 0,
        otHours: 0,
        otEarnings: 0,
        detailHours: 0,
        detailEarnings: 0,
        stipendHours: 0,
        stipendEarnings: 0,
        grossPay: 0,
        netPay: 0
    });

    // Toggle for "Advanced Config" (Stipends)
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    // Calculated Results
    const [results, setResults] = useState<{
        expectedRegular: number;
        expectedOT: number;
        expectedGross: number;
        actualGross: number; // Derived from inputs part sum
        variance: number;
        regularRate: number; // The FLSA Regular Rate
    } | null>(null);

    // --- HANDLERS ---
    const handleInputCheck = (field: keyof PaycheckInputs, value: string | number) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    // --- CALCULATION ENGINE ---
    useEffect(() => {
        // 1. Calculate Expected Regular Earnings (Base Pay)
        // Should be Reg Hours * Base Rate
        // NOTE: On check, "Regular" is typically Reg Hours * Base.
        const expectedRegPay = inputs.regularHours * baseRate;

        // 2. Calculate Total Remuneration (The "Pot") for FLSA
        // FLSA Regular Rate = Total Remuneration / Total Hours Worked

        // Remuneration includes:
        // - Base Pay (Reg Hours * Base)
        // - Detail Pay (We use the ACTUAL earnings from the check for this, as they are "flat rate" but count towards the pot)
        // - Stipends (We calculated expected stipends)

        // Calculate Expected Stipend Hourly Adder
        let stipendHourly = 0;
        stipendHourly += config.wellness;
        stipendHourly += config.incident;
        stipendHourly += (config.onCallAnnual / 2080);

        const totalHours = Number(inputs.regularHours) + Number(inputs.otHours) + Number(inputs.detailHours);

        // Expected Stipend Earnings
        const expectedStipends = totalHours * stipendHourly;

        // Total Remuneration "The Pot"
        // = (Reg Hours * Base) + (Detail Earnings Entered) + (Stipends) + (Straight Time for OT Hours)
        // Wait, the standard "Forensic Audit" method:
        // Pot = (All Hours * Base) + (Detail Premiums) + (Diffs) + (Stipends)

        // Let's use the inputs.otEarnings "Straight Time" assumption or just use Base?
        // Usually, we assume OT hours were paid at least Base. 
        // For the forensic calculation, we need to know the *TRUE* regular rate.

        // Pot Base: (Reg + OT) * Base
        const potBase = (Number(inputs.regularHours) + Number(inputs.otHours)) * baseRate;

        // Pot Details: Use the Details Earnings entered by user (Assuming they are flat rate gross)
        const potDetails = Number(inputs.detailEarnings);

        // Pot Stipends
        const potStipends = expectedStipends;

        // Total Pot
        const totalRemuneration = potBase + potDetails + potStipends;

        // FLSA Regular Rate
        const flsaRegRate = totalHours > 0 ? totalRemuneration / totalHours : 0;

        // 3. Calculate Overtime Premium Owed
        // Check owes 0.5 * RegRate for OT Hours
        // (We already included the 1.0 straight time in the Pot via potBase)
        const expectedOtPremium = Number(inputs.otHours) * (flsaRegRate * 0.5);

        // 4. Expected Total Gross (FLSA)
        const expectedTotalGross = totalRemuneration + expectedOtPremium;

        // 5. Actual Total (Sum of inputs)
        // We sum what the user entered for "Earnings" columns to see if it matches their Total Gross input
        // But for comparison, we compare Expected vs (Reg + OT + Details + Stipends from check?)
        // Actually, let's just use the entered line items as the "Actual" structure
        const actualSum =
            Number(inputs.regularEarnings) +
            Number(inputs.otEarnings) +
            Number(inputs.detailEarnings) +
            Number(inputs.stipendEarnings);


        // What about "Overtime Premium Pay" on the check?
        // If the check line says $369.91 for 6 hours, that is the full 1.5x pay (likely).
        // So 'actualSum' correctly captures the check's gross for these lines.

        setResults({
            expectedRegular: expectedRegPay,
            expectedOT: expectedOtPremium + (Number(inputs.otHours) * baseRate), // Full 1.5x representation for display
            expectedGross: expectedTotalGross,
            actualGross: actualSum,
            variance: expectedTotalGross - actualSum,
            regularRate: flsaRegRate
        });

    }, [inputs, baseRate, config]);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded bg-emerald-500 p-2 text-white">
                        <ChecksIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight text-slate-800">Paycheck Verifier</h2>
                        <div className="flex gap-2 text-xs text-slate-500">
                            <span>Compare Check vs. FLSA</span>
                            <span>•</span>
                            <span>Calculate Damages</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Stat Cards in Header */}
                    {results && (
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider text-slate-400">Calculated R.R.</div>
                                <div className="font-mono text-sm font-bold text-slate-700">{currency(results.regularRate)}/hr</div>
                            </div>
                            <div className="text-right border-l pl-6 border-slate-100">
                                <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Variance</div>
                                <div className={`font-mono text-xl font-bold ${results.variance > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                    {results.variance > 0 ? "+" : ""}{currency(results.variance)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* INPUT COLUMN */}
                <div className="w-1/3 min-w-[360px] overflow-y-auto border-r border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <FileText size={16} /> 1. Enter Paycheck Details
                    </h3>

                    <div className="space-y-6">
                        {/* CONFIG SECTION */}
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-700">Base Hourly Rate</label>
                                <button onClick={() => setShowConfig(!showConfig)} className="text-[10px] text-blue-500 hover:underline">
                                    {showConfig ? "Hide Config" : "Edit Config"}
                                </button>
                            </div>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400" />
                                <input
                                    type="number"
                                    className="w-full rounded border border-slate-300 bg-white py-2 pl-7 pr-3 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                                    value={baseRate}
                                    onChange={(e) => setBaseRate(Number(e.target.value))}
                                />
                            </div>

                            {showConfig && (
                                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Wellness Stipend ($/hr)</span>
                                        <input
                                            className="w-16 rounded border bg-white px-1 py-0.5 text-right"
                                            value={config.wellness}
                                            onChange={e => setConfig({ ...config, wellness: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Incident Stipend ($/hr)</span>
                                        <input
                                            className="w-16 rounded border bg-white px-1 py-0.5 text-right"
                                            value={config.incident}
                                            onChange={e => setConfig({ ...config, incident: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* EARNINGS INPUTS */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-[1fr,80px,100px] gap-2 items-end">
                                <label className="text-xs font-semibold text-slate-500 pb-1">Earnings Category</label>
                                <label className="text-xs font-semibold text-slate-500 pb-1 text-center">Hours</label>
                                <label className="text-xs font-semibold text-slate-500 pb-1 text-right">Amount ($)</label>

                                {/* Regular */}
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <div className="h-2 w-2 rounded-full bg-slate-400"></div> Regular
                                </div>
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-center text-sm"
                                    placeholder="80.00"
                                    value={inputs.regularHours || ""}
                                    onChange={e => handleInputCheck("regularHours", Number(e.target.value))}
                                />
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-right text-sm font-mono"
                                    placeholder="0.00"
                                    value={inputs.regularEarnings || ""}
                                    onChange={e => handleInputCheck("regularEarnings", Number(e.target.value))}
                                />

                                {/* OT */}
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <div className="h-2 w-2 rounded-full bg-blue-500"></div> Dept OT
                                </div>
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-center text-sm"
                                    placeholder="0.00"
                                    value={inputs.otHours || ""}
                                    onChange={e => handleInputCheck("otHours", Number(e.target.value))}
                                />
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-right text-sm font-mono"
                                    placeholder="0.00"
                                    value={inputs.otEarnings || ""}
                                    onChange={e => handleInputCheck("otEarnings", Number(e.target.value))}
                                />

                                {/* Details */}
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div> Details
                                </div>
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-center text-sm"
                                    placeholder="0.00"
                                    value={inputs.detailHours || ""}
                                    onChange={e => handleInputCheck("detailHours", Number(e.target.value))}
                                />
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-right text-sm font-mono"
                                    placeholder="0.00"
                                    value={inputs.detailEarnings || ""}
                                    onChange={e => handleInputCheck("detailEarnings", Number(e.target.value))}
                                />

                                {/* Stipends/Other */}
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div> Stipends/Other
                                </div>
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-center text-sm"
                                    disabled
                                    placeholder="N/A"
                                />
                                <input
                                    type="number"
                                    className="rounded border border-slate-200 px-2 py-1.5 text-right text-sm font-mono"
                                    placeholder="0.00"
                                    value={inputs.stipendEarnings || ""}
                                    onChange={e => handleInputCheck("stipendEarnings", Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="rounded bg-slate-100 p-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-600">Total Check Gross</span>
                                <span className="font-mono font-bold text-slate-900">{currency(Number(inputs.regularEarnings) + Number(inputs.otEarnings) + Number(inputs.detailEarnings) + Number(inputs.stipendEarnings))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESULTS COLUMN */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Calculator size={16} /> 2. Forensic Analysis
                    </h3>

                    {results && (
                        <div className="space-y-6 max-w-2xl">

                            {/* TOP CARD: VARIANCE */}
                            <div className={`rounded-xl border p-6 shadow-sm ${results.variance > 0.05 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className={`text-lg font-bold ${results.variance > 0.05 ? 'text-red-800' : 'text-slate-800'}`}>
                                            {results.variance > 0.05 ? "Underpayment Detected" : "Paycheck Looks Accurate"}
                                        </h4>
                                        <p className="text-sm text-slate-600 mt-1">
                                            {results.variance > 0.05
                                                ? "The calculated FLSA gross pay is higher than the manual input."
                                                : "The discrepancy is within a negligible range."}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${results.variance > 0.05 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {results.variance > 0.05 ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                                    </div>
                                </div>
                            </div>

                            {/* BREAKDOWN TABLE */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Pay Component</th>
                                            <th className="px-4 py-3 text-right">Check Value</th>
                                            <th className="px-4 py-3 text-right">FLSA Value</th>
                                            <th className="px-4 py-3 text-right">Diff</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-4 py-3 font-medium text-slate-700">Regular Pay</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-500">{currency(inputs.regularEarnings)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-800">{currency(results.expectedRegular)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-medium text-slate-700">OT/Details</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-500">{currency(inputs.otEarnings + inputs.detailEarnings)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-800">
                                                {/* This is approximate for display: showing the Base+Premium parts together */}
                                                {currency(results.expectedGross - results.expectedRegular - (inputs.stipendEarnings))}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                                        </tr>
                                        <tr className="bg-slate-50 font-bold">
                                            <td className="px-4 py-3 text-slate-800">TOTAL GROSS</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-600">{currency(results.actualGross)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-700">{currency(results.expectedGross)}</td>
                                            <td className={`px-4 py-3 text-right font-mono ${results.variance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {results.variance > 0 ? '+' : ''}{currency(results.variance)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* EXPLAINER */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h5 className="font-bold text-blue-800 text-xs mb-2 flex items-center gap-1"><Info size={12} /> HOW IT WORKS</h5>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        We assume your "Regular Rate" should include all stipends and detail pay.
                                        The calculator adds all earnings into a "Pot", divides by total hours worked to find the true Regular Rate,
                                        and then applies 1.5x of THAT rate to your OT hours.
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h5 className="font-bold text-slate-700 text-xs mb-2">CALCULATION DETAILS</h5>
                                    <ul className="text-xs text-slate-600 space-y-1">
                                        <li className="flex justify-between"><span>Base Rate:</span> <span>{currency(baseRate)}</span></li>
                                        <li className="flex justify-between"><span>Total Hours:</span> <span>{(Number(inputs.regularHours) + Number(inputs.otHours) + Number(inputs.detailHours)).toFixed(2)}</span></li>
                                        <li className="flex justify-between font-bold text-slate-800"><span>True Regular Rate:</span> <span>{currency(results.regularRate)}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

function ChecksIcon({ size, className }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <path d="M7 7h10" />
            <path d="M7 11h10" />
            <path d="M7 15h10" />
        </svg>
    )
}

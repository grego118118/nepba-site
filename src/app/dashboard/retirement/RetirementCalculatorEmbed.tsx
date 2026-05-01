"use client";

import { useMemo, useState } from "react";
import {
  calculatePensionWithOption,
  calculateVeteranBenefit,
  checkEligibility,
  getBenefitFactor,
  MAX_PENSION_PERCENTAGE_OF_SALARY,
} from "@/lib/pension-calculations";

type Group = "1" | "2" | "3" | "4";
type Era = "before_2012" | "after_2012";
type Option = "A" | "B" | "C";
type GroupKey = "GROUP_1" | "GROUP_2" | "GROUP_3" | "GROUP_4";

interface Segment {
  group: Group;
  years: number;
}

interface ProjectionRow {
  age: number;
  totalYears: number;
  blendedFactor: number;
  totalPercentage: number;
  annual: number;
  monthly: number;
  survivorAnnual: number | null;
  survivorMonthly: number | null;
  capped: boolean;
}

const APRIL_2_2012 = new Date("2012-04-02T00:00:00Z").getTime();

const GROUP_LABEL: Record<Group, string> = {
  "1": "Group 1 — General",
  "2": "Group 2 — Hazardous",
  "3": "Group 3 — State Police",
  "4": "Group 4 — Police / Fire",
};

const GROUP_MAX_PROJECTION_AGE: Record<Group, number> = {
  "1": 70,
  "2": 68,
  "3": 68,
  "4": 65,
};

interface RetirementCalculatorEmbedProps {
  initialGroup?: Group | null;
  initialHireDateIso?: string | null;
  initialAverageSalary?: number | null;
  initialTargetRetirementDateIso?: string | null;
}

function eraFromHireDate(iso: string | null | undefined): Era | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return t < APRIL_2_2012 ? "before_2012" : "after_2012";
}

function yearsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0;
  }
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDelta = end.getUTCMonth() - start.getUTCMonth();
  const dayDelta = end.getUTCDate() - start.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    years -= 1;
  }
  return Math.max(0, years);
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function asGroupKey(g: Group): GroupKey {
  return `GROUP_${g}` as GroupKey;
}

interface CalcInput {
  segments: Segment[];
  era: Era;
  age: number;
  avgSalary: number;
  option: Option;
  beneficiaryAge: string;
  isVeteran: boolean;
}

interface CalcResult {
  eligible: boolean;
  eligibilityMessage: string;
  totalYears: number;
  weightedUncapped: number;
  weightedAfterCap: number;
  capped: boolean;
  veteranBenefit: number;
  annual: number;
  monthly: number;
  survivorAnnual: number;
  survivorMonthly: number;
  blendedFactor: number;
  segmentBreakdown: { group: Group; years: number; factor: number; portion: number }[];
}

function computeResult(input: CalcInput): CalcResult {
  const totalYears = input.segments.reduce((sum, s) => sum + s.years, 0);

  let weightedUncapped = 0;
  const segmentBreakdown = input.segments.map((seg) => {
    const groupKey = asGroupKey(seg.group);
    const factor = getBenefitFactor(input.age, groupKey, input.era, totalYears);
    const portion = seg.years * factor * input.avgSalary;
    weightedUncapped += portion;
    return { ...seg, factor, portion };
  });

  const eligibilities = input.segments.map((seg) =>
    checkEligibility(input.age, totalYears, asGroupKey(seg.group), input.era),
  );
  const anyEligible = eligibilities.some((e) => e.eligible);

  if (!anyEligible || weightedUncapped <= 0) {
    return {
      eligible: false,
      eligibilityMessage:
        eligibilities[0]?.message ||
        "Eligibility requirements not met for the selected combination.",
      totalYears,
      weightedUncapped: 0,
      weightedAfterCap: 0,
      capped: false,
      veteranBenefit: 0,
      annual: 0,
      monthly: 0,
      survivorAnnual: 0,
      survivorMonthly: 0,
      blendedFactor: 0,
      segmentBreakdown,
    };
  }

  const cap = input.avgSalary * MAX_PENSION_PERCENTAGE_OF_SALARY;
  const capped = weightedUncapped > cap;
  const weightedAfterCap = capped ? cap : weightedUncapped;

  const veteranBenefit = calculateVeteranBenefit(
    input.isVeteran,
    input.age,
    totalYears,
  );
  const baseWithVet = weightedAfterCap + veteranBenefit;

  const primaryGroup = asGroupKey(
    input.segments[input.segments.length - 1].group,
  );

  const optionResult = calculatePensionWithOption(
    baseWithVet,
    input.option,
    input.age,
    input.beneficiaryAge,
    primaryGroup,
  );

  const blendedFactor =
    totalYears > 0 ? weightedUncapped / (input.avgSalary * totalYears) : 0;

  return {
    eligible: true,
    eligibilityMessage: "",
    totalYears,
    weightedUncapped,
    weightedAfterCap,
    capped,
    veteranBenefit,
    annual: optionResult.pension,
    monthly: optionResult.pension / 12,
    survivorAnnual: optionResult.survivorPension,
    survivorMonthly: optionResult.survivorPension / 12,
    blendedFactor,
    segmentBreakdown,
  };
}

function generateProjection(input: CalcInput): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const lastIdx = input.segments.length - 1;
  const lastGroup = input.segments[lastIdx].group;
  const maxAge = GROUP_MAX_PROJECTION_AGE[lastGroup];

  for (let yearOffset = 0; yearOffset < 30; yearOffset++) {
    const projAge = input.age + yearOffset;
    if (projAge > maxAge) break;

    const projSegments = input.segments.map((s, i) =>
      i === lastIdx ? { ...s, years: s.years + yearOffset } : s,
    );
    const r = computeResult({ ...input, age: projAge, segments: projSegments });

    if (!r.eligible) continue;

    rows.push({
      age: projAge,
      totalYears: r.totalYears,
      blendedFactor: r.blendedFactor,
      totalPercentage: r.capped
        ? MAX_PENSION_PERCENTAGE_OF_SALARY
        : r.weightedUncapped / input.avgSalary,
      annual: r.annual,
      monthly: r.monthly,
      survivorAnnual: input.option === "C" ? r.survivorAnnual : null,
      survivorMonthly: input.option === "C" ? r.survivorMonthly : null,
      capped: r.capped,
    });

    if (r.capped) break;
  }

  return rows;
}

export function RetirementCalculatorEmbed({
  initialGroup,
  initialHireDateIso,
  initialAverageSalary,
  initialTargetRetirementDateIso,
}: RetirementCalculatorEmbedProps = {}) {
  const inferredEra = eraFromHireDate(initialHireDateIso);
  const inferredYears =
    initialHireDateIso && initialTargetRetirementDateIso
      ? yearsBetween(initialHireDateIso, initialTargetRetirementDateIso)
      : null;

  const [segments, setSegments] = useState<Segment[]>([
    {
      group: (initialGroup as Group) ?? "2",
      years: inferredYears && inferredYears > 0 ? inferredYears : 25,
    },
  ]);
  const [era, setEra] = useState<Era>(inferredEra ?? "before_2012");
  const [age, setAge] = useState<number>(55);
  const [avgSalary, setAvgSalary] = useState<number>(
    initialAverageSalary ?? 95000,
  );
  const [option, setOption] = useState<Option>("A");
  const [beneficiaryAge, setBeneficiaryAge] = useState<string>("");
  const [isVeteran, setIsVeteran] = useState<boolean>(false);
  const [showProjection, setShowProjection] = useState<boolean>(true);

  const prefilled = !!(
    initialGroup ||
    initialHireDateIso ||
    initialAverageSalary
  );

  const calcInput: CalcInput = {
    segments,
    era,
    age,
    avgSalary,
    option,
    beneficiaryAge,
    isVeteran,
  };

  const result = useMemo(() => computeResult(calcInput), [
    segments,
    era,
    age,
    avgSalary,
    option,
    beneficiaryAge,
    isVeteran,
  ]);

  const projection = useMemo(
    () => (showProjection ? generateProjection(calcInput) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showProjection, segments, era, age, avgSalary, option, beneficiaryAge, isVeteran],
  );

  const replacementRate =
    avgSalary > 0 ? (result.annual / avgSalary) * 100 : 0;

  const updateSegment = (idx: number, patch: Partial<Segment>) => {
    setSegments((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const addSegment = () => {
    if (segments.length >= 4) return;
    setSegments((prev) => [...prev, { group: "2", years: 5 }]);
  };

  const removeSegment = (idx: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const isMultiGroup = segments.length > 1;

  return (
    <div className="grid w-full gap-4 lg:grid-cols-2">
      {/* Inputs */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-md shadow-black/30">
        {prefilled && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Pre-filled from your profile
          </div>
        )}

        <div className="space-y-3">
          {/* Service segments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {isMultiGroup ? "Service segments" : "Group & years of service"}
              </span>
              {segments.length < 4 && (
                <button
                  type="button"
                  onClick={addSegment}
                  className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300 hover:border-blue-400 hover:bg-blue-500/20"
                >
                  + Add group
                </button>
              )}
            </div>
            {segments.map((seg, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={seg.group}
                  onChange={(e) =>
                    updateSegment(idx, { group: e.target.value as Group })
                  }
                  className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
                    <option key={g} value={g}>
                      {GROUP_LABEL[g]}
                    </option>
                  ))}
                </select>
                <div className="flex w-28 items-center rounded-md border border-slate-700 bg-slate-900 px-2 focus-within:border-blue-500">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={seg.years}
                    onChange={(e) =>
                      updateSegment(idx, { years: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent py-2 text-xs text-slate-100 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">yrs</span>
                </div>
                {segments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSegment(idx)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-400 hover:border-red-500/50 hover:text-red-300"
                    aria-label="Remove segment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {isMultiGroup && (
              <p className="text-[10px] text-slate-500">
                Total {result.totalYears} yrs · Each segment uses its group&apos;s
                age factor; the last segment receives projected years.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Hire date
              </span>
              <select
                value={era}
                onChange={(e) => setEra(e.target.value as Era)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="before_2012">Before Apr 2, 2012</option>
                <option value="after_2012">On / after Apr 2, 2012</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Age at retirement
              </span>
              <input
                type="number"
                min={18}
                max={80}
                value={age}
                onChange={(e) => setAge(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Average salary — highest 3 consecutive years
            </span>
            <div className="mt-1 flex items-center rounded-md border border-slate-700 bg-slate-900 px-2 focus-within:border-blue-500">
              <span className="text-xs text-slate-500">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={avgSalary}
                onChange={(e) => setAvgSalary(Number(e.target.value) || 0)}
                className="w-full bg-transparent px-1 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Retirement option
              </span>
              <select
                value={option}
                onChange={(e) => setOption(e.target.value as Option)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="A">A — Full Allowance (100%)</option>
                <option value="B">B — Annuity Protection (~1%)</option>
                <option value="C">C — Joint &amp; Survivor (66.67%)</option>
              </select>
            </label>

            {option === "C" && (
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Beneficiary age
                </span>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={beneficiaryAge}
                  onChange={(e) => setBeneficiaryAge(e.target.value)}
                  placeholder="e.g. 53"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </label>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] font-medium text-slate-300 hover:border-slate-700">
            <input
              type="checkbox"
              checked={isVeteran}
              onChange={(e) => setIsVeteran(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
            />
            Veteran benefit ($15/yr × YOS, max $300, age 36+)
          </label>
        </div>
      </div>

      {/* Results + projection */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/80 p-5 shadow-md shadow-black/30">
          {!result.eligible ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Not yet eligible
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {result.eligibilityMessage}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Estimated annual pension
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-50 tracking-tight">
                  {formatCurrency(result.annual)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatCurrency(result.monthly)} / month ·{" "}
                  {avgSalary > 0 ? `${replacementRate.toFixed(1)}%` : "—"} of
                  salary
                </p>
              </div>

              {option === "C" && result.survivorAnnual > 0 && (
                <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    Survivor benefit (66.67%)
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-100">
                    {formatCurrency(result.survivorAnnual)} / yr ·{" "}
                    {formatCurrency(result.survivorMonthly)} / mo
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-[11px]">
                <div className="rounded-md bg-slate-900/50 px-2 py-1.5">
                  <span className="block text-slate-500">
                    {isMultiGroup ? "Blended factor" : "Age factor"}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {(result.blendedFactor * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="rounded-md bg-slate-900/50 px-2 py-1.5">
                  <span className="block text-slate-500">Total YOS</span>
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {result.totalYears}
                  </span>
                </div>
              </div>

              {result.veteranBenefit > 0 && (
                <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                  + {formatCurrency(result.veteranBenefit)} / yr veteran benefit
                  applied
                </p>
              )}

              {isMultiGroup && (
                <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Group breakdown
                  </p>
                  <ul className="space-y-1">
                    {result.segmentBreakdown.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between text-[11px] text-slate-400"
                      >
                        <span>
                          Group {s.group} · {s.years}y ·{" "}
                          {(s.factor * 100).toFixed(2)}%
                        </span>
                        <span className="font-mono text-slate-200">
                          {formatCurrency(s.portion)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.capped && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  <strong className="font-semibold">Capped at 80%.</strong>{" "}
                  Uncapped formula yields{" "}
                  {formatCurrency(result.weightedUncapped)}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Projection table */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={() => setShowProjection((v) => !v)}
            className="flex w-full items-center justify-between rounded-t-xl px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-900/60"
          >
            <span className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Year-by-year projection
              {projection.length > 0 && (
                <span className="text-slate-500">
                  · {projection.length} yr{projection.length === 1 ? "" : "s"}
                </span>
              )}
            </span>
            <span className="text-slate-500">{showProjection ? "−" : "+"}</span>
          </button>

          {showProjection && projection.length > 0 && (
            <div className="overflow-x-auto border-t border-slate-800">
              <table className="w-full min-w-[34rem] text-[11px]">
                <thead className="bg-slate-900/40 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Age</th>
                    <th className="px-3 py-2 font-semibold">YOS</th>
                    <th className="px-3 py-2 font-semibold">Factor</th>
                    <th className="px-3 py-2 font-semibold">Total %</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Annual
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Monthly
                    </th>
                    {option === "C" && (
                      <th className="px-3 py-2 text-right font-semibold">
                        Survivor
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projection.map((row) => (
                    <tr
                      key={row.age}
                      className={
                        row.age === age
                          ? "bg-sky-500/10 text-slate-50"
                          : "text-slate-300 hover:bg-slate-900/40"
                      }
                    >
                      <td className="px-3 py-1.5 font-semibold">{row.age}</td>
                      <td className="px-3 py-1.5">{row.totalYears}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {(row.blendedFactor * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {(row.totalPercentage * 100).toFixed(1)}%
                        {row.capped && (
                          <span className="ml-1 text-[9px] font-bold text-amber-400">
                            CAP
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {formatCurrency(row.annual)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {formatCurrency(row.monthly)}
                      </td>
                      {option === "C" && (
                        <td className="px-3 py-1.5 text-right font-mono text-violet-300">
                          {row.survivorAnnual != null
                            ? formatCurrency(row.survivorAnnual)
                            : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {showProjection && projection.length === 0 && (
            <p className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
              No eligible projection rows for the current inputs.
            </p>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-slate-500">
          Estimate only. Actual allowance is determined by your retirement
          board and may be adjusted by buybacks, COLAs, and other statutory
          factors. Confirm with your board before relying on these numbers.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

type Group = "1" | "2" | "4";
type Era = "pre-2012" | "post-2012";

const GROUP_MIN_AGE: Record<Group, Record<Era, number>> = {
  "1": { "pre-2012": 55, "post-2012": 60 },
  "2": { "pre-2012": 55, "post-2012": 55 },
  "4": { "pre-2012": 45, "post-2012": 50 },
};

const PRE_2012_START_FACTOR: Record<Group, number> = {
  "1": 0.015,
  "2": 0.020,
  "4": 0.015,
};

function getAgeFactor(
  group: Group,
  era: Era,
  age: number,
  years: number,
): number | null {
  const minAge = GROUP_MIN_AGE[group][era];
  if (age < minAge) return null;

  if (era === "pre-2012") {
    const offset = age - minAge;
    const factor = PRE_2012_START_FACTOR[group] + offset * 0.001;
    return Math.min(factor, 0.025);
  }

  const offset = age - minAge;
  if (years >= 30) {
    return Math.min(0.020 + offset * 0.001, 0.025);
  }
  return Math.min(0.0145 + offset * 0.0015, 0.025);
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const APRIL_2_2012 = new Date("2012-04-02T00:00:00Z").getTime();

interface RetirementCalculatorEmbedProps {
  initialGroup?: Group | null;
  initialHireDateIso?: string | null;
  initialAverageSalary?: number | null;
  initialTargetRetirementDateIso?: string | null;
  initialBirthDateIso?: string | null;
}

function eraFromHireDate(iso: string | null | undefined): Era | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return t < APRIL_2_2012 ? "pre-2012" : "post-2012";
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

  const [group, setGroup] = useState<Group>(
    (initialGroup as Group) ?? "2",
  );
  const [era, setEra] = useState<Era>(inferredEra ?? "pre-2012");
  const [age, setAge] = useState<number>(55);
  const [years, setYears] = useState<number>(
    inferredYears && inferredYears > 0 ? inferredYears : 25,
  );
  const [avgSalary, setAvgSalary] = useState<number>(
    initialAverageSalary ?? 95000,
  );

  const prefilled = !!(
    initialGroup ||
    initialHireDateIso ||
    initialAverageSalary
  );

  const result = useMemo(() => {
    const minAge = GROUP_MIN_AGE[group][era];
    const factor = getAgeFactor(group, era, age, years);
    const vested = years >= 10;

    if (factor === null) {
      return {
        eligible: false,
        vested,
        minAge,
        factor: 0,
        annualUncapped: 0,
        annual: 0,
        monthly: 0,
        capped: false,
      };
    }

    const annualUncapped = years * factor * avgSalary;
    const cap = 0.8 * avgSalary;
    const capped = annualUncapped > cap;
    const annual = capped ? cap : annualUncapped;

    return {
      eligible: true,
      vested,
      minAge,
      factor,
      annualUncapped,
      annual,
      monthly: annual / 12,
      capped,
    };
  }, [group, era, age, years, avgSalary]);

  const salaryAvgWindow = era === "post-2012" ? "5" : "3";

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/80 p-4 shadow-md shadow-black/30 md:max-w-lg">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-50">
          Massachusetts pension estimator
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          M.G.L. c. 32 formula — for rough planning only.
          {prefilled && (
            <span className="ml-1 text-emerald-400">Pre-filled from your profile.</span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-slate-300">
              Group
            </span>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as Group)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="1">Group 1 — General</option>
              <option value="2">Group 2 — Hazardous</option>
              <option value="4">Group 4 — Police / Fire</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-medium text-slate-300">
              Hire date
            </span>
            <select
              value={era}
              onChange={(e) => setEra(e.target.value as Era)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="pre-2012">Before Apr 2, 2012</option>
              <option value="post-2012">On / after Apr 2, 2012</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-slate-300">
              Age at retirement
            </span>
            <input
              type="number"
              min={18}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-medium text-slate-300">
              Years of service
            </span>
            <input
              type="number"
              min={0}
              max={50}
              value={years}
              onChange={(e) => setYears(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-medium text-slate-300">
            Average salary — highest {salaryAvgWindow} consecutive years
          </span>
          <div className="mt-1 flex items-center rounded-md border border-slate-700 bg-slate-900 px-2 focus-within:border-blue-500">
            <span className="text-xs text-slate-500">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={avgSalary}
              onChange={(e) => setAvgSalary(Number(e.target.value) || 0)}
              className="w-full bg-transparent px-1 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
          </div>
        </label>
      </div>

      <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/60 p-3">
        {!result.eligible ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-300">
              Not yet eligible
            </p>
            <p className="text-[11px] text-slate-400">
              Group {group} {era === "pre-2012" ? "pre-2012" : "post-2012"}{" "}
              members can first draw an allowance at age {result.minAge}.
              {!result.vested
                ? " You also need at least 10 years of creditable service to vest."
                : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Estimated annual
              </span>
              <span className="text-lg font-semibold text-slate-50">
                {formatCurrency(result.annual)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Estimated monthly
              </span>
              <span className="text-sm font-semibold text-slate-200">
                {formatCurrency(result.monthly)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
              <span>Age factor</span>
              <span className="font-mono text-slate-300">
                {(result.factor * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-[11px] text-slate-400">
              <span>Replacement rate</span>
              <span className="font-mono text-slate-300">
                {avgSalary > 0
                  ? `${((result.annual / avgSalary) * 100).toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            {result.capped && (
              <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                Capped at the 80% statutory maximum. Uncapped formula would
                yield {formatCurrency(result.annualUncapped)}.
              </p>
            )}
            {!result.vested && (
              <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                Heads up: members typically need 10 years of creditable service
                to vest.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Estimate only. Your actual allowance is determined by your retirement
        board and may be adjusted by retirement option (A, B, or C),
        buybacks, veteran status, and other statutory factors. Confirm with
        your board before relying on these numbers.
      </p>
    </div>
  );
}

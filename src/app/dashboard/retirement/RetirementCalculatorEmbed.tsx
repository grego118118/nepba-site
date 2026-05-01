"use client";

import { useMemo, useState } from "react";
import {
  calculateAnnualPension,
  calculatePensionWithOption,
  calculateVeteranBenefit,
  checkEligibility,
  getBenefitFactor,
  MAX_PENSION_PERCENTAGE_OF_SALARY,
} from "@/lib/pension-calculations";

type Group = "1" | "2" | "3" | "4";
type Era = "before_2012" | "after_2012";
type Option = "A" | "B" | "C";

const APRIL_2_2012 = new Date("2012-04-02T00:00:00Z").getTime();

const GROUP_LABEL: Record<Group, string> = {
  "1": "Group 1 — General",
  "2": "Group 2 — Hazardous",
  "3": "Group 3 — State Police",
  "4": "Group 4 — Police / Fire",
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
  const [era, setEra] = useState<Era>(inferredEra ?? "before_2012");
  const [age, setAge] = useState<number>(55);
  const [years, setYears] = useState<number>(
    inferredYears && inferredYears > 0 ? inferredYears : 25,
  );
  const [avgSalary, setAvgSalary] = useState<number>(
    initialAverageSalary ?? 95000,
  );
  const [option, setOption] = useState<Option>("A");
  const [beneficiaryAge, setBeneficiaryAge] = useState<string>("");
  const [isVeteran, setIsVeteran] = useState<boolean>(false);

  const prefilled = !!(
    initialGroup ||
    initialHireDateIso ||
    initialAverageSalary
  );

  const result = useMemo(() => {
    const groupKey = `GROUP_${group}` as
      | "GROUP_1"
      | "GROUP_2"
      | "GROUP_3"
      | "GROUP_4";

    const eligibility = checkEligibility(age, years, groupKey, era);
    const factor = getBenefitFactor(age, groupKey, era, years);
    const veteranBenefit = calculateVeteranBenefit(isVeteran, age, years);

    if (!eligibility.eligible || factor === 0) {
      return {
        eligible: false,
        eligibilityMessage: eligibility.message,
        factor: 0,
        annual: 0,
        monthly: 0,
        baseAnnual: 0,
        annualUncapped: 0,
        capped: false,
        survivorAnnual: 0,
        survivorMonthly: 0,
        veteranBenefit: 0,
      };
    }

    const annualUncapped = avgSalary * years * factor;
    const cap = avgSalary * MAX_PENSION_PERCENTAGE_OF_SALARY;
    const capped = annualUncapped > cap;
    const baseAnnual = capped ? cap : annualUncapped;

    const totalAnnual = calculateAnnualPension(
      avgSalary,
      age,
      years,
      option,
      groupKey,
      era,
      beneficiaryAge || undefined,
      isVeteran,
    );

    let survivorAnnual = 0;
    if (option === "C") {
      const optionResult = calculatePensionWithOption(
        baseAnnual + veteranBenefit,
        "C",
        age,
        beneficiaryAge,
        groupKey,
      );
      survivorAnnual = optionResult.survivorPension;
    }

    return {
      eligible: true,
      eligibilityMessage: "",
      factor,
      annual: totalAnnual,
      monthly: totalAnnual / 12,
      baseAnnual,
      annualUncapped,
      capped,
      survivorAnnual,
      survivorMonthly: survivorAnnual / 12,
      veteranBenefit,
    };
  }, [group, era, age, years, avgSalary, option, beneficiaryAge, isVeteran]);

  const replacementRate =
    avgSalary > 0 ? (result.annual / avgSalary) * 100 : 0;

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/80 p-4 shadow-md shadow-black/30 md:max-w-lg">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-50">
          Massachusetts pension estimator
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Uses MSRB-validated formulas (M.G.L. c. 32) — for planning only.
          {prefilled && (
            <span className="ml-1 text-emerald-400">
              Pre-filled from your profile.
            </span>
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
              {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g]}
                </option>
              ))}
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
              <option value="before_2012">Before Apr 2, 2012</option>
              <option value="after_2012">On / after Apr 2, 2012</option>
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
              className="w-full bg-transparent px-1 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-slate-300">
              Retirement option
            </span>
            <select
              value={option}
              onChange={(e) => setOption(e.target.value as Option)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="A">A — Full Allowance (100%)</option>
              <option value="B">B — Annuity Protection (~1% reduction)</option>
              <option value="C">C — Joint &amp; Survivor (66.67%)</option>
            </select>
          </label>

          {option === "C" && (
            <label className="block">
              <span className="text-[11px] font-medium text-slate-300">
                Beneficiary age
              </span>
              <input
                type="number"
                min={18}
                max={100}
                value={beneficiaryAge}
                onChange={(e) => setBeneficiaryAge(e.target.value)}
                placeholder="e.g. 53"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </label>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-300">
          <input
            type="checkbox"
            checked={isVeteran}
            onChange={(e) => setIsVeteran(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
          />
          Veteran benefit ($15/yr × YOS, max $300, age 36+)
        </label>
      </div>

      <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/60 p-3">
        {!result.eligible ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-300">
              Not yet eligible
            </p>
            <p className="text-[11px] text-slate-400">
              {result.eligibilityMessage ||
                "Eligibility requirements not met for the selected group, age, service, and hire-date combination."}
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
            {option === "C" && result.survivorAnnual > 0 && (
              <div className="flex items-baseline justify-between border-t border-slate-800 pt-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Survivor (66.67%)
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {formatCurrency(result.survivorAnnual)} / yr ·{" "}
                  {formatCurrency(result.survivorMonthly)} / mo
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
              <span>Age factor</span>
              <span className="font-mono text-slate-300">
                {(result.factor * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-[11px] text-slate-400">
              <span>Replacement rate</span>
              <span className="font-mono text-slate-300">
                {avgSalary > 0 ? `${replacementRate.toFixed(1)}%` : "—"}
              </span>
            </div>
            {result.veteranBenefit > 0 && (
              <div className="flex items-baseline justify-between text-[11px] text-emerald-300">
                <span>Veteran benefit (added)</span>
                <span className="font-mono">
                  +{formatCurrency(result.veteranBenefit)} / yr
                </span>
              </div>
            )}
            {result.capped && (
              <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                Capped at the 80% statutory maximum. Uncapped formula would
                yield {formatCurrency(result.annualUncapped)}.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Estimate only. Actual allowance is determined by your retirement board
        and may be adjusted by buybacks, COLAs, and other statutory factors.
        Confirm with your board before relying on these numbers.
      </p>
    </div>
  );
}

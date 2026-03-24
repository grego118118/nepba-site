"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTimeRemaining, type TimeRemaining } from "@/lib/utils";

interface Props {
  targetRetirementDateIso: string | null;
  hideUpdateLink?: boolean;
}

export function RetirementCountdownCard({ targetRetirementDateIso, hideUpdateLink = false }: Props) {
  const [remaining, setRemaining] = useState<TimeRemaining | null>(() =>
    targetRetirementDateIso
      ? getTimeRemaining(new Date(targetRetirementDateIso))
      : null,
  );

  useEffect(() => {
    if (!targetRetirementDateIso) {
      setRemaining(null);
      return;
    }

    const target = new Date(targetRetirementDateIso);

    const tick = () => {
      setRemaining(getTimeRemaining(target));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetRetirementDateIso]);

  const hasDate = !!targetRetirementDateIso;
  const targetLabel = targetRetirementDateIso
    ? new Date(targetRetirementDateIso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : null;

  const isPast =
    hasDate &&
    remaining != null &&
    remaining.years === 0 &&
    remaining.months === 0 &&
    remaining.days === 0 &&
    remaining.hours === 0 &&
    remaining.minutes === 0 &&
    remaining.seconds === 0;

  return (
    <article
      aria-labelledby="dashboard-retirement-countdown-heading"
      className="premium-card p-6 shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2
          id="dashboard-retirement-countdown-heading"
          className="text-base font-bold text-white"
        >
          Retirement Countdown
        </h2>
      </div>

      <div className="flex-grow flex flex-col justify-center">
        {!hasDate && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex h-12 w-12 rounded-full bg-slate-800/50 items-center justify-center text-slate-500 mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-slate-300">
              No target date set
            </p>
            <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              Add your anticipated retirement date to verify your timeline.
            </p>

            <Link
              href="/dashboard/retirement"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-blue-500/20"
            >
              Set Date
            </Link>
          </div>
        )}

        {hasDate && (
          <div className="space-y-5">
            {isPast ? (
              <div className="text-center py-6 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-sm font-bold text-red-200 mb-1">
                  Target date has passed
                </p>
                <p className="text-xs text-slate-400 px-4">
                  Please review your plans with your retirement board.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center py-2">
                  <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50 backdrop-blur-sm">
                    <span className="block text-2xl font-bold text-white tracking-tight">
                      {remaining?.years ?? 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Years
                    </span>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50 backdrop-blur-sm">
                    <span className="block text-2xl font-bold text-white tracking-tight">
                      {remaining?.months ?? 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Months
                    </span>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50 backdrop-blur-sm">
                    <span className="block text-2xl font-bold text-white tracking-tight">
                      {remaining?.days ?? 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Days
                    </span>
                  </div>
                </div>

                {remaining && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 text-xs font-mono text-sky-400">
                      <span>{String(remaining.hours).padStart(2, '0')}h</span> :
                      <span>{String(remaining.minutes).padStart(2, '0')}m</span> :
                      <span>{String(remaining.seconds).padStart(2, '0')}s</span>
                    </div>
                  </div>
                )}

                <p className="text-center text-[10px] text-slate-500 pt-2">
                  Target: <span className="text-slate-400 font-medium">{targetLabel}</span>
                </p>
              </>
            )}

            {!hideUpdateLink && (
              <div className="pt-2 text-center border-t border-slate-800/50 mt-2">
                <Link
                  href="/dashboard/retirement"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-400 transition-colors"
                >
                  Adjust Date
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

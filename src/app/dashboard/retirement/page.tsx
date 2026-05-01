import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { RetirementCalculatorEmbed } from "./RetirementCalculatorEmbed";
import { RetirementDateForm } from "./RetirementDateForm";
import { RetirementCountdownCard } from "../RetirementCountdownCard";

export default async function RetirementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/retirement");
  }

  const email = session.user.email ?? "Member";

  let userId = "";
  let targetRetirementDateIso: string | null = null;
  let initialGroup: string | null = null;
  let initialHireDateIso: string | null = null;
  let initialAverageSalary: number | null = null;
  if (session.user.email) {
    const userWithProfile = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      with: { profile: true },
    });
    userId = userWithProfile?.id ?? "";
    const profile = userWithProfile?.profile ?? null;
    const target = profile?.targetRetirementDate ?? null;
    targetRetirementDateIso = target ? target.toISOString() : null;
    initialGroup = profile?.retirementGroup ?? null;
    initialHireDateIso = profile?.hireDate
      ? profile.hireDate.toISOString()
      : null;
    initialAverageSalary = profile?.averageSalary ?? null;
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
              NEPBA Local 190
            </p>
            <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
              Retirement &amp; Planning
            </h1>
            <p className="text-xs text-slate-400 md:text-sm">
              Pension estimator, projection, and target-date tracking. Signed in
              as <span className="font-medium text-slate-100">{email}</span>.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-end gap-1 md:mt-0">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              ← Back to dashboard
            </Link>
          </div>
        </header>

        {/* Hero countdown */}
        <RetirementCountdownCard
          targetRetirementDateIso={targetRetirementDateIso}
          hideUpdateLink
        />

        <section className="grid gap-4 md:grid-cols-2">
          <RetirementDateForm
            initialTargetDateIso={targetRetirementDateIso}
            userId={userId}
            userEmail={email}
          />

          <article
            aria-labelledby="retirement-eligibility-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 id="retirement-eligibility-heading" className="text-sm font-semibold text-slate-50">
                MA eligibility quick reference
              </h2>
            </div>

            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3 rounded-md bg-slate-900/50 px-3 py-2">
                <dt className="text-slate-400">Group 1 — General</dt>
                <dd className="font-mono text-slate-200">Age 55 (pre-2012) / 60 (post)</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-slate-900/50 px-3 py-2">
                <dt className="text-slate-400">Group 2 — Hazardous</dt>
                <dd className="font-mono text-slate-200">Age 55 (both eras)</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-slate-900/50 px-3 py-2">
                <dt className="text-slate-400">Group 3 — State Police</dt>
                <dd className="font-mono text-slate-200">20+ YOS, any age</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-slate-900/50 px-3 py-2">
                <dt className="text-slate-400">Group 4 — Police / Fire</dt>
                <dd className="font-mono text-slate-200">Age 45 (pre-2012) / 50 (post)</dd>
              </div>
            </dl>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-slate-800 px-2 py-1.5">
                <span className="block text-slate-500">Vesting</span>
                <span className="font-semibold text-slate-200">10 years of service</span>
              </div>
              <div className="rounded-md border border-slate-800 px-2 py-1.5">
                <span className="block text-slate-500">Statutory cap</span>
                <span className="font-semibold text-slate-200">80% of avg salary</span>
              </div>
            </div>
          </article>

          <article
            aria-labelledby="reform-2012-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm md:col-span-2"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 id="reform-2012-heading" className="text-sm font-semibold text-slate-50">
                What changed on April 2, 2012?
              </h2>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">
              Massachusetts pension reform (Chapter 176 of the Acts of 2011) tightened
              eligibility and benefits for members hired on or after April 2, 2012.
              Members already in service before that date kept the older, more
              favorable rules. Your hire date determines which set applies — the
              calculator above asks for it because it materially changes your
              estimate.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Hired before Apr 2, 2012
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Salary average</span>
                    <span className="font-mono text-slate-200">Highest 3 yrs</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Vesting</span>
                    <span className="font-mono text-slate-200">10 yrs</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">General eligibility</span>
                    <span className="font-mono text-slate-200">20+ YOS any age, or 55 + 10 YOS</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Age factor schedule</span>
                    <span className="font-mono text-slate-200">Single linear table</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Anti-spiking rule</span>
                    <span className="font-mono text-slate-200">None</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Hired on / after Apr 2, 2012
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Salary average</span>
                    <span className="font-mono text-slate-200">Highest 5 yrs</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Vesting</span>
                    <span className="font-mono text-slate-200">10 yrs (required)</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">General eligibility</span>
                    <span className="font-mono text-slate-200">Group min age + 10 YOS</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Age factor schedule</span>
                    <span className="font-mono text-slate-200">Reduced if &lt;30 YOS</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-slate-500">Anti-spiking rule</span>
                    <span className="font-mono text-slate-200">10% / 7% caps</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full min-w-[34rem] text-[11px]">
                <thead className="bg-slate-900/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Group</th>
                    <th className="px-3 py-2 font-semibold">Pre-2012 minimum</th>
                    <th className="px-3 py-2 font-semibold">Post-2012 minimum</th>
                    <th className="px-3 py-2 font-semibold">What it means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-100">Group 1<br /><span className="text-[10px] font-normal text-slate-500">General employees</span></td>
                    <td className="px-3 py-2 font-mono">Age 55 + 10 YOS<br /><span className="text-slate-500">or 20+ YOS any age</span></td>
                    <td className="px-3 py-2 font-mono text-amber-300">Age 60 + 10 YOS</td>
                    <td className="px-3 py-2 text-slate-400">Must work 5 more years to start collecting.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-100">Group 2<br /><span className="text-[10px] font-normal text-slate-500">Hazardous (Local 190)</span></td>
                    <td className="px-3 py-2 font-mono">Age 55 + 10 YOS<br /><span className="text-slate-500">or 20+ YOS any age</span></td>
                    <td className="px-3 py-2 font-mono">Age 55 + 10 YOS</td>
                    <td className="px-3 py-2 text-slate-400">Min age unchanged, but 5-yr salary avg + reduced &lt;30 YOS factors lower the benefit.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-100">Group 3<br /><span className="text-[10px] font-normal text-slate-500">State Police</span></td>
                    <td className="px-3 py-2 font-mono">Age 55 + 10 YOS<br /><span className="text-slate-500">or 20+ YOS any age</span></td>
                    <td className="px-3 py-2 font-mono text-amber-300">Age 55 + 10 YOS</td>
                    <td className="px-3 py-2 text-slate-400">Loses the &quot;retire at any age with 20 yrs&quot; option for new hires.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-100">Group 4<br /><span className="text-[10px] font-normal text-slate-500">Police / Fire / Corrections</span></td>
                    <td className="px-3 py-2 font-mono">Age 45 + 20 YOS<br /><span className="text-slate-500">or 55 + 10 YOS</span></td>
                    <td className="px-3 py-2 font-mono text-amber-300">Age 50 + 10 YOS</td>
                    <td className="px-3 py-2 text-slate-400">Earliest retirement age moves up by 5 years; 10 YOS now required.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-3">
              <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="font-semibold text-slate-200">3 vs. 5 yr salary average</p>
                <p className="mt-0.5 text-slate-500">
                  Spreading over 5 years usually drags the average down, since
                  raises typically come late-career.
                </p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="font-semibold text-slate-200">Reduced age factor &lt;30 YOS</p>
                <p className="mt-0.5 text-slate-500">
                  Post-2012 hires with under 30 years of service start at 1.45%
                  per year, not 1.5–2.0%, and grow more slowly.
                </p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="font-semibold text-slate-200">Anti-spiking caps</p>
                <p className="mt-0.5 text-slate-500">
                  Salary growth in years used for the average is limited so a
                  late promotion can&apos;t artificially inflate the pension.
                </p>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              Source: Chapter 176 of the Acts of 2011; M.G.L. c. 32 §§ 5, 7, 22.
              Confirm specifics with the{" "}
              <a
                href="https://www.mass.gov/orgs/massachusetts-state-retirement-board"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200"
              >
                Massachusetts State Retirement Board
              </a>
              .
            </p>
          </article>

          <article
            aria-labelledby="retirement-benefits-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm md:col-span-2"
          >
            <div className="mb-4 space-y-2">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 id="retirement-benefits-heading" className="text-sm font-semibold text-slate-50">
                    Pension estimator
                  </h2>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="text-[11px] text-slate-400 hover:text-blue-300"
                >
                  Edit profile to pre-fill →
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                Uses MSRB-validated formulas (M.G.L. c. 32). Supports
                multi-group service and a year-by-year projection through the
                80% statutory cap.
              </p>
            </div>
            <div role="group" aria-label="Interactive Massachusetts pension calculator">
              <RetirementCalculatorEmbed
                initialGroup={initialGroup as "1" | "2" | "3" | "4" | null}
                initialHireDateIso={initialHireDateIso}
                initialAverageSalary={initialAverageSalary}
                initialTargetRetirementDateIso={targetRetirementDateIso}
              />
            </div>
          </article>

          <article
            aria-labelledby="retirement-resources-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm md:col-span-2"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 id="retirement-resources-heading" className="text-sm font-semibold text-slate-50">
                Official Massachusetts resources
              </h2>
            </div>

            <ul className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
              <li>
                <a
                  href="https://www.mass.gov/orgs/massachusetts-state-retirement-board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>Massachusetts State Retirement Board</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.mass.gov/info-details/your-retirement-group-classification"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>Group classification reference</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.mass.gov/info-details/calculate-your-pension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>Official MSRB pension calculator</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.mass.gov/info-details/applying-for-retirement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>How to apply for retirement</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.mass.gov/info-details/your-retirement-options-options-a-b-and-c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>Retirement options A, B, and C</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.mass.gov/info-details/cost-of-living-adjustment-cola-for-retirees"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2 transition-colors hover:border-blue-500/40 hover:bg-slate-900/60"
                >
                  <span>Cost-of-living adjustment (COLA)</span>
                  <span className="text-slate-500">↗</span>
                </a>
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              These are official Massachusetts state resources. For Local
              190-specific guidance, contact your executive board representative.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

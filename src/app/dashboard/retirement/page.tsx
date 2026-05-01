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

	// Get user ID and profile data
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
              Review retirement information and tools. Signed in as{" "}
              <span className="font-medium text-slate-100">{email}</span>.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-end gap-1 md:mt-0">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

	        {/* Prominent countdown at the top */}
	        <RetirementCountdownCard targetRetirementDateIso={targetRetirementDateIso} hideUpdateLink />

	        <section className="grid gap-4 md:grid-cols-2">
	          <RetirementDateForm initialTargetDateIso={targetRetirementDateIso} userId={userId} userEmail={email} />
          <article
            aria-labelledby="retirement-service-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm"
          >
            <div className="space-y-6">
              <div>
                <h2
                  id="retirement-service-heading"
                  className="text-sm font-semibold text-slate-50"
                >
                  Service time tracker
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  Get a high-level view of your creditable service and potential
                  retirement eligibility under Massachusetts public employee
                  retirement systems. Exact eligibility depends on your specific
                  board and group classification.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <dt className="text-[11px] text-slate-400">Creditable service</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-50">
                    Coming soon
                  </dd>
                  <p className="mt-1 text-[11px] text-slate-500">
                    This area will show years of service recorded with your
                    retirement board.
                  </p>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">Estimated eligibility</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-50">
                    Coming soon
                  </dd>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Planned tools will highlight key age and service milestones
                    for common Massachusetts groups.
                  </p>
                </div>
              </dl>
            </div>
          </article>

          <article
            aria-labelledby="retirement-timeline-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm"
          >
            <div className="space-y-6">
              <div>
                <h2
                  id="retirement-timeline-heading"
                  className="text-sm font-semibold text-slate-50"
                >
                  Retirement timeline
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  Map out the major checkpoints on your path to retirement, from
                  early career through your target retirement date.
                </p>
              </div>
              <ol className="mt-1 space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <div>
                    <p className="font-medium text-slate-100">50 years of service</p>
                    <p className="text-[11px] text-slate-400">
                      Many Massachusetts systems recognize key vesting
                      milestones as you accumulate creditable service.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <div>
                    <p className="font-medium text-slate-100">Age &amp; service eligibility</p>
                    <p className="text-[11px] text-slate-400">
                      Your group classification and hire date determine when you
                      may first be eligible for a retirement allowance.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <div>
                    <p className="font-medium text-slate-100">Target retirement window</p>
                    <p className="text-[11px] text-slate-400">
                      Work with your Local 190 representatives and retirement
                      board to pick a window that aligns with your career,
                      benefits, and family plans.
                    </p>
                  </div>
                </li>
              </ol>
              <p className="text-[11px] text-slate-500">
                This timeline is informational only and does not replace an
                official estimate from your retirement board.
              </p>
            </div>
          </article>

          <article
            aria-labelledby="retirement-benefits-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm md:col-span-2"
          >
            <div className="space-y-6">
              <div>
                <h2
                  id="retirement-benefits-heading"
                  className="text-sm font-semibold text-slate-50"
                >
                  Benefit estimates
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  Understand how age, years of service, and group classification
                  can affect your pension under Massachusetts law. Use the
                  calculator below for rough planning only.
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Set your retirement group, hire date, and average salary on
                  the{" "}
                  <Link
                    href="/dashboard/profile"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    profile page
                  </Link>{" "}
                  and they&apos;ll pre-fill here automatically.
                </p>
              </div>
              <div
                role="group"
                aria-label="Interactive Massachusetts pension calculator"
                className="mt-1 flex justify-center"
              >
                <RetirementCalculatorEmbed
                  initialGroup={initialGroup as "1" | "2" | "3" | "4" | null}
                  initialHireDateIso={initialHireDateIso}
                  initialAverageSalary={initialAverageSalary}
                  initialTargetRetirementDateIso={targetRetirementDateIso}
                />
              </div>
            </div>
          </article>

          <article
            aria-labelledby="retirement-resources-heading"
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <h2
                  id="retirement-resources-heading"
                  className="text-sm font-semibold text-slate-50"
                >
                  Resources &amp; documents
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  Centralize the retirement forms and references you use most
                  often, alongside union-specific guidance from NEPBA Local 190.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <Link
                    href="#"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    Massachusetts public employee retirement overview (PDF)
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    Sample retirement application checklist
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-blue-300 hover:text-blue-200"
                  >
                    Beneficiary and survivor benefit basics
                  </Link>
                </li>
              </ul>
              <p className="text-[11px] text-slate-500">
                Additional digital forms, Local 190-specific guidance, and
                contract references will be added here over time.
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}


import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { SignOutButton } from "./SignOutButton";
import { RetirementCountdownCard } from "./RetirementCountdownCard";

export default async function DashboardPage() {
  const hasDb = !!process.env.DATABASE_URL;
  let session: Session | null = null;
  let targetRetirementDateIso: string | null = null;

  if (hasDb) {
    const [{ auth }, { db, users }] = await Promise.all([
      import("@/lib/auth"),
      import("@/lib/db"),
    ]);
    session = await auth();

    if (session?.user?.email) {
      const userWithProfile = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        with: { profile: true },
      });
      const target = userWithProfile?.profile?.targetRetirementDate ?? null;
      targetRetirementDateIso = target ? target.toISOString() : null;
    }
  }

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const email = session.user.email ?? "Member";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-500/30">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col gap-4 border-b border-slate-800/60 pb-6 md:flex-row md:items-end md:justify-between animate-fade-in">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              NEPBA Local 190
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Member Dashboard
            </h1>
            <p className="text-sm text-slate-400 animate-slide-up delay-100">
              Welcome back, <span className="font-medium text-slate-200">{email}</span>.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 animate-slide-in-left delay-200">
            <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
              <Link
                href="/dashboard/profile"
                className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                My Profile
              </Link>
              <div className="h-4 w-px bg-slate-700" />
              <SignOutButton />
            </div>
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to public site
            </Link>
          </div>
        </header>

        {/* Hero countdown */}
        <section className="animate-slide-up delay-100">
          <RetirementCountdownCard targetRetirementDateIso={targetRetirementDateIso} />
        </section>

        {/* Tool grid */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <article className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-lg animate-slide-up delay-150">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold text-white">Grievances</h2>
            <p className="mb-5 flex-grow text-sm leading-relaxed text-slate-400">
              File a new issue, document workplace concerns, and track status.
            </p>
            <Link
              href="/dashboard/grievances"
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition-colors hover:bg-blue-500"
            >
              Open Portal
            </Link>
          </article>

          <article className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg animate-slide-up delay-200">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold text-white">Benefits</h2>
            <p className="mb-5 flex-grow text-sm leading-relaxed text-slate-400">
              Dental, vision, life insurance details, forms, and contact info.
            </p>
            <Link
              href="/dashboard/benefits"
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition-colors hover:bg-emerald-500"
            >
              View Benefits
            </Link>
          </article>

          <article className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-lg animate-slide-up delay-250">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold text-white">Retirement</h2>
            <p className="mb-5 flex-grow text-sm leading-relaxed text-slate-400">
              Pension estimator, year-by-year projection, and target date.
            </p>
            <Link
              href="/dashboard/retirement"
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-900/20 transition-colors hover:bg-sky-500"
            >
              Open Retirement Tools
            </Link>
          </article>

          <article className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg animate-slide-up delay-300">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold text-white">Paycheck Audit</h2>
            <p className="mb-5 flex-grow text-sm leading-relaxed text-slate-400">
              Verify overtime, differentials, and FLSA compliance.
            </p>
            <Link
              href="/dashboard/audit"
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-900/20 transition-colors hover:bg-amber-500"
            >
              Launch Auditor
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}

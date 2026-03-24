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

        <section className="grid gap-6 md:grid-cols-3">
          {/* Column 1: Core Union Functions */}
          <div className="space-y-6">
            <article className="premium-card p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up delay-100 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Grievances & Issues</h2>
              </div>

              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Start a new issue, document workplace concerns, and check status of ongoing grievances.
              </p>

              <Link
                href="/dashboard/grievances"
                className="mt-auto w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5"
              >
                Open Grievance Portal
              </Link>
            </article>
          </div>

          {/* Column 2: Benefits & Resources */}
          <div className="space-y-6">
            <article className="glass-card rounded-xl p-6 hover:border-slate-600/50 transition-all animate-slide-up delay-200 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Benefits & Documents</h2>
              </div>

              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Access your dental, vision, and life insurance benefits, download forms, and find contact information.
              </p>

              <Link
                href="/dashboard/benefits"
                className="mt-auto w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition-all hover:bg-emerald-500 hover:-translate-y-0.5"
              >
                View Benefits
              </Link>
            </article>
          </div>

          {/* Column 3: Retirement & Audit */}
          <div className="space-y-6 animate-slide-up delay-300">
            <RetirementCountdownCard targetRetirementDateIso={targetRetirementDateIso} />

            <article className="relative overflow-hidden rounded-xl border border-yellow-600/30 bg-gradient-to-br from-slate-900 to-yellow-950/20 p-5 shadow-lg group hover:border-yellow-500/50 transition-all duration-300">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-yellow-500/10 blur-xl group-hover:bg-yellow-500/20 transition-colors" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-yellow-500">Forensic Audit Tool</h2>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">My Paycheck Auditor</h3>

                <p className="text-sm text-slate-300 mb-4">
                  Analyze overtime, differentials, and FLSA compliance instantly.
                </p>

                <Link
                  href="/dashboard/audit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-yellow-500 hover:-translate-y-0.5 group-hover:shadow-yellow-900/20"
                >
                  <span>Launch Auditor</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </article>
          </div>

        </section>
      </div>
    </main>
  );
}

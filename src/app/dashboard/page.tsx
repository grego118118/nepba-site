import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardPage() {
  const hasDb = !!process.env.DATABASE_URL;
  let session: any = null;

  if (hasDb) {
    const { auth } = await import("@/lib/auth");
    session = await auth();
  }

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const email = session.user.email ?? "Member";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
              NEPBA Local 190
            </p>
            <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
              Member dashboard
            </h1>
            <p className="text-xs text-slate-400 md:text-sm">
              Welcome back, <span className="font-medium text-slate-100">{email}</span>.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-end gap-1 md:mt-0">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">
                Signed in as <span className="font-medium text-slate-100">{email}</span>
              </p>
              <SignOutButton />
            </div>
            <Link
              href="/"
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              ← Public site
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-50">Grievances & issues</h2>
            <p className="mt-2 text-xs text-slate-300 md:text-sm">
              Start a new issue, document workplace concerns, and see recent
              updates from your Local 190 representatives.
            </p>
            <p className="mt-3 text-[11px] text-slate-500">
              Workflow tools will be added here as the portal grows.
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-50">Contracts & resources</h2>
            <p className="mt-2 text-xs text-slate-300 md:text-sm">
              Quickly access contract language, side letters, and reference
              documents relevant to your assignment and seniority.
            </p>
            <p className="mt-3 text-[11px] text-slate-500">
              Links and document search will appear in this section.
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-50">Retirement & profile</h2>
            <p className="mt-2 text-xs text-slate-300 md:text-sm">
              Track your service, understand retirement timelines, and keep your
              contact information up to date.
            </p>
            <p className="mt-3 text-[11px] text-slate-500">
              Personalized tools and settings will live here.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}


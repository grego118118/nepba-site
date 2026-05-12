import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
        PatrolPlan
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Traffic patterns for major events, made for the officers running them.
      </h1>
      <p className="mt-4 max-w-prose text-slate-600">
        Plan posts, traffic flow, and assignments for events like commencement,
        football Saturdays, and Mullins Center shows. Officers see their post on
        their phone; command sees the full plan on the big screen.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/login"
          className="card flex flex-col gap-2 p-6 transition hover:border-blue-300 hover:shadow-md"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Supervisor
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Sign in to plan an event
          </span>
          <span className="text-sm text-slate-600">
            Build the plan, assign officers, publish to the team.
          </span>
        </Link>

        <div className="card flex flex-col gap-2 p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Officer
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Use the link your supervisor sent
          </span>
          <span className="text-sm text-slate-600">
            Open the text or email on your phone — no password needed.
          </span>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { events, plans } from "@/lib/schema";
import { requireSupervisor } from "@/lib/session-helpers";
import { NewEventButton } from "./new-event-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireSupervisor();
  const rows = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      eventType: events.eventType,
      startsAt: events.startsAt,
      planId: plans.id,
      planStatus: plans.status,
      currentPhase: plans.currentPhase,
    })
    .from(events)
    .leftJoin(plans, eq(plans.eventId, events.id))
    .where(eq(events.departmentId, user.departmentId))
    .orderBy(desc(events.startsAt));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-600">
            Upcoming and past traffic plans for your department.
          </p>
        </div>
        <NewEventButton />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-600">
          No events yet. Create one to start planning.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={`${r.eventId}-${r.planId ?? "none"}`} className="card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {r.eventName}
                    </span>
                    <StatusPill status={r.planStatus} />
                    <span className="text-xs uppercase text-slate-400">
                      {r.eventType}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(r.startsAt).toLocaleString()}
                  </p>
                </div>
                {r.planId ? (
                  <div className="flex gap-2">
                    <Link className="btn-secondary" href={`/plan/${r.planId}`}>
                      Edit plan
                    </Link>
                    <Link
                      className="btn-ghost"
                      href={`/command/${r.planId}`}
                      target="_blank"
                    >
                      Command view
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const styles =
    status === "published"
      ? "bg-emerald-100 text-emerald-800"
      : status === "draft"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

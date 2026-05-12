import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { officers } from "@/lib/schema";
import { requireSupervisor } from "@/lib/session-helpers";
import { RosterClient } from "./roster-client";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const user = await requireSupervisor();
  const rows = await db
    .select()
    .from(officers)
    .where(eq(officers.departmentId, user.departmentId))
    .orderBy(asc(officers.lastName), asc(officers.firstName));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roster</h1>
          <p className="text-sm text-slate-600">
            Officers available to assign to posts.
          </p>
        </div>
      </div>
      <RosterClient officers={rows} />
    </div>
  );
}

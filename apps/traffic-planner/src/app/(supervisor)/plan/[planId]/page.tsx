import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { officers } from "@/lib/schema";
import { loadPlan } from "@/lib/plan-loader";
import { requireSupervisor } from "@/lib/session-helpers";
import { PlannerClient } from "./planner-client";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const user = await requireSupervisor();
  const { planId } = await params;
  const loaded = await loadPlan(planId);
  if (!loaded || loaded.plan.departmentId !== user.departmentId) notFound();

  const roster = await db
    .select()
    .from(officers)
    .where(eq(officers.departmentId, user.departmentId))
    .orderBy(asc(officers.lastName), asc(officers.firstName));

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  return (
    <PlannerClient
      planId={planId}
      initialPlan={loaded.plan}
      initialPosts={loaded.posts}
      initialFeatures={loaded.features}
      roster={roster.filter((o) => o.active)}
      mapboxToken={mapboxToken}
    />
  );
}

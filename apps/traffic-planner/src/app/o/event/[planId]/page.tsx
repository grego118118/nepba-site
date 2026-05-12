import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { officers } from "@/lib/schema";
import { loadPlan } from "@/lib/plan-loader";
import { getOfficerSession } from "@/lib/officer-session";
import { OfficerView } from "./officer-view";

export const dynamic = "force-dynamic";

export default async function OfficerEventPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const session = await getOfficerSession();
  if (!session || session.planId !== planId) {
    redirect("/");
  }
  const loaded = await loadPlan(planId);
  if (!loaded) redirect("/");

  if (loaded.plan.status !== "published") {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Plan not published yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your supervisor hasn&apos;t published this plan. Check back shortly.
        </p>
      </main>
    );
  }

  const [me] = await db
    .select()
    .from(officers)
    .where(eq(officers.id, session.officerId))
    .limit(1);
  if (!me) redirect("/");

  const myPosts = loaded.posts.filter((p) =>
    p.assignments.some((a) => a.officerId === me.id),
  );

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  return (
    <OfficerView
      me={{
        id: me.id,
        name: `${me.firstName} ${me.lastName}`,
        badge: me.badgeNumber,
      }}
      plan={loaded.plan}
      posts={loaded.posts}
      features={loaded.features}
      myPostIds={myPosts.map((p) => p.id)}
      mapboxToken={mapboxToken}
    />
  );
}

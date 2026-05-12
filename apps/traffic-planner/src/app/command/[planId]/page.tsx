import { notFound } from "next/navigation";

import { loadPlan } from "@/lib/plan-loader";
import { CommandView } from "./command-view";

export const dynamic = "force-dynamic";

export default async function CommandPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const loaded = await loadPlan(planId);
  if (!loaded) notFound();
  return (
    <CommandView
      plan={loaded.plan}
      posts={loaded.posts}
      features={loaded.features}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
    />
  );
}

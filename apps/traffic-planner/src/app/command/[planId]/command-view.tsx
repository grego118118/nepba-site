"use client";

import { useEffect, useState } from "react";

import { PlanMap } from "@/components/plan-map";
import type { MapFeature, Post } from "@/lib/schema";

type Phase = "incoming" | "outgoing";

type PlanLite = {
  id: string;
  eventName: string;
  currentPhase: "incoming" | "outgoing" | "both";
  mapCenterLng: number | null;
  mapCenterLat: number | null;
  mapZoom: number | null;
  startsAt: Date;
};

type PostWithAssignments = Post & {
  assignments: {
    officerId: string;
    badgeNumber: string;
    firstName: string;
    lastName: string;
    rank: string | null;
  }[];
};

export function CommandView(props: {
  plan: PlanLite;
  posts: PostWithAssignments[];
  features: MapFeature[];
  mapboxToken: string;
}) {
  const [phase, setPhase] = useState<Phase>(
    props.plan.currentPhase === "outgoing" ? "outgoing" : "incoming",
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/plans/${props.plan.id}/events`);
    es.addEventListener("phase", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.phase === "incoming" || data.phase === "outgoing") {
          setPhase(data.phase);
        }
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [props.plan.id]);

  const visiblePosts = props.posts.filter((p) => p.phase === "both" || p.phase === phase);
  const totalPosts = visiblePosts.length;
  const filled = visiblePosts.filter((p) => p.assignments.length > 0).length;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Command</p>
          <h1 className="text-xl font-bold">{props.plan.eventName}</h1>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-400">Phase</p>
            <p
              className={`text-lg font-bold ${
                phase === "incoming" ? "text-emerald-400" : "text-orange-400"
              }`}
            >
              {phase.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Posts filled</p>
            <p className="text-lg font-bold">
              {filled}/{totalPosts}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Now</p>
            <p className="font-mono text-lg">{now.toLocaleTimeString()}</p>
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[1fr_360px] overflow-hidden">
        <div className="relative">
          <PlanMap
            mapboxToken={props.mapboxToken}
            center={[
              props.plan.mapCenterLng ?? -72.5267,
              props.plan.mapCenterLat ?? 42.3868,
            ]}
            zoom={props.plan.mapZoom ?? 15}
            phase={phase}
            posts={props.posts.map((p) => ({
              id: p.id,
              label: p.label,
              phase: p.phase,
              lng: p.lng,
              lat: p.lat,
              assignedCount: p.assignments.length,
            }))}
            features={props.features}
            selectedPostId={null}
            drawingFeatureType={null}
            interactive={false}
          />
        </div>
        <aside className="overflow-y-auto border-l border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            Posts — {phase}
          </div>
          <ul className="divide-y divide-slate-800">
            {visiblePosts.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      p.assignments.length > 0
                        ? "bg-emerald-900 text-emerald-300"
                        : "bg-rose-900 text-rose-300"
                    }`}
                  >
                    {p.assignments.length > 0 ? "manned" : "open"}
                  </span>
                </div>
                {p.assignments.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                    {p.assignments.map((a) => (
                      <li key={a.officerId}>
                        <span className="font-mono text-slate-500">
                          {a.badgeNumber}
                        </span>{" "}
                        {a.lastName}, {a.firstName}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
            {visiblePosts.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                No posts for this phase yet.
              </li>
            ) : null}
          </ul>
        </aside>
      </main>
    </div>
  );
}

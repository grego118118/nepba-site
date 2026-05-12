"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanMap } from "@/components/plan-map";
import type { MapFeature, Post } from "@/lib/schema";

type Phase = "incoming" | "outgoing";

type PlanLite = {
  id: string;
  currentPhase: "incoming" | "outgoing" | "both";
  mapCenterLng: number | null;
  mapCenterLat: number | null;
  mapZoom: number | null;
  eventName: string;
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

type Props = {
  me: { id: string; name: string; badge: string };
  plan: PlanLite;
  posts: PostWithAssignments[];
  features: MapFeature[];
  myPostIds: string[];
  mapboxToken: string;
};

export function OfficerView(props: Props) {
  const [phase, setPhase] = useState<Phase>(
    props.plan.currentPhase === "outgoing" ? "outgoing" : "incoming",
  );
  const [tab, setTab] = useState<"map" | "post">("map");

  // Subscribe to live phase changes.
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

  const myPosts = useMemo(
    () => props.posts.filter((p) => props.myPostIds.includes(p.id)),
    [props.posts, props.myPostIds],
  );
  const myCurrentPost = useMemo(
    () => myPosts.find((p) => p.phase === "both" || p.phase === phase) ?? myPosts[0],
    [myPosts, phase],
  );

  const postPoints = props.posts.map((p) => ({
    id: p.id,
    label: p.label,
    phase: p.phase,
    lng: p.lng,
    lat: p.lat,
    assignedCount: p.assignments.length,
  }));

  const center: [number, number] = myCurrentPost
    ? [myCurrentPost.lng, myCurrentPost.lat]
    : [props.plan.mapCenterLng ?? -72.5267, props.plan.mapCenterLat ?? 42.3868];
  const zoom = myCurrentPost ? 17 : (props.plan.mapZoom ?? 15);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">PatrolPlan</p>
            <h1 className="text-base font-semibold text-slate-900">
              {props.plan.eventName}
            </h1>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div className="font-medium text-slate-900">{props.me.name}</div>
            <div className="font-mono">#{props.me.badge}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setPhase("incoming")}
            className={`rounded px-2 py-1.5 font-medium ${
              phase === "incoming" ? "bg-white text-emerald-700 shadow" : "text-slate-600"
            }`}
          >
            Incoming
          </button>
          <button
            onClick={() => setPhase("outgoing")}
            className={`rounded px-2 py-1.5 font-medium ${
              phase === "outgoing" ? "bg-white text-orange-700 shadow" : "text-slate-600"
            }`}
          >
            Outgoing
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 bg-white p-1 text-sm shadow-sm sm:hidden">
        <button
          onClick={() => setTab("map")}
          className={`rounded px-2 py-1 ${
            tab === "map" ? "bg-blue-50 text-blue-700" : "text-slate-600"
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setTab("post")}
          className={`rounded px-2 py-1 ${
            tab === "post" ? "bg-blue-50 text-blue-700" : "text-slate-600"
          }`}
        >
          My post
        </button>
      </div>

      <main className="flex flex-1 flex-col sm:grid sm:grid-cols-[1fr_360px] sm:overflow-hidden">
        <section
          className={`relative ${tab === "map" ? "block" : "hidden"} h-[60vh] sm:block sm:h-auto`}
        >
          <PlanMap
            mapboxToken={props.mapboxToken}
            center={center}
            zoom={zoom}
            phase={phase}
            posts={postPoints.map((p) =>
              props.myPostIds.includes(p.id)
                ? { ...p, label: `★ ${p.label}` }
                : p,
            )}
            features={props.features}
            selectedPostId={myCurrentPost?.id ?? null}
            drawingFeatureType={null}
          />
        </section>

        <aside
          className={`${tab === "post" ? "block" : "hidden"} flex-1 overflow-y-auto bg-white p-4 sm:block sm:border-l sm:border-slate-200`}
        >
          {myCurrentPost ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600">
                  Your post — {phase}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {myCurrentPost.label}
                </h2>
                {myCurrentPost.dutyDescription ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {myCurrentPost.dutyDescription}
                  </p>
                ) : null}
              </div>

              {myCurrentPost.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={myCurrentPost.photoUrl}
                  alt="Reference"
                  className="w-full rounded-md border border-slate-200"
                />
              ) : null}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {myCurrentPost.shiftStart ? (
                  <DetailRow label="Shift start" value={formatTime(myCurrentPost.shiftStart)} />
                ) : null}
                {myCurrentPost.shiftEnd ? (
                  <DetailRow label="Shift end" value={formatTime(myCurrentPost.shiftEnd)} />
                ) : null}
                {myCurrentPost.radioChannel ? (
                  <DetailRow label="Radio" value={myCurrentPost.radioChannel} />
                ) : null}
                {myCurrentPost.supervisorContact ? (
                  <DetailRow label="Supervisor" value={myCurrentPost.supervisorContact} />
                ) : null}
              </div>

              {myCurrentPost.equipment ? (
                <div>
                  <p className="label">Equipment</p>
                  <p className="mt-1 text-sm text-slate-700">{myCurrentPost.equipment}</p>
                </div>
              ) : null}

              <a
                className="btn-primary w-full"
                href={`https://www.google.com/maps?q=${myCurrentPost.lat},${myCurrentPost.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
              {myCurrentPost.supervisorContact ? (
                <a
                  className="btn-secondary w-full"
                  href={`tel:${myCurrentPost.supervisorContact.replace(/[^+\d]/g, "")}`}
                >
                  Call supervisor
                </a>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No post assigned to you for this phase. Check the other phase or your supervisor.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-0.5 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function formatTime(d: Date | string) {
  return new Date(d).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

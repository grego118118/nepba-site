"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PlanMap, type DraftFeature } from "@/components/plan-map";
import {
  FEATURE_META,
  FEATURE_TYPES,
  type FeatureType,
} from "@/lib/feature-types";
import type { MapFeature, Officer, Post } from "@/lib/schema";
import {
  assignOfficerAction,
  createFeatureAction,
  createPostAction,
  deleteFeatureAction,
  deletePostAction,
  issueOfficerLinkAction,
  publishPlanAction,
  setMapViewAction,
  setPhaseAction,
  unassignOfficerAction,
  unpublishPlanAction,
  updatePostAction,
} from "./actions";

type Phase = "incoming" | "outgoing";

type PlanLite = {
  id: string;
  status: "draft" | "published" | "archived";
  currentPhase: "incoming" | "outgoing" | "both";
  mapCenterLng: number | null;
  mapCenterLat: number | null;
  mapZoom: number | null;
  eventName: string;
  startsAt: Date;
  endsAt: Date;
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
  planId: string;
  initialPlan: PlanLite;
  initialPosts: PostWithAssignments[];
  initialFeatures: MapFeature[];
  roster: Officer[];
  mapboxToken: string;
};

export function PlannerClient(props: Props) {
  const [phase, setPhase] = useState<Phase>(
    props.initialPlan.currentPhase === "outgoing" ? "outgoing" : "incoming",
  );
  const [posts, setPosts] = useState(props.initialPosts);
  const [features, setFeatures] = useState(props.initialFeatures);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drawingFeatureType, setDrawingFeatureType] = useState<FeatureType | null>(null);
  const [pendingPostAt, setPendingPostAt] = useState<{ lng: number; lat: number } | null>(null);
  const [newPostLabel, setNewPostLabel] = useState("");
  const [linkPanelPostId, setLinkPanelPostId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const center: [number, number] = [
    props.initialPlan.mapCenterLng ?? -72.5267,
    props.initialPlan.mapCenterLat ?? 42.3868,
  ];
  const zoom = props.initialPlan.mapZoom ?? 15;

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const postPoints = useMemo(
    () =>
      posts.map((p) => ({
        id: p.id,
        label: p.label,
        phase: p.phase,
        lng: p.lng,
        lat: p.lat,
        assignedCount: p.assignments.length,
      })),
    [posts],
  );

  async function flipPhase(next: Phase) {
    setPhase(next);
    startTransition(async () => {
      await setPhaseAction(props.planId, next);
    });
  }

  async function handleMapClick(loc: { lng: number; lat: number }) {
    if (drawingFeatureType) return;
    setPendingPostAt(loc);
    setNewPostLabel("");
  }

  async function commitNewPost() {
    if (!pendingPostAt || !newPostLabel.trim()) return;
    const phaseValue = phase;
    const result = await createPostAction({
      planId: props.planId,
      label: newPostLabel.trim(),
      lng: pendingPostAt.lng,
      lat: pendingPostAt.lat,
      phase: phaseValue,
    });
    if (!result.ok) return;
    const optimistic: PostWithAssignments = {
      id: result.postId,
      planId: props.planId,
      label: newPostLabel.trim(),
      dutyDescription: null,
      phase: phaseValue,
      lng: pendingPostAt.lng,
      lat: pendingPostAt.lat,
      photoUrl: null,
      equipment: null,
      shiftStart: null,
      shiftEnd: null,
      radioChannel: null,
      supervisorContact: null,
      sortOrder: 0,
      createdAt: new Date(),
      assignments: [],
    };
    setPosts((prev) => [...prev, optimistic]);
    setSelectedPostId(result.postId);
    setPendingPostAt(null);
    setNewPostLabel("");
  }

  async function handleDraftComplete(draft: DraftFeature) {
    const ft = draft.featureType;
    const meta = FEATURE_META[ft];
    const geometry: GeoJSON.Geometry =
      meta.geometry === "Point"
        ? { type: "Point", coordinates: draft.coordinates as number[] }
        : meta.geometry === "LineString"
          ? { type: "LineString", coordinates: draft.coordinates as number[][] }
          : { type: "Polygon", coordinates: draft.coordinates as number[][][] };
    const res = await createFeatureAction({
      planId: props.planId,
      featureType: ft,
      phase,
      label: null,
      geometry,
      properties: {},
    });
    setDrawingFeatureType(null);
    if (res.ok) {
      setFeatures((prev) => [
        ...prev,
        {
          id: res.featureId,
          planId: props.planId,
          featureType: ft,
          phase,
          label: null,
          geometry,
          properties: {},
          sortOrder: 0,
          createdAt: new Date(),
        } as MapFeature,
      ]);
    }
  }

  async function removeFeature(id: string) {
    await deleteFeatureAction(props.planId, id);
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  }

  async function updatePostField(
    postId: string,
    fields: Partial<PostWithAssignments>,
  ) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? ({ ...p, ...fields } as PostWithAssignments) : p)),
    );
    const payload: Record<string, unknown> = {
      planId: props.planId,
      postId,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v instanceof Date) {
        payload[k] = v.toISOString();
      } else {
        payload[k] = v;
      }
    }
    await updatePostAction(payload);
  }

  async function removePost(postId: string) {
    await deletePostAction(props.planId, postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) setSelectedPostId(null);
  }

  async function assignOfficer(postId: string, officerId: string) {
    const officer = props.roster.find((o) => o.id === officerId);
    if (!officer) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              assignments: p.assignments.find((a) => a.officerId === officerId)
                ? p.assignments
                : [
                    ...p.assignments,
                    {
                      officerId,
                      badgeNumber: officer.badgeNumber,
                      firstName: officer.firstName,
                      lastName: officer.lastName,
                      rank: officer.rank,
                    },
                  ],
            }
          : p,
      ),
    );
    await assignOfficerAction({ planId: props.planId, postId, officerId });
  }

  async function unassignOfficer(postId: string, officerId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, assignments: p.assignments.filter((a) => a.officerId !== officerId) }
          : p,
      ),
    );
    await unassignOfficerAction(props.planId, postId, officerId);
  }

  async function togglePublish() {
    if (props.initialPlan.status === "published") {
      await unpublishPlanAction(props.planId);
    } else {
      await publishPlanAction(props.planId);
    }
    window.location.reload();
  }

  function onMapViewChange(view: { center: [number, number]; zoom: number }) {
    void setMapViewAction(props.planId, view);
  }

  async function generateLink(postId: string, officerId: string) {
    const res = await issueOfficerLinkAction(props.planId, officerId);
    if (res.ok) {
      setGeneratedLink(res.url);
      setLinkPanelPostId(postId);
    }
  }

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-[260px_1fr_360px] gap-4">
      <aside className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <Link className="text-xs text-slate-500" href="/dashboard">
            ← All events
          </Link>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            {props.initialPlan.eventName}
          </h2>
          <p className="text-xs text-slate-600">
            {new Date(props.initialPlan.startsAt).toLocaleString()}
          </p>
        </div>

        <div className="border-b border-slate-200 p-4">
          <div className="label">Phase</div>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 text-sm">
            <button
              onClick={() => flipPhase("incoming")}
              className={`rounded px-2 py-1.5 font-medium ${
                phase === "incoming" ? "bg-white text-emerald-700 shadow" : "text-slate-600"
              }`}
            >
              Incoming
            </button>
            <button
              onClick={() => flipPhase("outgoing")}
              className={`rounded px-2 py-1.5 font-medium ${
                phase === "outgoing" ? "bg-white text-orange-700 shadow" : "text-slate-600"
              }`}
            >
              Outgoing
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="label">Draw</div>
            {drawingFeatureType ? (
              <button
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setDrawingFeatureType(null)}
              >
                Cancel
              </button>
            ) : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {FEATURE_TYPES.map((ft) => (
              <button
                key={ft}
                onClick={() =>
                  setDrawingFeatureType((cur) => (cur === ft ? null : ft))
                }
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs ${
                  drawingFeatureType === ft
                    ? "bg-blue-50 text-blue-800 ring-1 ring-blue-400"
                    : "hover:bg-slate-100"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: FEATURE_META[ft].color }}
                />
                {FEATURE_META[ft].label}
              </button>
            ))}
          </div>
          {drawingFeatureType ? (
            <p className="mt-2 text-xs text-slate-500">
              Click on the map to add points. Double-click to finish.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Click the map (no tool selected) to drop a new officer post.
            </p>
          )}
        </div>

        <div className="p-4">
          <div className="label mb-2">Roster</div>
          <ul className="space-y-1">
            {props.roster.map((o) => (
              <li
                key={o.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/officer-id", o.id);
                }}
                className="flex cursor-grab items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-100"
              >
                <span>
                  <span className="font-mono text-xs text-slate-500">{o.badgeNumber}</span>{" "}
                  {o.lastName}, {o.firstName}
                </span>
              </li>
            ))}
            {props.roster.length === 0 ? (
              <li className="text-xs text-slate-500">
                <Link href="/roster" className="underline">
                  Add officers
                </Link>{" "}
                to start assigning.
              </li>
            ) : null}
          </ul>
        </div>
      </aside>

      <section className="card relative overflow-hidden">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              props.initialPlan.status === "published"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {props.initialPlan.status}
          </span>
          <button className="btn-secondary text-xs" onClick={togglePublish}>
            {props.initialPlan.status === "published" ? "Unpublish" : "Publish"}
          </button>
          <Link
            className="btn-ghost text-xs"
            href={`/command/${props.planId}`}
            target="_blank"
          >
            Command view
          </Link>
          <a
            className="btn-ghost text-xs"
            href={`/api/plans/${props.planId}/pdf`}
            target="_blank"
          >
            PDF briefing
          </a>
        </div>
        <PlanMap
          mapboxToken={props.mapboxToken}
          center={center}
          zoom={zoom}
          phase={phase}
          posts={postPoints}
          features={features}
          selectedPostId={selectedPostId}
          drawingFeatureType={drawingFeatureType}
          onDraftComplete={handleDraftComplete}
          handlers={{
            onMapClick: handleMapClick,
            onPostClick: (id) => setSelectedPostId(id),
            onMapViewChange,
          }}
        />

        {pendingPostAt ? (
          <div className="absolute bottom-4 left-1/2 z-10 w-80 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <p className="text-xs text-slate-500">
              New post at {pendingPostAt.lng.toFixed(5)}, {pendingPostAt.lat.toFixed(5)}
            </p>
            <input
              className="input mt-2"
              autoFocus
              placeholder="Post label (e.g. Gate 4, Stadium Rd)"
              value={newPostLabel}
              onChange={(e) => setNewPostLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewPost();
                if (e.key === "Escape") setPendingPostAt(null);
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button className="btn-ghost text-xs" onClick={() => setPendingPostAt(null)}>
                Cancel
              </button>
              <button className="btn-primary text-xs" onClick={commitNewPost}>
                Add post
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="card flex flex-col overflow-hidden">
        {selectedPost ? (
          <PostEditor
            post={selectedPost}
            roster={props.roster}
            onUpdate={(fields) => updatePostField(selectedPost.id, fields)}
            onDelete={() => removePost(selectedPost.id)}
            onAssign={(officerId) => assignOfficer(selectedPost.id, officerId)}
            onUnassign={(officerId) => unassignOfficer(selectedPost.id, officerId)}
            onIssueLink={(officerId) => generateLink(selectedPost.id, officerId)}
            generatedLink={linkPanelPostId === selectedPost.id ? generatedLink : null}
            onClearLink={() => {
              setGeneratedLink(null);
              setLinkPanelPostId(null);
            }}
          />
        ) : (
          <FeatureList
            features={features.filter((f) => f.phase === "both" || f.phase === phase)}
            onDelete={removeFeature}
          />
        )}
      </aside>
    </div>
  );
}

function PostEditor(props: {
  post: PostWithAssignments;
  roster: Officer[];
  onUpdate: (fields: Partial<PostWithAssignments>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAssign: (officerId: string) => Promise<void>;
  onUnassign: (officerId: string) => Promise<void>;
  onIssueLink: (officerId: string) => Promise<void>;
  generatedLink: string | null;
  onClearLink: () => void;
}) {
  const { post } = props;
  const unassigned = props.roster.filter(
    (o) => !post.assignments.some((a) => a.officerId === o.id),
  );
  return (
    <div
      className="flex flex-col overflow-y-auto"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/officer-id")) e.preventDefault();
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/officer-id");
        if (id) props.onAssign(id);
      }}
    >
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Post details</h3>
          <button className="text-xs text-red-600 hover:underline" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label className="label">Label</label>
          <input
            className="input mt-1"
            defaultValue={post.label}
            onBlur={(e) => props.onUpdate({ label: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Phase</label>
          <select
            className="input mt-1"
            defaultValue={post.phase}
            onChange={(e) =>
              props.onUpdate({ phase: e.target.value as PostWithAssignments["phase"] })
            }
          >
            <option value="incoming">Incoming only</option>
            <option value="outgoing">Outgoing only</option>
            <option value="both">Both phases</option>
          </select>
        </div>
        <div>
          <label className="label">Duty description</label>
          <textarea
            className="input mt-1 min-h-[80px]"
            defaultValue={post.dutyDescription ?? ""}
            placeholder="Direct traffic exiting Lot 22 onto Commonwealth Ave…"
            onBlur={(e) => props.onUpdate({ dutyDescription: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Equipment</label>
          <input
            className="input mt-1"
            defaultValue={post.equipment ?? ""}
            placeholder="6 cones, 2 barricades, marked cruiser"
            onBlur={(e) => props.onUpdate({ equipment: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Shift start</label>
            <input
              type="datetime-local"
              className="input mt-1"
              defaultValue={toLocalInput(post.shiftStart)}
              onBlur={(e) =>
                props.onUpdate({
                  shiftStart: e.target.value ? new Date(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <label className="label">Shift end</label>
            <input
              type="datetime-local"
              className="input mt-1"
              defaultValue={toLocalInput(post.shiftEnd)}
              onBlur={(e) =>
                props.onUpdate({
                  shiftEnd: e.target.value ? new Date(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
        <div>
          <label className="label">Radio channel</label>
          <input
            className="input mt-1"
            defaultValue={post.radioChannel ?? ""}
            onBlur={(e) => props.onUpdate({ radioChannel: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Supervisor contact</label>
          <input
            className="input mt-1"
            defaultValue={post.supervisorContact ?? ""}
            onBlur={(e) => props.onUpdate({ supervisorContact: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Reference photo URL</label>
          <input
            className="input mt-1"
            defaultValue={post.photoUrl ?? ""}
            placeholder="https://…"
            onBlur={(e) => props.onUpdate({ photoUrl: e.target.value })}
          />
        </div>

        <div>
          <div className="label">Assigned officers (drop roster card to assign)</div>
          <ul className="mt-2 space-y-1">
            {post.assignments.map((a) => (
              <li
                key={a.officerId}
                className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5 text-sm"
              >
                <span>
                  <span className="font-mono text-xs text-slate-500">
                    {a.badgeNumber}
                  </span>{" "}
                  {a.lastName}, {a.firstName}{" "}
                  <span className="text-xs text-slate-500">{a.rank ?? ""}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => props.onIssueLink(a.officerId)}
                  >
                    Link
                  </button>
                  <button
                    className="text-xs text-slate-500 hover:underline"
                    onClick={() => props.onUnassign(a.officerId)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {post.assignments.length === 0 ? (
              <li className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
                No officers assigned yet
              </li>
            ) : null}
          </ul>

          {unassigned.length > 0 ? (
            <div className="mt-2">
              <select
                className="input"
                value=""
                onChange={(e) => {
                  if (e.target.value) props.onAssign(e.target.value);
                }}
              >
                <option value="">+ Add from roster…</option>
                {unassigned.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.badgeNumber} — {o.lastName}, {o.firstName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {props.generatedLink ? (
          <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900">
            <div className="font-medium">Magic link generated</div>
            <p className="mt-1 break-all">{props.generatedLink}</p>
            <p className="mt-2 text-slate-600">
              Send this to the officer via text/email. Valid for 48 hours.
            </p>
            <button
              className="mt-2 text-xs text-emerald-800 underline"
              onClick={() => {
                navigator.clipboard.writeText(props.generatedLink!);
              }}
            >
              Copy
            </button>{" "}
            ·{" "}
            <button
              className="mt-2 text-xs text-slate-600 underline"
              onClick={props.onClearLink}
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeatureList({
  features,
  onDelete,
}: {
  features: MapFeature[];
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-900">Map features</h3>
        <p className="text-xs text-slate-500">Select a post for assignment details.</p>
      </div>
      <ul className="divide-y divide-slate-200">
        {features.length === 0 ? (
          <li className="p-4 text-center text-xs text-slate-500">
            No features yet. Pick a tool from the left panel and click on the map.
          </li>
        ) : null}
        {features.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: FEATURE_META[f.featureType].color }}
              />
              {FEATURE_META[f.featureType].label}{" "}
              <span className="text-xs text-slate-400">({f.phase})</span>
            </span>
            <button
              className="text-xs text-red-600 hover:underline"
              onClick={() => onDelete(f.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

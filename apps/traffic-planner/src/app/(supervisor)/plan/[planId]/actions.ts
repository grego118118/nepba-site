"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  events,
  mapFeatures,
  plans,
  postAssignments,
  posts,
} from "@/lib/schema";
import { requireSupervisor } from "@/lib/session-helpers";
import { issueMagicLink, buildMagicLinkUrl } from "@/lib/magic-link";

async function loadPlanForUser(planId: string, departmentId: string) {
  const [plan] = await db
    .select({ planId: plans.id, departmentId: events.departmentId })
    .from(plans)
    .innerJoin(events, eq(events.id, plans.eventId))
    .where(eq(plans.id, planId))
    .limit(1);
  if (!plan || plan.departmentId !== departmentId) {
    throw new Error("Plan not found");
  }
}

const phaseSchema = z.enum(["incoming", "outgoing", "both"]);

const createPostSchema = z.object({
  planId: z.string().uuid(),
  label: z.string().min(1).max(100),
  lng: z.number(),
  lat: z.number(),
  phase: phaseSchema.default("both"),
});

export async function createPostAction(raw: unknown) {
  const user = await requireSupervisor();
  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  await loadPlanForUser(parsed.data.planId, user.departmentId);
  const [row] = await db
    .insert(posts)
    .values({
      planId: parsed.data.planId,
      label: parsed.data.label,
      lng: parsed.data.lng,
      lat: parsed.data.lat,
      phase: parsed.data.phase,
    })
    .returning();
  revalidatePath(`/plan/${parsed.data.planId}`);
  return { ok: true as const, postId: row.id };
}

const updatePostSchema = z.object({
  planId: z.string().uuid(),
  postId: z.string().uuid(),
  label: z.string().min(1).max(100).optional(),
  dutyDescription: z.string().nullable().optional(),
  phase: phaseSchema.optional(),
  lng: z.number().optional(),
  lat: z.number().optional(),
  equipment: z.string().nullable().optional(),
  shiftStart: z.string().nullable().optional(),
  shiftEnd: z.string().nullable().optional(),
  radioChannel: z.string().nullable().optional(),
  supervisorContact: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export async function updatePostAction(raw: unknown) {
  const user = await requireSupervisor();
  const parsed = updatePostSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  await loadPlanForUser(parsed.data.planId, user.departmentId);
  const { planId, postId, shiftStart, shiftEnd, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (shiftStart !== undefined) {
    updates.shiftStart = shiftStart ? new Date(shiftStart) : null;
  }
  if (shiftEnd !== undefined) {
    updates.shiftEnd = shiftEnd ? new Date(shiftEnd) : null;
  }
  await db.update(posts).set(updates).where(eq(posts.id, postId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

export async function deletePostAction(planId: string, postId: string) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

const assignSchema = z.object({
  planId: z.string().uuid(),
  postId: z.string().uuid(),
  officerId: z.string().uuid(),
});

export async function assignOfficerAction(raw: unknown) {
  const user = await requireSupervisor();
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  await loadPlanForUser(parsed.data.planId, user.departmentId);
  await db
    .insert(postAssignments)
    .values({
      postId: parsed.data.postId,
      officerId: parsed.data.officerId,
      assignedBy: user.id,
    })
    .onConflictDoNothing();
  revalidatePath(`/plan/${parsed.data.planId}`);
  return { ok: true as const };
}

export async function unassignOfficerAction(
  planId: string,
  postId: string,
  officerId: string,
) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db
    .delete(postAssignments)
    .where(
      and(
        eq(postAssignments.postId, postId),
        eq(postAssignments.officerId, officerId),
      ),
    );
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

const featureSchema = z.object({
  planId: z.string().uuid(),
  featureType: z.enum([
    "flow_arrow",
    "road_closure",
    "parking_lot",
    "parking_entrance",
    "pedestrian_crossing",
    "crowd_zone",
    "barricade",
    "cone_line",
    "dropoff_zone",
    "vip_zone",
    "ada_zone",
    "bus_route",
    "bus_stop",
  ]),
  phase: phaseSchema,
  label: z.string().max(200).nullable().optional(),
  geometry: z.unknown(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function createFeatureAction(raw: unknown) {
  const user = await requireSupervisor();
  const parsed = featureSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  await loadPlanForUser(parsed.data.planId, user.departmentId);
  const [row] = await db
    .insert(mapFeatures)
    .values({
      planId: parsed.data.planId,
      featureType: parsed.data.featureType,
      phase: parsed.data.phase,
      label: parsed.data.label ?? null,
      geometry: parsed.data.geometry as object,
      properties: parsed.data.properties ?? {},
    })
    .returning();
  revalidatePath(`/plan/${parsed.data.planId}`);
  return { ok: true as const, featureId: row.id };
}

export async function deleteFeatureAction(planId: string, featureId: string) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db.delete(mapFeatures).where(eq(mapFeatures.id, featureId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

export async function setPhaseAction(planId: string, phase: "incoming" | "outgoing") {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db.update(plans).set({ currentPhase: phase }).where(eq(plans.id, planId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

export async function publishPlanAction(planId: string) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db
    .update(plans)
    .set({
      status: "published",
      publishedAt: new Date(),
      publishedBy: user.id,
    })
    .where(eq(plans.id, planId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

export async function unpublishPlanAction(planId: string) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db
    .update(plans)
    .set({ status: "draft", publishedAt: null, publishedBy: null })
    .where(eq(plans.id, planId));
  revalidatePath(`/plan/${planId}`);
  return { ok: true as const };
}

export async function setMapViewAction(
  planId: string,
  view: { center: [number, number]; zoom: number },
) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  await db
    .update(plans)
    .set({
      mapCenterLng: view.center[0],
      mapCenterLat: view.center[1],
      mapZoom: view.zoom,
    })
    .where(eq(plans.id, planId));
  return { ok: true as const };
}

export async function issueOfficerLinkAction(planId: string, officerId: string) {
  const user = await requireSupervisor();
  await loadPlanForUser(planId, user.departmentId);
  const { token } = await issueMagicLink({
    officerId,
    planId,
    createdBy: user.id,
  });
  return { ok: true as const, url: buildMagicLinkUrl(token) };
}

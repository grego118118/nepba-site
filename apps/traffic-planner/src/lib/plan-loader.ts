import { asc, eq, inArray } from "drizzle-orm";

import { db } from "./db";
import {
  events,
  mapFeatures,
  officers as officersTable,
  plans,
  postAssignments,
  posts,
} from "./schema";

export type LoadedPlan = Awaited<ReturnType<typeof loadPlan>>;

export async function loadPlan(planId: string) {
  const [plan] = await db
    .select({
      id: plans.id,
      eventId: plans.eventId,
      status: plans.status,
      currentPhase: plans.currentPhase,
      mapCenterLng: plans.mapCenterLng,
      mapCenterLat: plans.mapCenterLat,
      mapZoom: plans.mapZoom,
      updatedAt: plans.updatedAt,
      publishedAt: plans.publishedAt,
      eventName: events.name,
      eventType: events.eventType,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      departmentId: events.departmentId,
    })
    .from(plans)
    .innerJoin(events, eq(events.id, plans.eventId))
    .where(eq(plans.id, planId))
    .limit(1);
  if (!plan) return null;

  const postRows = await db
    .select()
    .from(posts)
    .where(eq(posts.planId, planId))
    .orderBy(asc(posts.sortOrder), asc(posts.createdAt));

  const featureRows = await db
    .select()
    .from(mapFeatures)
    .where(eq(mapFeatures.planId, planId))
    .orderBy(asc(mapFeatures.sortOrder), asc(mapFeatures.createdAt));

  const postIds = postRows.map((p) => p.id);
  const assignmentRows = postIds.length
    ? await db
        .select({
          postId: postAssignments.postId,
          officerId: postAssignments.officerId,
          badgeNumber: officersTable.badgeNumber,
          firstName: officersTable.firstName,
          lastName: officersTable.lastName,
          rank: officersTable.rank,
        })
        .from(postAssignments)
        .innerJoin(officersTable, eq(officersTable.id, postAssignments.officerId))
        .where(inArray(postAssignments.postId, postIds))
    : [];

  const assignmentsByPost = new Map<string, typeof assignmentRows>();
  for (const a of assignmentRows) {
    const list = assignmentsByPost.get(a.postId) ?? [];
    list.push(a);
    assignmentsByPost.set(a.postId, list);
  }

  return {
    plan,
    posts: postRows.map((p) => ({
      ...p,
      assignments: assignmentsByPost.get(p.id) ?? [],
    })),
    features: featureRows,
  };
}

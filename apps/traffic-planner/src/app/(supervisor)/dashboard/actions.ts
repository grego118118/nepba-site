"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { departments, events, plans } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSupervisor } from "@/lib/session-helpers";

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  eventType: z.enum(["commencement", "football", "mullins", "other"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export async function createEventAction(
  raw: unknown,
): Promise<{ ok: true; eventId: string; planId: string } | { ok: false; error: string }> {
  const user = await requireSupervisor();
  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const [dept] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, user.departmentId))
    .limit(1);
  if (!dept) return { ok: false, error: "Department not found." };

  const [event] = await db
    .insert(events)
    .values({
      departmentId: dept.id,
      name: parsed.data.name,
      eventType: parsed.data.eventType,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      createdBy: user.id,
    })
    .returning();

  const [plan] = await db
    .insert(plans)
    .values({
      eventId: event.id,
      mapCenterLng: dept.defaultCenterLng,
      mapCenterLat: dept.defaultCenterLat,
      mapZoom: dept.defaultZoom,
    })
    .returning();

  return { ok: true, eventId: event.id, planId: plan.id };
}

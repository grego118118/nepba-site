"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { officers } from "@/lib/schema";
import { requireSupervisor } from "@/lib/session-helpers";

const officerSchema = z.object({
  badgeNumber: z.string().min(1).max(32),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  rank: z.string().max(64).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(32).optional().or(z.literal("")),
});

export async function upsertOfficerAction(raw: unknown) {
  const user = await requireSupervisor();
  const parsed = officerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const data = {
    departmentId: user.departmentId,
    badgeNumber: parsed.data.badgeNumber.trim(),
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    rank: parsed.data.rank?.trim() || null,
    email: parsed.data.email?.trim().toLowerCase() || null,
    phone: parsed.data.phone?.trim() || null,
  };

  const [existing] = await db
    .select()
    .from(officers)
    .where(
      and(
        eq(officers.departmentId, user.departmentId),
        eq(officers.badgeNumber, data.badgeNumber),
      ),
    )
    .limit(1);

  if (existing) {
    await db.update(officers).set(data).where(eq(officers.id, existing.id));
  } else {
    await db.insert(officers).values(data);
  }

  revalidatePath("/roster");
  return { ok: true as const };
}

export async function toggleOfficerActiveAction(formData: FormData) {
  const user = await requireSupervisor();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("active") === "true";
  if (!id) return;
  await db
    .update(officers)
    .set({ active: next })
    .where(
      and(eq(officers.id, id), eq(officers.departmentId, user.departmentId)),
    );
  revalidatePath("/roster");
}

export async function importCsvAction(csv: string) {
  const user = await requireSupervisor();
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { ok: true as const, imported: 0 };
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const cols = {
    badge: idx("badge"),
    first: idx("first_name"),
    last: idx("last_name"),
    rank: idx("rank"),
    email: idx("email"),
    phone: idx("phone"),
  };
  if (cols.badge < 0 || cols.first < 0 || cols.last < 0) {
    return {
      ok: false as const,
      error:
        "CSV header must include badge, first_name, last_name (rank, email, phone optional).",
    };
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const badgeNumber = row[cols.badge]?.trim();
    const firstName = row[cols.first]?.trim();
    const lastName = row[cols.last]?.trim();
    if (!badgeNumber || !firstName || !lastName) continue;
    const data = {
      departmentId: user.departmentId,
      badgeNumber,
      firstName,
      lastName,
      rank: cols.rank >= 0 ? row[cols.rank]?.trim() || null : null,
      email:
        cols.email >= 0 ? row[cols.email]?.trim().toLowerCase() || null : null,
      phone: cols.phone >= 0 ? row[cols.phone]?.trim() || null : null,
    };
    const [existing] = await db
      .select()
      .from(officers)
      .where(
        and(
          eq(officers.departmentId, user.departmentId),
          eq(officers.badgeNumber, badgeNumber),
        ),
      )
      .limit(1);
    if (existing) {
      await db.update(officers).set(data).where(eq(officers.id, existing.id));
    } else {
      await db.insert(officers).values(data);
    }
    imported++;
  }

  revalidatePath("/roster");
  return { ok: true as const, imported };
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

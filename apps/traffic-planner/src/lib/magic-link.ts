import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "./db";
import { magicLinkTokens, officers, plans } from "./schema";

const TOKEN_BYTES = 24;
const DEFAULT_TTL_HOURS = 48;

function hash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueMagicLink(opts: {
  officerId: string;
  planId: string;
  createdBy?: string;
  ttlHours?: number;
}) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hash(token);
  const expiresAt = new Date(
    Date.now() + (opts.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000,
  );
  await db.insert(magicLinkTokens).values({
    officerId: opts.officerId,
    planId: opts.planId,
    tokenHash,
    expiresAt,
    createdBy: opts.createdBy,
  });
  return { token, expiresAt };
}

export async function resolveMagicLink(token: string) {
  if (!token) return null;
  const tokenHash = hash(token);
  const [row] = await db
    .select({
      tokenId: magicLinkTokens.id,
      officerId: magicLinkTokens.officerId,
      planId: magicLinkTokens.planId,
      expiresAt: magicLinkTokens.expiresAt,
      usedAt: magicLinkTokens.usedAt,
      officer: officers,
      plan: plans,
    })
    .from(magicLinkTokens)
    .innerJoin(officers, eq(officers.id, magicLinkTokens.officerId))
    .innerJoin(plans, eq(plans.id, magicLinkTokens.planId))
    .where(eq(magicLinkTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function markMagicLinkUsed(tokenId: string) {
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(magicLinkTokens.id, tokenId)));
}

export function buildMagicLinkUrl(token: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3100";
  return `${base.replace(/\/$/, "")}/o/${token}`;
}

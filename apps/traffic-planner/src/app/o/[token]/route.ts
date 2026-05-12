import { NextResponse } from "next/server";

import { markMagicLinkUsed, resolveMagicLink } from "@/lib/magic-link";
import { setOfficerSession } from "@/lib/officer-session";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const resolved = await resolveMagicLink(token);
  if (!resolved) {
    return NextResponse.redirect(new URL("/o/expired", req.url));
  }
  await setOfficerSession({
    officerId: resolved.officerId,
    planId: resolved.planId,
    issuedAt: Date.now(),
  });
  await markMagicLinkUsed(resolved.tokenId);
  return NextResponse.redirect(new URL(`/o/event/${resolved.planId}`, req.url));
}

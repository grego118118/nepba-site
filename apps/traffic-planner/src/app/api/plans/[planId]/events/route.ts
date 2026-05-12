import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { plans } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_DURATION_MS = 10 * 60 * 1000;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ planId: string }> },
) {
  const { planId } = await ctx.params;

  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPhase: string | null = null;
  let lastStatus: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      async function poll() {
        if (closed) return;
        try {
          const [row] = await db
            .select({
              currentPhase: plans.currentPhase,
              status: plans.status,
              updatedAt: plans.updatedAt,
            })
            .from(plans)
            .where(eq(plans.id, planId))
            .limit(1);
          if (!row) {
            send("error", { message: "Plan not found" });
            controller.close();
            closed = true;
            return;
          }
          if (lastPhase !== row.currentPhase) {
            send("phase", { phase: row.currentPhase, at: Date.now() });
            lastPhase = row.currentPhase;
          }
          if (lastStatus !== row.status) {
            send("status", { status: row.status, at: Date.now() });
            lastStatus = row.status;
          }
        } catch (err) {
          send("error", { message: (err as Error).message });
        }
        if (!closed) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }

      send("hello", { planId });
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_INTERVAL_MS);
      endTimer = setTimeout(() => {
        if (closed) return;
        send("bye", { reason: "max-duration" });
        controller.close();
        closed = true;
      }, MAX_DURATION_MS);

      void poll();
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
      if (heartbeat) clearInterval(heartbeat);
      if (endTimer) clearTimeout(endTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

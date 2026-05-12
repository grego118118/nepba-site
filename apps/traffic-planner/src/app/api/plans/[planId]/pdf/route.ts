import { NextResponse } from "next/server";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import React from "react";

import { type LoadedPlan, loadPlan } from "@/lib/plan-loader";
import { requireSupervisor } from "@/lib/session-helpers";

type LoadedPost = NonNullable<LoadedPlan>["posts"][number];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  meta: { color: "#475569", marginBottom: 10 },
  postCard: {
    borderTop: "1pt solid #cbd5e1",
    paddingTop: 6,
    marginTop: 6,
  },
  postHeader: { fontSize: 12, fontWeight: 700 },
  row: { flexDirection: "row", marginTop: 2 },
  label: { width: 90, color: "#64748b" },
  value: { flex: 1, color: "#0f172a" },
  pill: {
    fontSize: 8,
    padding: "1pt 4pt",
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    marginLeft: 6,
  },
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ planId: string }> },
) {
  const user = await requireSupervisor();
  const { planId } = await ctx.params;
  const loaded = await loadPlan(planId);
  if (!loaded || loaded.plan.departmentId !== user.departmentId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const incoming = loaded.posts.filter(
    (p) => p.phase === "incoming" || p.phase === "both",
  );
  const outgoing = loaded.posts.filter(
    (p) => p.phase === "outgoing" || p.phase === "both",
  );

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, loaded.plan.eventName),
      React.createElement(
        Text,
        { style: styles.meta },
        `${new Date(loaded.plan.startsAt).toLocaleString()} — ${new Date(loaded.plan.endsAt).toLocaleString()}`,
      ),
      React.createElement(
        Text,
        { style: styles.h2 },
        `Incoming traffic — ${incoming.length} posts`,
      ),
      ...incoming.map((p) => renderPost(p)),
      React.createElement(
        Text,
        { style: { ...styles.h2, marginTop: 16 } },
        `Outgoing traffic — ${outgoing.length} posts`,
      ),
      ...outgoing.map((p) => renderPost(p)),
    ),
  );

  const stream = await pdf(doc).toBuffer();
  const buffer = await streamToBuffer(stream);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="plan-${planId}.pdf"`,
    },
  });
}

function renderPost(p: LoadedPost) {
  const officers = p.assignments
    .map(
      (a) =>
        `${a.lastName}, ${a.firstName} #${a.badgeNumber}${a.rank ? ` (${a.rank})` : ""}`,
    )
    .join(" · ");
  return React.createElement(
    View,
    { style: styles.postCard, key: p.id },
    React.createElement(
      View,
      { style: { flexDirection: "row", alignItems: "center" } },
      React.createElement(Text, { style: styles.postHeader }, p.label),
      React.createElement(Text, { style: styles.pill }, p.phase),
    ),
    p.dutyDescription
      ? row("Duty", p.dutyDescription)
      : null,
    p.equipment ? row("Equipment", p.equipment) : null,
    p.shiftStart || p.shiftEnd
      ? row(
          "Shift",
          `${p.shiftStart ? new Date(p.shiftStart).toLocaleString() : "—"} → ${p.shiftEnd ? new Date(p.shiftEnd).toLocaleString() : "—"}`,
        )
      : null,
    p.radioChannel ? row("Radio", p.radioChannel) : null,
    p.supervisorContact ? row("Supervisor", p.supervisorContact) : null,
    row("Officers", officers || "(unassigned)"),
    row("Coords", `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`),
  );
}

function row(label: string, value: string) {
  return React.createElement(
    View,
    { style: styles.row },
    React.createElement(Text, { style: styles.label }, label),
    React.createElement(Text, { style: styles.value }, value),
  );
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

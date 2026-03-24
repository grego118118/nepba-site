import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, grievances } from "@/lib/db";

interface SessionUserWithId {
	id?: string | null;
	email?: string | null;
}

function requireUserId(session: Awaited<ReturnType<typeof auth>>): string | null {
	const user = session?.user as SessionUserWithId | undefined;
	const rawId = user?.id ?? undefined;
	if (rawId) return rawId;
	const email = user?.email;
	if (!email) return null;
	return null;
}

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session?.user) {
		return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

		const userId = requireUserId(session);
	if (!userId) {
		return new Response(JSON.stringify({ success: false, error: "User not found" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

		const { id: grievanceId } = await context.params;
	if (!grievanceId) {
		return new Response(JSON.stringify({ success: false, error: "Grievance id is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const record = await db.query.grievances.findFirst({
		where: and(eq(grievances.id, grievanceId), eq(grievances.userId, userId)),
	});
	if (!record) {
		return new Response(JSON.stringify({ success: false, error: "Grievance not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

		const { documentData, documentType, documentName, documentSize } = record;
	if (!documentData) {
		return new Response(JSON.stringify({ success: false, error: "No document attached" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const headers = new Headers();
	headers.set("Content-Type", documentType ?? "application/octet-stream");
	if (typeof documentSize === "number" && Number.isFinite(documentSize)) {
		headers.set("Content-Length", String(documentSize));
	}
		const fallbackName = "grievance-document";
		const safeName = encodeURIComponent(documentName || fallbackName);
		headers.set("Content-Disposition", `attachment; filename="${safeName}"`);

		return new Response(documentData as any, { status: 200, headers });
}

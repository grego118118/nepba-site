import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, grievances, users } from "@/lib/db";

interface SessionUserWithId {
	id?: string | null;
	email?: string | null;
}

const ALLOWED_STATUSES = [
	"Step 1",
	"Step 2",
	"Step 3",
	"Mediation",
	"Arbitration",
	"Resolved",
] as const;
type GrievanceStatus = (typeof ALLOWED_STATUSES)[number];

function requireUserId(session: Awaited<ReturnType<typeof auth>>): string | null {
	const user = session?.user as SessionUserWithId | undefined;
	const rawId = user?.id ?? undefined;
	if (rawId) return rawId;
	const email = user?.email;
	if (!email) return null;
	return null;
}

export async function PATCH(
		request: NextRequest,
		context: { params: Promise<{ id: string }> },
	) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

			let userId = requireUserId(session);
	if (!userId && session.user.email) {
		// Fallback DB lookup by email, matching the GET/POST endpoints
		const dbUser = await db.query.users.findFirst({
			where: eq(users.email, session.user.email),
		});
		userId = dbUser?.id ?? null;
	}
	if (!userId) {
		return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
	}

		const { id: grievanceId } = await context.params;
	if (!grievanceId) {
		return NextResponse.json({ success: false, error: "Grievance id is required" }, { status: 400 });
	}

		const record = await db.query.grievances.findFirst({
			where: and(eq(grievances.id, grievanceId), eq(grievances.userId, userId)),
		});
	if (!record) {
		return NextResponse.json({ success: false, error: "Grievance not found" }, { status: 404 });
	}

		let body: { status?: string; outcome?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
	}

		let nextStatus: GrievanceStatus | undefined;
		if (body.status !== undefined) {
			const candidate = body.status as GrievanceStatus;
			if (!ALLOWED_STATUSES.includes(candidate)) {
				return NextResponse.json(
					{ success: false, error: "Invalid status value" },
					{ status: 400 },
				);
			}
			nextStatus = candidate;
		}

		const outcomeRaw = typeof body.outcome === "string" ? body.outcome.trim() : undefined;
		if (!nextStatus && outcomeRaw === undefined) {
			return NextResponse.json(
				{ success: false, error: "Nothing to update" },
				{ status: 400 },
			);
		}

		const updateData: {
			status?: GrievanceStatus;
			outcome?: string | null;
			updatedAt: Date;
		} = {
			updatedAt: new Date(),
		};

		if (nextStatus) {
			updateData.status = nextStatus;
		}
		if (outcomeRaw !== undefined) {
			updateData.outcome = outcomeRaw.length ? outcomeRaw : null;
		}

		const [updated] = await db
			.update(grievances)
			.set(updateData)
			.where(eq(grievances.id, grievanceId))
			.returning({
				id: grievances.id,
				status: grievances.status,
				outcome: grievances.outcome,
				documentName: grievances.documentName,
				documentType: grievances.documentType,
				documentSize: grievances.documentSize,
				createdAt: grievances.createdAt,
				updatedAt: grievances.updatedAt,
			});

		return NextResponse.json({ success: true, data: updated });
}

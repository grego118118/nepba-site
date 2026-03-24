import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, users, profiles } from "@/lib/db";

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

	// Lightweight debug helper to verify that next-auth sessions are visible
	// for this route. Safe to keep, but you can remove once things are stable.
	export async function GET() {
		const session = await auth();
		return NextResponse.json({
				hasSession: !!session,
				hasUser: !!session?.user,
				user: session?.user ?? null,
		});
	}

export async function PUT(request: Request) {
	// Debug: log cookies received by this API route from multiple sources
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll();

	// Also try reading from request headers directly
	const cookieHeader = request.headers.get("cookie");
	console.log("[PUT /api/profile/retirement] cookie header:", cookieHeader);
	console.log("[PUT /api/profile/retirement] cookies from store:", allCookies);

	const session = await auth();
	console.log("[PUT /api/profile/retirement] session:", session);
	if (!session?.user) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	let userId = requireUserId(session);
	if (!userId && session.user.email) {
		const user = await db.query.users.findFirst({
			where: eq(users.email, session.user.email),
		});
		userId = user?.id ?? null;
	}

	if (!userId) {
		return NextResponse.json(
			{ success: false, error: "User not found" },
			{ status: 401 },
		);
	}

	let body: { targetRetirementDate?: string | null };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	if (!("targetRetirementDate" in body)) {
		return NextResponse.json(
			{ success: false, error: "targetRetirementDate is required" },
			{ status: 400 },
		);
	}

	const raw = body.targetRetirementDate;
	let targetDate: Date | null = null;
	if (raw && typeof raw === "string") {
		// Expect YYYY-MM-DD from <input type="date" />
		const trimmed = raw.trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			return NextResponse.json(
				{ success: false, error: "Invalid date format. Use YYYY-MM-DD." },
				{ status: 400 },
			);
		}
		// Store as UTC midnight to avoid partial-day offsets
		targetDate = new Date(`${trimmed}T00:00:00.000Z`);
	}

	const existingProfile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	let result;
	if (!existingProfile) {
		// Create a profile if one doesn't exist yet
		// Use email as placeholder for first/last name since those are required
		const email = session.user.email ?? "member";
		const [created] = await db
			.insert(profiles)
			.values({
				userId,
				firstName: email.split("@")[0] || "Member",
				lastName: "190",
				targetRetirementDate: targetDate,
			})
			.returning({
				id: profiles.id,
				userId: profiles.userId,
				targetRetirementDate: profiles.targetRetirementDate,
			});
		result = created;
	} else {
		const [updated] = await db
			.update(profiles)
			.set({
				targetRetirementDate: targetDate,
				updatedAt: new Date(),
			})
			.where(eq(profiles.id, existingProfile.id))
			.returning({
				id: profiles.id,
				userId: profiles.userId,
				targetRetirementDate: profiles.targetRetirementDate,
			});
		result = updated;
	}

	return NextResponse.json({ success: true, data: result });
}

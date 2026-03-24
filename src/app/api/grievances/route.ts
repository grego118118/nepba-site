import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, grievances, users } from "@/lib/db";

interface SessionUserWithId {
	id?: string | null;
	email?: string | null;
}

function requireUserId(session: Awaited<ReturnType<typeof auth>>): string | null {
	const user = session?.user as SessionUserWithId | undefined;
	const rawId = user?.id ?? undefined;
	if (rawId) return rawId;
	// Fallback: look up by email if id is not on the session
	const email = user?.email;
	if (!email) return null;
	return null;
}

export async function GET() {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

	let userId = requireUserId(session);
	if (!userId && session.user.email) {
		// Fallback DB lookup by email on first requests
		const user = await db.query.users.findFirst({
			where: eq(users.email, session.user.email),
		});
		userId = user?.id ?? null;
	}

		if (!userId) {
		return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
	}

		const items = await db.query.grievances.findMany({
			where: eq(grievances.userId, userId),
			orderBy: (g, { desc: d }) => d(g.createdAt),
		});

		// Do not return raw document data in API responses
		const safeItems = items.map((item) => {
			const { documentData, ...rest } = item;
			void documentData;
			return rest;
		});

		return NextResponse.json({ success: true, data: safeItems });
}

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

		let userId = requireUserId(session);
		if (!userId && session.user.email) {
			const user = await db.query.users.findFirst({
				where: eq(users.email, session.user.email),
			});
			userId = user?.id ?? null;
		}

		if (!userId) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file");
		const outcomeValue = formData.get("outcome");

		if (!file || typeof file === "string") {
			return NextResponse.json(
				{ success: false, error: "A grievance document file is required" },
				{ status: 400 },
			);
		}

		const typedFile = file as File;
		const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
		if (typedFile.size > maxSizeBytes) {
			return NextResponse.json(
				{ success: false, error: "File is too large. Maximum size is 10 MB." },
				{ status: 400 },
			);
		}

		const allowedMimeTypes = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"image/jpeg",
			"image/png",
			"image/gif",
		];
		const mimeType = typedFile.type || "application/octet-stream";
		if (!allowedMimeTypes.includes(mimeType)) {
			return NextResponse.json(
				{ success: false, error: "Unsupported file type. Upload a PDF, Word document, or image." },
				{ status: 400 },
			);
		}

		const arrayBuffer = await typedFile.arrayBuffer();
		const documentData = new Uint8Array(arrayBuffer);
		const documentSize = typedFile.size;
		const documentName = typedFile.name;
		const outcome =
			typeof outcomeValue === "string" && outcomeValue.trim().length > 0
				? outcomeValue.trim()
				: null;

		const [created] = await db
			.insert(grievances)
			.values({
				userId,
				status: "Step 1",
				outcome,
				documentName,
				documentType: mimeType,
				documentSize,
				documentData,
			})
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

		return NextResponse.json({ success: true, data: created }, { status: 201 });
}

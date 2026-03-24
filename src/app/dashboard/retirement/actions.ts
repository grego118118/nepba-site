"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users, profiles } from "@/lib/db";

interface SaveRetirementDateInput {
	targetRetirementDate: string | null;
	userId: string; // User ID passed from the authenticated page
	userEmail: string; // Email for validation
}

interface SaveRetirementDateResult {
	success: boolean;
	error?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any;
}

export async function saveRetirementDate(
	input: SaveRetirementDateInput,
): Promise<SaveRetirementDateResult> {
	const { userId, userEmail } = input;

	// Validate that the userId matches the email in the database
	// This prevents tampering with the userId parameter
	if (!userId || !userEmail) {
		return { success: false, error: "Missing user information" };
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
	});

	if (!user || user.email !== userEmail) {
		return { success: false, error: "Unauthorized" };
	}

	const raw = input.targetRetirementDate;
	let targetDate: Date | null = null;
	if (raw && typeof raw === "string") {
		const trimmed = raw.trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			return {
				success: false,
				error: "Invalid date format. Use YYYY-MM-DD.",
			};
		}
		targetDate = new Date(`${trimmed}T00:00:00.000Z`);
	}

	const existingProfile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	let result;
	if (!existingProfile) {
		// Create a profile if one doesn't exist yet
		const [created] = await db
			.insert(profiles)
			.values({
				userId,
				firstName: userEmail.split("@")[0] || "Member",
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

	// Revalidate the page to refresh the countdown with new data
	revalidatePath("/dashboard/retirement");
	revalidatePath("/dashboard");

	return { success: true, data: result };
}

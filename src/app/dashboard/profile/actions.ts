"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users, profiles } from "@/lib/db";

interface SaveProfileInput {
    userId: string;
    userEmail: string;
    firstName: string;
    lastName: string;
    badgeNumber: string;
}

interface SaveProfileResult {
    success: boolean;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

export async function saveProfile(
    input: SaveProfileInput
): Promise<SaveProfileResult> {
    const { userId, userEmail, firstName, lastName, badgeNumber } = input;

    if (!userId || !userEmail) {
        return { success: false, error: "Missing authentication" };
    }

    // Verify user
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user || user.email !== userEmail) {
        return { success: false, error: "Unauthorized" };
    }

    const existingProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    let result;
    if (!existingProfile) {
        const [created] = await db
            .insert(profiles)
            .values({
                userId,
                firstName: firstName || "Member",
                lastName: lastName || "190",
                badgeNumber: badgeNumber || null,
            })
            .returning();
        result = created;
    } else {
        const [updated] = await db
            .update(profiles)
            .set({
                firstName,
                lastName,
                badgeNumber: badgeNumber || null,
                updatedAt: new Date(),
            })
            .where(eq(profiles.id, existingProfile.id))
            .returning();
        result = updated;
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");

    return { success: true, data: result };
}

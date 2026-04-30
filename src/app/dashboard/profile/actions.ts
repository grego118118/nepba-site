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
    retirementGroup: string | null;
    hireDate: string | null;
    averageSalary: number | null;
}

interface SaveProfileResult {
    success: boolean;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

const ALLOWED_GROUPS = new Set(["1", "2", "4"]);

export async function saveProfile(
    input: SaveProfileInput
): Promise<SaveProfileResult> {
    const {
        userId,
        userEmail,
        firstName,
        lastName,
        badgeNumber,
        retirementGroup,
        hireDate,
        averageSalary,
    } = input;

    if (!userId || !userEmail) {
        return { success: false, error: "Missing authentication" };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user || user.email !== userEmail) {
        return { success: false, error: "Unauthorized" };
    }

    const normalizedGroup =
        retirementGroup && ALLOWED_GROUPS.has(retirementGroup)
            ? retirementGroup
            : null;

    let normalizedHireDate: Date | null = null;
    if (hireDate) {
        const parsed = new Date(hireDate);
        if (!Number.isNaN(parsed.getTime())) {
            normalizedHireDate = parsed;
        }
    }

    const normalizedSalary =
        typeof averageSalary === "number" &&
        Number.isFinite(averageSalary) &&
        averageSalary >= 0
            ? Math.round(averageSalary)
            : null;

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
                retirementGroup: normalizedGroup,
                hireDate: normalizedHireDate,
                averageSalary: normalizedSalary,
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
                retirementGroup: normalizedGroup,
                hireDate: normalizedHireDate,
                averageSalary: normalizedSalary,
                updatedAt: new Date(),
            })
            .where(eq(profiles.id, existingProfile.id))
            .returning();
        result = updated;
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/retirement");

    return { success: true, data: result };
}

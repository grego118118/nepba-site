import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login?callbackUrl=/dashboard/profile");
    }

    const email = session.user.email ?? "Member";

    // Get user ID and profile data
    let userId = "";
    let profileData = {
        firstName: "",
        lastName: "",
        badgeNumber: null as string | null,
        retirementGroup: null as string | null,
        hireDate: null as string | null,
        averageSalary: null as number | null,
    };

    if (session.user.email) {
        const userWithProfile = await db.query.users.findFirst({
            where: eq(users.email, session.user.email),
            with: { profile: true },
        });

        if (userWithProfile) {
            userId = userWithProfile.id;
            if (userWithProfile.profile) {
                const hire = userWithProfile.profile.hireDate;
                profileData = {
                    firstName: userWithProfile.profile.firstName,
                    lastName: userWithProfile.profile.lastName,
                    badgeNumber: userWithProfile.profile.badgeNumber,
                    retirementGroup: userWithProfile.profile.retirementGroup,
                    hireDate: hire ? hire.toISOString().slice(0, 10) : null,
                    averageSalary: userWithProfile.profile.averageSalary,
                };
            } else {
                // Defaults if no profile exists yet
                profileData.firstName = email.split("@")[0];
                profileData.lastName = "190";
            }
        }
    }

    return (
        <main className="min-h-screen bg-slate-900 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 md:px-8">
                <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
                            NEPBA Local 190
                        </p>
                        <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
                            Profile Settings
                        </h1>
                        <p className="text-xs text-slate-400 md:text-sm">
                            Manage your personal information. Signed in as{" "}
                            <span className="font-medium text-slate-100">{email}</span>.
                        </p>
                    </div>
                    <div className="mt-2 flex flex-col items-end gap-1 md:mt-0">
                        <Link
                            href="/dashboard"
                            className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </header>

                <section className="space-y-6">
                    <ProfileForm
                        userId={userId}
                        userEmail={email}
                        initialData={profileData}
                    />
                </section>
            </div>
        </main>
    );
}

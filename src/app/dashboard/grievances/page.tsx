import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, grievances, users } from "@/lib/db";
import type { Grievance } from "@/types/database";
import { GrievanceForm } from "./GrievanceForm";
import { GrievanceStatusControls } from "./GrievanceStatusControls";
import { GrievanceStatusProgress } from "./GrievanceStatusProgress";

interface SessionUserWithId {
	id?: string | null;
	email?: string | null;
}

async function getGrievancesForCurrentUser() {
	const session = await auth();
	if (!session?.user) return { session: null, grievances: [] as Grievance[] };

	const userWithId = session.user as SessionUserWithId;
	let userId = userWithId.id ?? null;

	// Fallback: look up user id by email if it's not present on the session
	if (!userId && userWithId.email) {
		const dbUser = await db.query.users.findFirst({
			where: eq(users.email, userWithId.email),
		});
		userId = dbUser?.id ?? null;
	}

	if (!userId) {
		// Keep existing behavior: no grievances if we cannot resolve the user id
		return { session, grievances: [] as Grievance[] };
	}

	const grievancesForUser = await db.query.grievances.findMany({
		where: eq(grievances.userId, userId),
		orderBy: (g, { desc }) => desc(g.createdAt),
	});

	return { session, grievances: grievancesForUser };
}

export default async function GrievancesPage() {
	const { session, grievances: items } = await getGrievancesForCurrentUser();

	if (!session?.user) {
		redirect("/login?callbackUrl=/dashboard/grievances");
	}

	const email = session.user.email ?? "Member";

	return (
		<main className="min-h-screen bg-slate-900 text-slate-100">
			<div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
				<header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
							NEPBA Local 190
						</p>
						<h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
							Grievances &amp; issues
						</h1>
						<p className="text-xs text-slate-400 md:text-sm">
							Document workplace concerns and track updates. Signed in as
							{" "}
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

				<div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
					<GrievanceForm />

				<section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-sm font-semibold text-slate-50">Your documented issues</h2>
						<p className="text-[11px] text-slate-400">
							{items.length === 0
								? "No grievances submitted yet."
								: `${items.length} recorded ${items.length === 1 ? "issue" : "issues"}.`}
						</p>
					</div>

					<ul className="mt-3 space-y-2 text-xs">
						{items.length === 0 && (
							<li className="rounded-md border border-dashed border-slate-700 bg-slate-900/60 px-3 py-3 text-slate-400">
								Submissions you make will appear here with timestamps, status
								updates, and downloadable documents from your Local 190
								representatives.
							</li>
						)}

						{items.map((item) => (
							<li
								key={item.id}
								className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-3"
							>
								<div className="space-y-2">
									<GrievanceStatusProgress status={item.status} />
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<p className="text-[11px] font-medium tracking-wide text-slate-300">
												{item.documentName}
											</p>
											<GrievanceStatusControls
												id={item.id}
												status={item.status}
												outcome={item.outcome}
											/>
										</div>
										<p className="text-[11px] text-slate-500">
											{item.createdAt ? item.createdAt.toLocaleString() : ""}
										</p>
									</div>
									<div className="mt-2 rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1.5">
										<div className="flex items-center justify-between gap-2">
											<span className="text-[11px] font-semibold text-slate-200">
												Outcome / notes
											</span>
											{item.outcome && item.outcome.length > 0 && (
												<span className="text-[10px] text-slate-500">
													Last updated{" "}
													{item.updatedAt
														? item.updatedAt.toLocaleString()
														: ""}
												</span>
											)}
										</div>
										<p className="mt-1 text-[11px] leading-snug whitespace-pre-line text-slate-200">
											{item.outcome && item.outcome.length > 0
													? item.outcome
													: "No outcome recorded yet. Use the notes field above to add details as the grievance progresses."}
										</p>
									</div>
									<p className="mt-1 text-[11px] text-slate-400">
										<span className="font-medium text-slate-300">Document:</span>{" "}
										<span className="break-all">{item.documentName}</span>{" "}
										<Link
											href={`/api/grievances/${item.id}/file`}
											className="font-medium text-blue-300 hover:text-blue-200"
										>
											Download
										</Link>
									</p>
								</div>
							</li>
						))}
					</ul>
				</section>
				</div>
			</div>
		</main>
	);
}

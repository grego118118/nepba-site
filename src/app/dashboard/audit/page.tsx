import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuditShell } from "./AuditShell";

export default async function AuditPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/login?callbackUrl=/dashboard/audit");
	}

	const email = session.user.email ?? "Member";

	return (
		<div className="flex h-screen flex-col bg-slate-900">
			{/* Audit Tool Shell */}
			<AuditShell userEmail={email} />
		</div>
	);
}


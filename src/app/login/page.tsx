import { Suspense } from "react";
import { LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
	return (
		<Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">Loading...</div>}>
			<LoginPageClient />
		</Suspense>
	);
}


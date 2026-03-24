"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GrievanceForm() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [outcome, setOutcome] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
				if (!file) {
					setError("Please attach a grievance document before submitting.");
					return;
				}

				const formData = new FormData();
				formData.append("file", file);
				if (outcome.trim()) {
					formData.append("outcome", outcome.trim());
				}

				const response = await fetch("/api/grievances", {
					method: "POST",
					body: formData,
				});

			if (!response.ok) {
				let message = "Unable to submit grievance.";
				try {
					const data = await response.json();
					if (data?.error) message = data.error;
				} catch {
					// ignore JSON parse errors
				}
				setError(message);
				return;
			}

				// Reset form and refresh data
				setFile(null);
				setOutcome("");
				(event.target as HTMLFormElement).reset();
			router.refresh();
		} catch {
			setError("Unexpected error submitting grievance.");
		} finally {
			setSubmitting(false);
		}
	}

		return (
			<section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
				<h2 className="text-sm font-semibold text-slate-50">Start a new grievance</h2>
				<p className="mt-1 text-xs text-slate-400">
					Upload grievance documents (PDF, Word, or images). Submitted files and notes
					are only visible to authorized Local 190 representatives.
				</p>

			{error && (
				<p className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
					{error}
				</p>
			)}

				<form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
					<div className="space-y-1">
						<label htmlFor="file" className="font-medium text-slate-200">
							Grievance document
						</label>
						<input
							id="file"
							name="file"
							type="file"
							accept=".pdf,.doc,.docx,image/*"
							onChange={(event) => {
								const selected = event.target.files?.[0] ?? null;
								setFile(selected);
							}}
							className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-sm outline-none file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							required
						/>
						<p className="mt-1 text-[11px] text-slate-400">
							Accepted formats: PDF, Word (.doc, .docx), or images. Max 10 MB.
						</p>
					</div>

					<div className="space-y-1">
						<label htmlFor="outcome" className="font-medium text-slate-200">
							Outcome / notes (optional)
						</label>
						<textarea
							id="outcome"
							name="outcome"
							rows={3}
							value={outcome}
							onChange={(event) => setOutcome(event.target.value)}
							placeholder="Summarize the current outcome or any notes from mediation, arbitration, or resolution."
							className="block w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						/>
					</div>

				<button
					type="submit"
					disabled={submitting}
					className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-progress disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				>
					{submitting ? "Submitting..." : "Submit grievance"}
				</button>
			</form>
		</section>
	);
}
